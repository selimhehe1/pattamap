import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useAvailabilityCheck - Hook for real-time pseudonym/email availability check
 *
 * Features:
 * - Debounced API calls (400ms)
 * - Status tracking: idle | checking | available | taken | error
 * - Graceful error handling (rate limits, network errors)
 *
 * @example
 * const { status, message, checkAvailability } = useAvailabilityCheck('pseudonym');
 *
 * useEffect(() => {
 *   if (pseudonym.length >= 3) {
 *     checkAvailability(pseudonym);
 *   }
 * }, [pseudonym, checkAvailability]);
 */

export type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error' | 'invalid';

interface AvailabilityState {
  status: AvailabilityStatus;
  message: string | null;
}

interface UseAvailabilityCheckReturn {
  status: AvailabilityStatus;
  message: string | null;
  checkAvailability: (value: string) => void;
  reset: () => void;
}

const DEBOUNCE_MS = 400;
const API_URL = import.meta.env.VITE_API_URL;

export const useAvailabilityCheck = (
  field: 'pseudonym' | 'email'
): UseAvailabilityCheckReturn => {
  const [state, setState] = useState<AvailabilityState>({
    status: 'idle',
    message: null,
  });

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastCheckedValueRef = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({ status: 'idle', message: null });
    lastCheckedValueRef.current = '';
  }, []);

  const checkAvailability = useCallback(
    (value: string) => {
      const trimmedValue = value.trim();

      // Skip if same value already checked
      if (trimmedValue === lastCheckedValueRef.current) {
        return;
      }

      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Reset if empty
      if (!trimmedValue) {
        setState({ status: 'idle', message: null });
        lastCheckedValueRef.current = '';
        return;
      }

      // Minimum length check (3 for pseudonym, 5 for email)
      const minLength = field === 'pseudonym' ? 3 : 5;
      if (trimmedValue.length < minLength) {
        setState({ status: 'idle', message: null });
        return;
      }

      // Set checking state immediately
      setState({ status: 'checking', message: null });

      // Debounce the API call
      debounceRef.current = setTimeout(async () => {
        try {
          abortControllerRef.current = new AbortController();

          const queryParam = field === 'pseudonym'
            ? `pseudonym=${encodeURIComponent(trimmedValue)}`
            : `email=${encodeURIComponent(trimmedValue)}`;

          const response = await fetch(
            `${API_URL}/api/auth/check-availability?${queryParam}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              signal: abortControllerRef.current.signal,
            }
          );

          // Handle rate limit
          if (response.status === 429) {
            setState({
              status: 'error',
              message: 'Trop de vérifications. Veuillez patienter.',
            });
            return;
          }

          if (!response.ok) {
            setState({
              status: 'error',
              message: 'Erreur lors de la vérification',
            });
            return;
          }

          const data = await response.json();

          // Check field-specific result
          const isAvailable = field === 'pseudonym'
            ? data.pseudonymAvailable
            : data.emailAvailable;

          const formatError = field === 'pseudonym'
            ? data.pseudonymError
            : data.emailError;

          if (formatError === 'INVALID_FORMAT') {
            setState({
              status: 'invalid',
              message: field === 'pseudonym'
                ? 'Format invalide (lettres, chiffres, _ uniquement)'
                : 'Format email invalide',
            });
          } else if (isAvailable) {
            setState({
              status: 'available',
              message: 'Disponible',
            });
          } else {
            setState({
              status: 'taken',
              message: field === 'pseudonym'
                ? 'Ce pseudonyme est déjà utilisé'
                : 'Cet email est déjà utilisé',
            });
          }

          lastCheckedValueRef.current = trimmedValue;
        } catch (error) {
          // Ignore abort errors
          if (error instanceof Error && error.name === 'AbortError') {
            return;
          }

          setState({
            status: 'error',
            message: 'Erreur de connexion',
          });
        }
      }, DEBOUNCE_MS);
    },
    [field]
  );

  return {
    status: state.status,
    message: state.message,
    checkAvailability,
    reset,
  };
};

export default useAvailabilityCheck;
