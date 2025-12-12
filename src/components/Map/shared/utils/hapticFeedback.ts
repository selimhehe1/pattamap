/**
 * Utility functions for haptic feedback (vibration)
 * Used to provide tactile feedback during drag & drop operations on mobile devices
 */

import { logger } from '../../../../utils/logger';

/**
 * Vibration patterns for different actions
 */
export const HAPTIC_PATTERNS: Record<string, number | number[]> = {
  /** Short tap - drag start, selection */
  tap: 10,
  /** Double tap - successful action */
  success: [10, 50, 10],
  /** Triple tap - error or blocked action */
  error: [50, 30, 50, 30, 50],
  /** Long press - entering edit mode */
  longPress: 50,
  /** Medium tap - drag over valid target */
  dragOver: 5,
  /** Short burst - swap action */
  swap: [20, 20, 20],
};

export type HapticPattern = keyof typeof HAPTIC_PATTERNS;

/**
 * Check if the Vibration API is available
 */
export function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Trigger haptic feedback with a predefined pattern
 * Silently fails if vibration is not supported
 */
export function triggerHaptic(pattern: HapticPattern): void {
  if (!isVibrationSupported()) {
    return;
  }

  try {
    navigator.vibrate(HAPTIC_PATTERNS[pattern]);
  } catch (error) {
    logger.debug('Vibration API error', error);
  }
}

/**
 * Trigger haptic feedback with a custom pattern
 * @param pattern - Single duration or array of durations in ms
 */
export function triggerCustomHaptic(pattern: number | number[]): void {
  if (!isVibrationSupported()) {
    return;
  }

  try {
    navigator.vibrate(pattern);
  } catch (error) {
    logger.debug('Vibration API error', error);
  }
}

/**
 * Cancel any ongoing vibration
 */
export function cancelHaptic(): void {
  if (!isVibrationSupported()) {
    return;
  }

  try {
    navigator.vibrate(0);
  } catch (error) {
    logger.debug('Failed to cancel vibration', error);
  }
}
