import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createContractorSchema = z.object({
  name: z.string().min(2, 'Namnet måste vara minst 2 tecken'),
  email: z.string().email('Ogiltig e-postadress'),
  phone: z.string().optional(),
  company: z.string().optional(),
  isActive: z.boolean().default(true),
});

const updateContractorSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/contractors - Hämta alla entreprenörer
router.get('/', async (req, res) => {
  try {
    const contractors = await prisma.user.findMany({
      where: {
        role: 'CONTRACTOR'
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(contractors);
  } catch (error) {
    console.error('Error fetching contractors:', error);
    res.status(500).json({ 
      message: 'Kunde inte hämta entreprenörer',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// POST /api/contractors - Skapa ny entreprenör
router.post('/', async (req, res) => {
  try {
    const validatedData = createContractorSchema.parse(req.body);
    
    // Kontrollera om e-postadressen redan finns
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'En användare med denna e-postadress finns redan' 
      });
    }

    // Generera ett temporärt lösenord
    const tempPassword = Math.random().toString(36).slice(-8) + '!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const contractor = await prisma.user.create({
      data: {
        ...validatedData,
        role: 'CONTRACTOR',
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        isActive: true,
        createdAt: true,
      }
    });

    // I framtiden kan vi skicka e-post med inloggningsuppgifter här
    console.log(`Ny entreprenör skapad: ${contractor.email}, temp lösenord: ${tempPassword}`);

    res.status(201).json({
      ...contractor,
      tempPassword // Skicka med temporärt lösenord (i produktion bör detta skickas via e-post)
    });
  } catch (error) {
    console.error('Error creating contractor:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Ogiltiga data',
        errors: error.errors 
      });
    }

    res.status(500).json({ 
      message: 'Kunde inte skapa entreprenör',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// PUT /api/contractors/:id - Uppdatera entreprenör
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateContractorSchema.parse(req.body);

    // Kontrollera om entreprenören finns
    const existingContractor = await prisma.user.findFirst({
      where: {
        id,
        role: 'CONTRACTOR'
      }
    });

    if (!existingContractor) {
      return res.status(404).json({ message: 'Entreprenör hittades inte' });
    }

    // Om e-post ändras, kontrollera att den inte redan används
    if (validatedData.email && validatedData.email !== existingContractor.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email }
      });

      if (emailExists) {
        return res.status(400).json({ 
          message: 'En användare med denna e-postadress finns redan' 
        });
      }
    }

    const updatedContractor = await prisma.user.update({
      where: { id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        isActive: true,
        createdAt: true,
      }
    });

    res.json(updatedContractor);
  } catch (error) {
    console.error('Error updating contractor:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Ogiltiga data',
        errors: error.errors 
      });
    }

    res.status(500).json({ 
      message: 'Kunde inte uppdatera entreprenör',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// DELETE /api/contractors/:id - Ta bort entreprenör
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Kontrollera om entreprenören finns
    const existingContractor = await prisma.user.findFirst({
      where: {
        id,
        role: 'CONTRACTOR'
      }
    });

    if (!existingContractor) {
      return res.status(404).json({ message: 'Entreprenör hittades inte' });
    }

    // Kontrollera om entreprenören har aktiva projekt
    const activeProjects = await prisma.project.count({
      where: {
        assignedToId: id,
        status: {
          in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS']
        }
      }
    });

    if (activeProjects > 0) {
      return res.status(400).json({ 
        message: `Kan inte ta bort entreprenör med ${activeProjects} aktiva projekt. Slutför eller omtilldela projekten först.` 
      });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'Entreprenör borttagen' });
  } catch (error) {
    console.error('Error deleting contractor:', error);
    res.status(500).json({ 
      message: 'Kunde inte ta bort entreprenör',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// GET /api/contractors/stats - Hämta statistik
router.get('/stats', async (req, res) => {
  try {
    const [total, active, inactive] = await Promise.all([
      prisma.user.count({
        where: { role: 'CONTRACTOR' }
      }),
      prisma.user.count({
        where: { 
          role: 'CONTRACTOR',
          isActive: true 
        }
      }),
      prisma.user.count({
        where: { 
          role: 'CONTRACTOR',
          isActive: false 
        }
      })
    ]);

    res.json({
      total,
      active,
      inactive
    });
  } catch (error) {
    console.error('Error fetching contractor stats:', error);
    res.status(500).json({ 
      message: 'Kunde inte hämta statistik',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// POST /api/contractors/:id/send-welcome - Skicka välkomstmail
router.post('/:id/send-welcome', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Hämta entreprenören
    const contractor = await prisma.user.findFirst({
      where: {
        id,
        role: 'CONTRACTOR'
      }
    });

    if (!contractor) {
      return res.status(404).json({ message: 'Entreprenör hittades inte' });
    }

    // Generera en reset-token för lösenordsbyte
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 timmar

    // Spara reset-token i databasen (vi behöver lägga till fält i schema)
    await prisma.user.update({
      where: { id },
      data: {
        // Vi kommer lägga till dessa fält senare
        // resetToken,
        // resetTokenExpiry
      }
    });

    // Skicka välkomstmail
    await sendWelcomeEmail(contractor, resetToken);
    
    res.json({ 
      message: 'Välkomstmail skickat',
      email: contractor.email
    });

  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ 
      message: 'Kunde inte skicka välkomstmail',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// POST /api/contractors/:id/reset-password - Skicka lösenordsbyte-mail
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    
    const contractor = await prisma.user.findFirst({
      where: {
        id,
        role: 'CONTRACTOR'
      }
    });

    if (!contractor) {
      return res.status(404).json({ message: 'Entreprenör hittades inte' });
    }

    // Generera reset-token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Skicka lösenordsbyte-mail
    await sendPasswordResetEmail(contractor, resetToken);
    
    res.json({ 
      message: 'Lösenordsbyte-mail skickat',
      email: contractor.email
    });

  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({ 
      message: 'Kunde inte skicka lösenordsbyte-mail',
      error: error instanceof Error ? error.message : 'Okänt fel'
    });
  }
});

// Hjälpfunktioner för email
async function sendWelcomeEmail(contractor: any, resetToken: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const loginUrl = `${process.env.FRONTEND_URL}/contractor`;
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: contractor.email,
    subject: 'Välkommen till Vilches Entreprenad AB - Skapa ditt lösenord',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Välkommen till Vilches Entreprenad AB</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hej ${contractor.name}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
            Du har blivit registrerad som entreprenör i vårt projektsystem. Här kommer du att kunna:
          </p>
          
          <ul style="color: #4b5563; line-height: 1.8; margin-bottom: 25px;">
            <li>Se dina tilldelade projekt</li>
            <li>Rapportera framsteg och arbete</li>
            <li>Ladda upp bilder från arbetsplatsen</li>
            <li>Kommunicera med projektledning</li>
          </ul>
          
          <div style="background: #fff; padding: 25px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 25px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Kom igång:</h3>
            <p style="color: #4b5563; margin-bottom: 20px;">
              Klicka på knappen nedan för att skapa ditt lösenord och komma åt systemet:
            </p>
            <a href="${resetUrl}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: 600;">
              Skapa Lösenord
            </a>
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="color: #1f2937; margin-top: 0;">Inloggningsuppgifter:</h4>
            <p style="color: #4b5563; margin: 5px 0;"><strong>E-post:</strong> ${contractor.email}</p>
            <p style="color: #4b5563; margin: 5px 0;"><strong>Inloggningslänk:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Länken för lösenordsskapande är giltig i 24 timmar. Om du har frågor, kontakta oss på info@vilchesab.se
          </p>
          
          <hr style="border: none; height: 1px; background: #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Med vänliga hälsningar,<br>
            <strong>Vilches Entreprenad AB</strong><br>
            info@vilchesab.se
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

async function sendPasswordResetEmail(contractor: any, resetToken: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: contractor.email,
    subject: 'Återställ ditt lösenord - Vilches Entreprenad AB',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Återställ Lösenord</h1>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hej ${contractor.name}!</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
            Du har begärt att återställa ditt lösenord för Vilches Entreprenad AB:s projektsystem.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background: #2563eb; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
              Återställ Lösenord
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Länken är giltig i 24 timmar. Om du inte begärt detta, kan du ignorera detta meddelande.
          </p>
          
          <hr style="border: none; height: 1px; background: #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Med vänliga hälsningar,<br>
            <strong>Vilches Entreprenad AB</strong>
          </p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
}

export default router;
