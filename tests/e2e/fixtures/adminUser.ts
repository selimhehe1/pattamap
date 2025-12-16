/**
 * Admin User Fixture - PattaMap E2E Tests
 *
 * Helper functions to create and authenticate admin users for admin panel testing.
 * Supports both real API authentication and mock authentication for CI.
 */

import { Page } from '@playwright/test';
import axios from 'axios';
import { setupMockAuth, mockBackendAuthMe, mockAdminUser, mockAdminSession } from './mockAuth';

const API_BASE_URL = 'http://localhost:8080/api';
const USE_MOCK_AUTH = process.env.E2E_USE_MOCK_AUTH === 'true' || process.env.CI === 'true';

export interface AdminTestUser {
  id?: string;
  email: string;
  username: string;
  password: string;
  account_type: 'admin';
  role: 'admin' | 'super_admin';
  csrfToken?: string;
}

/**
 * Pre-configured admin credentials for testing
 * Note: This admin user must exist in the database with admin role
 * Setup via: cd backend && node scripts/setup-test-accounts.js
 */
export const ADMIN_CREDENTIALS = {
  email: 'admin@test.com',
  password: 'SecureTestP@ssw0rd2024!',
  username: 'testadmin'
};

/**
 * Generate unique admin test user credentials
 */
export function generateAdminUser(): AdminTestUser {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    email: `admin.e2e.${timestamp}.${random}@pattamap.test`,
    username: `AdminUser${timestamp}${random}`,
    password: 'AdminTestP@ss2024!',
    account_type: 'admin',
    role: 'admin'
  };
}

/**
 * Login as admin via backend API or mock auth
 * @param page - Playwright page object
 * @param credentials - Optional custom credentials (defaults to ADMIN_CREDENTIALS)
 */
export async function loginAsAdmin(
  page: Page,
  credentials?: Partial<AdminTestUser>
): Promise<AdminTestUser> {
  const admin: AdminTestUser = {
    ...ADMIN_CREDENTIALS,
    account_type: 'admin',
    role: 'admin',
    ...credentials
  };

  // Use mock auth in CI or when explicitly enabled
  if (USE_MOCK_AUTH) {
    console.log(`🔐 Using MOCK ADMIN AUTH for: ${admin.email}`);

    // Setup mock auth with admin privileges
    await setupMockAuth(page, { isAdmin: true });
    await mockBackendAuthMe(page, true);

    // Also mock the login endpoint
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: mockAdminUser.id,
            email: mockAdminUser.email,
            pseudonym: mockAdminUser.user_metadata.pseudonym,
            role: 'admin'
          },
          csrfToken: 'mock-csrf-token-admin',
          session: mockAdminSession
        })
      });
    });

    // Mock admin-specific endpoints
    await page.route('**/api/admin/**', route => {
      // Allow the request to continue but with mock auth
      route.continue();
    });

    admin.id = mockAdminUser.id;
    admin.csrfToken = 'mock-csrf-token-admin';

    // Navigate to admin panel
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    console.log(`✅ Mock Admin ready: ${admin.email} (role: admin)`);
    return admin;
  }

  // Real API login (for local development)
  try {
    // Login via API to get auth cookies
    const loginResponse = await axios.post(
      `${API_BASE_URL}/auth/login`,
      {
        login: admin.email,
        password: admin.password
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      }
    );

    // Extract CSRF token from response body
    admin.csrfToken = loginResponse.data.csrfToken;
    admin.id = loginResponse.data.user?.id;

    // Verify admin role
    const userRole = loginResponse.data.user?.role;
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      throw new Error(`User ${admin.email} is not an admin (role: ${userRole})`);
    }

    // Extract cookies from login response
    const cookies = loginResponse.headers['set-cookie'];

    if (cookies) {
      const context = page.context();
      const cookiesToAdd = [];

      for (const cookie of cookies) {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');

        cookiesToAdd.push({
          name: name.trim(),
          value: value?.trim() || '',
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax' as 'Lax'
        });
      }

      await context.addCookies(cookiesToAdd);
    }

    // Navigate to admin panel to verify access
    await page.goto('/admin');
    await page.waitForTimeout(2000);

    console.log(`✅ Admin logged in: ${admin.email} (role: ${userRole})`);
    return admin;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.message;
      console.error(`❌ Admin login failed: ${errorMessage}`);

      // Fallback to mock auth if real login fails
      if (process.env.CI === 'true') {
        console.log(`🔄 Falling back to mock admin auth...`);
        return loginAsAdmin(page, { ...credentials, email: 'mock-fallback' });
      }

      throw new Error(`Admin login failed: ${errorMessage}`);
    }
    throw error;
  }
}

/**
 * Check if current user has admin access
 * @param page - Playwright page object
 */
export async function verifyAdminAccess(page: Page): Promise<boolean> {
  try {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');

    // Check for admin panel indicators
    const adminIndicators = [
      page.locator('text="Admin Dashboard"'),
      page.locator('text="Administration"'),
      page.locator('[data-testid="admin-panel"]'),
      page.locator('.admin-dashboard')
    ];

    for (const indicator of adminIndicators) {
      if (await indicator.isVisible({ timeout: 3000 }).catch(() => false)) {
        return true;
      }
    }

    // Check for access denied
    const accessDenied = await page.locator('text=/access denied|unauthorized|forbidden/i')
      .first().isVisible().catch(() => false);

    return !accessDenied;
  } catch {
    return false;
  }
}

/**
 * Navigate to specific admin tab
 * @param page - Playwright page object
 * @param tabName - Name of the admin tab
 */
export async function navigateToAdminTab(
  page: Page,
  tabName: 'dashboard' | 'establishments' | 'employees' | 'comments' | 'users' |
           'consumables' | 'claims' | 'owners' | 'verifications' | 'vip'
): Promise<void> {
  const tabSelectors: Record<string, string> = {
    dashboard: 'text="Dashboard"',
    establishments: 'text="Establishments"',
    employees: 'text="Employees"',
    comments: 'text="Comments"',
    users: 'text="Users"',
    consumables: 'text="Consumables"',
    claims: 'text="Claims"',
    owners: 'text="Owners"',
    verifications: 'text="Verifications"',
    vip: 'text="VIP"'
  };

  const selector = tabSelectors[tabName];
  if (!selector) {
    throw new Error(`Unknown admin tab: ${tabName}`);
  }

  await page.goto('/admin');
  await page.waitForLoadState('domcontentloaded');

  const tab = page.locator(selector).first();
  if (await tab.isVisible({ timeout: 5000 })) {
    await tab.click();
    await page.waitForTimeout(1000);
    console.log(`✅ Navigated to admin tab: ${tabName}`);
  } else {
    throw new Error(`Admin tab not found: ${tabName}`);
  }
}

/**
 * Perform admin action with CSRF token
 * @param page - Playwright page object
 * @param admin - Admin user with CSRF token
 * @param endpoint - API endpoint
 * @param data - Request body
 */
export async function adminApiRequest(
  page: Page,
  admin: AdminTestUser,
  endpoint: string,
  data: Record<string, unknown>,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
): Promise<unknown> {
  const cookies = await page.context().cookies();
  const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const response = await axios({
    method,
    url: `${API_BASE_URL}${endpoint}`,
    data,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieString,
      'X-CSRF-Token': admin.csrfToken || ''
    },
    withCredentials: true
  });

  return response.data;
}
