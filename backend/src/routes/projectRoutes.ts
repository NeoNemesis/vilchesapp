import { Router } from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { EmailNotificationService } from '../services/emailNotificationService';
import { processUploadedImages } from '../services/imageProcessor';
import { prisma } from '../lib/prisma';

const router = Router();

// Validation schemas
const createProjectSchema = z.object({
  title: z.string().min(3, 'Titeln måste vara minst 3 tecken'),
  description: z.string().min(10, 'Beskrivningen måste vara minst 10 tecken'),
  clientName: z.string().min(2, 'Kundens namn måste vara minst 2 tecken'),
  clientEmail: z.string().email('Ogiltig e-postadress för kund'),
  clientPhone: z.string().optional(),
  address: z.string().min(5, 'Adressen måste vara minst 5 tecken'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  estimatedHours: z.number().min(0.5, 'Uppskattade timmar måste vara minst 0.5').optional(),
  estimatedCost: z.number().min(0, 'Uppskattad kostnad måste vara positiv').optional(),
  deadline: z.string().datetime().optional(),
  assignedToId: z.string().optional(), // Om direkt tilldelning
});

const numericPreprocess = (val: unknown) => {
  if (val === '' || val === undefined || val === null) return undefined;
  const num = Number(val);
  return isNaN(num) ? val : num;
};

const updateProjectSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  clientName: z.string().min(2).optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  address: z.string().min(5).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  estimatedHours: z.preprocess(numericPreprocess, z.number().min(0.5).optional()),
  estimatedCost: z.preprocess(numericPreprocess, z.number().min(0).optional()),
  deadline: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  assignedToId: z.string().nullable().optional(),
});

// Multer konfiguration för bilduppladdning
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Bestäm upload-mapp baserat på URL
    const isReport = req.url.includes('/report');
    const uploadDir = isReport 
      ? path.join(__dirname, '../../uploads/reports')
      : path.join(__dirname, '../../uploads/projects');
    
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = req.url.includes('/report') ? 'report-' : 'project-';
    cb(null, `${prefix}${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB för rapporter
    files: 10 // Max 10 filer för rapporter
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Endast bilder är tillåtna (JPEG, PNG, WebP)'));
    }
  }
});

// GET /api/projects - Hämta alla projekt (för admin)

// 🔒 Helper function to filter cost data for contractors
function filterCostDataForContractor(project: any, userRole: string) {
  if (userRole === 'CONTRACTOR' || userRole === 'EMPLOYEE') {
    const { estimatedCost, estimatedHours, ...projectWithoutCost } = project;
    return projectWithoutCost;
  }
  return project;
}

function filterCostDataForContractorArray(projects: any[], userRole: string) {
  if (userRole === 'CONTRACTOR' || userRole === 'EMPLOYEE') {
    return projects.map(p => {
      const { estimatedCost, estimatedHours, ...projectWithoutCost } = p;
      return projectWithoutCost;
    });
  }
  return projects;
}

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          }
        },
        reports: {
          select: {
            id: true,
            createdAt: true,
          }
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                company: true,
                role: true
              }
            }
          },
          orderBy: {
            assignedAt: 'asc'
          }
        },
        _count: {
          select: {
            reports: true,
            images: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ 
      message: 'Kunde inte hämta projekt',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// GET /api/projects/my - Hämta mina tilldelade projekt (för contractors)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Contractors, employees och admins kan använda denna endpoint
    if (userRole !== 'CONTRACTOR' && userRole !== 'EMPLOYEE' && userRole !== 'ADMIN') {
      return res.status(403).json({ 
        success: false,
        message: 'Endast contractors och admins kan hämta projekt'
      });
    }

    // För admins: visa alla projekt, för contractors/employees: projekt de är tilldelade ELLER teammedlem i
    const whereClause: any = userRole === 'ADMIN'
      ? {}
      : {
          OR: [
            { assignedToId: userId },
            { teamMembers: { some: { userId: userId } } }
          ],
          status: {
            not: {
              in: ['COMPLETED', 'CANCELLED']
            }
          }
        };
    
    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          }
        },
        reports: {
          select: {
            id: true,
            createdAt: true,
          }
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                company: true,
                role: true
              }
            }
          },
          orderBy: {
            assignedAt: 'asc'
          }
        },
        _count: {
          select: {
            reports: true,
            images: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 🔒 Filtrera bort kostnadsdata för contractors
    const filteredProjects = filterCostDataForContractorArray(projects, userRole);
    res.json(filteredProjects);
  } catch (error) {
    console.error('Error fetching my projects:', error);
    res.status(500).json({ 
      message: 'Kunde inte hämta dina projekt',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// GET /api/projects/my/completed - Hämta mina färdiga projekt (för contractors)
router.get('/my/completed', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Endast contractors kan använda denna endpoint
    if (userRole !== 'CONTRACTOR' && userRole !== 'EMPLOYEE') {
      return res.status(403).json({ 
        success: false,
        message: 'Endast contractors kan hämta färdiga projekt'
      });
    }
    
    const completedProjects = await prisma.project.findMany({
      where: {
        OR: [
          { assignedToId: userId },
          { teamMembers: { some: { userId: userId } } }
        ],
        status: 'COMPLETED'
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          }
        },
        reports: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          }
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                company: true,
                role: true
              }
            }
          },
          orderBy: {
            assignedAt: 'asc'
          }
        },
        _count: {
          select: {
            reports: true,
            images: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json(completedProjects);
  } catch (error) {
    console.error('Error fetching completed projects:', error);
    res.status(500).json({ 
      message: 'Kunde inte hämta färdiga projekt',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// GET /api/projects/recent - Hämta senaste projekten för dashboard
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    
    const whereClause = userRole === 'ADMIN' ? {} : {
      OR: [
        { assignedToId: userId },
        { teamMembers: { some: { userId: userId } } }
      ]
    };

    const recentProjects = await prisma.project.findMany({
      where: whereClause,
      take: 5,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(recentProjects);
  } catch (error) {
    console.error('Error fetching recent projects:', error);
    res.status(500).json({ 
      message: 'Kunde inte hämta senaste projekt',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// GET /api/projects/analytics - Hämta analytics-data för dashboard
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    const { period = '30d' } = req.query;
    
    // Enkel analytics för både admin och contractor
    const whereClause = userRole === 'ADMIN' ? {} : {
      OR: [
        { assignedToId: userId },
        { teamMembers: { some: { userId: userId } } }
      ]
    };
    
    const analytics = {
      period: period,
      totalProjects: await prisma.project.count({ where: whereClause }),
      completedProjects: await prisma.project.count({
        where: { ...whereClause, status: 'COMPLETED' }
      }),
      inProgressProjects: await prisma.project.count({ 
        where: { ...whereClause, status: 'IN_PROGRESS' } 
      }),
      pendingProjects: await prisma.project.count({ 
        where: { ...whereClause, status: 'PENDING' } 
      })
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ 
      message: 'Kunde inte hämta analytics',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// GET /api/projects/dashboard-stats - Hämta komplett dashboard-statistik
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
  try {
    // Projekt statistik
    const [totalProjects, pendingProjects, assignedProjects, inProgressProjects, completedProjects] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: 'PENDING' } }),
      prisma.project.count({ where: { status: 'ASSIGNED' } }),
      prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
    ]);

    // Entreprenör statistik
    const [totalEntrepreneurs, activeEntrepreneurs] = await Promise.all([
      prisma.user.count({ where: { role: 'CONTRACTOR' } }),
      prisma.user.count({ where: { role: 'CONTRACTOR', isActive: true } }),
    ]);

    // Projekt som väntar på rapporter (ASSIGNED eller IN_PROGRESS)
    const pendingReports = await prisma.project.count({
      where: {
        status: {
          in: ['ASSIGNED', 'IN_PROGRESS']
        }
      }
    });

    // Offert statistik
    const [totalQuotes, draftQuotes, sentQuotes, acceptedQuotes, rejectedQuotes, expiredQuotes] = await Promise.all([
      prisma.quote.count(),
      prisma.quote.count({ where: { status: 'DRAFT' } }),
      prisma.quote.count({ where: { status: 'SENT' } }),
      prisma.quote.count({ where: { status: 'ACCEPTED' } }),
      prisma.quote.count({ where: { status: 'REJECTED' } }),
      prisma.quote.count({ where: { status: 'EXPIRED' } }),
    ]);

    // Veckostatistik för diagram (senaste 8 veckorna)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const weeklyProjects = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC('week', "createdAt") as week,
        COUNT(*)::int as count
      FROM "Project"
      WHERE "createdAt" >= ${eightWeeksAgo}
      GROUP BY DATE_TRUNC('week', "createdAt")
      ORDER BY week ASC
    `;

    // Formatera veckodata
    const formattedWeeklyData = (weeklyProjects as any[]).map(item => ({
      week: new Date(item.week).toLocaleDateString('sv-SE', {
        month: 'short',
        day: 'numeric'
      }),
      count: item.count
    }));

    const dashboardStats = {
      // Huvudstatistik
      totalProjects,
      unassigned: pendingProjects,
      assigned: assignedProjects,
      inProgress: inProgressProjects,
      completed: completedProjects,

      // Entreprenör statistik
      totalEntrepreneurs,
      activeEntrepreneurs,

      // Rapporter
      pendingReports,

      // Offert statistik
      totalQuotes,
      draftQuotes,
      sentQuotes,
      acceptedQuotes,
      rejectedQuotes,
      expiredQuotes,

      // Diagram data
      weeklyOrders: formattedWeeklyData,

      // Beräknade värden
      completionRate: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0,
      assignmentRate: totalProjects > 0 ? Math.round(((assignedProjects + inProgressProjects) / totalProjects) * 100) : 0,
      quoteAcceptanceRate: totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0
    };

    console.log('Dashboard stats:', dashboardStats);
    res.json(dashboardStats);

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      message: 'Kunde inte hämta dashboard-statistik',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// GET /api/projects/reports/:id - Hämta enskild rapport (för admin)
router.get('/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userRole = (req as any).user.role;

    // Endast admins kan se alla rapporter
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Åtkomst nekad'
      });
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            title: true,
            clientName: true,
            clientEmail: true,
            address: true
          }
        },
        images: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            url: true,
            description: true,
            uploadedAt: true
          }
        }
      }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Rapport hittades inte'
      });
    }

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'Kunde inte hämta rapport'
    });
  }
});

// POST /api/projects/reports/:id/approve - Godkänn rapport (för admin)
router.post('/reports/:reportId/approve', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { sendToClient } = req.body;
    const userRole = (req as any).user.role;

    // Endast admins kan godkänna rapporter
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Åtkomst nekad'
      });
    }

    // Hämta rapporten med projektinfo
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        project: {
          include: {
            assignedTo: true
          }
        },
        author: true
      }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Rapport hittades inte'
      });
    }

    if (report.status !== 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        message: 'Endast inlämnade rapporter kan godkännas'
      });
    }

    // Uppdatera rapport status
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'APPROVED'
      }
    });

    // Markera projektet som avslutat
    await prisma.project.update({
      where: { id: report.projectId },
      data: {
        status: 'COMPLETED'
      }
    });

    // Skapa notifikation
    try {
      await prisma.notification.create({
        data: {
          type: 'GENERAL',
          subject: `Rapport godkänd: ${report.project.title}`,
          message: `Rapporten för projektet "${report.project.title}" har godkänts och projektet är nu avslutat`,
          projectId: report.projectId,
          userId: report.authorId
        }
      });
    } catch (notificationError) {
      console.error('Failed to create approval notification:', notificationError);
    }

    // Skicka rapportsammanfattning till kund om sendToClient är true
    if (sendToClient && report.project.clientEmail) {
      try {
        await EmailNotificationService.sendReportToClient(
          report.project.clientEmail,
          report.project.clientName,
          {
            title: report.project.title,
            address: report.project.address,
            projectNumber: report.project.projectNumber
          },
          {
            title: report.title,
            workDescription: report.workDescription,
            hoursWorked: report.hoursWorked,
            progressPercent: report.progressPercent,
            nextSteps: report.nextSteps
          }
        );
      } catch (emailError) {
        console.error('Kunde inte skicka rapportmail till kund:', emailError);
      }
    }

    res.json({
      success: true,
      message: sendToClient ? 'Rapport godkänd och skickad till kund' : 'Rapport godkänd',
      report: updatedReport
    });

  } catch (error) {
    console.error('Error approving report:', error);
    res.status(500).json({
      success: false,
      message: 'Kunde inte godkänna rapport'
    });
  }
});

// POST /api/projects/reports/:id/reject - Avvisa rapport (för admin)
router.post('/reports/:reportId/reject', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { reason } = req.body;
    const userRole = (req as any).user.role;

    // Endast admins kan avvisa rapporter
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Åtkomst nekad'
      });
    }

    // Hämta rapporten
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        project: true,
        author: true
      }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Rapport hittades inte'
      });
    }

    if (report.status !== 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        message: 'Endast inlämnade rapporter kan avvisas'
      });
    }

    // Uppdatera rapport status
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'REJECTED'
      }
    });

    // Återställ projektets status till IN_PROGRESS
    await prisma.project.update({
      where: { id: report.projectId },
      data: {
        status: 'IN_PROGRESS'
      }
    });

    // Skapa notifikation
    try {
      await prisma.notification.create({
        data: {
          type: 'GENERAL',
          subject: `Rapport avvisad: ${report.project.title}`,
          message: `Rapporten för projektet "${report.project.title}" har avvisats${reason ? `. Anledning: ${reason}` : ''}`,
          projectId: report.projectId,
          userId: report.authorId
        }
      });
    } catch (notificationError) {
      console.error('Failed to create rejection notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Rapport avvisad',
      report: updatedReport
    });

  } catch (error) {
    console.error('Error rejecting report:', error);
    res.status(500).json({
      success: false,
      message: 'Kunde inte avvisa rapport'
    });
  }
});

// GET /api/projects/recent-activities - Hämta senaste aktiviteter för dashboard
router.get('/recent-activities', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    
    // Hämta senaste notifikationer (aktiviteter)
    const activities = await prisma.notification.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        project: {
          select: {
            title: true,
            projectNumber: true
          }
        }
      },
      where: userRole === 'ADMIN' ? {} : {
        OR: [
          { userId: userId },
          {
            project: {
              assignedToId: userId
            }
          },
          {
            project: {
              teamMembers: { some: { userId: userId } }
            }
          }
        ]
      }
    });

    // Formatera aktiviteter för frontend
    const formattedActivities = activities.map((activity: any) => ({
      id: activity.id,
      type: activity.type,
      title: activity.subject,
      message: activity.message,
      timestamp: activity.createdAt,
      user: activity.user?.name || 'System',
      project: activity.project?.title || null,
      projectNumber: activity.project?.projectNumber || null,
      isRead: !!activity.readAt
    }));

    res.json(formattedActivities);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({
      message: 'Kunde inte hämta senaste aktiviteter',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// GET /api/projects/:id - Hämta projektdetaljer
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
            phone: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        reports: {
          include: {
            images: true,
            author: {
              select: {
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        images: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            url: true,
            uploadedAt: true
          }
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                company: true,
                role: true
              }
            }
          },
          orderBy: {
            assignedAt: 'asc'
          }
        },
        _count: {
          select: {
            reports: true,
            images: true,
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ 
        message: 'Projekt hittades inte' 
      });
    }

    // Lägg till base64-bilddata för att undvika CORS-problem
    const projectWithImageData = {
      ...project,
      images: await Promise.all(project.images.map(async (image: any) => {
        try {
          const imagePath = path.join(__dirname, '../../uploads/projects', image.filename);
          const imageBuffer = await fs.readFile(imagePath);
          const base64Data = imageBuffer.toString('base64');
          
          return {
            ...image,
            base64Data: `data:${image.mimeType};base64,${base64Data}`
          };
        } catch (error) {
          console.error('Error reading image:', image.filename, error);
          return image; // Returnera utan base64 om det misslyckas
        }
      }))
    };

    // 🔒 Filtrera bort kostnadsdata för contractors
    const userRole = (req as any).user.role;
    const filteredProject = filterCostDataForContractor(projectWithImageData, userRole);
    res.json(filteredProject);
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({ 
      message: 'Kunde inte hämta projektdetaljer',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// POST /api/projects - Skapa nytt projekt (med bilduppladdning)
router.post('/', authenticateToken, requireAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const validatedData = createProjectSchema.parse(req.body);
    
    // Hämta admin-användaren
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!adminUser) {
      return res.status(500).json({ message: 'Admin-användare hittades inte' });
    }
    
    const project = await prisma.project.create({
      data: {
        ...validatedData,
        originalEmail: null, // Inget email eftersom det är manuellt
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
        status: validatedData.assignedToId ? 'ASSIGNED' : 'PENDING',
        createdById: adminUser.id,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          }
        }
      }
    });

    // Optimera och spara uppladdade bilder
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const renamedFiles = await processUploadedImages(files);
      const imagePromises = files.map(file => {
        const finalFilename = renamedFiles.get(file.filename) || file.filename;
        return prisma.projectImage.create({
          data: {
            projectId: project.id,
            filename: finalFilename,
            originalName: file.originalname,
            mimeType: finalFilename.endsWith('.jpeg') ? 'image/jpeg' : file.mimetype,
            size: file.size,
            url: `/uploads/projects/${finalFilename}`,
          }
        });
      });

      await Promise.all(imagePromises);
      console.log(`${files.length} bilder optimerade och sparade för projekt ${project.id}`);
    }

    // Skapa notifikation för projekt-skapande
    try {
      await prisma.notification.create({
        data: {
          type: 'GENERAL',
          subject: `Nytt projekt skapat: ${project.title}`,
          message: `Projekt "${project.title}" har skapats av admin`,
          projectId: project.id,
          userId: validatedData.assignedToId || null
        }
      });
    } catch (notificationError) {
      console.error('Failed to create project notification:', notificationError);
    }

    // Om projektet tilldelades direkt, skicka notifiering och skapa tilldelnings-notifikation
    if (validatedData.assignedToId) {
      try {
        await sendAssignmentNotification(project);
        
        // Skapa specifik tilldelnings-notifikation
        await prisma.notification.create({
          data: {
            type: 'PROJECT_ASSIGNED',
            subject: `Projekt tilldelat: ${project.title}`,
            message: `Du har tilldelats projektet "${project.title}"`,
            projectId: project.id,
            userId: validatedData.assignedToId
          }
        });
      } catch (emailError) {
        console.error('Failed to send assignment notification:', emailError);
        // Fortsätt ändå - projektet är skapat
      }
    }

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Ogiltiga data',
        errors: error.errors 
      });
    }

    res.status(500).json({ 
      message: 'Kunde inte skapa projekt',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// PUT /api/projects/:id - Uppdatera projekt (kräver admin-behörighet)
router.put('/:id', authenticateToken, requireAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateProjectSchema.parse(req.body);

    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: { assignedTo: true }
    });

    if (!existingProject) {
      return res.status(404).json({ message: 'Projekt hittades inte' });
    }

    const updateData: any = { ...validatedData };
    if (validatedData.deadline) {
      updateData.deadline = new Date(validatedData.deadline);
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          }
        }
      }
    });

    // Optimera och spara nya uppladdade bilder
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const renamedFiles = await processUploadedImages(files);
      const imagePromises = files.map(file => {
        const finalFilename = renamedFiles.get(file.filename) || file.filename;
        return prisma.projectImage.create({
          data: {
            projectId: updatedProject.id,
            filename: finalFilename,
            originalName: file.originalname,
            mimeType: finalFilename.endsWith('.jpeg') ? 'image/jpeg' : file.mimetype,
            size: file.size,
            url: `/uploads/projects/${finalFilename}`,
          }
        });
      });

      await Promise.all(imagePromises);
      console.log(`${files.length} nya bilder optimerade och sparade för projekt ${updatedProject.id}`);
    }

    // Skapa notifikation för projekt-uppdatering
    try {
      await prisma.notification.create({
        data: {
          type: 'GENERAL',
          subject: `Projekt uppdaterat: ${updatedProject.title}`,
          message: `Projekt "${updatedProject.title}" har uppdaterats`,
          projectId: updatedProject.id,
          userId: updatedProject.assignedToId
        }
      });
    } catch (notificationError) {
      console.error('Failed to create update notification:', notificationError);
    }

    // Om kontraktör ändrades, skicka notifiering
    if (validatedData.assignedToId && validatedData.assignedToId !== existingProject.assignedToId) {
      try {
        await sendAssignmentNotification(updatedProject);
        
        // Skapa tilldelnings-notifikation
        await prisma.notification.create({
          data: {
            type: 'PROJECT_ASSIGNED',
            subject: `Projekt tilldelat: ${updatedProject.title}`,
            message: `Du har tilldelats projektet "${updatedProject.title}"`,
            projectId: updatedProject.id,
            userId: validatedData.assignedToId
          }
        });
      } catch (emailError) {
        console.error('Failed to send assignment notification:', emailError);
      }
    }

    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Ogiltiga data',
        errors: error.errors 
      });
    }

    res.status(500).json({ 
      message: 'Kunde inte uppdatera projekt',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// DELETE /api/projects/:id/images/:imageId - Ta bort en enskild projektbild (endast admin)
router.delete('/:id/images/:imageId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, imageId } = req.params;

    const image = await prisma.projectImage.findFirst({
      where: { id: imageId, projectId: id }
    });

    if (!image) {
      return res.status(404).json({ message: 'Bilden hittades inte' });
    }

    // Ta bort filen från disk
    const filePath = path.join(__dirname, '../../uploads/projects', image.filename);
    try {
      await fs.unlink(filePath);
    } catch (fileError) {
      console.error(`Kunde inte ta bort fil ${filePath}:`, fileError);
      // Fortsätt ändå - ta bort från databasen även om filen saknas
    }

    // Ta bort från databasen
    await prisma.projectImage.delete({
      where: { id: imageId }
    });

    res.json({ message: 'Bild raderad' });
  } catch (error) {
    console.error('Error deleting project image:', error);
    res.status(500).json({
      message: 'Kunde inte radera bild',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// DELETE /api/projects/:id - Ta bort projekt (endast admin)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user.role;

    // Endast admin kan ta bort projekt
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ 
        message: 'Endast administratörer kan ta bort projekt' 
      });
    }

    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        reports: {
          include: {
            images: true
          }
        },
        images: true
      }
    });

    if (!existingProject) {
      return res.status(404).json({ message: 'Projekt hittades inte' });
    }

    // Admin kan ta bort ALLT - ta först bort relaterade data
    console.log(`Admin ${(req as any).user.userId} tar bort projekt ${id} med status ${existingProject.status}`);

    // Ta bort rapportbilder först
    for (const report of existingProject.reports) {
      if (report.images.length > 0) {
        await prisma.reportImage.deleteMany({
          where: { reportId: report.id }
        });
      }
    }

    // Ta bort rapporter
    if (existingProject.reports.length > 0) {
      await prisma.report.deleteMany({
        where: { projectId: id }
      });
    }

    // Ta bort projektbilder
    if (existingProject.images.length > 0) {
      await prisma.projectImage.deleteMany({
        where: { projectId: id }
      });
    }

    // Ta bort notifikationer
    await prisma.notification.deleteMany({
      where: { projectId: id }
    });

    // Ta bort projektet
    await prisma.project.delete({
      where: { id }
    });

    res.json({ 
      message: 'Projekt och all relaterad data har tagits bort',
      deletedProject: {
        id: existingProject.id,
        title: existingProject.title,
        status: existingProject.status,
        reportsDeleted: existingProject.reports.length,
        imagesDeleted: existingProject.images.length
      }
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ 
      message: 'Kunde inte ta bort projekt',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// PUT /api/projects/:id/assign - Tilldela projekt till entreprenör (kräver admin-behörighet)
router.put('/:id/assign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { contractorId } = req.body;

    if (!contractorId) {
      return res.status(400).json({ message: 'Entreprenör-ID krävs' });
    }

    // Kontrollera att entreprenören finns och är aktiv
    const contractor = await prisma.user.findFirst({
      where: {
        id: contractorId,
        role: 'CONTRACTOR',
        isActive: true
      }
    });

    if (!contractor) {
      return res.status(404).json({ message: 'Aktiv entreprenör hittades inte' });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        assignedToId: contractorId,
        status: 'ASSIGNED',
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          }
        }
      }
    });

    // Skicka notifiering till entreprenören
    try {
      await sendAssignmentNotification(updatedProject);
    } catch (emailError) {
      console.error('Failed to send assignment notification:', emailError);
    }

    res.json(updatedProject);
  } catch (error) {
    console.error('Error assigning project:', error);
    res.status(500).json({ 
      message: 'Kunde inte tilldela projekt',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// Hjälpfunktion för att skicka tilldelningsnotifiering
async function sendAssignmentNotification(project: any) {
  if (!project.assignedTo?.email) return;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: project.assignedTo.email,
    subject: `Nytt projekt tilldelat: ${project.title}`,
    html: `
      <h2>Nytt projekt tilldelat</h2>
      <p>Hej ${project.assignedTo.name},</p>
      <p>Du har fått ett nytt projekt tilldelat:</p>
      
      <h3>${project.title}</h3>
      <p><strong>Beskrivning:</strong> ${project.description}</p>
      <p><strong>Kund:</strong> ${project.clientName}</p>
      <p><strong>Adress:</strong> ${project.address}</p>
      <p><strong>Prioritet:</strong> ${project.priority}</p>
      ${project.deadline ? `<p><strong>Deadline:</strong> ${new Date(project.deadline).toLocaleDateString('sv-SE')}</p>` : ''}
      
      <p>Logga in i systemet för att se mer detaljer och påbörja arbetet.</p>
      
      <div style="margin: 20px 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contractor/projects/${project.id}" 
           style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          📋 Visa projekt i systemet
        </a>
      </div>
      
      <p><strong>Direktlänk:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contractor/projects/${project.id}">${process.env.FRONTEND_URL || 'http://localhost:3000'}/contractor/projects/${project.id}</a></p>

      <p>Med vänliga hälsningar,<br>
      ${process.env.COMPANY_NAME || 'VilchesApp'}</p>
    `
  };

  await transporter.sendMail(mailOptions);
}

// PUT /api/projects/:id/accept - Acceptera tilldelat projekt
router.put('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Endast contractors kan acceptera projekt
    if (userRole !== 'CONTRACTOR' && userRole !== 'EMPLOYEE') {
      return res.status(403).json({ 
        message: 'Endast contractors kan acceptera projekt'
      });
    }

    // Kontrollera att projektet finns och är tilldelat till användaren
    const project = await prisma.project.findFirst({
      where: {
        id,
        assignedToId: userId,
        status: 'ASSIGNED'
      }
    });

    if (!project) {
      return res.status(404).json({ 
        message: 'Projekt hittades inte eller är inte tilldelat till dig'
      });
    }

    // Uppdatera projektstatus till IN_PROGRESS
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        updatedAt: new Date()
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          }
        }
      }
    });

    console.log(`Project ${id} accepted by ${(req as any).user.email}`);
    
    // Skapa notifikation för projekt-acceptans
    try {
      await prisma.notification.create({
        data: {
          type: 'GENERAL',
          subject: `Projekt accepterat: ${updatedProject.title}`,
          message: `${updatedProject.assignedTo?.name || 'Entreprenör'} accepterade projektet "${updatedProject.title}"`,
          projectId: updatedProject.id,
          userId: userId
        }
      });
    } catch (notificationError) {
      console.error('Failed to create acceptance notification:', notificationError);
    }
    
    res.json({
      message: 'Projekt accepterat',
      project: updatedProject
    });

  } catch (error) {
    console.error('Error accepting project:', error);
    res.status(500).json({ 
      message: 'Kunde inte acceptera projekt',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// PUT /api/projects/:id/reject - Avböj tilldelat projekt
router.put('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;
    const { reason } = req.body;

    // Endast contractors kan avböja projekt
    if (userRole !== 'CONTRACTOR' && userRole !== 'EMPLOYEE') {
      return res.status(403).json({ 
        message: 'Endast contractors kan avböja projekt'
      });
    }

    // Kontrollera att projektet finns och är tilldelat till användaren
    const project = await prisma.project.findFirst({
      where: {
        id,
        assignedToId: userId,
        status: 'ASSIGNED'
      }
    });

    if (!project) {
      return res.status(404).json({ 
        message: 'Projekt hittades inte eller är inte tilldelat till dig'
      });
    }

    // Uppdatera projektstatus till PENDING och ta bort tilldelning
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        status: 'PENDING',
        assignedToId: null,
        updatedAt: new Date()
      }
    });

    // Skicka notifikation till alla admins om avvisning
    const contractorName = (req as any).user.name || (req as any).user.email;
    try {
      // Skapa DB-notifikation
      await prisma.notification.create({
        data: {
          type: 'GENERAL',
          subject: `Projekt avvisat: ${project.title}`,
          message: `${contractorName} har avvisat projektet "${project.title}". Anledning: ${reason || 'Ingen anledning angiven'}. Projektet behöver tilldelas en ny entreprenör.`,
          projectId: id,
          userId: project.createdById
        }
      });

      // Hämta alla admins och skicka email
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true, name: true }
      });

      for (const admin of admins) {
        await EmailNotificationService.sendProjectRejectionNotification(
          admin.email,
          admin.name,
          contractorName,
          { title: project.title, id: project.id, projectNumber: project.projectNumber },
          reason
        );
      }
    } catch (notificationError) {
      console.error('Kunde inte skicka avvisningsnotifikation:', notificationError);
    }

    res.json({
      message: 'Projekt avvisat',
      project: updatedProject
    });

  } catch (error) {
    console.error('Error rejecting project:', error);
    res.status(500).json({ 
      message: 'Kunde inte avvisa projekt',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});


// Report submission endpoints
const reportSchema = z.object({
  title: z.string().default('Rapport'),
  workDescription: z.string().default('-'),
  materialsUsed: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    cost: z.number()
  })).default([]),
  progressPercent: z.number().min(0).max(100).default(0),
  nextSteps: z.string().optional(),
  issues: z.string().optional(),
  isDraft: z.boolean().default(false)
}).refine(
  data => data.isDraft || data.workDescription.length >= 10,
  { message: 'Arbetsbeskrivning måste vara minst 10 tecken', path: ['workDescription'] }
);

// POST /api/projects/:id/report - Skapa eller uppdatera rapport
router.post('/:id/report', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const userId = (req as any).user.userId;
    
    // Parse JSON data från FormData
    const reportData = JSON.parse(req.body.reportData || '{}');
    const validatedData = reportSchema.parse(reportData);
    
    // Kontrollera att projektet finns och är tilldelat användaren eller att användaren är teammedlem
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { assignedToId: userId },
          { createdById: userId }, // Admin kan också skapa rapporter
          { teamMembers: { some: { userId: userId } } }
        ]
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projekt hittades inte eller du har inte behörighet'
      });
    }

    // Bestäm status baserat på isDraft
    const status = validatedData.isDraft ? 'DRAFT' : 'SUBMITTED';
    
    // Skapa rapport
    const report = await prisma.report.create({
      data: {
        projectId,
        authorId: userId,
        title: validatedData.title,
        workDescription: validatedData.workDescription,
        hoursWorked: 0,
        materialsUsed: validatedData.materialsUsed,
        progressPercent: validatedData.progressPercent,
        nextSteps: validatedData.nextSteps,
        issues: validatedData.issues,
        status,
        isCompleted: !validatedData.isDraft
      }
    });

    // Optimera och spara uppladdade bilder
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const renamedFiles = await processUploadedImages(files);
      const imageData = files.map(file => {
        const finalFilename = renamedFiles.get(file.filename) || file.filename;
        return {
          reportId: report.id,
          filename: finalFilename,
          originalName: file.originalname,
          mimeType: finalFilename.endsWith('.jpeg') ? 'image/jpeg' : file.mimetype,
          size: file.size,
          url: `/uploads/reports/${finalFilename}`
        };
      });

      await prisma.reportImage.createMany({
        data: imageData
      });
    }

    // Om rapporten skickas (inte draft), markera projektet som klart
    if (!validatedData.isDraft) {
      await prisma.project.update({
        where: { id: projectId },
        data: { 
          status: 'COMPLETED' // Automatiskt markera som klart när rapport lämnas in
        }
      });
      
      // Skapa notifikation för rapport-inlämning
      try {
        await prisma.notification.create({
          data: {
            type: 'REPORT_SUBMITTED',
            subject: `Rapport inlämnad: ${project.title}`,
            message: `Rapport har lämnats in för projektet "${project.title}" och projektet är nu markerat som färdigt`,
            projectId: projectId,
            userId: userId
          }
        });
      } catch (notificationError) {
        console.error('Failed to create report notification:', notificationError);
      }
    }

    res.json({
      success: true,
      message: validatedData.isDraft ? 'Utkast sparat' : 'Rapport skickad',
      report: {
        id: report.id,
        status: report.status,
        createdAt: report.createdAt
      }
    });

  } catch (error: any) {
    console.error('Error creating report:', error);
    if (error?.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: error.errors?.[0]?.message || 'Ogiltiga uppgifter'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Kunde inte spara rapport'
    });
  }
});

// GET /api/projects/:id/drafts - Hämta utkast för projekt
router.get('/:id/drafts', authenticateToken, async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Skapa where-villkor baserat på användarroll
    const whereCondition: any = {
      projectId,
      status: 'DRAFT'
    };

    // Om inte admin, filtrera endast på egna utkast
    if (userRole !== 'ADMIN') {
      whereCondition.authorId = userId;
    }

    const drafts = await prisma.report.findMany({
      where: whereCondition,
      include: {
        images: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json({
      success: true,
      drafts
    });

  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({
      success: false,
      message: 'Kunde inte hämta utkast'
    });
  }
});

// DELETE /api/projects/:id/reports/:reportId/draft - Ta bort utkast
router.delete('/:id/reports/:reportId/draft', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Hämta rapporten för att kontrollera status och ägare
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Rapport hittades inte'
      });
    }

    // Endast utkast kan tas bort
    if (report.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Endast utkast kan tas bort'
      });
    }

    // Kontrollera behörighet
    if (userRole !== 'ADMIN' && report.authorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Du har inte behörighet att ta bort detta utkast'
      });
    }

    // Ta bort utkast
    await prisma.report.delete({
      where: { id: reportId }
    });

    res.json({
      success: true,
      message: 'Utkast borttaget'
    });

  } catch (error) {
    console.error('Error deleting draft:', error);
    res.status(500).json({
      success: false,
      message: 'Kunde inte ta bort utkast'
    });
  }
});

// PUT /api/projects/:id/reports/:reportId - Uppdatera befintlig rapport/utkast
router.put('/:id/reports/:reportId', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    const { id: projectId, reportId } = req.params;
    const userId = (req as any).user.userId;
    
    const reportData = JSON.parse(req.body.reportData || '{}');
    const validatedData = reportSchema.parse(reportData);

    // Kontrollera att rapporten finns och tillhör användaren
    const existingReport = await prisma.report.findFirst({
      where: {
        id: reportId,
        projectId,
        authorId: userId
      }
    });

    if (!existingReport) {
      return res.status(404).json({
        success: false,
        message: 'Rapport hittades inte'
      });
    }

    // Uppdatera rapport
    const status = validatedData.isDraft ? 'DRAFT' : 'SUBMITTED';
    
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        title: validatedData.title,
        workDescription: validatedData.workDescription,
        hoursWorked: 0,
        materialsUsed: validatedData.materialsUsed,
        progressPercent: validatedData.progressPercent,
        nextSteps: validatedData.nextSteps,
        issues: validatedData.issues,
        status,
        isCompleted: !validatedData.isDraft
      }
    });

    // Optimera och spara nya bilder
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const renamedFiles = await processUploadedImages(files);
      const imageData = files.map(file => {
        const finalFilename = renamedFiles.get(file.filename) || file.filename;
        return {
          reportId: reportId,
          filename: finalFilename,
          originalName: file.originalname,
          mimeType: finalFilename.endsWith('.jpeg') ? 'image/jpeg' : file.mimetype,
          size: file.size,
          url: `/uploads/reports/${finalFilename}`
        };
      });

      await prisma.reportImage.createMany({
        data: imageData
      });
    }

    res.json({
      success: true,
      message: validatedData.isDraft ? 'Utkast uppdaterat' : 'Rapport skickad',
      report: updatedReport
    });

  } catch (error: any) {
    console.error('Error updating report:', error);
    if (error?.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: error.errors?.[0]?.message || 'Ogiltiga uppgifter'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Kunde inte uppdatera rapport'
    });
  }
});


// ========================================
// TEAM MANAGEMENT ENDPOINTS
// ========================================

/**
 * POST /api/projects/:id/team
 * Lägg till teammmedlem i projekt
 */
router.post('/:id/team', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role = 'MEMBER' } = req.body;
    const assignedById = (req as any).user.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId krävs'
      });
    }

    // Kolla att projektet finns
    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projekt hittades inte'
      });
    }

    // Kolla att användaren finns och är CONTRACTOR
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Användare hittades inte'
      });
    }

    if (user.role !== 'CONTRACTOR' && user.role !== 'EMPLOYEE') {
      return res.status(400).json({
        success: false,
        message: 'Endast contractors kan läggas till i projekt-team'
      });
    }

    // Lägg till i team (om inte redan finns)
    const teamMember = await prisma.projectTeamMember.upsert({
      where: {
        projectId_userId: {
          projectId: id,
          userId: userId
        }
      },
      update: {
        role: role
      },
      create: {
        projectId: id,
        userId: userId,
        role: role,
        assignedById: assignedById
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true
          }
        }
      }
    });

    return res.json({
      success: true,
      message: `${user.name} tillagd i projekt-team`,
      teamMember: teamMember
    });

  } catch (error: any) {
    console.error('Error adding team member:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte lägga till teammedlem',
      error: error.message
    });
  }
});

/**
 * DELETE /api/projects/:id/team/:userId
 * Ta bort teammedlem från projekt
 */
router.delete('/:id/team/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const deleted = await prisma.projectTeamMember.delete({
      where: {
        projectId_userId: {
          projectId: id,
          userId: userId
        }
      }
    });

    return res.json({
      success: true,
      message: 'Teammedlem borttagen'
    });

  } catch (error: any) {
    console.error('Error removing team member:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Teammedlem hittades inte'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Kunde inte ta bort teammedlem',
      error: error.message
    });
  }
});

/**
 * GET /api/projects/:id/team
 * Hämta alla teammedlemmar för ett projekt
 */
router.get('/:id/team', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const teamMembers = await prisma.projectTeamMember.findMany({
      where: {
        projectId: id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            role: true
          }
        },
        assignedBy: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        assignedAt: 'asc'
      }
    });

    return res.json({
      success: true,
      count: teamMembers.length,
      teamMembers: teamMembers
    });

  } catch (error: any) {
    console.error('Error fetching team members:', error);
    return res.status(500).json({
      success: false,
      message: 'Kunde inte hämta teammedlemmar',
      error: error.message
    });
  }
});

// POST /api/projects/:id/images - Contractor laddar upp bilder till sitt projekt
router.post('/:id/images', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      select: { id: true, assignedToId: true, teamMembers: { select: { userId: true } } }
    });

    if (!project) {
      return res.status(404).json({ message: 'Projekt hittades inte' });
    }

    // Kolla att användaren är tilldelad projektet eller är teammedlem
    const userId = req.user!.userId;
    const isAssigned = project.assignedToId === userId;
    const isTeamMember = project.teamMembers.some(tm => tm.userId === userId);
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isAssigned && !isTeamMember && !isAdmin) {
      return res.status(403).json({ message: 'Du har inte tillgång till detta projekt' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Inga bilder uppladdade' });
    }

    const renamedFiles = await processUploadedImages(files);

    const imagePromises = files.map(file => {
      const finalFilename = renamedFiles.get(file.filename) || file.filename;
      return prisma.projectImage.create({
        data: {
          projectId: project.id,
          filename: finalFilename,
          originalName: file.originalname,
          mimeType: finalFilename.endsWith('.jpeg') ? 'image/jpeg' : file.mimetype,
          size: file.size,
          url: `/uploads/projects/${finalFilename}`,
        }
      });
    });

    const images = await Promise.all(imagePromises);

    res.status(201).json({
      message: `${images.length} bild(er) uppladdade`,
      images
    });
  } catch (error) {
    console.error('Error uploading contractor images:', error);
    res.status(500).json({ message: 'Kunde inte ladda upp bilder' });
  }
});

export default router;
