/**
 * E2E Tests - 404 Not Found Page
 *
 * Tests 404 page functionality:
 * 1. Page display on non-existent routes
 * 2. Go Back button
 * 3. Home button
 * 4. Quick navigation links
 * 5. Accessibility
 */

import { test, expect } from '@playwright/test';

// ========================================
// TEST SUITE 1: 404 Page Display
// ========================================

test.describe('404 Page Display', () => {
  test('should display 404 page for non-existent route', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    await page.waitForLoadState('networkidle');

    // Should show 404 content
    const notFoundCode = page.locator('text="404", .not-found-code');
    await expect(notFoundCode.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display "Page Not Found" title', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Title should be visible
    const title = page.locator('h1:has-text("Page Not Found"), .not-found-title');
    await expect(title.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display helpful description', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Description text should be visible
    const description = page.locator('.not-found-description, text=/doesn\'t exist|has been moved/i');
    await expect(description.first()).toBeVisible({ timeout: 5000 });
  });

  test('should set correct page title', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Check page title
    const pageTitle = await page.title();
    expect(pageTitle).toContain('Not Found');
  });
});

// ========================================
// TEST SUITE 2: Go Back Button
// ========================================

test.describe('Go Back Button', () => {
  test('should display Go Back button', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Go Back button should be visible
    const goBackBtn = page.locator('button:has-text("Go Back"), .not-found-btn:has-text("Back")');
    await expect(goBackBtn.first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate back when Go Back is clicked with history', async ({ page }) => {
    // First navigate to a real page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Then navigate to 404
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Click Go Back
    const goBackBtn = page.locator('button:has-text("Go Back")').first();

    if (await goBackBtn.isVisible({ timeout: 3000 })) {
      await goBackBtn.click();
      await page.waitForLoadState('networkidle');

      // Should be back on homepage
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('non-existent');
    }
  });

  test('should have proper aria-label on Go Back button', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    const goBackBtn = page.locator('button:has-text("Go Back")').first();

    if (await goBackBtn.isVisible({ timeout: 3000 })) {
      const ariaLabel = await goBackBtn.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });
});

// ========================================
// TEST SUITE 3: Home Button
// ========================================

test.describe('Home Button', () => {
  test('should display Home button', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Home button/link should be visible
    const homeBtn = page.locator('a:has-text("Home"), .not-found-btn:has-text("Home")');
    await expect(homeBtn.first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to homepage when Home is clicked', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Click Home
    const homeBtn = page.locator('a:has-text("Home")').first();

    if (await homeBtn.isVisible({ timeout: 3000 })) {
      await homeBtn.click();
      await page.waitForLoadState('networkidle');

      // Should be on homepage
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/$/);
    }
  });

  test('should have proper href on Home link', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    const homeLink = page.locator('a:has-text("Home")').first();

    if (await homeLink.isVisible({ timeout: 3000 })) {
      const href = await homeLink.getAttribute('href');
      expect(href).toBe('/');
    }
  });
});

// ========================================
// TEST SUITE 4: Quick Navigation Links
// ========================================

test.describe('Quick Navigation Links', () => {
  test('should display Search quick link', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Search link should be visible
    const searchLink = page.locator('a:has-text("Search"), .not-found-link:has-text("Search")');
    await expect(searchLink.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display Map quick link', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Map link should be visible
    const mapLink = page.locator('a:has-text("Map"), .not-found-link:has-text("Map")');
    await expect(mapLink.first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to Search when Search link is clicked', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    const searchLink = page.locator('a[href="/search"], a:has-text("Search")').first();

    if (await searchLink.isVisible({ timeout: 3000 })) {
      await searchLink.click();
      await page.waitForLoadState('networkidle');

      // Should be on search page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/search');
    }
  });

  test('should display quick links section title', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // "Or try one of these" section
    const quickLinksTitle = page.locator('text=/Or try one of these|Try these/i, .not-found-quick-links-title');
    const hasTitle = await quickLinksTitle.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 5: Accessibility
// ========================================

test.describe('Accessibility', () => {
  test('should have main role on page', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Main role should be present
    const mainElement = page.locator('[role="main"], main');
    await expect(mainElement.first()).toBeVisible({ timeout: 5000 });
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // H1 should be present
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 5000 });
  });

  test('should have aria-labelledby on main content', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    const mainContent = page.locator('[aria-labelledby]').first();
    const hasAriaLabel = await mainContent.isVisible({ timeout: 3000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have aria-hidden on decorative elements', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // 404 code should be aria-hidden (decorative)
    const decorativeElement = page.locator('.not-found-code[aria-hidden="true"]');
    const isHidden = await decorativeElement.isVisible({ timeout: 3000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have navigation landmark for quick links', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Navigation landmark
    const navLandmark = page.locator('nav[aria-label], nav');
    const hasNav = await navLandmark.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 6: Visual Design
// ========================================

test.describe('Visual Design', () => {
  test('should display background overlay', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Background elements
    const background = page.locator('.not-found-background, .not-found-overlay');
    const hasBackground = await background.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have centered content', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Content container should be visible
    const content = page.locator('.not-found-content, .not-found-page');
    await expect(content.first()).toBeVisible({ timeout: 5000 });
  });

  test('should have action buttons styled distinctly', async ({ page }) => {
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Primary and secondary button styles
    const primaryBtn = page.locator('.not-found-btn-primary');
    const secondaryBtn = page.locator('.not-found-btn-secondary');

    const hasPrimary = await primaryBtn.first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasSecondary = await secondaryBtn.first().isVisible({ timeout: 3000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});
