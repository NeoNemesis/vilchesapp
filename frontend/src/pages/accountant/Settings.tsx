import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const AccountantSettings: React.FC = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordMutation = useMutation({
    mutationFn: async () => {
      const response = await (api as any).client.put('/auth/password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Lösenord uppdaterat!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Kunde inte uppdatera lösenord');
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Lösenorden matchar inte');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Lösenordet måste vara minst 8 tecken');
      return;
    }
    passwordMutation.mutate();
  };

  const inputClass = "w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

  return (
    <div className="px-2 sm:px-0">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inställningar</h1>
        <p className="text-sm text-gray-500 mt-1">Hantera ditt konto</p>
      </div>

      <div className="max-w-2xl space-y-4 sm:space-y-6">
        {/* Profile info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Kontoinformation</h2>
          <dl className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
              <dt className="text-sm text-gray-500">Namn</dt>
              <dd className="text-sm font-medium text-gray-900">{user?.name}</dd>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
              <dt className="text-sm text-gray-500">E-post</dt>
              <dd className="text-sm font-medium text-gray-900 break-all">{user?.email}</dd>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
              <dt className="text-sm text-gray-500">Telefon</dt>
              <dd className="text-sm font-medium text-gray-900">{user?.phone || '-'}</dd>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
              <dt className="text-sm text-gray-500">Roll</dt>
              <dd className="text-sm font-medium text-emerald-700">Revisor</dd>
            </div>
          </dl>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Byt lösenord</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nuvarande lösenord</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nytt lösenord</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-gray-500">Minst 8 tecken</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bekräfta nytt lösenord</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              {passwordMutation.isPending ? 'Sparar...' : 'Uppdatera lösenord'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountantSettings;
