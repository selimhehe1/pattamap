/**
 * useFormSubmission - Generic form submission hook
 *
 * Eliminates duplicate submission patterns across forms:
 * - Loading state management (isSubmitting)
 * - secureFetch integration with credentials
 * - Standardized error handling and logging
 * - Success/error callbacks
 *
 * Usage:
 * const { submit, isSubmitting } = useFormSubmission<ResponseType>({
 *   endpoint: '/api/employees',
 *   method: 'POST',
 *   onSuccess: (data) => { ... },
 *   onError: (error) => { ... }
 * });
 */

import { useState, useCallback } from 'react';
import { useSecureFetch } from './useSecureFetch';

export interface FormSubmissionOptions<T = unknown> {
  /** API endpoint (relative or absolute) */
  endpoint: string;
  /** HTTP method */
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Success callback with response data */
  onSuccess?: (data: T) => void;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Custom error message prefix for logging */
  errorLogPrefix?: string;
  /** Transform request body before sending */
  transformBody?: (body: unknown) => unknown;
}

export interface FormSubmissionResult<T = unknown> {
  /** Whether a submission is in progress */
  isSubmitting: boolean;
  /** Submit function - pass body data */
  submit: (body: unknown) => Promise<T | null>;
  /** Reset submission state */
  reset: () => void;
  /** Last error that occurred */
  error: Error | null;
}

/**
 * Generic form submission hook with secureFetch integration
 */
export function useFormSubmission<T = unknown>(
  options: FormSubmissionOptions<T>
): FormSubmissionResult<T> {
  const {
    endpoint,
    method,
    onSuccess,
    onError,
    errorLogPrefix = 'Form submission error',
    transformBody
  } = options;

  const { secureFetch } = useSecureFetch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submit = useCallback(async (body: unknown): Promise<T | null> => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Build full URL
      const apiBase = import.meta.env.VITE_API_URL || '';
      const url = endpoint.startsWith('http') ? endpoint : `${apiBase}${endpoint}`;

      // Transform body if needed
      const requestBody = transformBody ? transformBody(body) : body;

      const response = await secureFetch(url, {
        method,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json() as T;

      if (onSuccess) {
        onSuccess(data);
      }

      return data;
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      console.error(`${errorLogPrefix}:`, errorInstance);
      setError(errorInstance);

      if (onError) {
        onError(errorInstance);
      }

      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [endpoint, method, onSuccess, onError, errorLogPrefix, transformBody, secureFetch]);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setError(null);
  }, []);

  return {
    isSubmitting,
    submit,
    reset,
    error
  };
}

/**
 * Simplified version for one-time submissions
 * Returns a submit function that manages its own state
 */
export function useSimpleSubmit() {
  const { secureFetch } = useSecureFetch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitRequest = useCallback(async <T = unknown>(
    endpoint: string,
    method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    body: unknown
  ): Promise<{ success: boolean; data?: T; error?: string }> => {
    setIsSubmitting(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const url = endpoint.startsWith('http') ? endpoint : `${apiBase}${endpoint}`;

      const response = await secureFetch(url, {
        method,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || `Request failed`;
        return { success: false, error: errorMessage };
      }

      const data = await response.json() as T;
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Submit request error:', err);
      return { success: false, error: message };
    } finally {
      setIsSubmitting(false);
    }
  }, [secureFetch]);

  return { isSubmitting, submitRequest };
}

export default useFormSubmission;
