import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  UserIcon,
  IdentificationIcon,
  DocumentTextIcon,
  FolderIcon,
  CurrencyDollarIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

// --- Types ---

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
  updatedAt?: string;
  quotes?: RelatedQuote[];
  projects?: RelatedProject[];
  invoices?: RelatedInvoice[];
}

interface RelatedQuote {
  id: string;
  quoteNumber?: string;
  title?: string;
  status: string;
  totalAmount?: number;
  createdAt: string;
}

interface RelatedProject {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

interface RelatedInvoice {
  id: string;
  invoiceNumber?: string;
  status: string;
  totalAmount?: number;
  createdAt: string;
}

type TabKey = 'quotes' | 'projects' | 'invoices';

// --- Status helpers ---

const QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Utkast',
  SENT: 'Skickad',
  ACCEPTED: 'Accepterad',
  REJECTED: 'Avbojd',
  EXPIRED: 'Utgangen',
  CANCELLED: 'Avbruten',
};

const QUOTE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Vantar',
  ASSIGNED: 'Tilldelad',
  IN_PROGRESS: 'Pagar',
  COMPLETED: 'Avslutad',
  CANCELLED: 'Avbruten',
};

const PROJECT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Utkast',
  SENT: 'Skickad',
  PAID: 'Betald',
  OVERDUE: 'Forsenad',
  CANCELLED: 'Makulerad',
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

// --- Helpers ---

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('sv-SE');
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number | undefined): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(amount);
}

// --- Component ---

const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('quotes');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    clientType: 'PRIVATE' as 'PRIVATE' | 'COMPANY',
    personalNumber: '',
    orgNumber: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchCustomer = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await api.get(`/customers/${id}`);
      const c = data?.customer ?? data;
      setCustomer(c);
      setFormData({
        name: c.name || '',
        email: c.email || '',
        phone: c.phone || '',
        address: c.address || '',
        clientType: c.clientType || 'PRIVATE',
        personalNumber: c.personalNumber || '',
        orgNumber: c.orgNumber || '',
        isActive: c.isActive ?? true,
      });
    } catch (error: any) {
      toast.error('Kunde inte hamta kundinfo');
      navigate('/admin/customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await api.put(`/customers/${id}`, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        clientType: formData.clientType,
        personalNumber: formData.personalNumber || undefined,
        orgNumber: formData.orgNumber || undefined,
        isActive: formData.isActive,
      });
      toast.success('Kund uppdaterad!');
      setIsEditing(false);
      fetchCustomer();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Kunde inte uppdatera kund');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !customer) return;
    if (!confirm(`Ar du saker pa att du vill ta bort ${customer.name}? Kunden markeras som inaktiv.`)) return;
    setDeleting(true);
    try {
      await api.delete(`/customers/${id}`);
      toast.success('Kund borttagen');
      navigate('/admin/customers');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Kunde inte ta bort kund');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        clientType: customer.clientType || 'PRIVATE',
        personalNumber: customer.personalNumber || '',
        orgNumber: customer.orgNumber || '',
        isActive: customer.isActive ?? true,
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Kunden hittades inte.</p>
        <button
          onClick={() => navigate('/admin/customers')}
          className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Tillbaka till kunder
        </button>
      </div>
    );
  }

  const quotes = customer.quotes || [];
  const projects = customer.projects || [];
  const invoices = customer.invoices || [];

  const tabs: { key: TabKey; label: string; count: number; icon: React.ElementType }[] = [
    { key: 'quotes', label: 'Offerter', count: quotes.length, icon: DocumentTextIcon },
    { key: 'projects', label: 'Projekt', count: projects.length, icon: FolderIcon },
    { key: 'invoices', label: 'Fakturor', count: invoices.length, icon: CurrencyDollarIcon },
  ];

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => navigate('/admin/customers')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 sm:mb-6 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Tillbaka till kunder
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg sm:text-2xl">
                  {customer.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                    {customer.name}
                  </h1>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      customer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {customer.isActive ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
                {customer.customerNumber && (
                  <p className="text-xs sm:text-sm text-gray-500 font-mono mt-0.5">
                    Kundnr: #{customer.customerNumber}
                  </p>
                )}
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                  Skapad {formatDate(customer.createdAt)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Redigera</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{deleting ? 'Tar bort...' : 'Ta bort'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    <CheckIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{saving ? 'Sparar...' : 'Spara'}</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Avbryt</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-medium text-gray-900">Kundinformation</h2>
        </div>
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          {isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Namn *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-post *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adress</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kundtyp</label>
                <select
                  value={formData.clientType}
                  onChange={(e) =>
                    setFormData({ ...formData, clientType: e.target.value as 'PRIVATE' | 'COMPANY' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="XXXXXX-XXXX"
                  />
                </div>
              )}
              <div className="flex items-center sm:col-span-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Aktiv kund
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <InfoRow icon={EnvelopeIcon} label="E-post" value={customer.email} />
              <InfoRow icon={PhoneIcon} label="Telefon" value={customer.phone || '-'} />
              <InfoRow icon={MapPinIcon} label="Adress" value={customer.address || '-'} />
              <InfoRow
                icon={customer.clientType === 'COMPANY' ? BuildingOfficeIcon : UserIcon}
                label="Kundtyp"
                value={customer.clientType === 'COMPANY' ? 'Foretag' : 'Privatperson'}
              />
              {customer.clientType === 'PRIVATE' && customer.personalNumber && (
                <InfoRow icon={IdentificationIcon} label="Personnummer" value={customer.personalNumber} />
              )}
              {customer.clientType === 'COMPANY' && customer.orgNumber && (
                <InfoRow icon={IdentificationIcon} label="Organisationsnummer" value={customer.orgNumber} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 4)}.</span>
                <span
                  className={`ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-6">
          {/* Action bar for invoices tab */}
          {activeTab === 'invoices' && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() =>
                  navigate(`/admin/invoices/new?customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}`)
                }
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                <PlusIcon className="h-4 w-4" />
                Skapa faktura
              </button>
            </div>
          )}

          {/* Quotes Tab */}
          {activeTab === 'quotes' && (
            <>
              {quotes.length === 0 ? (
                <EmptyTabState label="Inga offerter for denna kund." />
              ) : (
                <div className="divide-y divide-gray-100">
                  {quotes.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => navigate(`/admin/quotes/${q.id}`)}
                      className="py-3 sm:py-4 flex items-center justify-between gap-3 hover:bg-gray-50 -mx-4 sm:-mx-6 px-4 sm:px-6 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {q.title || `Offert ${q.quoteNumber || ''}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(q.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-medium text-gray-700">
                          {formatCurrency(q.totalAmount)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            QUOTE_STATUS_COLORS[q.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {QUOTE_STATUS_LABELS[q.status] || q.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <>
              {projects.length === 0 ? (
                <EmptyTabState label="Inga projekt for denna kund." />
              ) : (
                <div className="divide-y divide-gray-100">
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/admin/projects/${p.id}`)}
                      className="py-3 sm:py-4 flex items-center justify-between gap-3 hover:bg-gray-50 -mx-4 sm:-mx-6 px-4 sm:px-6 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(p.createdAt)}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                          PROJECT_STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {PROJECT_STATUS_LABELS[p.status] || p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <>
              {invoices.length === 0 ? (
                <EmptyTabState label="Inga fakturor for denna kund." />
              ) : (
                <div className="divide-y divide-gray-100">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => navigate(`/admin/invoices/${inv.id}`)}
                      className="py-3 sm:py-4 flex items-center justify-between gap-3 hover:bg-gray-50 -mx-4 sm:-mx-6 px-4 sm:px-6 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Faktura {inv.invoiceNumber || ''}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(inv.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-medium text-gray-700">
                          {formatCurrency(inv.totalAmount)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            INVOICE_STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Helper Components ---

const InfoRow: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
}> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <Icon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  </div>
);

const EmptyTabState: React.FC<{ label: string }> = ({ label }) => (
  <div className="text-center py-8">
    <p className="text-sm text-gray-500">{label}</p>
  </div>
);

export default CustomerDetail;
