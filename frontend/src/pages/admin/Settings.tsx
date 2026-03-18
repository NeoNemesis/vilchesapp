import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import {
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CalculatorIcon,
  SwatchIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import ThemeSelector from '../../components/settings/ThemeSelector';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  role: string;
  createdAt: string;
}

const Settings: React.FC = () => {
  const { user: authUser, updateUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'email' | 'password' | 'accountant' | 'fortnox' | 'appearance'>('profile');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Accountant form
  const [accountantForm, setAccountantForm] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
  });
  const [accountantLoading, setAccountantLoading] = useState(false);

  // Fortnox state
  const [fortnoxStatus, setFortnoxStatus] = useState<{
    enabled: boolean;
    isConnected: boolean;
    companyName: string | null;
    hasCredentials: boolean;
  }>({ enabled: false, isConnected: false, companyName: null, hasCredentials: false });
  const [fortnoxCredentials, setFortnoxCredentials] = useState({ clientId: '', clientSecret: '' });
  const [fortnoxLoading, setFortnoxLoading] = useState(false);
  const [fortnoxLogs, setFortnoxLogs] = useState<any[]>([]);

  // Profile form
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', company: '' });
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadAccountantSettings();
    loadFortnoxSettings();
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      let responseData = response.data || response;
      if (responseData && responseData.success) {
        const userData = responseData.user;
        setUser(userData);
        setProfileForm({ name: userData.name || '', phone: userData.phone || '', company: userData.company || '' });
        setEmailForm({ newEmail: userData.email || '', currentPassword: '' });
      } else {
        showMessage('error', 'Ogiltig autentisering - omdirigerar till login');
        setTimeout(() => window.location.href = '/login', 2000);
      }
    } catch (error) {
      showMessage('error', 'Kunde inte ladda profilinformation - kontrollera inloggning');
      setTimeout(() => window.location.href = '/login', 2000);
    } finally {
      setLoading(false);
    }
  };

  const loadAccountantSettings = async () => {
    try {
      const data = await api.getAccountantSettings();
      if (data) {
        setAccountantForm({ name: data.name || '', email: data.email || '', company: data.company || '', phone: data.phone || '' });
      }
    } catch (error) { /* Settings may not exist yet */ }
  };

  const handleAccountantSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountantLoading(true);
    try {
      await api.saveAccountantSettings(accountantForm);
      showMessage('success', 'Revisorsinställningar sparade');
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Kunde inte spara');
    } finally {
      setAccountantLoading(false);
    }
  };

  const handleAccountantTestEmail = async () => {
    setAccountantLoading(true);
    try {
      const data = await api.sendAccountantTestEmail();
      showMessage('success', data.message);
    } catch (error: any) {
      showMessage('error', error.response?.data?.message || 'Kunde inte skicka testmail');
    } finally {
      setAccountantLoading(false);
    }
  };

  const loadFortnoxSettings = async () => {
    try {
      const data = await api.getFortnoxSettings();
      setFortnoxStatus(data);
      if (data.isConnected) loadFortnoxLogs();
    } catch (error) { /* Fortnox settings may not exist yet */ }
  };

  const loadFortnoxLogs = async () => {
    try { const logs = await api.getFortnoxSalaryLogs(20); setFortnoxLogs(logs); } catch (error) { /* Non-critical */ }
  };

  const handleFortnoxSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setFortnoxLoading(true);
    try {
      await api.saveFortnoxCredentials(fortnoxCredentials);
      showMessage('success', 'Fortnox-uppgifter sparade');
      loadFortnoxSettings();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || 'Kunde inte spara');
    } finally { setFortnoxLoading(false); }
  };

  const handleFortnoxConnect = async () => {
    setFortnoxLoading(true);
    try { const data = await api.getFortnoxAuthUrl(); window.location.href = data.url; }
    catch (error: any) { showMessage('error', error.response?.data?.error || 'Kunde inte generera auktoriserings-URL'); setFortnoxLoading(false); }
  };

  const handleFortnoxDisconnect = async () => {
    if (!confirm('Vill du koppla fran Fortnox?')) return;
    setFortnoxLoading(true);
    try { await api.disconnectFortnox(); showMessage('success', 'Fortnox frakopplad'); loadFortnoxSettings(); }
    catch (error: any) { showMessage('error', error.response?.data?.error || 'Kunde inte koppla fran'); }
    finally { setFortnoxLoading(false); }
  };

  const handleFortnoxTest = async () => {
    setFortnoxLoading(true);
    try { const data = await api.testFortnoxConnection(); showMessage('success', data.message); }
    catch (error: any) { showMessage('error', error.response?.data?.error || 'Anslutningstest misslyckades'); }
    finally { setFortnoxLoading(false); }
  };

  const handleFortnoxSyncEmployees = async () => {
    setFortnoxLoading(true);
    try { const data = await api.syncFortnoxEmployees(); showMessage('success', data.message); }
    catch (error: any) { showMessage('error', error.response?.data?.error || 'Synkning misslyckades'); }
    finally { setFortnoxLoading(false); }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fortnoxResult = params.get('fortnox');
    if (fortnoxResult === 'success') {
      showMessage('success', 'Fortnox ansluten!');
      setActiveTab('fortnox');
      loadFortnoxSettings();
      window.history.replaceState({}, '', window.location.pathname);
    } else if (fortnoxResult === 'error') {
      showMessage('error', `Fortnox: ${params.get('message') || 'Anslutning misslyckades'}`);
      setActiveTab('fortnox');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const response = await api.put('/auth/profile', profileForm);
      if (response.data.success) { setUser(response.data.user); updateUser(response.data.user); showMessage('success', 'Profil uppdaterad'); }
    } catch (error: any) { showMessage('error', error.response?.data?.message || 'Kunde inte uppdatera profil'); }
    finally { setFormLoading(false); }
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const response = await api.put('/auth/email', emailForm);
      if (response.data.success) { setUser(response.data.user); updateUser(response.data.user); setEmailForm({ ...emailForm, currentPassword: '' }); showMessage('success', 'Email uppdaterad'); }
    } catch (error: any) { showMessage('error', error.response?.data?.message || 'Kunde inte uppdatera email'); }
    finally { setFormLoading(false); }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { showMessage('error', 'Lösenorden matchar inte'); return; }
    setFormLoading(true);
    try {
      const response = await api.put('/auth/password', passwordForm);
      if (response.data.success) { setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); showMessage('success', 'Lösenord uppdaterat'); }
    } catch (error: any) { showMessage('error', error.response?.data?.message || 'Kunde inte uppdatera lösenord'); }
    finally { setFormLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', name: 'Profil', icon: UserIcon },
    { id: 'email', name: 'Email', icon: EnvelopeIcon },
    { id: 'password', name: 'Lösenord', icon: KeyIcon },
    { id: 'accountant', name: 'Revisor', icon: CalculatorIcon },
    { id: 'fortnox', name: 'Fortnox', icon: CogIcon },
    { id: 'appearance', name: 'Utseende', icon: SwatchIcon },
  ];

  const inputClass = "mt-1 block w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const btnPrimary = "w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 text-sm font-medium transition-colors";
  const btnSecondary = "w-full sm:w-auto bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 text-sm font-medium transition-colors";

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-3 py-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Inställningar</h1>

          {/* Message */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <div className="flex items-center">
                {message.type === 'success' ? <CheckCircleIcon className="h-5 w-5 flex-shrink-0" /> : <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />}
                <p className="ml-2 font-medium">{message.text}</p>
              </div>
            </div>
          )}

          {/* Tabs - scrollbar på mobil, wrappade på surfplatta */}
          <div className="border-b border-gray-200 -mx-3 px-3 sm:mx-0 sm:px-0">
            <nav className="-mb-px flex overflow-x-auto scrollbar-hide gap-1 sm:gap-0 sm:space-x-3 md:space-x-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center whitespace-nowrap py-2.5 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5 sm:mr-1.5" />
                  <span className="hidden sm:inline">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-5 sm:mt-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileUpdate}>
                <div className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                    <input type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefonnummer</label>
                    <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className={inputClass} placeholder="+46 70 123 45 67" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Företag</label>
                    <input type="text" value={profileForm.company} onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })} className={inputClass} />
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={formLoading} className={btnPrimary}>
                      {formLoading ? 'Sparar...' : 'Spara ändringar'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Email Tab */}
            {activeTab === 'email' && (
              <form onSubmit={handleEmailUpdate}>
                <div className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nuvarande email</label>
                    <input type="email" value={user?.email || ''} disabled className={`${inputClass} bg-gray-50`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ny email-adress</label>
                    <input type="email" required value={emailForm.newEmail} onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bekräfta med nuvarande lösenord</label>
                    <input type="password" required value={emailForm.currentPassword} onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })} className={inputClass} />
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={formLoading} className={btnPrimary}>
                      {formLoading ? 'Uppdaterar...' : 'Uppdatera email'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordUpdate}>
                <div className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nuvarande lösenord</label>
                    <input type="password" required value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nytt lösenord</label>
                    <input type="password" required value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className={inputClass} />
                    <p className="mt-1.5 text-xs text-gray-500">Minst 8 tecken med stor bokstav, liten bokstav, siffra och specialtecken</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bekräfta nytt lösenord</label>
                    <input type="password" required value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className={inputClass} />
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={formLoading} className={btnPrimary}>
                      {formLoading ? 'Uppdaterar...' : 'Uppdatera lösenord'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Accountant Tab */}
            {activeTab === 'accountant' && (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Konfigurera din revisors kontaktuppgifter. Godkända tidsrapporter kan skickas direkt till denna e-postadress.
                </p>
                <form onSubmit={handleAccountantSave}>
                  <div className="space-y-4 sm:space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Namn *</label>
                      <input type="text" required value={accountantForm.name} onChange={(e) => setAccountantForm({ ...accountantForm, name: e.target.value })} className={inputClass} placeholder="Revisorns namn" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">E-post *</label>
                      <input type="email" required value={accountantForm.email} onChange={(e) => setAccountantForm({ ...accountantForm, email: e.target.value })} className={inputClass} placeholder="revisor@exempel.se" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Företag</label>
                      <input type="text" value={accountantForm.company} onChange={(e) => setAccountantForm({ ...accountantForm, company: e.target.value })} className={inputClass} placeholder="Revisionsbyrå AB" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                      <input type="tel" value={accountantForm.phone} onChange={(e) => setAccountantForm({ ...accountantForm, phone: e.target.value })} className={inputClass} placeholder="070-123 45 67" />
                    </div>
                    <div className="pt-2 flex flex-col sm:flex-row gap-2">
                      <button type="submit" disabled={accountantLoading} className={btnPrimary}>
                        {accountantLoading ? 'Sparar...' : 'Spara'}
                      </button>
                      <button type="button" onClick={handleAccountantTestEmail} disabled={accountantLoading || !accountantForm.email} className={btnSecondary}>
                        {accountantLoading ? 'Skickar...' : 'Skicka testmail'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Fortnox Tab */}
            {activeTab === 'fortnox' && (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Koppla Fortnox för automatisk lönebearbetning när tidsrapporter skickas till revisor.
                </p>

                {/* Connection Status */}
                <div className={`mb-5 p-3 sm:p-4 rounded-lg border ${fortnoxStatus.isConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${fortnoxStatus.isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{fortnoxStatus.isConnected ? 'Ansluten till Fortnox' : 'Ej ansluten'}</p>
                      {fortnoxStatus.companyName && <p className="text-xs text-gray-600">{fortnoxStatus.companyName}</p>}
                    </div>
                  </div>
                </div>

                {/* Credentials Form */}
                {!fortnoxStatus.isConnected && (
                  <form onSubmit={handleFortnoxSaveCredentials} className="mb-5">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                        <input type="text" value={fortnoxCredentials.clientId} onChange={(e) => setFortnoxCredentials({ ...fortnoxCredentials, clientId: e.target.value })} className={inputClass} placeholder="Fortnox Client ID" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
                        <input type="password" value={fortnoxCredentials.clientSecret} onChange={(e) => setFortnoxCredentials({ ...fortnoxCredentials, clientSecret: e.target.value })} className={inputClass} placeholder="Fortnox Client Secret" />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button type="submit" disabled={fortnoxLoading || !fortnoxCredentials.clientId || !fortnoxCredentials.clientSecret} className={btnPrimary}>
                          {fortnoxLoading ? 'Sparar...' : 'Spara uppgifter'}
                        </button>
                        {fortnoxStatus.hasCredentials && (
                          <button type="button" onClick={handleFortnoxConnect} disabled={fortnoxLoading} className="w-full sm:w-auto bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 active:bg-green-800 disabled:opacity-50 text-sm font-medium transition-colors">
                            {fortnoxLoading ? 'Ansluter...' : 'Anslut till Fortnox'}
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                )}

                {/* Connected Actions */}
                {fortnoxStatus.isConnected && (
                  <div className="mb-5 flex flex-col sm:flex-row flex-wrap gap-2">
                    <button onClick={handleFortnoxTest} disabled={fortnoxLoading} className={btnPrimary}>
                      {fortnoxLoading ? 'Testar...' : 'Testa anslutning'}
                    </button>
                    <button onClick={handleFortnoxSyncEmployees} disabled={fortnoxLoading} className="w-full sm:w-auto bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 text-sm font-medium transition-colors">
                      {fortnoxLoading ? 'Synkar...' : 'Synka anställda'}
                    </button>
                    <button onClick={handleFortnoxDisconnect} disabled={fortnoxLoading} className="w-full sm:w-auto bg-red-50 text-red-700 border border-red-200 px-5 py-2.5 rounded-lg hover:bg-red-100 active:bg-red-200 disabled:opacity-50 text-sm font-medium transition-colors">
                      Koppla från
                    </button>
                  </div>
                )}

                {/* Salary Logs */}
                {fortnoxStatus.isConnected && fortnoxLogs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Lönebearbetningslogg (senaste 20)</h3>
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Anställd</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vecka</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Brutto</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Netto</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Datum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {fortnoxLogs.map((log: any) => (
                            <tr key={log.id}>
                              <td className="px-3 py-2 whitespace-nowrap">{log.user?.name}</td>
                              <td className="px-3 py-2 whitespace-nowrap">v{log.timeReport?.weekNumber}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-right">{log.grossPay?.toLocaleString('sv-SE')} kr</td>
                              <td className="px-3 py-2 whitespace-nowrap text-right font-medium text-green-700 hidden sm:table-cell">{log.netPay?.toLocaleString('sv-SE')} kr</td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                                  log.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  log.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                  log.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {log.status === 'COMPLETED' ? 'Klar' : log.status === 'FAILED' ? 'Fel' : log.status === 'PROCESSING' ? 'Bearbetar' : 'Väntar'}
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-gray-500 hidden sm:table-cell">
                                {new Date(log.createdAt).toLocaleDateString('sv-SE')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && <ThemeSelector />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
