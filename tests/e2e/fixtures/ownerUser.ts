/**
 * Owner User Fixture - PattaMap E2E Tests
 *
 * Helper functions to create and authenticate establishment owner users.
 * Uses mock authentication by default to avoid rate limiting.
 */

import { Page } from '@playwright/test';
import {
  setupMockAuth,
  mockBackendAuthMe,
  mockOwnerUser,
  mockOwnerSession
} from './mockAuth';

// Match testUser.ts and adminUser.ts behavior: use mock auth by default
const USE_MOCK_AUTH = process.env.E2E_USE_MOCK_AUTH !== 'false';

export interface OwnerTestUser {
  id?: string;
  email: string;
  username: string;
  password: string;
  account_type: 'establishment_owner';
  csrfToken?: string;
}

/**
 * Pre-configured owner credentials for testing
 */
export const OWNER_CREDENTIALS = {
  email: 'owner@test.com',
  password: 'SecureTestP@ssw0rd2024!',
  username: 'testowner'
};

/**
 * Generate unique owner test user credentials
 */
export function generateOwnerUser(): OwnerTestUser {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    email: `owner.e2e.${timestamp}.${random}@pattamap.test`,
    username: `OwnerUser${timestamp}${random}`,
    password: 'OwnerTestP@ss2024!',
    account_type: 'establishment_owner'
  };
}

/**
 * Login as establishment owner via mock auth
 * @param page - Playwright page object
 * @param credentials - Optional custom credentials
 */
export async function loginAsOwner(
  page: Page,
  credentials?: Partial<OwnerTestUser>
): Promise<OwnerTestUser> {
  const owner: OwnerTestUser = {
    ...OWNER_CREDENTIALS,
    account_type: 'establishment_owner',
    ...credentials
  };

  if (USE_MOCK_AUTH) {
    console.log(`🔐 Using MOCK OWNER AUTH for: ${owner.email}`);

    // Setup mock auth with owner privileges
    await setupMockAuth(page, { isOwner: true });
    await mockBackendAuthMe(page, 'owner');

    // Mock the login endpoint
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: mockOwnerUser.id,
            email: mockOwnerUser.email,
            pseudonym: mockOwnerUser.user_metadata.pseudonym,
            role: 'user',
            account_type: 'establishment_owner'
          },
          csrfToken: 'mock-csrf-token-owner',
          session: mockOwnerSession
        })
      });
    });

    // Mock owner-specific API endpoints
    await page.route('**/api/owner/establishments**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          establishments: [
            {
              id: 'mock-establishment-1',
              name: 'Test Establishment',
              category: 'bar',
              status: 'approved'
            }
          ]
        })
      });
    });

    // Mock establishments endpoints (used by various pages)
    await page.route('**/api/establishments**', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            establishments: [
              {
                id: 'mock-establishment-1',
                name: 'Test Establishment',
                category: 'bar',
                status: 'approved',
                is_claimed: false
              }
            ]
          })
        });
      } else {
        route.continue();
      }
    });

    // Mock employees list for owner
    await page.route('**/api/owner/employees**', route => {
      const method = route.request().method();
      if (method === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            employees: []
          })
        });
      } else if (method === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            employee: {
              id: 'mock-employee-' + Date.now(),
              nickname: 'New Employee',
              status: 'pending'
            },
            message: 'Employee created successfully'
          })
        });
      } else {
        route.continue();
      }
    });

    // Mock employees endpoints (general)
    await page.route('**/api/employees**', route => {
      const method = route.request().method();
      if (method === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            employees: []
          })
        });
      } else if (method === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            employee: {
              id: 'mock-employee-' + Date.now(),
              nickname: 'New Employee',
              status: 'pending'
            },
            message: 'Employee created successfully'
          })
        });
      } else {
        route.continue();
      }
    });

    // Mock claims endpoints
    await page.route('**/api/claims**', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ claims: [] })
        });
      } else {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            claim: { id: 'mock-claim-1', status: 'pending' },
            message: 'Claim submitted successfully'
          })
        });
      }
    });

    // Mock establishment categories
    await page.route('**/api/establishments/categories**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          categories: ['bar', 'club', 'restaurant', 'massage', 'other']
        })
      });
    });

    owner.id = mockOwnerUser.id;
    owner.csrfToken = 'mock-csrf-token-owner';

    // Navigate to home first to let AuthContext initialize
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log(`✅ Mock Owner ready: ${owner.email} (account_type: establishment_owner)`);
    return owner;
  }

  // Real API login (fallback - rarely used)
  throw new Error('Real owner login not implemented - use mock auth');
}

/**
 * Navigate to owner dashboard after login
 * @param page - Playwright page object
 */
export async function navigateToOwnerDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Navigate to owner's establishments page
 * @param page - Playwright page object
 */
export async function navigateToMyEstablishments(page: Page): Promise<void> {
  await page.goto('/my-establishments');
  await page.waitForLoadState('domcontentloaded');
}
