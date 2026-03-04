import { Router } from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { prisma } from '../lib/prisma';

const router = Router();

// API-nyckel för webhook (MÅSTE sättas i .env)
const WEBHOOK_API_KEY = process.env.WEBHOOK_API_KEY;

if (!WEBHOOK_API_KEY) {
  console.error('CRITICAL: WEBHOOK_API_KEY is not set in environment variables!');
}

// Middleware för att validera API-nyckel
const validateApiKey = (req: any, res: any, next: any) => {
  // Avvisa alla requests om API-nyckeln inte är konfigurerad
  if (!WEBHOOK_API_KEY) {
    console.error('Webhook request rejected: WEBHOOK_API_KEY not configured');
    return res.status(503).json({
      success: false,
      message: 'Webhook service not properly configured'
    });
  }

  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== WEBHOOK_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Ogiltig API-nyckel'
    });
  }

  next();
};

// Validation schema för webhook-projekt
const webhookProjectSchema = z.object({
  title: z.string().min(3, 'Titeln måste vara minst 3 tecken'),
  description: z.string().min(10, 'Beskrivningen måste vara minst 10 tecken'),
  clientName: z.string().min(2, 'Kundens namn måste vara minst 2 tecken'),
  clientEmail: z.string().email('Ogiltig e-postadress').optional(),
  clientPhone: z.string().optional(),
  address: z.string().min(5, 'Adressen måste vara minst 5 tecken').optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  originalEmail: z.string().optional(), // Hela original-emailet
});

// =========================================
// HELPER FUNCTIONS FÖR NOTIFIKATIONER
// =========================================

/**
 * Skicka SMS till kund via 46elks (svenskt SMS-system)
 */
async function sendSMSToCustomer(phone: string, title: string): Promise<void> {
  const username = process.env.ELKS_API_USERNAME;
  const password = process.env.ELKS_API_PASSWORD;
  const fromNumber = process.env.ELKS_FROM_NUMBER || 'VilchesAB';

  if (!username || !password) {
    throw new Error('46elks credentials saknas i .env');
  }

  const message = `Tack för din förfråga om ${title.toLowerCase()}!

Vi uppskattar ditt intresse och återkommer inom 24 timmar med mer information.

Besök gärna vår hemsida: vilchesapp.com

Med vänlig hälsning,
${process.env.COMPANY_NAME || 'VilchesApp'}
070-797-85-47`;

  // Rensa telefonnummer (ta bort mellanslag, bindestreck)
  const cleanPhone = phone.replace(/[\s-]/g, '');

  // Lägg till +46 om det börjar med 07
  const toNumber = cleanPhone.startsWith('07')
    ? '+46' + cleanPhone.substring(1)
    : cleanPhone;

  // 46elks API call
  const response = await axios.post(
    'https://api.46elks.com/a1/sms',
    new URLSearchParams({
      from: fromNumber,
      to: toNumber,
      message: message
    }),
    {
      auth: {
        username: username,
        password: password
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  console.log('46elks SMS response:', response.data);
}

/**
 * Skicka bekräftelse-email till kund
 */
async function sendEmailToCustomer(
  email: string,
  name: string,
  projectNumber: string,
  description: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: '${process.env.COMPANY_EMAIL || process.env.SMTP_USER || ''}',
      pass: process.env.SMTP_PASS || ''
    }
  });

  const htmlContent = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #2c5282; margin-top: 0;">Tack för din förfrågan!</h2>
        <p>Hej ${name},</p>
        <p>Vi har tagit emot din förfrågan och uppskattar ditt intresse för ${process.env.COMPANY_NAME || 'VilchesApp'}.</p>
        <div style="background-color: white; padding: 20px; border-left: 4px solid #2c5282; margin: 25px 0; border-radius: 5px;">
            <p style="margin: 0 0 10px 0;"><strong>Ditt projektnummer:</strong> ${projectNumber}</p>
            <p style="margin: 0 0 10px 0;"><strong>Din förfrågan:</strong></p>
            <p style="margin: 0; color: #555;">${description}</p>
        </div>
        <p>Vi kommer att granska din förfrågan och återkomma till dig så snart som möjligt, vanligtvis inom 24 timmar.</p>
        <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>📞 Telefon:</strong> +46 707 978 547</p>
            <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${process.env.COMPANY_EMAIL || process.env.SMTP_USER || ''}</p>
            <p style="margin: 5px 0;"><strong>🌐 Webb:</strong> www.vilchesapp.com</p>
        </div>
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        <p style="font-size: 14px; color: #6c757d;">
            <strong>Med vänlig hälsning,</strong><br>
            Victor Vilches<br>
            Entreprenör / Project Leader<br>
            ${process.env.COMPANY_NAME || 'VilchesApp'}
        </p>
    </div>
</body>
</html>`;

  await transporter.sendMail({
    from: '"${process.env.COMPANY_NAME || 'VilchesApp'}" <${process.env.COMPANY_EMAIL || process.env.SMTP_USER || ''}>',
    to: email,
    subject: 'Tack för din förfrågan - ${process.env.COMPANY_NAME || 'VilchesApp'}',
    html: htmlContent
  });
}

/**
 * Skicka notis till admin (${process.env.COMPANY_EMAIL || process.env.SMTP_USER || ''})
 */
async function sendEmailToAdmin(
  clientName: string,
  clientEmail: string | undefined,
  clientPhone: string | undefined,
  projectNumber: string,
  description: string
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: '${process.env.COMPANY_EMAIL || process.env.SMTP_USER || ''}',
      pass: process.env.SMTP_PASS || ''
    }
  });

  const htmlContent = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #2c5282; margin-top: 0;">🆕 Ny kontaktförfrågan från hemsidan</h2>
        <div style="background-color: white; padding: 20px; border-left: 4px solid #2c5282; margin: 25px 0; border-radius: 5px;">
            <p style="margin: 5px 0;"><strong>📋 Projektnummer:</strong> ${projectNumber}</p>
            <p style="margin: 5px 0;"><strong>👤 Kund:</strong> ${clientName}</p>
            <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${clientEmail || 'Ej angivet'}</p>
            <p style="margin: 5px 0;"><strong>📞 Telefon:</strong> ${clientPhone || 'Ej angivet'}</p>
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>💬 Meddelande:</strong></p>
            <p style="margin: 10px 0; color: #555;">${description}</p>
        </div>
        <p style="font-size: 14px; color: #6c757d;">
            <strong>🔗 Åtgärd:</strong> Logga in i systemet för att tilldela och hantera projektet.
        </p>
    </div>
</body>
</html>`;

  await transporter.sendMail({
    from: '"Vilches System" <${process.env.COMPANY_EMAIL || process.env.SMTP_USER || ''}>',
    to: '${process.env.COMPANY_EMAIL || process.env.SMTP_USER || ''}',
    subject: `Ny kontaktförfrågan - ${clientName}`,
    html: htmlContent
  });
}

/**
 * Skicka Telegram-notis till admin
 */
async function sendTelegramNotification(
  clientName: string,
  clientEmail: string | undefined,
  clientPhone: string | undefined,
  projectNumber: string,
  description: string
): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN saknas i .env');
  }

  if (!chatId) {
    throw new Error('TELEGRAM_CHAT_ID saknas i .env');
  }

  const message = `🆕 **Nytt projekt från hemsidan!**

📋 **Projektnummer:** ${projectNumber}
👤 **Kund:** ${clientName}
📧 **Email:** ${clientEmail || 'Ej angivet'}
📞 **Telefon:** ${clientPhone || 'Ej angivet'}

💬 **Meddelande:**
${description}

🔗 [Visa i systemet](http://localhost:5173/admin/projects)`;

  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown'
  });
}

/**
 * POST /api/webhook/project
 * Publikt endpoint för att skapa otilldelade projekt via n8n
 * Kräver API-nyckel i header: x-api-key
 */
router.post('/project', validateApiKey, async (req, res) => {
  try {
    // ✅ FIX: Mappa gamla fältnamn från frontend till nya fältnamn
    const requestBody = req.body;
    const mappedData = {
      title: requestBody.title || requestBody.subject || 'Ny förfrågan',
      description: requestBody.description || requestBody.message || '',
      clientName: requestBody.clientName || requestBody.name || '',
      clientEmail: requestBody.clientEmail || requestBody.email,
      clientPhone: requestBody.clientPhone || requestBody.phone,
      address: requestBody.address,
      priority: requestBody.priority || 'NORMAL',
      originalEmail: requestBody.originalEmail
    };

    const validatedData = webhookProjectSchema.parse(mappedData);

    // Hitta admin-användare för att sätta som creator
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      console.error('Ingen admin-användare hittades');
      return res.status(500).json({
        success: false,
        message: 'Admin-användare hittades inte'
      });
    }

    // Skapa projektet som otilldelat (PENDING)
    const projectData: any = {
      title: validatedData.title,
      description: validatedData.description,
      clientName: validatedData.clientName,
      clientEmail: validatedData.clientEmail || '${process.env.COMPANY_EMAIL || process.env.SMTP_USER || ''}', // ✅ FIX: Prisma kräver email, använd default om saknas
      address: validatedData.address || 'Ej angivet',
      priority: validatedData.priority,
      status: 'PENDING', // Alltid otilldelat från webhook
      createdById: adminUser.id,
    };

    // Lägg till optional fields om de finns
    if (validatedData.clientPhone) projectData.clientPhone = validatedData.clientPhone;
    if (validatedData.originalEmail) projectData.originalEmail = validatedData.originalEmail;

    const project = await prisma.project.create({
      data: projectData
    });

    console.log(`✅ Webhook: Nytt projekt skapat från email: ${project.title} (ID: ${project.id})`);

    // Skapa notifikation för admin
    try {
      await prisma.notification.create({
        data: {
          type: 'GENERAL',
          subject: `Nytt projekt från email: ${project.title}`,
          message: `Ett nytt projekt har skapats automatiskt från email: "${project.title}"`,
          projectId: project.id,
          userId: adminUser.id
        }
      });
    } catch (notificationError) {
      console.error('Failed to create webhook notification:', notificationError);
    }

    // =========================================
    // NOTIFIKATIONER TILL KUND OCH ADMIN
    // =========================================
    let confirmationMethod = 'none';

    // 1. IF telefon finns → Skicka SMS (prioritet 1)
    if (validatedData.clientPhone) {
      try {
        await sendSMSToCustomer(validatedData.clientPhone, validatedData.title);
        confirmationMethod = 'SMS';
        console.log(`✅ SMS skickat till ${validatedData.clientPhone}`);
      } catch (smsError) {
        console.error('⚠️ SMS kunde inte skickas:', smsError);
        // Fallback till email om SMS failar
        confirmationMethod = 'email-fallback';
      }
    }

    // 2. IF INGEN telefon ELLER SMS failade → Skicka Email till kund
    if (!validatedData.clientPhone || confirmationMethod === 'email-fallback') {
      try {
        await sendEmailToCustomer(
          validatedData.clientEmail || '${process.env.COMPANY_EMAIL || process.env.SMTP_USER || ''}',
          validatedData.clientName,
          project.projectNumber,
          validatedData.description
        );
        confirmationMethod = 'Email';
        console.log(`✅ Email skickat till ${validatedData.clientEmail}`);
      } catch (emailError) {
        console.error('⚠️ Email till kund kunde inte skickas:', emailError);
      }
    }

    // 3. Skicka Email till ${process.env.COMPANY_EMAIL || process.env.SMTP_USER || ''} (ALLTID)
    try {
      await sendEmailToAdmin(
        validatedData.clientName,
        validatedData.clientEmail,
        validatedData.clientPhone,
        project.projectNumber,
        validatedData.description
      );
      console.log('✅ Email skickat till ${process.env.COMPANY_EMAIL || process.env.SMTP_USER || ''}');
    } catch (emailError) {
      console.error('⚠️ Email till admin kunde inte skickas:', emailError);
    }

    // 4. Skicka Telegram notis (ALLTID)
    try {
      await sendTelegramNotification(
        validatedData.clientName,
        validatedData.clientEmail,
        validatedData.clientPhone,
        project.projectNumber,
        validatedData.description
      );
      console.log('✅ Telegram notis skickad');
    } catch (telegramError) {
      console.error('⚠️ Telegram notis kunde inte skickas:', telegramError);
    }

    res.status(201).json({
      success: true,
      message: 'Projekt skapat',
      confirmationMethod: confirmationMethod,
      project: {
        id: project.id,
        title: project.title,
        projectNumber: project.projectNumber,
        status: project.status,
        createdAt: project.createdAt
      }
    });

  } catch (error) {
    console.error('Webhook error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Ogiltiga data',
        errors: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Kunde inte skapa projekt',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

/**
 * GET /api/webhook/health
 * Enkel health check för webhook API
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook API är tillgängligt',
    timestamp: new Date().toISOString()
  });
});

export default router;
