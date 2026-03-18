/**
 * Salary Specification PDF Generator
 * Generates A4 salary spec PDFs following the same pattern as timeReportPdfGenerator.ts
 */

import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

interface SalarySpecData {
  employeeName: string;
  personalNumber?: string | null;  // Will be masked
  bankAccount?: string | null;
  weekNumber: number;
  year: number;
  weekStartDate: Date | string;
  totalHours: number;
  hourlyRate: number;
  basePay: number;           // timmar x timlön
  vacationPay: number;       // semesterersättning
  vacationPayPercent: number;
  grossPay: number;          // bruttolön
  taxDeduction: number;      // skatteavdrag
  netPay: number;            // nettolön
  employerFees: number;      // arbetsgivaravgifter
}

function formatSEK(amount: number): string {
  return amount.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' kr';
}

function maskPersonalNumber(pn?: string | null): string {
  if (!pn || pn.length < 4) return '******-****';
  return pn.substring(0, pn.length - 4).replace(/\d/g, '*') + pn.substring(pn.length - 4);
}

export async function generateSalarySpecPdf(data: SalarySpecData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        layout: 'portrait',
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Load fonts
      const fontsDir = path.join(__dirname, '../../fonts');
      let hasCustomFonts = false;

      if (fs.existsSync(path.join(fontsDir, 'DejaVuSans.ttf'))) {
        doc.registerFont('DejaVu', path.join(fontsDir, 'DejaVuSans.ttf'));
        doc.registerFont('DejaVu-Bold', path.join(fontsDir, 'DejaVuSans-Bold.ttf'));
        hasCustomFonts = true;
      }

      const font = hasCustomFonts ? 'DejaVu' : 'Helvetica';
      const fontBold = hasCustomFonts ? 'DejaVu-Bold' : 'Helvetica-Bold';
      const pageWidth = doc.page.width - 100; // margins

      // === HEADER ===
      doc.rect(50, 40, pageWidth, 50).fill('#1d4ed8');
      doc.font(fontBold).fontSize(20).fillColor('#ffffff');
      doc.text('LONESPECIFIKATION', 60, 52, { width: pageWidth - 20 });
      doc.font(font).fontSize(10);
      doc.text(process.env.COMPANY_NAME || 'VilchesApp', 60, 74, { width: pageWidth - 20, align: 'right' });

      doc.fillColor('#000000');

      // === COMPANY INFO ===
      let y = 110;
      doc.font(font).fontSize(9).fillColor('#6b7280');
      doc.text(`Org.nr: ${process.env.ORG_NUMBER || ''}`, 50, y);
      doc.text(`${process.env.COMPANY_EMAIL || ''} | ${process.env.COMPANY_PHONE || ''}`, 50, y + 13);

      // === EMPLOYEE INFO ===
      y = 155;
      doc.rect(50, y, pageWidth, 70).fill('#f9fafb').stroke('#e5e7eb');

      doc.font(fontBold).fontSize(11).fillColor('#1f2937');
      doc.text('Anst\u00e4lld', 60, y + 8);
      doc.font(font).fontSize(9).fillColor('#4b5563');
      doc.text(`Namn: ${data.employeeName}`, 60, y + 25);
      doc.text(`Personnummer: ${maskPersonalNumber(data.personalNumber)}`, 60, y + 40);
      doc.text(`Bankkonto: ${data.bankAccount || 'Ej angivet'}`, 60, y + 55);

      // Period info (right side)
      const rightCol = 320;
      const weekStart = new Date(data.weekStartDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const formatDate = (d: Date) => d.toLocaleDateString('sv-SE');

      doc.font(fontBold).fontSize(11).fillColor('#1f2937');
      doc.text('Period', rightCol, y + 8);
      doc.font(font).fontSize(9).fillColor('#4b5563');
      doc.text(`Vecka ${data.weekNumber}, ${data.year}`, rightCol, y + 25);
      doc.text(`${formatDate(weekStart)} - ${formatDate(weekEnd)}`, rightCol, y + 40);
      doc.text(`Utbetalningsdatum: Enligt avtal`, rightCol, y + 55);

      // === SALARY TABLE ===
      y = 250;
      const colLabel = 60;
      const colDetail = 280;
      const colAmount = 420;
      const rowHeight = 28;

      // Table header
      doc.rect(50, y, pageWidth, rowHeight).fill('#2563eb');
      doc.font(fontBold).fontSize(9).fillColor('#ffffff');
      doc.text('Beskrivning', colLabel, y + 8);
      doc.text('Detaljer', colDetail, y + 8);
      doc.text('Belopp', colAmount, y + 8, { width: 100, align: 'right' });

      y += rowHeight;
      doc.fillColor('#1f2937');

      // Row helper
      const drawRow = (label: string, detail: string, amount: string, bold = false, bg = '#ffffff') => {
        doc.rect(50, y, pageWidth, rowHeight).fill(bg);
        doc.font(bold ? fontBold : font).fontSize(9).fillColor('#1f2937');
        doc.text(label, colLabel, y + 8);
        doc.font(font).fontSize(8).fillColor('#6b7280');
        doc.text(detail, colDetail, y + 8);
        doc.font(bold ? fontBold : font).fontSize(9).fillColor('#1f2937');
        doc.text(amount, colAmount, y + 8, { width: 100, align: 'right' });
        y += rowHeight;
      };

      // Data rows
      drawRow(
        'Grundl\u00f6n',
        `${data.totalHours.toFixed(1)} tim x ${formatSEK(data.hourlyRate)}/tim`,
        formatSEK(data.basePay),
        false,
        '#f9fafb'
      );

      drawRow(
        'Semesterers\u00e4ttning',
        `${data.vacationPayPercent}% av grundl\u00f6n`,
        formatSEK(data.vacationPay),
        false,
        '#ffffff'
      );

      // Gross pay separator
      doc.rect(50, y, pageWidth, 2).fill('#2563eb');
      y += 6;

      drawRow(
        'BRUTTOL\u00d6N',
        '',
        formatSEK(data.grossPay),
        true,
        '#eff6ff'
      );

      drawRow(
        'Skatteavdrag',
        'Skattetabell 33, kolumn 1 (Uppsala)',
        `- ${formatSEK(data.taxDeduction)}`,
        false,
        '#fef2f2'
      );

      // Net pay separator
      doc.rect(50, y, pageWidth, 2).fill('#16a34a');
      y += 6;

      drawRow(
        'NETTOL\u00d6N (att utbetala)',
        '',
        formatSEK(data.netPay),
        true,
        '#f0fdf4'
      );

      // === EMPLOYER COSTS (info section) ===
      y += 15;
      doc.rect(50, y, pageWidth, 50).fill('#fefce8').stroke('#fbbf24');
      doc.font(fontBold).fontSize(9).fillColor('#92400e');
      doc.text('F\u00f6retagets kostnader (ej avdrag fr\u00e5n l\u00f6n)', 60, y + 8);
      doc.font(font).fontSize(8).fillColor('#78350f');
      doc.text(`Arbetsgivaravgifter (31,42%): ${formatSEK(data.employerFees)}`, 60, y + 25);
      doc.text(`Total l\u00f6nekostnad f\u00f6r f\u00f6retaget: ${formatSEK(data.grossPay + data.employerFees)}`, 60, y + 38);

      // === FOOTER ===
      const footerY = doc.page.height - 80;
      doc.font(font).fontSize(7).fillColor('#9ca3af');
      doc.text(
        `Genererad: ${new Date().toLocaleDateString('sv-SE')} | ${process.env.COMPANY_NAME || 'VilchesApp'} | Org.nr: ${process.env.ORG_NUMBER || ''} | ${process.env.COMPANY_EMAIL || ''}`,
        50, footerY, { width: pageWidth, align: 'center' }
      );
      doc.text(
        'Denna l\u00f6nespecifikation \u00e4r genererad automatiskt.',
        50, footerY + 12, { width: pageWidth, align: 'center' }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
