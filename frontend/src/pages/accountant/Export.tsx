import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DocumentArrowDownIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

const MONTH_NAMES = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];

const AccountantExport: React.FC = () => {
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const { data: reports = [] } = useQuery({
    queryKey: ['accountant-export-reports', yearFilter],
    queryFn: () => api.getAdminTimeReports({ year: yearFilter, status: 'APPROVED' }),
  });

  // Group by month (approximate based on week number)
  const byMonth: Record<number, any[]> = {};
  for (const report of reports as any[]) {
    // Approximate month from weekStartDate or week number
    const weekStart = report.weekStartDate ? new Date(report.weekStartDate) : null;
    const month = weekStart ? weekStart.getMonth() : Math.min(11, Math.floor(((report.weekNumber - 1) * 7) / 30));
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(report);
  }

  const handleDownloadAll = async (monthReports: any[], monthName: string) => {
    let downloaded = 0;
    for (const report of monthReports) {
      try {
        const blob = await api.getTimeReportPdf(report.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tidsrapport-${report.user?.name?.replace(/\s/g, '_') || report.id}-v${report.weekNumber}-${report.year}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        downloaded++;
      } catch {
        // continue with next
      }
    }
    toast.success(`${downloaded} PDF:er nedladdade för ${monthName}`);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exportera</h1>
        <p className="text-sm text-gray-500 mt-1">Ladda ner tidsrapporter per månad</p>
      </div>

      <div className="mb-6">
        <select
          value={yearFilter}
          onChange={e => setYearFilter(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
        >
          {[2024, 2025, 2026].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MONTH_NAMES.map((name, idx) => {
          const monthReports = byMonth[idx] || [];
          const totalHours = monthReports.reduce((s: number, r: any) => s + (r.totalHours || 0), 0);
          const hasReports = monthReports.length > 0;

          return (
            <div
              key={idx}
              className={`bg-white rounded-xl shadow-sm border p-5 ${
                hasReports ? 'border-gray-200' : 'border-gray-100 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
                </div>
                {hasReports && (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {monthReports.length} st
                  </span>
                )}
              </div>

              {hasReports ? (
                <>
                  <p className="text-sm text-gray-500 mb-3">
                    {totalHours.toFixed(1)} timmar totalt
                  </p>
                  <button
                    onClick={() => handleDownloadAll(monthReports, name)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    Ladda ner alla PDF
                  </button>
                </>
              ) : (
                <p className="text-xs text-gray-400">Inga rapporter</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AccountantExport;
