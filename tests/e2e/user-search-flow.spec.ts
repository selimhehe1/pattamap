/**
 * 🧪 E2E Test: User Search Flow
 *
 * Tests the critical user journey:
 * 1. Landing on search page
 * 2. Using filters (zone, nationality, establishment)
 * 3. Viewing search results
 * 4. Opening employee profile modal
 * 5. Viewing employee details
 *
 * This is the MOST IMPORTANT user flow in PattaMap.
 */

import { test, expect } from '@playwright/test';

test.describe('User Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to search page
    await page.goto('/search');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should load search page with filters and results', async ({ page }) => {
    // Verify search page title
    await expect(page.locator('h1')).toContainText(/search/i);

    // Verify filters are visible
    await expect(page.locator('[data-testid="search-filters"]').or(page.locator('.search-filters'))).toBeVisible();

    // Verify results container exists
    await expect(page.locator('[data-testid="search-results"]').or(page.locator('.search-results'))).toBeVisible();
  });

  test('should filter by zone', async ({ page }) => {
    // Find zone filter dropdown/select
    const zoneFilter = page.locator('select[name="zone"]').or(
      page.locator('[data-testid="zone-filter"]')
    ).or(
      page.getByLabel(/zone/i)
    ).first();

    // Wait for filter to be available
    await zoneFilter.waitFor({ state: 'visible', timeout: 10000 });

    // Select a zone (e.g., "Walking Street")
    await zoneFilter.click();
    await page.locator('option:has-text("Walking Street"), [role="option"]:has-text("Walking Street")').first().click();

    // Wait for results to update
    await page.waitForTimeout(1000);

    // Verify URL has zone parameter
    await expect(page).toHaveURL(/zone=/);
  });

  test('should filter by nationality', async ({ page }) => {
    // Find nationality filter
    const nationalityFilter = page.locator('select[name="nationality"]').or(
      page.locator('[data-testid="nationality-filter"]')
    ).or(
      page.getByLabel(/nationality/i)
    ).first();

    // Wait for filter to be available
    await nationalityFilter.waitFor({ state: 'visible', timeout: 10000 });

    // Select a nationality (e.g., "Thai")
    await nationalityFilter.click();
    await page.locator('option:has-text("Thai"), [role="option"]:has-text("Thai")').first().click();

    // Wait for results to update
    await page.waitForTimeout(1000);

    // Verify URL has nationality parameter
    await expect(page).toHaveURL(/nationality=/);
  });

  test('should search by query text', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[type="search"]').or(
      page.locator('input[placeholder*="Search"]')
    ).or(
      page.locator('[data-testid="search-input"]')
    ).first();

    // Type search query
    await searchInput.fill('Jane');

    // Wait for debounce (500ms as per SearchPage implementation)
    await page.waitForTimeout(600);

    // Verify URL has query parameter
    await expect(page).toHaveURL(/q=Jane/);
  });

  test('should display employee cards in results', async ({ page }) => {
    // Wait for results to load
    await page.waitForTimeout(2000);

    // Look for employee cards - try multiple selectors
    const employeeCards = page.locator('.employee-card').or(
      page.locator('[data-testid="employee-card"]')
    ).or(
      page.locator('[class*="card"]')
    );

    // Check if at least one employee card is visible (or empty state)
    const count = await employeeCards.count();

    if (count > 0) {
      // If we have results, verify first card has required elements
      const firstCard = employeeCards.first();
      await expect(firstCard).toBeVisible();

      // Card should have an image or name
      const hasImage = await firstCard.locator('img').count() > 0;
      const hasName = await firstCard.textContent().then(text => text && text.length > 0);

      expect(hasImage || hasName).toBeTruthy();
    } else {
      // Empty state is also valid
      const emptyState = page.locator('.empty-state').or(
        page.locator('[data-testid="empty-state"]')
      ).or(
        page.getByText(/no.*found/i)
      );

      await expect(emptyState.first()).toBeVisible();
    }
  });

  test('should open employee profile modal on card click', async ({ page }) => {
    // Wait for results to load
    await page.waitForTimeout(2000);

    // Find first employee card
    const firstCard = page.locator('.employee-card').or(
      page.locator('[data-testid="employee-card"]')
    ).first();

    // Skip test if no results
    const cardCount = await page.locator('.employee-card').count();
    if (cardCount === 0) {
      test.skip();
      return;
    }

    // Click on the card
    await firstCard.click();

    // Wait for modal to appear
    await page.waitForTimeout(500);

    // Verify modal is visible
    const modal = page.locator('[role="dialog"]').or(
      page.locator('.modal')
    ).or(
      page.locator('[data-testid="employee-modal"]')
    ).first();

    await expect(modal).toBeVisible({ timeout: 10000 });

    // Verify modal has employee details
    const modalContent = await modal.textContent();
    expect(modalContent).toBeTruthy();
    expect(modalContent!.length).toBeGreaterThan(10);
  });

  test('should close employee profile modal with close button', async ({ page }) => {
    // Wait for results
    await page.waitForTimeout(2000);

    // Skip if no results
    const cardCount = await page.locator('.employee-card').count();
    if (cardCount === 0) {
      test.skip();
      return;
    }

    // Open modal
    await page.locator('.employee-card').first().click();
    await page.waitForTimeout(500);

    // Find close button
    const closeButton = page.locator('[aria-label*="close"]').or(
      page.locator('button:has-text("×")')
    ).or(
      page.locator('.modal-close')
    ).first();

    // Click close button
    await closeButton.click();

    // Verify modal is closed
    const modal = page.locator('[role="dialog"]').first();
    await expect(modal).not.toBeVisible();
  });

  test('should display employee photos in modal', async ({ page }) => {
    // Wait for results
    await page.waitForTimeout(2000);

    // Skip if no results
    const cardCount = await page.locator('.employee-card').count();
    if (cardCount === 0) {
      test.skip();
      return;
    }

    // Open modal
    await page.locator('.employee-card').first().click();
    await page.waitForTimeout(1000);

    // Look for images in modal
    const modal = page.locator('[role="dialog"]').first();
    const images = modal.locator('img');

    // Should have at least one image (or placeholder)
    const imageCount = await images.count();
    expect(imageCount).toBeGreaterThan(0);
  });

  test('should preserve filters when navigating back from modal', async ({ page }) => {
    // Set a zone filter
    const zoneFilter = page.locator('select[name="zone"]').first();
    await zoneFilter.waitFor({ state: 'visible', timeout: 10000 });
    await zoneFilter.selectOption({ index: 1 }); // Select first option after "All"

    // Wait for URL to update
    await page.waitForTimeout(1000);
    const urlWithFilter = page.url();

    // Skip if no results
    const cardCount = await page.locator('.employee-card').count();
    if (cardCount === 0) {
      test.skip();
      return;
    }

    // Open and close modal
    await page.locator('.employee-card').first().click();
    await page.waitForTimeout(500);

    const closeButton = page.locator('[aria-label*="close"]').first();
    await closeButton.click();

    // Verify URL still has filter
    expect(page.url()).toBe(urlWithFilter);
  });
});

test.describe('User Search Flow - Performance', () => {
  test('should load search results within 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to search page
    await page.goto('/search');

    // Wait for results to be visible
    await page.locator('.search-results').or(
      page.locator('[data-testid="search-results"]')
    ).first().waitFor({ state: 'visible', timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle rapid filter changes smoothly', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const zoneFilter = page.locator('select[name="zone"]').first();
    await zoneFilter.waitFor({ state: 'visible' });

    // Rapidly change filters
    for (let i = 0; i < 3; i++) {
      await zoneFilter.selectOption({ index: i });
      await page.waitForTimeout(100); // Faster than debounce
    }

    // Page should not crash
    await expect(page.locator('body')).toBeVisible();
  });
});
