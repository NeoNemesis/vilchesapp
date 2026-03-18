import { Router } from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

const accountantSchema = z.object({
  name: z.string().min(2, 'Namn krävs'),
  email: z.string().email('Ogiltig e-postadress'),
  company: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

// GET /api/settings/accountant - Hämta inställningar
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let settings = await prisma.accountantSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    // If no settings saved yet, try to populate from ACCOUNTANT user
    if (!settings) {
      const accountantUser = await prisma.user.findFirst({
        where: { role: 'ACCOUNTANT' },
        select: { name: true, email: true, phone: true, company: true }
      });
      if (accountantUser) {
        res.json({
          name: accountantUser.name,
          email: accountantUser.email,
          phone: accountantUser.phone || '',
          company: accountantUser.company || '',
        });
        return;
      }
    }

    res.json(settings || null);
  } catch (error) {
    console.error('Error fetching accountant settings:', error);
    res.status(500).json({ message: 'Kunde inte hämta revisorsinställningar' });
  }
});

// PUT /api/settings/accountant - Spara inställningar
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const validatedData = accountantSchema.parse(req.body);

    // Upsert - update existing or create new
    const existing = await prisma.accountantSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    let settings;
    if (existing) {
      settings = await prisma.accountantSettings.update({
        where: { id: existing.id },
        data: {
          ...validatedData,
          updatedById: req.user!.userId,
        }
      });
    } else {
      settings = await prisma.accountantSettings.create({
        data: {
          ...validatedData,
          updatedById: req.user!.userId,
        }
      });
    }

    // Sync with ACCOUNTANT user account if one exists with matching email
    const accountantUser = await prisma.user.findFirst({
      where: { role: 'ACCOUNTANT' }
    });
    if (accountantUser) {
      await prisma.user.update({
        where: { id: accountantUser.id },
        data: {
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone || null,
          company: validatedData.company || null,
        }
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error saving accountant settings:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Ogiltiga data', errors: error.errors });
    }

    res.status(500).json({ message: 'Kunde inte spara revisorsinställningar' });
  }
});

// POST /api/settings/accountant/test-email - Skicka testmail
router.post('/test-email', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await prisma.accountantSettings.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    if (!settings) {
      return res.status(400).json({ message: 'Spara revisorsinställningar först' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
      to: settings.email,
      subject: `Testmail - ${process.env.COMPANY_NAME || 'VilchesApp'} Tidsrapportering`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Testmail</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937;">Hej ${settings.name}!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              Detta är ett testmail från ${process.env.COMPANY_NAME || 'VilchesApp'}:s tidsrapporteringssystem.
              Om du ser detta meddelande fungerar e-postkonfigurationen korrekt.
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              Framöver kommer godkända tidsrapporter att skickas till denna e-postadress
              med bifogade PDF- och/eller CSV-filer.
            </p>
            <hr style="border: none; height: 1px; background: #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px; text-align: center;">
              Med vänliga hälsningar,<br>
              <strong>${process.env.COMPANY_NAME || 'VilchesApp'}</strong><br>
              ${process.env.COMPANY_EMAIL || ''}
            </p>
          </div>
        </div>
      `
    });

    res.json({ message: `Testmail skickat till ${settings.email}` });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ message: 'Kunde inte skicka testmail' });
  }
});

export default router;
