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
  user: { name: string; email: string };
  entries: TimeReportEntry[];
}

function escapeCsv(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatHours(hours: number): string {
  return hours.toFixed(1).replace('.', ',');
}

export function generateTimeReportCsv(report: TimeReportData): Buffer {
  const lines: string[] = [];

  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';

  // Header info
  lines.push(`Tidsrapport;${process.env.COMPANY_NAME || 'VilchesApp'}`);
  lines.push(`Anställd;${escapeCsv(report.user.name)}`);
  lines.push(`E-post;${escapeCsv(report.user.email)}`);
  lines.push(`Vecka;${report.weekNumber}`);
  lines.push(`År;${report.year}`);

  const weekStart = new Date(report.weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  lines.push(`Period;${weekStart.toLocaleDateString('sv-SE')} - ${weekEnd.toLocaleDateString('sv-SE')}`);

  lines.push(`Totalt timmar;${formatHours(report.totalHours)}`);
  lines.push('');

  // Column headers
  lines.push('Aktivitet;Projekt;Kommentar;Måndag;Tisdag;Onsdag;Torsdag;Fredag;Lördag;Söndag;Totalt');

  // Data rows
  for (const entry of report.entries) {
    const row = [
      escapeCsv(entry.activityName),
      escapeCsv(entry.project?.title || ''),
      escapeCsv(entry.comment || ''),
      formatHours(entry.mondayHours),
      formatHours(entry.tuesdayHours),
      formatHours(entry.wednesdayHours),
      formatHours(entry.thursdayHours),
      formatHours(entry.fridayHours),
      formatHours(entry.saturdayHours),
      formatHours(entry.sundayHours),
      formatHours(entry.totalHours),
    ];
    lines.push(row.join(';'));
  }

  // Sum row
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

  const sumRow = [
    'SUMMA',
    '',
    '',
    ...dayTotals.map(h => formatHours(h)),
    formatHours(report.totalHours),
  ];
  lines.push(sumRow.join(';'));

  const csvContent = BOM + lines.join('\r\n');
  return Buffer.from(csvContent, 'utf-8');
}
