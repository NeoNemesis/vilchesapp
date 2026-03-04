import React, { useState } from 'react';
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

  const { data: employee, isLoading, error } = useQuery<EmployeeDetailType>({
    queryKey: ['employee', id],
    queryFn: () => api.getEmployee(id!),
    enabled: !!id,
  });

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

  const getWeekPeriod = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}`;
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
            <div className="h-16 w-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-2xl">
                {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{employee.employmentType || 'Anställd'} sedan {formatDate(employee.employmentStartDate || employee.createdAt)}</p>
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

      {/* Time Reports Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Tidsrapporter</h3>
        </div>

        {employee.timeReports.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Inga tidsrapporter</h3>
            <p className="mt-1 text-sm text-gray-500">Denna anställd har inga tidsrapporter ännu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vecka</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timmar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Åtgärder</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employee.timeReports.map((report: TimeReport) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      v{report.weekNumber}, {report.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getWeekPeriod(report.weekStartDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {report.totalHours.toFixed(1)} h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[report.status]}`}>
                        {statusLabels[report.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/admin/time-reports/${report.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Visa detalj">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {report.status === 'SUBMITTED' && (
                          <>
                            <button onClick={() => approveTimeReportMutation.mutate(report.id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Godkänn">
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => rejectTimeReportMutation.mutate(report.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Avvisa">
                              <XCircleIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {report.status === 'APPROVED' && (
                          <>
                            <button onClick={() => handleDownloadPdf(report.id)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" title="Ladda ner PDF">
                              <DocumentArrowDownIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleSendToAccountant(report.id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Skicka till revisor">
                              <PaperAirplaneIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
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
