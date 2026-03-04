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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-xl">
            <h3 className="text-lg font-semibold text-white">
              {employee ? 'Redigera Anställd' : 'Ny Anställd'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Personuppgifter */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Personuppgifter</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Namn *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Förnamn Efternamn" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-post *</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="namn@exempel.se" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="070-123 45 67" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personnummer</label>
                  <input type="text" value={formData.personalNumber} onChange={e => setFormData({ ...formData, personalNumber: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="ÅÅÅÅMMDD-XXXX" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adress</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Gatuadress, postnummer, ort" />
                </div>
              </div>
            </div>

            {/* Anställning */}
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
                  <input type="number" step="1" min="0" value={formData.hourlyRate} onChange={e => setFormData({ ...formData, hourlyRate: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="650" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semesterersättning (%)</label>
                  <input type="number" step="0.1" min="0" max="100" value={formData.vacationPayPercent} onChange={e => setFormData({ ...formData, vacationPayPercent: e.target.value === '' ? 12 : Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="12" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bankkonto/Clearing</label>
                  <input type="text" value={formData.bankAccount} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="XXXX-XX XXXXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Företag</label>
                  <input type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">Aktiv anställd</label>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Avbryt</button>
              <button type="submit" className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all">{employee ? 'Uppdatera' : 'Skapa'}</button>
            </div>
          </form>
        </div>
      </div>
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

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: api.getEmployees,
  });

  const createMutation = useMutation({
    mutationFn: api.createEmployee,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsModalOpen(false);
      toast.success('Anställd skapad!');
      if (data.tempPassword) {
        toast.success(`Temporärt lösenord: ${data.tempPassword}`, { duration: 10000 });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skapa anställd');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) => api.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsModalOpen(false);
      setEditingEmployee(undefined);
      toast.success('Anställd uppdaterad!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte uppdatera anställd');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Anställd borttagen!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte ta bort anställd');
    },
  });

  const welcomeEmailMutation = useMutation({
    mutationFn: api.sendEmployeeWelcomeEmail,
    onSuccess: (data) => {
      toast.success(`Välkomstmail skickat till ${data.email}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skicka välkomstmail');
    },
  });

  const passwordResetMutation = useMutation({
    mutationFn: api.sendEmployeePasswordReset,
    onSuccess: (data) => {
      toast.success(`Lösenordsbyte-mail skickat till ${data.email}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skicka lösenordsbyte-mail');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personal</h1>
          <p className="mt-1 text-sm text-gray-500">Hantera anställda och deras profiler</p>
        </div>
        <button onClick={() => { setEditingEmployee(undefined); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all">
          <PlusIcon className="h-5 w-5" />
          Ny Anställd
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <UserCircleIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Totalt</p>
              <p className="text-2xl font-semibold text-gray-900">{employees.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Aktiva</p>
              <p className="text-2xl font-semibold text-gray-900">{employees.filter((e: Employee) => e.isActive).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <XCircleIcon className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Inaktiva</p>
              <p className="text-2xl font-semibold text-gray-900">{employees.filter((e: Employee) => !e.isActive).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Alla Anställda</h3>
        </div>

        {employees.length === 0 ? (
          <div className="text-center py-12">
            <UserCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Inga anställda</h3>
            <p className="mt-1 text-sm text-gray-500">Lägg till din första anställd.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {employees.map((employee: Employee) => (
              <div
                key={employee.id}
                className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/admin/employees/${employee.id}`)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-4 min-w-0">
                    <div className="h-12 w-12 flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {employee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-lg font-semibold text-gray-900 truncate">{employee.name}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${employee.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {employee.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                        <div className="flex items-center gap-1 truncate"><EnvelopeIcon className="h-4 w-4 flex-shrink-0" /><span className="truncate">{employee.email}</span></div>
                        {employee.phone && <div className="flex items-center gap-1"><PhoneIcon className="h-4 w-4 flex-shrink-0" />{employee.phone}</div>}
                        {employee.company && <div className="flex items-center gap-1"><BuildingOfficeIcon className="h-4 w-4 flex-shrink-0" />{employee.company}</div>}
                        {employee.hourlyRate && (
                          <div className="flex items-center gap-1"><CurrencyDollarIcon className="h-4 w-4 flex-shrink-0" />{employee.hourlyRate} kr/h</div>
                        )}
                        {employee.employmentType && (
                          <div className="flex items-center gap-1"><BriefcaseIcon className="h-4 w-4 flex-shrink-0" />{employee.employmentType}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { if (confirm(`Skicka välkomstmail till ${employee.name}?`)) welcomeEmailMutation.mutate(employee.id); }} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Skicka välkomstmail">
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => { if (confirm(`Skicka lösenordsbyte-mail till ${employee.name}?`)) passwordResetMutation.mutate(employee.id); }} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Skicka lösenordsbyte-mail">
                      <KeyIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => { setEditingEmployee(employee); setIsModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Redigera">
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => { if (confirm(`Ta bort ${employee.name}?`)) deleteMutation.mutate(employee.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Ta bort">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EmployeeModal employee={editingEmployee} isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingEmployee(undefined); }} onSubmit={handleSubmit} />
    </div>
  );
};

export default AdminEmployees;
