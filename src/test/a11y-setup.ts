/**
 * Accessibility Testing Setup for Vitest
 *
 * Uses axe-core for automated accessibility testing.
 * Run with: npm test -- --grep "a11y"
 */

import { configureAxe, toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';

// Extend Vitest matchers with axe
expect.extend(toHaveNoViolations);

// Configure axe with PattaMap-specific rules
export const axe = configureAxe({
  rules: {
    // Disable rules that don't apply to our use case
    'region': { enabled: false }, // We use custom layouts
    'landmark-one-main': { enabled: true },
    'page-has-heading-one': { enabled: true },
  },
});

// Helper to run axe on a container
export async function checkA11y(container: Element): Promise<void> {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}

// Common test wrapper for accessibility tests
export function describeA11y(name: string, fn: () => void): void {
  describe(`[a11y] ${name}`, fn);
}
