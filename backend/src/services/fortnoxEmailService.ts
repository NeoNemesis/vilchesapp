/**
 * Fortnox Email Service
 * Salary spec to employee + admin summary
 * Follows pattern from timeReportEmailService.ts
 */

import nodemailer from 'nodemailer';

interface EmployeeInfo {
  name: string;
  email: string;
}

interface SalaryEmailData {
  employee: EmployeeInfo;
  weekNumber: number;
  year: number;
  totalHours: number;
  grossPay: number;
  taxDeduction: number;
  netPay: number;
  vacationPay: number;
}

interface AdminSummaryRow {
  employeeName: string;
  weekNumber: number;
  totalHours: number;
  grossPay: number;
  taxDeduction: number;
  netPay: number;
  vacationPay: number;
  employerFees: number;
  bankAccount: string;
}

function formatSEK(amount: number): string {
  return amount.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' kr';
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

/**
 * Send salary spec PDF to employee
 */
export async function sendSalarySpecToEmployee(
  data: SalaryEmailData,
  pdfBuffer: Buffer
): Promise<void> {
  const transporter = createTransporter();
  const companyName = process.env.COMPANY_NAME || 'VilchesApp';

  await transporter.sendMail({
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: data.employee.email,
    subject: `Lonespecifikation - Vecka ${data.weekNumber}, ${data.year}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a, #15803d); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Lonespecifikation</h1>
          <p style="color: #bbf7d0; margin: 8px 0 0;">${companyName}</p>
        </div>

        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">
            Hej ${data.employee.name}!
          </h2>

          <p style="color: #4b5563; line-height: 1.6;">
            Bifogat finner du din lonespecifikation for vecka ${data.weekNumber}, ${data.year}.
          </p>

          <div style="background: #fff; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Timmar:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${data.totalHours.toFixed(1)} h</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Bruttolon:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${formatSEK(data.grossPay)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Semesterersattning:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${formatSEK(data.vacationPay)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Skatteavdrag:</td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: 600;">- ${formatSEK(data.taxDeduction)}</td>
              </tr>
              <tr style="border-top: 2px solid #e5e7eb;">
                <td style="padding: 12px 0 8px; color: #1f2937; font-size: 16px; font-weight: 700;">Nettolon:</td>
                <td style="padding: 12px 0 8px; color: #16a34a; font-size: 16px; font-weight: 700;">${formatSEK(data.netPay)}</td>
              </tr>
            </table>
          </div>

          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #4b5563; margin: 0; font-size: 14px;">
              Se bifogad PDF for fullstandig lonespecifikation.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            Vid fragor, kontakta oss pa ${process.env.COMPANY_EMAIL || ''} eller ${process.env.COMPANY_PHONE || ''}.
          </p>

          <hr style="border: none; height: 1px; background: #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Med vanliga halsningar,<br>
            <strong>${companyName}</strong><br>
            Org.nr: ${process.env.ORG_NUMBER || ''}
          </p>
        </div>
      </div>
    `,
    attachments: [{
      filename: `lonespec_${data.employee.name.replace(/\s+/g, '_')}_v${data.weekNumber}_${data.year}.pdf`,
      content: pdfBuffer,
    }],
  });
}

/**
 * Send salary summary to admin with payment overview
 */
export async function sendSalarySummaryToAdmin(
  adminEmail: string,
  rows: AdminSummaryRow[],
  year: number
): Promise<void> {
  const transporter = createTransporter();
  const companyName = process.env.COMPANY_NAME || 'VilchesApp';

  const totalNetPay = rows.reduce((sum, r) => sum + r.netPay, 0);
  const totalGrossPay = rows.reduce((sum, r) => sum + r.grossPay, 0);
  const totalEmployerFees = rows.reduce((sum, r) => sum + r.employerFees, 0);
  const totalTax = rows.reduce((sum, r) => sum + r.taxDeduction, 0);

  const tableRows = rows.map(r => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${r.employeeName}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: center;">v${r.weekNumber}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">${r.totalHours.toFixed(1)} h</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">${formatSEK(r.grossPay)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right;">${formatSEK(r.taxDeduction)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; text-align: right; font-weight: 600; color: #16a34a;">${formatSEK(r.netPay)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${r.bankAccount || '-'}</td>
    </tr>
  `).join('');

  await transporter.sendMail({
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: adminEmail,
    subject: `Lonesammanstallning - ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Lonesammanstallning</h1>
          <p style="color: #ddd6fe; margin: 8px 0 0;">${companyName} | ${year}</p>
        </div>

        <div style="padding: 30px; background: #f9fafb;">
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
            Nedan foljer en sammanstallning av loner att betala ut.
          </p>

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <thead>
                <tr style="background: #1e293b;">
                  <th style="padding: 10px 12px; color: white; font-size: 12px; text-align: left;">Anstalld</th>
                  <th style="padding: 10px 12px; color: white; font-size: 12px; text-align: center;">Vecka</th>
                  <th style="padding: 10px 12px; color: white; font-size: 12px; text-align: right;">Timmar</th>
                  <th style="padding: 10px 12px; color: white; font-size: 12px; text-align: right;">Brutto</th>
                  <th style="padding: 10px 12px; color: white; font-size: 12px; text-align: right;">Skatt</th>
                  <th style="padding: 10px 12px; color: white; font-size: 12px; text-align: right;">Netto</th>
                  <th style="padding: 10px 12px; color: white; font-size: 12px; text-align: left;">Bankkonto</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
              <tfoot>
                <tr style="background: #f1f5f9; font-weight: 700;">
                  <td style="padding: 10px 12px; font-size: 13px;" colspan="3">TOTALT</td>
                  <td style="padding: 10px 12px; font-size: 13px; text-align: right;">${formatSEK(totalGrossPay)}</td>
                  <td style="padding: 10px 12px; font-size: 13px; text-align: right;">${formatSEK(totalTax)}</td>
                  <td style="padding: 10px 12px; font-size: 13px; text-align: right; color: #16a34a;">${formatSEK(totalNetPay)}</td>
                  <td style="padding: 10px 12px;"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="background: #fefce8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #eab308;">
            <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 600;">Arbetsgivaravgifter</p>
            <p style="color: #78350f; margin: 4px 0 0; font-size: 13px;">
              Totala arbetsgivaravgifter (31,42%): <strong>${formatSEK(totalEmployerFees)}</strong><br>
              Total lonekostnad for foretaget: <strong>${formatSEK(totalGrossPay + totalEmployerFees)}</strong>
            </p>
          </div>

          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="color: #1e40af; margin: 0; font-size: 14px; font-weight: 600;">Att betala ut totalt</p>
            <p style="color: #1e3a5f; margin: 4px 0 0; font-size: 20px; font-weight: 700;">${formatSEK(totalNetPay)}</p>
          </div>

          <hr style="border: none; height: 1px; background: #e5e7eb; margin: 30px 0;">

          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            ${companyName} | Org.nr: ${process.env.ORG_NUMBER || ''} | ${process.env.COMPANY_EMAIL || ''}
          </p>
        </div>
      </div>
    `,
  });
}
