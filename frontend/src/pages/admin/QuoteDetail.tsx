import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  DocumentArrowDownIcon,
  FolderPlusIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Quote, QuoteStatus, ProjectMainCategory } from '../../types';
import QuoteImageUpload from '../../components/common/QuoteImageUpload';
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

const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [emailData, setEmailData] = useState({
    to: '',
    message: '',
    selectedImageIds: [] as string[],
  });
  const [editData, setEditData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    projectType: '',
  });

  // Hämta offert
  const { data: quoteData, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => api.getQuote(id!),
    enabled: !!id,
  });

  const quote = quoteData?.data as Quote | undefined;

  // Mutations
  const sendMutation = useMutation({
    mutationFn: (data: { to: string; message?: string; selectedImageIds?: string[] }) => api.sendQuote(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      setShowEmailModal(false);
      toast.success('Offert skickad!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skicka offert');
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () => api.acceptQuote(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Offert accepterad och projekt skapat!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte acceptera offert');
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: () => api.createProjectFromQuote(id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Projekt skapat!');
      navigate(`/admin/projects/${data.data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte skapa projekt');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteQuote(id!),
    onSuccess: () => {
      toast.success('Offert borttagen!');
      navigate('/admin/quotes');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte ta bort offert');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof editData) => api.updateQuote(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      setShowEditModal(false);
      toast.success('Offert uppdaterad!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte uppdatera offert');
    },
  });

  const handleSendEmail = () => {
    if (!quote) return;

    setEmailData({
      to: quote.clientEmail,
      message: '',
      selectedImageIds: quote.images?.map(img => img.id) || [],
    });
    setShowEmailModal(true);
  };

  const handleConfirmSend = () => {
    sendMutation.mutate(emailData);
  };

  const handleAccept = () => {
    if (window.confirm('Acceptera offert och skapa projekt?')) {
      acceptMutation.mutate();
    }
  };

  const handleCreateProject = () => {
    if (window.confirm('Skapa projekt från denna offert?')) {
      createProjectMutation.mutate();
    }
  };

  const handleDelete = () => {
    const warningMsg = quote?.status === 'ACCEPTED'
      ? `VARNING: Denna offert är accepterad!\n\nÄr du säker på att du vill ta bort offert #${quote?.quoteNumber}?`
      : `Är du säker på att du vill ta bort offert #${quote?.quoteNumber}?`;

    if (window.confirm(warningMsg)) {
      deleteMutation.mutate();
    }
  };

  const handleEdit = () => {
    if (!quote) return;
    setEditData({
      clientName: quote.clientName || '',
      clientEmail: quote.clientEmail || '',
      clientPhone: quote.clientPhone || '',
      clientAddress: quote.clientAddress || '',
      projectType: quote.projectType || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate(editData);
  };

  const handleDownloadPDF = async () => {
    if (!quote) return;

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

  if (!quote) {
    return (
      <div className="text-center py-12">
        <h3 className="mt-2 text-sm font-medium text-gray-900">Offert hittades inte</h3>
        <div className="mt-6">
          <Link
            to="/admin/quotes"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Tillbaka till offerter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/quotes')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-gray-900">
                Offert #{quote.quoteNumber}
              </h1>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${STATUS_COLORS[quote.status]}`}>
                {STATUS_LABELS[quote.status]}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Skapad {format(new Date(quote.createdAt), 'dd MMMM yyyy', { locale: sv })}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {quote.status === 'DRAFT' && (
            <button
              onClick={handleSendEmail}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PaperAirplaneIcon className="h-5 w-5 mr-2" />
              Skicka via email
            </button>
          )}
          {quote.status === 'SENT' && !quote.projectId && (
            <button
              onClick={handleAccept}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Acceptera offert
            </button>
          )}
          {!quote.projectId && quote.status !== 'ACCEPTED' && (
            <button
              onClick={handleCreateProject}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FolderPlusIcon className="h-5 w-5 mr-2" />
              Skapa projekt
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            Ladda ner PDF
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Klientinformation</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Namn</p>
                  <p className="mt-1 text-sm text-gray-900">{quote.clientName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1 text-sm text-gray-900">{quote.clientEmail}</p>
                </div>
                {quote.clientPhone && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Telefon</p>
                    <p className="mt-1 text-sm text-gray-900">{quote.clientPhone}</p>
                  </div>
                )}
                {quote.clientAddress && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Adress</p>
                    <p className="mt-1 text-sm text-gray-900">{quote.clientAddress}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Project Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Projektinformation</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Kategori</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {CATEGORY_LABELS[quote.mainCategory]}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Projekttyp</p>
                  <p className="mt-1 text-sm text-gray-900">{quote.projectType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Plats</p>
                  <p className="mt-1 text-sm text-gray-900">{quote.location}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Yta</p>
                  <p className="mt-1 text-sm text-gray-900">{quote.areaSqm} kvm</p>
                </div>
              </div>

              {quote.description && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Beskrivning</p>
                  <p className="mt-1 text-sm text-gray-900">{quote.description}</p>
                </div>
              )}

              {quote.specialFeatures && quote.specialFeatures.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Specialfunktioner</p>
                  <div className="flex flex-wrap gap-2">
                    {quote.specialFeatures.map((feature) => (
                      <span
                        key={feature}
                        className="px-2 py-1 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          {quote.lineItems && quote.lineItems.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Arbetsuppdelning</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Beskrivning
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Antal
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Enhet
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Pris/enhet
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Kostnad
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quote.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <p className="font-medium">{item.description || item.customCategory || '-'}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {item.quantity || item.estimatedHours}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {item.unit || 'tim'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {item.unitPrice || item.hourlyRate} SEK
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(item.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900">
                        Totalt arbetskostnad
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        {formatCurrency(quote.totalLaborCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Materials */}
          {quote.materials && quote.materials.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Material</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Material
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Antal
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Pris/enhet
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Kostnad
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quote.materials.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <p className="font-medium">{item.description}</p>
                            {item.supplier && (
                              <p className="text-xs text-gray-500">{item.supplier}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {item.unitPrice} SEK
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(item.totalCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-sm font-medium text-gray-900">
                        Totalt materialkostnad
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        {formatCurrency(quote.totalMaterialCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Cost Summary */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Kostnadssammanfattning</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Arbetskostnad</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(quote.totalLaborCost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Materialkostnad</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(quote.totalMaterialCost)}
                </span>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-base font-medium text-gray-900">Total kostnad</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {formatCurrency(quote.totalCost)}
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200 text-xs text-gray-500">
                <p>Estimerad arbetstid: {quote.estimatedTotalHours} timmar</p>
                <p>Timpris: {quote.hourlyRate} SEK/h</p>
              </div>
            </div>
          </div>

          {/* AI Info */}
          {quote.confidenceLevel !== undefined && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">AI-säkerhet</h3>
              <p className="text-sm text-blue-700">
                {Math.round(quote.confidenceLevel * 100)}% säkerhet
              </p>
              {quote.basedOnQuoteIds && quote.basedOnQuoteIds.length > 0 && (
                <p className="mt-1 text-xs text-blue-600">
                  Baserat på {quote.basedOnQuoteIds.length} liknande projekt
                </p>
              )}
            </div>
          )}

          {/* Project Link */}
          {quote.projectId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-900 mb-2">Projekt skapat</h3>
              <Link
                to={`/admin/projects/${quote.projectId}`}
                className="inline-flex items-center text-sm text-green-700 hover:text-green-800"
              >
                <FolderPlusIcon className="h-4 w-4 mr-1" />
                Visa projekt
              </Link>
            </div>
          )}

          {/* Images */}
          <QuoteImageUpload quoteId={quote.id} />

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Åtgärder</h3>
            <button
              onClick={handleEdit}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Redigera offert
            </button>
            <button
              onClick={handleDelete}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Ta bort offert
            </button>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEmailModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Skicka offert via email
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Till</label>
                    <input
                      type="email"
                      value={emailData.to}
                      onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Personligt meddelande (valfritt)</label>
                    <textarea
                      rows={3}
                      value={emailData.message}
                      onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                      placeholder="Lägg till ett personligt meddelande om du vill..."
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">Emailet innehåller redan hälsning, offertinfo och signatur.</p>
                  </div>
                  {/* Bildval */}
                  {quote?.images && quote.images.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bifoga bilder ({emailData.selectedImageIds.length}/{quote.images.length})
                      </label>
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {quote.images.map((image) => {
                          const isSelected = emailData.selectedImageIds.includes(image.id);
                          const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';
                          return (
                            <label
                              key={image.id}
                              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                isSelected
                                  ? 'border-blue-500 ring-2 ring-blue-200'
                                  : 'border-gray-200 opacity-50 hover:opacity-75'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setEmailData(prev => ({
                                    ...prev,
                                    selectedImageIds: isSelected
                                      ? prev.selectedImageIds.filter(id => id !== image.id)
                                      : [...prev.selectedImageIds, image.id]
                                  }));
                                }}
                                className="sr-only"
                              />
                              <img
                                src={`${baseUrl}${image.url}`}
                                alt={image.originalName}
                                className="w-full h-20 object-cover"
                              />
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                                  <CheckCircleIcon className="h-4 w-4 text-white" />
                                </div>
                              )}
                              <p className="text-xs text-gray-500 truncate px-1 py-0.5">{image.originalName}</p>
                            </label>
                          );
                        })}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEmailData(prev => ({ ...prev, selectedImageIds: quote.images!.map(img => img.id) }))}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Markera alla
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmailData(prev => ({ ...prev, selectedImageIds: [] }))}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Avmarkera alla
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse space-x-reverse space-x-3">
                <button
                  onClick={handleConfirmSend}
                  disabled={sendMutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {sendMutation.isPending ? 'Skickar...' : 'Skicka'}
                </button>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Redigera offert
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kundnamn</label>
                    <input
                      type="text"
                      value={editData.clientName}
                      onChange={(e) => setEditData({ ...editData, clientName: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={editData.clientEmail}
                      onChange={(e) => setEditData({ ...editData, clientEmail: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Telefon</label>
                    <input
                      type="tel"
                      value={editData.clientPhone}
                      onChange={(e) => setEditData({ ...editData, clientPhone: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Adress</label>
                    <input
                      type="text"
                      value={editData.clientAddress}
                      onChange={(e) => setEditData({ ...editData, clientAddress: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Projekttyp</label>
                    <input
                      type="text"
                      value={editData.projectType}
                      onChange={(e) => setEditData({ ...editData, projectType: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse space-x-reverse space-x-3">
                <button
                  onClick={handleSaveEdit}
                  disabled={updateMutation.isPending}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Sparar...' : 'Spara ändringar'}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteDetail;
