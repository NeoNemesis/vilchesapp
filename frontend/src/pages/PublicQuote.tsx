import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const PublicQuote: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchQuote();
  }, [id]);

  const fetchQuote = async () => {
    try {
      const response = await fetch(`${API_URL}/quotes/public/${id}`);
      if (!response.ok) {
        throw new Error('Kunde inte hämta offerten');
      }
      const result = await response.json();
      if (result.success && result.data) {
        setQuote(result.data);
      } else {
        throw new Error(result.message || 'Kunde inte hämta offerten');
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
      toast.error('Kunde inte hämta offerten');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/quotes/public/${id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.data?.projectCreated && data.data?.projectNumber) {
          toast.success(`Tack! Projekt ${data.data.projectNumber} har skapats från din offert.`);
        } else {
          toast.success(data.message);
        }
        setShowAcceptDialog(false);
        fetchQuote(); // Refresh quote data
      } else {
        toast.error(data.error || 'Kunde inte acceptera offerten');
      }
    } catch (error) {
      console.error('Error accepting quote:', error);
      toast.error('Kunde inte acceptera offerten');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`${API_URL}/quotes/public/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setShowRejectDialog(false);
        fetchQuote(); // Refresh quote data
      } else {
        toast.error(data.error || 'Kunde inte avvisa offerten');
      }
    } catch (error) {
      console.error('Error rejecting quote:', error);
      toast.error('Kunde inte avvisa offerten');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Offert hittades inte</h1>
          <p className="mt-2 text-gray-600">Kontrollera länken och försök igen.</p>
        </div>
      </div>
    );
  }

  const isAlreadyResponded = quote.status === 'ACCEPTED' || quote.status === 'REJECTED';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2C5F2D] text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold">VilchesApp</h1>
          <p className="mt-2 text-green-100">Din offert är klar!</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Message */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Bäste kund</h2>
          <p className="text-gray-700 mb-3">Tack för Er förfrågan!</p>
          <p className="text-gray-700 mb-3">
            Vi har nöjet att offerera Er följande erbjudande enligt detaljerad information nedan.
          </p>
          <p className="text-gray-700 font-medium">Vi ser fram emot att samarbeta med Er!</p>
        </div>

        {/* Quote Details */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{quote.projectType}</h3>
              <p className="text-sm text-gray-500 mt-1">Offert #{quote.quoteNumber}</p>
            </div>
            {quote.status === 'ACCEPTED' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                Accepterad
              </span>
            )}
            {quote.status === 'REJECTED' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                <XCircleIcon className="h-4 w-4 mr-1" />
                Avvisad
              </span>
            )}
          </div>

          {/* Price Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Arbetskostnad</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                {formatCurrency(quote.estimatedLaborCost || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {quote.estimatedTotalHours || 0} timmar
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Materialkostnad</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                {formatCurrency(quote.estimatedMaterialCost || 0)}
              </p>
            </div>
            {quote.applyRotDeduction ? (
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600">ROT-avdrag (30%)</p>
                <p className="text-xl font-semibold text-green-900 mt-1">
                  {formatCurrency(quote.rotDeduction || 0)}
                </p>
              </div>
            ) : null}
          </div>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-900">
                {quote.applyRotDeduction ? 'Att betala (efter ROT-avdrag)' : 'Att betala'}
              </span>
              <span className="text-3xl font-bold text-[#2C5F2D]">
                {formatCurrency(quote.totalAfterRot || 0)}
              </span>
            </div>
          </div>

          {/* Line Items */}
          {quote.lineItems && quote.lineItems.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Arbetsmoment</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Beskrivning
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Timmar
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Kostnad
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quote.lineItems.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {item.estimatedHours}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(item.totalCost || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Materials */}
          {quote.materials && quote.materials.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Material</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Beskrivning
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Antal
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Kostnad
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quote.materials.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                          {formatCurrency(item.totalCost || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Attachments Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bilagor</h3>
          <div className="flex items-center space-x-3">
            <DocumentArrowDownIcon className="h-6 w-6 text-gray-400" />
            <a
              href={`${API_URL}/quotes/${quote.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2C5F2D] hover:underline font-medium"
            >
              Offert_{quote.quoteNumber}.pdf
            </a>
          </div>
        </div>

        {/* Accept/Reject Section */}
        {!isAlreadyResponded && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Accepterar du nedanstående erbjudande?
            </h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setShowAcceptDialog(true)}
                className="flex-1 inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#2C5F2D] hover:bg-[#3d7a47] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Ja, jag accepterar nedanstående
              </button>
              <button
                onClick={() => setShowRejectDialog(true)}
                className="flex-1 inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <XCircleIcon className="h-5 w-5 mr-2" />
                Nej, tyvärr, jag accepterar inte
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600">
          <p className="text-sm">
            VilchesApp AB | Kvarnängsgatan 24, Uppsala
          </p>
          <p className="text-sm mt-2">
            Kontakta oss: {quote.createdBy?.phone || ''} | {quote.createdBy?.email || 'support@vilchesapp.com'}
          </p>
        </div>
      </div>

      {/* Accept Confirmation Dialog */}
      {showAcceptDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Bekräfta acceptans
            </h3>
            <p className="text-gray-700 mb-6">
              Är du säker på att du vill acceptera denna offert? Vi kommer att kontakta dig inom kort för att boka starttid.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAcceptDialog(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleAccept}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#2C5F2D] hover:bg-[#3d7a47] disabled:opacity-50"
              >
                {processing ? 'Bearbetar...' : 'Ja, acceptera'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Bekräfta avvisning
            </h3>
            <p className="text-gray-700 mb-6">
              Är du säker på att du vill avvisa denna offert? Vi uppskattar att du ger oss feedback.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectDialog(false)}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? 'Bearbetar...' : 'Ja, avvisa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicQuote;
