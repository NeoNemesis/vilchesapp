/**
 * Salary Routes - Employee salary portal
 * Allows employees to view provisional salary, salary history, and download PDF specs
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { calculateSalary } from '../services/swedishTaxCalculator';
import { generateSalarySpecPdf } from '../services/salarySpecPdfGenerator';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/salary/my/current
 * Get provisional salary for current month based on approved time reports
 */
router.get('/my/current', requireRole(['EMPLOYEE']), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Get employee data
    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        hourlyRate: true,
        vacationPayPercent: true,
      },
    });

    if (!employee || !employee.hourlyRate) {
      return res.json({
        hasRate: false,
        message: 'Ingen timlön konfigurerad. Kontakta din arbetsgivare.',
      });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Get first and last day of current month
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);

    // Find all approved time reports for current month
    const approvedReports = await prisma.timeReport.findMany({
      where: {
        userId,
        status: 'APPROVED',
        weekStartDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: {
        id: true,
        weekNumber: true,
        totalHours: true,
        weekStartDate: true,
      },
      orderBy: { weekNumber: 'asc' },
    });

    // Also get submitted (pending) reports for this month
    const pendingReports = await prisma.timeReport.findMany({
      where: {
        userId,
        status: 'SUBMITTED',
        weekStartDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: {
        id: true,
        weekNumber: true,
        totalHours: true,
      },
      orderBy: { weekNumber: 'asc' },
    });

    // Draft reports
    const draftReports = await prisma.timeReport.findMany({
      where: {
        userId,
        status: 'DRAFT',
        weekStartDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: {
        id: true,
        weekNumber: true,
        totalHours: true,
      },
      orderBy: { weekNumber: 'asc' },
    });

    const totalApprovedHours = approvedReports.reduce((sum, r) => sum + r.totalHours, 0);
    const totalPendingHours = pendingReports.reduce((sum, r) => sum + r.totalHours, 0);
    const totalDraftHours = draftReports.reduce((sum, r) => sum + r.totalHours, 0);

    // Calculate salary based on approved hours
    const hourlyRate = employee.hourlyRate;
    const vacationPayPercent = employee.vacationPayPercent || 12;
    const salary = totalApprovedHours > 0
      ? calculateSalary(totalApprovedHours, hourlyRate, vacationPayPercent)
      : { grossPay: 0, taxDeduction: 0, netPay: 0, employerFees: 0, vacationPay: 0, totalCostEmployer: 0 };

    // Calculate projected salary (approved + pending + draft)
    const totalProjectedHours = totalApprovedHours + totalPendingHours + totalDraftHours;
    const projectedSalary = totalProjectedHours > 0
      ? calculateSalary(totalProjectedHours, hourlyRate, vacationPayPercent)
      : { grossPay: 0, taxDeduction: 0, netPay: 0, employerFees: 0, vacationPay: 0, totalCostEmployer: 0 };

    // Get YTD totals from salary logs
    const ytdLogs = await prisma.fortnoxSalaryLog.aggregate({
      where: {
        userId,
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(currentYear, 0, 1),
        },
      },
      _sum: {
        grossPay: true,
        netPay: true,
        taxDeduction: true,
        vacationPay: true,
        totalHours: true,
      },
    });

    res.json({
      hasRate: true,
      period: {
        year: currentYear,
        month: currentMonth + 1,
        monthName: monthStart.toLocaleDateString('sv-SE', { month: 'long' }),
      },
      hourlyRate,
      vacationPayPercent,
      approved: {
        hours: totalApprovedHours,
        weeks: approvedReports.length,
        ...salary,
      },
      pending: {
        hours: totalPendingHours,
        weeks: pendingReports.length,
      },
      draft: {
        hours: totalDraftHours,
        weeks: draftReports.length,
      },
      projected: {
        hours: totalProjectedHours,
        ...projectedSalary,
      },
      ytd: {
        grossPay: ytdLogs._sum.grossPay || 0,
        netPay: ytdLogs._sum.netPay || 0,
        taxDeduction: ytdLogs._sum.taxDeduction || 0,
        vacationPay: ytdLogs._sum.vacationPay || 0,
        totalHours: ytdLogs._sum.totalHours || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching current salary:', error);
    res.status(500).json({ success: false, message: 'Kunde inte hämta lönedata' });
  }
});

/**
 * GET /api/salary/my/history
 * Get salary history (completed salary logs)
 */
router.get('/my/history', requireRole(['EMPLOYEE']), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

    const salaryLogs = await prisma.fortnoxSalaryLog.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
      include: {
        timeReport: {
          select: {
            weekNumber: true,
            year: true,
            weekStartDate: true,
            totalHours: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const totals = salaryLogs.reduce(
      (acc, log) => ({
        grossPay: acc.grossPay + log.grossPay,
        netPay: acc.netPay + log.netPay,
        taxDeduction: acc.taxDeduction + log.taxDeduction,
        vacationPay: acc.vacationPay + log.vacationPay,
        employerFees: acc.employerFees + log.employerFees,
        totalHours: acc.totalHours + log.totalHours,
      }),
      { grossPay: 0, netPay: 0, taxDeduction: 0, vacationPay: 0, employerFees: 0, totalHours: 0 }
    );

    res.json({
      year,
      entries: salaryLogs.map((log) => ({
        id: log.id,
        weekNumber: log.timeReport.weekNumber,
        year: log.timeReport.year,
        weekStartDate: log.timeReport.weekStartDate,
        totalHours: log.totalHours,
        hourlyRate: log.hourlyRate,
        grossPay: log.grossPay,
        netPay: log.netPay,
        taxDeduction: log.taxDeduction,
        vacationPay: log.vacationPay,
        employerFees: log.employerFees,
        createdAt: log.createdAt,
      })),
      totals,
    });
  } catch (error) {
    console.error('Error fetching salary history:', error);
    res.status(500).json({ success: false, message: 'Kunde inte hämta lönehistorik' });
  }
});

/**
 * GET /api/salary/my/:id/pdf
 * Download salary specification PDF
 */
router.get('/my/:id/pdf', requireRole(['EMPLOYEE']), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const salaryLog = await prisma.fortnoxSalaryLog.findFirst({
      where: {
        id,
        userId, // Ensure employee can only access their own
        status: 'COMPLETED',
      },
      include: {
        user: {
          select: {
            name: true,
            personalNumber: true,
            bankAccount: true,
            hourlyRate: true,
            vacationPayPercent: true,
          },
        },
        timeReport: {
          select: {
            weekNumber: true,
            year: true,
            weekStartDate: true,
            totalHours: true,
          },
        },
      },
    });

    if (!salaryLog) {
      return res.status(404).json({ success: false, message: 'Lönespecifikation hittades inte' });
    }

    const basePay = salaryLog.totalHours * salaryLog.hourlyRate;

    const pdfBuffer = await generateSalarySpecPdf({
      employeeName: salaryLog.user.name,
      personalNumber: salaryLog.user.personalNumber,
      bankAccount: salaryLog.user.bankAccount,
      weekNumber: salaryLog.timeReport.weekNumber,
      year: salaryLog.timeReport.year,
      weekStartDate: salaryLog.timeReport.weekStartDate,
      totalHours: salaryLog.totalHours,
      hourlyRate: salaryLog.hourlyRate,
      basePay,
      vacationPay: salaryLog.vacationPay,
      vacationPayPercent: salaryLog.user.vacationPayPercent || 12,
      grossPay: salaryLog.grossPay,
      taxDeduction: salaryLog.taxDeduction,
      netPay: salaryLog.netPay,
      employerFees: salaryLog.employerFees,
    });

    const filename = `lonespec_v${salaryLog.timeReport.weekNumber}_${salaryLog.timeReport.year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating salary PDF:', error);
    res.status(500).json({ success: false, message: 'Kunde inte generera lönespecifikation' });
  }
});

/**
 * GET /api/salary/my/provisional-pdf
 * Download provisional salary spec PDF for current month (not yet processed)
 */
router.get('/my/provisional-pdf', requireRole(['EMPLOYEE']), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        hourlyRate: true,
        vacationPayPercent: true,
        personalNumber: true,
        bankAccount: true,
      },
    });

    if (!employee || !employee.hourlyRate) {
      return res.status(400).json({ success: false, message: 'Ingen timlön konfigurerad' });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const approvedReports = await prisma.timeReport.findMany({
      where: {
        userId,
        status: 'APPROVED',
        weekStartDate: { gte: monthStart, lte: monthEnd },
      },
      select: { totalHours: true, weekNumber: true },
    });

    const totalHours = approvedReports.reduce((sum, r) => sum + r.totalHours, 0);

    if (totalHours === 0) {
      return res.status(400).json({ success: false, message: 'Inga godkända timmar för denna period' });
    }

    const vacationPayPercent = employee.vacationPayPercent || 12;
    const salary = calculateSalary(totalHours, employee.hourlyRate, vacationPayPercent);

    const weekNumbers = approvedReports.map((r) => r.weekNumber);
    const firstWeek = Math.min(...weekNumbers);

    const pdfBuffer = await generateSalarySpecPdf({
      employeeName: employee.name,
      personalNumber: employee.personalNumber,
      bankAccount: employee.bankAccount,
      weekNumber: firstWeek,
      year: now.getFullYear(),
      weekStartDate: monthStart,
      totalHours,
      hourlyRate: employee.hourlyRate,
      basePay: totalHours * employee.hourlyRate,
      vacationPay: salary.vacationPay,
      vacationPayPercent,
      grossPay: salary.grossPay,
      taxDeduction: salary.taxDeduction,
      netPay: salary.netPay,
      employerFees: salary.employerFees,
    });

    const monthName = monthStart.toLocaleDateString('sv-SE', { month: 'long' });
    const filename = `provisorisk_lonespec_${monthName}_${now.getFullYear()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating provisional salary PDF:', error);
    res.status(500).json({ success: false, message: 'Kunde inte generera provisorisk lönespecifikation' });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * GET /api/salary/admin/overview
 * Admin salary overview - all employees, current month + totals
 */
router.get('/admin/overview', requireRole(['ADMIN', 'ACCOUNTANT']), async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    // Get all employees with hourly rates
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        hourlyRate: true,
        vacationPayPercent: true,
        personalNumber: true,
        bankAccount: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get approved time reports for this month per employee
    const monthReports = await prisma.timeReport.findMany({
      where: {
        status: 'APPROVED',
        weekStartDate: { gte: monthStart, lte: monthEnd },
        user: { role: 'EMPLOYEE' },
      },
      select: {
        userId: true,
        totalHours: true,
      },
    });

    // Get completed salary logs for this year per employee
    const yearLogs = await prisma.fortnoxSalaryLog.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: yearStart, lt: yearEnd },
      },
      select: {
        userId: true,
        grossPay: true,
        netPay: true,
        taxDeduction: true,
        vacationPay: true,
        employerFees: true,
        totalHours: true,
      },
    });

    // Get pending (submitted but not approved) reports for this month
    const pendingReports = await prisma.timeReport.findMany({
      where: {
        status: 'SUBMITTED',
        weekStartDate: { gte: monthStart, lte: monthEnd },
        user: { role: 'EMPLOYEE' },
      },
      select: {
        userId: true,
        totalHours: true,
      },
    });

    // Aggregate per employee
    const employeeData = employees.map((emp) => {
      const monthHours = monthReports
        .filter((r) => r.userId === emp.id)
        .reduce((sum, r) => sum + r.totalHours, 0);
      const pendingHours = pendingReports
        .filter((r) => r.userId === emp.id)
        .reduce((sum, r) => sum + r.totalHours, 0);

      const hourlyRate = emp.hourlyRate || 0;
      const vacationPayPercent = emp.vacationPayPercent || 12;

      const monthlySalary = monthHours > 0
        ? calculateSalary(monthHours, hourlyRate, vacationPayPercent)
        : { grossPay: 0, netPay: 0, taxDeduction: 0, vacationPay: 0, employerFees: 0, totalCostEmployer: 0 };

      const ytdLogs = yearLogs.filter((l) => l.userId === emp.id);
      const ytd = ytdLogs.reduce(
        (acc, l) => ({
          grossPay: acc.grossPay + l.grossPay,
          netPay: acc.netPay + l.netPay,
          taxDeduction: acc.taxDeduction + l.taxDeduction,
          totalHours: acc.totalHours + l.totalHours,
          employerFees: acc.employerFees + l.employerFees,
        }),
        { grossPay: 0, netPay: 0, taxDeduction: 0, totalHours: 0, employerFees: 0 }
      );

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        hourlyRate,
        vacationPayPercent,
        hasBankAccount: !!emp.bankAccount,
        hasPersonalNumber: !!emp.personalNumber,
        month: {
          approvedHours: monthHours,
          pendingHours,
          ...monthlySalary,
        },
        ytd,
      };
    });

    // Company totals
    const totals = {
      month: {
        approvedHours: employeeData.reduce((s, e) => s + e.month.approvedHours, 0),
        grossPay: employeeData.reduce((s, e) => s + e.month.grossPay, 0),
        netPay: employeeData.reduce((s, e) => s + e.month.netPay, 0),
        taxDeduction: employeeData.reduce((s, e) => s + e.month.taxDeduction, 0),
        employerFees: employeeData.reduce((s, e) => s + e.month.employerFees, 0),
        totalCostEmployer: employeeData.reduce((s, e) => s + e.month.totalCostEmployer, 0),
      },
      ytd: {
        totalHours: employeeData.reduce((s, e) => s + e.ytd.totalHours, 0),
        grossPay: employeeData.reduce((s, e) => s + e.ytd.grossPay, 0),
        netPay: employeeData.reduce((s, e) => s + e.ytd.netPay, 0),
        taxDeduction: employeeData.reduce((s, e) => s + e.ytd.taxDeduction, 0),
        employerFees: employeeData.reduce((s, e) => s + e.ytd.employerFees, 0),
      },
    };

    res.json({
      year,
      month,
      monthName: monthStart.toLocaleDateString('sv-SE', { month: 'long' }),
      employees: employeeData,
      totals,
    });
  } catch (error) {
    console.error('Error fetching admin salary overview:', error);
    res.status(500).json({ success: false, message: 'Kunde inte hämta löneöversikt' });
  }
});

/**
 * GET /api/salary/admin/history
 * Admin view of all salary logs with filters
 */
router.get('/admin/history', requireRole(['ADMIN', 'ACCOUNTANT']), async (req: Request, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const employeeId = req.query.employeeId as string | undefined;

    const where: any = {
      status: 'COMPLETED',
      createdAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    };
    if (employeeId) where.userId = employeeId;

    const logs = await prisma.fortnoxSalaryLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, bankAccount: true } },
        timeReport: { select: { weekNumber: true, year: true, weekStartDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totals = logs.reduce(
      (acc, log) => ({
        grossPay: acc.grossPay + log.grossPay,
        netPay: acc.netPay + log.netPay,
        taxDeduction: acc.taxDeduction + log.taxDeduction,
        vacationPay: acc.vacationPay + log.vacationPay,
        employerFees: acc.employerFees + log.employerFees,
        totalHours: acc.totalHours + log.totalHours,
      }),
      { grossPay: 0, netPay: 0, taxDeduction: 0, vacationPay: 0, employerFees: 0, totalHours: 0 }
    );

    res.json({
      year,
      entries: logs.map((log) => ({
        id: log.id,
        employeeName: log.user.name,
        employeeEmail: log.user.email,
        bankAccount: log.user.bankAccount || '',
        weekNumber: log.timeReport.weekNumber,
        year: log.timeReport.year,
        weekStartDate: log.timeReport.weekStartDate,
        totalHours: log.totalHours,
        hourlyRate: log.hourlyRate,
        grossPay: log.grossPay,
        netPay: log.netPay,
        taxDeduction: log.taxDeduction,
        vacationPay: log.vacationPay,
        employerFees: log.employerFees,
        createdAt: log.createdAt,
      })),
      totals,
    });
  } catch (error) {
    console.error('Error fetching admin salary history:', error);
    res.status(500).json({ success: false, message: 'Kunde inte hämta lönehistorik' });
  }
});

/**
 * GET /api/salary/admin/:id/pdf
 * Admin download salary spec PDF for any employee
 */
router.get('/admin/:id/pdf', requireRole(['ADMIN', 'ACCOUNTANT']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const salaryLog = await prisma.fortnoxSalaryLog.findFirst({
      where: { id, status: 'COMPLETED' },
      include: {
        user: {
          select: {
            name: true,
            personalNumber: true,
            bankAccount: true,
            hourlyRate: true,
            vacationPayPercent: true,
          },
        },
        timeReport: {
          select: { weekNumber: true, year: true, weekStartDate: true, totalHours: true },
        },
      },
    });

    if (!salaryLog) {
      return res.status(404).json({ success: false, message: 'Lönespecifikation hittades inte' });
    }

    const basePay = salaryLog.totalHours * salaryLog.hourlyRate;

    const pdfBuffer = await generateSalarySpecPdf({
      employeeName: salaryLog.user.name,
      personalNumber: salaryLog.user.personalNumber,
      bankAccount: salaryLog.user.bankAccount,
      weekNumber: salaryLog.timeReport.weekNumber,
      year: salaryLog.timeReport.year,
      weekStartDate: salaryLog.timeReport.weekStartDate,
      totalHours: salaryLog.totalHours,
      hourlyRate: salaryLog.hourlyRate,
      basePay,
      vacationPay: salaryLog.vacationPay,
      vacationPayPercent: salaryLog.user.vacationPayPercent || 12,
      grossPay: salaryLog.grossPay,
      taxDeduction: salaryLog.taxDeduction,
      netPay: salaryLog.netPay,
      employerFees: salaryLog.employerFees,
    });

    const safeName = salaryLog.user.name.replace(/\s+/g, '_');
    const filename = `lonespec_${safeName}_v${salaryLog.timeReport.weekNumber}_${salaryLog.timeReport.year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating admin salary PDF:', error);
    res.status(500).json({ success: false, message: 'Kunde inte generera lönespecifikation' });
  }
});

export default router;
