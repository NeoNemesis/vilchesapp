import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface AppFeatures {
  quotes: boolean;
  timeReports: boolean;
  rotDeduction: boolean;
  rutDeduction: boolean;
  mapView: boolean;
  sms: boolean;
  emailMonitor: boolean;
  telegram: boolean;
  analytics: boolean;
  automations: boolean;
}

interface AppSettings {
  setupCompleted: boolean;
  companyName: string;
  orgNumber?: string;
  logo?: string;
  industry: string;
  primaryColor: string;
  accentColor: string;
  currency: string;
  vatRate: number;
  poweredBy: string;
  features: AppFeatures;
  customCategories?: string[];
  customPricing?: Record<string, number>;
}

interface AppSettingsContextType {
  settings: AppSettings | null;
  loading: boolean;
  needsSetup: boolean;
  isFeatureEnabled: (feature: keyof AppFeatures) => boolean;
  refreshSettings: () => Promise<void>;
}

const defaultFeatures: AppFeatures = {
  quotes: true,
  timeReports: true,
  rotDeduction: false,
  rutDeduction: false,
  mapView: false,
  sms: false,
  emailMonitor: false,
  telegram: false,
  analytics: false,
  automations: false,
};

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
};

export const AppSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/app-settings`);
      setSettings(res.data);
    } catch {
      // If API is down, use defaults
      setSettings({
        setupCompleted: false,
        companyName: 'VilchesApp',
        industry: 'general',
        primaryColor: '#2C7A4B',
        accentColor: '#F97316',
        currency: 'SEK',
        vatRate: 25,
        poweredBy: 'VilchesApp',
        features: defaultFeatures,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const isFeatureEnabled = (feature: keyof AppFeatures): boolean => {
    return settings?.features?.[feature] ?? false;
  };

  const needsSetup = !settings?.setupCompleted;

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        loading,
        needsSetup,
        isFeatureEnabled,
        refreshSettings: fetchSettings,
      }}
    >
      {!loading && children}
    </AppSettingsContext.Provider>
  );
};
