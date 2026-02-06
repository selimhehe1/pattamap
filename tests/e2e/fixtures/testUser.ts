/**
 * Test User Fixture - PattaMap E2E Tests
 *
 * Helper functions to create authenticated test users with XP and badges
 * for gamification testing.
 *
 * RATE LIMITING NOTE:
 * By default, this module now uses MOCK AUTH to avoid Supabase rate limiting.
 * Set USE_MOCK_AUTH=false to use real authentication (for smoke/auth tests only).
 *
 * Usage:
 *   // Default: Mock auth (fast, no rate limiting)
 *   await registerUser(page, user);
 *
 *   // Force real auth (for authentication-specific tests)
 *   await registerUser(page, user, { useMock: false });
 */

import { Page } from '@playwright/test';
import { setupMockAuth, setupMockAdminAuth, mockUser, mockAdminUser } from './mockAuth';

const API_BASE_URL = 'http://localhost:8080/api';

// Set to false only for authentication.spec.ts and smoke.spec.ts
const USE_MOCK_AUTH = process.env.E2E_USE_MOCK_AUTH !== 'false';

export interface TestUser {
  id?: string;
  email: string;
  username: string;
  password: string;
  account_type: 'regular' | 'employee' | 'establishment_owner';
  csrfToken?: string; // CSRF token from login response body
}

/**
 * Generate unique test user credentials
 */
export function generateTestUser(): TestUser {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    email: `test.e2e.${timestamp}.${random}@pattamap.test`,
    username: `TestUser${timestamp}${random}`,
    password: 'TestPassword123!',
    account_type: 'regular'
  };
}

/**
 * Register a new user via backend API (faster and more reliable for E2E tests)
 * @param page - Playwright page object
 * @param user - Test user credentials
 * @param options - Options (useMock: false to force real auth)
 */
export async function registerUser(
  page: Page,
  user: TestUser,
  options: { useMock?: boolean } = {}
): Promise<void> {
  const useMock = options.useMock ?? USE_MOCK_AUTH;

  // Use mock auth by default (avoids rate limiting)
  if (useMock) {
    console.log(`🔐 Using MOCK AUTH for: ${user.email}`);
    await setupMockAuth(page);

    // Also mock backend login endpoint
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: mockUser.id,
            email: mockUser.email,
            pseudonym: mockUser.user_metadata.pseudonym,
            role: 'user'
          },
          csrfToken: 'mock-csrf-token',
          session: { access_token: 'mock-token' }
        })
      });
    });

    // Mock backend register endpoint
    await page.route('**/api/auth/register', route => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: mockUser.id,
            email: user.email,
            pseudonym: user.username
          },
          message: 'Registration successful'
        })
      });
    });

    user.id = mockUser.id;
    user.csrfToken = 'mock-csrf-token';
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    console.log(`✅ Mock user ready: ${user.email}`);
    return;
  }

  // Real auth (only for authentication.spec.ts and smoke.spec.ts)
  console.log(`🔑 Using REAL AUTH for: ${user.email}`);
  try {
    // Register via API directly
    const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: user.email,
        pseudonym: user.username, // Backend uses 'pseudonym' not 'username'
        password: user.password,
        account_type: user.account_type
      })
    });

    if (registerResponse.status === 201 || registerResponse.status === 200) {
      const registerData = await registerResponse.json();
      // Store user ID for future use
      user.id = registerData.user?.id || registerData.id;

      // Now login via API to get auth cookies
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          login: user.email, // Backend expects 'login' (can be pseudonym or email)
          password: user.password
        })
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Login HTTP ${loginResponse.status}`);
      }

      const loginData = await loginResponse.json();

      // Extract CSRF token from response body (NOT from cookies!)
      user.csrfToken = loginData.csrfToken;

      // Extract cookies from login response
      const cookies = loginResponse.headers.getSetCookie?.() || [];

      if (cookies.length > 0) {
        // Set cookies in browser context
        const context = page.context();

        // Build array of cookies to add
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

        // Add all cookies at once (Playwright uses addCookies with array)
        await context.addCookies(cookiesToAdd);
      }

      // Navigate to homepage to activate auth state
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      console.log(`✅ User registered & logged in via API: ${user.email}`);
    } else {
      const errorData = await registerResponse.json().catch(() => ({}));
      throw new Error(`Registration failed: ${errorData.error || `HTTP ${registerResponse.status}`}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Registration failed: ${errorMessage}`);
    throw new Error(`Registration failed: ${errorMessage}`);
  }
}

/**
 * Login user via backend API (faster and more reliable for E2E tests)
 * @param page - Playwright page object
 * @param user - Test user credentials
 * @param options - Options (useMock: false to force real auth)
 */
export async function loginUser(
  page: Page,
  user: TestUser,
  options: { useMock?: boolean } = {}
): Promise<void> {
  const useMock = options.useMock ?? USE_MOCK_AUTH;

  // Use mock auth by default (avoids rate limiting)
  if (useMock) {
    console.log(`🔐 Using MOCK AUTH login for: ${user.email}`);
    await setupMockAuth(page);
    user.csrfToken = 'mock-csrf-token';
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    console.log(`✅ Mock login ready: ${user.email}`);
    return;
  }

  // Real auth (only for authentication.spec.ts and smoke.spec.ts)
  console.log(`🔑 Using REAL AUTH login for: ${user.email}`);
  try {
    // Login via API to get auth cookies
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        login: user.email, // Backend expects 'login' (can be pseudonym or email)
        password: user.password
      })
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();

    // Extract CSRF token from response body (NOT from cookies!)
    user.csrfToken = loginData.csrfToken;

    // Extract cookies from login response
    const cookies = loginResponse.headers.getSetCookie?.() || [];

    if (cookies.length > 0) {
      // Set cookies in browser context
      const context = page.context();

      // Build array of cookies to add
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

      // Add all cookies at once (Playwright uses addCookies with array)
      await context.addCookies(cookiesToAdd);
    }

    // Navigate to homepage to activate auth state
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log(`✅ User logged in via API: ${user.email}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Login failed: ${errorMessage}`);
    throw new Error(`Login failed: ${errorMessage}`);
  }
}

/**
 * Award XP to user via direct API call (requires backend access)
 * @param userId - User UUID
 * @param xp - Amount of XP to award
 * @param source - Source of XP (review_created, check_in, etc.)
 */
export async function awardXPDirectly(
  userId: string,
  xp: number,
  source: string = 'test_manual'
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/gamification/award-xp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        xp_amount: xp,
        source,
        description: `E2E Test XP Award - ${source}`
      })
    });

    if (response.ok) {
      console.log(`✅ XP awarded: ${xp} XP to user ${userId}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️  Could not award XP directly (might need admin auth):`, errorMessage);
  }
}

/**
 * Create a review/comment to earn XP (50 XP) via backend API
 * @param page - Playwright page object
 * @param user - Test user with CSRF token
 * @param employeeId - Employee UUID (optional, will fetch first available)
 */
export async function createReviewForXP(
  page: Page,
  user: TestUser,
  employeeId?: string
): Promise<boolean> {
  try {
    // If no employee ID provided, fetch one from API
    if (!employeeId) {
      const empResponse = await fetch(`${API_BASE_URL}/employees?limit=1&status=approved`);
      const empData = await empResponse.json();

      // API returns { employees: [...] }
      const employees = empData.employees || empData;
      employeeId = employees?.[0]?.id;

      if (!employeeId) {
        console.warn('⚠️  No approved employees available in database for testing. Skipping review creation.');
        return false;
      }
    }

    // Get cookies from browser context to include in API request
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Use CSRF token from user object (extracted from login response body)
    const csrfToken = user.csrfToken || '';

    // Create comment/review via API (comments are for employees, not establishments)
    const response = await fetch(`${API_BASE_URL}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        employee_id: employeeId,
        content: 'E2E Test Review - Great service! ⭐⭐⭐⭐⭐',
        rating: 5
      })
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`✅ Review created via API (+50 XP expected)`);

      // Wait for backend to process XP award
      await page.waitForLoadState('networkidle');

      // Reload page to see XP update in header
      await page.reload();
      await page.waitForLoadState('networkidle');
      return true;
    }
    return false;
  } catch (error) {
    if (error instanceof Error) {
      const errorMessage = error.message;
      // Check for common Supabase/API key issues
      if (errorMessage.includes('Invalid API key') || errorMessage.includes('API key')) {
        console.warn(`⚠️  Supabase API key issue detected: ${errorMessage}`);
        console.warn('   This usually means SUPABASE_SERVICE_KEY GitHub secret is missing or invalid.');
        console.warn('   Tests will continue but review creation will be skipped.');
      } else {
        console.warn(`⚠️  Create review failed: ${errorMessage}`);
      }
    } else {
      console.warn('⚠️  Create review failed with unexpected error:', error);
    }
    return false;
  }
}

/**
 * Check in to an establishment to earn XP (15 XP) and track mission progress
 * @param page - Playwright page object
 * @param user - Test user with CSRF token
 * @param establishmentId - Establishment UUID (optional, will fetch first available)
 */
export async function checkInForXP(
  page: Page,
  user: TestUser,
  establishmentId?: string
): Promise<void> {
  try {
    // If no establishment ID provided, fetch one from API
    if (!establishmentId) {
      const estResponse = await fetch(`${API_BASE_URL}/establishments?limit=1`);
      const estData = await estResponse.json();

      // API returns { establishments: [...] }
      const establishments = estData.establishments || estData;
      establishmentId = establishments?.[0]?.id;

      if (!establishmentId) {
        console.warn('⚠️  No establishments available in database. Skipping check-in test.');
        throw new Error('No establishments available in database for testing. This is expected for fresh databases - seed data needed.');
      }

      console.log(`📍 Using establishment ID: ${establishmentId} for check-in test`);
    }

    // Get establishment coordinates
    const estDetailResponse = await fetch(`${API_BASE_URL}/establishments/${establishmentId}`);
    const estDetailData = await estDetailResponse.json();
    const establishment = estDetailData.establishment || estDetailData;

    // Use establishment coordinates (or fake nearby coordinates for testing)
    const latitude = establishment.latitude || 12.9305;
    const longitude = establishment.longitude || 100.8830;

    // Get cookies from browser context to include in API request
    const cookies = await page.context().cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Use CSRF token from user object (extracted from login response body)
    const csrfToken = user.csrfToken || '';

    // Call check-in endpoint
    const response = await fetch(`${API_BASE_URL}/gamification/check-in`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        establishmentId,
        latitude,
        longitude
      })
    });

    if (response.status === 200) {
      const responseData = await response.json();
      const { verified, xpAwarded, message } = responseData;
      console.log(`✅ Check-in ${verified ? 'verified' : 'recorded'}: ${message} (+${xpAwarded} XP)`);

      // Wait for backend to process mission progress
      await page.waitForLoadState('networkidle');

      // Reload page to see updated mission progress
      await page.reload();
      await page.waitForLoadState('networkidle');
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Check-in failed: ${errorMessage}`);
    throw new Error(`Check-in failed: ${errorMessage}`);
  }
}

/**
 * Get user's current XP from Header
 * @param page - Playwright page object
 * @returns Current XP value
 */
export async function getCurrentXP(page: Page): Promise<number> {
  // Locate XP value in header
  const xpText = await page.locator('.user-xp-value, [class*="xp"]').first().textContent();

  if (xpText) {
    // Extract number from "1,250 XP" → 1250
    const xp = parseInt(xpText.replace(/[^0-9]/g, ''), 10);
    return isNaN(xp) ? 0 : xp;
  }

  return 0;
}

/**
 * Wait for XP to update in Header
 * @param page - Playwright page object
 * @param expectedXP - Expected XP value
 * @param timeout - Max wait time (ms)
 */
export async function waitForXPUpdate(
  page: Page,
  expectedXP: number,
  timeout: number = 10000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const currentXP = await getCurrentXP(page);

    if (currentXP >= expectedXP) {
      console.log(`✅ XP updated to ${currentXP} (expected ≥${expectedXP})`);
      return;
    }

    await page.waitForLoadState('domcontentloaded'); // Check every iteration
  }

  throw new Error(`Timeout: XP did not reach ${expectedXP} within ${timeout}ms`);
}

// ========================================
// ADMIN USER HELPERS
// ========================================

/**
 * Login as admin user (uses mock auth by default)
 * @param page - Playwright page object
 * @param options - Options (useMock: false to force real auth)
 */
export async function loginAsAdmin(
  page: Page,
  options: { useMock?: boolean } = {}
): Promise<TestUser> {
  const useMock = options.useMock ?? USE_MOCK_AUTH;

  if (useMock) {
    console.log(`🔐 Using MOCK ADMIN AUTH`);
    await setupMockAdminAuth(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    console.log(`✅ Mock admin ready`);
    return {
      id: mockAdminUser.id,
      email: mockAdminUser.email,
      username: mockAdminUser.user_metadata.pseudonym,
      password: 'MockPassword123!',
      account_type: 'regular',
      csrfToken: 'mock-csrf-token'
    };
  }

  // Real admin login
  const adminUser: TestUser = {
    email: 'admin@test.com',
    username: 'AdminUser',
    password: 'SecureTestP@ssw0rd2024!',
    account_type: 'regular'
  };

  await loginUser(page, adminUser, { useMock: false });
  return adminUser;
}

// Re-export mock auth utilities for convenience
export { setupMockAuth, setupMockAdminAuth, mockUser, mockAdminUser } from './mockAuth';
