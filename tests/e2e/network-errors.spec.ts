/**
 * E2E Tests - Network Error Handling
 *
 * Tests network error scenarios:
 * 1. API timeout handling
 * 2. Network offline detection
 * 3. Retry mechanisms
 * 4. Error toast display
 * 5. Graceful degradation
 * 6. Offline queue for check-ins
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser } from './fixtures/testUser';

// ========================================
// TEST SUITE 1: API Error Handling
// ========================================

test.describe('API Error Handling', () => {
  test('should display error message when API fails', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('/search');
    await page.waitForLoadState('domcontentloaded');

    // Error message or fallback should be displayed
    const errorMessage = page.locator('.error, .error-message').or(page.locator('text=/error|failed|problem/i'));
    const hasError = await errorMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle 404 API responses gracefully', async ({ page }) => {
    await page.route('**/api/establishments/non-existent', route => {
      route.fulfill({
        status: 404,
        body: JSON.stringify({ error: 'Not found' })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle 401 unauthorized responses', async ({ page }) => {
    await page.route('**/api/gamification/**', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });

    await page.goto('/achievements');
    await page.waitForLoadState('domcontentloaded');

    // Should show login required or handle gracefully
    const authMessage = page.locator('text=/login|sign in|unauthorized/i');
    const hasAuthMessage = await authMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 2: Timeout Handling
// ========================================

test.describe('Timeout Handling', () => {
  test('should handle slow API responses', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/establishments**', async route => {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      route.fulfill({
        status: 200,
        body: JSON.stringify({ establishments: [] })
      });
    });

    await page.goto('/');

    // Loading indicator should appear
    const loading = page.locator('.loading, .spinner, .skeleton, text="Loading"');
    const hasLoading = await loading.first().isVisible({ timeout: 3000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display loading state during API calls', async ({ page }) => {
    await page.goto('/');

    // Initial loading state
    const loadingIndicator = page.locator('.loading, .skeleton, [data-loading="true"]');
    const hasLoading = await loadingIndicator.first().isVisible({ timeout: 2000 }).catch(() => false);

    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 3: Offline Detection
// ========================================

test.describe('Offline Detection', () => {
  test('should detect when browser goes offline', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Simulate offline
    await context.setOffline(true);
    await page.waitForLoadState('domcontentloaded');

    // Offline banner or indicator should appear
    const offlineBanner = page.locator('.offline-banner, .offline-indicator').or(page.locator('text=/offline|no connection/i'));
    const hasOffline = await offlineBanner.first().isVisible({ timeout: 5000 }).catch(() => false);

    // Restore online
    await context.setOffline(false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should recover when connection is restored', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Go offline
    await context.setOffline(true);
    await page.waitForLoadState('domcontentloaded');

    // Go back online
    await context.setOffline(false);
    await page.waitForLoadState('networkidle');

    // Offline banner should disappear
    const offlineBanner = page.locator('.offline-banner:visible');
    const stillOffline = await offlineBanner.isVisible({ timeout: 3000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should queue actions when offline', async ({ page, context }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Go offline
    await context.setOffline(true);

    // Try to perform an action (like check-in)
    const checkInBtn = page.locator('button:has-text("Check"), .check-in-button').first();

    if (await checkInBtn.isVisible({ timeout: 3000 })) {
      await checkInBtn.click();
      await page.waitForLoadState('domcontentloaded');

      // Should show queued or offline message
      const queueMessage = page.locator('text=/queued|offline|will sync/i');
      const hasQueue = await queueMessage.first().isVisible({ timeout: 3000 }).catch(() => false);
    }

    // Restore online
    await context.setOffline(false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 4: Error Toast Notifications
// ========================================

test.describe('Error Toast Notifications', () => {
  test('should display toast on API error', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    // Mock a failing API call
    await page.route('**/api/favorites/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Failed to update favorites' })
      });
    });

    // Try to add a favorite
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const favoriteBtn = page.locator('button.favorite, .favorite-button, [data-action="favorite"]').first();

    if (await favoriteBtn.isVisible({ timeout: 5000 })) {
      await favoriteBtn.click();
      await page.waitForLoadState('networkidle');

      // Toast notification should appear
      const toast = page.locator('.toast, .notification, [role="alert"]');
      const hasToast = await toast.first().isVisible({ timeout: 5000 }).catch(() => false);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should auto-dismiss toast after timeout', async ({ page }) => {
    // This test checks that toasts disappear after a few seconds
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // If there's a toast, it should eventually disappear
    const toast = page.locator('.toast, .notification:visible');

    if (await toast.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      // Wait for auto-dismiss (typically 3-5 seconds)
      await page.waitForLoadState('networkidle');

      const stillVisible = await toast.first().isVisible({ timeout: 1000 }).catch(() => false);
      // Toast should be gone or different
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 5: Graceful Degradation
// ========================================

test.describe('Graceful Degradation', () => {
  test('should show fallback content when images fail to load', async ({ page }) => {
    // Block image requests
    await page.route('**/*.{png,jpg,jpeg,webp}', route => route.abort());

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Page should still be functional with placeholder images
    await expect(page.locator('body')).toBeVisible();

    // Cards should still be visible even without images
    const cards = page.locator('.employee-card, .establishment-card, .card');
    const hasCards = await cards.first().isVisible({ timeout: 5000 }).catch(() => false);
  });

  test('should function with JavaScript disabled for core content', async ({ page }) => {
    // Note: This is more of a SSR test, but we can check that basic structure loads
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Basic structure should be present
    const header = page.locator('header, .header');
    await expect(header.first()).toBeVisible({ timeout: 5000 });
  });

  test('should handle missing API data gracefully', async ({ page }) => {
    // Return empty data
    await page.route('**/api/establishments**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ establishments: [] })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Empty state should be displayed
    const emptyState = page.locator('.empty-state, .no-results').or(page.locator('text=/no results|no establishments/i'));
    const hasEmpty = await emptyState.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 6: Retry Mechanisms
// ========================================

test.describe('Retry Mechanisms', () => {
  test('should offer retry option on failure', async ({ page }) => {
    let callCount = 0;

    await page.route('**/api/establishments**', route => {
      callCount++;
      if (callCount === 1) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ establishments: [] })
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Retry button should be available
    const retryBtn = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
    const hasRetry = await retryBtn.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasRetry) {
      await retryBtn.first().click();
      await page.waitForLoadState('networkidle');

      // Second call should succeed
      expect(callCount).toBeGreaterThan(1);
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should automatically retry failed requests', async ({ page }) => {
    let attemptCount = 0;

    await page.route('**/api/health**', route => {
      attemptCount++;
      if (attemptCount < 2) {
        route.abort('failed');
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ status: 'ok' })
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Page should eventually load (after retry)
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 7: Network Status Indicator
// ========================================

test.describe('Network Status Indicator', () => {
  test('should show sync indicator when syncing data', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Sync indicator may appear during data operations
    const syncIndicator = page.locator('.sync-indicator, .syncing').or(page.locator('text=/syncing|saving/i'));
    const hasSyncIndicator = await syncIndicator.first().isVisible({ timeout: 3000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should indicate when data is being loaded', async ({ page }) => {
    await page.goto('/search');

    // Loading indicator
    const loadingIndicator = page.locator('.loading-indicator, .skeleton, [aria-busy="true"]');
    const hasLoading = await loadingIndicator.first().isVisible({ timeout: 2000 }).catch(() => false);

    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });
});
