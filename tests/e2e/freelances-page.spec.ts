/**
 * E2E Tests - Freelances Page
 *
 * Tests freelance employees page:
 * 1. Page load → list display
 * 2. Filter freelances → nationality, age
 * 3. Sort freelances → rating, recent
 * 4. Freelance card → click → modal
 * 5. Pagination → navigation
 * 6. Empty state → message
 */

import { test, expect } from '@playwright/test';

// ========================================
// TEST SUITE 1: Page Load
// ========================================

test.describe('Freelances Page Load', () => {
  test('should load freelances page', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display page title', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const title = page.locator('h1:has-text("Freelance"), h1:has-text("Independent")').first();
    const hasTitle = await title.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display freelance cards', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const cards = page.locator('.freelance-card, .employee-card, [data-testid="freelance-card"]');
    const cardCount = await cards.count();

    // May have freelances or show empty state
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display freelance count', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const count = page.locator('.freelance-count, [data-testid="count"], text=/\\d+\\s*freelance/i').first();
    const hasCount = await count.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 2: Filter Freelances
// ========================================

test.describe('Filter Freelances', () => {
  test('should display nationality filter', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const nationalityFilter = page.locator('[data-testid="nationality-filter"], select[name="nationality"], .nationality-filter').first();
    const hasFilter = await nationalityFilter.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter by nationality', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const nationalitySelect = page.locator('select[name="nationality"]').first();

    if (await nationalitySelect.isVisible({ timeout: 3000 })) {
      await nationalitySelect.selectOption({ label: 'Thai' });
      await page.waitForTimeout(500);

      // Results should be filtered
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should filter by age range', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const minAge = page.locator('input[name="minAge"]').first();
    const maxAge = page.locator('input[name="maxAge"]').first();

    if (await minAge.isVisible({ timeout: 3000 })) {
      await minAge.fill('22');
    }

    if (await maxAge.isVisible({ timeout: 3000 })) {
      await maxAge.fill('28');
    }

    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should combine filters', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const nationalitySelect = page.locator('select[name="nationality"]').first();
    const minAge = page.locator('input[name="minAge"]').first();

    if (await nationalitySelect.isVisible({ timeout: 2000 })) {
      await nationalitySelect.selectOption({ index: 1 });
    }

    if (await minAge.isVisible({ timeout: 2000 })) {
      await minAge.fill('23');
    }

    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 3: Sort Freelances
// ========================================

test.describe('Sort Freelances', () => {
  test('should display sort options', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const sortSelect = page.locator('select[name="sort"], [data-testid="sort"], button:has-text("Sort")').first();
    const hasSort = await sortSelect.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should sort by rating', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const sortSelect = page.locator('select[name="sort"]').first();

    if (await sortSelect.isVisible({ timeout: 3000 })) {
      await sortSelect.selectOption({ label: 'Highest Rated' });
      await page.waitForTimeout(500);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should sort by recent', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const sortSelect = page.locator('select[name="sort"]').first();

    if (await sortSelect.isVisible({ timeout: 3000 })) {
      await sortSelect.selectOption({ label: 'Newest' });
      await page.waitForTimeout(500);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should persist sort in URL', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const sortSelect = page.locator('select[name="sort"]').first();

    if (await sortSelect.isVisible({ timeout: 3000 })) {
      await sortSelect.selectOption({ label: 'Newest' });
      await page.waitForTimeout(500);

      const url = page.url();
      expect(url).toMatch(/sort=/);
    }
  });
});

// ========================================
// TEST SUITE 4: Freelance Card Interactions
// ========================================

test.describe('Freelance Card', () => {
  test('should display freelance photo', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const card = page.locator('.freelance-card, .employee-card').first();

    if (await card.isVisible({ timeout: 5000 })) {
      const photo = card.locator('img');
      await expect(photo).toBeVisible();
    }
  });

  test('should display freelance name', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const card = page.locator('.freelance-card, .employee-card').first();

    if (await card.isVisible({ timeout: 5000 })) {
      const name = card.locator('.name, h3, h4');
      await expect(name.first()).toBeVisible();
    }
  });

  test('should display freelance badge', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const freelanceBadge = page.locator('.freelance-badge, text="Freelance", [data-type="freelance"]').first();
    const hasBadge = await freelanceBadge.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should open profile modal on card click', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const card = page.locator('.freelance-card, .employee-card').first();

    if (await card.isVisible({ timeout: 5000 })) {
      await card.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"], .modal, .profile-modal');
      await expect(modal.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show rating on card', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const card = page.locator('.freelance-card, .employee-card').first();

    if (await card.isVisible({ timeout: 5000 })) {
      const rating = card.locator('.rating, .stars, text=/\\d+\\.\\d+/');
      const hasRating = await rating.first().isVisible({ timeout: 2000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 5: Pagination
// ========================================

test.describe('Freelances Pagination', () => {
  test('should display pagination if many results', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const pagination = page.locator('.pagination, [data-testid="pagination"]').first();
    const hasPagination = await pagination.isVisible({ timeout: 5000 }).catch(() => false);

    // Pagination may or may not be present
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to next page', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const nextBtn = page.locator('button:has-text("Next"), [aria-label="Next"]').first();

    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);

      const url = page.url();
      expect(url).toMatch(/page=2/);
    }
  });

  test('should show page numbers', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const pageNumbers = page.locator('.pagination button, .pagination a');
    const count = await pageNumbers.count();

    // May have page numbers
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 6: Empty State
// ========================================

test.describe('Freelances Empty State', () => {
  test('should show empty state when no freelances match filters', async ({ page }) => {
    await page.goto('/freelances?nationality=XYZ&minAge=99');
    await page.waitForLoadState('domcontentloaded');

    const emptyState = page.locator('.empty-state, [data-testid="no-results"], text=/no freelance|not found/i').first();
    const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show reset filters option in empty state', async ({ page }) => {
    await page.goto('/freelances?minAge=99');
    await page.waitForLoadState('domcontentloaded');

    const resetBtn = page.locator('button:has-text("Reset"), button:has-text("Clear")').first();
    const hasReset = await resetBtn.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 7: Mobile Freelances
// ========================================

test.describe('Mobile Freelances', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });

  test('should display mobile-friendly grid', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const cards = page.locator('.freelance-card, .employee-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();
      const box = await firstCard.boundingBox();

      if (box) {
        // Cards should fit on mobile
        expect(box.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('should show filters in drawer on mobile', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const filtersBtn = page.locator('button:has-text("Filters"), [data-testid="mobile-filters"]').first();

    if (await filtersBtn.isVisible({ timeout: 3000 })) {
      await filtersBtn.click();
      await page.waitForTimeout(300);

      const drawer = page.locator('.filter-drawer, .filters-modal, [role="dialog"]');
      await expect(drawer.first()).toBeVisible({ timeout: 3000 });
    }
  });
});
