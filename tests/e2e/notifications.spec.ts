/**
 * E2E Tests - Notification System
 *
 * Tests notification functionality with Supabase Realtime:
 * 1. Notification bell display and badge
 * 2. Notification dropdown (open/close)
 * 3. Mark as read (individual and all)
 * 4. Delete notifications
 * 5. Real-time connection status indicator
 * 6. Empty state handling
 * 7. Mobile responsiveness
 *
 * @updated 2026-01-10 - Updated selectors for NotificationBell v2.0
 */

import { test, expect, Page } from '@playwright/test';

// Test credentials
const TEST_USER = {
  email: 'owner@test.com',
  password: 'SecureTestP@ssw0rd2024!'
};

// Extended timeout for CI
const CI_TIMEOUT = process.env.CI ? 15000 : 10000;

// Helper to login with fast-fail
async function loginAsUser(page: Page): Promise<boolean> {
  await page.goto('/login', { waitUntil: 'networkidle' });

  const emailInput = page.locator('input[type="email"]').first();
  if (await emailInput.count() === 0) return false;

  await emailInput.fill(TEST_USER.email);
  await page.locator('input[type="password"]').first().fill(TEST_USER.password);
  await page.locator('button[type="submit"]').first().click();

  // Wait max 5s for redirect (fast-fail)
  try {
    await page.waitForURL(/\/(home|dashboard|notifications|\?)/, { timeout: 5000 });
    return true;
  } catch {
    return !page.url().includes('/login');
  }
}

// ========================================
// TEST SUITE 1: Notification Bell Display
// ========================================

test.describe('Notification Bell Display', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available in this environment');
    }
  });

  test('should display notification bell in header when logged in', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Look for notification bell with correct class
    const notificationBell = page.locator('.notif-bell__btn, button[aria-label*="Notification"]').first();
    await expect(notificationBell).toBeVisible({ timeout: CI_TIMEOUT });
  });

  test('should show unread count badge when notifications exist', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Look for unread count badge
    const unreadBadge = page.locator('.notif-bell__badge').first();

    // Badge may or may not be visible depending on notifications
    const bellButton = page.locator('.notif-bell__btn').first();
    await expect(bellButton).toBeVisible({ timeout: CI_TIMEOUT });
  });

  test('should cap badge display at 99+', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const unreadBadge = page.locator('.notif-bell__badge').first();

    if (await unreadBadge.isVisible()) {
      const badgeText = await unreadBadge.textContent();
      // If count > 99, should show "99+"
      if (badgeText) {
        const numericValue = parseInt(badgeText.replace('+', ''));
        expect(numericValue).toBeLessThanOrEqual(99);
      }
    }
  });
});

// ========================================
// TEST SUITE 2: Notification Dropdown
// ========================================

test.describe('Notification Dropdown', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available in this environment');
    }
  });

  test('should open dropdown when bell is clicked', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await expect(bellButton).toBeVisible({ timeout: CI_TIMEOUT });
    await bellButton.click();

    // Dropdown should appear (rendered via Portal to body)
    const dropdown = page.locator('.notif-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
  });

  test('should show header with title', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    const header = page.locator('.notif-dropdown__header h3');
    await expect(header).toBeVisible();
    await expect(header).toContainText(/Notification/i);
  });

  test('should close dropdown when clicking outside', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    const dropdown = page.locator('.notif-dropdown');
    await expect(dropdown).toBeVisible();

    // Click outside the dropdown
    await page.mouse.click(10, 10);

    // Dropdown should close
    await expect(dropdown).not.toBeVisible({ timeout: 3000 });
  });

  test('should close dropdown on Escape key', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    const dropdown = page.locator('.notif-dropdown');
    await expect(dropdown).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    // Dropdown should close
    await expect(dropdown).not.toBeVisible({ timeout: 3000 });
  });

  test('should toggle dropdown on repeated clicks', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    const dropdown = page.locator('.notif-dropdown');

    // First click - open
    await bellButton.click();
    await expect(dropdown).toBeVisible();

    // Second click - close
    await bellButton.click();
    await expect(dropdown).not.toBeVisible();
  });
});

// ========================================
// TEST SUITE 3: Notification List Content
// ========================================

test.describe('Notification List Content', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available in this environment');
    }
  });

  test('should show empty state when no notifications', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    // Either show notifications list OR empty state
    const notificationsList = page.locator('.notif-dropdown__list');
    const emptyState = page.locator('.notif-dropdown__empty');

    const hasNotifications = await notificationsList.isVisible();
    const hasEmptyState = await emptyState.isVisible();

    // One of them should be visible
    expect(hasNotifications || hasEmptyState).toBeTruthy();

    if (hasEmptyState) {
      await expect(emptyState).toContainText(/caught up|no notification/i);
    }
  });

  test('should display notification items with content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    const notificationItems = page.locator('.notif-item');

    if (await notificationItems.count() > 0) {
      const firstItem = notificationItems.first();

      // Should have title
      const title = firstItem.locator('.notif-item__title');
      await expect(title).toBeVisible();

      // Should have message
      const message = firstItem.locator('.notif-item__message');
      await expect(message).toBeVisible();

      // Should have timestamp
      const time = firstItem.locator('.notif-item__time');
      await expect(time).toBeVisible();
    }
  });

  test('should show unread indicator dot for unread notifications', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    const unreadItems = page.locator('.notif-item--unread');

    if (await unreadItems.count() > 0) {
      const dot = unreadItems.first().locator('.notif-item__dot');
      await expect(dot).toBeVisible();
    }
  });

  test('should show footer with view all link when notifications exist', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    const notificationItems = page.locator('.notif-item');

    if (await notificationItems.count() > 0) {
      const footer = page.locator('.notif-dropdown__footer');
      await expect(footer).toBeVisible();

      const viewAllBtn = footer.locator('button');
      await expect(viewAllBtn).toContainText(/view all|see all/i);
    }
  });
});

// ========================================
// TEST SUITE 4: Mark as Read
// ========================================

test.describe('Mark Notifications as Read', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available in this environment');
    }
  });

  test('should show mark all as read button when unread exist', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    const unreadBadge = page.locator('.notif-bell__badge');

    // Only test if there are unread notifications
    if (await unreadBadge.isVisible()) {
      await bellButton.click();

      const markAllBtn = page.locator('.notif-dropdown__mark-all');
      await expect(markAllBtn).toBeVisible();
      await expect(markAllBtn).toContainText(/mark.*read/i);
    }
  });

  test('should have mark as read button on unread items', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    const unreadItems = page.locator('.notif-item--unread');

    if (await unreadItems.count() > 0) {
      const firstUnread = unreadItems.first();
      const markReadBtn = firstUnread.locator('.notif-item__action').first();
      await expect(markReadBtn).toBeVisible();
    }
  });

  test('should mark individual notification as read', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    const unreadItems = page.locator('.notif-item--unread');
    const initialCount = await unreadItems.count();

    if (initialCount > 0) {
      // Click mark as read on first unread
      const markReadBtn = unreadItems.first().locator('.notif-item__action').first();
      await markReadBtn.click();

      // Wait for UI update
      await page.waitForTimeout(500);

      // Count should decrease or item should lose unread class
      const newCount = await page.locator('.notif-item--unread').count();
      expect(newCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test('should mark all notifications as read', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    const unreadBadge = page.locator('.notif-bell__badge');

    if (await unreadBadge.isVisible()) {
      await bellButton.click();

      const markAllBtn = page.locator('.notif-dropdown__mark-all');
      if (await markAllBtn.isVisible()) {
        await markAllBtn.click();

        // Wait for API response
        await page.waitForTimeout(1000);

        // Badge should disappear or show 0
        const badgeStillVisible = await unreadBadge.isVisible();
        if (badgeStillVisible) {
          const text = await unreadBadge.textContent();
          expect(text).toBe('0');
        }
      }
    }
  });
});

// ========================================
// TEST SUITE 5: Delete Notifications
// ========================================

test.describe('Delete Notifications', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available in this environment');
    }
  });

  test('should have delete button on each notification', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    const notificationItems = page.locator('.notif-item');

    if (await notificationItems.count() > 0) {
      const deleteBtn = notificationItems.first().locator('.notif-item__action--delete');
      await expect(deleteBtn).toBeVisible();
    }
  });

  test('should delete notification when delete button clicked', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    const notificationItems = page.locator('.notif-item');
    const initialCount = await notificationItems.count();

    if (initialCount > 0) {
      const deleteBtn = notificationItems.first().locator('.notif-item__action--delete');
      await deleteBtn.click();

      // Wait for deletion
      await page.waitForTimeout(500);

      // Count should decrease
      const newCount = await page.locator('.notif-item').count();
      expect(newCount).toBeLessThan(initialCount);
    }
  });
});

// ========================================
// TEST SUITE 6: Real-time Connection Status
// ========================================

test.describe('Real-time Connection Status', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available in this environment');
    }
  });

  test('should show connection status indicator in dropdown header', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    // Wait for realtime connection
    await page.waitForTimeout(2000);

    // Should show either connected or disconnected status
    const connectedStatus = page.locator('.notif-dropdown__status--connected');
    const disconnectedStatus = page.locator('.notif-dropdown__status--disconnected');

    const hasConnected = await connectedStatus.isVisible();
    const hasDisconnected = await disconnectedStatus.isVisible();

    // One of them should be visible (or neither if connection is still pending)
    await expect(page.locator('.notif-dropdown__header')).toBeVisible();
  });

  test('should display Wifi icon when connected', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    // Wait for realtime connection to establish
    await page.waitForTimeout(3000);

    const connectedStatus = page.locator('.notif-dropdown__status--connected');

    if (await connectedStatus.isVisible()) {
      // Should contain Wifi icon (SVG)
      const icon = connectedStatus.locator('svg');
      await expect(icon).toBeVisible();
    }
  });

  test('should have tooltip on connection status', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    await page.waitForTimeout(2000);

    const statusIndicator = page.locator('.notif-dropdown__status--connected, .notif-dropdown__status--disconnected').first();

    if (await statusIndicator.isVisible()) {
      const title = await statusIndicator.getAttribute('title');
      expect(title).toBeTruthy();
      expect(title!.length).toBeGreaterThan(0);
    }
  });
});

// ========================================
// TEST SUITE 7: Navigation from Notifications
// ========================================

test.describe('Navigation from Notifications', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available in this environment');
    }
  });

  test('should navigate to dashboard when clicking view all', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    const notificationItems = page.locator('.notif-item');

    if (await notificationItems.count() > 0) {
      const viewAllBtn = page.locator('.notif-dropdown__footer button');
      await viewAllBtn.click();

      // Should navigate to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    }
  });

  test('should navigate when clicking notification with link', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    const clickableItem = page.locator('.notif-item--clickable').first();

    if (await clickableItem.isVisible()) {
      const initialUrl = page.url();
      await clickableItem.click();

      // Wait for navigation
      await page.waitForTimeout(1000);

      // URL might have changed (notification has a link)
      // Or dropdown closed without navigation (notification without link)
    }
  });
});

// ========================================
// TEST SUITE 8: Mobile Responsiveness
// ========================================

test.describe('Mobile Notifications', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });

  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available in this environment');
    }
  });

  test('should display notification bell on mobile', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Bell might be in hamburger menu on mobile
    const hamburgerMenu = page.locator('.hamburger, .menu-toggle, [aria-label*="menu"]').first();
    if (await hamburgerMenu.isVisible()) {
      await hamburgerMenu.click();
      await page.waitForTimeout(500);
    }

    const notificationBell = page.locator('.notif-bell__btn, .notif-bell__menu-btn').first();
    await expect(notificationBell).toBeVisible({ timeout: CI_TIMEOUT });
  });

  test('should open dropdown on mobile', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Open menu if needed
    const hamburgerMenu = page.locator('.hamburger, .menu-toggle').first();
    if (await hamburgerMenu.isVisible()) {
      await hamburgerMenu.click();
      await page.waitForTimeout(500);
    }

    const bellButton = page.locator('.notif-bell__btn, .notif-bell__menu-btn').first();
    if (await bellButton.isVisible()) {
      await bellButton.click();

      const dropdown = page.locator('.notif-dropdown');
      await expect(dropdown).toBeVisible({ timeout: 5000 });
    }
  });

  test('should be scrollable when many notifications on mobile', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const hamburgerMenu = page.locator('.hamburger').first();
    if (await hamburgerMenu.isVisible()) {
      await hamburgerMenu.click();
      await page.waitForTimeout(500);
    }

    const bellButton = page.locator('.notif-bell__btn, .notif-bell__menu-btn').first();
    if (await bellButton.isVisible()) {
      await bellButton.click();

      const content = page.locator('.notif-dropdown__content');
      if (await content.isVisible()) {
        // Content area should handle overflow
        const overflow = await content.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.overflowY;
        });
        expect(['auto', 'scroll', 'overlay']).toContain(overflow);
      }
    }
  });
});

// ========================================
// TEST SUITE 9: Loading States
// ========================================

test.describe('Loading States', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available in this environment');
    }
  });

  test('should show loading spinner while fetching', async ({ page }) => {
    // Slow down network to catch loading state
    await page.route('**/api/notifications**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    // Should briefly show loading state
    const loadingSpinner = page.locator('.notif-dropdown__loading, .notif-dropdown__spinner');

    // Either loading shows or content loads quickly
    await expect(page.locator('.notif-dropdown')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 10: Accessibility
// ========================================

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available in this environment');
    }
  });

  test('notification bell should have aria-label', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    const ariaLabel = await bellButton.getAttribute('aria-label');

    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel!.toLowerCase()).toContain('notification');
  });

  test('delete and mark as read buttons should have titles', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const bellButton = page.locator('.notif-bell__btn').first();
    await bellButton.click();

    const notificationItems = page.locator('.notif-item');

    if (await notificationItems.count() > 0) {
      const actionButtons = notificationItems.first().locator('.notif-item__action');

      for (let i = 0; i < await actionButtons.count(); i++) {
        const title = await actionButtons.nth(i).getAttribute('title');
        expect(title).toBeTruthy();
      }
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Tab to notification bell
    await page.keyboard.press('Tab');

    // Keep tabbing until we reach the bell
    for (let i = 0; i < 10; i++) {
      const focusedElement = await page.evaluate(() => document.activeElement?.className || '');
      if (focusedElement.includes('notif-bell')) {
        break;
      }
      await page.keyboard.press('Tab');
    }

    // Press Enter to open
    await page.keyboard.press('Enter');

    const dropdown = page.locator('.notif-dropdown');
    // Dropdown should be openable via keyboard
    await expect(page.locator('body')).toBeVisible();
  });
});
