import nodemailer from 'nodemailer';

interface AccountantInfo {
  name: string;
  email: string;
  company?: string | null;
}

interface ReportInfo {
  weekNumber: number;
  year: number;
  totalHours: number;
  user: { name: string; email: string };
}

interface Attachment {
  filename: string;
  content: Buffer;
}

export async function sendTimeReportToAccountant(
  accountant: AccountantInfo,
  report: ReportInfo,
  attachments: Attachment[]
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const fileList = attachments.map(a => `<li>${a.filename}</li>`).join('');

  await transporter.sendMail({
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: accountant.email,
    subject: `Tidsrapport - ${report.user.name} - Vecka ${report.weekNumber}, ${report.year}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Tidsrapport</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0;">${process.env.COMPANY_NAME || 'VilchesApp'}</p>
        </div>

        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">
            Hej ${accountant.name}!
          </h2>

          <p style="color: #4b5563; line-height: 1.6;">
            Bifogat finner du en godkänd tidsrapport från ${process.env.COMPANY_NAME || 'VilchesApp'}.
          </p>

          <div style="background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Anställd:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${report.user.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Vecka:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${report.weekNumber}, ${report.year}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Totala timmar:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${report.totalHours.toFixed(1).replace('.', ',')} h</td>
              </tr>
            </table>
          </div>

          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #4b5563; margin: 0 0 8px; font-weight: 600;">Bifogade filer:</p>
            <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
              ${fileList}
            </ul>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            Vid frågor, kontakta oss på ${process.env.COMPANY_EMAIL || ''} eller ${process.env.COMPANY_PHONE || ''}.
          </p>

          <hr style="border: none; height: 1px; background: #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Med vänliga hälsningar,<br>
            <strong>${process.env.COMPANY_NAME || 'VilchesApp'}</strong><br>
            Org.nr: ${process.env.ORG_NUMBER || ''}<br>
            ${process.env.COMPANY_EMAIL || ''} | ${process.env.COMPANY_PHONE || ''}
          </p>
        </div>
      </div>
    `,
    attachments: attachments.map(a => ({
      filename: a.filename,
      content: a.content,
    }))
  });
}
