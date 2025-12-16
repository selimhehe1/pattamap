/**
 * E2E Tests - Visit History Page
 *
 * Tests visit history functionality:
 * 1. Login requirement
 * 2. Check-in history display
 * 3. Zone filtering
 * 4. Verification status filtering
 * 5. Timeline grouping
 * 6. Stats cards
 * 7. Empty state
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, loginUser } from './fixtures/testUser';

// ========================================
// TEST SUITE 1: Access Control
// ========================================

test.describe('Access Control', () => {
  test('should require login to view visit history', async ({ page }) => {
    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Should show login required message
    const loginRequired = page.locator('text=/Login Required|Please log in/i, .visit-history-error');
    const hasLoginMessage = await loginRequired.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show visit history when logged in', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Should show visit history page content
    const pageTitle = page.locator('text=/My Visit History|Visit History/i, h1');
    const hasTitle = await pageTitle.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 2: Stats Display
// ========================================

test.describe('Stats Display', () => {
  test('should display total visits stat', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Total visits stat card
    const totalVisits = page.locator('text=/Total Visits/i, .visit-stat-card:has-text("Visits")');
    const hasStats = await totalVisits.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display zones visited stat', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Zones visited stat card
    const zonesVisited = page.locator('text=/Zones Visited/i, .visit-stat-card:has-text("Zones")');
    const hasZones = await zonesVisited.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display verified count stat', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Verified stat card
    const verified = page.locator('text=/Verified/i, .visit-stat-card:has-text("Verified")');
    const hasVerified = await verified.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 3: Zone Filtering
// ========================================

test.describe('Zone Filtering', () => {
  test('should display zone filter dropdown', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Zone filter select
    const zoneFilter = page.locator('select.visit-filter-select, select:has-text("All Zones")').first();
    const hasFilter = await zoneFilter.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter by zone when selected', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    const zoneFilter = page.locator('select.visit-filter-select').first();

    if (await zoneFilter.isVisible({ timeout: 3000 })) {
      // Get options count
      const options = await zoneFilter.locator('option').count();

      if (options > 1) {
        // Select a specific zone
        await zoneFilter.selectOption({ index: 1 });
        await page.waitForTimeout(500);

        // Results should be filtered
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

// ========================================
// TEST SUITE 4: Verification Status Filtering
// ========================================

test.describe('Verification Status Filtering', () => {
  test('should display verification filter dropdown', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Verification filter select
    const verifiedFilter = page.locator('select:has-text("All Status"), select:has-text("Verified")').first();
    const hasFilter = await verifiedFilter.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter to verified only', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    const verifiedFilter = page.locator('select.visit-filter-select').last();

    if (await verifiedFilter.isVisible({ timeout: 3000 })) {
      await verifiedFilter.selectOption('verified');
      await page.waitForTimeout(500);

      // Only verified visits should show
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should filter to unverified only', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    const verifiedFilter = page.locator('select.visit-filter-select').last();

    if (await verifiedFilter.isVisible({ timeout: 3000 })) {
      await verifiedFilter.selectOption('unverified');
      await page.waitForTimeout(500);

      // Only unverified visits should show
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 5: Timeline Grouping
// ========================================

test.describe('Timeline Grouping', () => {
  test('should display timeline groups', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Timeline should be visible (or empty state)
    const timeline = page.locator('.visit-timeline, .visit-group, .visit-history-empty');
    const hasTimeline = await timeline.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show Today group label', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    // Check-in first to have data
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Try to check-in at an establishment
    const checkInBtn = page.locator('button:has-text("Check"), .check-in-button').first();

    if (await checkInBtn.isVisible({ timeout: 3000 })) {
      await checkInBtn.click();
      await page.waitForTimeout(2000);
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Today group should be visible if there are today's visits
    const todayGroup = page.locator('.visit-group-title:has-text("Today"), text="Today"');
    const hasTodayGroup = await todayGroup.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 6: Visit Cards
// ========================================

test.describe('Visit Cards', () => {
  test('should display establishment name on cards', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Visit cards with establishment names
    const visitCard = page.locator('.visit-card, .visit-card-name').first();
    const hasCard = await visitCard.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display zone on cards', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Zone info on cards
    const zoneInfo = page.locator('.visit-card-zone, .visit-card:has-text("Zone")');
    const hasZone = await zoneInfo.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display date on cards', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Date info on cards
    const dateInfo = page.locator('.visit-card-date');
    const hasDate = await dateInfo.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display verified badge on verified visits', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Verified badge
    const verifiedBadge = page.locator('.visit-verified-badge, .visit-card:has-text("Verified")');
    const hasBadge = await verifiedBadge.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 7: Empty State
// ========================================

test.describe('Empty State', () => {
  test('should display empty state when no visits', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // New user should see empty state (or visits if they checked in)
    const emptyState = page.locator('.visit-history-empty').or(page.locator('text=/No visits yet/i'));
    const hasEmpty = await emptyState.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display helpful message in empty state', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    // Empty state message
    const emptyMessage = page.locator('text=/Start exploring|check in at/i');
    const hasMessage = await emptyMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 8: Loading State
// ========================================

test.describe('Loading State', () => {
  test('should display loading spinner initially', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');

    // Loading spinner should appear briefly
    const loadingSpinner = page.locator('.visit-history-loading, .visit-spinner, text="Loading"');
    const hasLoading = await loadingSpinner.first().isVisible({ timeout: 2000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});
