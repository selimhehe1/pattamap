import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCSRF } from '../contexts/CSRFContext';
import { logger } from '../utils/logger';
import { addToQueue, isOfflineQueueSupported, type QueuedRequest } from '../utils/offlineQueue';

/**
 * Options for secure fetch requests
 * @extends RequestInit
 */
interface SecureFetchOptions extends RequestInit {
  /** Whether to require authentication (default: true). If false, request proceeds without auth headers */
  requireAuth?: boolean;
  /** Whether to queue request for offline sync if network fails (default: false) */
  offlineQueue?: boolean;
  /** Human-readable description for offline queue UI */
  offlineDescription?: string;
  /** Force CSRF token refresh before request (useful after file uploads where React state may be stale) */
  forceCSRFRefresh?: boolean;
}

/**
 * Result of a secure fetch that may have been queued
 * @internal Reserved for future use with offline queue returns
 */
interface _SecureFetchResult {
  response: Response | null;
  queued: boolean;
  queuedRequest?: QueuedRequest;
}

/**
 * Custom hook for making secure API requests with automatic CSRF token handling and authentication.
 *
 * @description
 * This hook provides a secure fetch function that:
 * - Automatically includes CSRF tokens for POST/PUT/PATCH/DELETE requests
 * - Handles authentication via httpOnly cookies (not localStorage)
 * - Auto-refreshes CSRF tokens before critical operations
 * - Handles 401 responses by logging out the user
 * - Optionally queues failed requests for offline sync
 *
 * @example
 * ```tsx
 * const { secureFetch, isQueuedResponse } = useSecureFetch();
 *
 * // GET request (no CSRF needed)
 * const response = await secureFetch('/api/users');
 *
 * // POST request (CSRF token auto-included)
 * const response = await secureFetch('/api/users', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'John' })
 * });
 *
 * // POST request with offline queue support
 * const response = await secureFetch('/api/favorites', {
 *   method: 'POST',
 *   body: JSON.stringify({ employeeId: '123' }),
 *   offlineQueue: true,
 *   offlineDescription: 'Add to favorites'
 * });
 *
 * // Check if response was queued
 * if (isQueuedResponse(response)) {
 *   showToast('Action saved. Will sync when online.');
 * }
 * ```
 *
 * @returns {Object} Object containing:
 * - `secureFetch`: Function to make secure API requests
 * - `isQueuedResponse`: Function to check if response was queued for offline sync
 */
export const useSecureFetch = () => {
  const { logout } = useAuth();
  const { getCSRFHeaders, refreshToken, loading: csrfLoading } = useCSRF();

  const secureFetch = useCallback(async (url: string, options: SecureFetchOptions = {}): Promise<Response> => {
    const { requireAuth = true, offlineQueue = false, offlineDescription, forceCSRFRefresh = false, ...fetchOptions } = options;

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

    // Track fresh token from refresh (React state updates are async, so getCSRFHeaders() might be stale)
    let freshlyRefreshedToken: string | null = null;

    // 🔧 FIX: Refresh CSRF token if we DON'T have one OR if forceCSRFRefresh is true
    // forceCSRFRefresh is useful after file uploads where React state may be stale
    const currentHeaders = getCSRFHeaders();
    const hasValidToken = currentHeaders && Object.keys(currentHeaders).length > 0;

    if (isModifyingRequest && (!hasValidToken || forceCSRFRefresh)) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('🛡️ Refreshing CSRF token', {
          reason: forceCSRFRefresh ? 'forced refresh' : 'no token available',
          url
        });
      }
      freshlyRefreshedToken = await refreshToken();
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Check if this is the establishment-logo endpoint (CSRF-exempt)
    const isEstablishmentLogoEndpoint = url.includes('establishment-logo');

    // Get CSRF headers - prefer freshly refreshed token over getCSRFHeaders() which might be stale
    const csrfHeaders = (isModifyingRequest && !isEstablishmentLogoEndpoint)
      ? (freshlyRefreshedToken ? { 'X-CSRF-Token': freshlyRefreshedToken } : (getCSRFHeaders() || {}))
      : {};

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

    // Destructure headers from fetchOptions to prevent overwriting merged headers
    const { headers: userHeaders, ...restFetchOptions } = fetchOptions;

    // Default options for secure communication
    const defaultOptions: RequestInit = {
      credentials: 'include', // Always include cookies
      ...restFetchOptions, // Spread other options first (method, body, etc.)
      headers: {
        // Only set Content-Type for non-FormData requests
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...csrfHeaders, // Include CSRF token when needed
        ...(userHeaders || {}), // User headers last (can override Content-Type but not CSRF)
      } as HeadersInit,
    };

    try {
      const response = await fetch(url, defaultOptions);

      // Handle CSRF token mismatch - automatically refresh and retry once
      if (response.status === 403) {
        const errorData = await response.clone().json().catch(() => ({}));
        if (errorData.error && (errorData.error.includes('CSRF') || errorData.code?.includes('CSRF'))) {
          logger.warn('🛡️ CSRF token mismatch detected, refreshing token and retrying...');

          // Refresh CSRF token with fresh fetch - GET THE RETURNED TOKEN DIRECTLY
          // (React state updates are async, so getCSRFHeaders() might return stale value)
          const freshToken = await refreshToken();

          // Small delay to ensure session sync
          await new Promise(resolve => setTimeout(resolve, 300));

          if (process.env.NODE_ENV === 'development') {
            logger.debug('🛡️ CSRF retry', { hasFreshToken: !!freshToken });
          }

          // Use the fresh token DIRECTLY instead of getCSRFHeaders() which might be stale
          const newCsrfHeaders = (isModifyingRequest && !isEstablishmentLogoEndpoint && freshToken)
            ? { 'X-CSRF-Token': freshToken }
            : {};

          if (process.env.NODE_ENV === 'development') {
            logger.debug('🛡️ Retrying with fresh CSRF token:', Object.keys(newCsrfHeaders).length > 0 ? 'PRESENT' : 'MISSING');
          }

          // Retry with new token - rebuild complete options
          const retryOptions: RequestInit = {
            credentials: 'include',
            ...restFetchOptions, // Use already destructured options (without headers)
            headers: {
              // Only set Content-Type for non-FormData requests
              ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
              ...newCsrfHeaders,
              ...(userHeaders || {}),
            } as HeadersInit,
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

      // If response is 401 and auth is required, try token refresh first
      if (response.status === 401 && requireAuth) {
        logger.warn('🔄 Access token expired, attempting refresh...');

        try {
          // Try to refresh the token
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });

          if (refreshResponse.ok) {
            logger.info('🔄 Token refreshed successfully, retrying original request');

            // Token refreshed successfully, retry the original request
            const retryResponse = await fetch(url, defaultOptions);
            return retryResponse;
          } else {
            // Refresh failed, logout user
            logger.warn('🔄 Token refresh failed, logging out user');
            await logout();
            throw new Error('Session expired, please login again');
          }
        } catch (refreshError) {
          logger.error('🔄 Token refresh error:', refreshError);
          await logout();
          throw new Error('Authentication required');
        }
      }

      return response;
    } catch (error) {
      // Check if this is a network error and offline queue is enabled
      const isNetworkError = error instanceof TypeError &&
        (error.message.includes('Failed to fetch') ||
         error.message.includes('Network request failed') ||
         error.message.includes('NetworkError'));

      const isOffline = !navigator.onLine;

      if ((isNetworkError || isOffline) && offlineQueue && isOfflineQueueSupported()) {
        const method = (fetchOptions.method?.toUpperCase() || 'GET') as QueuedRequest['method'];

        // Only queue modifying requests (POST, PUT, PATCH, DELETE)
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          logger.info('[SecureFetch] Queueing request for offline sync:', url);

          try {
            await addToQueue(
              url,
              method,
              fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined,
              {
                headers: fetchOptions.headers as Record<string, string>,
                description: offlineDescription || `${method} ${url.split('/').pop()}`,
              }
            );

            // Return a fake "queued" response
            return new Response(JSON.stringify({
              queued: true,
              message: 'Request queued for sync when online'
            }), {
              status: 202, // Accepted
              statusText: 'Queued',
              headers: { 'Content-Type': 'application/json', 'X-Offline-Queued': 'true' }
            });
          } catch (queueError) {
            logger.error('[SecureFetch] Failed to queue request:', queueError);
            // Fall through to original error
          }
        }
      }

      logger.error('Secure fetch error:', error);
      throw error;
    }
  }, [logout, getCSRFHeaders, refreshToken, csrfLoading]);

  /**
   * Check if a response was queued for offline sync
   */
  const isQueuedResponse = useCallback((response: Response): boolean => {
    return response.headers.get('X-Offline-Queued') === 'true';
  }, []);

  return { secureFetch, isQueuedResponse };
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

    post: <T = unknown>(endpoint: string, data?: T, options?: SecureFetchOptions) =>
      fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      }),

    put: <T = unknown>(endpoint: string, data?: T, options?: SecureFetchOptions) =>
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