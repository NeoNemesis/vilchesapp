import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  DocumentArrowDownIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { TimeReport } from '../../types';

const DAY_NAMES = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

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

interface EditRow {
  key: string;
  activityName: string;
  projectId: string;
  comment: string;
  hours: number[];
}

function createEmptyRow(): EditRow {
  return {
    key: crypto.randomUUID(),
    activityName: '',
    projectId: '',
    comment: '',
    hours: [0, 0, 0, 0, 0, 0, 0],
  };
}

const AdminTimeReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sendFormat, setSendFormat] = useState<'pdf' | 'csv' | 'both'>('both');
  const [isEditing, setIsEditing] = useState(false);
  const [editRows, setEditRows] = useState<EditRow[]>([]);

  const { data: report, isLoading } = useQuery<TimeReport>({
    queryKey: ['admin-time-report', id],
    queryFn: () => api.getAdminTimeReport(id!),
    enabled: !!id,
  });

  const { data: projects = [] } = useQuery<{ id: string; title: string; projectNumber: string }[]>({
    queryKey: ['admin-projects-for-edit'],
    queryFn: () => api.getAllProjects(),
    enabled: isEditing,
  });

  const approveMutation = useMutation({
    mutationFn: () => api.approveTimeReport(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-report', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-reports'] });
      toast.success('Tidsrapport godkänd');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Kunde inte godkänna'),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => api.rejectTimeReport(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-report', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-reports'] });
      toast.success('Tidsrapport avvisad');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Kunde inte avvisa'),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = editRows
        .filter(r => r.activityName.trim())
        .map((r, idx) => ({
          projectId: r.projectId || null,
          activityName: r.activityName,
          comment: r.comment || null,
          mondayHours: r.hours[0],
          tuesdayHours: r.hours[1],
          wednesdayHours: r.hours[2],
          thursdayHours: r.hours[3],
          fridayHours: r.hours[4],
          saturdayHours: r.hours[5],
          sundayHours: r.hours[6],
          sortOrder: idx,
        }));
      if (entries.length === 0) throw new Error('Minst en aktivitet krävs');
      return api.updateAdminTimeReport(id!, { entries });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-time-report', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-time-reports'] });
      setIsEditing(false);
      toast.success('Tidsrapport uppdaterad');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message || 'Kunde inte spara');
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => api.sendTimeReportToAccountant(id!, sendFormat),
    onSuccess: (data) => toast.success(data.message),
    onError: (error: any) => toast.error(error.response?.data?.message || 'Kunde inte skicka'),
  });

  const handleReject = () => {
    const reason = prompt('Anledning till avvisning:');
    if (reason?.trim()) {
      rejectMutation.mutate(reason.trim());
    }
  };

  const startEditing = () => {
    if (!report) return;
    setEditRows(report.entries.map(e => ({
      key: e.id || crypto.randomUUID(),
      activityName: e.activityName,
      projectId: e.projectId || '',
      comment: e.comment || '',
      hours: [
        e.mondayHours, e.tuesdayHours, e.wednesdayHours,
        e.thursdayHours, e.fridayHours, e.saturdayHours, e.sundayHours,
      ],
    })));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditRows([]);
  };

  const updateEditRow = (key: string, field: keyof EditRow, value: any) => {
    setEditRows(editRows.map(r => r.key === key ? { ...r, [field]: value } : r));
  };

  const updateEditHour = (key: string, dayIndex: number, value: string) => {
    const num = parseFloat(value) || 0;
    const clamped = Math.min(24, Math.max(0, Math.round(num * 2) / 2));
    setEditRows(editRows.map(r => {
      if (r.key !== key) return r;
      const hours = [...r.hours];
      hours[dayIndex] = clamped;
      return { ...r, hours };
    }));
  };

  const addEditRow = () => setEditRows([...editRows, createEmptyRow()]);

  const removeEditRow = (key: string) => {
    if (editRows.length <= 1) return;
    setEditRows(editRows.filter(r => r.key !== key));
  };

  const editDayTotals = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    for (const row of editRows) {
      for (let d = 0; d < 7; d++) {
        totals[d] += row.hours[d];
      }
    }
    return totals;
  }, [editRows]);

  const editGrandTotal = useMemo(() => editDayTotals.reduce((a, b) => a + b, 0), [editDayTotals]);

  const handleDownloadPdf = async () => {
    try {
      const blob = await api.getTimeReportPdf(id!);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `tidsrapport_${report?.user?.name?.replace(/\s+/g, '_')}_v${report?.weekNumber}_${report?.year}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Kunde inte ladda ner PDF');
    }
  };

  const handleDownloadCsv = async () => {
    try {
      const blob = await api.getTimeReportCsv(id!);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `tidsrapport_${report?.user?.name?.replace(/\s+/g, '_')}_v${report?.weekNumber}_${report?.year}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Kunde inte ladda ner CSV');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Tidsrapport hittades inte</p>
      </div>
    );
  }

  const weekStart = new Date(report.weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

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

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/admin/time-reports')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeftIcon className="h-4 w-4" />
          Tillbaka
        </button>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Tidsrapport - Vecka {report.weekNumber}, {report.year}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {report.user?.name} | {weekStart.toLocaleDateString('sv-SE')} - {weekEnd.toLocaleDateString('sv-SE')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[report.status]}`}>
              {statusLabels[report.status]}
            </span>
            {!isEditing && (
              <button
                onClick={startEditing}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <PencilIcon className="h-4 w-4" />
                Redigera
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Anställd</p>
          <p className="text-sm font-semibold text-gray-900">{report.user?.name}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Totala timmar</p>
          <p className="text-sm font-semibold text-gray-900">
            {isEditing ? editGrandTotal.toFixed(1) : report.totalHours.toFixed(1)}h
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Inskickad</p>
          <p className="text-sm font-semibold text-gray-900">
            {report.submittedAt ? new Date(report.submittedAt).toLocaleDateString('sv-SE') : '-'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Godkänd av</p>
          <p className="text-sm font-semibold text-gray-900">{report.approvedBy?.name || '-'}</p>
        </div>
      </div>

      {/* Rejection reason */}
      {report.status === 'REJECTED' && report.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-red-800">Avvisningsanledning:</p>
          <p className="text-sm text-red-700 mt-1">{report.rejectionReason}</p>
        </div>
      )}

      {/* Editing banner */}
      {isEditing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <p className="text-sm text-yellow-800 font-medium">Redigeringsläge - ändra timmar och aktiviteter nedan</p>
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEditing}
              className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Avbryt
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Sparar...' : 'Spara ändringar'}
            </button>
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto mb-6">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Aktivitet</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Projekt</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Kommentar</th>
              {DAY_NAMES.map((day, i) => {
                const dayDate = new Date(weekStart);
                dayDate.setDate(dayDate.getDate() + i);
                return (
                  <th key={day} className="text-center px-2 py-3 text-xs font-medium text-gray-500 uppercase">
                    <div>{day}</div>
                    <div className="text-[10px] text-gray-400 font-normal">{dayDate.getDate()}/{dayDate.getMonth() + 1}</div>
                  </th>
                );
              })}
              <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase">Totalt</th>
              {isEditing && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {isEditing ? (
              <>
                {editRows.map(row => {
                  const rowTotal = row.hours.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={row.key} className="border-b border-gray-100">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.activityName}
                          onChange={e => updateEditRow(row.key, 'activityName', e.target.value)}
                          placeholder="Aktivitet"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.projectId}
                          onChange={e => updateEditRow(row.key, 'projectId', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">-</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.comment}
                          onChange={e => updateEditRow(row.key, 'comment', e.target.value)}
                          placeholder=""
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </td>
                      {DAY_NAMES.map((_, dayIdx) => (
                        <td key={dayIdx} className="px-1 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={row.hours[dayIdx] || ''}
                            onChange={e => updateEditHour(row.key, dayIdx, e.target.value)}
                            className="w-14 px-1 py-1.5 text-sm text-center border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        <span className="text-sm font-semibold text-gray-900">{rowTotal.toFixed(1)}</span>
                      </td>
                      <td className="px-1 py-2">
                        {editRows.length > 1 && (
                          <button onClick={() => removeEditRow(row.key)} className="p-1 text-gray-400 hover:text-red-600">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* Add row button */}
                <tr>
                  <td colSpan={11} className="px-4 py-2">
                    <button onClick={addEditRow} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                      <PlusIcon className="h-4 w-4" />
                      Lägg till rad
                    </button>
                  </td>
                </tr>
                {/* Edit sum row */}
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900">SUMMA</td>
                  {editDayTotals.map((t, i) => (
                    <td key={i} className="px-2 py-3 text-center text-sm font-semibold text-gray-900">
                      {t > 0 ? t.toFixed(1) : '-'}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-center text-sm font-bold text-blue-600">
                    {editGrandTotal.toFixed(1)}
                  </td>
                  <td></td>
                </tr>
              </>
            ) : (
              <>
                {report.entries.map((entry, i) => {
                  const dayHours = [
                    entry.mondayHours, entry.tuesdayHours, entry.wednesdayHours,
                    entry.thursdayHours, entry.fridayHours, entry.saturdayHours, entry.sundayHours,
                  ];
                  return (
                    <tr key={entry.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{entry.activityName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{entry.project?.title || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{entry.comment || '-'}</td>
                      {dayHours.map((h, d) => (
                        <td key={d} className="px-2 py-3 text-center text-sm text-gray-900">
                          {h > 0 ? h.toFixed(1) : '-'}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center text-sm font-semibold text-gray-900">
                        {entry.totalHours.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
                {/* Sum row */}
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900">SUMMA</td>
                  {dayTotals.map((t, i) => (
                    <td key={i} className="px-2 py-3 text-center text-sm font-semibold text-gray-900">
                      {t > 0 ? t.toFixed(1) : '-'}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-center text-sm font-bold text-blue-600">
                    {report.totalHours.toFixed(1)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Åtgärder</h3>

          <div className="flex flex-wrap gap-3">
            {report.status === 'SUBMITTED' && (
              <>
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  {approveMutation.isPending ? 'Godkänner...' : 'Godkänn'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <XCircleIcon className="h-5 w-5" />
                  {rejectMutation.isPending ? 'Avvisar...' : 'Avvisa'}
                </button>
              </>
            )}

            {report.status === 'APPROVED' && (
              <>
                <div className="flex items-center gap-2">
                  <select
                    value={sendFormat}
                    onChange={e => setSendFormat(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                    <option value="both">Båda</option>
                  </select>
                  <button
                    onClick={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    <PaperAirplaneIcon className="h-5 w-5" />
                    {sendMutation.isPending ? 'Skickar...' : 'Skicka till revisor'}
                  </button>
                </div>
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  PDF
                </button>
                <button
                  onClick={handleDownloadCsv}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  CSV
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTimeReportDetail;
