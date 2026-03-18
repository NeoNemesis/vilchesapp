import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';

// SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export class EmailNotificationService {

  // Skicka välkomstmail med lösenordsåterställningslänk
  static async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    try {
      // Skapa reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 timmar

      // Spara token i databasen
      await prisma.user.update({
        where: { email: userEmail },
        data: {
          resetToken,
          resetTokenExpiry
        }
      });

      const resetUrl = `${process.env.BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'VilchesApp'}" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `🎉 Välkommen till ${process.env.COMPANY_NAME || 'VilchesApp'}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Välkommen till ${process.env.COMPANY_NAME || 'VilchesApp'}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">

              <!-- Header -->
              <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #1e40af;">
                <h1 style="color: #1e40af; margin: 0; font-size: 24px;">${process.env.COMPANY_NAME || 'VilchesApp'}</h1>
                <p style="color: #666; margin: 5px 0 0 0;">Professionella byggentreprenörer</p>
              </div>

              <!-- Main Content -->
              <div style="padding: 30px 0;">
                <h2 style="color: #333; margin-bottom: 20px;">Välkommen ${userName}! 🎉</h2>

                <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                  Vi är glada att ha dig som partner i vårt team. Du har nu tillgång till vårt projekthanteringssystem
                  där du kan se dina uppdrag, skicka rapporter och kommunicera med oss.
                </p>

                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #1e40af; margin-top: 0;">📋 Vad du kan göra i systemet:</h3>
                  <ul style="color: #555; line-height: 1.8;">
                    <li>Se dina tilldelade projekt</li>
                    <li>Skicka detaljerade arbetsrapporter</li>
                    <li>Ladda upp bilder och dokumentation</li>
                    <li>Hantera material och kostnader</li>
                    <li>Uppdatera din profil och inställningar</li>
                  </ul>
                </div>

                <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                  <h3 style="color: #92400e; margin-top: 0;">🔐 Sätt ditt lösenord</h3>
                  <p style="color: #92400e; margin-bottom: 15px;">
                    För att komma igång behöver du sätta ett säkert lösenord. Klicka på knappen nedan:
                  </p>

                  <div style="text-align: center; margin: 25px 0;">
                    <a href="${resetUrl}"
                       style="display: inline-block; background-color: #1e40af; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Sätt mitt lösenord
                    </a>
                  </div>

                  <p style="color: #92400e; font-size: 14px; margin-bottom: 0;">
                    ⏰ Länken är giltig i 24 timmar
                  </p>
                </div>

                <!-- Login Info -->
                <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #166534; margin-top: 0;">🔑 Dina inloggningsuppgifter:</h3>
                  <p style="color: #166534; margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
                  <p style="color: #166534; margin: 5px 0;"><strong>Portal:</strong> ${process.env.FRONTEND_URL || 'http://localhost:3000'}</p>
                </div>

                <!-- Support Info -->
                <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #334155; margin-top: 0;">📞 Behöver du hjälp?</h3>
                  <p style="color: #475569; margin: 5px 0;">
                    <strong>Email:</strong> ${process.env.COMPANY_EMAIL || process.env.SMTP_USER || 'noreply@vilchesapp.com'}<br>
                    <strong>Telefon:</strong> [Ditt telefonnummer]<br>
                    <strong>Support:</strong> Vi hjälper dig gärna med tekniska frågor
                  </p>
                </div>

                <p style="color: #555; line-height: 1.6; margin-top: 30px;">
                  Vi ser fram emot ett framgångsrikt samarbete!
                </p>

                <p style="color: #555; margin-top: 20px;">
                  Med vänliga hälsningar,<br>
                  <strong>${process.env.COMPANY_NAME || 'VilchesApp'}</strong>
                </p>
              </div>

              <!-- Footer -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  ${process.env.COMPANY_NAME || 'VilchesApp'} | [Din adress] | ${process.env.COMPANY_EMAIL || process.env.SMTP_USER || 'noreply@vilchesapp.com'}
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
                  Om du inte begärde detta konto, ignorera detta mail.
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Välkomstmail skickat till ${userEmail}`);
      return true;

    } catch (error) {
      console.error('❌ Fel vid skickande av välkomstmail:', error);
      return false;
    }
  }

  // Skicka lösenordsåterställningsmail
  static async sendPasswordResetEmail(userEmail: string, userName: string): Promise<boolean> {
    try {
      // Skapa reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 timme

      // Spara token i databasen
      await prisma.user.update({
        where: { email: userEmail },
        data: {
          resetToken,
          resetTokenExpiry
        }
      });

      const resetUrl = `${process.env.BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'VilchesApp'}" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `🔐 Återställ ditt lösenord - ${process.env.COMPANY_NAME || 'VilchesApp'}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Återställ lösenord</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">

              <!-- Header -->
              <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #1e40af;">
                <h1 style="color: #1e40af; margin: 0; font-size: 24px;">${process.env.COMPANY_NAME || 'VilchesApp'}</h1>
                <p style="color: #666; margin: 5px 0 0 0;">Lösenordsåterställning</p>
              </div>

              <!-- Main Content -->
              <div style="padding: 30px 0;">
                <h2 style="color: #333; margin-bottom: 20px;">Hej ${userName}! 🔐</h2>

                <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                  Du har begärt att återställa ditt lösenord för ${process.env.COMPANY_NAME || 'VilchesApp'}:s projektportal.
                </p>

                <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                  <h3 style="color: #92400e; margin-top: 0;">🔑 Återställ ditt lösenord</h3>
                  <p style="color: #92400e; margin-bottom: 15px;">
                    Klicka på knappen nedan för att sätta ett nytt lösenord:
                  </p>

                  <div style="text-align: center; margin: 25px 0;">
                    <a href="${resetUrl}"
                       style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                      Återställ lösenord
                    </a>
                  </div>

                  <p style="color: #92400e; font-size: 14px; margin-bottom: 0;">
                    ⏰ Länken är giltig i 1 timme av säkerhetsskäl
                  </p>
                </div>

                <!-- Security Notice -->
                <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
                  <h3 style="color: #dc2626; margin-top: 0;">⚠️ Säkerhetsnotis</h3>
                  <ul style="color: #dc2626; line-height: 1.6; margin: 0;">
                    <li>Om du inte begärde denna återställning, ignorera detta mail</li>
                    <li>Ditt nuvarande lösenord förblir aktivt tills du sätter ett nytt</li>
                    <li>Använd ett starkt lösenord med minst 8 tecken</li>
                    <li>Inkludera stora/små bokstäver, siffror och specialtecken</li>
                  </ul>
                </div>

                <!-- Alternative -->
                <p style="color: #666; font-size: 14px; margin-top: 20px;">
                  Fungerar inte länken? Kopiera och klistra in denna URL i din webbläsare:<br>
                  <code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-size: 12px; word-break: break-all;">
                    ${resetUrl}
                  </code>
                </p>

                <!-- Support -->
                <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #334155; margin-top: 0;">📞 Behöver du hjälp?</h3>
                  <p style="color: #475569; margin: 0;">
                    Kontakta oss på <strong>${process.env.COMPANY_EMAIL || process.env.SMTP_USER || 'noreply@vilchesapp.com'}</strong> eller ring [ditt telefonnummer]
                  </p>
                </div>

                <p style="color: #555; margin-top: 30px;">
                  Med vänliga hälsningar,<br>
                  <strong>${process.env.COMPANY_NAME || 'VilchesApp'}</strong>
                </p>
              </div>

              <!-- Footer -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  ${process.env.COMPANY_NAME || 'VilchesApp'} | [Din adress] | ${process.env.COMPANY_EMAIL || process.env.SMTP_USER || 'noreply@vilchesapp.com'}
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Lösenordsåterställningsmail skickat till ${userEmail}`);
      return true;

    } catch (error) {
      console.error('❌ Fel vid skickande av lösenordsåterställningsmail:', error);
      return false;
    }
  }

  // Skicka bekräftelse när lösenord har ändrats
  static async sendPasswordChangedConfirmation(userEmail: string, userName: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'VilchesApp'}" <${process.env.SMTP_USER}>`,
        to: userEmail,
        subject: `✅ Lösenord ändrat - ${process.env.COMPANY_NAME || 'VilchesApp'}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Lösenord ändrat</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">

              <!-- Header -->
              <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #10b981;">
                <h1 style="color: #10b981; margin: 0; font-size: 24px;">✅ Lösenord uppdaterat</h1>
                <p style="color: #666; margin: 5px 0 0 0;">${process.env.COMPANY_NAME || 'VilchesApp'}</p>
              </div>

              <!-- Main Content -->
              <div style="padding: 30px 0;">
                <h2 style="color: #333; margin-bottom: 20px;">Hej ${userName}! ✅</h2>

                <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                  <h3 style="color: #166534; margin-top: 0;">🔐 Lösenord framgångsrikt ändrat</h3>
                  <p style="color: #166534; margin-bottom: 0;">
                    Ditt lösenord för ${process.env.COMPANY_NAME || 'VilchesApp'}:s projektportal har uppdaterats.
                  </p>
                </div>

                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #1e40af; margin-top: 0;">📋 Vad händer nu?</h3>
                  <ul style="color: #555; line-height: 1.8; margin: 0;">
                    <li>Du kan nu logga in med ditt nya lösenord</li>
                    <li>Alla aktiva sessioner har avslutats av säkerhetsskäl</li>
                    <li>Du behöver logga in igen på alla enheter</li>
                  </ul>
                </div>

                <!-- Login Info -->
                <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #334155; margin-top: 0;">🔑 Logga in här:</h3>
                  <p style="color: #475569; margin: 0;">
                    <strong>Portal:</strong> ${process.env.FRONTEND_URL || 'http://localhost:3000'}<br>
                    <strong>Email:</strong> ${userEmail}
                  </p>
                </div>

                <!-- Security Notice -->
                <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
                  <h3 style="color: #dc2626; margin-top: 0;">⚠️ Var det inte du?</h3>
                  <p style="color: #dc2626; margin: 0;">
                    Om du inte ändrade ditt lösenord, kontakta oss <strong>omedelbart</strong> på
                    <strong>${process.env.COMPANY_EMAIL || process.env.SMTP_USER || 'noreply@vilchesapp.com'}</strong> eller ring [ditt telefonnummer].
                  </p>
                </div>

                <p style="color: #555; margin-top: 30px;">
                  Tack för att du håller ditt konto säkert!<br>
                  <strong>${process.env.COMPANY_NAME || 'VilchesApp'}</strong>
                </p>
              </div>

              <!-- Footer -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  ${process.env.COMPANY_NAME || 'VilchesApp'} | [Din adress] | ${process.env.COMPANY_EMAIL || process.env.SMTP_USER || 'noreply@vilchesapp.com'}
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
                  Datum: ${new Date().toLocaleString('sv-SE')}
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Lösenordsändringsbekräftelse skickat till ${userEmail}`);
      return true;

    } catch (error) {
      console.error('❌ Fel vid skickande av lösenordsändringsbekräftelse:', error);
      return false;
    }
  }

  // Skicka rapportsammanfattning till kund
  static async sendReportToClient(
    clientEmail: string,
    clientName: string,
    project: { title: string; address: string; projectNumber: string },
    report: { title: string; workDescription: string; hoursWorked: number; progressPercent: number; nextSteps?: string | null }
  ): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'VilchesApp'}" <${process.env.SMTP_USER}>`,
        to: clientEmail,
        subject: `Statusrapport: ${project.title} - ${process.env.COMPANY_NAME || 'VilchesApp'}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Statusrapport</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">

              <!-- Header -->
              <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #1e40af;">
                <h1 style="color: #1e40af; margin: 0; font-size: 24px;">${process.env.COMPANY_NAME || 'VilchesApp'}</h1>
                <p style="color: #666; margin: 5px 0 0 0;">Statusrapport</p>
              </div>

              <!-- Main Content -->
              <div style="padding: 30px 0;">
                <h2 style="color: #333; margin-bottom: 20px;">Hej ${clientName},</h2>

                <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
                  Här kommer en statusuppdatering för ert projekt.
                </p>

                <!-- Projektinfo -->
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #1e40af; margin-top: 0;">Projekt: ${project.title}</h3>
                  <p style="color: #555; margin: 5px 0;"><strong>Adress:</strong> ${project.address}</p>
                  <p style="color: #555; margin: 5px 0;"><strong>Projektnummer:</strong> ${project.projectNumber}</p>
                </div>

                <!-- Rapport -->
                <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
                  <h3 style="color: #166534; margin-top: 0;">${report.title}</h3>
                  <p style="color: #555; line-height: 1.6;">${report.workDescription}</p>
                  <hr style="border: none; border-top: 1px solid #d1fae5; margin: 15px 0;">
                  <p style="color: #555; margin: 5px 0;"><strong>Arbetade timmar:</strong> ${report.hoursWorked}h</p>
                  <p style="color: #555; margin: 5px 0;"><strong>Framsteg:</strong> ${report.progressPercent}%</p>
                  ${report.nextSteps ? `<p style="color: #555; margin: 5px 0;"><strong>Nästa steg:</strong> ${report.nextSteps}</p>` : ''}
                </div>

                <p style="color: #555; line-height: 1.6; margin-top: 30px;">
                  Har ni frågor eller funderingar? Tveka inte att kontakta oss.
                </p>

                <p style="color: #555; margin-top: 20px;">
                  Med vänliga hälsningar,<br>
                  <strong>${process.env.COMPANY_NAME || 'VilchesApp'}</strong>
                </p>
              </div>

              <!-- Footer -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  ${process.env.COMPANY_NAME || 'VilchesApp'} | ${process.env.COMPANY_EMAIL || process.env.SMTP_USER || 'noreply@vilchesapp.com'}
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Rapportmail skickat till kund: ${clientEmail}`);
      return true;

    } catch (error) {
      console.error('❌ Fel vid skickande av rapportmail till kund:', error);
      return false;
    }
  }

  // Skicka notifikation till admin när contractor avvisar projekt
  static async sendProjectRejectionNotification(
    adminEmail: string,
    adminName: string,
    contractorName: string,
    project: { title: string; id: string; projectNumber: string },
    reason?: string
  ): Promise<boolean> {
    try {
      const projectUrl = `${process.env.BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/projects/${project.id}`;

      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'VilchesApp'}" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `Projekt avvisat: ${project.title} - Åtgärd krävs`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Projekt avvisat</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">

              <!-- Header -->
              <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #dc2626;">
                <h1 style="color: #dc2626; margin: 0; font-size: 24px;">Projekt avvisat</h1>
                <p style="color: #666; margin: 5px 0 0 0;">${process.env.COMPANY_NAME || 'VilchesApp'}</p>
              </div>

              <!-- Main Content -->
              <div style="padding: 30px 0;">
                <h2 style="color: #333; margin-bottom: 20px;">Hej ${adminName},</h2>

                <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
                  <p style="color: #991b1b; margin: 0 0 10px 0;">
                    <strong>${contractorName}</strong> har avvisat projektet <strong>${project.title}</strong> (${project.projectNumber}).
                  </p>
                  <p style="color: #991b1b; margin: 0;">
                    <strong>Anledning:</strong> ${reason || 'Ingen anledning angiven'}
                  </p>
                </div>

                <p style="color: #555; line-height: 1.6;">
                  Projektet har satts tillbaka till <strong>PENDING</strong> och behöver tilldelas en ny entreprenör.
                </p>

                <div style="text-align: center; margin: 25px 0;">
                  <a href="${projectUrl}"
                     style="display: inline-block; background-color: #1e40af; color: white; padding: 12px 30px;
                            text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Visa projekt
                  </a>
                </div>
              </div>

              <!-- Footer -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  ${process.env.COMPANY_NAME || 'VilchesApp'} | ${process.env.COMPANY_EMAIL || process.env.SMTP_USER || 'noreply@vilchesapp.com'}
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Avvisningsnotifikation skickad till admin: ${adminEmail}`);
      return true;

    } catch (error) {
      console.error('❌ Fel vid skickande av avvisningsnotifikation:', error);
      return false;
    }
  }

}

export default EmailNotificationService;