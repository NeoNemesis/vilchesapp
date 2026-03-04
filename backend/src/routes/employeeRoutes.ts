import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// Validation schemas
const createEmployeeSchema = z.object({
  name: z.string().min(2, 'Namnet måste vara minst 2 tecken'),
  email: z.string().email('Ogiltig e-postadress'),
  phone: z.string().optional(),
  company: z.string().optional(),
  isActive: z.boolean().default(true),
  hourlyRate: z.number().positive().optional(),
  vacationPayPercent: z.number().min(0).max(100).default(12),
  personalNumber: z.string().optional(),
  address: z.string().optional(),
  bankAccount: z.string().optional(),
  employmentStartDate: z.string().optional(),
  employmentType: z.string().optional(),
});

const updateEmployeeSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  isActive: z.boolean().optional(),
  hourlyRate: z.number().positive().optional().nullable(),
  vacationPayPercent: z.number().min(0).max(100).optional().nullable(),
  personalNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  employmentStartDate: z.string().optional().nullable(),
  employmentType: z.string().optional().nullable(),
});

// GET /api/employees - Hämta alla anställda
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const employees = await prisma.user.findMany({
      where: {
        role: 'EMPLOYEE'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        isActive: true,
        createdAt: true,
        hourlyRate: true,
        employmentType: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({
      message: 'Kunde inte hämta anställda',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// GET /api/employees/:id - Hämta en anställd med detaljer
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.user.findFirst({
      where: { id, role: 'EMPLOYEE' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        isActive: true,
        createdAt: true,
        hourlyRate: true,
        vacationPayPercent: true,
        personalNumber: true,
        address: true,
        bankAccount: true,
        employmentStartDate: true,
        employmentType: true,
      }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Anställd hittades inte' });
    }

    // Hämta tidsrapportstatistik
    const timeReports = await prisma.timeReport.findMany({
      where: { userId: id },
      select: {
        id: true,
        weekNumber: true,
        year: true,
        weekStartDate: true,
        status: true,
        totalHours: true,
        submittedAt: true,
        approvedAt: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
        entries: {
          select: {
            id: true,
            activityName: true,
            totalHours: true,
            project: {
              select: { id: true, title: true, projectNumber: true }
            }
          }
        },
        approvedBy: {
          select: { name: true }
        }
      },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }]
    });

    const totalApprovedHours = timeReports
      .filter(r => r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.totalHours, 0);

    const pendingCount = timeReports.filter(r => r.status === 'SUBMITTED').length;

    res.json({
      ...employee,
      timeReports,
      stats: {
        totalReports: timeReports.length,
        totalApprovedHours,
        pendingCount,
      }
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({
      message: 'Kunde inte hämta anställd',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// POST /api/employees - Skapa ny anställd
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const validatedData = createEmployeeSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'En användare med denna e-postadress finns redan'
      });
    }

    const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 12) + '!A1';
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const { employmentStartDate, ...restData } = validatedData;
    const employee = await prisma.user.create({
      data: {
        ...restData,
        role: 'EMPLOYEE',
        password: hashedPassword,
        ...(employmentStartDate ? { employmentStartDate: new Date(employmentStartDate) } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        isActive: true,
        createdAt: true,
        hourlyRate: true,
        vacationPayPercent: true,
        personalNumber: true,
        address: true,
        bankAccount: true,
        employmentStartDate: true,
        employmentType: true,
      }
    });

    console.log(`Ny anställd skapad: ${employee.email}`);

    res.status(201).json({
      ...employee,
      tempPassword
    });
  } catch (error) {
    console.error('Error creating employee:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Ogiltiga data',
        errors: error.errors
      });
    }

    res.status(500).json({
      message: 'Kunde inte skapa anställd',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// PUT /api/employees/:id - Uppdatera anställd
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateEmployeeSchema.parse(req.body);

    const existingEmployee = await prisma.user.findFirst({
      where: { id, role: 'EMPLOYEE' }
    });

    if (!existingEmployee) {
      return res.status(404).json({ message: 'Anställd hittades inte' });
    }

    if (validatedData.email && validatedData.email !== existingEmployee.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email }
      });

      if (emailExists) {
        return res.status(400).json({
          message: 'En användare med denna e-postadress finns redan'
        });
      }
    }

    const { employmentStartDate: startDate, ...restUpdateData } = validatedData;
    const updatedEmployee = await prisma.user.update({
      where: { id },
      data: {
        ...restUpdateData,
        ...(startDate !== undefined ? { employmentStartDate: startDate ? new Date(startDate) : null } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        isActive: true,
        createdAt: true,
        hourlyRate: true,
        vacationPayPercent: true,
        personalNumber: true,
        address: true,
        bankAccount: true,
        employmentStartDate: true,
        employmentType: true,
      }
    });

    res.json(updatedEmployee);
  } catch (error) {
    console.error('Error updating employee:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Ogiltiga data',
        errors: error.errors
      });
    }

    res.status(500).json({
      message: 'Kunde inte uppdatera anställd',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// DELETE /api/employees/:id - Ta bort anställd
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existingEmployee = await prisma.user.findFirst({
      where: { id, role: 'EMPLOYEE' }
    });

    if (!existingEmployee) {
      return res.status(404).json({ message: 'Anställd hittades inte' });
    }

    // Kontrollera om anställd har tidsrapporter
    const timeReports = await prisma.timeReport.count({
      where: { userId: id }
    });

    if (timeReports > 0) {
      return res.status(400).json({
        message: `Kan inte ta bort anställd med ${timeReports} tidsrapporter. Inaktivera istället.`
      });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'Anställd borttagen' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({
      message: 'Kunde inte ta bort anställd',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// POST /api/employees/:id/send-welcome - Skicka välkomstmail
router.post('/:id/send-welcome', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.user.findFirst({
      where: { id, role: 'EMPLOYEE' }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Anställd hittades inte' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id },
      data: { resetToken, resetTokenExpiry }
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const loginUrl = `${process.env.FRONTEND_URL || '${process.env.FRONTEND_URL || 'http://localhost:3000'}'}/employee`;
    const resetUrl = `${process.env.FRONTEND_URL || '${process.env.FRONTEND_URL || 'http://localhost:3000'}'}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: employee.email,
      subject: 'Välkommen till ${process.env.COMPANY_NAME || 'VilchesApp'} - Skapa ditt lösenord',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Välkommen till ${process.env.COMPANY_NAME || 'VilchesApp'}</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hej ${employee.name}!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Du har blivit registrerad som anställd i vårt system. Här kommer du att kunna:
            </p>
            <ul style="color: #4b5563; line-height: 1.8; margin-bottom: 25px;">
              <li>Rapportera din arbetstid veckovis</li>
              <li>Se historik över dina tidsrapporter</li>
              <li>Hantera dina profilinställningar</li>
            </ul>
            <div style="background: #fff; padding: 25px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 25px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">Kom igång:</h3>
              <p style="color: #4b5563; margin-bottom: 20px;">
                Klicka på knappen nedan för att skapa ditt lösenord:
              </p>
              <a href="${resetUrl}"
                 style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px;
                        text-decoration: none; border-radius: 6px; font-weight: 600;">
                Skapa Lösenord
              </a>
            </div>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
              <h4 style="color: #1f2937; margin-top: 0;">Inloggningsuppgifter:</h4>
              <p style="color: #4b5563; margin: 5px 0;"><strong>E-post:</strong> ${employee.email}</p>
              <p style="color: #4b5563; margin: 5px 0;"><strong>Inloggningslänk:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Länken är giltig i 24 timmar. Kontakta oss på ${process.env.COMPANY_EMAIL || ''} vid frågor.
            </p>
            <hr style="border: none; height: 1px; background: #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Med vänliga hälsningar,<br>
              <strong>${process.env.COMPANY_NAME || 'VilchesApp'}</strong>
            </p>
          </div>
        </div>
      `
    });

    res.json({ message: 'Välkomstmail skickat', email: employee.email });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({
      message: 'Kunde inte skicka välkomstmail',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// POST /api/employees/:id/reset-password - Skicka lösenordsbyte-mail
router.post('/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.user.findFirst({
      where: { id, role: 'EMPLOYEE' }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Anställd hittades inte' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: employee.id },
      data: { resetToken, resetTokenExpiry }
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL || '${process.env.FRONTEND_URL || 'http://localhost:3000'}'}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: employee.email,
      subject: 'Återställ ditt lösenord - ${process.env.COMPANY_NAME || 'VilchesApp'}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Återställ Lösenord</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Hej ${employee.name}!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
              En administratör har begärt att ditt lösenord ska återställas.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px;
                        text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Återställ Lösenord
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              Länken är giltig i 1 timme.
            </p>
            <hr style="border: none; height: 1px; background: #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Med vänliga hälsningar,<br>
              <strong>${process.env.COMPANY_NAME || 'VilchesApp'}</strong>
            </p>
          </div>
        </div>
      `
    });

    res.json({ message: 'Lösenordsbyte-mail skickat', email: employee.email });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({
      message: 'Kunde inte skicka lösenordsbyte-mail',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

export default router;
