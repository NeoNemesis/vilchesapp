import React, { useState, useMemo, useEffect } from 'react';
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
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Quote, QuoteStatus, ProjectMainCategory } from '../../types';
import QuoteImageUpload from '../../components/common/QuoteImageUpload';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  isRotEligible,
  getHourlyRate,
  ROT_PERCENTAGE,
  VAT_RATE,
  WORK_CATEGORY_OPTIONS,
  CATEGORY_LABELS as WORK_CATEGORY_LABELS,
  WORK_DESCRIPTIONS,
  WorkCategory,
  DEFAULT_UNITS,
  COMMON_UNITS,
} from '../../config/pricing';

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Utkast',
  SENT: 'Skickad',
  ACCEPTED: 'Accepterad',
  REJECTED: 'Avbojd',
  EXPIRED: 'Utgangen',
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
  MALNING_TAPETSERING: 'Maleri & Tapetsering',
  SNICKERIARBETEN: 'Snickeriarbeten',
  TOTALRENOVERING: 'Totalrenovering',
  MOBELMONTERING: 'Mobelmontering',
  VATRUM: 'Vatrum/Badrum',
  KOK: 'Kok',
  FASADMALNING: 'Fasadmalning',
  ALTAN_TRADACK: 'Altan & Tradack',
  GARDEROB: 'Garderob',
  TAPETSERING: 'Tapetsering',
  TAK: 'Tak',
  MALNING: 'Malning',
  SNICKERI: 'Snickeri',
  EL: 'El',
  VVS: 'VVS',
  MURNING: 'Murning',
  KOMBINERAT: 'Kombinerat projekt',
};

interface EditableLineItem {
  category: string;
  customCategory: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
}

interface EditableMaterial {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  supplier?: string;
}

const QuoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [emailData, setEmailData] = useState({
    to: '',
    message: '',
    selectedImageIds: [] as string[],
  });

  // Edit state
  const [editData, setEditData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    projectType: '',
    mainCategory: '' as string,
    description: '',
    location: '',
    areaSqm: 0,
    applyRotDeduction: true,
    includeVat: false,
  });
  const [editableLineItems, setEditableLineItems] = useState<EditableLineItem[]>([]);
  const [editableMaterials, setEditableMaterials] = useState<EditableMaterial[]>([]);

  // Hamta offert
  const { data: quoteData, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => api.getQuote(id!),
    enabled: !!id,
  });

  const quote = quoteData?.data as Quote | undefined;

  // Live totals for edit mode
  const liveTotals = useMemo(() => {
    const totalLaborCost = editableLineItems.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const totalMaterialCost = editableMaterials.reduce((sum, item) => sum + (item.totalCost || 0), 0);
    const totalHours = editableLineItems.reduce((sum, item) => {
      if (item.unit === 'tim') return sum + (item.quantity || 0);
      return sum;
    }, 0);

    const rotEligibleCost = editData.applyRotDeduction
      ? editableLineItems
          .filter(item => item.category !== '__custom__' && isRotEligible(item.category))
          .reduce((sum, item) => sum + (item.totalCost || 0), 0)
      : 0;
    const rotDeduction = Math.round(rotEligibleCost * ROT_PERCENTAGE);

    const subtotal = totalLaborCost + totalMaterialCost;
    const vatAmount = editData.includeVat ? Math.round(subtotal * VAT_RATE) : 0;
    const totalWithVat = subtotal + vatAmount;
    const totalAfterRot = totalWithVat - rotDeduction;

    return {
      totalLaborCost,
      totalMaterialCost,
      totalHours,
      rotDeduction,
      vatAmount,
      totalCost: subtotal,
      totalAfterRot,
    };
  }, [editableLineItems, editableMaterials, editData.applyRotDeduction, editData.includeVat]);

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
    mutationFn: (data: any) => api.updateQuote(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      setIsEditing(false);
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
    if (window.confirm('Skapa projekt fran denna offert?')) {
      createProjectMutation.mutate();
    }
  };

  const handleDelete = () => {
    const warningMsg = quote?.status === 'ACCEPTED'
      ? `VARNING: Denna offert ar accepterad!\n\nAr du saker pa att du vill ta bort offert #${quote?.quoteNumber}?`
      : `Ar du saker pa att du vill ta bort offert #${quote?.quoteNumber}?`;
    if (window.confirm(warningMsg)) {
      deleteMutation.mutate();
    }
  };

  const handleStartEdit = () => {
    if (!quote) return;
    setEditData({
      clientName: quote.clientName || '',
      clientEmail: quote.clientEmail || '',
      clientPhone: quote.clientPhone || '',
      clientAddress: quote.clientAddress || '',
      projectType: quote.projectType || '',
      mainCategory: quote.mainCategory || '',
      description: quote.description || '',
      location: quote.location || '',
      areaSqm: quote.areaSqm || 0,
      applyRotDeduction: quote.applyRotDeduction !== false,
      includeVat: quote.includeVat || false,
    });
    setEditableLineItems(
      (quote.lineItems || []).map((item: any) => ({
        category: item.category || 'SNICKERI',
        customCategory: item.customCategory || '',
        description: item.description || '',
        quantity: item.quantity || item.estimatedHours || 0,
        unit: item.unit || 'tim',
        unitPrice: item.unitPrice || item.hourlyRate || 0,
        totalCost: item.totalCost || 0,
      }))
    );
    setEditableMaterials(
      (quote.materials || []).map((m: any) => ({
        description: m.description || '',
        quantity: m.quantity || 0,
        unit: m.unit || 'st',
        unitPrice: m.unitPrice || 0,
        totalCost: m.totalCost || 0,
        supplier: m.supplier || '',
      }))
    );
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    const payload = {
      ...editData,
      estimatedTotalHours: liveTotals.totalHours,
      estimatedLaborCost: liveTotals.totalLaborCost,
      estimatedMaterialCost: liveTotals.totalMaterialCost,
      estimatedTotalCost: liveTotals.totalCost,
      rotDeduction: liveTotals.rotDeduction,
      totalAfterRot: liveTotals.totalAfterRot,
      vatAmount: liveTotals.vatAmount,
      totalWithVat: liveTotals.totalCost + liveTotals.vatAmount,
      lineItems: editableLineItems,
      materials: editableMaterials,
    };
    updateMutation.mutate(payload);
  };

  // Line items editing
  const updateLineItem = (index: number, field: string, value: any) => {
    setEditableLineItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'category') {
        if (value === '__custom__') {
          updated[index].customCategory = '';
        } else {
          const newUnitPrice = getHourlyRate(value, editData.includeVat);
          const newUnit = DEFAULT_UNITS[value as WorkCategory] || 'tim';
          updated[index].unitPrice = newUnitPrice;
          updated[index].unit = newUnit;
          updated[index].customCategory = '';
          updated[index].totalCost = (updated[index].quantity || 0) * newUnitPrice;
        }
      }

      if (field === 'quantity' || field === 'unitPrice') {
        updated[index].totalCost = (updated[index].quantity || 0) * (updated[index].unitPrice || 0);
      }

      return updated;
    });
  };

  const addLineItem = () => {
    const defaultCategory = 'SNICKERI';
    const defaultRate = getHourlyRate(defaultCategory, editData.includeVat);
    const defaultUnit = DEFAULT_UNITS[defaultCategory as WorkCategory] || 'tim';
    setEditableLineItems(prev => [
      ...prev,
      {
        category: defaultCategory,
        customCategory: '',
        description: '',
        quantity: 0,
        unit: defaultUnit,
        unitPrice: defaultRate,
        totalCost: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setEditableLineItems(prev => prev.filter((_, i) => i !== index));
  };

  // Materials editing
  const updateMaterial = (index: number, field: string, value: any) => {
    setEditableMaterials(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        updated[index].totalCost = (updated[index].quantity || 0) * (updated[index].unitPrice || 0);
      }
      return updated;
    });
  };

  const addMaterial = () => {
    setEditableMaterials(prev => [
      ...prev,
      { description: '', quantity: 1, unit: 'st', unitPrice: 0, totalCost: 0, supplier: '' },
    ]);
  };

  const removeMaterial = (index: number) => {
    setEditableMaterials(prev => prev.filter((_, i) => i !== index));
  };

  // Update prices when VAT toggle changes in edit mode
  useEffect(() => {
    if (isEditing && editableLineItems.length > 0) {
      setEditableLineItems(prev => prev.map(item => {
        if (!item.category || item.category === '__custom__' || item.category === 'OVRIGT') {
          return item;
        }
        const newUnitPrice = getHourlyRate(item.category, editData.includeVat);
        return {
          ...item,
          unitPrice: newUnitPrice,
          totalCost: (item.quantity || 0) * newUnitPrice,
        };
      }));
    }
  }, [editData.includeVat]);

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

  const handleRequestBillingInfo = async () => {
    if (!quote) return;
    setInvoiceLoading(true);
    try {
      await api.requestBillingInfo(quote.id);
      toast.success('Faktureringsförfrågan skickad till kunden!');
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Kunde inte skicka förfrågan');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!quote) return;
    setInvoiceLoading(true);
    try {
      const result = await api.createInvoiceFromQuote(quote.id);
      toast.success(`Faktura ${result.invoiceNumber} skapad i Fortnox!`);
      if (result.logId && confirm('Vill du skicka fakturan direkt?')) {
        try {
          await api.sendInvoice(result.logId);
          toast.success('Faktura skickad!');
        } catch {
          toast.error('Fakturan skapades men kunde inte skickas automatiskt. Skicka manuellt i Fortnox.');
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Kunde inte skapa faktura');
    } finally {
      setInvoiceLoading(false);
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

  // ===================== EDIT MODE =====================
  if (isEditing) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <button onClick={handleCancelEdit} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Redigera Offert #{quote.quoteNumber}
              </h1>
              <p className="mt-1 text-sm text-gray-500">Andra alla detaljer, arbeten och material</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCancelEdit}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <XMarkIcon className="h-5 w-5 mr-2" />
              Avbryt
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              {updateMutation.isPending ? 'Sparar...' : 'Spara andringar'}
            </button>
          </div>
        </div>

        {/* Client & Project Info */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Klient- & Projektinformation</h2>
          </div>
          <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Kundnamn</label>
                <input
                  type="text"
                  value={editData.clientName}
                  onChange={(e) => setEditData(prev => ({ ...prev, clientName: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={editData.clientEmail}
                  onChange={(e) => setEditData(prev => ({ ...prev, clientEmail: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefon</label>
                <input
                  type="tel"
                  value={editData.clientPhone}
                  onChange={(e) => setEditData(prev => ({ ...prev, clientPhone: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Adress</label>
                <input
                  type="text"
                  value={editData.clientAddress}
                  onChange={(e) => setEditData(prev => ({ ...prev, clientAddress: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Huvudkategori</label>
                <select
                  value={editData.mainCategory}
                  onChange={(e) => setEditData(prev => ({ ...prev, mainCategory: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Projekttyp</label>
                <input
                  type="text"
                  value={editData.projectType}
                  onChange={(e) => setEditData(prev => ({ ...prev, projectType: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Plats</label>
                <input
                  type="text"
                  value={editData.location}
                  onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Yta (kvm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editData.areaSqm}
                  onChange={(e) => setEditData(prev => ({ ...prev, areaSqm: Number(e.target.value) }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Beskrivning</label>
              <textarea
                rows={4}
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Arbetsbeskrivning..."
              />
            </div>

            {/* ROT & Moms toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <input
                    id="editApplyRot"
                    type="checkbox"
                    checked={editData.applyRotDeduction}
                    onChange={(e) => setEditData(prev => ({ ...prev, applyRotDeduction: e.target.checked }))}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-1"
                  />
                  <div className="ml-3">
                    <label htmlFor="editApplyRot" className="font-medium text-green-900 cursor-pointer">
                      ROT-avdrag (30%)
                    </label>
                    <p className="text-sm text-green-700 mt-1">
                      {editData.applyRotDeduction && liveTotals.rotDeduction > 0
                        ? `Avdrag: ${formatCurrency(liveTotals.rotDeduction)}`
                        : 'Ej aktiverat'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <input
                    id="editIncludeVat"
                    type="checkbox"
                    checked={editData.includeVat}
                    onChange={(e) => setEditData(prev => ({ ...prev, includeVat: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  />
                  <div className="ml-3">
                    <label htmlFor="editIncludeVat" className="font-medium text-blue-900 cursor-pointer">
                      Moms (25%)
                    </label>
                    <p className="text-sm text-blue-700 mt-1">
                      {editData.includeVat && liveTotals.vatAmount > 0
                        ? `Moms: ${formatCurrency(liveTotals.vatAmount)}`
                        : 'Ej inkluderad'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Arbetskostnad</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(liveTotals.totalLaborCost)}</p>
            <p className="mt-1 text-xs text-gray-500">{liveTotals.totalHours} timmar</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Materialkostnad</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(liveTotals.totalMaterialCost)}</p>
          </div>
          {editData.applyRotDeduction ? (
            <div className="bg-green-50 rounded-lg shadow p-4">
              <p className="text-sm text-green-600">ROT-avdrag (30%)</p>
              <p className="mt-1 text-2xl font-semibold text-green-900">{formatCurrency(liveTotals.rotDeduction)}</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">ROT-avdrag</p>
              <p className="mt-1 text-lg font-medium text-gray-400">Ej aktiverat</p>
            </div>
          )}
          <div className="bg-indigo-50 rounded-lg shadow p-4">
            <p className="text-sm text-indigo-600">
              Att betala{editData.includeVat ? ' (inkl. moms)' : ' (exkl. moms)'}{editData.applyRotDeduction ? ', efter ROT' : ''}
            </p>
            <p className="mt-1 text-2xl font-semibold text-indigo-900">{formatCurrency(liveTotals.totalAfterRot)}</p>
            {editData.includeVat && (
              <p className="mt-1 text-xs text-indigo-600">Moms: {formatCurrency(liveTotals.vatAmount)}</p>
            )}
          </div>
        </div>

        {/* Editable Line Items */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Arbetsuppdelning</h2>
            <button
              type="button"
              onClick={addLineItem}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Lagg till arbete
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beskrivning</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Antal</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Enhet</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pris/enhet</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kostnad</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {editableLineItems.map((item, index) => (
                  <tr key={index}>
                    <td className="px-3 py-3">
                      {item.category === '__custom__' ? (
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            value={item.customCategory || ''}
                            onChange={(e) => updateLineItem(index, 'customCategory', e.target.value)}
                            className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Skriv kategori..."
                          />
                          <button
                            type="button"
                            onClick={() => updateLineItem(index, 'category', 'SNICKERI')}
                            className="text-xs text-indigo-600 hover:text-indigo-800 text-left"
                          >
                            Valj fran lista
                          </button>
                        </div>
                      ) : (
                        <select
                          value={item.category || 'SNICKERI'}
                          onChange={(e) => updateLineItem(index, 'category', e.target.value)}
                          className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          {WORK_CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                          <option value="__custom__">Egen kategori...</option>
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <select
                          value={
                            !item.description ? '' :
                            (item.category !== '__custom__' && WORK_DESCRIPTIONS[item.category as WorkCategory]?.includes(item.description))
                              ? item.description
                              : '__custom__'
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__custom__') {
                              updateLineItem(index, 'description', ' ');
                            } else {
                              updateLineItem(index, 'description', val);
                            }
                          }}
                          className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Valj beskrivning...</option>
                          {item.category !== '__custom__' && (WORK_DESCRIPTIONS[item.category as WorkCategory] || []).map((desc) => (
                            <option key={desc} value={desc}>{desc}</option>
                          ))}
                          <option value="__custom__">Egen beskrivning...</option>
                        </select>
                        {(item.description && (item.category === '__custom__' || !WORK_DESCRIPTIONS[item.category as WorkCategory]?.includes(item.description))) && (
                          <input
                            type="text"
                            value={item.description.trim()}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value || ' ')}
                            className="mt-1 block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Skriv egen beskrivning..."
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        step="0.5"
                        value={item.quantity || 0}
                        onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                        className="block w-20 text-sm text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={item.unit || 'tim'}
                        onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                        className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {COMMON_UNITS.map((u) => (
                          <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={item.unitPrice || 0}
                        onChange={(e) => updateLineItem(index, 'unitPrice', Number(e.target.value))}
                        className="block w-24 text-sm text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                      {formatCurrency(item.totalCost || 0)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button type="button" onClick={() => removeLineItem(index)} className="text-red-600 hover:text-red-900">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {editableLineItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                      Inga arbetsrader. Klicka "Lagg till arbete" for att borja.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Editable Materials */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Material</h2>
            <button
              type="button"
              onClick={addMaterial}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Lagg till material
            </button>
          </div>
          {editableMaterials.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beskrivning</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Antal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Enhet</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pris/enhet</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kostnad</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {editableMaterials.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateMaterial(index, 'description', e.target.value)}
                          className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Materialnamn..."
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateMaterial(index, 'quantity', Number(e.target.value))}
                          className="block w-20 text-sm text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => updateMaterial(index, 'unit', e.target.value)}
                          className="block w-16 text-sm text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateMaterial(index, 'unitPrice', Number(e.target.value))}
                          className="block w-24 text-sm text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                        {formatCurrency(item.totalCost || 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => removeMaterial(index)} className="text-red-600 hover:text-red-900">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">Inga material tillagda</p>
              <p className="text-xs text-gray-400 mt-1">Klicka "Lagg till material" for att lagga till</p>
            </div>
          )}
        </div>

        {/* Save button bottom */}
        <div className="flex justify-end space-x-3 pb-8">
          <button
            onClick={handleCancelEdit}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Avbryt
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={updateMutation.isPending}
            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Sparar...' : 'Spara andringar'}
          </button>
        </div>
      </div>
    );
  }

  // ===================== VIEW MODE =====================
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/quotes')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
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
        <div className="flex items-center space-x-2 flex-wrap">
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
          {quote.status === 'ACCEPTED' && !(quote as any).billingInfoCollected && (
            <button
              onClick={handleRequestBillingInfo}
              disabled={invoiceLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
            >
              {invoiceLoading ? 'Skickar...' : 'Begär faktureringsuppgifter'}
            </button>
          )}
          {quote.status === 'ACCEPTED' && (quote as any).billingInfoCollected && (
            <button
              onClick={handleCreateInvoice}
              disabled={invoiceLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {invoiceLoading ? 'Skapar...' : 'Skapa faktura i Fortnox'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Klientinformation</h2>
            </div>
            <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
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

          {/* Billing Info Status */}
          {quote.status === 'ACCEPTED' && (
            <div className={`rounded-lg shadow border-l-4 ${(quote as any).billingInfoCollected ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'}`}>
              <div className="px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {(quote as any).billingInfoCollected ? 'Faktureringsuppgifter mottagna' : 'Väntar på faktureringsuppgifter'}
                    </h3>
                    {(quote as any).billingInfoCollected ? (
                      <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                        {(quote as any).clientPersonalNumber && <p>Personnr: {(quote as any).clientPersonalNumber}</p>}
                        {(quote as any).clientOrgNumber && <p>Org.nr: {(quote as any).clientOrgNumber}</p>}
                        {(quote as any).propertyAddress && <p>Fastighet: {(quote as any).propertyAddress}</p>}
                        {(quote as any).housingType && <p>Boende: {(quote as any).housingType === 'BRF' ? `BRF: ${(quote as any).brfName || ''}` : (quote as any).housingType}</p>}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">Kunden har inte fyllt i sina uppgifter ännu</p>
                    )}
                  </div>
                  {!(quote as any).billingInfoCollected && (
                    <button
                      onClick={handleRequestBillingInfo}
                      disabled={invoiceLoading}
                      className="text-sm px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
                    >
                      {invoiceLoading ? '...' : 'Skicka påminnelse'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Project Info */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Projektinformation</h2>
            </div>
            <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
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
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
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
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
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
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Kostnadssammanfattning</h2>
            </div>
            <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
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
              <h3 className="text-sm font-medium text-blue-900 mb-2">AI-sakerhet</h3>
              <p className="text-sm text-blue-700">
                {Math.round(quote.confidenceLevel * 100)}% sakerhet
              </p>
              {quote.basedOnQuoteIds && quote.basedOnQuoteIds.length > 0 && (
                <p className="mt-1 text-xs text-blue-600">
                  Baserat pa {quote.basedOnQuoteIds.length} liknande projekt
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
            <h3 className="text-sm font-medium text-gray-900 mb-3">Atgarder</h3>
            <button
              onClick={handleStartEdit}
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
                      placeholder="Lagg till ett personligt meddelande om du vill..."
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">Emailet innehaller redan halsning, offertinfo och signatur.</p>
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
    </div>
  );
};

export default QuoteDetail;
