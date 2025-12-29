import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { logger } from '../utils/logger';

interface CSRFResponse {
  csrfToken: string;
  sessionId?: string;
  expiresAt?: string;
}

interface CSRFContextType {
  csrfToken: string;
  loading: boolean;
  error: string;
  getCSRFHeaders: () => Record<string, string>;
  refreshToken: () => Promise<string | null>; // 🔧 Returns fresh token
  setToken: (token: string) => void; // 🔧 FIX: Set token directly (from login/register response)
}

const CSRFContext = createContext<CSRFContextType | undefined>(undefined);

export const CSRFProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true);
  // Track if initial fetch has completed to avoid re-fetching on StrictMode re-mount
  const initialFetchCompleteRef = useRef(false);

  const fetchCSRFToken = useCallback(async (signal: AbortSignal | null, force = false): Promise<string | null> => {
    // Use a ref or check if currently fetching to prevent race conditions
    // Allow forced refresh or check if already fetching
    if (document.body.dataset.csrfFetching === 'true' && !force) {
      logger.debug('CSRF fetch skipped - already fetching');
      return null;
    }

    document.body.dataset.csrfFetching = 'true';

    try {
      if (isMountedRef.current) {
        setLoading(true);
        setError('');
      }

      logger.debug('CSRF token fetch starting', { forced: force });

      // Add timeout to prevent hanging requests
      const timeoutId = setTimeout(() => {
        logger.warn('CSRF fetch timeout reached (10s)');
      }, 10000); // 10 second timeout

      const fetchOptions: RequestInit = {
        method: 'GET',
        credentials: 'include', // Important pour les sessions
      };

      // Only add signal if provided (for manual refresh cancellation)
      if (signal) {
        fetchOptions.signal = signal;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/csrf-token`, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data: CSRFResponse = await response.json();

      logger.debug('CSRF token obtained', {
        hasToken: !!data.csrfToken,
        hasSessionId: !!data.sessionId
      });

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setCsrfToken(data.csrfToken);
        setLoading(false);
      }

      initialFetchCompleteRef.current = true;

      return data.csrfToken; // 🔧 Return the fresh token

    } catch (err) {
      // Don't handle AbortError from manual cancellation
      if (err instanceof Error && err.name === 'AbortError') {
        logger.debug('CSRF fetch aborted');
        return null;
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (isMountedRef.current) {
        setError(errorMessage);
        setLoading(false);
      }
      logger.error('CSRF token fetch failed', err);

      return null;
    } finally {
      document.body.dataset.csrfFetching = 'false';
    }
  }, []);

  // Obtenir le token au montage du provider
  useEffect(() => {
    isMountedRef.current = true;

    // Skip if initial fetch already completed (handles React StrictMode double-mount)
    if (initialFetchCompleteRef.current) {
      logger.debug('CSRF initial fetch already completed, skipping');
      setLoading(false);
      return;
    }

    // Fetch token without abort signal - let it complete even on unmount
    // This prevents React StrictMode from aborting the initial fetch
    fetchCSRFToken(null, false);

    // Cleanup function - mark as unmounted but don't abort
    return () => {
      isMountedRef.current = false;
      logger.debug('CSRFProvider cleanup');
    };
  }, [fetchCSRFToken]);

  // Memoized CSRF headers - recalculated only when token changes
  const csrfHeaders = useMemo((): Record<string, string> => {
    // Return token if available
    if (!csrfToken || csrfToken.trim() === '') {
      logger.debug('CSRF token not available for headers');
      return {} as Record<string, string>;
    }

    return {
      'X-CSRF-Token': csrfToken
    };
  }, [csrfToken]); // Only depends on csrfToken, not error or loading

  // Optimized function that returns memoized headers
  const getCSRFHeaders = useCallback((): Record<string, string> => {
    return csrfHeaders;
  }, [csrfHeaders]);

  // 🔧 FIX: Set token directly from login/register response (avoids fetch mismatch)
  const setToken = useCallback((token: string) => {
    if (token && token.trim().length > 0) {
      logger.debug('CSRF token set directly', { tokenPreview: token.substring(0, 8) + '...' });
      setCsrfToken(token);
      setLoading(false);
      setError('');
    }
  }, []);

  const value: CSRFContextType = {
    csrfToken,
    loading,
    error,
    getCSRFHeaders,
    refreshToken: async () => {
      // Create a new AbortController for manual refresh
      const controller = new AbortController();
      const freshToken = await fetchCSRFToken(controller.signal, true); // Always force refresh when manually called
      return freshToken || csrfToken; // Return the fresh token (or current if fetch failed)
    },
    setToken
  };

  return (
    <CSRFContext.Provider value={value}>
      {children}
    </CSRFContext.Provider>
  );
};

export const useCSRF = (): CSRFContextType => {
  const context = useContext(CSRFContext);
  if (context === undefined) {
    throw new Error('useCSRF must be used within a CSRFProvider');
  }
  return context;
};

export default CSRFProvider;