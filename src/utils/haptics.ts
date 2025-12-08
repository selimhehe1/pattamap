/**
 * Haptic Feedback Utility
 * Phase 3B - Framer Motion Animations
 *
 * Provides vibration feedback for mobile devices using Vibration API.
 * Gracefully degrades on desktop (no-op).
 *
 * Usage:
 * ```tsx
 * import { haptic } from './utils/haptics';
 *
 * const handleClick = () => {
 *   haptic.light();
 *   // ... your logic
 * };
 * ```
 */

/**
 * Check if vibration is supported
 */
const isSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

/**
 * Vibrate with pattern
 */
const vibrate = (pattern: number | number[]): void => {
  if (!isSupported()) return;

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    // Silently fail if vibration not supported or blocked
    // eslint-disable-next-line no-console
    console.debug('Haptic feedback not available:', error);
  }
};

/**
 * Haptic feedback presets
 */
export const haptic = {
  /**
   * Light tap (10ms)
   * Use for: Buttons, toggles, minor interactions
   */
  light: (): void => vibrate(10),

  /**
   * Medium tap (50ms)
   * Use for: Important buttons, confirmations
   */
  medium: (): void => vibrate(50),

  /**
   * Heavy tap (100ms)
   * Use for: Errors, critical actions
   */
  heavy: (): void => vibrate(100),

  /**
   * Success pattern (3 short bursts)
   * Use for: Successful submissions, adds to favorites
   */
  success: (): void => vibrate([50, 50, 50]),

  /**
   * Error pattern (2 long bursts)
   * Use for: Form errors, failed actions
   */
  error: (): void => vibrate([100, 50, 100]),

  /**
   * Warning pattern (1 long + 1 short)
   * Use for: Warnings, confirmations needed
   */
  warning: (): void => vibrate([100, 50, 50]),

  /**
   * Selection pattern (2 very short)
   * Use for: Item selection, navigation
   */
  selection: (): void => vibrate([20, 30, 20]),

  /**
   * Cancel vibration
   */
  cancel: (): void => {
    if (isSupported()) {
      navigator.vibrate(0);
    }
  },
};

export default haptic;
