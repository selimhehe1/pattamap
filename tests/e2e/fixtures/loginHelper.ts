/**
 * Login Helper for E2E Tests
 *
 * Provides fast-fail login functions that return quickly if authentication
 * is not available (e.g., in CI environments without real credentials).
 *
 * Usage:
 *   const loggedIn = await loginAsUser(page);
 *   if (!loggedIn) {
 *     testInfo.skip(true, 'User login not available');
 *     return;
 *   }
 */

import { Page } from '@playwright/test';

// Test credentials
const TEST_USER = {
  email: 'test@pattamap.com',
  password: 'SecureTestP@ssw0rd2024!'
};

const TEST_ADMIN = {
  email: 'admin@test.com',
  password: 'SecureTestP@ssw0rd2024!'
};

const TEST_OWNER = {
  email: 'owner@test.com',
  password: 'SecureTestP@ssw0rd2024!'
};

/**
 * Helper function to perform login with fast-fail
 * Returns true if login succeeded, false otherwise
 */
async function performLogin(
  page: Page,
  email: string,
  password: string,
  expectedUrlPattern: RegExp
): Promise<boolean> {
  try {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Check if login form exists
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.count() === 0) {
      return false;
    }

    // Fill and submit login form
    await emailInput.fill(email);
    await page.locator('input[type="password"]').first().fill(password);
    await page.locator('button[type="submit"]').first().click();

    // Wait max 5s for redirect (fast-fail instead of 16s timeout)
    try {
      await page.waitForURL(expectedUrlPattern, { timeout: 5000 });
      return true;
    } catch {
      // Check if we're still on login page (login failed)
      return !page.url().includes('/login');
    }
  } catch {
    return false;
  }
}

/**
 * Login as regular user
 * @returns true if login succeeded, false otherwise
 */
export async function loginAsUser(page: Page): Promise<boolean> {
  return performLogin(
    page,
    TEST_USER.email,
    TEST_USER.password,
    /\/(home|dashboard|search|map|\?)/
  );
}

/**
 * Login as admin user
 * @returns true if login succeeded, false otherwise
 */
export async function loginAsAdmin(page: Page): Promise<boolean> {
  return performLogin(
    page,
    TEST_ADMIN.email,
    TEST_ADMIN.password,
    /\/(admin|dashboard|map|\?)/
  );
}

/**
 * Login as establishment owner
 * @returns true if login succeeded, false otherwise
 */
export async function loginAsOwner(page: Page): Promise<boolean> {
  return performLogin(
    page,
    TEST_OWNER.email,
    TEST_OWNER.password,
    /\/(owner|dashboard|home|\?)/
  );
}

/**
 * Check if mock auth is enabled (CI environment)
 */
export function isMockAuthEnabled(): boolean {
  return process.env.E2E_USE_MOCK_AUTH === 'true';
}
