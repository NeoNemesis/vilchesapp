import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  KeyIcon,
  CurrencyDollarIcon,
  BriefcaseIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Employee } from '../../types';

const EmployeeModal: React.FC<{
  employee?: Employee;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Employee>) => void;
}> = ({ employee, isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    company: employee?.company || '',
    isActive: employee?.isActive ?? true,
    hourlyRate: employee?.hourlyRate ?? '',
    vacationPayPercent: employee?.vacationPayPercent ?? 12,
    personalNumber: employee?.personalNumber || '',
    address: employee?.address || '',
    bankAccount: employee?.bankAccount || '',
    employmentStartDate: employee?.employmentStartDate ? employee.employmentStartDate.split('T')[0] : '',
    employmentType: employee?.employmentType || '',
  });

  useEffect(() => {
    setFormData({
      name: employee?.name || '',
      email: employee?.email || '',
      phone: employee?.phone || '',
      company: employee?.company || '',
      isActive: employee?.isActive ?? true,
      hourlyRate: employee?.hourlyRate ?? '',
      vacationPayPercent: employee?.vacationPayPercent ?? 12,
      personalNumber: employee?.personalNumber || '',
      address: employee?.address || '',
      bankAccount: employee?.bankAccount || '',
      employmentStartDate: employee?.employmentStartDate ? employee.employmentStartDate.split('T')[0] : '',
      employmentType: employee?.employmentType || '',
    });
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: any = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      company: formData.company || undefined,
      isActive: formData.isActive,
      hourlyRate: formData.hourlyRate != null && formData.hourlyRate !== '' ? Number(formData.hourlyRate) : undefined,
      vacationPayPercent: formData.vacationPayPercent != null ? Number(formData.vacationPayPercent) : undefined,
      personalNumber: formData.personalNumber || undefined,
      address: formData.address || undefined,
      bankAccount: formData.bankAccount || undefined,
      employmentStartDate: formData.employmentStartDate || undefined,
      employmentType: formData.employmentType || undefined,
    };
    onSubmit(submitData);
  };

  if (!isOpen) return null;

  const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-4 rounded-t-2xl sm:rounded-t-xl sticky top-0 z-10">
            <h3 className="text-lg font-semibold text-white">
              {employee ? 'Redigera Anstalld' : 'Ny Anstalld'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
            {/* Personuppgifter */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Personuppgifter</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Namn *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClass} placeholder="Fornamn Efternamn" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-post *</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inputClass} placeholder="namn@exempel.se" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inputClass} placeholder="070-123 45 67" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personnummer</label>
                  <input type="text" value={formData.personalNumber} onChange={e => setFormData({ ...formData, personalNumber: e.target.value })} className={inputClass} placeholder="AAAAMMDD-XXXX" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adress</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className={inputClass} placeholder="Gatuadress, postnummer, ort" />
                </div>
              </div>
            </div>

            {/* Anställning */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Anstallning</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anstallningstyp</label>
                  <select value={formData.employmentType} onChange={e => setFormData({ ...formData, employmentType: e.target.value })} className={inputClass}>
                    <option value="">Valj typ...</option>
                    <option value="Heltid">Heltid</option>
                    <option value="Deltid">Deltid</option>
                    <option value="Timanställd">Timanstalld</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                  <input type="date" value={formData.employmentStartDate} onChange={e => setFormData({ ...formData, employmentStartDate: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timlon (kr/h)</label>
                  <input type="number" step="1" min="0" value={formData.hourlyRate} onChange={e => setFormData({ ...formData, hourlyRate: e.target.value === '' ? '' : Number(e.target.value) })} className={inputClass} placeholder="650" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semesterersattning (%)</label>
                  <input type="number" step="0.1" min="0" max="100" value={formData.vacationPayPercent} onChange={e => setFormData({ ...formData, vacationPayPercent: e.target.value === '' ? 12 : Number(e.target.value) })} className={inputClass} placeholder="12" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bankkonto/Clearing</label>
                  <input type="text" value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} className={inputClass} placeholder="XXXX-XX XXXXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Foretag</label>
                  <input type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">Aktiv anstalld</label>
            </div>

            <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6 border-t border-gray-100 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">Avbryt</button>
              <button type="submit" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-medium">{employee ? 'Uppdatera' : 'Skapa'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Mobile action menu
const ActionMenu: React.FC<{
  employee: Employee;
  onEdit: () => void;
  onDelete: () => void;
  onWelcomeEmail: () => void;
  onPasswordReset: () => void;
}> = ({ employee, onEdit, onDelete, onWelcomeEmail, onPasswordReset }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-48">
            <button onClick={() => { setOpen(false); onWelcomeEmail(); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <PaperAirplaneIcon className="h-4 w-4 text-green-500" /> Valkomstmail
            </button>
            <button onClick={() => { setOpen(false); onPasswordReset(); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <KeyIcon className="h-4 w-4 text-purple-500" /> Losenordsbyte
            </button>
            <button onClick={() => { setOpen(false); onEdit(); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
              <PencilIcon className="h-4 w-4 text-blue-500" /> Redigera
            </button>
            <button onClick={() => { setOpen(false); onDelete(); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
              <TrashIcon className="h-4 w-4" /> Ta bort
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const AdminEmployees: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['employees', 'includeAccountants'],
    queryFn: async () => {
      const response = await (api as any).client.get('/employees?includeAccountants=true');
      return response.data;
    },
  });

  const employees = allUsers.filter((u: any) => u.role !== 'ACCOUNTANT');
  const accountants = allUsers.filter((u: any) => u.role === 'ACCOUNTANT');

  const createMutation = useMutation({
    mutationFn: api.createEmployee,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsModalOpen(false);
      toast.success('Anstalld skapad!');
      if (data.tempPassword) {
        toast.success(`Temporart losenord: ${data.tempPassword}`, { duration: 10000 });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skapa anstalld');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) => api.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsModalOpen(false);
      setEditingEmployee(undefined);
      toast.success('Anstalld uppdaterad!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte uppdatera anstalld');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Anstalld borttagen!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte ta bort anstalld');
    },
  });

  const welcomeEmailMutation = useMutation({
    mutationFn: api.sendEmployeeWelcomeEmail,
    onSuccess: (data) => {
      toast.success(`Valkomstmail skickat till ${data.email}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skicka valkomstmail');
    },
  });

  const passwordResetMutation = useMutation({
    mutationFn: api.sendEmployeePasswordReset,
    onSuccess: (data) => {
      toast.success(`Losenordsbyte-mail skickat till ${data.email}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skicka losenordsbyte-mail');
    },
  });

  const handleSubmit = (data: Partial<Employee>) => {
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data });
    } else if (data.name && data.email) {
      createMutation.mutate(data as any);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-0">
      {/* Header */}
      <div className="mb-5 sm:mb-8 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Personal</h1>
          <p className="mt-0.5 text-sm text-gray-500">Hantera anstallda och revisorer</p>
        </div>
        <button
          onClick={() => { setEditingEmployee(undefined); setIsModalOpen(true); }}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm font-medium flex-shrink-0"
        >
          <PlusIcon className="h-5 w-5" />
          <span className="hidden sm:inline">Ny Anstalld</span>
          <span className="sm:hidden">Ny</span>
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-6 mb-5 sm:mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <UserCircleIcon className="h-5 w-5 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Totalt</p>
              <p className="text-base sm:text-2xl font-semibold text-gray-900">{employees.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <CheckCircleIcon className="h-5 w-5 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Aktiva</p>
              <p className="text-base sm:text-2xl font-semibold text-gray-900">{employees.filter((e: Employee) => e.isActive).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <XCircleIcon className="h-5 w-5 sm:h-8 sm:w-8 text-red-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Inaktiva</p>
              <p className="text-base sm:text-2xl font-semibold text-gray-900">{employees.filter((e: Employee) => !e.isActive).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Employees list */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Alla Anstallda</h3>
        </div>

        {employees.length === 0 ? (
          <div className="text-center py-12">
            <UserCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Inga anstallda</h3>
            <p className="mt-1 text-sm text-gray-500">Lagg till din forsta anstallda.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {employees.map((employee: Employee) => (
              <div
                key={employee.id}
                className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors cursor-pointer active:bg-gray-100"
                onClick={() => navigate(`/admin/employees/${employee.id}`)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm sm:text-lg">
                        {employee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">{employee.name}</p>
                        <span className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap flex-shrink-0 ${employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>
                      {/* Desktop: show all details inline */}
                      <div className="hidden sm:flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                        <div className="flex items-center gap-1 truncate"><EnvelopeIcon className="h-4 w-4 flex-shrink-0" /><span className="truncate">{employee.email}</span></div>
                        {employee.phone && <div className="flex items-center gap-1"><PhoneIcon className="h-4 w-4 flex-shrink-0" />{employee.phone}</div>}
                        {employee.company && <div className="flex items-center gap-1"><BuildingOfficeIcon className="h-4 w-4 flex-shrink-0" />{employee.company}</div>}
                        {employee.hourlyRate && <div className="flex items-center gap-1"><CurrencyDollarIcon className="h-4 w-4 flex-shrink-0" />{employee.hourlyRate} kr/h</div>}
                        {employee.employmentType && <div className="flex items-center gap-1"><BriefcaseIcon className="h-4 w-4 flex-shrink-0" />{employee.employmentType}</div>}
                      </div>
                      {/* Mobile: compact details */}
                      <div className="sm:hidden mt-0.5 text-xs text-gray-500 truncate">
                        {employee.email}
                      </div>
                      {(employee.hourlyRate || employee.employmentType) && (
                        <div className="sm:hidden mt-0.5 text-xs text-gray-400 flex items-center gap-2">
                          {employee.hourlyRate && <span>{employee.hourlyRate} kr/h</span>}
                          {employee.employmentType && <span>{employee.employmentType}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Desktop: action buttons */}
                  <div className="hidden sm:flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { if (confirm(`Skicka valkomstmail till ${employee.name}?`)) welcomeEmailMutation.mutate(employee.id); }} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Skicka valkomstmail">
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => { if (confirm(`Skicka losenordsbyte-mail till ${employee.name}?`)) passwordResetMutation.mutate(employee.id); }} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Skicka losenordsbyte-mail">
                      <KeyIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => { setEditingEmployee(employee); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Redigera">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => { if (confirm(`Ta bort ${employee.name}?`)) deleteMutation.mutate(employee.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Ta bort">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                  {/* Mobile: 3-dot menu */}
                  <div className="sm:hidden flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <ActionMenu
                      employee={employee}
                      onEdit={() => { setEditingEmployee(employee); setIsModalOpen(true); }}
                      onDelete={() => { if (confirm(`Ta bort ${employee.name}?`)) deleteMutation.mutate(employee.id); }}
                      onWelcomeEmail={() => { if (confirm(`Skicka valkomstmail till ${employee.name}?`)) welcomeEmailMutation.mutate(employee.id); }}
                      onPasswordReset={() => { if (confirm(`Skicka losenordsbyte-mail till ${employee.name}?`)) passwordResetMutation.mutate(employee.id); }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accountant section */}
      {accountants.length > 0 && (
        <div className="mt-6 sm:mt-8">
          <div className="mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">Revisor</h2>
            <p className="text-xs sm:text-sm text-gray-500">Revisor-konton med lasbehörighet till tidsrapporter</p>
          </div>
          <div className="space-y-3">
            {accountants.map((acc: any) => (
              <div
                key={acc.id}
                className="bg-white rounded-xl shadow-sm border border-emerald-200 p-3 sm:p-5 cursor-pointer hover:shadow-md hover:border-emerald-400 transition-all active:bg-emerald-50"
                onClick={() => navigate(`/admin/employees/${acc.id}`)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm sm:text-lg">
                        {acc.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{acc.name}</p>
                        <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-100 text-emerald-700 flex-shrink-0">Revisor</span>
                        <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 ${acc.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {acc.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        <span className="truncate">{acc.email}</span>
                        {acc.phone && <span className="hidden sm:inline flex-shrink-0">{acc.phone}</span>}
                      </div>
                    </div>
                  </div>
                  {/* Desktop: buttons */}
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { if (confirm(`Skicka valkomstmail/inbjudan till ${acc.name}?`)) welcomeEmailMutation.mutate(acc.id); }}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                      Skicka inbjudan
                    </button>
                    <button
                      onClick={() => { if (confirm(`Skicka losenordsbyte-mail till ${acc.name}?`)) passwordResetMutation.mutate(acc.id); }}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Skicka losenordsbyte-mail"
                    >
                      <KeyIcon className="h-5 w-5" />
                    </button>
                  </div>
                  {/* Mobile: compact buttons */}
                  <div className="sm:hidden flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { if (confirm(`Skicka inbjudan till ${acc.name}?`)) welcomeEmailMutation.mutate(acc.id); }}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Skicka losenordsbyte-mail till ${acc.name}?`)) passwordResetMutation.mutate(acc.id); }}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <KeyIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <EmployeeModal employee={editingEmployee} isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingEmployee(undefined); }} onSubmit={handleSubmit} />
    </div>
  );
};

export default AdminEmployees;
