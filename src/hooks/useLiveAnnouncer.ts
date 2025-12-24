/**
 * useLiveAnnouncer Hook
 *
 * Provides screen reader announcements for async actions and dynamic content.
 * Creates and manages ARIA live regions for accessibility.
 *
 * WCAG 2.1 Level AAA: Status Messages (4.1.3)
 *
 * @example
 * ```tsx
 * const { announce, announcePolite, announceAssertive } = useLiveAnnouncer();
 *
 * // Polite announcement (waits for user to finish)
 * announcePolite('Item added to favorites');
 *
 * // Assertive announcement (interrupts immediately)
 * announceAssertive('Error: Failed to save');
 *
 * // With options
 * announce('Loading complete', { politeness: 'polite', clearAfter: 3000 });
 * ```
 */

import { useCallback, useEffect, useRef } from 'react';

export type AriaPoliteness = 'off' | 'polite' | 'assertive';

interface AnnounceOptions {
  /** Politeness level (default: 'polite') */
  politeness?: AriaPoliteness;
  /** Clear the announcement after this many ms (default: 1000) */
  clearAfter?: number;
  /** Whether to clear previous announcements first (default: true) */
  clearPrevious?: boolean;
}

interface LiveAnnouncerReturn {
  /** Announce a message with options */
  announce: (message: string, options?: AnnounceOptions) => void;
  /** Shorthand for polite announcements */
  announcePolite: (message: string) => void;
  /** Shorthand for assertive announcements */
  announceAssertive: (message: string) => void;
  /** Clear all current announcements */
  clear: () => void;
}

// Container ID for the live regions
const CONTAINER_ID = 'aria-live-container';
const POLITE_ID = 'aria-live-polite';
const ASSERTIVE_ID = 'aria-live-assertive';

/**
 * Create the live region container if it doesn't exist
 */
function ensureLiveRegionContainer(): void {
  if (typeof document === 'undefined') return;

  let container = document.getElementById(CONTAINER_ID);

  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.setAttribute('aria-hidden', 'false');

    // Create polite region
    const politeRegion = document.createElement('div');
    politeRegion.id = POLITE_ID;
    politeRegion.setAttribute('role', 'status');
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'true');
    politeRegion.className = 'sr-only';

    // Create assertive region
    const assertiveRegion = document.createElement('div');
    assertiveRegion.id = ASSERTIVE_ID;
    assertiveRegion.setAttribute('role', 'alert');
    assertiveRegion.setAttribute('aria-live', 'assertive');
    assertiveRegion.setAttribute('aria-atomic', 'true');
    assertiveRegion.className = 'sr-only';

    container.appendChild(politeRegion);
    container.appendChild(assertiveRegion);
    document.body.appendChild(container);
  }
}

/**
 * Hook for making screen reader announcements
 */
export function useLiveAnnouncer(): LiveAnnouncerReturn {
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ensure container exists on mount
  useEffect(() => {
    ensureLiveRegionContainer();

    return () => {
      // Clean up timeout on unmount
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Clear announcements from a specific region
   */
  const clearRegion = useCallback((regionId: string) => {
    const region = document.getElementById(regionId);
    if (region) {
      region.textContent = '';
    }
  }, []);

  /**
   * Clear all announcements
   */
  const clear = useCallback(() => {
    clearRegion(POLITE_ID);
    clearRegion(ASSERTIVE_ID);
  }, [clearRegion]);

  /**
   * Main announce function
   */
  const announce = useCallback((
    message: string,
    options: AnnounceOptions = {}
  ) => {
    const {
      politeness = 'polite',
      clearAfter = 1000,
      clearPrevious = true
    } = options;

    if (politeness === 'off' || !message) return;

    const regionId = politeness === 'assertive' ? ASSERTIVE_ID : POLITE_ID;
    const region = document.getElementById(regionId);

    if (!region) {
      ensureLiveRegionContainer();
      // Retry after container is created
      requestAnimationFrame(() => announce(message, options));
      return;
    }

    // Clear previous timeout
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }

    // Clear previous announcements if requested
    if (clearPrevious) {
      region.textContent = '';
      // Small delay to ensure screen readers pick up the change
      requestAnimationFrame(() => {
        region.textContent = message;
      });
    } else {
      region.textContent = message;
    }

    // Auto-clear after delay
    if (clearAfter > 0) {
      clearTimeoutRef.current = setTimeout(() => {
        clearRegion(regionId);
      }, clearAfter);
    }
  }, [clearRegion]);

  /**
   * Shorthand for polite announcements
   */
  const announcePolite = useCallback((message: string) => {
    announce(message, { politeness: 'polite' });
  }, [announce]);

  /**
   * Shorthand for assertive announcements
   */
  const announceAssertive = useCallback((message: string) => {
    announce(message, { politeness: 'assertive' });
  }, [announce]);

  return {
    announce,
    announcePolite,
    announceAssertive,
    clear
  };
}

export default useLiveAnnouncer;
