/**
 * Fortnox Salary Service - Orchestration
 * Processes salary when a time report is sent to accountant.
 * If Fortnox is not configured, silently returns. Errors never block accountant mail.
 */

import { prisma } from '../lib/prisma';
import { calculateSalary } from './swedishTaxCalculator';
import { generateSalarySpecPdf } from './salarySpecPdfGenerator';
import { sendSalarySpecToEmployee, sendSalarySummaryToAdmin } from './fortnoxEmailService';
import * as fortnox from './fortnoxApiClient';

/**
 * Process Fortnox salary for a single time report
 * Silently returns if Fortnox is not enabled/connected
 */
export async function processFortnoxSalary(timeReportId: string): Promise<void> {
  // 1. Check if Fortnox is enabled and connected
  const isActive = await fortnox.isConfiguredAndConnected();
  if (!isActive) return;

  // 2. Load time report with user data
  const report = await prisma.timeReport.findUnique({
    where: { id: timeReportId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          hourlyRate: true,
          vacationPayPercent: true,
          personalNumber: true,
          bankAccount: true,
          fortnoxEmployeeId: true,
          fortnoxSyncedAt: true,
        },
      },
      entries: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!report || !report.user) {
    console.error(`[Fortnox] Time report ${timeReportId} not found`);
    return;
  }

  const user = report.user;
  const hourlyRate = user.hourlyRate || 0;
  const vacationPayPercent = user.vacationPayPercent || 12;

  if (hourlyRate <= 0) {
    console.warn(`[Fortnox] User ${user.name} has no hourly rate set, skipping salary processing`);
    return;
  }

  // 3. Create salary log with PENDING status
  const salaryLog = await prisma.fortnoxSalaryLog.create({
    data: {
      timeReportId: report.id,
      userId: user.id,
      status: 'PENDING',
      totalHours: report.totalHours,
      hourlyRate,
    },
  });

  try {
    // Update to PROCESSING
    await prisma.fortnoxSalaryLog.update({
      where: { id: salaryLog.id },
      data: { status: 'PROCESSING' },
    });

    // 4. Sync employee to Fortnox if not already mapped
    let fortnoxEmployeeId = user.fortnoxEmployeeId;
    if (!fortnoxEmployeeId) {
      try {
        const nameParts = user.name.split(' ');
        const firstName = nameParts[0] || user.name;
        const lastName = nameParts.slice(1).join(' ') || '-';

        // Generate a short employee ID from user ID
        fortnoxEmployeeId = user.id.substring(0, 8).toUpperCase();

        await fortnox.createEmployee({
          employeeId: fortnoxEmployeeId,
          firstName,
          lastName,
          personalNumber: user.personalNumber || undefined,
        });

        await prisma.user.update({
          where: { id: user.id },
          data: {
            fortnoxEmployeeId,
            fortnoxSyncedAt: new Date(),
          },
        });
      } catch (error: any) {
        // Employee might already exist in Fortnox
        console.warn(`[Fortnox] Could not create employee: ${error.message}`);
        if (!fortnoxEmployeeId) {
          fortnoxEmployeeId = user.id.substring(0, 8).toUpperCase();
        }
      }
    }

    // 5. Create attendance transactions per day
    const weekStart = new Date(report.weekStartDate);
    const dayFields = [
      'mondayHours', 'tuesdayHours', 'wednesdayHours',
      'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours',
    ] as const;

    for (const entry of report.entries) {
      for (let d = 0; d < 7; d++) {
        const hours = entry[dayFields[d]];
        if (hours > 0) {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + d);
          const dateStr = date.toISOString().split('T')[0];

          try {
            await fortnox.createAttendanceTransaction({
              employeeId: fortnoxEmployeeId!,
              date: dateStr,
              hours,
              causeCode: 'TID',
            });
          } catch (error: any) {
            console.warn(`[Fortnox] Attendance transaction failed for ${dateStr}: ${error.message}`);
          }
        }
      }
    }

    // 6. Calculate salary
    const salary = calculateSalary(report.totalHours, hourlyRate, vacationPayPercent);

    // 7. Generate salary spec PDF
    const pdfBuffer = await generateSalarySpecPdf({
      employeeName: user.name,
      personalNumber: user.personalNumber,
      bankAccount: user.bankAccount,
      weekNumber: report.weekNumber,
      year: report.year,
      weekStartDate: report.weekStartDate,
      totalHours: report.totalHours,
      hourlyRate,
      basePay: report.totalHours * hourlyRate,
      vacationPay: salary.vacationPay,
      vacationPayPercent,
      grossPay: salary.grossPay,
      taxDeduction: salary.taxDeduction,
      netPay: salary.netPay,
      employerFees: salary.employerFees,
    });

    // 8. Upload to Fortnox archive
    try {
      const filename = `lonespec_${user.name.replace(/\s+/g, '_')}_v${report.weekNumber}_${report.year}.pdf`;
      await fortnox.uploadToArchive(filename, pdfBuffer);
    } catch (error: any) {
      console.warn(`[Fortnox] Archive upload failed: ${error.message}`);
      // Non-blocking
    }

    // 9. Email salary spec to employee
    try {
      await sendSalarySpecToEmployee({
        employee: { name: user.name, email: user.email },
        weekNumber: report.weekNumber,
        year: report.year,
        totalHours: report.totalHours,
        grossPay: salary.grossPay,
        taxDeduction: salary.taxDeduction,
        netPay: salary.netPay,
        vacationPay: salary.vacationPay,
      }, pdfBuffer);
    } catch (error: any) {
      console.warn(`[Fortnox] Email to employee failed: ${error.message}`);
      // Non-blocking
    }

    // 10. Update log to COMPLETED
    await prisma.fortnoxSalaryLog.update({
      where: { id: salaryLog.id },
      data: {
        status: 'COMPLETED',
        grossPay: salary.grossPay,
        netPay: salary.netPay,
        taxDeduction: salary.taxDeduction,
        vacationPay: salary.vacationPay,
        employerFees: salary.employerFees,
      },
    });

  } catch (error: any) {
    console.error(`[Fortnox] Salary processing failed:`, error);

    await prisma.fortnoxSalaryLog.update({
      where: { id: salaryLog.id },
      data: {
        status: 'FAILED',
        errorMessage: error.message?.substring(0, 500) || 'Unknown error',
      },
    });
  }
}

/**
 * Send admin salary summary for processed time reports
 */
export async function sendAdminSalarySummary(timeReportIds: string[]): Promise<void> {
  try {
    const isActive = await fortnox.isConfiguredAndConnected();
    if (!isActive) return;

    // Get completed salary logs for these reports
    const logs = await prisma.fortnoxSalaryLog.findMany({
      where: {
        timeReportId: { in: timeReportIds },
        status: 'COMPLETED',
      },
      include: {
        user: { select: { name: true, bankAccount: true } },
        timeReport: { select: { weekNumber: true, year: true } },
      },
    });

    if (logs.length === 0) return;

    // Get admin email
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { email: true },
    });

    if (!admin) return;

    const rows = logs.map(log => ({
      employeeName: log.user.name,
      weekNumber: log.timeReport.weekNumber,
      totalHours: log.totalHours,
      grossPay: log.grossPay,
      taxDeduction: log.taxDeduction,
      netPay: log.netPay,
      vacationPay: log.vacationPay,
      employerFees: log.employerFees,
      bankAccount: log.user.bankAccount || '',
    }));

    const year = logs[0].timeReport.year;

    await sendSalarySummaryToAdmin(admin.email, rows, year);
  } catch (error: any) {
    console.error(`[Fortnox] Admin summary email failed:`, error.message);
  }
}
