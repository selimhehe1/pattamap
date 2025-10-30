import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCSRF } from '../contexts/CSRFContext';
import { logger } from '../utils/logger';

interface SecureFetchOptions extends RequestInit {
  requireAuth?: boolean;
}

export const useSecureFetch = () => {
  const { logout } = useAuth();
  const { getCSRFHeaders, refreshToken, loading: csrfLoading } = useCSRF();

  const secureFetch = useCallback(async (url: string, options: SecureFetchOptions = {}) => {
    const { requireAuth = true, ...fetchOptions } = options;

    // Wait for CSRF token to be available if it's still loading
    const isModifyingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchOptions.method?.toUpperCase() || 'GET');

    if (isModifyingRequest && csrfLoading) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('🛡️ Waiting for CSRF token to load...');
      }
      // Wait up to 15 seconds for CSRF token
      const maxWait = 15000;
      const start = Date.now();
      while (csrfLoading && (Date.now() - start) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (csrfLoading) {
        logger.error('🛡️ CSRF token still loading after 15 seconds, proceeding anyway');
      }
    }

    // For modifying requests, ensure we have fresh CSRF token by refreshing if needed
    // ENHANCED: Always refresh token for critical operations like establishment creation/update and user ratings
    const isCriticalOperation = (
      (url.includes('/establishments') && (fetchOptions.method === 'POST' || fetchOptions.method === 'PUT')) ||
      (url.includes('/comments/user-rating') && fetchOptions.method === 'PUT')
    );

    if (isModifyingRequest && (isCriticalOperation || !getCSRFHeaders() || Object.keys(getCSRFHeaders()).length === 0)) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('🛡️ Refreshing CSRF token', {
          operation: isCriticalOperation ? 'critical operation' : 'missing token',
          url
        });
      }
      await refreshToken();
      // Longer delay for critical operations to ensure session synchronization
      await new Promise(resolve => setTimeout(resolve, isCriticalOperation ? 500 : 200));
    }

    // Check if this is the establishment-logo endpoint (CSRF-exempt)
    const isEstablishmentLogoEndpoint = url.includes('establishment-logo');

    // Get CSRF headers for all non-GET requests (except establishment-logo endpoint)
    const csrfHeaders = (isModifyingRequest && !isEstablishmentLogoEndpoint) ? (getCSRFHeaders() || {}) : {};

    // Enhanced debugging for CSRF headers (development only)
    if (isModifyingRequest && process.env.NODE_ENV === 'development') {
      logger.debug('🛡️ CSRF Headers debug:', {
        isModifyingRequest,
        isEstablishmentLogoEndpoint,
        hasHeaders: Object.keys(csrfHeaders).length > 0,
        headers: csrfHeaders,
        method: fetchOptions.method,
        url: url
      });
    }

    // Check if body is FormData (for file uploads)
    const isFormData = fetchOptions.body instanceof FormData;

    // Default options for secure communication
    const defaultOptions: RequestInit = {
      credentials: 'include', // Always include cookies
      headers: {
        // Only set Content-Type for non-FormData requests
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...csrfHeaders, // Include CSRF token when needed
        ...(fetchOptions.headers || {}),
      } as HeadersInit,
      ...fetchOptions,
    };

    try {
      const response = await fetch(url, defaultOptions);

      // Handle CSRF token mismatch - automatically refresh and retry once
      if (response.status === 403) {
        const errorData = await response.clone().json().catch(() => ({}));
        if (errorData.error && (errorData.error.includes('CSRF') || errorData.code?.includes('CSRF'))) {
          logger.warn('🛡️ CSRF token mismatch detected, refreshing token and retrying...');

          // Refresh CSRF token with fresh fetch
          await refreshToken();

          // Longer delay for critical operations to ensure proper session sync
          const isCriticalRetry = url.includes('/establishments') || url.includes('/comments/user-rating');
          await new Promise(resolve => setTimeout(resolve, isCriticalRetry ? 800 : 300));

          if (process.env.NODE_ENV === 'development') {
            logger.debug('🛡️ CSRF retry', {
              operation: isCriticalRetry ? 'critical operation' : 'regular operation',
              waiting: isCriticalRetry ? '800ms' : '300ms'
            });
          }

          // Get fresh CSRF headers (except for establishment-logo endpoint)
          const newCsrfHeaders = (isModifyingRequest && !isEstablishmentLogoEndpoint) ? (getCSRFHeaders() || {}) : {};

          if (process.env.NODE_ENV === 'development') {
            logger.debug('🛡️ Retrying with fresh CSRF token:', Object.keys(newCsrfHeaders).length > 0 ? 'PRESENT' : 'MISSING');
          }

          // Retry with new token - rebuild complete options
          const retryOptions: RequestInit = {
            credentials: 'include',
            headers: {
              // Only set Content-Type for non-FormData requests
              ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
              ...newCsrfHeaders,
              ...(fetchOptions.headers || {}),
            } as HeadersInit,
            ...fetchOptions,
          };

          const retryResponse = await fetch(url, retryOptions);

          if (retryResponse.status === 403) {
            logger.error('🛡️ CSRF retry failed, possible session issue');
          } else if (process.env.NODE_ENV === 'development') {
            logger.debug('🛡️ CSRF retry successful');
          }

          return retryResponse;
        }
      }

      // If response is 401 and auth is required, logout user
      if (response.status === 401 && requireAuth) {
        logger.warn('Authentication failed, logging out user');
        await logout();
        throw new Error('Authentication required');
      }

      return response;
    } catch (error) {
      logger.error('Secure fetch error:', error);
      throw error;
    }
  }, [logout, getCSRFHeaders, refreshToken, csrfLoading]);

  return { secureFetch };
};

// Helper for common API calls
export const createSecureApiCall = (baseUrl: string) => {
  return {
    get: (endpoint: string, options?: SecureFetchOptions) =>
      fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options,
      }),

    post: (endpoint: string, data?: any, options?: SecureFetchOptions) =>
      fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      }),

    put: (endpoint: string, data?: any, options?: SecureFetchOptions) =>
      fetch(`${baseUrl}${endpoint}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      }),

    delete: (endpoint: string, options?: SecureFetchOptions) =>
      fetch(`${baseUrl}${endpoint}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...options,
      }),
  };
};

export default useSecureFetch;