import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to detect online/offline status with automatic updates
 *
 * @example
 * ```tsx
 * const { isOnline, isOffline, lastOnlineAt } = useOnline();
 *
 * if (isOffline) {
 *   return <OfflineBanner />;
 * }
 * ```
 *
 * @returns {Object} Online status information
 * @returns {boolean} isOnline - True if connected to the internet
 * @returns {boolean} isOffline - True if not connected (convenience inverse)
 * @returns {Date | null} lastOnlineAt - Timestamp of last known online state
 * @returns {() => Promise<boolean>} checkConnection - Manual connection check
 */
export function useOnline() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    // Initialize with navigator.onLine if available, default to true
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true;
  });

  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(() => {
    // If we're online at mount, set the timestamp
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      return new Date();
    }
    return null;
  });

  /**
   * Manual connection check by attempting to fetch a small resource
   * Useful for verifying actual connectivity beyond navigator.onLine
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch a tiny resource to verify actual connectivity
      // Use a cache-busting query param to avoid cached responses
      const response = await fetch('/favicon.ico?_=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-store',
      });
      const connected = response.ok;
      setIsOnline(connected);
      if (connected) {
        setLastOnlineAt(new Date());
      }
      return connected;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also listen for visibility changes to recheck when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Sync with navigator.onLine when tab becomes visible
        const currentOnline = navigator.onLine;
        setIsOnline(currentOnline);
        if (currentOnline && !lastOnlineAt) {
          setLastOnlineAt(new Date());
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lastOnlineAt]);

  return {
    isOnline,
    isOffline: !isOnline,
    lastOnlineAt,
    checkConnection,
  };
}

export default useOnline;
