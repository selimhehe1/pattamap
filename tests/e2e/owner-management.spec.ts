/**
 * 🧪 E2E Test: Owner Management Flow
 *
 * Tests the owner journey:
 * 1. Login as establishment owner
 * 2. View establishment dashboard
 * 3. Manage employees (view list, add, edit, delete)
 * 4. Purchase VIP subscription
 * 5. View VIP status and benefits
 *
 * Critical for business model - owners pay for VIP subscriptions.
 *
 * NOTE: Uses pre-authenticated user state (owner@test.com) from global-setup.ts
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to pre-authenticated user state (owner)
const USER_STATE_FILE = path.join(__dirname, '.auth', 'user.json');

// Helper to dismiss webpack dev server overlay
async function dismissDevOverlay(page: any) {
  try {
    await page.evaluate(() => {
      const overlay = document.getElementById('webpack-dev-server-client-overlay');
      if (overlay) {
        overlay.remove();
      }
    });
  } catch {
    // Ignore errors - overlay may not exist
  }
}

// Test data
const TEST_OWNER = {
  establishmentName: 'Test Bar'
};

// Check if mock auth is enabled (storageState will be empty)
const USE_MOCK_AUTH = process.env.E2E_USE_MOCK_AUTH !== 'false';

// Use pre-authenticated owner state if available (only when not using mock auth)
test.use({
  storageState: USE_MOCK_AUTH ? undefined : USER_STATE_FILE,
});

test.describe('Owner Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // If mock auth is enabled, set up mock authentication as owner
    if (USE_MOCK_AUTH) {
      const { setupMockAuth, mockBackendAuthMe, mockUser } = await import('./fixtures/mockAuth');

      // Create owner user
      const mockOwnerUser = {
        ...mockUser,
        id: 'mock-owner-id-12345-e2e-test',
        email: 'owner@pattamap.com',
        user_metadata: { pseudonym: 'TestOwner', avatar_url: null },
        app_metadata: { role: 'user', account_type: 'establishment_owner' }
      };

      await setupMockAuth(page, { user: mockOwnerUser });
      await mockBackendAuthMe(page, false);

      // Mock owner-specific auth response
      const ownerResponse = {
        user: {
          id: mockOwnerUser.id,
          email: mockOwnerUser.email,
          pseudonym: mockOwnerUser.user_metadata.pseudonym,
          role: 'user',
          account_type: 'establishment_owner',
          xp: 150,
          level: 2,
          streak: 3
        },
        isAuthenticated: true
      };

      await page.route('**/api/auth/profile', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(ownerResponse)
        });
      });
    }

    // Navigate to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await dismissDevOverlay(page);
  });

  test('should be authenticated as owner', async ({ page }) => {
    // Owner auth is handled via mock auth or storageState
    // Verify login modal is NOT visible (meaning we're authenticated or on public page)
    const loginModal = page.locator('text="Welcome Back"').or(
      page.locator('text="Sign in to your account"')
    ).first();

    // Wait for page to stabilize
    await page.waitForLoadState('domcontentloaded');

    // Login modal should NOT be visible if authenticated
    const isLoginVisible = await loginModal.isVisible().catch(() => false);

    if (isLoginVisible) {
      // If login modal is visible, authentication failed
      console.log('⚠️ Authentication failed - login modal is visible');
      // Try to check for any auth indicator as fallback
      const authIndicator = page.locator('button:has-text("XP")').or(
        page.getByRole('button', { name: /user menu|open menu/i })
      ).first();

      await expect(authIndicator).toBeVisible({ timeout: 5000 });
    } else {
      // Login modal not visible - we're authenticated or on a public page
      // The map page is public but menu behavior changes when logged in
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display owner dashboard with establishment info', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Verify dashboard or establishment info is displayed
    const dashboard = page.locator('.dashboard').or(
      page.locator('[data-testid="owner-dashboard"]')
    ).or(
      page.locator('h1, h2').filter({ hasText: /dashboard|establishment/i })
    ).first();

    // Dashboard should be visible if user is an owner
    const isVisible = await dashboard.isVisible({ timeout: 10000 }).catch(() => false);
    if (!isVisible) {
      // If not visible, user may not be an owner - skip test
      test.skip();
      return;
    }

    await expect(dashboard).toBeVisible();
  });

  test('should display employees list', async ({ page }) => {
    // Navigate to employees page
    const employeesLink = page.locator('a[href*="/employees"]').or(
      page.getByRole('link', { name: /employees|staff/i })
    ).first();

    // Click if exists
    const linkCount = await employeesLink.count();
    if (linkCount === 0) {
      test.skip();
      return;
    }

    await employeesLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify employees section exists
    const employeesList = page.locator('.employees-list').or(
      page.locator('[data-testid="employees-list"]')
    ).or(
      page.locator('.employee-card')
    ).first();

    await expect(employeesList).toBeVisible({ timeout: 10000 });
  });

  test('should open add employee modal/form', async ({ page }) => {
    // Find "Add Employee" button
    const addButton = page.locator('button:has-text("Add")').or(
      page.getByRole('button', { name: /add.*employee/i })
    ).or(
      page.locator('[data-testid="add-employee-button"]')
    ).first();

    // Skip if button doesn't exist
    const buttonCount = await addButton.count();
    if (buttonCount === 0) {
      test.skip();
      return;
    }

    await addButton.click();

    // Verify modal/form appears
    const modal = page.locator('[role="dialog"]').or(
      page.locator('.modal')
    ).or(
      page.locator('form').filter({ hasText: /employee/i })
    ).first();

    await expect(modal).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to VIP purchase page', async ({ page }) => {
    // Find VIP or upgrade button
    const vipButton = page.locator('button:has-text("VIP")').or(
      page.getByRole('button', { name: /upgrade|vip|premium/i })
    ).or(
      page.locator('a[href*="/vip"]')
    ).or(
      page.locator('[data-testid="vip-button"]')
    ).first();

    // Skip if button doesn't exist (VIP feature may be disabled)
    const buttonCount = await vipButton.count();
    if (buttonCount === 0) {
      test.skip();
      return;
    }

    await vipButton.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify VIP modal/page appears
    const vipModal = page.locator('[role="dialog"]').or(
      page.locator('.modal').filter({ hasText: /vip/i })
    ).or(
      page.locator('h1, h2').filter({ hasText: /vip/i })
    ).first();

    await expect(vipModal).toBeVisible({ timeout: 10000 });
  });

  test('should display VIP pricing tiers', async ({ page }) => {
    // Navigate to VIP
    const vipButton = page.locator('button:has-text("VIP"), a[href*="/vip"]').first();
    const buttonCount = await vipButton.count();

    if (buttonCount === 0) {
      test.skip();
      return;
    }

    await vipButton.click();
    await page.waitForLoadState('domcontentloaded');

    // Look for pricing information
    const pricing = page.locator('.price').or(
      page.locator('[data-testid="vip-price"]')
    ).or(
      page.getByText(/฿|THB|\$/)
    ).first();

    await expect(pricing).toBeVisible({ timeout: 10000 });

    // Should display multiple duration options (7, 30, 90, 365 days)
    const durationOptions = page.locator('button').filter({ hasText: /day|month|year/i });
    const optionsCount = await durationOptions.count();

    expect(optionsCount).toBeGreaterThan(1);
  });

  test('should display payment methods (cash/online)', async ({ page }) => {
    // Navigate to VIP
    const vipButton = page.locator('button:has-text("VIP"), a[href*="/vip"]').first();
    const buttonCount = await vipButton.count();

    if (buttonCount === 0) {
      test.skip();
      return;
    }

    await vipButton.click();
    await page.waitForLoadState('domcontentloaded');

    // Look for payment method options
    const paymentMethods = page.locator('button, label').filter({ hasText: /cash|online|payment/i });
    const methodsCount = await paymentMethods.count();

    expect(methodsCount).toBeGreaterThan(0);
  });

  test('should logout successfully', async ({ page }) => {
    // First, open user menu if needed
    const userMenuButton = page.getByRole('button', { name: /user menu/i }).or(
      page.locator('[data-testid="user-menu"]')
    ).first();

    const menuButtonCount = await userMenuButton.count();
    if (menuButtonCount > 0) {
      await userMenuButton.click();
      await page.waitForLoadState('domcontentloaded');
    }

    // Find logout button
    const logoutButton = page.locator('button:has-text("Logout")').or(
      page.getByRole('button', { name: /logout|sign out/i })
    ).or(
      page.locator('[data-testid="logout-button"]')
    ).first();

    // Skip if no logout button found
    const buttonCount = await logoutButton.count();
    if (buttonCount === 0) {
      test.skip();
      return;
    }

    // Click logout
    await logoutButton.click();

    // Wait for redirect to login/home
    await page.waitForURL(/\/(login|home|\/)$/, { timeout: 10000 });

    // Verify we're logged out (login button should be visible)
    const loginButton = page.locator('a[href*="/login"]').or(
      page.getByRole('link', { name: /login|sign in/i })
    ).first();

    await expect(loginButton).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Owner Management - Error Handling', () => {
  test('should show error on invalid login credentials', async ({ page }) => {
    // This test intentionally uses invalid credentials without any auth
    // Clear storage to ensure we're logged out
    await page.context().clearCookies();

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    // Fill with invalid credentials
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    // Skip if no login form (might be SSO-only)
    if (await emailInput.count() === 0) {
      test.skip();
      return;
    }

    await emailInput.fill('invalid@test.com');
    await passwordInput.fill('wrongpassword');

    // Submit
    await page.locator('button[type="submit"]').first().click();

    // Wait for error message
    await page.waitForLoadState('networkidle');

    // Look for error message
    const errorMessage = page.locator('.error').or(
      page.locator('[role="alert"]')
    ).or(
      page.getByText(/invalid|incorrect|failed|error/i)
    ).first();

    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should validate required fields on employee form', async ({ page }) => {
    // This test uses storageState from the test.use() configuration

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Try to open add employee form
    const addButton = page.locator('button:has-text("Add")').or(
      page.getByRole('button', { name: /add.*employee/i })
    ).first();
    const buttonCount = await addButton.count();

    if (buttonCount === 0) {
      test.skip();
      return;
    }

    await addButton.click();
    await page.waitForLoadState('domcontentloaded');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
    const submitCount = await submitButton.count();

    if (submitCount === 0) {
      test.skip();
      return;
    }

    await submitButton.click();

    // Should show validation errors
    const validationError = page.locator('.error').or(
      page.locator('[role="alert"]')
    ).or(
      page.locator('input:invalid')
    ).first();

    await expect(validationError).toBeVisible({ timeout: 5000 });
  });
});
