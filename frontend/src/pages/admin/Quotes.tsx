import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  FolderPlusIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Quote, QuoteStatus, ProjectMainCategory } from '../../types';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Utkast',
  SENT: 'Skickad',
  ACCEPTED: 'Accepterad',
  REJECTED: 'Avböjd',
  EXPIRED: 'Utgången',
  CANCELLED: 'Avbruten',
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const CATEGORY_LABELS: Record<ProjectMainCategory, string> = {
  MALNING_TAPETSERING: 'Måleri & Tapetsering',
  SNICKERIARBETEN: 'Snickeriarbeten',
  TOTALRENOVERING: 'Totalrenovering',
  MOBELMONTERING: 'Möbelmontering',
  VATRUM: 'Våtrum/Badrum',
  KOK: 'Kök',
  FASADMALNING: 'Fasadmålning',
  ALTAN_TRADACK: 'Altan & Trädäck',
  GARDEROB: 'Garderob',
  TAPETSERING: 'Tapetsering',
  TAK: 'Tak',
  MALNING: 'Målning',
  SNICKERI: 'Snickeri',
  EL: 'El',
  VVS: 'VVS',
  MURNING: 'Murning',
  KOMBINERAT: 'Kombinerat projekt',
};

const AdminQuotes: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Hämta offerter
  const { data: quotesData, isLoading, error } = useQuery({
    queryKey: ['quotes', filterStatus, filterCategory, searchQuery],
    queryFn: () => api.getQuotes({
      status: filterStatus !== 'all' ? filterStatus : undefined,
      mainCategory: filterCategory !== 'all' ? filterCategory : undefined,
      search: searchQuery || undefined,
    }),
    retry: 1,
  });

  // Hantera fel
  React.useEffect(() => {
    if (error) {
      console.error('Fel vid hämtning av offerter:', error);
      const err = error as any;
      if (err.response?.status === 401) {
        toast.error('Du måste logga in för att se offerter');
      } else {
        toast.error(err.response?.data?.message || 'Kunde inte hämta offerter');
      }
    }
  }, [error]);

  const quotes = quotesData?.data?.quotes || [];

  // Ta bort offert
  const deleteMutation = useMutation({
    mutationFn: api.deleteQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Offert borttagen!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte ta bort offert');
    },
  });

  // Skicka offert
  const sendMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { to: string; message?: string } }) =>
      api.sendQuote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Offert skickad!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skicka offert');
    },
  });

  // Acceptera offert (skapar projekt)
  const acceptMutation = useMutation({
    mutationFn: api.acceptQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Offert accepterad och projekt skapat!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte acceptera offert');
    },
  });

  const handleDelete = (id: string, quoteNumber: string) => {
    if (window.confirm(`Är du säker på att du vill ta bort offert ${quoteNumber}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSendEmail = (quote: Quote) => {
    const message = `Hej ${quote.clientName},\n\nHär kommer din offert för ${quote.projectType}.\n\nMed vänliga hälsningar,\nVilchesApp`;
    sendMutation.mutate({
      id: quote.id,
      data: {
        to: quote.clientEmail,
        message,
      },
    });
  };

  const handleAccept = (id: string, quoteNumber: string) => {
    if (window.confirm(`Acceptera offert ${quoteNumber} och skapa projekt?`)) {
      acceptMutation.mutate(id);
    }
  };

  const handleDownloadPDF = async (quote: Quote) => {
    try {
      const blob = await api.getQuotePDF(quote.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Offert-${quote.quoteNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF nedladdad!');
    } catch (error: any) {
      toast.error('Kunde inte ladda ner PDF');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
    }).format(amount);
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
        <p className="text-red-600 mb-4">Ett fel uppstod vid laddning av offerter</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Offerter</h1>
          <p className="mt-2 text-sm text-gray-700">
            Hantera AI-drivna offerter och konvertera dem till projekt
          </p>
        </div>
        <Link
          to="/admin/quotes/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Ny offert
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Category Filter */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Kategori
            </label>
            <select
              id="category"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="all">Alla kategorier</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
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
            <input
              type="text"
              id="search"
              placeholder="Klient, email, offert#..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Quote List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {quotes.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Inga offerter</h3>
            <p className="mt-1 text-sm text-gray-500">
              Kom igång genom att skapa din första AI-drivna offert.
            </p>
            <div className="mt-6">
              <Link
                to="/admin/quotes/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Ny offert
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {quotes.map((quote: Quote) => (
              <li key={quote.id} className="hover:bg-gray-50">
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          #{quote.quoteNumber} - {quote.projectType}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              STATUS_COLORS[quote.status]
                            }`}
                          >
                            {STATUS_LABELS[quote.status]}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {quote.clientName} ({quote.clientEmail})
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            {CATEGORY_LABELS[quote.mainCategory] || quote.mainCategory} - {quote.areaSqm} kvm
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(quote.totalCost)}
                          </p>
                          <span className="mx-2">•</span>
                          <p>
                            {quote.createdAt ? format(new Date(quote.createdAt), 'dd MMM yyyy', { locale: sv }) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center space-x-2">
                    <Link
                      to={`/admin/quotes/${quote.id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      Visa
                    </Link>

                    {quote.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSendEmail(quote)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                        Skicka
                      </button>
                    )}

                    {quote.status === 'SENT' && (
                      <button
                        onClick={() => handleAccept(quote.id, quote.quoteNumber)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Acceptera
                      </button>
                    )}

                    <button
                      onClick={() => handleDownloadPDF(quote)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                      PDF
                    </button>

                    {quote.status !== 'ACCEPTED' && !quote.projectId && (
                      <button
                        onClick={() => handleDelete(quote.id, quote.quoteNumber)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Ta bort
                      </button>
                    )}

                    {quote.projectId && (
                      <Link
                        to={`/admin/projects/${quote.projectId}`}
                        className="inline-flex items-center px-3 py-1.5 border border-green-300 shadow-sm text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100"
                      >
                        <FolderPlusIcon className="h-4 w-4 mr-1" />
                        Visa projekt
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Totalt offerter</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{quotes.length}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Skickade</dt>
            <dd className="mt-1 text-3xl font-semibold text-blue-600">
              {quotes.filter((q: Quote) => q.status === 'SENT').length}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Accepterade</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">
              {quotes.filter((q: Quote) => q.status === 'ACCEPTED').length}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Totalt värde</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">
              {formatCurrency(
                quotes
                  .filter((q: Quote) => q.status === 'ACCEPTED')
                  .reduce((sum: number, q: Quote) => sum + q.totalCost, 0)
              )}
            </dd>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminQuotes;
