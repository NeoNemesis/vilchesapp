import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  PaperAirplaneIcon,
  FunnelIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { TimeReport, Employee } from '../../types';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Utkast',
  SUBMITTED: 'Inskickad',
  APPROVED: 'Godkänd',
  REJECTED: 'Avvisad',
};

const MONTH_NAMES = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];

const AdminTimeReports: React.FC = () => {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({
    employee: '',
    year: currentYear.toString(),
    status: '',
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showLockPanel, setShowLockPanel] = useState(false);

  const { data: reports = [], isLoading } = useQuery<TimeReport[]>({
    queryKey: ['admin-time-reports', filters],
    queryFn: () => api.getAdminTimeReports({
      employee: filters.employee || undefined,
      year: filters.year ? parseInt(filters.year) : undefined,
      status: filters.status || undefined,
    }),
  });

  const { data: reporters = [] } = useQuery<(Employee & { role?: string })[]>({
    queryKey: ['time-report-reporters'],
    queryFn: api.getTimeReportReporters,
  });

  const { data: summary } = useQuery({
    queryKey: ['time-report-summary'],
    queryFn: api.getTimeReportSummary,
  });

  const filterYear = filters.year ? parseInt(filters.year) : currentYear;

  const { data: lockedPeriods = [] } = useQuery<{ id: string; year: number; month: number; lockedAt: string; lockedBy?: { name: string }; note?: string }[]>({
    queryKey: ['locked-periods', filterYear],
    queryFn: () => api.getLockedPeriods(filterYear),
  });

  const lockMutation = useMutation({
    mutationFn: (data: { year: number; month: number }) => api.lockPeriod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locked-periods'] });
      toast.success('Period låst');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Kunde inte låsa perioden'),
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => api.unlockPeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locked-periods'] });
      toast.success('Period upplåst');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Kunde inte låsa upp perioden'),
  });

  const approveMutation = useMutation({
    mutationFn: api.approveTimeReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-reports'] });
      queryClient.invalidateQueries({ queryKey: ['time-report-summary'] });
      toast.success('Tidsrapport godkänd');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Kunde inte godkänna'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.rejectTimeReport(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-reports'] });
      queryClient.invalidateQueries({ queryKey: ['time-report-summary'] });
      toast.success('Tidsrapport avvisad');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Kunde inte avvisa'),
  });

  const bulkApproveMutation = useMutation({
    mutationFn: api.bulkApproveTimeReports,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-reports'] });
      queryClient.invalidateQueries({ queryKey: ['time-report-summary'] });
      setSelectedIds([]);
      toast.success(`${data.count} rapporter godkända`);
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Kunde inte godkänna'),
  });

  const sendToAccountantMutation = useMutation({
    mutationFn: ({ id, format }: { id: string; format: 'pdf' | 'csv' | 'both' }) =>
      api.sendTimeReportToAccountant(id, format),
    onSuccess: (data) => toast.success(data.message),
    onError: (error: any) => toast.error(error.response?.data?.message || 'Kunde inte skicka'),
  });

  const handleReject = (id: string) => {
    const reason = prompt('Anledning till avvisning:');
    if (reason?.trim()) {
      rejectMutation.mutate({ id, reason: reason.trim() });
    }
  };

  const handleDownloadPdf = async (id: string, name: string, week: number, year: number) => {
    try {
      const blob = await api.getTimeReportPdf(id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `tidsrapport_${name.replace(/\s+/g, '_')}_v${week}_${year}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Kunde inte ladda ner PDF');
    }
  };

  const handleDownloadCsv = async (id: string, name: string, week: number, year: number) => {
    try {
      const blob = await api.getTimeReportCsv(id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `tidsrapport_${name.replace(/\s+/g, '_')}_v${week}_${year}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Kunde inte ladda ner CSV');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectableReports = reports.filter(r => r.status === 'SUBMITTED');
  const allSelected = selectableReports.length > 0 && selectableReports.every(r => selectedIds.includes(r.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableReports.map(r => r.id));
    }
  };

  const formatWeekPeriod = (report: TimeReport) => {
    const start = new Date(report.weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tidsrapporter</h1>
        <p className="mt-1 text-sm text-gray-500">Granska och godkänn tidsrapporter från anställda</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 sm:h-8 sm:w-8 text-orange-600" />
            <div className="ml-2 sm:ml-4">
              <p className="text-sm font-medium text-gray-500 truncate">Väntande</p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900">{summary?.pending || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 sm:h-8 sm:w-8 text-green-600" />
            <div className="ml-2 sm:ml-4">
              <p className="text-sm font-medium text-gray-500 truncate">Godkända denna månad</p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900">{summary?.approvedThisMonth || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 sm:h-8 sm:w-8 text-blue-600" />
            <div className="ml-2 sm:ml-4">
              <p className="text-sm font-medium text-gray-500 truncate">Totala timmar i år</p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                {(summary?.totalHoursThisMonth || 0).toFixed(0)}h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Period Lock Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowLockPanel(!showLockPanel)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <LockClosedIcon className="h-4 w-4" />
          Periodlåsning
        </button>
      </div>

      {/* Period Lock Panel */}
      {showLockPanel && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Periodlåsning – {filterYear}</h3>
          <p className="text-xs text-gray-500 mb-4">Lås perioder för att förhindra att anställda redigerar sina tidsrapporter. Du som admin kan alltid redigera oavsett lås.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {MONTH_NAMES.map((name, i) => {
              const month = i + 1;
              const lock = lockedPeriods.find(lp => lp.month === month && lp.year === filterYear);
              const isLocked = !!lock;

              return (
                <div key={month} className={`rounded-lg border p-3 ${isLocked ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{name}</span>
                    {isLocked ? (
                      <LockClosedIcon className="h-4 w-4 text-red-500" />
                    ) : (
                      <LockOpenIcon className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                  {isLocked ? (
                    <button
                      onClick={() => {
                        if (confirm(`Vill du låsa upp ${name} ${filterYear}?`)) {
                          unlockMutation.mutate(lock.id);
                        }
                      }}
                      className="w-full mt-2 px-2 py-1.5 text-xs font-medium bg-white border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors"
                    >
                      Lås upp
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (confirm(`Vill du låsa ${name} ${filterYear}? Anställda kan inte redigera tider för denna period.`)) {
                          lockMutation.mutate({ year: filterYear, month });
                        }
                      }}
                      className="w-full mt-2 px-2 py-1.5 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                    >
                      Lås
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filter</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <select value={filters.employee} onChange={e => setFilters({ ...filters, employee: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <option value="">Alla anställda</option>
            {reporters.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <select value={filters.year} onChange={e => setFilters({ ...filters, year: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
            <option value="">Alla statusar</option>
            <option value="SUBMITTED">Inskickade</option>
            <option value="APPROVED">Godkända</option>
            <option value="REJECTED">Avvisade</option>
            <option value="DRAFT">Utkast</option>
          </select>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <span className="text-sm text-blue-800">{selectedIds.length} rapport{selectedIds.length > 1 ? 'er' : ''} markerad{selectedIds.length > 1 ? 'e' : ''}</span>
          <button
            onClick={() => bulkApproveMutation.mutate(selectedIds)}
            disabled={bulkApproveMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {bulkApproveMutation.isPending ? 'Godkänner...' : 'Godkänn markerade'}
          </button>
        </div>
      )}

      {/* Reports table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  {selectableReports.length > 0 && (
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                  )}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anställd</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vecka</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Timmar</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inskickad</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Åtgärder</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    Inga tidsrapporter hittades
                  </td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {report.status === 'SUBMITTED' && (
                        <input type="checkbox" checked={selectedIds.includes(report.id)} onChange={() => toggleSelect(report.id)} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">{report.user?.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">v{report.weekNumber}, {report.year}</span>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      <span className="text-sm text-gray-500">{formatWeekPeriod(report)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-900">{report.totalHours.toFixed(1)}h</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[report.status]}`}>
                        {statusLabels[report.status]}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {report.submittedAt ? new Date(report.submittedAt).toLocaleDateString('sv-SE') : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/time-reports/${report.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Visa">
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        {report.status === 'SUBMITTED' && (
                          <>
                            <button onClick={() => approveMutation.mutate(report.id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Godkänn">
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleReject(report.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Avvisa">
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {report.status === 'APPROVED' && (
                          <>
                            <button onClick={() => sendToAccountantMutation.mutate({ id: report.id, format: 'both' })} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" title="Skicka till revisor">
                              <PaperAirplaneIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDownloadPdf(report.id, report.user?.name || '', report.weekNumber, report.year)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors" title="Ladda ner PDF">
                              <DocumentArrowDownIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminTimeReports;
