import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

type InvoiceType = 'STANDARD' | 'ROT' | 'RUT';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  orgNumber?: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

const UNIT_OPTIONS = [
  { value: 'st', label: 'st' },
  { value: 'tim', label: 'tim' },
  { value: 'kvm', label: 'kvm' },
  { value: 'meter', label: 'meter' },
];

const INVOICE_TYPE_OPTIONS: { value: InvoiceType; label: string }[] = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'ROT', label: 'ROT-avdrag' },
  { value: 'RUT', label: 'RUT-avdrag' },
];

const VAT_RATE = 0.25;

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' kr';
};

const generateTempId = (): string => {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

const createEmptyLineItem = (): LineItem => ({
  id: generateTempId(),
  description: '',
  quantity: 1,
  unit: 'st',
  unitPrice: 0,
});

const AdminInvoiceNew: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledCustomerId = searchParams.get('customerId');

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [dueDate, setDueDate] = useState(() => {
    const due = new Date();
    due.setDate(due.getDate() + 30);
    return due.toISOString().split('T')[0];
  });
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('STANDARD');
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLineItem()]);
  const [rotRutDeduction, setRotRutDeduction] = useState<number>(0);
  const [customerReference, setCustomerReference] = useState('');
  const [ourReference, setOurReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Hämta nästa fakturanummer
  const { data: nextNumberData } = useQuery({
    queryKey: ['invoices-next-number'],
    queryFn: () => api.get('/invoices/next-number'),
    retry: 1,
  });

  const nextInvoiceNumber = nextNumberData?.data?.nextNumber || nextNumberData?.nextNumber || '';

  // Sök kunder
  const { data: customersData } = useQuery({
    queryKey: ['customers-search', customerSearch],
    queryFn: () => api.get(`/customers?search=${encodeURIComponent(customerSearch)}`),
    enabled: customerSearch.length >= 2,
    retry: 1,
  });

  const customerResults: Customer[] = customersData?.data?.customers || customersData?.customers || [];

  // Hämta förvald kund via query param
  useEffect(() => {
    if (prefilledCustomerId && !selectedCustomer) {
      api.get(`/customers/${prefilledCustomerId}`)
        .then((data: any) => {
          const customer = data?.data?.customer || data?.customer || data;
          if (customer && customer.id) {
            setSelectedCustomer(customer);
            setCustomerSearch(customer.name || '');
          }
        })
        .catch((err: any) => {
          console.error('Kunde inte hämta kund:', err);
          toast.error('Kunde inte hämta kunduppgifter');
        });
    }
  }, [prefilledCustomerId, selectedCustomer]);

  // Beräkningar
  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [lineItems]);

  const vatAmount = useMemo(() => subtotal * VAT_RATE, [subtotal]);

  const totalBeforeDeduction = useMemo(() => subtotal + vatAmount, [subtotal, vatAmount]);

  const totalAmount = useMemo(() => {
    if (invoiceType !== 'STANDARD' && rotRutDeduction > 0) {
      return totalBeforeDeduction - rotRutDeduction;
    }
    return totalBeforeDeduction;
  }, [totalBeforeDeduction, invoiceType, rotRutDeduction]);

  // Line item handlers
  const handleAddLineItem = useCallback(() => {
    setLineItems((prev) => [...prev, createEmptyLineItem()]);
  }, []);

  const handleRemoveLineItem = useCallback((id: string) => {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const handleLineItemChange = useCallback(
    (id: string, field: keyof LineItem, value: string | number) => {
      setLineItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        )
      );
    },
    []
  );

  // Customer selection
  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  }, []);

  const handleCustomerSearchChange = useCallback((value: string) => {
    setCustomerSearch(value);
    setSelectedCustomer(null);
    setShowCustomerDropdown(value.length >= 2);
  }, []);

  // Build invoice payload
  const buildPayload = () => {
    if (!selectedCustomer) {
      toast.error('Välj en kund');
      return null;
    }

    const validItems = lineItems.filter(
      (item) => item.description.trim() && item.quantity > 0 && item.unitPrice > 0
    );

    if (validItems.length === 0) {
      toast.error('Lägg till minst en fakturarad med beskrivning, antal och pris');
      return null;
    }

    return {
      customerId: selectedCustomer.id,
      invoiceNumber: nextInvoiceNumber,
      invoiceDate,
      dueDate,
      invoiceType,
      lineItems: validItems.map(({ id, ...rest }) => rest),
      subtotal,
      vatAmount,
      rotRutDeduction: invoiceType !== 'STANDARD' ? rotRutDeduction : 0,
      totalAmount,
      customerReference: customerReference || undefined,
      ourReference: ourReference || undefined,
      notes: notes || undefined,
    };
  };

  // Spara utkast
  const handleSaveDraft = async () => {
    const payload = buildPayload();
    if (!payload) return;

    setIsSaving(true);
    try {
      const result = await api.post('/invoices', { ...payload, status: 'DRAFT' });
      const invoiceId = result?.data?.id || result?.id;
      toast.success('Fakturautkast sparat!');
      navigate(invoiceId ? `/admin/invoices/${invoiceId}` : '/admin/invoices');
    } catch (err: any) {
      console.error('Kunde inte spara faktura:', err);
      toast.error(err.response?.data?.message || 'Kunde inte spara faktura');
    } finally {
      setIsSaving(false);
    }
  };

  // Spara & skicka
  const handleSaveAndSend = async () => {
    const payload = buildPayload();
    if (!payload) return;

    setIsSending(true);
    try {
      const result = await api.post('/invoices', { ...payload, status: 'DRAFT' });
      const invoiceId = result?.data?.id || result?.id;

      if (invoiceId) {
        await api.post(`/invoices/${invoiceId}/send`);
        toast.success('Faktura skapad och skickad!');
        navigate(`/admin/invoices/${invoiceId}`);
      } else {
        toast.success('Faktura skapad! Kunde inte skicka automatiskt.');
        navigate('/admin/invoices');
      }
    } catch (err: any) {
      console.error('Kunde inte skapa/skicka faktura:', err);
      toast.error(err.response?.data?.message || 'Kunde inte skapa eller skicka faktura');
    } finally {
      setIsSending(false);
    }
  };

  const isSubmitting = isSaving || isSending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/invoices')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Tillbaka
          </button>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Ny faktura</h1>
            {nextInvoiceNumber && (
              <p className="mt-1 text-sm text-gray-500">
                Fakturanummer: <span className="font-medium">{nextInvoiceNumber}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form - left 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer selector */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Kund</h2>
            <div className="relative">
              <label htmlFor="customer-search" className="block text-sm font-medium text-gray-700">
                Sök kund
              </label>
              <input
                type="text"
                id="customer-search"
                placeholder="Sök på kundnamn eller e-post..."
                value={customerSearch}
                onChange={(e) => handleCustomerSearchChange(e.target.value)}
                onFocus={() => {
                  if (customerSearch.length >= 2 && !selectedCustomer) {
                    setShowCustomerDropdown(true);
                  }
                }}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />

              {/* Customer dropdown */}
              {showCustomerDropdown && customerResults.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  {customerResults.map((customer) => (
                    <li
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{customer.name}</span>
                        <span className="text-sm text-gray-500">{customer.email}</span>
                        {customer.phone && (
                          <span className="text-sm text-gray-400">{customer.phone}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {showCustomerDropdown && customerSearch.length >= 2 && customerResults.length === 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-2 px-3 text-sm text-gray-500 ring-1 ring-black ring-opacity-5">
                  Inga kunder hittades
                </div>
              )}
            </div>

            {/* Selected customer info */}
            {selectedCustomer && (
              <div className="mt-4 p-3 bg-indigo-50 rounded-md border border-indigo-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-indigo-900">{selectedCustomer.name}</p>
                    <p className="text-sm text-indigo-700">{selectedCustomer.email}</p>
                    {selectedCustomer.phone && (
                      <p className="text-sm text-indigo-600">{selectedCustomer.phone}</p>
                    )}
                    {selectedCustomer.address && (
                      <p className="text-sm text-indigo-600">{selectedCustomer.address}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerSearch('');
                    }}
                    className="text-indigo-400 hover:text-indigo-600"
                    title="Byt kund"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Invoice details */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Fakturadetaljer</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="invoice-date" className="block text-sm font-medium text-gray-700">
                  Fakturadatum
                </label>
                <input
                  type="date"
                  id="invoice-date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="due-date" className="block text-sm font-medium text-gray-700">
                  Förfallodatum
                </label>
                <input
                  type="date"
                  id="due-date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="invoice-type" className="block text-sm font-medium text-gray-700">
                  Fakturatyp
                </label>
                <select
                  id="invoice-type"
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  {INVOICE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Fakturarader</h2>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Lägg till rad
              </button>
            </div>

            <div className="space-y-3">
              {/* Header row - hidden on mobile */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider px-1">
                <div className="col-span-4">Beskrivning</div>
                <div className="col-span-2">Antal</div>
                <div className="col-span-2">Enhet</div>
                <div className="col-span-2">À-pris</div>
                <div className="col-span-1 text-right">Summa</div>
                <div className="col-span-1"></div>
              </div>

              {lineItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 bg-gray-50 rounded-md"
                >
                  {/* Description */}
                  <div className="sm:col-span-4">
                    <label className="sm:hidden block text-xs font-medium text-gray-500 mb-1">
                      Beskrivning
                    </label>
                    <input
                      type="text"
                      placeholder="Beskrivning"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(item.id, 'description', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="sm:col-span-2">
                    <label className="sm:hidden block text-xs font-medium text-gray-500 mb-1">
                      Antal
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Antal"
                      value={item.quantity}
                      onChange={(e) =>
                        handleLineItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)
                      }
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  {/* Unit */}
                  <div className="sm:col-span-2">
                    <label className="sm:hidden block text-xs font-medium text-gray-500 mb-1">
                      Enhet
                    </label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleLineItemChange(item.id, 'unit', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      {UNIT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unit price */}
                  <div className="sm:col-span-2">
                    <label className="sm:hidden block text-xs font-medium text-gray-500 mb-1">
                      À-pris (kr)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="À-pris"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleLineItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  {/* Row total */}
                  <div className="sm:col-span-1 flex items-center justify-end">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </span>
                  </div>

                  {/* Remove */}
                  <div className="sm:col-span-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(item.id)}
                      disabled={lineItems.length <= 1}
                      className={`p-1 rounded ${
                        lineItems.length <= 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                      }`}
                      title="Ta bort rad"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* References & Notes */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Referenser & anteckningar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="customer-ref" className="block text-sm font-medium text-gray-700">
                  Kundens referens
                </label>
                <input
                  type="text"
                  id="customer-ref"
                  placeholder="Kundens referens"
                  value={customerReference}
                  onChange={(e) => setCustomerReference(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="our-ref" className="block text-sm font-medium text-gray-700">
                  Vår referens
                </label>
                <input
                  type="text"
                  id="our-ref"
                  placeholder="Vår referens"
                  value={ourReference}
                  onChange={(e) => setOurReference(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Anteckningar
              </label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Valfria anteckningar som visas på fakturan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Right sidebar - summary */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 sticky top-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Sammanfattning</h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Nettosumma</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Moms (25%)</span>
                <span className="font-medium text-gray-900">{formatCurrency(vatAmount)}</span>
              </div>

              {invoiceType !== 'STANDARD' && (
                <>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Summa före avdrag</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(totalBeforeDeduction)}
                      </span>
                    </div>
                    <div>
                      <label
                        htmlFor="rot-rut-deduction"
                        className="block text-sm font-medium text-gray-700"
                      >
                        {invoiceType === 'ROT' ? 'ROT-avdrag' : 'RUT-avdrag'} (kr)
                      </label>
                      <input
                        type="number"
                        id="rot-rut-deduction"
                        min="0"
                        step="0.01"
                        value={rotRutDeduction}
                        onChange={(e) => setRotRutDeduction(parseFloat(e.target.value) || 0)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-gray-900">Att betala</span>
                  <span className="font-bold text-indigo-600">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                {isSaving ? 'Sparar...' : 'Spara utkast'}
              </button>
              <button
                type="button"
                onClick={handleSaveAndSend}
                disabled={isSubmitting}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                {isSending ? 'Skickar...' : 'Spara & skicka'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminInvoiceNew;
