import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useServiceWorkerUpdate } from '../../hooks/useServiceWorkerUpdate';
import notification from '../../utils/notification';

/**
 * Renders nothing visually. Shows a toast notification when a new
 * service worker version is available, with a button to refresh.
 */
export default function ServiceWorkerUpdateNotifier() {
  const { t } = useTranslation();
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (updateAvailable && !notifiedRef.current) {
      notifiedRef.current = true;

      notification.info(t('pwa.updateAvailable'), {
        duration: 0, // Persist until user acts
        action: {
          label: t('pwa.updateButton'),
          onClick: applyUpdate,
        },
      });
    }
  }, [updateAvailable, applyUpdate, t]);

  return null;
}
