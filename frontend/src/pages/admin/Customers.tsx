import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  UserIcon,
  DocumentTextIcon,
  FolderIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

interface Customer {
  id: string;
  customerNumber: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  clientType: 'PRIVATE' | 'COMPANY';
  personalNumber?: string;
  orgNumber?: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    quotes: number;
    projects: number;
    invoices: number;
  };
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const CLIENT_TYPE_LABELS: Record<string, string> = {
  PRIVATE: 'Privatperson',
  COMPANY: 'Foretag',
};

// --- New Customer Modal ---

const CustomerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}> = ({ isOpen, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    clientType: 'PRIVATE' as 'PRIVATE' | 'COMPANY',
    personalNumber: '',
    orgNumber: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        clientType: 'PRIVATE',
        personalNumber: '',
        orgNumber: '',
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/customers', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        clientType: formData.clientType,
        personalNumber: formData.personalNumber || undefined,
        orgNumber: formData.orgNumber || undefined,
      });
      toast.success('Kund skapad!');
      onCreated();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Kunde inte skapa kund');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end sm:items-center justify-center sm:p-4">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl sm:rounded-t-xl">
            <h3 className="text-base sm:text-lg font-semibold text-white">Ny Kund</h3>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Namn *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Fornamn Efternamn / Foretagsnamn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-post *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="namn@exempel.se"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="070-123 45 67"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adress</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Gatuadress, Postnummer Ort"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kundtyp *</label>
              <select
                value={formData.clientType}
                onChange={(e) => setFormData({ ...formData, clientType: e.target.value as 'PRIVATE' | 'COMPANY' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              >
                <option value="PRIVATE">Privatperson</option>
                <option value="COMPANY">Foretag</option>
              </select>
            </div>

            {formData.clientType === 'PRIVATE' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Personnummer</label>
                <input
                  type="text"
                  value={formData.personalNumber}
                  onChange={(e) => setFormData({ ...formData, personalNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="YYYYMMDD-XXXX"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisationsnummer</label>
                <input
                  type="text"
                  value={formData.orgNumber}
                  onChange={(e) => setFormData({ ...formData, orgNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="XXXXXX-XXXX"
                />
              </div>
            )}

            <div className="flex gap-3 pt-3 sm:pt-4 sticky bottom-0 bg-white pb-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Avbryt
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm sm:text-base disabled:opacity-50"
              >
                {submitting ? 'Skapar...' : 'Skapa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Main Page ---

const Customers: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/customers');
      const list = Array.isArray(data) ? data : data?.customers ?? [];
      setCustomers(list);
    } catch (error: any) {
      toast.error('Kunde inte hamta kunder');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    let result = customers;

    // Status filter
    if (statusFilter === 'ACTIVE') {
      result = result.filter((c) => c.isActive);
    } else if (statusFilter === 'INACTIVE') {
      result = result.filter((c) => !c.isActive);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.customerNumber && c.customerNumber.toLowerCase().includes(q))
      );
    }

    return result;
  }, [customers, statusFilter, searchQuery]);

  const activeCount = customers.filter((c) => c.isActive).length;
  const inactiveCount = customers.filter((c) => !c.isActive).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 sm:mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Kunder</h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
            Hantera ditt kundregister
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all text-sm sm:text-base"
        >
          <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="hidden sm:inline">Ny Kund</span>
          <span className="sm:hidden">Ny</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-6 mb-4 sm:mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <UserGroupIcon className="h-5 w-5 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Totalt</p>
              <p className="text-base sm:text-2xl font-semibold text-gray-900">{customers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <CheckCircleIcon className="h-5 w-5 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Aktiva</p>
              <p className="text-base sm:text-2xl font-semibold text-gray-900">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2.5 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <XCircleIcon className="h-5 w-5 sm:h-8 sm:w-8 text-red-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Inaktiva</p>
              <p className="text-base sm:text-2xl font-semibold text-gray-900">{inactiveCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Sok pa namn, e-post, telefon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-1 sm:gap-2">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as StatusFilter[]).map((status) => {
              const labels: Record<StatusFilter, string> = {
                ALL: 'Alla',
                ACTIVE: 'Aktiva',
                INACTIVE: 'Inaktiva',
              };
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {labels[status]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">
            {filteredCustomers.length === customers.length
              ? `Alla kunder (${customers.length})`
              : `${filteredCustomers.length} av ${customers.length} kunder`}
          </h3>
        </div>

        <div className="overflow-hidden">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <UserGroupIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {customers.length === 0 ? 'Inga kunder' : 'Inga kunder matchar sokningen'}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                {customers.length === 0
                  ? 'Kom igang genom att lagga till din forsta kund.'
                  : 'Prova att andra din sokning eller filter.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => navigate(`/admin/customers/${customer.id}`)}
                  className="px-4 sm:px-6 py-3 sm:py-5 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      {/* Avatar */}
                      <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm sm:text-lg">
                          {customer.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                            {customer.name}
                          </p>
                          {customer.customerNumber && (
                            <span className="text-[10px] sm:text-xs text-gray-400 font-mono flex-shrink-0">
                              #{customer.customerNumber}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 ${
                              customer.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {customer.isActive ? 'Aktiv' : 'Inaktiv'}
                          </span>
                          <span className="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-700 flex-shrink-0">
                            {customer.clientType === 'COMPANY' ? (
                              <BuildingOfficeIcon className="h-3 w-3 mr-0.5" />
                            ) : (
                              <UserIcon className="h-3 w-3 mr-0.5" />
                            )}
                            {CLIENT_TYPE_LABELS[customer.clientType] || customer.clientType}
                          </span>
                        </div>

                        {/* Contact info */}
                        <div className="mt-0.5 sm:mt-1 flex flex-col sm:flex-row sm:items-center sm:gap-4 text-xs sm:text-sm text-gray-500">
                          <div className="flex items-center gap-1 truncate">
                            <EnvelopeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                          {customer.phone && (
                            <div className="hidden sm:flex items-center gap-1">
                              <PhoneIcon className="h-4 w-4" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Counts (desktop) */}
                    <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                      <div className="flex items-center gap-1" title="Offerter">
                        <DocumentTextIcon className="h-4 w-4" />
                        <span>{customer._count?.quotes ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Projekt">
                        <FolderIcon className="h-4 w-4" />
                        <span>{customer._count?.projects ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Fakturor">
                        <CurrencyDollarIcon className="h-4 w-4" />
                        <span>{customer._count?.invoices ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchCustomers}
      />
    </div>
  );
};

export default Customers;
