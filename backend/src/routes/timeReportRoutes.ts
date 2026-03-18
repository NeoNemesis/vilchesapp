import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, requireAdmin, requireAdminOrAccountant, requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { generateTimeReportPdf } from '../services/timeReportPdfGenerator';
import { generateTimeReportCsv } from '../services/timeReportCsvGenerator';
import { sendTimeReportToAccountant } from '../services/timeReportEmailService';
import { processFortnoxSalary, sendAdminSalarySummary } from '../services/fortnoxSalaryService';

const router = Router();

// Helper: get which month a week belongs to (based on the Thursday of that week)
function getMonthForWeek(weekNumber: number, year: number, weekStartDate?: Date): { month: number; year: number } {
  if (weekStartDate) {
    // Use Thursday of the week to determine which month the week belongs to
    const thu = new Date(weekStartDate);
    thu.setDate(thu.getDate() + 3);
    return { month: thu.getMonth() + 1, year: thu.getFullYear() };
  }
  // Fallback: calculate from week number
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setDate(jan4.getDate() - dayOfWeek + 1);
  const monday = new Date(mondayOfWeek1);
  monday.setDate(monday.getDate() + (weekNumber - 1) * 7);
  const thu = new Date(monday);
  thu.setDate(thu.getDate() + 3);
  return { month: thu.getMonth() + 1, year: thu.getFullYear() };
}

// Helper: check if a period is locked
async function isPeriodLocked(weekNumber: number, year: number, weekStartDate?: Date): Promise<boolean> {
  const { month, year: effectiveYear } = getMonthForWeek(weekNumber, year, weekStartDate);
  const lock = await prisma.timePeriodLock.findUnique({
    where: { year_month: { year: effectiveYear, month } }
  });
  return !!lock;
}

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

// POST /api/time-reports - Skapa/spara
router.post('/', authenticateToken, requireRole(['EMPLOYEE']), async (req, res) => {
  try {
    const validatedData = createTimeReportSchema.parse(req.body);

    // Check if period is locked
    const locked = await isPeriodLocked(validatedData.weekNumber, validatedData.year, new Date(validatedData.weekStartDate));
    if (locked) {
      return res.status(403).json({ message: 'Denna period är låst och kan inte redigeras' });
    }

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

// PUT /api/time-reports/:id - Uppdatera
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

    // Check if period is locked
    const locked = await isPeriodLocked(report.weekNumber, report.year, report.weekStartDate);
    if (locked) {
      return res.status(403).json({ message: 'Denna period är låst och kan inte redigeras' });
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

// GET /api/time-reports/locked-periods - Hämta låsta perioder (för alla inloggade)
router.get('/locked-periods', authenticateToken, async (req, res) => {
  try {
    const { year } = req.query;
    const where: any = {};
    if (year) where.year = parseInt(year as string);

    const locks = await prisma.timePeriodLock.findMany({
      where,
      include: { lockedBy: { select: { name: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.json(locks);
  } catch (error) {
    console.error('Error fetching locked periods:', error);
    res.status(500).json({ message: 'Kunde inte hämta låsta perioder' });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// POST /api/time-reports/admin/lock-period - Lås en period
router.post('/admin/lock-period', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { year, month, note } = req.body;

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ message: 'Ogiltigt år eller månad' });
    }

    const existing = await prisma.timePeriodLock.findUnique({
      where: { year_month: { year, month } }
    });

    if (existing) {
      return res.status(400).json({ message: 'Denna period är redan låst' });
    }

    const lock = await prisma.timePeriodLock.create({
      data: {
        year,
        month,
        note: note || null,
        lockedById: req.user!.userId,
      },
      include: { lockedBy: { select: { name: true } } },
    });

    res.status(201).json(lock);
  } catch (error) {
    console.error('Error locking period:', error);
    res.status(500).json({ message: 'Kunde inte låsa perioden' });
  }
});

// DELETE /api/time-reports/admin/lock-period/:id - Lås upp en period
router.delete('/admin/lock-period/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await prisma.timePeriodLock.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Perioden är upplåst' });
  } catch (error) {
    console.error('Error unlocking period:', error);
    res.status(500).json({ message: 'Kunde inte låsa upp perioden' });
  }
});

// GET /api/time-reports/admin/reporters - Alla som kan tidsrapportera
router.get('/admin/reporters', authenticateToken, requireAdminOrAccountant, async (req, res) => {
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
router.get('/admin', authenticateToken, requireAdminOrAccountant, async (req, res) => {
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
router.get('/admin/summary', authenticateToken, requireAdminOrAccountant, async (req, res) => {
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
router.get('/admin/:id', authenticateToken, requireAdminOrAccountant, async (req, res) => {
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

// POST /api/time-reports/admin/create - Admin skapa rapport åt anställd
router.post('/admin/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      userId: z.string().uuid(),
      weekNumber: z.number().int().min(1).max(53),
      year: z.number().int().min(2020).max(2100),
      weekStartDate: z.string(),
      entries: z.array(timeReportEntrySchema).min(1, 'Minst en rad krävs'),
    });
    const validatedData = schema.parse(req.body);

    // Check if report already exists for this user/week/year
    const existing = await prisma.timeReport.findFirst({
      where: {
        userId: validatedData.userId,
        weekNumber: validatedData.weekNumber,
        year: validatedData.year,
      }
    });
    if (existing) {
      return res.status(400).json({ message: 'Det finns redan en rapport för denna vecka' });
    }

    const entries = validatedData.entries.map((entry, idx) => {
      const totalHours = entry.mondayHours + entry.tuesdayHours + entry.wednesdayHours +
        entry.thursdayHours + entry.fridayHours + entry.saturdayHours + entry.sundayHours;
      return { ...entry, totalHours, sortOrder: idx };
    });

    const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);

    const report = await prisma.timeReport.create({
      data: {
        userId: validatedData.userId,
        weekNumber: validatedData.weekNumber,
        year: validatedData.year,
        weekStartDate: new Date(validatedData.weekStartDate),
        totalHours,
        status: 'SUBMITTED',
        entries: { create: entries },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        entries: {
          orderBy: { sortOrder: 'asc' },
          include: { project: { select: { id: true, title: true, projectNumber: true } } }
        },
      }
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('Error admin creating time report:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Ogiltiga data', errors: error.errors });
    }
    res.status(500).json({ message: 'Kunde inte skapa tidsrapport' });
  }
});

// DELETE /api/time-reports/admin/:id - Admin ta bort rapport
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const report = await prisma.timeReport.findUnique({
      where: { id: req.params.id }
    });

    if (!report) {
      return res.status(404).json({ message: 'Tidsrapport hittades inte' });
    }

    await prisma.timeReportEntry.deleteMany({
      where: { timeReportId: report.id }
    });

    await prisma.timeReport.delete({
      where: { id: report.id }
    });

    res.json({ message: 'Tidsrapport borttagen' });
  } catch (error) {
    console.error('Error admin deleting time report:', error);
    res.status(500).json({ message: 'Kunde inte ta bort tidsrapport' });
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

    // Run accountant email + Fortnox processing in parallel
    // Fortnox errors never block the accountant email
    const results = await Promise.allSettled([
      sendTimeReportToAccountant(accountant, report, attachments),
      processFortnoxSalary(report.id)
        .then(() => sendAdminSalarySummary([report.id]))
        .catch(err => console.error('[Fortnox] Salary processing error (non-blocking):', err)),
    ]);

    // Check if accountant email succeeded
    const accountantResult = results[0];
    if (accountantResult.status === 'rejected') {
      throw accountantResult.reason;
    }

    // Build response with Fortnox status
    const fortnoxResult = results[1];
    const fortnoxStatus = fortnoxResult.status === 'fulfilled' ? 'ok' : 'error';

    res.json({
      message: `Tidsrapport skickad till ${accountant.email}`,
      fortnox: fortnoxStatus,
    });
  } catch (error) {
    console.error('Error sending to accountant:', error);
    res.status(500).json({ message: 'Kunde inte skicka till revisor' });
  }
});

// GET /api/time-reports/admin/:id/pdf - Ladda ner PDF
router.get('/admin/:id/pdf', authenticateToken, requireAdminOrAccountant, async (req, res) => {
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
router.get('/admin/:id/csv', authenticateToken, requireAdminOrAccountant, async (req, res) => {
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
