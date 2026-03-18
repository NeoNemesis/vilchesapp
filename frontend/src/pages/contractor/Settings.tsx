import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import {
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  SwatchIcon,
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

const ContractorSettings: React.FC = () => {
  const { user: authUser, updateUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'email' | 'password' | 'appearance'>('profile');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profileForm, setProfileForm] = useState({ name: '', phone: '', company: '' });
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => { loadUserProfile(); }, []);

  const loadUserProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      let responseData = response.data || response;
      if (responseData && responseData.success) {
        const userData = responseData.user;
        setUser(userData);
        setProfileForm({ name: userData.name || '', phone: userData.phone || '', company: userData.company || '' });
        setEmailForm({ newEmail: userData.email || '', currentPassword: '' });
      }
    } catch (error) {
      showMessage('error', 'Kunde inte ladda profilinformation');
    } finally {
      setLoading(false);
    }
  };

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
    { id: 'appearance', name: 'Utseende', icon: SwatchIcon },
  ];

  const inputClass = "mt-1 block w-full border border-gray-300 rounded-lg shadow-sm px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const btnPrimary = "w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 text-sm font-medium transition-colors";

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-3 py-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Mina inställningar</h1>

          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <div className="flex items-center">
                {message.type === 'success' ? <CheckCircleIcon className="h-5 w-5 flex-shrink-0" /> : <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />}
                <p className="ml-2 font-medium">{message.text}</p>
              </div>
            </div>
          )}

          {/* Tabs - horisontell scroll på mobil */}
          <div className="border-b border-gray-200 -mx-3 px-3 sm:mx-0 sm:px-0">
            <nav className="-mb-px flex overflow-x-auto scrollbar-hide gap-1 sm:gap-0 sm:space-x-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center whitespace-nowrap py-2.5 px-3 sm:px-1 border-b-2 font-medium text-sm transition-colors flex-shrink-0 ${
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

            {activeTab === 'appearance' && <ThemeSelector />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractorSettings;
