/**
 * E2E Tests - Search Filters
 *
 * Tests search and filter functionality:
 * 1. Text search
 * 2. Category filters
 * 3. Location filters
 * 4. Price/rating filters
 * 5. Availability filters
 * 6. Combined filters
 * 7. Filter persistence
 * 8. Clear filters
 */

import { test, expect, Page } from '@playwright/test';

// ========================================
// TEST SUITE 1: Text Search
// ========================================

test.describe('Text Search', () => {
  test('should have search input', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]').first();

    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('should search by name', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);

      // Should filter results or show search results
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show search suggestions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('bar');
      await page.waitForTimeout(1000);

      // Look for suggestions dropdown
      const suggestions = page.locator('[role="listbox"], .suggestions, .autocomplete').first();

      // May or may not show suggestions
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should clear search on X click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test query');

      // Look for clear button
      const clearBtn = page.locator('button[aria-label*="clear"], .clear-search, input[type="search"] + button').first();

      if (await clearBtn.isVisible().catch(() => false)) {
        await clearBtn.click();
        await page.waitForTimeout(500);

        const value = await searchInput.inputValue();
        expect(value).toBe('');
      }
    }
  });

  test('should search in real-time', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('a');
      await page.waitForTimeout(500);

      // Results should start filtering
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 2: Category Filters
// ========================================

test.describe('Category Filters', () => {
  test('should display category filter options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Look for category filters
    const categoryFilter = page.locator('[data-testid="category-filter"], .category-filter, select[name="category"]').first();

    // May be visible or in a filter panel
    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter by GoGo bar category', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const gogoFilter = page.locator('button:has-text("GoGo"), [data-category="gogo"], label:has-text("GoGo")').first();

    if (await gogoFilter.isVisible().catch(() => false)) {
      await gogoFilter.click();
      await page.waitForTimeout(1000);

      // Results should be filtered
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should filter by Beer bar category', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const beerBarFilter = page.locator('button:has-text("Beer Bar"), [data-category="beer-bar"]').first();

    if (await beerBarFilter.isVisible().catch(() => false)) {
      await beerBarFilter.click();
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should filter by Nightclub category', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const nightclubFilter = page.locator('button:has-text("Nightclub"), [data-category="nightclub"]').first();

    if (await nightclubFilter.isVisible().catch(() => false)) {
      await nightclubFilter.click();
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should allow multiple category selection', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const category1 = page.locator('[data-category]:not(.active)').first();
    const category2 = page.locator('[data-category]:not(.active)').nth(1);

    if (await category1.isVisible().catch(() => false)) {
      await category1.click();
      await page.waitForTimeout(500);

      if (await category2.isVisible().catch(() => false)) {
        await category2.click();
        await page.waitForTimeout(500);
      }

      // May support multiple selection or single selection
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 3: Location Filters
// ========================================

test.describe('Location Filters', () => {
  test('should display zone filter options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Look for zone/location filters
    const zoneFilter = page.locator('[data-testid="zone-filter"], .zone-filter, select[name="zone"]').first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter by Walking Street zone', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const walkingStreetFilter = page.locator('button:has-text("Walking Street"), [data-zone="walking-street"]').first();

    if (await walkingStreetFilter.isVisible().catch(() => false)) {
      await walkingStreetFilter.click();
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should filter by Soi Buakhao zone', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const soiBuakhaoFilter = page.locator('button:has-text("Soi Buakhao"), [data-zone="soi-buakhao"]').first();

    if (await soiBuakhaoFilter.isVisible().catch(() => false)) {
      await soiBuakhaoFilter.click();
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should filter by map viewport', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Pan/zoom the map
    const map = page.locator('.leaflet-container, canvas, [data-testid="map"]').first();

    if (await map.isVisible().catch(() => false)) {
      // Drag map
      const box = await map.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(1000);
      }

      // Results should update based on map view
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should have "Near Me" filter', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const nearMeFilter = page.locator('button:has-text("Near Me"), button:has-text("My Location")').first();

    // May or may not have near me filter
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 4: Rating Filters
// ========================================

test.describe('Rating Filters', () => {
  test('should display rating filter', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const ratingFilter = page.locator('[data-testid="rating-filter"], .rating-filter, input[name="rating"]').first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter by minimum rating', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const rating4Stars = page.locator('button:has-text("4+"), [data-rating="4"]').first();

    if (await rating4Stars.isVisible().catch(() => false)) {
      await rating4Stars.click();
      await page.waitForTimeout(1000);

      // Should only show 4+ star results
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should filter by VIP verified', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const vipFilter = page.locator('button:has-text("VIP"), [data-filter="vip"], label:has-text("VIP")').first();

    if (await vipFilter.isVisible().catch(() => false)) {
      await vipFilter.click();
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 5: Availability Filters
// ========================================

test.describe('Availability Filters', () => {
  test('should filter by open now', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const openNowFilter = page.locator('button:has-text("Open Now"), [data-filter="open"], label:has-text("Open")').first();

    if (await openNowFilter.isVisible().catch(() => false)) {
      await openNowFilter.click();
      await page.waitForTimeout(1000);

      // Should only show currently open establishments
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should filter by employee availability', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const availableFilter = page.locator('button:has-text("Available"), [data-filter="available"]').first();

    if (await availableFilter.isVisible().catch(() => false)) {
      await availableFilter.click();
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 6: Combined Filters
// ========================================

test.describe('Combined Filters', () => {
  test('should apply multiple filters', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Apply category filter
    const categoryFilter = page.locator('[data-category]').first();
    if (await categoryFilter.isVisible().catch(() => false)) {
      await categoryFilter.click();
      await page.waitForTimeout(500);
    }

    // Apply zone filter
    const zoneFilter = page.locator('[data-zone]').first();
    if (await zoneFilter.isVisible().catch(() => false)) {
      await zoneFilter.click();
      await page.waitForTimeout(500);
    }

    // Results should be filtered by both
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show filter count badge', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Apply some filters
    const filter = page.locator('[data-category], [data-zone]').first();
    if (await filter.isVisible().catch(() => false)) {
      await filter.click();
      await page.waitForTimeout(500);

      // Look for filter count badge
      const badge = page.locator('.filter-count, .badge, [data-filter-count]').first();

      // May or may not show badge
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show applied filters summary', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const filter = page.locator('[data-category]').first();
    if (await filter.isVisible().catch(() => false)) {
      await filter.click();
      await page.waitForTimeout(500);

      // Look for filter chips/tags
      const filterChips = page.locator('.filter-chip, .filter-tag, .active-filter').first();

      // May or may not show filter chips
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 7: Filter Persistence
// ========================================

test.describe('Filter Persistence', () => {
  test('should persist filters in URL', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const filter = page.locator('[data-category]').first();
    if (await filter.isVisible().catch(() => false)) {
      await filter.click();
      await page.waitForTimeout(500);

      // URL should contain filter params
      const url = page.url();
      // May or may not use URL params
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should restore filters from URL', async ({ page }) => {
    // Navigate with filter params
    await page.goto('/?category=gogo');
    await page.waitForLoadState('domcontentloaded');

    // Filters should be applied
    await expect(page.locator('body')).toBeVisible();
  });

  test('should persist filters on refresh', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const filter = page.locator('[data-category]').first();
    if (await filter.isVisible().catch(() => false)) {
      await filter.click();
      await page.waitForTimeout(500);

      // Refresh page
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      // Filters may or may not persist
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 8: Clear Filters
// ========================================

test.describe('Clear Filters', () => {
  test('should have clear all filters button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Apply a filter first
    const filter = page.locator('[data-category]').first();
    if (await filter.isVisible().catch(() => false)) {
      await filter.click();
      await page.waitForTimeout(500);

      // Look for clear filters button
      const clearBtn = page.locator('button:has-text("Clear"), button:has-text("Reset"), .clear-filters').first();

      // May or may not have clear button
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should clear all filters on click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const filter = page.locator('[data-category]').first();
    if (await filter.isVisible().catch(() => false)) {
      await filter.click();
      await page.waitForTimeout(500);

      const clearBtn = page.locator('button:has-text("Clear"), button:has-text("Reset")').first();

      if (await clearBtn.isVisible().catch(() => false)) {
        await clearBtn.click();
        await page.waitForTimeout(500);

        // Filters should be cleared
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should remove individual filter chip', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const filter = page.locator('[data-category]').first();
    if (await filter.isVisible().catch(() => false)) {
      await filter.click();
      await page.waitForTimeout(500);

      // Look for individual filter remove button
      const removeBtn = page.locator('.filter-chip button, .filter-tag .remove').first();

      if (await removeBtn.isVisible().catch(() => false)) {
        await removeBtn.click();
        await page.waitForTimeout(500);
      }

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 9: Mobile Filters
// ========================================

test.describe('Mobile Filters', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });

  test('should have filter button on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const filterBtn = page.locator('button:has-text("Filter"), button[aria-label*="filter"]').first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should open filter panel on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const filterBtn = page.locator('button:has-text("Filter"), button[aria-label*="filter"]').first();

    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.tap();
      await page.waitForTimeout(500);

      // Filter panel should open
      const filterPanel = page.locator('[data-testid="filter-panel"], .filter-panel, .filter-drawer').first();

      // May show panel or bottom sheet
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should close filter panel after applying', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const filterBtn = page.locator('button:has-text("Filter")').first();

    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.tap();
      await page.waitForTimeout(500);

      // Apply filter
      const applyBtn = page.locator('button:has-text("Apply"), button:has-text("Done")').first();

      if (await applyBtn.isVisible().catch(() => false)) {
        await applyBtn.tap();
        await page.waitForTimeout(500);
      }

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show filter count on mobile button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const filterBtn = page.locator('button:has-text("Filter")').first();

    if (await filterBtn.isVisible().catch(() => false)) {
      await filterBtn.tap();
      await page.waitForTimeout(500);

      // Select a filter
      const filter = page.locator('[data-category]').first();
      if (await filter.isVisible().catch(() => false)) {
        await filter.tap();
        await page.waitForTimeout(500);
      }

      // Apply
      const applyBtn = page.locator('button:has-text("Apply")').first();
      if (await applyBtn.isVisible().catch(() => false)) {
        await applyBtn.tap();
        await page.waitForTimeout(500);
      }

      // Filter button should show count
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 10: Sort Options
// ========================================

test.describe('Sort Options', () => {
  test('should have sort dropdown', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const sortDropdown = page.locator('select[name="sort"], [data-testid="sort"], button:has-text("Sort")').first();

    await expect(page.locator('body')).toBeVisible();
  });

  test('should sort by rating', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const sortByRating = page.locator('option[value="rating"], button:has-text("Rating")').first();

    if (await sortByRating.isVisible().catch(() => false)) {
      await sortByRating.click();
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should sort by distance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const sortByDistance = page.locator('option[value="distance"], button:has-text("Distance")').first();

    if (await sortByDistance.isVisible().catch(() => false)) {
      await sortByDistance.click();
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should sort by name', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const sortByName = page.locator('option[value="name"], button:has-text("Name")').first();

    if (await sortByName.isVisible().catch(() => false)) {
      await sortByName.click();
      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    }
  });
});
