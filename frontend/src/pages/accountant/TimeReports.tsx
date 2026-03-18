import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClockIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

const AccountantTimeReports: React.FC = () => {
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [employeeFilter, setEmployeeFilter] = useState('');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['accountant-reports', yearFilter],
    queryFn: () => api.getAdminTimeReports({ year: yearFilter, status: 'APPROVED' }),
  });

  const filteredReports = employeeFilter
    ? reports.filter((r: any) => r.user?.name?.toLowerCase().includes(employeeFilter.toLowerCase()))
    : reports;

  const handleDownloadPdf = async (reportId: string) => {
    try {
      const blob = await api.getTimeReportPdf(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tidsrapport-${reportId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Kunde inte ladda ner PDF');
    }
  };

  const handleDownloadCsv = async (reportId: string) => {
    try {
      const blob = await api.getTimeReportCsv(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tidsrapport-${reportId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Kunde inte ladda ner CSV');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tidsrapporter</h1>
        <p className="text-sm text-gray-500 mt-1">Alla godkända tidsrapporter</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={yearFilter}
              onChange={e => setYearFilter(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Sök anställd..."
              value={employeeFilter}
              onChange={e => setEmployeeFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="text-sm text-gray-500">
            {filteredReports.length} rapporter
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">Inga godkända rapporter hittade</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Anställd</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vecka</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Timmar</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ladda ner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReports.map((report: any) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{report.user?.name}</p>
                    <p className="text-xs text-gray-500">{report.user?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">v{report.weekNumber}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{report.year}</td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-gray-900">{report.totalHours}h</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Godkänd
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDownloadPdf(report.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                        PDF
                      </button>
                      <button
                        onClick={() => handleDownloadCsv(report.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                        CSV
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AccountantTimeReports;
