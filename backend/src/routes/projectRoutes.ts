import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { authenticateToken } from './authRoutes';

const router = Router();
const prisma = new PrismaClient();

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

const updateProjectSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  clientName: z.string().min(2).optional(),
  clientEmail: z.string().email().optional(),
  clientPhone: z.string().optional(),
  address: z.string().min(5).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  estimatedHours: z.number().min(0.5).optional(),
  estimatedCost: z.number().min(0).optional(),
  deadline: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  assignedToId: z.string().nullable().optional(),
});

// Multer konfiguration för bilduppladdning
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/projects');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `project-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // Max 5 filer
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
router.get('/', async (req, res) => {
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

    // Endast contractors kan använda denna endpoint
    if (userRole !== 'CONTRACTOR') {
      return res.status(403).json({ 
        message: 'Endast contractors kan hämta sina egna projekt'
      });
    }

    const projects = await prisma.project.findMany({
      where: {
        assignedToId: userId
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
            createdAt: true,
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
    console.error('Error fetching my projects:', error);
    res.status(500).json({ 
      message: 'Kunde inte hämta dina projekt',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// GET /api/projects/dashboard-stats - Hämta komplett dashboard-statistik
router.get('/dashboard-stats', async (req, res) => {
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
      
      // Diagram data
      weeklyOrders: formattedWeeklyData,
      
      // Beräknade värden
      completionRate: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0,
      assignmentRate: totalProjects > 0 ? Math.round(((assignedProjects + inProgressProjects) / totalProjects) * 100) : 0
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

// GET /api/projects/:id - Hämta projektdetaljer
router.get('/:id', async (req, res) => {
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

    res.json(projectWithImageData);
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({ 
      message: 'Kunde inte hämta projektdetaljer',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// GET /api/projects/image/:filename - Servera projektbilder
router.get('/image/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const imagePath = path.join(__dirname, '../../uploads/projects', filename);
    
    // Kontrollera att filen existerar
    try {
      await fs.access(imagePath);
    } catch {
      return res.status(404).json({ message: 'Bild hittades inte' });
    }

    // Sätt rätt content-type baserat på filextension
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 
                       ext === '.png' ? 'image/png' : 
                       ext === '.gif' ? 'image/gif' : 
                       'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache i 1 år
    
    // Läs och skicka filen
    const imageBuffer = await fs.readFile(imagePath);
    res.send(imageBuffer);
    
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ 
      message: 'Kunde inte ladda bild',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// GET /api/projects/stats - Hämta enkel projektstatistik
router.get('/stats', async (req, res) => {
  try {
    const [total, pending, assigned, inProgress, completed] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { status: 'PENDING' } }),
      prisma.project.count({ where: { status: 'ASSIGNED' } }),
      prisma.project.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
    ]);

    const urgentProjects = await prisma.project.count({
      where: { 
        priority: 'URGENT',
        status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] }
      }
    });

    res.json({
      total,
      pending,
      assigned,
      inProgress,
      completed,
      urgent: urgentProjects
    });
  } catch (error) {
    console.error('Error fetching project stats:', error);
    res.status(500).json({ 
      message: 'Kunde inte hämta projektstatistik',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// GET /api/projects/recent - Hämta senaste projekten för dashboard
router.get('/recent', async (req, res) => {
  try {
    const recentProjects = await prisma.project.findMany({
      take: 10,
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

// POST /api/projects - Skapa nytt projekt (med bilduppladdning)
router.post('/', upload.array('images', 5), async (req, res) => {
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

    // Spara uppladdade bilder
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      const imagePromises = files.map(file => 
        prisma.projectImage.create({
          data: {
            projectId: project.id,
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            url: `/uploads/projects/${file.filename}`,
          }
        })
      );
      
      await Promise.all(imagePromises);
      console.log(`${files.length} bilder sparade för projekt ${project.id}`);
    }

    // Om projektet tilldelades direkt, skicka notifiering
    if (validatedData.assignedToId) {
      try {
        await sendAssignmentNotification(project);
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

// PUT /api/projects/:id - Uppdatera projekt
router.put('/:id', async (req, res) => {
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

    // Om kontraktör ändrades, skicka notifiering
    if (validatedData.assignedToId && validatedData.assignedToId !== existingProject.assignedToId) {
      try {
        await sendAssignmentNotification(updatedProject);
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

// DELETE /api/projects/:id - Ta bort projekt
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: {
        reports: true,
        images: true
      }
    });

    if (!existingProject) {
      return res.status(404).json({ message: 'Projekt hittades inte' });
    }

    // Kontrollera om projektet kan tas bort
    if (existingProject.status === 'IN_PROGRESS') {
      return res.status(400).json({ 
        message: 'Kan inte ta bort pågående projekt. Ändra status först.' 
      });
    }

    if (existingProject.reports.length > 0) {
      return res.status(400).json({ 
        message: 'Kan inte ta bort projekt med rapporter. Arkivera istället.' 
      });
    }

    await prisma.project.delete({
      where: { id }
    });

    res.json({ message: 'Projekt borttaget' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ 
      message: 'Kunde inte ta bort projekt',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// PUT /api/projects/:id/assign - Tilldela projekt till entreprenör
router.put('/:id/assign', async (req, res) => {
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
      
      <p>Med vänliga hälsningar,<br>
      Vilches Entreprenad AB</p>
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
    if (userRole !== 'CONTRACTOR') {
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
    if (userRole !== 'CONTRACTOR') {
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

    // TODO: Skicka notifikation till admin om avvisning
    console.log(`Project ${id} rejected by ${(req as any).user.email}, reason: ${reason || 'Ingen anledning angiven'}`);
    
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

// GET /api/projects/analytics - Hämta analytics-data för dashboard
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const userRole = (req as any).user.role;

    // Endast admins kan hämta analytics
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        message: 'Endast admins kan hämta analytics-data'
      });
    }

    const { period = '30d' } = req.query;
    
    // Beräkna datumintervall baserat på period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Hämta projekt för aktuell period
    const currentProjects = await prisma.project.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      select: {
        id: true,
        estimatedCost: true,
        createdAt: true,
        status: true
      }
    });

    // Hämta projekt för föregående period (för trendberäkning)
    const previousStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const previousProjects = await prisma.project.findMany({
      where: {
        createdAt: {
          gte: previousStartDate,
          lte: startDate
        }
      },
      select: {
        id: true,
        estimatedCost: true,
        createdAt: true,
        status: true
      }
    });

    // Beräkna intäkter och trends
    const currentRevenue = currentProjects.reduce((sum, project) => 
      sum + (project.estimatedCost || 0), 0
    );
    const previousRevenue = previousProjects.reduce((sum, project) => 
      sum + (project.estimatedCost || 0), 0
    );

    const revenueChange = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100)
      : currentRevenue > 0 ? 100 : 0;

    // Beräkna projekt-trends
    const currentProjectCount = currentProjects.length;
    const previousProjectCount = previousProjects.length;
    const projectChange = previousProjectCount > 0 
      ? ((currentProjectCount - previousProjectCount) / previousProjectCount * 100)
      : currentProjectCount > 0 ? 100 : 0;

    // Gruppera data per dag/vecka/månad beroende på period
    const groupedData = [];
    const days = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    
    if (period === '7d') {
      // Gruppera per dag
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const dayProjects = currentProjects.filter(p => 
          p.createdAt >= dayStart && p.createdAt <= dayEnd
        );
        
        groupedData.push({
          period: dayStart.toLocaleDateString('sv-SE', { weekday: 'short' }),
          revenue: dayProjects.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
          projects: dayProjects.length,
          date: dayStart.toISOString()
        });
      }
    } else if (period === '30d') {
      // Gruppera per vecka
      const weeksCount = Math.ceil(days / 7);
      for (let i = 0; i < weeksCount; i++) {
        const weekStart = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(Math.min(
          weekStart.getTime() + 7 * 24 * 60 * 60 * 1000,
          now.getTime()
        ));
        
        const weekProjects = currentProjects.filter(p => 
          p.createdAt >= weekStart && p.createdAt <= weekEnd
        );
        
        groupedData.push({
          period: `V${i + 1}`,
          revenue: weekProjects.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
          projects: weekProjects.length,
          date: weekStart.toISOString()
        });
      }
    } else {
      // 90d - Gruppera per månad
      const monthsCount = 3;
      for (let i = 0; i < monthsCount; i++) {
        const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0);
        
        const monthProjects = currentProjects.filter(p => 
          p.createdAt >= monthStart && p.createdAt <= monthEnd
        );
        
        groupedData.push({
          period: monthStart.toLocaleDateString('sv-SE', { month: 'short' }),
          revenue: monthProjects.reduce((sum, p) => sum + (p.estimatedCost || 0), 0),
          projects: monthProjects.length,
          date: monthStart.toISOString()
        });
      }
    }

    // Hämta aktuella stats för trendberäkningar
    const totalProjects = await prisma.project.count();
    const unassignedProjects = await prisma.project.count({
      where: { status: 'PENDING' }
    });
    const inProgressProjects = await prisma.project.count({
      where: { status: 'IN_PROGRESS' }
    });
    
    // Väntande rapporter = projekt som är tilldelade men inte rapporterade än
    const pendingReports = await prisma.project.count({
      where: { 
        status: {
          in: ['ASSIGNED', 'IN_PROGRESS']
        }
      }
    });
    
    // Aktiva entreprenörer = användare med rollen CONTRACTOR som är aktiva
    const activeContractors = await prisma.user.count({
      where: { 
        role: 'CONTRACTOR',
        isActive: true
      }
    });

    // Beräkna tidigare stats för trend (samma period bakåt)
    const previousTotalProjects = await prisma.project.count({
      where: {
        createdAt: {
          gte: previousStartDate,
          lt: startDate
        }
      }
    });

    const previousUnassignedProjects = await prisma.project.count({
      where: {
        status: 'PENDING',
        createdAt: {
          gte: previousStartDate,
          lt: startDate
        }
      }
    });

    const previousInProgressProjects = await prisma.project.count({
      where: {
        status: 'IN_PROGRESS',
        createdAt: {
          gte: previousStartDate,
          lt: startDate
        }
      }
    });

    const previousPendingReports = await prisma.project.count({
      where: {
        status: {
          in: ['ASSIGNED', 'IN_PROGRESS']
        },
        createdAt: {
          gte: previousStartDate,
          lt: startDate
        }
      }
    });

    // Beräkna trendförändringar
    const unassignedChange = previousUnassignedProjects > 0 
      ? ((unassignedProjects - previousUnassignedProjects) / previousUnassignedProjects * 100)
      : unassignedProjects > 0 ? 100 : 0;

    const inProgressChange = previousInProgressProjects > 0 
      ? ((inProgressProjects - previousInProgressProjects) / previousInProgressProjects * 100)
      : inProgressProjects > 0 ? 100 : 0;

    const pendingReportsChange = previousPendingReports > 0 
      ? ((pendingReports - previousPendingReports) / previousPendingReports * 100)
      : pendingReports > 0 ? 100 : 0;

    // För aktiva entreprenörer, jämför med totalt antal (enklare metrik)
    const totalContractors = await prisma.user.count({
      where: { role: 'CONTRACTOR' }
    });
    const contractorActivityRate = totalContractors > 0 
      ? (activeContractors / totalContractors * 100) - 80 // Baseline 80%
      : 0;

    res.json({
      revenue: {
        current: currentRevenue,
        change: Math.round(revenueChange * 10) / 10,
        changeType: revenueChange >= 0 ? 'increase' : 'decrease'
      },
      projects: {
        current: currentProjectCount,
        change: Math.round(projectChange * 10) / 10,
        changeType: projectChange >= 0 ? 'increase' : 'decrease'
      },
      chartData: groupedData,
      stats: {
        unassigned: {
          value: unassignedProjects,
          change: Math.round(unassignedChange * 10) / 10,
          changeType: unassignedChange > 0 ? 'increase' : unassignedChange < 0 ? 'decrease' : 'neutral'
        },
        inProgress: {
          value: inProgressProjects,
          change: Math.round(inProgressChange * 10) / 10,
          changeType: inProgressChange > 0 ? 'increase' : inProgressChange < 0 ? 'decrease' : 'neutral'
        },
        pendingReports: {
          value: pendingReports,
          change: Math.round(pendingReportsChange * 10) / 10,
          changeType: pendingReportsChange > 0 ? 'increase' : pendingReportsChange < 0 ? 'decrease' : 'neutral'
        },
        activeContractors: {
          value: activeContractors,
          change: Math.round(contractorActivityRate * 10) / 10,
          changeType: contractorActivityRate > 0 ? 'increase' : contractorActivityRate < 0 ? 'decrease' : 'neutral'
        }
      },
      period: period
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      message: 'Kunde inte hämta analytics-data',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

export default router;
