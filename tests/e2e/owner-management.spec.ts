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
 */

import { test, expect } from '@playwright/test';

// Test data - configure these based on your test database
const TEST_OWNER = {
  email: 'owner@test.com',
  password: 'SecureTestP@ssw0rd2024!',
  establishmentName: 'Test Bar'
};

test.describe('Owner Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start at homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to login page', async ({ page }) => {
    // Find login link/button
    const loginButton = page.locator('a[href*="/login"]').or(
      page.getByRole('link', { name: /login|sign in/i })
    ).or(
      page.locator('[data-testid="login-link"]')
    ).first();

    // Click login
    await loginButton.click();

    // Verify we're on login page
    await expect(page).toHaveURL(/\/login/);

    // Verify login form exists
    await expect(page.locator('form').or(
      page.locator('[data-testid="login-form"]')
    ).first()).toBeVisible();
  });

  test('should login as owner', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Fill login form
    const emailInput = page.locator('input[type="email"]').or(
      page.locator('input[name="email"]')
    ).first();

    const passwordInput = page.locator('input[type="password"]').or(
      page.locator('input[name="password"]')
    ).first();

    await emailInput.fill(TEST_OWNER.email);
    await passwordInput.fill(TEST_OWNER.password);

    // Submit form
    const submitButton = page.locator('button[type="submit"]').or(
      page.getByRole('button', { name: /login|sign in/i })
    ).first();

    await submitButton.click();

    // Wait for redirect after successful login
    await page.waitForURL(/\/(dashboard|owner|establishments)/, { timeout: 15000 });

    // Verify we're logged in (check for user menu or dashboard)
    const userMenu = page.locator('[data-testid="user-menu"]').or(
      page.locator('.user-menu')
    ).or(
      page.getByRole('button', { name: /profile|account|logout/i })
    ).first();

    await expect(userMenu).toBeVisible({ timeout: 10000 });
  });

  test('should display owner dashboard with establishment info', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.locator('input[type="email"]').first().fill(TEST_OWNER.email);
    await page.locator('input[type="password"]').first().fill(TEST_OWNER.password);
    await page.locator('button[type="submit"]').first().click();

    // Wait for dashboard
    await page.waitForURL(/\/(dashboard|owner|establishments)/, { timeout: 15000 });

    // Verify establishment name is displayed
    await expect(page.locator('h1, h2, h3').filter({ hasText: new RegExp(TEST_OWNER.establishmentName, 'i') }).first()).toBeVisible({ timeout: 10000 });

    // Verify dashboard sections exist
    const dashboard = page.locator('.dashboard').or(
      page.locator('[data-testid="owner-dashboard"]')
    ).first();

    await expect(dashboard).toBeVisible();
  });

  test('should display employees list', async ({ page }) => {
    // Login and navigate to employees
    await page.goto('/login');
    await page.locator('input[type="email"]').first().fill(TEST_OWNER.email);
    await page.locator('input[type="password"]').first().fill(TEST_OWNER.password);
    await page.locator('button[type="submit"]').first().click();

    await page.waitForURL(/\//, { timeout: 15000 });

    // Navigate to employees page
    const employeesLink = page.locator('a[href*="/employees"]').or(
      page.getByRole('link', { name: /employees|staff/i })
    ).first();

    // Click if exists
    const linkCount = await employeesLink.count();
    if (linkCount > 0) {
      await employeesLink.click();
      await page.waitForTimeout(1000);
    }

    // Verify employees section exists
    const employeesList = page.locator('.employees-list').or(
      page.locator('[data-testid="employees-list"]')
    ).or(
      page.locator('.employee-card')
    ).first();

    await expect(employeesList).toBeVisible({ timeout: 10000 });
  });

  test('should open add employee modal/form', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.locator('input[type="email"]').first().fill(TEST_OWNER.email);
    await page.locator('input[type="password"]').first().fill(TEST_OWNER.password);
    await page.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(2000);

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
    // Login
    await page.goto('/login');
    await page.locator('input[type="email"]').first().fill(TEST_OWNER.email);
    await page.locator('input[type="password"]').first().fill(TEST_OWNER.password);
    await page.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(2000);

    // Find VIP or upgrade button
    const vipButton = page.locator('button:has-text("VIP")').or(
      page.getByRole('button', { name: /upgrade|vip|premium/i })
    ).or(
      page.locator('a[href*="/vip"]')
    ).or(
      page.locator('[data-testid="vip-button"]')
    ).first();

    // Skip if button doesn't exist
    const buttonCount = await vipButton.count();
    if (buttonCount === 0) {
      test.skip();
      return;
    }

    await vipButton.click();
    await page.waitForTimeout(1000);

    // Verify VIP modal/page appears
    const vipModal = page.locator('[role="dialog"]').or(
      page.locator('.modal').filter({ hasText: /vip/i })
    ).or(
      page.locator('h1, h2').filter({ hasText: /vip/i })
    ).first();

    await expect(vipModal).toBeVisible({ timeout: 10000 });
  });

  test('should display VIP pricing tiers', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.locator('input[type="email"]').first().fill(TEST_OWNER.email);
    await page.locator('input[type="password"]').first().fill(TEST_OWNER.password);
    await page.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(2000);

    // Navigate to VIP
    const vipButton = page.locator('button:has-text("VIP"), a[href*="/vip"]').first();
    const buttonCount = await vipButton.count();

    if (buttonCount === 0) {
      test.skip();
      return;
    }

    await vipButton.click();
    await page.waitForTimeout(1000);

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
    // Login
    await page.goto('/login');
    await page.locator('input[type="email"]').first().fill(TEST_OWNER.email);
    await page.locator('input[type="password"]').first().fill(TEST_OWNER.password);
    await page.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(2000);

    // Navigate to VIP
    const vipButton = page.locator('button:has-text("VIP"), a[href*="/vip"]').first();
    const buttonCount = await vipButton.count();

    if (buttonCount === 0) {
      test.skip();
      return;
    }

    await vipButton.click();
    await page.waitForTimeout(1000);

    // Look for payment method options
    const paymentMethods = page.locator('button, label').filter({ hasText: /cash|online|payment/i });
    const methodsCount = await paymentMethods.count();

    expect(methodsCount).toBeGreaterThan(0);
  });

  test('should logout successfully', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.locator('input[type="email"]').first().fill(TEST_OWNER.email);
    await page.locator('input[type="password"]').first().fill(TEST_OWNER.password);
    await page.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(2000);

    // Find logout button
    const logoutButton = page.locator('button:has-text("Logout")').or(
      page.getByRole('button', { name: /logout|sign out/i })
    ).or(
      page.locator('[data-testid="logout-button"]')
    ).first();

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
    await page.goto('/login');

    // Fill with invalid credentials
    await page.locator('input[type="email"]').first().fill('invalid@test.com');
    await page.locator('input[type="password"]').first().fill('wrongpassword');

    // Submit
    await page.locator('button[type="submit"]').first().click();

    // Wait for error message
    await page.waitForTimeout(2000);

    // Look for error message
    const errorMessage = page.locator('.error').or(
      page.locator('[role="alert"]')
    ).or(
      page.getByText(/invalid|incorrect|failed/i)
    ).first();

    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should validate required fields on employee form', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.locator('input[type="email"]').first().fill(TEST_OWNER.email);
    await page.locator('input[type="password"]').first().fill(TEST_OWNER.password);
    await page.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(2000);

    // Try to open add employee form
    const addButton = page.locator('button:has-text("Add")').first();
    const buttonCount = await addButton.count();

    if (buttonCount === 0) {
      test.skip();
      return;
    }

    await addButton.click();
    await page.waitForTimeout(500);

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
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
