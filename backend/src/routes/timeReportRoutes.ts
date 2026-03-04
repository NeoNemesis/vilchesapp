import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { generateTimeReportPdf } from '../services/timeReportPdfGenerator';
import { generateTimeReportCsv } from '../services/timeReportCsvGenerator';
import { sendTimeReportToAccountant } from '../services/timeReportEmailService';

const router = Router();

// Validation schemas
const timeReportEntrySchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  activityName: z.string().min(1, 'Aktivitetsnamn krävs'),
  comment: z.string().optional().nullable(),
  mondayHours: z.number().min(0).max(24).default(0),
  tuesdayHours: z.number().min(0).max(24).default(0),
  wednesdayHours: z.number().min(0).max(24).default(0),
  thursdayHours: z.number().min(0).max(24).default(0),
  fridayHours: z.number().min(0).max(24).default(0),
  saturdayHours: z.number().min(0).max(24).default(0),
  sundayHours: z.number().min(0).max(24).default(0),
  sortOrder: z.number().int().default(0),
});

const createTimeReportSchema = z.object({
  weekNumber: z.number().int().min(1).max(53),
  year: z.number().int().min(2020).max(2100),
  weekStartDate: z.string(),
  entries: z.array(timeReportEntrySchema).min(1, 'Minst en rad krävs'),
});

const updateTimeReportSchema = z.object({
  entries: z.array(timeReportEntrySchema).min(1, 'Minst en rad krävs'),
});

// ============================================
// EMPLOYEE ENDPOINTS
// ============================================

// GET /api/time-reports/my - Egna rapporter
router.get('/my', authenticateToken, requireRole(['EMPLOYEE']), async (req, res) => {
  try {
    const { year, status } = req.query;
    const where: any = { userId: req.user!.userId };

    if (year) where.year = parseInt(year as string);
    if (status) where.status = status as string;

    const reports = await prisma.timeReport.findMany({
      where,
      include: {
        entries: {
          orderBy: { sortOrder: 'asc' },
          include: { project: { select: { id: true, title: true, projectNumber: true } } }
        }
      },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }]
    });

    res.json(reports);
  } catch (error) {
    console.error('Error fetching my time reports:', error);
    res.status(500).json({ message: 'Kunde inte hämta tidsrapporter' });
  }
});

// GET /api/time-reports/my/projects - Tillgängliga projekt
router.get('/my/projects', authenticateToken, requireRole(['EMPLOYEE']), async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
        archived: false,
      },
      select: {
        id: true,
        title: true,
        projectNumber: true,
      },
      orderBy: { title: 'asc' }
    });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Kunde inte hämta projekt' });
  }
});

// GET /api/time-reports/my/:id - Enskild rapport
router.get('/my/:id', authenticateToken, requireRole(['EMPLOYEE']), async (req, res) => {
  try {
    const report = await prisma.timeReport.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
      include: {
        entries: {
          orderBy: { sortOrder: 'asc' },
          include: { project: { select: { id: true, title: true, projectNumber: true } } }
        },
        approvedBy: { select: { name: true } }
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Tidsrapport hittades inte' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching time report:', error);
    res.status(500).json({ message: 'Kunde inte hämta tidsrapport' });
  }
});

// POST /api/time-reports - Skapa/spara utkast
router.post('/', authenticateToken, requireRole(['EMPLOYEE']), async (req, res) => {
  try {
    const validatedData = createTimeReportSchema.parse(req.body);

    // Check if report already exists for this week
    const existing = await prisma.timeReport.findUnique({
      where: {
        userId_weekNumber_year: {
          userId: req.user!.userId,
          weekNumber: validatedData.weekNumber,
          year: validatedData.year,
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        message: 'En tidsrapport för denna vecka finns redan'
      });
    }

    // Calculate totals
    const entries = validatedData.entries.map((entry, idx) => {
      const totalHours = entry.mondayHours + entry.tuesdayHours + entry.wednesdayHours +
        entry.thursdayHours + entry.fridayHours + entry.saturdayHours + entry.sundayHours;
      return { ...entry, totalHours, sortOrder: idx };
    });

    const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);

    const report = await prisma.timeReport.create({
      data: {
        userId: req.user!.userId,
        weekNumber: validatedData.weekNumber,
        year: validatedData.year,
        weekStartDate: new Date(validatedData.weekStartDate),
        totalHours,
        entries: {
          create: entries
        }
      },
      include: {
        entries: {
          orderBy: { sortOrder: 'asc' },
          include: { project: { select: { id: true, title: true, projectNumber: true } } }
        }
      }
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating time report:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Ogiltiga data', errors: error.errors });
    }

    res.status(500).json({ message: 'Kunde inte skapa tidsrapport' });
  }
});

// PUT /api/time-reports/:id - Uppdatera (bara DRAFT/REJECTED)
router.put('/:id', authenticateToken, requireRole(['EMPLOYEE']), async (req, res) => {
  try {
    const report = await prisma.timeReport.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Tidsrapport hittades inte' });
    }

    if (!['DRAFT', 'REJECTED'].includes(report.status)) {
      return res.status(400).json({
        message: 'Kan bara redigera utkast eller avvisade rapporter'
      });
    }

    const validatedData = updateTimeReportSchema.parse(req.body);

    const entries = validatedData.entries.map((entry, idx) => {
      const totalHours = entry.mondayHours + entry.tuesdayHours + entry.wednesdayHours +
        entry.thursdayHours + entry.fridayHours + entry.saturdayHours + entry.sundayHours;
      return { ...entry, totalHours, sortOrder: idx };
    });

    const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);

    // Delete old entries and create new ones
    await prisma.timeReportEntry.deleteMany({
      where: { timeReportId: report.id }
    });

    const updatedReport = await prisma.timeReport.update({
      where: { id: report.id },
      data: {
        totalHours,
        status: 'DRAFT',
        rejectionReason: null,
        entries: {
          create: entries
        }
      },
      include: {
        entries: {
          orderBy: { sortOrder: 'asc' },
          include: { project: { select: { id: true, title: true, projectNumber: true } } }
        }
      }
    });

    res.json(updatedReport);
  } catch (error) {
    console.error('Error updating time report:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Ogiltiga data', errors: error.errors });
    }

    res.status(500).json({ message: 'Kunde inte uppdatera tidsrapport' });
  }
});

// POST /api/time-reports/:id/submit - Skicka in
router.post('/:id/submit', authenticateToken, requireRole(['EMPLOYEE']), async (req, res) => {
  try {
    const report = await prisma.timeReport.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Tidsrapport hittades inte' });
    }

    if (!['DRAFT', 'REJECTED'].includes(report.status)) {
      return res.status(400).json({
        message: 'Kan bara skicka in utkast eller avvisade rapporter'
      });
    }

    const updatedReport = await prisma.timeReport.update({
      where: { id: report.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        rejectionReason: null,
      },
      include: {
        entries: {
          orderBy: { sortOrder: 'asc' },
          include: { project: { select: { id: true, title: true, projectNumber: true } } }
        }
      }
    });

    res.json(updatedReport);
  } catch (error) {
    console.error('Error submitting time report:', error);
    res.status(500).json({ message: 'Kunde inte skicka in tidsrapport' });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/time-reports/admin/reporters - Alla som kan tidsrapportera
router.get('/admin/reporters', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const reporters = await prisma.user.findMany({
      where: {
        role: { in: ['EMPLOYEE', 'CONTRACTOR'] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' }
    });
    res.json(reporters);
  } catch (error) {
    console.error('Error fetching reporters:', error);
    res.status(500).json({ message: 'Kunde inte hämta tidsrapportörer' });
  }
});

// GET /api/time-reports/admin - Alla rapporter
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { employee, weekNumber, year, status } = req.query;
    const where: any = {};

    if (employee) where.userId = employee as string;
    if (weekNumber) where.weekNumber = parseInt(weekNumber as string);
    if (year) where.year = parseInt(year as string);
    if (status) where.status = status as string;

    const reports = await prisma.timeReport.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        entries: {
          orderBy: { sortOrder: 'asc' },
          include: { project: { select: { id: true, title: true, projectNumber: true } } }
        },
        approvedBy: { select: { name: true } }
      },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }]
    });

    res.json(reports);
  } catch (error) {
    console.error('Error fetching admin time reports:', error);
    res.status(500).json({ message: 'Kunde inte hämta tidsrapporter' });
  }
});

// GET /api/time-reports/admin/summary - Statistik
router.get('/admin/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const [pending, approvedThisMonth, totalHoursThisMonth, totalReports] = await Promise.all([
      prisma.timeReport.count({ where: { status: 'SUBMITTED' } }),
      prisma.timeReport.count({
        where: {
          status: 'APPROVED',
          approvedAt: {
            gte: new Date(currentYear, new Date().getMonth(), 1)
          }
        }
      }),
      prisma.timeReport.aggregate({
        where: {
          status: 'APPROVED',
          year: currentYear,
        },
        _sum: { totalHours: true }
      }),
      prisma.timeReport.count()
    ]);

    res.json({
      pending,
      approvedThisMonth,
      totalHoursThisMonth: totalHoursThisMonth._sum.totalHours || 0,
      totalReports
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ message: 'Kunde inte hämta statistik' });
  }
});

// GET /api/time-reports/admin/:id - Visa detalj
router.get('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const report = await prisma.timeReport.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        entries: {
          orderBy: { sortOrder: 'asc' },
          include: { project: { select: { id: true, title: true, projectNumber: true } } }
        },
        approvedBy: { select: { name: true } }
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Tidsrapport hittades inte' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching time report detail:', error);
    res.status(500).json({ message: 'Kunde inte hämta tidsrapport' });
  }
});

// PUT /api/time-reports/admin/:id - Admin redigera rapport
router.put('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const report = await prisma.timeReport.findUnique({
      where: { id: req.params.id }
    });

    if (!report) {
      return res.status(404).json({ message: 'Tidsrapport hittades inte' });
    }

    const validatedData = updateTimeReportSchema.parse(req.body);

    const entries = validatedData.entries.map((entry, idx) => {
      const totalHours = entry.mondayHours + entry.tuesdayHours + entry.wednesdayHours +
        entry.thursdayHours + entry.fridayHours + entry.saturdayHours + entry.sundayHours;
      return { ...entry, totalHours, sortOrder: idx };
    });

    const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);

    await prisma.timeReportEntry.deleteMany({
      where: { timeReportId: report.id }
    });

    const updatedReport = await prisma.timeReport.update({
      where: { id: report.id },
      data: {
        totalHours,
        entries: { create: entries }
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        entries: {
          orderBy: { sortOrder: 'asc' },
          include: { project: { select: { id: true, title: true, projectNumber: true } } }
        },
        approvedBy: { select: { name: true } }
      }
    });

    res.json(updatedReport);
  } catch (error) {
    console.error('Error admin updating time report:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Ogiltiga data', errors: error.errors });
    }
    res.status(500).json({ message: 'Kunde inte uppdatera tidsrapport' });
  }
});

// POST /api/time-reports/admin/:id/approve - Godkänn
router.post('/admin/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const report = await prisma.timeReport.findUnique({
      where: { id: req.params.id }
    });

    if (!report) {
      return res.status(404).json({ message: 'Tidsrapport hittades inte' });
    }

    if (report.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Kan bara godkänna inskickade rapporter' });
    }

    const updatedReport = await prisma.timeReport.update({
      where: { id: report.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: req.user!.userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        entries: { orderBy: { sortOrder: 'asc' } }
      }
    });

    res.json(updatedReport);
  } catch (error) {
    console.error('Error approving time report:', error);
    res.status(500).json({ message: 'Kunde inte godkänna tidsrapport' });
  }
});

// POST /api/time-reports/admin/:id/reject - Avvisa
router.post('/admin/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Anledning krävs för avvisning' });
    }

    const report = await prisma.timeReport.findUnique({
      where: { id: req.params.id }
    });

    if (!report) {
      return res.status(404).json({ message: 'Tidsrapport hittades inte' });
    }

    if (report.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Kan bara avvisa inskickade rapporter' });
    }

    const updatedReport = await prisma.timeReport.update({
      where: { id: report.id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        entries: { orderBy: { sortOrder: 'asc' } }
      }
    });

    res.json(updatedReport);
  } catch (error) {
    console.error('Error rejecting time report:', error);
    res.status(500).json({ message: 'Kunde inte avvisa tidsrapport' });
  }
});

// POST /api/time-reports/admin/bulk-approve - Godkänn flera
router.post('/admin/bulk-approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Inga rapporter valda' });
    }

    const result = await prisma.timeReport.updateMany({
      where: {
        id: { in: ids },
        status: 'SUBMITTED',
      },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: req.user!.userId,
      }
    });

    res.json({ message: `${result.count} rapporter godkända`, count: result.count });
  } catch (error) {
    console.error('Error bulk approving:', error);
    res.status(500).json({ message: 'Kunde inte godkänna rapporter' });
  }
});

// POST /api/time-reports/admin/:id/send-to-accountant - Skicka till revisor
router.post('/admin/:id/send-to-accountant', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { format } = req.body; // 'pdf', 'csv', 'both'

    const report = await prisma.timeReport.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true } },
        entries: {
          orderBy: { sortOrder: 'asc' },
          include: { project: { select: { title: true, projectNumber: true } } }
        }
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Tidsrapport hittades inte' });
    }

    if (report.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Kan bara skicka godkända rapporter' });
    }

    // Get accountant settings
    const accountant = await prisma.accountantSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    if (!accountant) {
      return res.status(400).json({ message: 'Revisorsinställningar saknas. Konfigurera under Inställningar.' });
    }

    const attachments: { filename: string; content: Buffer }[] = [];

    if (format === 'pdf' || format === 'both') {
      const pdfBuffer = await generateTimeReportPdf(report);
      attachments.push({
        filename: `tidsrapport_${report.user.name.replace(/\s+/g, '_')}_v${report.weekNumber}_${report.year}.pdf`,
        content: pdfBuffer
      });
    }

    if (format === 'csv' || format === 'both') {
      const csvBuffer = generateTimeReportCsv(report);
      attachments.push({
        filename: `tidsrapport_${report.user.name.replace(/\s+/g, '_')}_v${report.weekNumber}_${report.year}.csv`,
        content: csvBuffer
      });
    }

    await sendTimeReportToAccountant(accountant, report, attachments);

    res.json({ message: `Tidsrapport skickad till ${accountant.email}` });
  } catch (error) {
    console.error('Error sending to accountant:', error);
    res.status(500).json({ message: 'Kunde inte skicka till revisor' });
  }
});

// GET /api/time-reports/admin/:id/pdf - Ladda ner PDF
router.get('/admin/:id/pdf', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const report = await prisma.timeReport.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true } },
        entries: {
          orderBy: { sortOrder: 'asc' },
          include: { project: { select: { title: true, projectNumber: true } } }
        }
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Tidsrapport hittades inte' });
    }

    const pdfBuffer = await generateTimeReportPdf(report);
    const filename = `tidsrapport_${report.user.name.replace(/\s+/g, '_')}_v${report.weekNumber}_${report.year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Kunde inte generera PDF' });
  }
});

// GET /api/time-reports/admin/:id/csv - Ladda ner CSV
router.get('/admin/:id/csv', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const report = await prisma.timeReport.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true } },
        entries: {
          orderBy: { sortOrder: 'asc' },
          include: { project: { select: { title: true, projectNumber: true } } }
        }
      }
    });

    if (!report) {
      return res.status(404).json({ message: 'Tidsrapport hittades inte' });
    }

    const csvBuffer = generateTimeReportCsv(report);
    const filename = `tidsrapport_${report.user.name.replace(/\s+/g, '_')}_v${report.weekNumber}_${report.year}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvBuffer);
  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ message: 'Kunde inte generera CSV' });
  }
});

export default router;
