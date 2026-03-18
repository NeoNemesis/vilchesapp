/**
 * Billing Info Email Service
 * Sends billing info request emails to customers
 */

import nodemailer from 'nodemailer';

interface BillingInfoEmailData {
  clientName: string;
  clientEmail: string;
  quoteNumber: string;
  projectType: string;
  totalCost: number;
  isRot: boolean;
  formUrl: string;
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function formatSEK(amount: number): string {
  return Math.round(amount).toLocaleString('sv-SE') + ' kr';
}

export async function sendBillingInfoRequestEmail(data: BillingInfoEmailData): Promise<void> {
  const transporter = createTransporter();
  const companyName = process.env.COMPANY_NAME || 'Vilches Entreprenad AB';

  const rotNote = data.isRot
    ? `<div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          <strong>ROT-avdrag:</strong> Eftersom ditt projekt kvalificerar för ROT-avdrag behöver vi
          ditt personnummer och fastighetsuppgifter för att kunna ansöka om avdraget hos Skatteverket.
        </p>
      </div>`
    : '';

  const whatWeNeed = data.isRot
    ? '<li>Personnummer</li><li>Fastighetsadress (där arbetet utförs)</li><li>Boendeform (villa/bostadsrätt)</li><li>BRF-uppgifter (om bostadsrätt)</li>'
    : '<li>Faktureringsadress</li><li>Personnummer eller organisationsnummer</li>';

  await transporter.sendMail({
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: data.clientEmail,
    subject: `Faktureringsuppgifter - ${data.quoteNumber} | ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2C7A4B, #1a5c34); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Faktureringsuppgifter</h1>
          <p style="color: #bbf7d0; margin: 8px 0 0;">${companyName}</p>
        </div>

        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937; margin-bottom: 10px;">Hej ${data.clientName}!</h2>

          <p style="color: #4b5563; line-height: 1.6;">
            Tack för att du accepterade vår offert <strong>${data.quoteNumber}</strong>
            (${data.projectType}) på <strong>${formatSEK(data.totalCost)}</strong>.
          </p>

          <p style="color: #4b5563; line-height: 1.6;">
            För att vi ska kunna fakturera dig behöver vi några uppgifter. Klicka på knappen nedan
            för att fylla i ett kort formulär:
          </p>

          ${rotNote}

          <p style="color: #4b5563; font-size: 14px;"><strong>Vi behöver:</strong></p>
          <ul style="color: #4b5563; font-size: 14px; line-height: 1.8;">${whatWeNeed}</ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.formUrl}"
               style="display: inline-block; padding: 15px 40px; background: #2C7A4B; color: white;
                      text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Fyll i uppgifter
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Länken är giltig i 7 dagar. Dina uppgifter hanteras enligt GDPR.
          </p>

          <hr style="border: none; height: 1px; background: #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Med vänliga hälsningar,<br>
            <strong>${companyName}</strong><br>
            ${process.env.COMPANY_EMAIL || ''}
          </p>
        </div>
      </div>
    `,
  });
}
