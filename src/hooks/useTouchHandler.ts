import { useCallback } from 'react';

/**
 * useTouchHandler - Unified touch and mouse event handling
 *
 * Provides consistent interaction handling across desktop and mobile devices.
 * Fixes common issues:
 * - 300ms click delay on mobile
 * - Touch events not recognized on iPad/Android
 * - Inconsistent behavior between devices
 *
 * Features:
 * - Unified onMouseDown/onTouchStart handling
 * - Prevents ghost clicks
 * - Optional haptic feedback on mobile
 * - Respects user's reduced motion preference
 *
 * @example
 * const { handlePointerDown } = useTouchHandler(onBarClick, { haptic: true });
 *
 * <button
 *   onMouseDown={handlePointerDown}
 *   onTouchStart={handlePointerDown}
 *   style={{ touchAction: 'none' }}
 * >
 *   Click me
 * </button>
 */

interface UseTouchHandlerOptions {
  /** Enable haptic feedback on touch (mobile only) */
  haptic?: boolean;
  /** Prevent default behavior (useful for preventing scroll) */
  preventDefault?: boolean;
}

export function useTouchHandler(
  callback: (e: React.MouseEvent | React.TouchEvent) => void,
  options: UseTouchHandlerOptions = {}
) {
  const { haptic = true, preventDefault = false } = options;

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Prevent default if requested (e.g., to prevent scroll on drag)
      if (preventDefault) {
        e.preventDefault();
      }

      // Stop propagation to prevent multiple handlers firing
      e.stopPropagation();

      // Haptic feedback for touch events (mobile only)
      if (haptic && 'ontouchstart' in window && 'vibrate' in navigator) {
        // Light tap: 10ms vibration
        // Check if user hasn't disabled vibration
        try {
          navigator.vibrate(10);
        } catch (err) {
          // Vibration API might be disabled or unavailable
          console.debug('Haptic feedback not available');
        }
      }

      // Execute callback
      callback(e);
    },
    [callback, haptic, preventDefault]
  );

  return {
    handlePointerDown,
    // Helper to add to component props
    pointerProps: {
      onMouseDown: handlePointerDown,
      onTouchStart: handlePointerDown,
      style: { touchAction: 'none' } as React.CSSProperties
    }
  };
}

/**
 * Helper function to check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}
