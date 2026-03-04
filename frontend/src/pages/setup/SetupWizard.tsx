import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  features: Record<string, boolean>;
  categories: string[];
}

const SetupWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [orgNumber, setOrgNumber] = useState('');
  const [industry, setIndustry] = useState('bygg');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  // Feature overrides
  const [features, setFeatures] = useState({
    enableQuotes: true,
    enableTimeReports: true,
    enableRotDeduction: false,
    enableRutDeduction: false,
    enableMapView: false,
    enableSms: false,
    enableEmailMonitor: false,
    enableTelegram: false,
    enableAnalytics: false,
    enableAutomations: false,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    // Update features when industry changes
    const template = templates.find(t => t.id === industry);
    if (template) {
      setFeatures(prev => ({
        ...prev,
        enableQuotes: template.features.enableQuotes,
        enableTimeReports: template.features.enableTimeReports,
        enableRotDeduction: template.features.enableRotDeduction,
        enableRutDeduction: template.features.enableRutDeduction,
        enableMapView: template.features.enableMapView,
      }));
    }
  }, [industry, templates]);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API_URL}/setup/templates`);
      setTemplates(res.data.templates);
    } catch {
      console.error('Failed to fetch templates');
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!companyName || !adminName || !adminEmail || !adminPassword) {
      setError('Fyll i alla obligatoriska fält');
      return;
    }

    if (adminPassword !== adminPasswordConfirm) {
      setError('Lösenorden matchar inte');
      return;
    }

    if (adminPassword.length < 8) {
      setError('Lösenordet måste vara minst 8 tecken');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/setup/initialize`, {
        companyName,
        orgNumber,
        industry,
        adminName,
        adminEmail,
        adminPassword,
        adminPhone,
        features,
      });

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Något gick fel vid installation');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Installation klar!</h2>
          <p className="text-gray-600 mb-4">
            <strong>{companyName}</strong> har konfigurerats. Du skickas nu till inloggningssidan...
          </p>
          <p className="text-sm text-gray-500">Logga in med: {adminEmail}</p>
          <div className="mt-6 text-xs text-gray-400">
            Powered by <a href="https://github.com/NeoNemesis/vilchesapp" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">VilchesApp</a>
          </div>
        </div>
      </div>
    );
  }

  const featureLabels: Record<string, string> = {
    enableQuotes: 'Offertsystem',
    enableTimeReports: 'Tidrapportering',
    enableRotDeduction: 'ROT-avdrag (30% skattereduktion)',
    enableRutDeduction: 'RUT-avdrag (50% skattereduktion)',
    enableMapView: 'Kartvy (projektplatser)',
    enableSms: 'SMS-notiser (kräver 46elks-konto)',
    enableEmailMonitor: 'E-postintegration (IMAP)',
    enableTelegram: 'Telegram-notiser',
    enableAnalytics: 'Google Analytics',
    enableAutomations: 'Automatiseringar (n8n)',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-emerald-600 rounded-t-2xl px-8 py-6 text-white">
          <h1 className="text-2xl font-bold">VilchesApp</h1>
          <p className="text-green-100 mt-1">Konfigurera ditt projekthanteringssystem</p>
          {/* Step indicator */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full ${
                  s <= step ? 'bg-white' : 'bg-green-900/30'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-green-200">
            <span>Företag</span>
            <span>Admin-konto</span>
            <span>Funktioner</span>
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Step 1: Company Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Ditt företag</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Företagsnamn *
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="t.ex. Byggbolaget AB"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organisationsnummer
                </label>
                <input
                  type="text"
                  value={orgNumber}
                  onChange={e => setOrgNumber(e.target.value)}
                  placeholder="t.ex. 559000-1234"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Bransch *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {templates.map(t => (
                    <label
                      key={t.id}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        industry === t.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="industry"
                        value={t.id}
                        checked={industry === t.id}
                        onChange={e => setIndustry(e.target.value)}
                        className="sr-only"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{t.name}</div>
                        <div className="text-sm text-gray-500">{t.description}</div>
                      </div>
                      {industry === t.id && (
                        <svg className="w-5 h-5 text-green-600 ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  if (!companyName) {
                    setError('Ange företagsnamn');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Nästa: Admin-konto
              </button>
            </div>
          )}

          {/* Step 2: Admin Account */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Skapa admin-konto</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Namn *</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  placeholder="Ditt fullständiga namn"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-post *</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  placeholder="admin@dittforetag.se"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={e => setAdminPhone(e.target.value)}
                  placeholder="070-123 45 67"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lösenord * (minst 8 tecken)</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="Minst 8 tecken"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bekräfta lösenord *</label>
                <input
                  type="password"
                  value={adminPasswordConfirm}
                  onChange={e => setAdminPasswordConfirm(e.target.value)}
                  placeholder="Upprepa lösenord"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Tillbaka
                </button>
                <button
                  onClick={() => {
                    if (!adminName || !adminEmail || !adminPassword) {
                      setError('Fyll i alla obligatoriska fält');
                      return;
                    }
                    if (adminPassword !== adminPasswordConfirm) {
                      setError('Lösenorden matchar inte');
                      return;
                    }
                    if (adminPassword.length < 8) {
                      setError('Lösenordet måste vara minst 8 tecken');
                      return;
                    }
                    setError('');
                    setStep(3);
                  }}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Nästa: Funktioner
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Features */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Välj funktioner</h2>
              <p className="text-sm text-gray-500">
                Du kan ändra detta senare i inställningarna.
              </p>

              <div className="space-y-3">
                {Object.entries(featureLabels).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={features[key as keyof typeof features]}
                      onChange={e =>
                        setFeatures(prev => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Tillbaka
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Installerar...
                    </span>
                  ) : (
                    'Slutför installation'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
            Powered by{' '}
            <a
              href="https://github.com/NeoNemesis/vilchesapp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              VilchesApp
            </a>{' '}
            — Created by Victor Vilches
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
