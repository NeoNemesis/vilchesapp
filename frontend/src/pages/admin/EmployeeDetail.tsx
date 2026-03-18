import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  PencilIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  KeyIcon,
  PaperAirplaneIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  CurrencyDollarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { EmployeeDetail as EmployeeDetailType, Employee, TimeReport } from '../../types';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Utkast',
  SUBMITTED: 'Inskickad',
  APPROVED: 'Godkänd',
  REJECTED: 'Avvisad',
};

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

interface EntryRow {
  key: string;
  activityName: string;
  projectId: string;
  comment: string;
  hours: number[];
}

function createEmptyRow(): EntryRow {
  return { key: crypto.randomUUID(), activityName: '', projectId: '', comment: '', hours: [0, 0, 0, 0, 0, 0, 0] };
}

const EditModal: React.FC<{
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Employee>) => void;
}> = ({ employee, isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: employee.name || '',
    email: employee.email || '',
    phone: employee.phone || '',
    company: employee.company || '',
    isActive: employee.isActive ?? true,
    hourlyRate: employee.hourlyRate ?? '',
    vacationPayPercent: employee.vacationPayPercent ?? 12,
    personalNumber: employee.personalNumber || '',
    address: employee.address || '',
    bankAccount: employee.bankAccount || '',
    employmentStartDate: employee.employmentStartDate ? employee.employmentStartDate.split('T')[0] : '',
    employmentType: employee.employmentType || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: any = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      company: formData.company || undefined,
      isActive: formData.isActive,
      hourlyRate: formData.hourlyRate != null && formData.hourlyRate !== '' ? Number(formData.hourlyRate) : null,
      vacationPayPercent: formData.vacationPayPercent != null ? Number(formData.vacationPayPercent) : null,
      personalNumber: formData.personalNumber || null,
      address: formData.address || null,
      bankAccount: formData.bankAccount || null,
      employmentStartDate: formData.employmentStartDate || null,
      employmentType: formData.employmentType || null,
    };
    onSubmit(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
            <h3 className="text-lg font-semibold text-white">Redigera Anställd</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Personuppgifter</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Namn *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-post *</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personnummer</label>
                  <input type="text" value={formData.personalNumber} onChange={e => setFormData({ ...formData, personalNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="ÅÅÅÅMMDD-XXXX" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adress</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Anställning</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anställningstyp</label>
                  <select value={formData.employmentType} onChange={e => setFormData({ ...formData, employmentType: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Välj typ...</option>
                    <option value="Heltid">Heltid</option>
                    <option value="Deltid">Deltid</option>
                    <option value="Timanställd">Timanställd</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                  <input type="date" value={formData.employmentStartDate} onChange={e => setFormData({ ...formData, employmentStartDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timlön (kr/h)</label>
                  <input type="number" step="1" min="0" value={formData.hourlyRate} onChange={e => setFormData({ ...formData, hourlyRate: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semesterersättning (%)</label>
                  <input type="number" step="0.1" min="0" max="100" value={formData.vacationPayPercent} onChange={e => setFormData({ ...formData, vacationPayPercent: e.target.value === '' ? 12 : Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bankkonto/Clearing</label>
                  <input type="text" value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Företag</label>
                  <input type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
            </div>
            <div className="flex items-center">
              <input type="checkbox" id="editIsActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <label htmlFor="editIsActive" className="ml-2 text-sm text-gray-700">Aktiv anställd</label>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Avbryt</button>
              <button type="submit" className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all">Uppdatera</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const AdminEmployeeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editRows, setEditRows] = useState<EntryRow[]>([createEmptyRow()]);
  const [hasInitializedWeek, setHasInitializedWeek] = useState(false);

  const { data: employee, isLoading, error } = useQuery<EmployeeDetailType>({
    queryKey: ['employee', id],
    queryFn: () => api.getEmployee(id!),
    enabled: !!id,
  });

  // Auto-navigate to the most recent report's week on first load
  if (employee && !hasInitializedWeek) {
    if (employee.timeReports.length > 0) {
      const sorted = [...employee.timeReports].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.weekNumber - a.weekNumber;
      });
      const latest = sorted[0];
      setCalendarDate(new Date(latest.weekStartDate));
    } else {
      setCalendarDate(new Date());
    }
    setHasInitializedWeek(true);
  }

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Employee>) => api.updateEmployee(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsEditModalOpen(false);
      toast.success('Anställd uppdaterad!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte uppdatera');
    },
  });

  const welcomeEmailMutation = useMutation({
    mutationFn: () => api.sendEmployeeWelcomeEmail(id!),
    onSuccess: (data) => toast.success(`Välkomstmail skickat till ${data.email}`),
    onError: (error: any) => toast.error(error.response?.data?.message || 'Kunde inte skicka'),
  });

  const passwordResetMutation = useMutation({
    mutationFn: () => api.sendEmployeePasswordReset(id!),
    onSuccess: (data) => toast.success(`Lösenordsbyte-mail skickat till ${data.email}`),
    onError: (error: any) => toast.error(error.response?.data?.message || 'Kunde inte skicka'),
  });

  const approveTimeReportMutation = useMutation({
    mutationFn: (reportId: string) => api.approveTimeReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      toast.success('Tidsrapport godkänd!');
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Kunde inte godkänna'),
  });

  const rejectTimeReportMutation = useMutation({
    mutationFn: (reportId: string) => {
      const reason = prompt('Ange anledning till avvisning:');
      if (!reason) throw new Error('Avbrutet');
      return api.rejectTimeReport(reportId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      toast.success('Tidsrapport avvisad');
    },
    onError: (error: any) => {
      if (error.message !== 'Avbrutet') {
        toast.error(error.response?.data?.message || 'Kunde inte avvisa');
      }
    },
  });

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

  const handleSendToAccountant = async (reportId: string) => {
    try {
      await api.sendTimeReportToAccountant(reportId, 'pdf');
      toast.success('Skickad till revisor!');
    } catch {
      toast.error('Kunde inte skicka till revisor');
    }
  };

  // Calendar logic
  const effectiveDate = calendarDate || new Date();
  const weekStart = useMemo(() => getWeekStart(effectiveDate), [effectiveDate]);
  const weekNumber = useMemo(() => getWeekNumber(effectiveDate), [effectiveDate]);
  const calendarYear = useMemo(() => {
    const thu = new Date(weekStart);
    thu.setDate(thu.getDate() + 3);
    return thu.getFullYear();
  }, [weekStart]);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  // Find report for displayed week
  const currentReport = useMemo(() => {
    if (!employee) return null;
    return employee.timeReports.find(r => r.weekNumber === weekNumber && r.year === calendarYear) || null;
  }, [employee, weekNumber, calendarYear]);

  // Build rows from report
  const viewRows = useMemo((): EntryRow[] => {
    if (!currentReport?.entries?.length) return [];
    return [...currentReport.entries].sort((a, b) => a.sortOrder - b.sortOrder).map(e => ({
      key: e.id || crypto.randomUUID(),
      activityName: e.activityName,
      projectId: e.projectId || '',
      comment: e.comment || '',
      hours: [e.mondayHours || 0, e.tuesdayHours || 0, e.wednesdayHours || 0, e.thursdayHours || 0, e.fridayHours || 0, e.saturdayHours || 0, e.sundayHours || 0],
    }));
  }, [currentReport]);

  const displayRows = isEditing ? editRows : viewRows;

  // Day totals
  const dayTotals = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    for (const row of displayRows) {
      for (let d = 0; d < 7; d++) totals[d] += row.hours[d];
    }
    return totals;
  }, [displayRows]);

  const grandTotal = useMemo(() => dayTotals.reduce((a, b) => a + b, 0), [dayTotals]);

  // Today in this week?
  const todayIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ws = new Date(weekStart);
    const diff = Math.floor((today.getTime() - ws.getTime()) / 86400000);
    return (diff >= 0 && diff <= 6) ? diff : -1;
  }, [weekStart]);

  // Which weeks have reports (for navigation hints)
  const reportWeeks = useMemo(() => {
    if (!employee) return new Set<string>();
    return new Set(employee.timeReports.map(r => `${r.year}-${r.weekNumber}`));
  }, [employee]);

  // Week navigation
  const goPrev = () => {
    if (isEditing) return;
    const d = new Date(effectiveDate);
    d.setDate(d.getDate() - 7);
    setCalendarDate(d);
    setSelectedDay(null);
  };
  const goNext = () => {
    if (isEditing) return;
    const d = new Date(effectiveDate);
    d.setDate(d.getDate() + 7);
    setCalendarDate(d);
    setSelectedDay(null);
  };
  const goToday = () => {
    if (isEditing) return;
    setCalendarDate(new Date());
    setSelectedDay(null);
  };

  // Jump to a specific report
  const goToReport = (report: TimeReport) => {
    if (isEditing) return;
    setCalendarDate(new Date(report.weekStartDate));
    setSelectedDay(null);
  };

  // Editing helpers
  const startEditing = () => {
    if (viewRows.length > 0) {
      setEditRows(viewRows.map(r => ({ ...r, hours: [...r.hours] })));
    } else {
      setEditRows([createEmptyRow()]);
    }
    setIsEditing(true);
    if (selectedDay === null) setSelectedDay(0); // Auto-select Monday for editing
  };
  const cancelEditing = () => {
    setIsEditing(false);
    setEditRows([createEmptyRow()]);
  };
  const updateEditRow = (key: string, field: keyof EntryRow, value: any) => {
    setEditRows(prev => prev.map(r => r.key === key ? { ...r, [field]: value } : r));
  };
  const updateEditHour = (key: string, dayIdx: number, value: string) => {
    const num = parseFloat(value) || 0;
    const clamped = Math.min(24, Math.max(0, Math.round(num * 2) / 2));
    setEditRows(prev => prev.map(r => {
      if (r.key !== key) return r;
      const hours = [...r.hours];
      hours[dayIdx] = clamped;
      return { ...r, hours };
    }));
  };
  const addEditRow = () => setEditRows(prev => [...prev, createEmptyRow()]);
  const removeEditRow = (key: string) => {
    if (editRows.length <= 1) return;
    setEditRows(prev => prev.filter(r => r.key !== key));
  };

  // Save mutation (create or update)
  const saveTimeReportMutation = useMutation({
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
      if (entries.length === 0) throw new Error('Lägg till minst en aktivitet');
      if (currentReport) {
        return api.updateAdminTimeReport(currentReport.id, { entries });
      } else {
        // Create new report for this week
        return api.createAdminTimeReport({
          userId: id!,
          weekNumber,
          year: calendarYear,
          weekStartDate: weekStart.toISOString().split('T')[0],
          entries,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      setIsEditing(false);
      toast.success(currentReport ? 'Tidsrapport uppdaterad!' : 'Tidsrapport skapad!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message || 'Kunde inte spara');
    },
  });

  // Delete mutation
  const deleteTimeReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return api.deleteAdminTimeReport(reportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      toast.success('Tidsrapport borttagen!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message || 'Kunde inte ta bort');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Anställd hittades inte</h2>
        <button onClick={() => navigate('/admin/employees')} className="mt-4 text-blue-600 hover:underline">
          Tillbaka till personal
        </button>
      </div>
    );
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('sv-SE');
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/admin/employees')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeftIcon className="h-4 w-4" />
          Tillbaka till personal
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 bg-gradient-to-r ${employee.role === 'ACCOUNTANT' ? 'from-emerald-600 to-emerald-700' : 'from-blue-600 to-blue-700'} rounded-full flex items-center justify-center`}>
              <span className="text-white font-bold text-2xl">
                {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
                {employee.role === 'ACCOUNTANT' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">Revisor</span>
                )}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{employee.role === 'ACCOUNTANT' ? 'Revisor' : (employee.employmentType || 'Anställd')} sedan {formatDate(employee.employmentStartDate || employee.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { if (confirm(`Skicka välkomstmail till ${employee.name}?`)) welcomeEmailMutation.mutate(); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <PaperAirplaneIcon className="h-4 w-4" />
              Välkomstmail
            </button>
            <button onClick={() => { if (confirm(`Skicka lösenordsbyte-mail till ${employee.name}?`)) passwordResetMutation.mutate(); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <KeyIcon className="h-4 w-4" />
              Återställ lösenord
            </button>
            <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all">
              <PencilIcon className="h-4 w-4" />
              Redigera
            </button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Personuppgifter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Personuppgifter</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 flex items-center gap-2"><EnvelopeIcon className="h-4 w-4" />E-post</dt>
              <dd className="text-sm font-medium text-gray-900">{employee.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 flex items-center gap-2"><PhoneIcon className="h-4 w-4" />Telefon</dt>
              <dd className="text-sm font-medium text-gray-900">{employee.phone || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Personnummer</dt>
              <dd className="text-sm font-medium text-gray-900">{employee.personalNumber || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Adress</dt>
              <dd className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{employee.address || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Anställningsinformation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Anställning</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 flex items-center gap-2"><BuildingOfficeIcon className="h-4 w-4" />Typ</dt>
              <dd className="text-sm font-medium text-gray-900">{employee.employmentType || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Startdatum</dt>
              <dd className="text-sm font-medium text-gray-900">{formatDate(employee.employmentStartDate)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Timlön</dt>
              <dd className="text-sm font-medium text-gray-900">{employee.hourlyRate ? `${employee.hourlyRate} kr/h` : '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Semesterersättning</dt>
              <dd className="text-sm font-medium text-gray-900">{employee.vacationPayPercent != null ? `${employee.vacationPayPercent}%` : '12%'}</dd>
            </div>
            {employee.hourlyRate && employee.stats.totalApprovedHours > 0 && (
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <dt className="text-sm text-gray-500 font-medium">Beräknad sem.ersättning</dt>
                <dd className="text-sm font-semibold text-green-700">
                  {((employee.hourlyRate * employee.stats.totalApprovedHours * (employee.vacationPayPercent ?? 12)) / 100).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Bankkonto</dt>
              <dd className="text-sm font-medium text-gray-900">{employee.bankAccount || '-'}</dd>
            </div>
            {employee.company && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Företag</dt>
                <dd className="text-sm font-medium text-gray-900">{employee.company}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Godkända timmar</p>
              <p className="text-2xl font-semibold text-gray-900">{employee.stats.totalApprovedHours.toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Semesterersättning</p>
              <p className="text-2xl font-semibold text-gray-900">
                {employee.hourlyRate
                  ? `${((employee.hourlyRate * employee.stats.totalApprovedHours * (employee.vacationPayPercent ?? 12)) / 100).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr`
                  : '-'}
              </p>
              {employee.hourlyRate && (
                <p className="text-xs text-gray-400 mt-0.5">{employee.vacationPayPercent ?? 12}% av {(employee.hourlyRate * employee.stats.totalApprovedHours).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr</p>
              )}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Antal rapporter</p>
              <p className="text-2xl font-semibold text-gray-900">{employee.stats.totalReports}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Väntande</p>
              <p className="text-2xl font-semibold text-gray-900">{employee.stats.pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CALENDAR TIME REPORT ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Week navigation bar */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={isEditing}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 text-white" />
          </button>
          <div className="text-center">
            <div className="flex items-center justify-center gap-3">
              <h3 className="text-lg font-bold text-white">Vecka {weekNumber}, {calendarYear}</h3>
              {currentReport && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[currentReport.status]}`}>
                  {statusLabels[currentReport.status]}
                </span>
              )}
            </div>
            <p className="text-blue-100 text-sm mt-0.5">
              {formatDateShort(weekStart)} – {formatDateShort(weekEnd)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              disabled={isEditing}
              className="px-3 py-1.5 text-xs font-medium text-white bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              Idag
            </button>
            <button
              onClick={goNext}
              disabled={isEditing}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Calendar grid - 7 day columns */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAY_NAMES.map((day, i) => {
            const dayDate = new Date(weekStart);
            dayDate.setDate(dayDate.getDate() + i);
            const hours = dayTotals[i];
            const isToday = todayIndex === i;
            const isSelected = selectedDay === i;
            const hasHours = hours > 0;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : i)}
                className={`
                  relative flex flex-col items-center py-4 border-r last:border-r-0 border-gray-100 transition-all cursor-pointer
                  ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : 'hover:bg-gray-50'}
                `}
              >
                {isToday && (
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
                )}
                <span className={`text-xs font-semibold uppercase ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                  {day}
                </span>
                <span className={`text-xs mt-0.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                  {dayDate.getDate()}/{dayDate.getMonth() + 1}
                </span>
                <div className={`
                  mt-2 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                  ${hasHours
                    ? hours >= 8
                      ? 'bg-green-500 text-white'
                      : 'bg-yellow-400 text-gray-900'
                    : 'bg-gray-100 text-gray-400'
                  }
                `}>
                  {hasHours ? hours : '–'}
                </div>
                {hasHours && (
                  <span className="text-[10px] text-gray-400 mt-1">tim</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Week total */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">Totalt veckan:</span>
            <span className="text-xl font-bold text-gray-900">{grandTotal}h</span>
            {employee.hourlyRate && grandTotal > 0 && (
              <span className="text-sm text-green-700 font-medium">
                = {(grandTotal * employee.hourlyRate).toLocaleString('sv-SE', { maximumFractionDigits: 0 })} kr
              </span>
            )}
          </div>
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${grandTotal >= 40 ? 'bg-green-500' : grandTotal > 0 ? 'bg-blue-500' : 'bg-gray-200'}`}
              style={{ width: `${Math.min(100, (grandTotal / 40) * 100)}%` }}
            />
          </div>
        </div>

        {/* Selected day detail panel */}
        {selectedDay !== null && (
          <div className="border-b border-gray-200">
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-blue-900">
                {DAY_NAMES_FULL[selectedDay]} {(() => {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + selectedDay);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                })()}
              </h4>
              <span className="text-sm font-semibold text-blue-700">{dayTotals[selectedDay]}h</span>
            </div>
            <div className="divide-y divide-gray-50">
              {displayRows.length === 0 ? (
                <div className="px-6 py-6 text-center text-sm text-gray-400">
                  Inga aktiviteter registrerade
                </div>
              ) : isEditing ? (
                <>
                  {editRows.map((row) => (
                    <div key={row.key} className="px-6 py-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={row.activityName}
                            onChange={e => updateEditRow(row.key, 'activityName', e.target.value)}
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
                              onChange={e => updateEditHour(row.key, selectedDay, e.target.value)}
                              placeholder="0"
                              className="w-20 px-2 py-2 text-sm text-center font-bold border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">h</span>
                          </div>
                          {editRows.length > 1 && (
                            <button onClick={() => removeEditRow(row.key)} className="flex-shrink-0 p-2 text-gray-300 hover:text-red-500 transition-colors">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={row.comment}
                          onChange={e => updateEditRow(row.key, 'comment', e.target.value)}
                          placeholder="Kommentar (valfritt)"
                          className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-600"
                        />
                      </div>
                    </div>
                  ))}
                  <div className="px-6 py-3">
                    <button onClick={addEditRow} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                      <PlusIcon className="h-4 w-4" />
                      Lägg till aktivitet
                    </button>
                  </div>
                </>
              ) : (
                displayRows.map((row, idx) => {
                  const h = row.hours[selectedDay];
                  return (
                    <div key={row.key || idx} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{row.activityName}</p>
                        {row.comment && <p className="text-xs text-gray-500 mt-0.5">{row.comment}</p>}
                      </div>
                      <span className={`text-lg font-bold ${h > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                        {h > 0 ? `${h}h` : '–'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Full week table overview */}
        {displayRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Aktivitet</th>
                  {DAY_NAMES.map((d, i) => (
                    <th
                      key={d}
                      className={`px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                        selectedDay === i ? 'text-blue-700 bg-blue-50' : 'text-gray-500 hover:text-gray-700'
                      }`}
                      onClick={() => setSelectedDay(selectedDay === i ? null : i)}
                    >
                      {d}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Totalt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayRows.map((row, idx) => (
                  <tr key={row.key || idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm text-gray-900">
                      <span className="font-medium">{row.activityName}</span>
                      {row.comment && <span className="text-gray-400 ml-2 text-xs">({row.comment})</span>}
                    </td>
                    {row.hours.map((h, i) => (
                      <td
                        key={i}
                        className={`px-2 py-2.5 text-center text-sm cursor-pointer transition-colors ${
                          selectedDay === i ? 'bg-blue-50' : ''
                        } ${h > 0 ? 'text-gray-900 font-semibold' : 'text-gray-300'}`}
                        onClick={() => setSelectedDay(selectedDay === i ? null : i)}
                      >
                        {h > 0 ? h : '–'}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center text-sm font-bold text-gray-900">
                      {row.hours.reduce((a, b) => a + b, 0)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-2.5 text-sm font-bold text-gray-900">Totalt</td>
                  {dayTotals.map((t, i) => (
                    <td
                      key={i}
                      className={`px-2 py-2.5 text-center text-sm font-bold cursor-pointer ${
                        selectedDay === i ? 'bg-blue-50 text-blue-700' : t > 0 ? 'text-gray-900' : 'text-gray-300'
                      }`}
                      onClick={() => setSelectedDay(selectedDay === i ? null : i)}
                    >
                      {t > 0 ? t : '–'}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center text-sm font-black text-blue-700">{grandTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* No report for this week */}
        {!currentReport && !isEditing && (
          <div className="px-6 py-12 text-center">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-500">Ingen tidsrapport för vecka {weekNumber}</p>
            <p className="text-xs text-gray-400 mt-1">Navigera till en annan vecka eller skapa en ny rapport</p>
            <button
              onClick={startEditing}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Skapa tidsrapport
            </button>
          </div>
        )}

        {/* Action bar */}
        {(currentReport || isEditing) && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            {isEditing ? (
              <div className="flex gap-3">
                <button
                  onClick={cancelEditing}
                  className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={() => saveTimeReportMutation.mutate()}
                  disabled={saveTimeReportMutation.isPending}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saveTimeReportMutation.isPending ? 'Sparar...' : currentReport ? 'Spara ändringar' : 'Skapa rapport'}
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={startEditing}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PencilIcon className="h-4 w-4" />
                  Redigera timmar
                </button>
                {currentReport && (
                  <>
                    <button onClick={() => navigate(`/admin/time-reports/${currentReport.id}`)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-white transition-colors">
                      <EyeIcon className="h-4 w-4" />
                      Detalj
                    </button>
                    {currentReport.status === 'SUBMITTED' && (
                      <>
                        <button onClick={() => approveTimeReportMutation.mutate(currentReport.id)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors">
                          <CheckCircleIcon className="h-4 w-4" />
                          Godkänn
                        </button>
                        <button onClick={() => rejectTimeReportMutation.mutate(currentReport.id)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
                          <XCircleIcon className="h-4 w-4" />
                          Avvisa
                        </button>
                      </>
                    )}
                    {currentReport.status === 'APPROVED' && (
                      <>
                        <button onClick={() => handleDownloadPdf(currentReport.id)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors">
                          <DocumentArrowDownIcon className="h-4 w-4" />
                          PDF
                        </button>
                        <button onClick={() => handleSendToAccountant(currentReport.id)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors">
                          <PaperAirplaneIcon className="h-4 w-4" />
                          Revisor
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Är du säker på att du vill ta bort tidsrapporten för vecka ${weekNumber}?`)) {
                          deleteTimeReportMutation.mutate(currentReport.id);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors ml-auto"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Ta bort rapport
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Employee Modal */}
      {isEditModalOpen && (
        <EditModal
          employee={employee}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={(data) => updateMutation.mutate(data)}
        />
      )}
    </div>
  );
};

export default AdminEmployeeDetail;
