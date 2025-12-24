/**
 * Screen Reader Announcement Utility
 *
 * Provides a standalone function for making screen reader announcements.
 * Can be used anywhere (not limited to React components).
 *
 * WCAG 2.1 Level AAA: Status Messages (4.1.3)
 *
 * @module announce
 */

// Container IDs for live regions
const CONTAINER_ID = 'aria-live-container';
const POLITE_ID = 'aria-live-polite';
const ASSERTIVE_ID = 'aria-live-assertive';

/**
 * Ensure the live region container exists in the DOM
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

// Track clear timeout globally
let clearTimeoutId: ReturnType<typeof setTimeout> | null = null;

export type AriaPoliteness = 'off' | 'polite' | 'assertive';

interface AnnounceOptions {
  /** Politeness level (default: 'polite') */
  politeness?: AriaPoliteness;
  /** Clear the announcement after this many ms (default: 1000) */
  clearAfter?: number;
}

/**
 * Announce a message to screen readers
 *
 * @example
 * ```ts
 * import { announce } from '../utils/announce';
 *
 * // Polite announcement (default)
 * announce('Item added to favorites');
 *
 * // Assertive announcement (interrupts)
 * announce('Error: Failed to save', { politeness: 'assertive' });
 * ```
 */
export function announce(
  message: string,
  options: AnnounceOptions = {}
): void {
  const {
    politeness = 'polite',
    clearAfter = 1000
  } = options;

  if (typeof document === 'undefined') return;
  if (politeness === 'off' || !message) return;

  ensureLiveRegionContainer();

  const regionId = politeness === 'assertive' ? ASSERTIVE_ID : POLITE_ID;
  const region = document.getElementById(regionId);

  if (!region) return;

  // Clear previous timeout
  if (clearTimeoutId) {
    clearTimeout(clearTimeoutId);
  }

  // Clear and set new message (small delay for screen readers to pick up change)
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });

  // Auto-clear after delay
  if (clearAfter > 0) {
    clearTimeoutId = setTimeout(() => {
      region.textContent = '';
    }, clearAfter);
  }
}

/**
 * Shorthand for polite announcements
 */
export function announcePolite(message: string): void {
  announce(message, { politeness: 'polite' });
}

/**
 * Shorthand for assertive announcements (interrupts current speech)
 */
export function announceAssertive(message: string): void {
  announce(message, { politeness: 'assertive' });
}

/**
 * Clear all current announcements
 */
export function clearAnnouncements(): void {
  if (typeof document === 'undefined') return;

  const polite = document.getElementById(POLITE_ID);
  const assertive = document.getElementById(ASSERTIVE_ID);

  if (polite) polite.textContent = '';
  if (assertive) assertive.textContent = '';
}

export default announce;
