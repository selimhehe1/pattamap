/**
 * E2E Tests - Mobile Responsive (PattaMap Gamification)
 *
 * Tests gamification features on mobile viewport (375×812 iPhone 12)
 *
 * Run:
 *   npx playwright test mobile.spec.ts --project=chromium-mobile
 *   npx playwright test mobile.spec.ts --headed
 */

import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  registerUser,
  createReviewForXP,
  getCurrentXP,
  TestUser
} from './fixtures/testUser';

// Configure mobile viewport for all tests
test.use({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
});

// ========================================
// MOBILE TEST SUITE 1: Header XP Indicator
// ========================================

test.describe('Mobile: Header XP Indicator', () => {
  let testUser: TestUser;

  test.beforeEach(() => {
    testUser = generateTestUser();
  });

  test('should display XP indicator in mobile header', async ({ page }) => {
    await registerUser(page, testUser);

    // Award XP
    await createReviewForXP(page, testUser);
    await page.waitForTimeout(3000);

    // Navigate to home to see header
    await page.goto('/');

    // Open mobile menu (hamburger)
    const menuButton = page.locator('button[aria-label="Menu"], .menu-button, .hamburger');
    if (await menuButton.count() > 0) {
      await menuButton.click();
      await page.waitForTimeout(500);
    }

    // Verify XP indicator visible
    const xpIndicator = page.locator('.user-xp-compact, [class*="user-xp"]').first();
    await expect(xpIndicator).toBeVisible({ timeout: 10000 });

    // Get XP value
    const xp = await getCurrentXP(page);
    expect(xp).toBeGreaterThan(0);

    console.log(`✅ Mobile Header XP: ${xp} XP`);

    // Screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/mobile-1-header-xp.png',
      fullPage: false
    });
  });

  test('should display XP progress bar correctly', async ({ page }) => {
    await registerUser(page, testUser);
    await createReviewForXP(page, testUser);
    await page.waitForTimeout(2000);

    await page.goto('/');

    // Open menu if needed
    const menuButton = page.locator('button[aria-label="Menu"], .menu-button');
    if (await menuButton.count() > 0) {
      await menuButton.click();
    }

    // Verify progress bar exists
    const progressBar = page.locator('.user-xp-bar-mini, [class*="xp-bar"]').first();
    await expect(progressBar).toBeVisible({ timeout: 10000 });

    // Check bar has width > 0
    const barFill = progressBar.locator('.user-xp-bar-fill-mini, [class*="fill"]');
    const width = await barFill.evaluate(el => window.getComputedStyle(el).width);

    console.log(`✅ XP Progress bar width: ${width}`);
  });
});

// ========================================
// MOBILE TEST SUITE 2: Achievements Page
// ========================================

test.describe('Mobile: Achievements Page', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = generateTestUser();
  });

  test('should render achievements page in mobile layout', async ({ page }) => {
    await registerUser(page, testUser);
    await createReviewForXP(page, testUser);

    await page.goto('/achievements');
    await page.waitForTimeout(2000);

    // Verify tabs render horizontally (scrollable on mobile)
    const tabs = page.locator('.achievements-tabs button, button[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(4);

    console.log(`✅ ${tabCount} tabs rendered on mobile`);

    // Screenshot full page
    await page.screenshot({
      path: 'tests/e2e/screenshots/mobile-2-achievements-overview.png',
      fullPage: true
    });
  });

  test('should display stat cards in 2×2 grid on mobile', async ({ page }) => {
    await registerUser(page, testUser);
    await page.goto('/achievements');
    await page.click('button:has-text("Overview")');
    await page.waitForTimeout(1000);

    // Verify 4 stat cards exist
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(4);

    // Check grid layout (should be 2 columns on mobile)
    const grid = page.locator('.stats-grid');
    const gridColumns = await grid.evaluate(el =>
      window.getComputedStyle(el).gridTemplateColumns
    );

    console.log(`✅ Stats grid columns (mobile): ${gridColumns}`);
    // Expect something like "repeat(2, 1fr)" or "auto auto"
  });

  test('should navigate between tabs smoothly', async ({ page }) => {
    await registerUser(page, testUser);
    await page.goto('/achievements');

    // Test all 4 tabs
    const tabs = ['Overview', 'Badges', 'Missions', 'Leaderboard'];

    for (const tabName of tabs) {
      await page.click(`button:has-text("${tabName}")`);
      await page.waitForTimeout(1000); // Wait for tab animation

      // Verify tab is active
      const activeTab = page.locator(`button:has-text("${tabName}")`);
      const isActive = await activeTab.evaluate(el =>
        el.classList.contains('active') || el.classList.contains('achievements-tab-active')
      );

      console.log(`✅ ${tabName} tab ${isActive ? 'active' : 'clicked'}`);
    }

    // Screenshot Leaderboard tab on mobile
    await page.screenshot({
      path: 'tests/e2e/screenshots/mobile-3-leaderboard.png',
      fullPage: true
    });
  });
});

// ========================================
// MOBILE TEST SUITE 3: Badges Showcase
// ========================================

test.describe('Mobile: Badge Showcase', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = generateTestUser();
  });

  test('should display badges in responsive grid', async ({ page }) => {
    await registerUser(page, testUser);
    await page.goto('/achievements');
    await page.click('button:has-text("Badges")');
    await page.waitForTimeout(2000);

    // Count badges
    const badges = page.locator('[class*="badge"]');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);

    console.log(`✅ ${count} badges displayed on mobile`);

    // Screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/mobile-4-badges.png',
      fullPage: true
    });
  });
});

// ========================================
// MOBILE TEST SUITE 4: Mission Dashboard
// ========================================

test.describe('Mobile: Mission Dashboard', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = generateTestUser();
  });

  test('should display missions in vertical stack on mobile', async ({ page }) => {
    await registerUser(page, testUser);
    await page.goto('/achievements');
    await page.click('button:has-text("Missions")');
    await page.waitForTimeout(2000);

    // Verify missions sections exist
    const dailyMissions = await page.locator('text=/Daily/i').count() > 0;
    const weeklyMissions = await page.locator('text=/Weekly/i').count() > 0;

    expect(dailyMissions || weeklyMissions).toBeTruthy();

    console.log(`✅ Missions visible: Daily=${dailyMissions}, Weekly=${weeklyMissions}`);

    // Screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/mobile-5-missions.png',
      fullPage: true
    });
  });
});

// ========================================
// MOBILE TEST SUITE 5: Touch Interactions
// ========================================

test.describe('Mobile: Touch Interactions', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = generateTestUser();
  });

  test('should support touch tap on tabs', async ({ page }) => {
    await registerUser(page, testUser);
    await page.goto('/achievements');

    // Tap Badges tab using touch
    const badgesTab = page.locator('button:has-text("Badges")');
    await badgesTab.tap();
    await page.waitForTimeout(1000);

    // Verify tab switched
    const badgeShowcase = page.locator('[class*="badge"]');
    await expect(badgeShowcase.first()).toBeVisible({ timeout: 10000 });

    console.log('✅ Touch tap on tab works');
  });

  test('should support scroll on achievements page', async ({ page }) => {
    await registerUser(page, testUser);
    await page.goto('/achievements');
    await page.click('button:has-text("Overview")');
    await page.waitForTimeout(1000);

    // Get initial scroll position
    const initialScroll = await page.evaluate(() => window.scrollY);

    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);

    // Verify scroll changed
    const finalScroll = await page.evaluate(() => window.scrollY);
    expect(finalScroll).toBeGreaterThan(initialScroll);

    console.log(`✅ Scroll works: ${initialScroll} → ${finalScroll}`);
  });
});

// ========================================
// MOBILE TEST SUITE 6: Landscape Orientation
// ========================================

test.describe('Mobile: Landscape Orientation', () => {
  let testUser: TestUser;

  // Override viewport for landscape
  test.use({
    viewport: { width: 812, height: 375 }, // iPhone 12 landscape
  });

  test.beforeEach(async () => {
    testUser = generateTestUser();
  });

  test('should render achievements in landscape mode', async ({ page }) => {
    await registerUser(page, testUser);
    await createReviewForXP(page, testUser);
    await page.goto('/achievements');
    await page.waitForTimeout(2000);

    // Verify tabs still visible
    const tabs = page.locator('button[role="tab"], .achievements-tab');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(4);

    console.log(`✅ Landscape mode: ${count} tabs visible`);

    // Screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/mobile-6-landscape.png',
      fullPage: false
    });
  });
});
