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

import { useCallback, useContext, useMemo } from 'react';
import {
  NavigateOptions,
  To,
  UNSAFE_NavigationContext,
} from 'react-router-dom';
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
 * Fallback navigation using window.location
 * Used when Router context is not available
 */
const createFallbackNavigate = () => {
  const navigate = (to: To | number, options?: NavigateOptions): void => {
    if (typeof window === 'undefined') return;

    if (typeof to === 'number') {
      window.history.go(to);
      return;
    }

    const path = typeof to === 'string' ? to : to.pathname || '/';

    if (options?.replace) {
      window.location.replace(path);
    } else {
      window.location.href = path;
    }
  };

  return navigate;
};

/**
 * Enhanced navigation hook with View Transitions API support
 * Includes fallback for when Router context is unavailable (Vite HMR edge cases)
 *
 * This implementation directly accesses the NavigationContext to avoid
 * the useNavigate hook which throws when context is unavailable.
 */
export const useNavigateWithTransition = (): UseNavigateWithTransitionReturn => {
  // Safely access the navigation context - useContext never throws
  const navigationContext = useContext(UNSAFE_NavigationContext);
  const { startViewTransition, isSupported, prefersReducedMotion } = useViewTransition();

  // Check if we have a valid router context
  const hasRouterContext = navigationContext != null && navigationContext.navigator != null;

  // Get the navigator from context (may be null)
  const navigator = navigationContext?.navigator;

  // Create the navigate function based on context availability
  const navigate = useMemo(() => {
    if (!hasRouterContext || !navigator) {
      // Fallback to window.location when outside router
      console.warn('[useNavigateWithTransition] Router context unavailable, using fallback navigation');
      return createFallbackNavigate();
    }

    // Use the navigator from context directly
    return (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigator.go(to);
      } else {
        const path = typeof to === 'string' ? to : to.pathname || '/';
        if (options?.replace) {
          navigator.replace(path, options?.state);
        } else {
          navigator.push(path, options?.state);
        }
      }
    };
  }, [hasRouterContext, navigator]);

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
