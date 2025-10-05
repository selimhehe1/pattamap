import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  refreshToken: () => Promise<void>;
}

const CSRFContext = createContext<CSRFContextType | undefined>(undefined);

export const CSRFProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchCSRFToken = useCallback(async (force = false) => {
    // Use a ref or check if currently fetching to prevent race conditions
    // Allow forced refresh or check if already fetching
    if (document.body.dataset.csrfFetching === 'true' && !force) {
      logger.debug('CSRF fetch skipped - already fetching');
      return;
    }

    document.body.dataset.csrfFetching = 'true';

    try {
      setLoading(true);
      setError('');

      logger.debug('CSRF token fetch starting', { forced: force });

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/csrf-token`, {
        method: 'GET',
        credentials: 'include', // Important pour les sessions
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data: CSRFResponse = await response.json();

      logger.debug('CSRF token obtained', {
        hasToken: !!data.csrfToken,
        hasSessionId: !!data.sessionId
      });

      setCsrfToken(data.csrfToken);
      setLoading(false); // Set loading to false immediately after setting token

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('CSRF token fetch failed', err);

      // If this was an abort due to timeout, try again once
      if (err instanceof Error && err.name === 'AbortError' && !force) {
        logger.warn('CSRF fetch timed out, retrying...');
        setTimeout(() => fetchCSRFToken(true), 1000);
        return;
      }
    } finally {
      setLoading(false);
      document.body.dataset.csrfFetching = 'false';
    }
  }, []); // Remove dependency on loading to prevent infinite loops

  // Obtenir le token au montage du provider
  useEffect(() => {
    fetchCSRFToken();
  }, [fetchCSRFToken]); // Now properly includes fetchCSRFToken dependency

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

  const value: CSRFContextType = {
    csrfToken,
    loading,
    error,
    getCSRFHeaders,
    refreshToken: () => fetchCSRFToken(true) // Always force refresh when manually called
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