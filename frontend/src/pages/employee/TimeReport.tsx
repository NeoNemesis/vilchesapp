import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { TimeReport as TimeReportType, TimeReportEntry } from '../../types';

const DAY_NAMES = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const DAY_NAMES_FULL = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag'];

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateShort(date: Date): string {
  return `${date.getDate()} ${['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'][date.getMonth()]}`;
}

function getDayColor(hours: number): string {
  if (hours >= 8) return 'bg-green-500 text-white';
  if (hours > 0) return 'bg-yellow-400 text-gray-900';
  return 'bg-gray-100 text-gray-400';
}

function getDayRingColor(hours: number): string {
  if (hours >= 8) return 'ring-green-300';
  if (hours > 0) return 'ring-yellow-300';
  return 'ring-gray-200';
}

interface EntryRow {
  key: string;
  activityName: string;
  projectId: string;
  comment: string;
  hours: number[];
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-green-100 text-green-800',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Sparad',
};

function createEmptyRow(): EntryRow {
  return {
    key: crypto.randomUUID(),
    activityName: '',
    projectId: '',
    comment: '',
    hours: [0, 0, 0, 0, 0, 0, 0],
  };
}

const TimeReportPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [rows, setRows] = useState<EntryRow[]>([createEmptyRow()]);
  const [existingReportId, setExistingReportId] = useState<string | null>(null);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(() => {
    const today = new Date().getDay();
    return today === 0 ? 6 : today - 1; // Convert to Mon=0 index
  });

  const weekStart = useMemo(() => getWeekStart(currentDate), [currentDate]);
  const weekNumber = useMemo(() => getWeekNumber(currentDate), [currentDate]);
  const year = useMemo(() => {
    const thu = new Date(weekStart);
    thu.setDate(thu.getDate() + 3);
    return thu.getFullYear();
  }, [weekStart]);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  // Is today in the current displayed week?
  const todayDayIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ws = new Date(weekStart);
    const diff = Math.floor((today.getTime() - ws.getTime()) / 86400000);
    if (diff >= 0 && diff <= 6) return diff;
    return -1;
  }, [weekStart]);

  // Fetch reports for current year
  const { data: reports = [] } = useQuery<TimeReportType[]>({
    queryKey: ['my-time-reports', year],
    queryFn: () => api.getMyTimeReports({ year }),
  });

  // Fetch available projects
  const { data: projects = [] } = useQuery<{ id: string; title: string; projectNumber: string }[]>({
    queryKey: ['employee-projects'],
    queryFn: () => api.getMyProjects_Employee(),
  });

  // Fetch locked periods
  const { data: lockedPeriods = [] } = useQuery<{ id: string; year: number; month: number }[]>({
    queryKey: ['locked-periods', year],
    queryFn: () => api.getLockedPeriods(year),
  });

  // Load existing report for current week
  useEffect(() => {
    const existing = reports.find(r => r.weekNumber === weekNumber && r.year === year);
    if (existing) {
      setExistingReportId(existing.id);
      setExistingStatus(existing.status);
      setRejectionReason(existing.rejectionReason || null);
      if (existing.entries.length > 0) {
        setRows(existing.entries.map(e => ({
          key: e.id || crypto.randomUUID(),
          activityName: e.activityName,
          projectId: e.projectId || '',
          comment: e.comment || '',
          hours: [
            e.mondayHours, e.tuesdayHours, e.wednesdayHours,
            e.thursdayHours, e.fridayHours, e.saturdayHours, e.sundayHours,
          ],
        })));
      } else {
        setRows([createEmptyRow()]);
      }
    } else {
      setExistingReportId(null);
      setExistingStatus(null);
      setRejectionReason(null);
      setRows([createEmptyRow()]);
    }
  }, [reports, weekNumber, year]);

  // Check if period is locked (use Thursday of the week to determine month)
  const isLocked = useMemo(() => {
    const thu = new Date(weekStart);
    thu.setDate(thu.getDate() + 3);
    const weekMonth = thu.getMonth() + 1;
    const weekYear = thu.getFullYear();
    return lockedPeriods.some(lp => lp.year === weekYear && lp.month === weekMonth);
  }, [weekStart, lockedPeriods]);

  const isEditable = !isLocked;

  // Day totals
  const dayTotals = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    for (const row of rows) {
      for (let d = 0; d < 7; d++) {
        totals[d] += row.hours[d];
      }
    }
    return totals;
  }, [rows]);

  const grandTotal = useMemo(() => dayTotals.reduce((a, b) => a + b, 0), [dayTotals]);

  // Mutations
  const buildEntries = () => rows
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = buildEntries();
      if (entries.length === 0) throw new Error('Lägg till minst en aktivitet');
      if (existingReportId) {
        return api.updateTimeReport(existingReportId, { entries });
      } else {
        return api.createTimeReport({ weekNumber, year, weekStartDate: weekStart.toISOString(), entries });
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-time-reports'] });
      setExistingReportId(data.id);
      setExistingStatus(data.status);
      toast.success('Tidsrapport sparad');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message || 'Kunde inte spara');
    },
  });


  // Navigation
  const goToPreviousWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const goToNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  // Row management
  const addRow = () => setRows([...rows, createEmptyRow()]);

  const removeRow = (key: string) => {
    if (rows.length <= 1) return;
    setRows(rows.filter(r => r.key !== key));
  };

  const updateRow = (key: string, field: keyof EntryRow, value: any) => {
    setRows(rows.map(r => r.key === key ? { ...r, [field]: value } : r));
  };

  const updateHour = (key: string, dayIndex: number, value: string) => {
    const num = parseFloat(value) || 0;
    const clamped = Math.min(24, Math.max(0, Math.round(num * 2) / 2));
    setRows(rows.map(r => {
      if (r.key !== key) return r;
      const hours = [...r.hours];
      hours[dayIndex] = clamped;
      return { ...r, hours };
    }));
  };

  // Selected day date
  const selectedDayDate = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + selectedDay);
    return d;
  }, [weekStart, selectedDay]);

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Tidsrapport</h1>
        <p className="text-sm text-gray-500 mt-0.5">Rapportera din arbetstid</p>
      </div>

      {/* Week navigator */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4">
        <div className="flex items-center justify-between">
          <button onClick={goToPreviousWeek} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-base font-semibold text-gray-900">
                V{weekNumber}
              </span>
              {existingStatus && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColors[existingStatus]}`}>
                  {statusLabels[existingStatus]}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {formatDateShort(weekStart)} – {formatDateShort(weekEnd)} {year}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={goToToday} className="px-2 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              Idag
            </button>
            <button onClick={goToNextWeek} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Locked period notice */}
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <div className="flex items-start gap-2">
            <LockClosedIcon className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Perioden är låst</p>
              <p className="text-xs text-amber-700 mt-0.5">Denna period har låsts av admin och kan inte redigeras.</p>
            </div>
          </div>
        </div>
      )}

      {/* Day buttons row */}
      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {DAY_NAMES.map((day, i) => {
          const dayDate = new Date(weekStart);
          dayDate.setDate(dayDate.getDate() + i);
          const total = dayTotals[i];
          const isSelected = selectedDay === i;
          const isToday = todayDayIndex === i;

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(i)}
              className={`
                relative flex flex-col items-center py-2 rounded-xl transition-all
                ${isSelected
                  ? `${getDayColor(total)} ring-2 ${getDayRingColor(total)} shadow-md scale-105`
                  : `${getDayColor(total)} opacity-80 hover:opacity-100`
                }
              `}
            >
              {isToday && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
              <span className="text-[11px] font-medium leading-none">{day}</span>
              <span className="text-xs leading-none mt-0.5">{dayDate.getDate()}</span>
              <span className="text-lg font-bold leading-none mt-1">
                {total > 0 ? total : '–'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Week total bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500 uppercase">Vecka totalt</span>
          <span className="text-lg font-bold text-gray-900">{grandTotal}h</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              grandTotal >= 40 ? 'bg-green-500' : grandTotal > 0 ? 'bg-blue-500' : 'bg-gray-200'
            }`}
            style={{ width: `${Math.min(100, (grandTotal / 40) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-400">0h</span>
          <span className="text-[10px] text-gray-400">40h</span>
        </div>
      </div>

      {/* Selected day detail */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">
            {DAY_NAMES_FULL[selectedDay]} {selectedDayDate.getDate()}/{selectedDayDate.getMonth() + 1}
          </h3>
        </div>

        {/* Activity list for selected day */}
        <div className="divide-y divide-gray-50">
          {rows.map((row) => (
            <div key={row.key} className="px-4 py-3">
              {isEditable ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.activityName}
                      onChange={e => updateRow(row.key, 'activityName', e.target.value)}
                      placeholder="Aktivitet (t.ex. Målning)"
                      className="min-w-0 flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="relative flex-shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={row.hours[selectedDay] || ''}
                        onChange={e => updateHour(row.key, selectedDay, e.target.value)}
                        placeholder="0"
                        className="w-16 px-2 py-2 text-sm text-center font-semibold border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">h</span>
                    </div>
                    {rows.length > 1 && (
                      <button
                        onClick={() => removeRow(row.key)}
                        className="flex-shrink-0 p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <select
                    value={row.projectId}
                    onChange={e => updateRow(row.key, 'projectId', e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                  >
                    <option value="">Projekt (valfritt)</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={row.comment}
                    onChange={e => updateRow(row.key, 'comment', e.target.value)}
                    placeholder="Kommentar (valfritt)"
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{row.activityName}</p>
                    {(row.projectId || row.comment) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {projects.find(p => p.id === row.projectId)?.title}
                        {row.projectId && row.comment ? ' · ' : ''}
                        {row.comment}
                      </p>
                    )}
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {row.hours[selectedDay] > 0 ? `${row.hours[selectedDay]}h` : '–'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add row */}
        {isEditable && (
          <div className="px-4 py-3 border-t border-gray-100">
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Lägg till aktivitet
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      {isEditable && (
        <div className="mb-6">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Sparar...' : 'Spara'}
          </button>
        </div>
      )}

    </div>
  );
};

export default TimeReportPage;
