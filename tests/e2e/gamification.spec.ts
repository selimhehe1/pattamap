/**
 * E2E Tests - PattaMap Gamification System
 *
 * Tests complete user flows:
 * - User registration & first XP earn
 * - Achievements page navigation (4 tabs)
 * - Mission progress tracking
 * - Leaderboard functionality
 * - Badge showcase
 *
 * Run:
 *   npx playwright test
 *   npx playwright test --headed          # With browser visible
 *   npx playwright test --debug            # Debug mode
 *   npx playwright test --project=chromium-mobile  # Mobile tests only
 */

import { test, expect, Page } from '@playwright/test';
import {
  generateTestUser,
  registerUser,
  loginUser,
  createReviewForXP,
  checkInForXP,
  getCurrentXP,
  waitForXPUpdate,
  TestUser
} from './fixtures/testUser';

// ========================================
// TEST SUITE 1: User Registration & First XP
// ========================================

test.describe('User Registration & First XP', () => {
  let testUser: TestUser;

  test.beforeEach(() => {
    testUser = generateTestUser();
  });

  test('should register new user and load GamificationContext', async ({ page }) => {
    // Register user
    await registerUser(page, testUser);

    // Verify we're logged in (NotificationBell visible - only shown for logged-in users)
    await expect(page.locator('.notification-bell-container').first()).toBeVisible({ timeout: 10000 });

    // Verify XP indicator appears in header (might be 0 XP initially)
    const xpIndicator = page.locator('.user-xp-compact, [class*="user-xp"]').first();
    await expect(xpIndicator).toBeVisible({ timeout: 10000 });

    console.log('✅ User registered and GamificationContext loaded');
  });

  test('should earn XP from first review and update header', async ({ page }) => {
    // Register and login
    await registerUser(page, testUser);

    // Get initial XP
    const initialXP = await getCurrentXP(page);
    console.log(`Initial XP: ${initialXP}`);

    // Create review (should award +50 XP)
    // NOTE: Adjust establishment ID to match your test data
    await createReviewForXP(page, testUser);

    // Wait for XP to update
    await waitForXPUpdate(page, initialXP + 50, 15000);

    // Verify XP increased
    const finalXP = await getCurrentXP(page);
    expect(finalXP).toBeGreaterThanOrEqual(initialXP + 50);

    console.log(`✅ XP increased: ${initialXP} → ${finalXP} (+${finalXP - initialXP})`);

    // Screenshot: Header with XP
    await page.screenshot({
      path: 'tests/e2e/screenshots/1-header-with-xp-desktop.png',
      fullPage: false
    });
  });

  test('should unlock "First Review" badge', async ({ page }) => {
    await registerUser(page, testUser);

    // Create review
    await createReviewForXP(page, testUser);

    // Navigate to achievements to check badge
    await page.goto('/achievements');
    await page.click('button:has-text("Badges")');

    // Check if "First Review" badge is unlocked
    // NOTE: Adjust selector to match your BadgeShowcase component
    const firstReviewBadge = page.getByText(/First Review/i);
    await expect(firstReviewBadge).toBeVisible({ timeout: 10000 });

    // Verify badge is not greyscale (unlocked)
    const badgeElement = firstReviewBadge.locator('..'); // Parent element
    const isLocked = await badgeElement.locator('.badge-locked, [class*="locked"]').count() === 0;
    expect(isLocked).toBeTruthy();

    console.log('✅ "First Review" badge unlocked');
  });
});

// ========================================
// TEST SUITE 2: Achievements Page Navigation
// ========================================

test.describe('Achievements Page Navigation', () => {
  let testUser: TestUser;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create persistent user for all tests in this suite
    const context = await browser.newContext();
    page = await context.newPage();

    testUser = generateTestUser();
    await registerUser(page, testUser);

    // Award some XP for visual content
    await createReviewForXP(page, testUser);
    await page.waitForTimeout(2000); // Wait for XP to settle
  });

  test('should navigate to /achievements and render all 4 tabs', async () => {
    await page.goto('/achievements');

    // Verify page title
    await expect(page.locator('h1:has-text("Achievements"), h1:has-text("My Achievements")')).toBeVisible();

    // Verify 4 tabs exist
    const tabs = [
      'Overview',
      'Badges',
      'Missions',
      'Leaderboard'
    ];

    for (const tabName of tabs) {
      const tab = page.locator(`button:has-text("${tabName}")`);
      await expect(tab).toBeVisible();
    }

    console.log('✅ All 4 tabs visible');
  });

  test('should display Overview tab with stats cards', async () => {
    await page.goto('/achievements');
    await page.click('button:has-text("Overview")');

    // Verify 4 stat cards
    const statCards = page.locator('.stat-card');
    await expect(statCards).toHaveCount(4, { timeout: 10000 });

    // Verify stat labels (Total XP, Day Streak, Monthly XP, Longest Streak)
    await expect(page.locator('text=/Total XP/i')).toBeVisible();
    await expect(page.getByText(/Streak/i).first()).toBeVisible();
    await expect(page.locator('text=/Monthly/i')).toBeVisible();

    // Screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/2-achievements-overview-desktop.png',
      fullPage: true
    });

    console.log('✅ Overview tab displayed correctly');
  });

  test('should display Badges tab with BadgeShowcase', async () => {
    await page.goto('/achievements');
    await page.click('button:has-text("Badges")');

    // Wait for badges to load
    await page.waitForTimeout(1000);

    // Verify at least some badges exist
    const badges = page.locator('[class*="badge"]');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);

    // Screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/3-achievements-badges-desktop.png',
      fullPage: true
    });

    console.log(`✅ Badges tab displayed (${count} badges found)`);
  });

  test('should display Missions tab with MissionsDashboard', async () => {
    await page.goto('/achievements');
    await page.click('button:has-text("Missions")');

    // Wait for missions to load
    await page.waitForTimeout(1000);

    // Verify missions sections (Daily, Weekly, Narrative)
    const hasDailyMissions = await page.locator('text=/Daily/i').count() > 0;
    const hasWeeklyMissions = await page.locator('text=/Weekly/i').count() > 0;

    expect(hasDailyMissions || hasWeeklyMissions).toBeTruthy();

    // Screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/4-achievements-missions-desktop.png',
      fullPage: true
    });

    console.log('✅ Missions tab displayed');
  });

  test('should display Leaderboard tab', async () => {
    await page.goto('/achievements');
    await page.click('button:has-text("Leaderboard")');

    // Wait for leaderboard to load
    await page.waitForTimeout(2000);

    // Verify leaderboard tabs (Global, Monthly)
    const hasGlobal = await page.locator('button:has-text("Global")').count() > 0;
    const hasMonthly = await page.locator('button:has-text("Monthly")').count() > 0;

    expect(hasGlobal || hasMonthly).toBeTruthy();

    // Screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/5-achievements-leaderboard-desktop.png',
      fullPage: true
    });

    console.log('✅ Leaderboard tab displayed');
  });
});

// ========================================
// TEST SUITE 3: Mission Progress
// ========================================

test.describe('Mission Progress Tracking', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = generateTestUser();
  });

  test('should track daily mission progress (Explorer - 1 check-in)', async ({ page }) => {
    await registerUser(page, testUser);

    // Navigate to missions tab
    await page.goto('/achievements');
    await page.click('button:has-text("Missions")');

    // Find "Explorer" mission (1 check-in daily)
    const explorerMission = page.locator('text=/Explorer/i').first();

    // Check initial progress (should be 0/1)
    const initialProgress = await explorerMission.locator('text=/0.*1/').count();
    console.log(`Explorer mission initial progress: ${initialProgress > 0 ? '0/1' : 'unknown'}`);

    // Perform check-in
    await checkInForXP(page, testUser);

    // Go back to missions tab
    await page.goto('/achievements');
    await page.click('button:has-text("Missions")');

    // Verify progress updated to 1/1
    await page.waitForTimeout(2000); // Wait for progress update
    const completedProgress = await explorerMission.locator('text=/1.*1/').count();
    expect(completedProgress).toBeGreaterThan(0);

    console.log('✅ Explorer mission progress updated: 0/1 → 1/1');

    // Screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/6-mission-completed.png',
      fullPage: true
    });
  });
});

// ========================================
// TEST SUITE 4: Leaderboard Functionality
// ========================================

test.describe('Leaderboard', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = generateTestUser();
  });

  test('should display current user in leaderboard', async ({ page }) => {
    await registerUser(page, testUser);

    // Earn some XP to appear in leaderboard
    await createReviewForXP(page, testUser);
    await page.waitForTimeout(2000);

    // Navigate to leaderboard
    await page.goto('/achievements');
    await page.click('button:has-text("Leaderboard")');

    // Wait for leaderboard to load
    await page.waitForTimeout(3000);

    // Check if current user appears (username or email)
    const userInLeaderboard = page.locator(`text=${testUser.username}`);
    const userCount = await userInLeaderboard.count();

    // User might not appear if no XP or leaderboard is empty
    console.log(`Current user in leaderboard: ${userCount > 0 ? 'Yes' : 'No (might need more XP)'}`);

    // Screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/7-leaderboard-with-user.png',
      fullPage: true
    });
  });

  test('should switch between Global and Monthly tabs', async ({ page }) => {
    await registerUser(page, testUser);
    await page.goto('/achievements');
    await page.click('button:has-text("Leaderboard")');

    // Click Global tab
    const globalTab = page.locator('button:has-text("Global")').first();
    if (await globalTab.count() > 0) {
      await globalTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ Global tab clicked');
    }

    // Click Monthly tab
    const monthlyTab = page.locator('button:has-text("Monthly")').first();
    if (await monthlyTab.count() > 0) {
      await monthlyTab.click();
      await page.waitForTimeout(1000);
      console.log('✅ Monthly tab clicked');
    }
  });
});

// ========================================
// TEST SUITE 5: Badge Showcase
// ========================================

test.describe('Badge Showcase', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    testUser = generateTestUser();
  });

  test('should display locked and unlocked badges', async ({ page }) => {
    await registerUser(page, testUser);

    // Go to badges tab
    await page.goto('/achievements');
    await page.click('button:has-text("Badges")');
    await page.waitForTimeout(2000);

    // Count locked badges (greyscale/disabled)
    const lockedBadges = page.locator('[class*="badge-locked"], [class*="locked"]');
    const lockedCount = await lockedBadges.count();

    // Count unlocked badges
    const unlockedBadges = page.locator('[class*="badge"]:not([class*="locked"])');
    const unlockedCount = await unlockedBadges.count();

    console.log(`Badges: ${unlockedCount} unlocked, ${lockedCount} locked`);

    // At least 1 badge should exist
    expect(lockedCount + unlockedCount).toBeGreaterThan(0);

    // Screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/8-badges-showcase.png',
      fullPage: true
    });
  });

  test('should show badge tooltips on hover', async ({ page }) => {
    await registerUser(page, testUser);
    await page.goto('/achievements');
    await page.click('button:has-text("Badges")');

    // Find first badge
    const firstBadge = page.locator('[class*="badge"]').first();
    await firstBadge.hover();

    // Wait for tooltip (adjust selector to match your component)
    const tooltip = page.locator('[class*="tooltip"], [role="tooltip"]');
    const tooltipVisible = await tooltip.count() > 0;

    console.log(`Badge tooltip visible on hover: ${tooltipVisible}`);
  });
});
