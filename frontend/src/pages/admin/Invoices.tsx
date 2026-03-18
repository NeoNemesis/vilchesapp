import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlusIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  status: InvoiceStatus;
}

interface InvoiceStats {
  totalInvoiced: number;
  totalUnpaid: number;
  totalOverdue: number;
  paidThisMonth: number;
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Utkast',
  SENT: 'Skickad',
  PAID: 'Betald',
  OVERDUE: 'Förfallen',
  CANCELLED: 'Makulerad',
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' kr';
};

const AdminInvoices: React.FC = () => {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Hämta fakturor
  const { data: invoicesData, isLoading, error } = useQuery({
    queryKey: ['invoices', filterStatus, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);
      return api.get(`/invoices?${params.toString()}`);
    },
    retry: 1,
  });

  // Hämta statistik
  const { data: statsData } = useQuery({
    queryKey: ['invoices-stats'],
    queryFn: () => api.get('/invoices/stats'),
    retry: 1,
  });

  // Hantera fel
  React.useEffect(() => {
    if (error) {
      console.error('Fel vid hämtning av fakturor:', error);
      const err = error as any;
      if (err.response?.status === 401) {
        toast.error('Du måste logga in för att se fakturor');
      } else {
        toast.error(err.response?.data?.message || 'Kunde inte hämta fakturor');
      }
    }
  }, [error]);

  const invoices: Invoice[] = invoicesData?.data?.invoices || invoicesData?.invoices || [];
  const stats: InvoiceStats = statsData?.data || statsData || {
    totalInvoiced: 0,
    totalUnpaid: 0,
    totalOverdue: 0,
    paidThisMonth: 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-600 mb-4">Ett fel uppstod vid laddning av fakturor</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Försök igen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Fakturor</h1>
          <p className="mt-1 sm:mt-2 text-sm text-gray-700">
            Hantera fakturor, betalningar och uppföljning
          </p>
        </div>
        <Link
          to="/admin/invoices/new"
          className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-5 w-5 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Ny faktura</span>
          <span className="sm:hidden">Ny</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total fakturerat</dt>
            <dd className="mt-1 text-xl sm:text-3xl font-semibold text-gray-900">
              {formatCurrency(stats.totalInvoiced)}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Obetalt</dt>
            <dd className="mt-1 text-xl sm:text-3xl font-semibold text-blue-600">
              {formatCurrency(stats.totalUnpaid)}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Förfallet</dt>
            <dd className="mt-1 text-xl sm:text-3xl font-semibold text-red-600">
              {formatCurrency(stats.totalOverdue)}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Betalda denna månad</dt>
            <dd className="mt-1 text-xl sm:text-3xl font-semibold text-green-600">
              {formatCurrency(stats.paidThisMonth)}
            </dd>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="all">Alla statusar</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Sök
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                placeholder="Fakturanummer, kund..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Inga fakturor</h3>
            <p className="mt-1 text-sm text-gray-500">
              Kom igång genom att skapa din första faktura.
            </p>
            <div className="mt-6">
              <Link
                to="/admin/invoices/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Ny faktura
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fakturanr
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kund
                  </th>
                  <th scope="col" className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fakturadatum
                  </th>
                  <th scope="col" className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Förfallodatum
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Belopp
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => navigate(`/admin/invoices/${invoice.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-indigo-600">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {invoice.customerName}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {invoice.invoiceDate
                        ? format(new Date(invoice.invoiceDate), 'dd MMM yyyy', { locale: sv })
                        : '-'}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {invoice.dueDate
                        ? format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: sv })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          STATUS_COLORS[invoice.status]
                        } ${invoice.status === 'CANCELLED' ? 'line-through' : ''}`}
                      >
                        {STATUS_LABELS[invoice.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInvoices;
