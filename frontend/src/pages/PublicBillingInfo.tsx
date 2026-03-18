import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface FormData {
  clientName: string;
  quoteNumber: string;
  projectType: string;
  totalCost: number;
  isRot: boolean;
}

export default function PublicBillingInfo() {
  const { token } = useParams<{ token: string }>();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [clientType, setClientType] = useState<'PRIVATE' | 'COMPANY'>('PRIVATE');
  const [personalNumber, setPersonalNumber] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [address, setAddress] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [housingType, setHousingType] = useState('');
  const [brfName, setBrfName] = useState('');
  const [brfOrgNumber, setBrfOrgNumber] = useState('');

  useEffect(() => {
    loadForm();
  }, [token]);

  async function loadForm() {
    try {
      const res = await fetch(`/api/invoices/billing-info/${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Kunde inte ladda formuläret');
        return;
      }
      setFormData(data);
    } catch {
      setError('Kunde inte ansluta till servern');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/invoices/billing-info/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientType,
          personalNumber: clientType === 'PRIVATE' ? personalNumber : undefined,
          orgNumber: clientType === 'COMPANY' ? orgNumber : undefined,
          address,
          propertyAddress: formData?.isRot ? propertyAddress : undefined,
          housingType: formData?.isRot ? housingType : undefined,
          brfName: formData?.isRot && housingType === 'BRF' ? brfName : undefined,
          brfOrgNumber: formData?.isRot && housingType === 'BRF' ? brfOrgNumber : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Något gick fel');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Kunde inte skicka uppgifterna');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Tack!</h1>
          <p className="text-gray-600">Dina faktureringsuppgifter har sparats. Vi återkommer med fakturan.</p>
        </div>
      </div>
    );
  }

  if (error && !formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ogiltig länk</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const formatSEK = (n: number) => Math.round(n).toLocaleString('sv-SE') + ' kr';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-t-xl p-6 text-center text-white">
          <h1 className="text-2xl font-bold">Faktureringsuppgifter</h1>
          <p className="text-green-200 mt-1">Vilches Entreprenad AB</p>
        </div>

        <div className="bg-white rounded-b-xl shadow-lg p-6">
          {/* Quote info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Offert <strong>{formData?.quoteNumber}</strong></p>
            <p className="text-sm text-gray-600">{formData?.projectType}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatSEK(formData?.totalCost || 0)}</p>
            {formData?.isRot && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
                ROT-avdrag
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Client type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Jag är</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setClientType('PRIVATE')}
                  className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition ${
                    clientType === 'PRIVATE'
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Privatperson
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('COMPANY')}
                  className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition ${
                    clientType === 'COMPANY'
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Företag
                </button>
              </div>
            </div>

            {/* Personal number or org number */}
            {clientType === 'PRIVATE' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Personnummer *</label>
                <input
                  type="text"
                  value={personalNumber}
                  onChange={(e) => setPersonalNumber(e.target.value)}
                  placeholder="YYYYMMDD-XXXX"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData?.isRot ? 'Krävs för ROT-avdrag hos Skatteverket' : 'Krävs för fakturering'}
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organisationsnummer *</label>
                <input
                  type="text"
                  value={orgNumber}
                  onChange={(e) => setOrgNumber(e.target.value)}
                  placeholder="XXXXXX-XXXX"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
            )}

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Faktureringsadress</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Gatuadress, Postnummer Ort"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* ROT-specific fields */}
            {formData?.isRot && (
              <>
                <div className="border-t pt-5 mt-5">
                  <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center text-xs">R</span>
                    ROT-uppgifter
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fastighetsadress (där arbetet utförs) *
                  </label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="Gatuadress, Postnummer Ort"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Boendeform *</label>
                  <div className="flex gap-2">
                    {[
                      { value: 'VILLA', label: 'Villa/Radhus' },
                      { value: 'BRF', label: 'Bostadsrätt' },
                      { value: 'OTHER', label: 'Annat' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setHousingType(opt.value)}
                        className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition ${
                          housingType === opt.value
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {housingType === 'BRF' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">BRF-namn *</label>
                      <input
                        type="text"
                        value={brfName}
                        onChange={(e) => setBrfName(e.target.value)}
                        placeholder="Brf Solbacken"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">BRF organisationsnummer *</label>
                      <input
                        type="text"
                        value={brfOrgNumber}
                        onChange={(e) => setBrfOrgNumber(e.target.value)}
                        placeholder="XXXXXX-XXXX"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Finns i BRF:ens årsredovisning eller på bolagsverket.se</p>
                    </div>
                  </>
                )}
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Skickar...' : 'Skicka uppgifter'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Dina uppgifter hanteras enligt GDPR och används enbart för fakturering.
          </p>
        </div>
      </div>
    </div>
  );
}
