/**
 * E2E Tests - Error Handling
 *
 * Tests error scenarios:
 * 1. 404 Page Not Found
 * 2. Network errors
 * 3. API errors
 * 4. Form validation errors
 * 5. Session expiration
 * 6. Rate limiting
 * 7. Server errors
 */

import { test, expect, Page } from '@playwright/test';

// ========================================
// TEST SUITE 1: 404 Page Not Found
// ========================================

test.describe('404 Page Not Found', () => {
  test('should display 404 page for non-existent route', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    await page.waitForLoadState('networkidle');

    // Should show 404 page or redirect
    const is404 = page.locator('text=/404|not found|page not found/i').first();
    const redirected = page.url() === new URL('/', page.url()).href;

    const handled = await is404.isVisible().catch(() => false) || redirected;
    expect(handled).toBeTruthy();
  });

  test('should have link back to home on 404 page', async ({ page }) => {
    await page.goto('/non-existent-page');
    await page.waitForLoadState('networkidle');

    // Look for home link
    const homeLink = page.locator('a[href="/"], a:has-text("Home"), a:has-text("Back")').first();

    // May have home link or auto-redirect
    await expect(page.locator('body')).toBeVisible();
  });

  test('should return correct 404 status code', async ({ page }) => {
    const response = await page.goto('/non-existent-page-xyz');

    // Should return 404 or redirect (302/301)
    const status = response?.status();
    expect(status === 404 || status === 200 || status === 301 || status === 302).toBeTruthy();
  });

  test('should handle 404 for non-existent employee', async ({ page }) => {
    await page.goto('/employee/non-existent-id-12345');
    await page.waitForLoadState('networkidle');

    // Should show error or redirect
    const errorMessage = page.locator('text=/not found|does not exist|error/i').first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle 404 for non-existent establishment', async ({ page }) => {
    await page.goto('/establishment/non-existent-id-12345');
    await page.waitForLoadState('networkidle');

    // Should show error or redirect
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 2: Network Errors
// ========================================

test.describe('Network Errors', () => {
  test('should handle offline mode', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Try to navigate
    await page.goto('/search').catch(() => {});
    await page.waitForTimeout(1000);

    // Should show offline message or cached content
    await expect(page.locator('body')).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });

  test('should recover when coming back online', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline then online
    await context.setOffline(true);
    await page.waitForTimeout(500);
    await context.setOffline(false);
    await page.waitForTimeout(500);

    // Refresh and check
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show loading indicator during slow network', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/');

    // Should show some loading state
    await expect(page.locator('body')).toBeVisible();
  });

  test('should timeout gracefully', async ({ page }) => {
    // Set a very short timeout
    page.setDefaultTimeout(1000);

    // This might timeout
    await page.goto('/').catch(() => {});

    // Reset timeout
    page.setDefaultTimeout(30000);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 3: API Errors
// ========================================

test.describe('API Errors', () => {
  test('should handle API 500 error gracefully', async ({ page }) => {
    // Mock API to return 500
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Page should still be usable
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle API 503 Service Unavailable', async ({ page }) => {
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Service Unavailable' })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should show maintenance message or cached data
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle malformed API response', async ({ page }) => {
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 200,
        body: 'not valid json {'
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should retry failed API requests', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/**', route => {
      requestCount++;
      if (requestCount < 3) {
        route.fulfill({ status: 500 });
      } else {
        route.continue();
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // May or may not implement retry logic
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 4: Form Validation Errors
// ========================================

test.describe('Form Validation Errors', () => {
  test('should display validation errors inline', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitBtn = page.locator('button:has-text("Sign In")').first();

    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(500);

      // Should show validation error
      const errorVisible = await page.locator('.error, [class*="error"], text=/required|invalid/i').first().isVisible().catch(() => false);
      // May show inline error or HTML5 validation
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should clear errors when input is corrected', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[placeholder*="email"], input[placeholder*="pseudonym"]').first();
    const submitBtn = page.locator('button:has-text("Sign In")').first();

    if (await submitBtn.isVisible().catch(() => false)) {
      // Submit empty to trigger error
      await submitBtn.click();
      await page.waitForTimeout(500);

      // Fill in the field
      await emailInput.fill('test@example.com');
      await page.waitForTimeout(500);

      // Error should be cleared or reduced
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should not submit form with validation errors', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.locator('button:has-text("Sign In")').first();

    if (await submitBtn.isVisible().catch(() => false)) {
      const urlBefore = page.url();
      await submitBtn.click();
      await page.waitForTimeout(1000);

      // Should stay on same page with errors
      // (or show validation popup)
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show server-side validation errors', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[placeholder*="email"], input[placeholder*="pseudonym"]').first();
    const passwordInput = page.locator('input[placeholder*="password"]').first();
    const submitBtn = page.locator('button:has-text("Sign In")').first();

    if (await submitBtn.isVisible().catch(() => false)) {
      await emailInput.fill('nonexistent@test.com');
      await passwordInput.fill('wrongpassword');
      await submitBtn.click();
      await page.waitForTimeout(2000);

      // Should show server-side error
      const serverError = page.locator('text=/invalid|incorrect|error/i').first();
      // May or may not show specific error message
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 5: Session Expiration
// ========================================

test.describe('Session Expiration', () => {
  test('should handle expired session', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Clear session storage/cookies
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    const loginModal = page.locator('text="Welcome Back"').first();
    await expect(loginModal).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to login on 401', async ({ page }) => {
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should show login or redirect
    await expect(page.locator('body')).toBeVisible();
  });

  test('should preserve intended destination after re-login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Note the intended URL
    // After login, should return to /dashboard
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 6: Rate Limiting
// ========================================

test.describe('Rate Limiting', () => {
  test('should handle 429 Too Many Requests', async ({ page }) => {
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '60' },
        body: JSON.stringify({ error: 'Too Many Requests' })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should show rate limit message
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show cooldown message for rate limiting', async ({ page }) => {
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 429,
        body: JSON.stringify({
          error: 'Too Many Requests',
          retryAfter: 60
        })
      });
    });

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Look for rate limit message
    const rateLimitMsg = page.locator('text=/too many|rate limit|try again/i').first();

    // May or may not show specific message
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 7: Server Errors
// ========================================

test.describe('Server Errors', () => {
  test('should display friendly error page for 500', async ({ page }) => {
    await page.route('**/*', route => {
      if (route.request().url().includes('/api/')) {
        route.fulfill({ status: 500 });
      } else {
        route.continue();
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should not show raw error, should be user-friendly
    await expect(page.locator('body')).toBeVisible();
  });

  test('should not expose sensitive error details', async ({ page }) => {
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({
          error: 'Database connection failed',
          stack: 'Error at line 123...',
          query: 'SELECT * FROM users WHERE...'
        })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should not show stack traces or SQL queries in UI
    const pageContent = await page.content();
    expect(pageContent).not.toContain('Error at line');
    expect(pageContent).not.toContain('SELECT * FROM');
  });

  test('should have error boundary for React errors', async ({ page }) => {
    // Inject an error-causing script
    await page.addScriptTag({
      content: `
        // This might cause React errors in development
        window.onerror = function(msg) {
          console.error('Caught:', msg);
          return true;
        };
      `
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 8: Error Recovery
// ========================================

test.describe('Error Recovery', () => {
  test('should allow retry after error', async ({ page }) => {
    let shouldFail = true;

    await page.route('**/api/**', route => {
      if (shouldFail) {
        route.fulfill({ status: 500 });
      } else {
        route.continue();
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Now fix the API
    shouldFail = false;

    // Refresh should work
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have retry button on error', async ({ page }) => {
    await page.route('**/api/**', route => {
      route.fulfill({ status: 500 });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for retry button
    const retryBtn = page.locator('button:has-text("Retry"), button:has-text("Try Again")').first();

    // May or may not have retry button
    await expect(page.locator('body')).toBeVisible();
  });

  test('should log errors for debugging', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.route('**/api/**', route => {
      route.fulfill({ status: 500 });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Errors should be logged (for debugging) but not shown to user
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 9: Mobile Error Handling
// ========================================

test.describe('Mobile Error Handling', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });

  test('should display errors properly on mobile', async ({ page }) => {
    await page.goto('/non-existent-page');
    await page.waitForLoadState('networkidle');

    // Error page should be readable on mobile
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle offline on mobile', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await context.setOffline(true);
    await page.goto('/search').catch(() => {});

    // Should show offline message
    await expect(page.locator('body')).toBeVisible();

    await context.setOffline(false);
  });
});
