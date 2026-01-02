/**
 * useViewTransition Hook
 * Phase 3 Modernisation - View Transitions API
 *
 * Provides native View Transitions API support with graceful fallback.
 * Uses the browser's native animation capabilities for smooth page/modal transitions.
 *
 * Features:
 * - Native View Transitions API (Chrome 111+, Safari 18+)
 * - Fallback to callback-only for unsupported browsers
 * - Respects prefers-reduced-motion
 * - TypeScript type safety
 *
 * Usage:
 * ```tsx
 * const { startViewTransition, isSupported } = useViewTransition();
 *
 * // For navigation
 * startViewTransition(() => {
 *   navigate('/new-page');
 * });
 *
 * // For modal open/close
 * startViewTransition(() => {
 *   setIsOpen(true);
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';

// Type definitions for View Transitions API
// Use native types if available, otherwise define our own
interface ViewTransitionLike {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

/** Type guard for checking View Transitions API support */
const hasViewTransition = (doc: Document): doc is Document & { startViewTransition: (callback: () => void | Promise<void>) => ViewTransitionLike } => {
  return 'startViewTransition' in doc && typeof (doc as { startViewTransition?: unknown }).startViewTransition === 'function';
};

// Check if native ViewTransition type exists
// @internal Reserved for future type-safe startViewTransition usage
type _ViewTransitionResult = typeof document extends { startViewTransition: infer T }
  ? T extends (cb: () => void) => infer R ? R : ViewTransitionLike
  : ViewTransitionLike;

export interface UseViewTransitionReturn {
  /** Whether the browser supports View Transitions API */
  isSupported: boolean;
  /** Whether reduced motion is preferred (disables animations) */
  prefersReducedMotion: boolean;
  /** Start a view transition with the given callback */
  startViewTransition: (callback: () => void | Promise<void>) => ViewTransitionLike | null;
  /** Start a view transition and wait for it to complete */
  startViewTransitionAsync: (callback: () => void | Promise<void>) => Promise<void>;
}

/**
 * Check if View Transitions API is supported
 */
const checkSupport = (): boolean => {
  if (typeof document === 'undefined') return false;
  return hasViewTransition(document);
};

/**
 * Check if user prefers reduced motion
 */
const checkReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Custom hook for View Transitions API
 */
export const useViewTransition = (): UseViewTransitionReturn => {
  const isSupported = useMemo(() => checkSupport(), []);
  const prefersReducedMotion = useMemo(() => checkReducedMotion(), []);

  /**
   * Start a view transition
   * Falls back to immediate callback execution if unsupported or reduced motion
   */
  const startViewTransition = useCallback(
    (callback: () => void | Promise<void>): ViewTransitionLike | null => {
      // Skip animation if reduced motion preferred
      if (prefersReducedMotion) {
        callback();
        return null;
      }

      // Use View Transitions API if supported
      if (isSupported && hasViewTransition(document)) {
        return document.startViewTransition(callback);
      }

      // Fallback: just run the callback
      callback();
      return null;
    },
    [isSupported, prefersReducedMotion]
  );

  /**
   * Start a view transition and wait for completion
   * Useful for chaining operations after transition finishes
   */
  const startViewTransitionAsync = useCallback(
    async (callback: () => void | Promise<void>): Promise<void> => {
      const transition = startViewTransition(callback);

      if (transition) {
        await transition.finished;
      }
    },
    [startViewTransition]
  );

  return {
    isSupported,
    prefersReducedMotion,
    startViewTransition,
    startViewTransitionAsync,
  };
};

/**
 * Utility to add view-transition-name to an element
 * Use sparingly - only on elements that should animate independently
 */
export const withViewTransitionName = (
  name: string
): React.CSSProperties => ({
  viewTransitionName: name,
});

/**
 * Common view transition names for consistency
 */
export const VIEW_TRANSITION_NAMES = {
  PAGE: 'page-content',
  HEADER: 'main-header',
  SIDEBAR: 'main-sidebar',
  MODAL: 'modal-content',
  MODAL_BACKDROP: 'modal-backdrop',
  CARD: 'card',
  AVATAR: 'avatar',
  TITLE: 'page-title',
} as const;

export default useViewTransition;
