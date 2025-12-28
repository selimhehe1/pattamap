/**
 * SyncIndicator Component
 *
 * Displays the offline sync queue status in the navigation bar.
 * Shows a badge with pending actions count and sync animation.
 *
 * @component
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useOnline } from '../../hooks/useOnline';
import '../../styles/components/SyncIndicator.css';

interface SyncIndicatorProps {
  /** Whether to show the indicator even when queue is empty */
  showWhenEmpty?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
}

const SyncIndicator: React.FC<SyncIndicatorProps> = ({
  showWhenEmpty = false,
  compact = false,
}) => {
  const { t } = useTranslation();
  const { queueCount, isSyncing, syncQueue, lastSyncResult, lastSyncTime, isSupported } = useOfflineQueue();
  const { isOnline } = useOnline();
  const [showTooltip, setShowTooltip] = useState(false);

  // Format relative time for last sync
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffSec < 60) return t('sync.justNow', 'just now');
    if (diffMin < 60) return t('sync.minutesAgo', '{{count}}m ago', { count: diffMin });
    if (diffHr < 24) return t('sync.hoursAgo', '{{count}}h ago', { count: diffHr });
    return date.toLocaleDateString();
  };

  // Don't render if not supported or nothing to show
  if (!isSupported || (!showWhenEmpty && queueCount === 0 && !isSyncing)) {
    return null;
  }

  const handleClick = async () => {
    if (isOnline && queueCount > 0 && !isSyncing) {
      await syncQueue();
    }
  };

  const getStatusIcon = () => {
    if (isSyncing) {
      return <RefreshCw className="sync-indicator-icon spinning" size={compact ? 16 : 20} />;
    }

    if (!isOnline) {
      return <CloudOff className="sync-indicator-icon offline" size={compact ? 16 : 20} />;
    }

    if (lastSyncResult && lastSyncResult.failed > 0) {
      return <AlertCircle className="sync-indicator-icon error" size={compact ? 16 : 20} />;
    }

    if (queueCount === 0) {
      return <Check className="sync-indicator-icon success" size={compact ? 16 : 20} />;
    }

    return <Cloud className="sync-indicator-icon pending" size={compact ? 16 : 20} />;
  };

  const getStatusText = () => {
    if (isSyncing) {
      return t('sync.syncing', 'Synchronizing...');
    }

    if (!isOnline && queueCount > 0) {
      return t('sync.pendingOffline', '{{count}} pending (offline)', { count: queueCount });
    }

    if (queueCount > 0) {
      return t('sync.pending', '{{count}} pending', { count: queueCount });
    }

    if (lastSyncResult) {
      if (lastSyncResult.failed > 0) {
        return t('sync.partialSync', '{{success}} synced, {{failed}} failed', {
          success: lastSyncResult.success,
          failed: lastSyncResult.failed,
        });
      }
      return t('sync.complete', 'All synced');
    }

    return t('sync.upToDate', 'Up to date');
  };

  const isClickable = isOnline && queueCount > 0 && !isSyncing;

  return (
    <div
      className={`sync-indicator ${compact ? 'compact' : ''} ${isClickable ? 'clickable' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role={isClickable ? 'button' : 'status'}
      aria-label={getStatusText()}
      tabIndex={isClickable ? 0 : -1}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {getStatusIcon()}

      {queueCount > 0 && (
        <span className="sync-indicator-badge" aria-hidden="true">
          {queueCount > 99 ? '99+' : queueCount}
        </span>
      )}

      {!compact && (
        <span className="sync-indicator-text">
          {isSyncing ? t('sync.syncing', 'Syncing...') : null}
        </span>
      )}

      {showTooltip && (
        <div className="sync-indicator-tooltip" role="tooltip">
          <div className="sync-indicator-tooltip-content">
            {getStatusText()}
            {lastSyncTime && (
              <div className="sync-indicator-tooltip-time">
                {t('sync.lastSync', 'Last sync: {{time}}', { time: getRelativeTime(lastSyncTime) })}
              </div>
            )}
            {isClickable && (
              <div className="sync-indicator-tooltip-action">
                {t('sync.clickToSync', 'Click to sync now')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncIndicator;
