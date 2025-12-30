/**
 * useOptimisticRating - React 19 Optimistic Updates for Ratings
 *
 * Uses React 19's useOptimistic hook for instant UI feedback when
 * submitting ratings. The UI updates immediately on user action,
 * then syncs with server response (or reverts on error).
 *
 * @example
 * const { optimisticRating, isPending, submitRating, reset } = useOptimisticRating({
 *   initialRating: userRating?.rating ?? null,
 *   onSubmit: async (rating) => {
 *     const response = await api.submitRating(rating);
 *     return response.ok;
 *   },
 *   onSuccess: (rating) => {
 *     toast.success('Rating saved!');
 *   },
 *   onError: (error) => {
 *     toast.error(error.message);
 *   }
 * });
 *
 * @version 1.0.0
 * @created 2025-01-08 - Phase 5.3
 */

import { useOptimistic, useTransition, useCallback, useState, useEffect } from 'react';

export interface UseOptimisticRatingOptions {
  /**
   * Initial rating value (null if no rating exists)
   */
  initialRating: number | null;

  /**
   * Async function to submit rating to server.
   * Returns true on success, false on failure.
   */
  onSubmit: (rating: number) => Promise<boolean>;

  /**
   * Called when rating is successfully submitted
   */
  onSuccess?: (rating: number) => void;

  /**
   * Called when rating submission fails
   */
  onError?: (error: Error) => void;
}

export interface UseOptimisticRatingReturn {
  /**
   * Current rating value (optimistic or confirmed)
   */
  optimisticRating: number | null;

  /**
   * Whether a submission is in progress
   */
  isPending: boolean;

  /**
   * Whether an error occurred
   */
  hasError: boolean;

  /**
   * Error message if any
   */
  error: Error | null;

  /**
   * Submit a new rating (updates UI optimistically)
   */
  submitRating: (rating: number) => void;

  /**
   * Reset to initial state
   */
  reset: () => void;
}

export function useOptimisticRating(
  options: UseOptimisticRatingOptions
): UseOptimisticRatingReturn {
  const { initialRating, onSubmit, onSuccess, onError } = options;

  // Track the confirmed server state
  const [confirmedRating, setConfirmedRating] = useState<number | null>(initialRating);
  const [error, setError] = useState<Error | null>(null);

  // Sync confirmedRating when initialRating changes (e.g., after async fetch)
  useEffect(() => {
    setConfirmedRating(initialRating);
  }, [initialRating]);

  // React 19 useOptimistic for instant UI updates
  const [optimisticRating, setOptimisticRating] = useOptimistic(
    confirmedRating,
    (_currentState: number | null, newRating: number) => newRating
  );

  // useTransition for non-blocking updates
  const [isPending, startTransition] = useTransition();

  const submitRating = useCallback(
    (rating: number) => {
      // Validate rating
      if (rating < 1 || rating > 5) {
        setError(new Error('Rating must be between 1 and 5'));
        return;
      }

      // Clear any previous error
      setError(null);

      // Start transition for non-blocking update
      startTransition(async () => {
        // Optimistically update the UI immediately
        setOptimisticRating(rating);

        try {
          // Submit to server
          const success = await onSubmit(rating);

          if (success) {
            // Confirm the optimistic update
            setConfirmedRating(rating);
            onSuccess?.(rating);
          } else {
            // Server rejected - optimistic state will auto-revert
            // because confirmedRating didn't change
            const err = new Error('Failed to save rating');
            setError(err);
            onError?.(err);
          }
        } catch (err) {
          // Network error - optimistic state will auto-revert
          const error = err instanceof Error ? err : new Error('Network error');
          setError(error);
          onError?.(error);
        }
      });
    },
    [onSubmit, onSuccess, onError, setOptimisticRating]
  );

  const reset = useCallback(() => {
    setConfirmedRating(initialRating);
    setError(null);
  }, [initialRating]);

  return {
    optimisticRating,
    isPending,
    hasError: error !== null,
    error,
    submitRating,
    reset
  };
}

/**
 * useOptimisticToggle - Simple boolean optimistic toggle
 *
 * Perfect for favorite buttons, like buttons, etc.
 *
 * @example
 * const { optimisticValue, isPending, toggle } = useOptimisticToggle({
 *   initialValue: isFavorite,
 *   onToggle: async (newValue) => {
 *     return await api.toggleFavorite(employeeId);
 *   }
 * });
 */
export interface UseOptimisticToggleOptions {
  initialValue: boolean;
  onToggle: (newValue: boolean) => Promise<boolean>;
  onSuccess?: (newValue: boolean) => void;
  onError?: (error: Error) => void;
}

export interface UseOptimisticToggleReturn {
  optimisticValue: boolean;
  isPending: boolean;
  hasError: boolean;
  error: Error | null;
  toggle: () => void;
  setValue: (value: boolean) => void;
}

export function useOptimisticToggle(
  options: UseOptimisticToggleOptions
): UseOptimisticToggleReturn {
  const { initialValue, onToggle, onSuccess, onError } = options;

  const [confirmedValue, setConfirmedValue] = useState(initialValue);
  const [error, setError] = useState<Error | null>(null);

  const [optimisticValue, setOptimisticValue] = useOptimistic(
    confirmedValue,
    (_current: boolean, newValue: boolean) => newValue
  );

  const [isPending, startTransition] = useTransition();

  const toggle = useCallback(() => {
    const newValue = !optimisticValue;
    setError(null);

    startTransition(async () => {
      setOptimisticValue(newValue);

      try {
        const success = await onToggle(newValue);

        if (success) {
          setConfirmedValue(newValue);
          onSuccess?.(newValue);
        } else {
          const err = new Error('Toggle failed');
          setError(err);
          onError?.(err);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Network error');
        setError(error);
        onError?.(error);
      }
    });
  }, [optimisticValue, onToggle, onSuccess, onError, setOptimisticValue]);

  const setValue = useCallback(
    (value: boolean) => {
      setConfirmedValue(value);
    },
    []
  );

  return {
    optimisticValue,
    isPending,
    hasError: error !== null,
    error,
    toggle,
    setValue
  };
}

export default useOptimisticRating;
