import React, { ReactNode } from 'react';
import { useAppSettings } from '../../contexts/AppSettingsContext';

type FeatureName =
  | 'quotes'
  | 'timeReports'
  | 'rotDeduction'
  | 'rutDeduction'
  | 'mapView'
  | 'sms'
  | 'emailMonitor'
  | 'telegram'
  | 'analytics'
  | 'automations';

interface FeatureGateProps {
  feature: FeatureName;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * FeatureGate — Conditionally render content based on enabled features.
 *
 * Usage:
 *   <FeatureGate feature="quotes">
 *     <QuotesPage />
 *   </FeatureGate>
 */
const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children, fallback = null }) => {
  const { isFeatureEnabled } = useAppSettings();

  if (!isFeatureEnabled(feature)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default FeatureGate;
