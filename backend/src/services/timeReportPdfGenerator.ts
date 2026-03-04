import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

interface TimeReportEntry {
  activityName: string;
  comment?: string | null;
  mondayHours: number;
  tuesdayHours: number;
  wednesdayHours: number;
  thursdayHours: number;
  fridayHours: number;
  saturdayHours: number;
  sundayHours: number;
  totalHours: number;
  project?: { title: string; projectNumber: string } | null;
}

interface TimeReportData {
  weekNumber: number;
  year: number;
  weekStartDate: Date | string;
  totalHours: number;
  status: string;
  submittedAt?: Date | string | null;
  approvedAt?: Date | string | null;
  user: { name: string; email: string };
  entries: TimeReportEntry[];
}

const DAY_NAMES = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

function formatMoney(amount: number): string {
  return amount.toFixed(1).replace('.', ',');
}

export async function generateTimeReportPdf(report: TimeReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        layout: 'landscape',
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Try to load DejaVu fonts for Swedish character support
      const fontsDir = path.join(__dirname, '../../fonts');
      let hasCustomFonts = false;

      if (fs.existsSync(path.join(fontsDir, 'DejaVuSans.ttf'))) {
        doc.registerFont('DejaVu', path.join(fontsDir, 'DejaVuSans.ttf'));
        doc.registerFont('DejaVu-Bold', path.join(fontsDir, 'DejaVuSans-Bold.ttf'));
        hasCustomFonts = true;
      }

      const font = hasCustomFonts ? 'DejaVu' : 'Helvetica';
      const fontBold = hasCustomFonts ? 'DejaVu-Bold' : 'Helvetica-Bold';

      const pageWidth = doc.page.width - 80; // margins

      // Header
      doc.font(fontBold).fontSize(18).text('TIDSRAPPORT', 40, 40);
      doc.font(font).fontSize(10).text('${process.env.COMPANY_NAME || 'VilchesApp'}', 40, 62);
      doc.text('Org.nr: ${process.env.ORG_NUMBER || ''}', 40, 75);

      // Report info (right side)
      const rightCol = doc.page.width - 240;
      doc.font(fontBold).fontSize(10);
      doc.text(`Vecka ${report.weekNumber}, ${report.year}`, rightCol, 40);
      doc.font(font).fontSize(9);

      const weekStart = new Date(report.weekStartDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const formatDate = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
      doc.text(`Period: ${formatDate(weekStart)} - ${formatDate(weekEnd)} ${report.year}`, rightCol, 55);

      doc.text(`Anställd: ${report.user.name}`, rightCol, 70);
      doc.text(`Status: ${getStatusText(report.status)}`, rightCol, 85);

      if (report.submittedAt) {
        const submitted = new Date(report.submittedAt);
        doc.text(`Inskickad: ${submitted.toLocaleDateString('sv-SE')}`, rightCol, 100);
      }

      // Horizontal line
      doc.moveTo(40, 115).lineTo(doc.page.width - 40, 115).lineWidth(1).stroke('#e5e7eb');

      // Table header
      let y = 130;
      const colWidths = {
        activity: 160,
        project: 100,
        comment: 100,
        mon: 45, tue: 45, wed: 45, thu: 45, fri: 45, sat: 45, sun: 45,
        total: 55,
      };

      const cols = [
        { label: 'Aktivitet', width: colWidths.activity },
        { label: 'Projekt', width: colWidths.project },
        { label: 'Kommentar', width: colWidths.comment },
        { label: 'Mån', width: colWidths.mon },
        { label: 'Tis', width: colWidths.tue },
        { label: 'Ons', width: colWidths.wed },
        { label: 'Tor', width: colWidths.thu },
        { label: 'Fre', width: colWidths.fri },
        { label: 'Lör', width: colWidths.sat },
        { label: 'Sön', width: colWidths.sun },
        { label: 'Totalt', width: colWidths.total },
      ];

      // Header row background
      doc.rect(40, y, pageWidth, 22).fill('#2563eb');

      let x = 40;
      doc.font(fontBold).fontSize(8).fillColor('#ffffff');
      for (const col of cols) {
        const align = cols.indexOf(col) >= 3 ? 'center' : 'left';
        doc.text(col.label, x + 4, y + 6, { width: col.width - 8, align });
        x += col.width;
      }

      y += 22;
      doc.fillColor('#000000');

      // Data rows
      for (let i = 0; i < report.entries.length; i++) {
        const entry = report.entries[i];
        const bgColor = i % 2 === 0 ? '#f9fafb' : '#ffffff';
        doc.rect(40, y, pageWidth, 20).fill(bgColor);

        x = 40;
        doc.font(font).fontSize(7).fillColor('#1f2937');

        // Activity
        doc.text(entry.activityName, x + 4, y + 5, { width: colWidths.activity - 8 });
        x += colWidths.activity;

        // Project
        doc.text(entry.project?.title || '-', x + 4, y + 5, { width: colWidths.project - 8 });
        x += colWidths.project;

        // Comment
        doc.text(entry.comment || '-', x + 4, y + 5, { width: colWidths.comment - 8 });
        x += colWidths.comment;

        // Day hours
        const dayHours = [
          entry.mondayHours, entry.tuesdayHours, entry.wednesdayHours,
          entry.thursdayHours, entry.fridayHours, entry.saturdayHours, entry.sundayHours
        ];
        const dayWidths = [colWidths.mon, colWidths.tue, colWidths.wed, colWidths.thu, colWidths.fri, colWidths.sat, colWidths.sun];

        for (let d = 0; d < 7; d++) {
          const val = dayHours[d];
          doc.text(val > 0 ? formatMoney(val) : '-', x + 2, y + 5, { width: dayWidths[d] - 4, align: 'center' });
          x += dayWidths[d];
        }

        // Total
        doc.font(fontBold).text(formatMoney(entry.totalHours), x + 2, y + 5, { width: colWidths.total - 4, align: 'center' });

        y += 20;
      }

      // Sum row
      doc.rect(40, y, pageWidth, 22).fill('#e5e7eb');
      x = 40;
      doc.font(fontBold).fontSize(8).fillColor('#1f2937');
      doc.text('SUMMA', x + 4, y + 6, { width: colWidths.activity - 8 });
      x += colWidths.activity + colWidths.project + colWidths.comment;

      // Day totals
      const dayTotals = [0, 0, 0, 0, 0, 0, 0];
      for (const entry of report.entries) {
        dayTotals[0] += entry.mondayHours;
        dayTotals[1] += entry.tuesdayHours;
        dayTotals[2] += entry.wednesdayHours;
        dayTotals[3] += entry.thursdayHours;
        dayTotals[4] += entry.fridayHours;
        dayTotals[5] += entry.saturdayHours;
        dayTotals[6] += entry.sundayHours;
      }

      const dayWidths = [colWidths.mon, colWidths.tue, colWidths.wed, colWidths.thu, colWidths.fri, colWidths.sat, colWidths.sun];
      for (let d = 0; d < 7; d++) {
        doc.text(dayTotals[d] > 0 ? formatMoney(dayTotals[d]) : '-', x + 2, y + 6, { width: dayWidths[d] - 4, align: 'center' });
        x += dayWidths[d];
      }

      doc.text(formatMoney(report.totalHours), x + 2, y + 6, { width: colWidths.total - 4, align: 'center' });

      // Footer
      y += 40;
      doc.font(font).fontSize(8).fillColor('#6b7280');
      doc.text(`Genererad: ${new Date().toLocaleDateString('sv-SE')} | ${process.env.COMPANY_NAME || 'VilchesApp'} | ${process.env.COMPANY_EMAIL || ''} | ${process.env.COMPANY_PHONE || ''}`, 40, y);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function getStatusText(status: string): string {
  switch (status) {
    case 'DRAFT': return 'Utkast';
    case 'SUBMITTED': return 'Inskickad';
    case 'APPROVED': return 'Godkänd';
    case 'REJECTED': return 'Avvisad';
    default: return status;
  }
}
