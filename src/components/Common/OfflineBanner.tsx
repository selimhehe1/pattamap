import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOnline } from '../../hooks/useOnline';
import { WifiOff } from 'lucide-react';
import '../../styles/components/offline-banner.css';

/**
 * OfflineBanner - Displays a notification when the user loses internet connection
 *
 * Features:
 * - Automatically appears when offline, hides when online
 * - Smooth slide-down animation
 * - Retry button to manually check connection
 * - Internationalized messages
 *
 * @example
 * ```tsx
 * // Add to App.tsx or Layout component
 * <OfflineBanner />
 * ```
 */
const OfflineBanner: React.FC = () => {
  const { t } = useTranslation();
  const { isOffline, checkConnection } = useOnline();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className="offline-banner"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="offline-banner-content">
        <WifiOff size={20} className="offline-banner-icon" aria-hidden="true" />
        <span className="offline-banner-text">
          {t('common.offlineMessage', 'You are currently offline. Some features may be unavailable.')}
        </span>
        <button
          className="offline-banner-retry"
          onClick={() => checkConnection()}
          aria-label={t('common.retryConnection', 'Retry connection')}
        >
          {t('common.retry', 'Retry')}
        </button>
      </div>
    </div>
  );
};

export default OfflineBanner;
