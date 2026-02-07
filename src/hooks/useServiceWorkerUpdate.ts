import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to detect service worker updates and prompt the user to refresh.
 * Listens for `onupdatefound` on the service worker registration.
 */
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  // Only reload after the user explicitly clicks "Refresh"
  const userRequestedUpdate = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const checkForUpdate = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) return;

      // If there's already a waiting worker when this hook mounts
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setUpdateAvailable(true);
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            // New version installed and waiting to activate
            setWaitingWorker(installing);
            setUpdateAvailable(true);
          }
        });
      });
    };

    checkForUpdate();

    // Reload only when the user explicitly requested the update via applyUpdate()
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing || !userRequestedUpdate.current) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) return;
    userRequestedUpdate.current = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }, [waitingWorker]);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  return { updateAvailable, applyUpdate, dismissUpdate };
}
