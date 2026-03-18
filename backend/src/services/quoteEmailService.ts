// @ts-nocheck
import nodemailer from 'nodemailer';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';

/**
 * EMAIL-SERVICE FÖR OFFERTER
 *
 * Skickar professionella offerter via email från ${process.env.COMPANY_EMAIL || process.env.SMTP_USER}
 */

// SMTP-konfiguration (lägg till i .env)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  family: 4, // Tvinga IPv4 - Raspberry Pi har problem med IPv6
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD
  }
});

/**
 * Skickar offert via email
 */
async function sendQuoteEmail({ to, quote, pdfPath, customMessage }) {
  try {
    // Läs email-mall
    const templatePath = path.join(__dirname, '../templates/email-quote.html');
    let htmlTemplate;

    try {
      htmlTemplate = await fs.readFile(templatePath, 'utf-8');
    } catch (err) {
      // Fallback till enkel HTML om mallen inte finns
      htmlTemplate = getDefaultEmailTemplate();
    }

    // Skapa publik länk till offerten
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const quoteLink = `${frontendUrl}/quote/${quote.id}`;

    // Ersätt platshållare
    htmlTemplate = htmlTemplate
      .replace(/\{\{clientName\}\}/g, quote.clientName)
      .replace(/\{\{projectType\}\}/g, quote.projectType)
      .replace(/\{\{totalCost\}\}/g, (quote.totalAfterRot || 0).toLocaleString('sv-SE'))
      .replace(/\{\{quoteNumber\}\}/g, quote.quoteNumber)
      .replace(/\{\{quoteLink\}\}/g, quoteLink)
      .replace(/\{\{customMessage\}\}/g, ''); // Ignorerar customMessage för att undvika dubblering

    // Bygg bilagor: PDF + eventuella bilder
    const attachments = [
      {
        filename: `Offert_${quote.quoteNumber}.pdf`,
        path: pdfPath
      }
    ];

    // Bifoga offertbilder om de finns
    if (quote.images && quote.images.length > 0) {
      for (const image of quote.images) {
        const imagePath = path.join(__dirname, '../../uploads/quotes/images', image.filename);
        if (existsSync(imagePath)) {
          attachments.push({
            filename: image.originalName || image.filename,
            path: imagePath
          });
        }
      }
    }

    // Skicka email
    const info = await transporter.sendMail({
      from: `"${process.env.COMPANY_NAME || 'VilchesApp'}" <${process.env.COMPANY_EMAIL || process.env.SMTP_USER}>`,
      to: to,
      subject: `Offert #${quote.quoteNumber} - ${quote.projectType}`,
      html: htmlTemplate,
      attachments
    });

    console.log('✅ Email skickad:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Fel vid skickande av email:', error);
    throw error;
  }
}

/**
 * Skickar påminnelse om offert
 */
async function sendQuoteReminder({ to, quote }) {
  try {
    const htmlTemplate = getReminderEmailTemplate();

    const filledTemplate = htmlTemplate
      .replace(/\{\{clientName\}\}/g, quote.clientName)
      .replace(/\{\{projectType\}\}/g, quote.projectType)
      .replace(/\{\{quoteNumber\}\}/g, quote.quoteNumber)
      .replace(/\{\{totalCost\}\}/g, quote.totalAfterRot.toLocaleString('sv-SE'));

    const info = await transporter.sendMail({
      from: `"${process.env.COMPANY_NAME || 'VilchesApp'}" <${process.env.COMPANY_EMAIL || process.env.SMTP_USER}>`,
      to: to,
      subject: `Påminnelse: Offert #${quote.quoteNumber}`,
      html: filledTemplate
    });

    console.log('✅ Påminnelse skickad:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Fel vid skickande av påminnelse:', error);
    throw error;
  }
}

/**
 * Skickar tack-email när offert accepterats
 */
async function sendQuoteAcceptedEmail({ to, quote, project }) {
  try {
    const htmlTemplate = getAcceptedEmailTemplate();

    const filledTemplate = htmlTemplate
      .replace(/\{\{clientName\}\}/g, quote.clientName)
      .replace(/\{\{projectType\}\}/g, quote.projectType)
      .replace(/\{\{projectNumber\}\}/g, project.projectNumber);

    const info = await transporter.sendMail({
      from: `"${process.env.COMPANY_NAME || 'VilchesApp'}" <${process.env.COMPANY_EMAIL || process.env.SMTP_USER}>`,
      to: to,
      subject: `Tack! Ditt projekt #${project.projectNumber} är bekräftat`,
      html: filledTemplate
    });

    console.log('✅ Bekräftelse-email skickat:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Fel vid skickande av bekräftelse:', error);
    throw error;
  }
}

// ============================================
// EMAIL-MALLAR
// ============================================

function getDefaultEmailTemplate() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C5F2D; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { padding: 30px; background: #f9f9f9; }
    .button {
      display: inline-block;
      padding: 15px 30px;
      background: #2C5F2D;
      color: white !important;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
      font-weight: bold;
      text-align: center;
    }
    .button:hover {
      background: #3d7a47;
    }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .highlight { color: #2C5F2D; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${process.env.COMPANY_NAME || 'VilchesApp'}</h1>
      <p>Din offert är klar!</p>
    </div>

    <div class="content">
      <p>Hej {{clientName}},</p>

      <p>Tack för er förfrågan! Här kommer din offert för <strong>{{projectType}}</strong>.</p>

      {{customMessage}}

      <p>Bifogad finner du offerten som PDF. Du kan också granska och acceptera/neka offerten via länken nedan:</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{quoteLink}}" class="button">📄 Visa och svara på offert</a>
      </div>

      <p style="margin-top: 30px;">
        Med vänliga hälsningar,<br>
        <strong>${process.env.COMPANY_NAME || 'VilchesApp'}</strong><br>
        ${process.env.COMPANY_PHONE || ''}<br>
        ${process.env.COMPANY_EMAIL || process.env.SMTP_USER}
      </p>
    </div>

    <div class="footer">
      <p>${process.env.COMPANY_NAME || 'VilchesApp'} | Powered by VilchesApp</p>
      <p>Om du inte vill ta emot våra emails, kontakta oss på ${process.env.COMPANY_EMAIL || process.env.SMTP_USER}</p>
    </div>
  </div>
</body>
</html>
  `;
}

function getReminderEmailTemplate() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C5F2D; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background: #2C5F2D; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Påminnelse: Din offert</h1>
    </div>

    <div class="content">
      <p>Hej {{clientName}},</p>

      <p>Vi ville påminna dig om offerten vi skickade för ditt projekt:</p>

      <h2>{{projectType}}</h2>

      <p><strong>Offert-nummer:</strong> {{quoteNumber}}</p>
      <p><strong>Total kostnad:</strong> {{totalCost}} kr</p>

      <p>Har du några frågor eller vill du gå vidare med projektet? Tveka inte att höra av dig!</p>

      <a href="tel:070-7978547" class="button">Kontakta oss</a>

      <p>
        Med vänliga hälsningar,<br>
        <strong>${process.env.COMPANY_NAME || 'VilchesApp'}</strong><br>
        ${process.env.COMPANY_PHONE || ''}
      </p>
    </div>

    <div class="footer">
      <p>${process.env.COMPANY_NAME || 'VilchesApp'}</p>
    </div>
  </div>
</body>
</html>
  `;
}

function getAcceptedEmailTemplate() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C5F2D; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .highlight { color: #2C5F2D; font-weight: bold; font-size: 18px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Tack för ditt förtroende!</h1>
    </div>

    <div class="content">
      <p>Hej {{clientName}},</p>

      <p>Stort tack för att du valt ${process.env.COMPANY_NAME || 'VilchesApp'} för ditt projekt:</p>

      <h2>{{projectType}}</h2>

      <p class="highlight">Ditt projektnummer: {{projectNumber}}</p>

      <p>Vi kommer att kontakta dig inom kort för att boka ett startdatum och gå igenom alla detaljer.</p>

      <p>Du kan följa projektets framsteg i vår app eller genom att kontakta oss när som helst.</p>

      <p>
        Med vänliga hälsningar,<br>
        <strong>${process.env.COMPANY_NAME || 'VilchesApp'}</strong><br>
        ${process.env.COMPANY_PHONE || ''}<br>
        ${process.env.COMPANY_EMAIL || process.env.SMTP_USER}
      </p>
    </div>

    <div class="footer">
      <p>${process.env.COMPANY_NAME || 'VilchesApp'} | Powered by VilchesApp</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Skickar notifikation till admin när kund accepterar offert
 */
async function sendQuoteAcceptedNotification({ quote, adminEmail }) {
  try {
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2C5F2D; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .highlight { color: #2C5F2D; font-weight: bold; font-size: 24px; }
    .info-box { background: #e8f5e9; padding: 15px; border-left: 4px solid #2C5F2D; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Offert Accepterad!</h1>
    </div>
    <div class="content">
      <p class="highlight">En kund har accepterat en offert!</p>

      <div class="info-box">
        <p><strong>Offert-nummer:</strong> ${quote.quoteNumber}</p>
        <p><strong>Kund:</strong> ${quote.clientName}</p>
        <p><strong>Projekt:</strong> ${quote.projectType}</p>
        <p><strong>Total kostnad:</strong> ${(quote.totalAfterRot || 0).toLocaleString('sv-SE')} kr</p>
      </div>

      <p>Kontakta kunden så snart som möjligt för att boka starttid!</p>

      <p><strong>Kontaktuppgifter:</strong></p>
      <p>
        Email: ${quote.clientEmail || 'Ej angiven'}<br>
        Telefon: ${quote.clientPhone || 'Ej angiven'}
      </p>

      <p style="margin-top: 30px; color: #666; font-size: 12px;">
        Detta är en automatisk notifikation från ${process.env.COMPANY_NAME || 'VilchesApp'} systemet.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: `"${process.env.COMPANY_NAME || 'VilchesApp'} System" <${process.env.COMPANY_EMAIL || process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `✅ Offert ${quote.quoteNumber} accepterad av ${quote.clientName}`,
      html: htmlTemplate
    });

    console.log('✅ Admin-notifikation (accepterad) skickad:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Fel vid skickande av admin-notifikation:', error);
    throw error;
  }
}

/**
 * Skickar notifikation till admin när kund avvisar offert
 */
async function sendQuoteRejectedNotification({ quote, adminEmail, reason }) {
  try {
    const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #c62828; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .highlight { color: #c62828; font-weight: bold; font-size: 24px; }
    .info-box { background: #ffebee; padding: 15px; border-left: 4px solid #c62828; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Offert Avvisad</h1>
    </div>
    <div class="content">
      <p class="highlight">En kund har avvisat en offert</p>

      <div class="info-box">
        <p><strong>Offert-nummer:</strong> ${quote.quoteNumber}</p>
        <p><strong>Kund:</strong> ${quote.clientName}</p>
        <p><strong>Projekt:</strong> ${quote.projectType}</p>
        <p><strong>Total kostnad:</strong> ${(quote.totalAfterRot || 0).toLocaleString('sv-SE')} kr</p>
      </div>

      ${reason ? `<p><strong>Anledning:</strong> ${reason}</p>` : ''}

      <p>Överväg att följa upp med kunden för att förstå varför offerten avvisades.</p>

      <p><strong>Kontaktuppgifter:</strong></p>
      <p>
        Email: ${quote.clientEmail || 'Ej angiven'}<br>
        Telefon: ${quote.clientPhone || 'Ej angiven'}
      </p>

      <p style="margin-top: 30px; color: #666; font-size: 12px;">
        Detta är en automatisk notifikation från ${process.env.COMPANY_NAME || 'VilchesApp'} systemet.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: `"${process.env.COMPANY_NAME || 'VilchesApp'} System" <${process.env.COMPANY_EMAIL || process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `❌ Offert ${quote.quoteNumber} avvisad av ${quote.clientName}`,
      html: htmlTemplate
    });

    console.log('✅ Admin-notifikation (avvisad) skickad:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Fel vid skickande av admin-notifikation:', error);
    throw error;
  }
}

export {
  sendQuoteEmail,
  sendQuoteReminder,
  sendQuoteAcceptedEmail,
  sendQuoteAcceptedNotification,
  sendQuoteRejectedNotification
};
