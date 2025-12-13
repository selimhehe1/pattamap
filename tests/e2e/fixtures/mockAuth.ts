/**
 * Mock Auth Fixture - PattaMap E2E Tests
 *
 * Intercept Supabase auth calls to avoid rate limiting.
 * Use this for most tests that need authentication.
 *
 * Benefits:
 * - Zero real auth requests = no rate limiting
 * - Tests run 10x faster
 * - Works perfectly in CI/CD
 * - E2E tests focus on UI, not Supabase Auth
 *
 * Usage:
 *   import { setupMockAuth } from './fixtures/mockAuth';
 *
 *   test.beforeEach(async ({ page }) => {
 *     await setupMockAuth(page);
 *   });
 */

import { Page } from '@playwright/test';

// ========================================
// MOCK USER DATA
// ========================================

export const mockUser = {
  id: 'mock-user-id-12345-e2e-test',
  email: 'test@pattamap.com',
  user_metadata: {
    pseudonym: 'TestUser',
    avatar_url: null
  },
  app_metadata: {
    role: 'user',
    account_type: 'regular'
  },
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const mockSession = {
  access_token: 'mock-access-token-e2e-test-12345',
  refresh_token: 'mock-refresh-token-e2e-test-67890',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: mockUser
};

export const mockAdminUser = {
  ...mockUser,
  id: 'mock-admin-id-12345-e2e-test',
  email: 'admin@pattamap.com',
  user_metadata: {
    pseudonym: 'AdminUser',
    avatar_url: null
  },
  app_metadata: {
    role: 'admin',
    account_type: 'regular'
  }
};

export const mockAdminSession = {
  ...mockSession,
  access_token: 'mock-admin-access-token-e2e-test',
  user: mockAdminUser
};

// ========================================
// SUPABASE AUTH MOCKING
// ========================================

/**
 * Setup mock authentication by intercepting Supabase auth endpoints
 * and setting localStorage to simulate logged-in state.
 *
 * @param page - Playwright page object
 * @param options - Optional configuration
 */
export async function setupMockAuth(
  page: Page,
  options: {
    user?: typeof mockUser;
    session?: typeof mockSession;
    isAdmin?: boolean;
  } = {}
): Promise<void> {
  const user = options.isAdmin ? mockAdminUser : (options.user || mockUser);
  const session = options.isAdmin ? mockAdminSession : (options.session || mockSession);

  // Intercept Supabase auth token endpoint (login/refresh)
  await page.route('**/auth/v1/token**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: session.expires_at,
        user: user
      })
    });
  });

  // Intercept Supabase signup endpoint
  await page.route('**/auth/v1/signup', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: user,
        session: session
      })
    });
  });

  // Intercept Supabase user endpoint (get current user)
  await page.route('**/auth/v1/user', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user)
    });
  });

  // Intercept Supabase logout endpoint
  await page.route('**/auth/v1/logout', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({})
    });
  });

  // Set localStorage before page loads to simulate logged-in state
  await page.addInitScript((sessionData) => {
    // Supabase stores auth in localStorage with project-specific key
    // Format: sb-{project-ref}-auth-token
    const supabaseKey = Object.keys(localStorage).find(key =>
      key.startsWith('sb-') && key.endsWith('-auth-token')
    );

    // Set the auth token in localStorage
    const authData = {
      currentSession: sessionData.session,
      expiresAt: sessionData.session.expires_at
    };

    // If we found an existing key, use it; otherwise use a generic one
    const storageKey = supabaseKey || 'sb-pattamap-auth-token';
    localStorage.setItem(storageKey, JSON.stringify(authData));

    // Also set the modern Supabase format
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      currentSession: sessionData.session,
      expiresAt: sessionData.session.expires_at
    }));
  }, { session, user });

  console.log(`✅ Mock Auth setup for: ${user.email} (${options.isAdmin ? 'admin' : 'user'})`);
}

/**
 * Setup mock admin authentication
 *
 * @param page - Playwright page object
 */
export async function setupMockAdminAuth(page: Page): Promise<void> {
  await setupMockAuth(page, { isAdmin: true });
}

/**
 * Clear mock authentication (simulate logout)
 *
 * @param page - Playwright page object
 */
export async function clearMockAuth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Clear all Supabase auth keys
    const keysToRemove = Object.keys(localStorage).filter(key =>
      key.includes('supabase') || key.startsWith('sb-')
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));
  });
}

// ========================================
// BACKEND API MOCKING (Optional)
// ========================================

/**
 * Mock backend /api/auth/me endpoint to return mock user
 * Use this if your backend validates the session
 *
 * @param page - Playwright page object
 * @param isAdmin - Whether to mock admin user
 */
export async function mockBackendAuthMe(page: Page, isAdmin: boolean = false): Promise<void> {
  const user = isAdmin ? mockAdminUser : mockUser;

  await page.route('**/api/auth/me', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          pseudonym: user.user_metadata.pseudonym,
          role: user.app_metadata.role,
          account_type: user.app_metadata.account_type,
          xp: 150,
          level: 2,
          streak: 3
        },
        isAuthenticated: true
      })
    });
  });
}

/**
 * Mock gamification data for authenticated user
 *
 * @param page - Playwright page object
 * @param xp - XP amount
 * @param level - User level
 */
export async function mockUserGamificationData(
  page: Page,
  xp: number = 150,
  level: number = 2
): Promise<void> {
  await page.route('**/api/gamification/profile**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        xp,
        level,
        streak: 3,
        badges: [
          { id: 'first_review', name: 'First Review', icon: 'star' },
          { id: 'explorer', name: 'Explorer', icon: 'map' }
        ],
        rank: 42
      })
    });
  });
}

// ========================================
// COMPLETE MOCK SETUP (Auth + API)
// ========================================

/**
 * Complete mock setup for tests that need both auth and API mocking
 *
 * @param page - Playwright page object
 * @param options - Configuration options
 */
export async function setupCompleteMock(
  page: Page,
  options: {
    isAdmin?: boolean;
    xp?: number;
    level?: number;
  } = {}
): Promise<void> {
  await setupMockAuth(page, { isAdmin: options.isAdmin });
  await mockBackendAuthMe(page, options.isAdmin);
  await mockUserGamificationData(page, options.xp || 150, options.level || 2);
}

// ========================================
// TEST USER INTERFACE (Compatible with testUser.ts)
// ========================================

export interface MockTestUser {
  id: string;
  email: string;
  username: string;
  password: string;
  account_type: 'regular' | 'employee' | 'establishment_owner';
  csrfToken: string;
}

/**
 * Generate a mock test user (compatible with testUser.ts interface)
 */
export function generateMockTestUser(): MockTestUser {
  return {
    id: mockUser.id,
    email: mockUser.email,
    username: mockUser.user_metadata.pseudonym,
    password: 'MockPassword123!',
    account_type: 'regular',
    csrfToken: 'mock-csrf-token-e2e-test'
  };
}

/**
 * "Register" mock user (actually just sets up mock auth)
 * Compatible with testUser.ts registerUser signature
 */
export async function registerMockUser(page: Page, _user?: MockTestUser): Promise<void> {
  await setupMockAuth(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * "Login" mock user (actually just sets up mock auth)
 * Compatible with testUser.ts loginUser signature
 */
export async function loginMockUser(page: Page, _user?: MockTestUser): Promise<void> {
  await setupMockAuth(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}
