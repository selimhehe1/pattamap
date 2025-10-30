import React, { useState, useEffect } from 'react';
import {
  subscribeToPush,
  unsubscribeFromPush,
  isPushSupported,
  isPushSubscribed,
  getPushStatus,
  getNotificationPermission,
  showTestNotification
} from '../../utils/pushManager';
import { useTranslation } from 'react-i18next';
import toast from '../../utils/toast';
import '../../styles/PushNotificationSettings.css';

interface PushStatus {
  configured: boolean;
  subscribed: boolean;
  subscriptionCount: number;
}

const PushNotificationSettings: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [status, setStatus] = useState<PushStatus>({
    configured: false,
    subscribed: false,
    subscriptionCount: 0
  });

  // Check push support and status on mount
  useEffect(() => {
    checkPushStatus();
  }, []);

  const checkPushStatus = async () => {
    setLoading(true);
    try {
      // Check browser support
      const supported = isPushSupported();
      setIsSupported(supported);

      if (!supported) {
        setLoading(false);
        return;
      }

      // Check permission
      const currentPermission = getNotificationPermission();
      setPermission(currentPermission);

      // Check subscription status
      const subscribed = await isPushSubscribed();
      setIsSubscribed(subscribed);

      // Get backend status
      const backendStatus = await getPushStatus();
      setStatus(backendStatus);
    } catch (error) {
      console.error('Failed to check push status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      await subscribeToPush();
      setIsSubscribed(true);

      // Refresh status
      await checkPushStatus();

      toast.success(t('notifications.push.subscribed'));

      // Show test notification
      setTimeout(async () => {
        try {
          await showTestNotification(
            t('notifications.push.welcomeTitle'),
            t('notifications.push.welcomeMessage')
          );
        } catch (error) {
          console.error('Failed to show test notification:', error);
        }
      }, 500);
    } catch (error: any) {
      console.error('Subscribe failed:', error);

      let errorMessage = t('notifications.push.subscribeFailed');
      if (error.message.includes('permission denied')) {
        errorMessage = t('notifications.push.permissionDenied');
      } else if (error.message.includes('not supported')) {
        errorMessage = t('notifications.push.notSupported');
      }

      toast.error(errorMessage);
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    setSubscribing(true);
    try {
      await unsubscribeFromPush();
      setIsSubscribed(false);

      // Refresh status
      await checkPushStatus();

      toast.success(t('notifications.push.unsubscribed'));
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      toast.error(t('notifications.push.unsubscribeFailed'));
    } finally {
      setSubscribing(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await showTestNotification(
        t('notifications.push.testTitle'),
        t('notifications.push.testMessage')
      );
      toast.success(t('notifications.push.testSent'));
    } catch (error: any) {
      console.error('Test notification failed:', error);

      let errorMessage = t('notifications.push.testFailed');
      if (error.message.includes('permission')) {
        errorMessage = t('notifications.push.permissionDenied');
      }

      toast.error(errorMessage);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="push-notification-settings">
        <div className="push-loading">
          <div className="spinner"></div>
          <p>{t('notifications.push.loading')}</p>
        </div>
      </div>
    );
  }

  // Not supported
  if (!isSupported) {
    return (
      <div className="push-notification-settings">
        <div className="push-not-supported">
          <div className="warning-icon">⚠️</div>
          <h3>{t('notifications.push.notSupportedTitle')}</h3>
          <p>{t('notifications.push.notSupportedMessage')}</p>
          <p className="help-text">
            {t('notifications.push.notSupportedHelp')}
          </p>
        </div>
      </div>
    );
  }

  // Server not configured
  if (!status.configured) {
    return (
      <div className="push-notification-settings">
        <div className="push-not-configured">
          <div className="warning-icon">⚙️</div>
          <h3>{t('notifications.push.notConfiguredTitle')}</h3>
          <p>{t('notifications.push.notConfiguredMessage')}</p>
        </div>
      </div>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <div className="push-notification-settings">
        <div className="push-permission-denied">
          <div className="error-icon">🚫</div>
          <h3>{t('notifications.push.permissionDeniedTitle')}</h3>
          <p>{t('notifications.push.permissionDeniedMessage')}</p>
          <div className="help-steps">
            <h4>{t('notifications.push.howToEnable')}</h4>
            <ol>
              <li>{t('notifications.push.step1')}</li>
              <li>{t('notifications.push.step2')}</li>
              <li>{t('notifications.push.step3')}</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="push-notification-settings">
      <div className="push-header">
        <div className="push-icon">🔔</div>
        <div className="push-title">
          <h3>{t('notifications.push.title')}</h3>
          <p className="push-description">
            {t('notifications.push.description')}
          </p>
        </div>
      </div>

      <div className="push-status-card">
        <div className="status-row">
          <span className="status-label">{t('notifications.push.status')}:</span>
          <span className={`status-badge ${isSubscribed ? 'active' : 'inactive'}`}>
            {isSubscribed ? t('notifications.push.active') : t('notifications.push.inactive')}
          </span>
        </div>

        {isSubscribed && status.subscriptionCount > 0 && (
          <div className="status-row">
            <span className="status-label">{t('notifications.push.devices')}:</span>
            <span className="status-value">{status.subscriptionCount}</span>
          </div>
        )}

        <div className="status-row">
          <span className="status-label">{t('notifications.push.permission')}:</span>
          <span className={`permission-badge ${permission}`}>
            {permission === 'granted' && '✅ ' + t('notifications.push.permissionGranted')}
            {permission === 'default' && '⏳ ' + t('notifications.push.permissionDefault')}
          </span>
        </div>
      </div>

      <div className="push-actions">
        {!isSubscribed ? (
          <button
            className="push-button subscribe"
            onClick={handleSubscribe}
            disabled={subscribing}
          >
            {subscribing ? (
              <>
                <div className="button-spinner"></div>
                {t('notifications.push.subscribing')}
              </>
            ) : (
              <>
                🔔 {t('notifications.push.enable')}
              </>
            )}
          </button>
        ) : (
          <>
            <button
              className="push-button test"
              onClick={handleTestNotification}
            >
              🧪 {t('notifications.push.sendTest')}
            </button>

            <button
              className="push-button unsubscribe"
              onClick={handleUnsubscribe}
              disabled={subscribing}
            >
              {subscribing ? (
                <>
                  <div className="button-spinner"></div>
                  {t('notifications.push.unsubscribing')}
                </>
              ) : (
                <>
                  🔕 {t('notifications.push.disable')}
                </>
              )}
            </button>
          </>
        )}
      </div>

      <div className="push-info">
        <h4>{t('notifications.push.infoTitle')}</h4>
        <ul>
          <li>{t('notifications.push.info1')}</li>
          <li>{t('notifications.push.info2')}</li>
          <li>{t('notifications.push.info3')}</li>
          <li>{t('notifications.push.info4')}</li>
        </ul>
      </div>

      <div className="push-privacy">
        <p className="privacy-text">
          🔒 {t('notifications.push.privacy')}
        </p>
      </div>
    </div>
  );
};

export default PushNotificationSettings;
