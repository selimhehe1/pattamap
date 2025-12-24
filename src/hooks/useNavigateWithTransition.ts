/**
 * useNavigateWithTransition Hook
 * Phase 3 Modernisation - View Transitions API
 *
 * Wraps React Router's useNavigate with View Transitions API support.
 * Provides smooth native transitions between pages.
 *
 * Usage:
 * ```tsx
 * const navigate = useNavigateWithTransition();
 *
 * // Navigate with view transition
 * navigate('/new-page');
 *
 * // With options
 * navigate('/new-page', { replace: true });
 * ```
 */

import { useCallback } from 'react';
import { useNavigate, NavigateOptions, To } from 'react-router-dom';
import { useViewTransition } from './useViewTransition';

export interface UseNavigateWithTransitionReturn {
  /** Navigate to a path with View Transitions */
  (to: To, options?: NavigateOptions): void;
  /** Navigate back with View Transitions */
  back: () => void;
  /** Navigate forward with View Transitions */
  forward: () => void;
  /** Navigate to a delta in history with View Transitions */
  go: (delta: number) => void;
}

/**
 * Enhanced navigation hook with View Transitions API support
 */
export const useNavigateWithTransition = (): UseNavigateWithTransitionReturn => {
  const navigate = useNavigate();
  const { startViewTransition, isSupported, prefersReducedMotion } = useViewTransition();

  // Should use View Transitions?
  const shouldTransition = isSupported && !prefersReducedMotion;

  /**
   * Navigate with optional View Transition
   */
  const navigateWithTransition = useCallback(
    (to: To, options?: NavigateOptions) => {
      if (shouldTransition) {
        startViewTransition(() => {
          navigate(to, options);
        });
      } else {
        navigate(to, options);
      }
    },
    [navigate, startViewTransition, shouldTransition]
  );

  /**
   * Go back with View Transition
   */
  const back = useCallback(() => {
    if (shouldTransition) {
      startViewTransition(() => {
        navigate(-1);
      });
    } else {
      navigate(-1);
    }
  }, [navigate, startViewTransition, shouldTransition]);

  /**
   * Go forward with View Transition
   */
  const forward = useCallback(() => {
    if (shouldTransition) {
      startViewTransition(() => {
        navigate(1);
      });
    } else {
      navigate(1);
    }
  }, [navigate, startViewTransition, shouldTransition]);

  /**
   * Go to delta in history with View Transition
   */
  const go = useCallback(
    (delta: number) => {
      if (shouldTransition) {
        startViewTransition(() => {
          navigate(delta);
        });
      } else {
        navigate(delta);
      }
    },
    [navigate, startViewTransition, shouldTransition]
  );

  // Attach additional methods to the navigate function
  const navigateFn = navigateWithTransition as UseNavigateWithTransitionReturn;
  navigateFn.back = back;
  navigateFn.forward = forward;
  navigateFn.go = go;

  return navigateFn;
};

export default useNavigateWithTransition;
