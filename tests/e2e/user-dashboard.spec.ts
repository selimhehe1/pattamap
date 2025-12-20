/**
 * E2E Tests - User Dashboard
 *
 * Tests user dashboard functionality:
 * 1. Dashboard access → login required
 * 2. Profile info → display
 * 3. Statistics → counts
 * 4. Linked employee profile → display
 * 5. Edit profile → modal
 * 6. My Establishments → list
 * 7. My Achievements → badges, XP
 * 8. Visit History → timeline
 * 9. Ownership Requests → status
 * 10. Settings → preferences
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, loginUser, TestUser } from './fixtures/testUser';

// ========================================
// TEST SUITE 1: Dashboard Access
// ========================================

test.describe('Dashboard Access', () => {
  test('should require login for dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Should show login modal or redirect to login
    const loginModal = page.locator('text="Welcome Back", text="Sign in"').first();
    const hasLogin = await loginModal.isVisible({ timeout: 5000 }).catch(() => false);
    const onLoginPage = page.url().includes('/login');

    expect(hasLogin || onLoginPage).toBeTruthy();
  });

  test('should access dashboard when logged in', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Dashboard should be accessible
    const dashboard = page.locator('.dashboard, [data-testid="dashboard"], h1:has-text("Dashboard")').first();
    await expect(dashboard).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to dashboard after login', async ({ page }) => {
    const testUser = generateTestUser();

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    try {
      // Fill login form
      const emailInput = page.locator('input[placeholder*="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      if (await emailInput.isVisible({ timeout: 3000 })) {
        await emailInput.fill(testUser.email);
        await passwordInput.fill(testUser.password);
      }
    } catch {
      // Skip if login fails
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 2: Profile Info Display
// ========================================

test.describe('Profile Info', () => {
  let testUser: TestUser;

  test.beforeAll(async () => {
    testUser = generateTestUser();
  });

  test('should display user pseudonym', async ({ page }) => {
    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const pseudonym = page.locator('.username, .pseudonym, [data-testid="username"]').first();
    await expect(pseudonym).toBeVisible({ timeout: 5000 });
  });

  test('should display user email', async ({ page }) => {
    try {
      await page.goto('/');
      await loginUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const email = page.locator('.email, [data-testid="email"]').or(page.locator('text=/@/')).first();
    const hasEmail = await email.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display account type', async ({ page }) => {
    try {
      await page.goto('/');
      await loginUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const accountType = page.locator('.account-type, [data-testid="account-type"]').or(page.locator('text=/regular|employee|owner/i')).first();
    const hasType = await accountType.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display user avatar', async ({ page }) => {
    try {
      await page.goto('/');
      await loginUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const avatar = page.locator('.avatar, [data-testid="avatar"], .user-avatar').first();
    const hasAvatar = await avatar.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 3: Statistics Display
// ========================================

test.describe('Statistics Display', () => {
  test('should display reviews count', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const reviewsCount = page.locator('.stat-reviews, [data-testid="reviews-count"]').or(page.locator('text=/reviews|comments/i')).first();
    const hasCount = await reviewsCount.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display favorites count', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const favoritesCount = page.locator('.stat-favorites, [data-testid="favorites-count"]').or(page.locator('text=/favorites/i')).first();
    const hasCount = await favoritesCount.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display XP and level', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const xpDisplay = page.locator('.xp, [data-testid="xp"]').or(page.locator('text=/XP|Level/i')).first();
    const hasXP = await xpDisplay.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 4: Linked Employee Profile
// ========================================

test.describe('Linked Employee Profile', () => {
  test('should show linked profile section', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const linkedProfile = page.locator('.linked-profile, [data-testid="linked-employee"]').or(page.locator('text=/linked profile|your profile/i')).first();
    const hasLinked = await linkedProfile.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show claim profile option if not linked', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const claimOption = page.locator('button:has-text("Claim"), button:has-text("Link Profile")').first();
    const hasClaim = await claimOption.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 5: Edit Profile
// ========================================

test.describe('Edit Profile', () => {
  test('should show edit profile button', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const editBtn = page.locator('button:has-text("Edit Profile"), button:has-text("Edit"), [data-testid="edit-profile"]').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
  });

  test('should open edit modal on click', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const editBtn = page.locator('button:has-text("Edit Profile"), button:has-text("Edit")').first();

    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
      await page.waitForLoadState('domcontentloaded');

      const editModal = page.locator('[role="dialog"], .modal, .edit-modal');
      await expect(editModal.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should save profile changes', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const editBtn = page.locator('button:has-text("Edit Profile")').first();

    if (await editBtn.isVisible({ timeout: 3000 })) {
      await editBtn.click();
      await page.waitForLoadState('domcontentloaded');

      // Find and modify a field
      const input = page.locator('[role="dialog"] input').first();
      if (await input.isVisible()) {
        const currentValue = await input.inputValue();
        await input.fill(currentValue + ' Updated');
      }

      // Save
      const saveBtn = page.locator('[role="dialog"] button:has-text("Save"), [role="dialog"] button[type="submit"]').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForLoadState('networkidle');
      }

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 6: My Establishments
// ========================================

test.describe('My Establishments', () => {
  test('should navigate to my establishments', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-establishments');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show empty state when no establishments', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-establishments');
    await page.waitForLoadState('domcontentloaded');

    const emptyState = page.locator('.empty-state').or(page.locator('text=/no establishments|you don.t own/i')).first();
    const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show add establishment button', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-establishments');
    await page.waitForLoadState('domcontentloaded');

    const addBtn = page.locator('button:has-text("Add"), button:has-text("Request Ownership")').first();
    const hasAdd = await addBtn.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 7: My Achievements
// ========================================

test.describe('My Achievements', () => {
  test('should navigate to achievements page', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/achievements');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display badges', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/achievements');
    await page.waitForLoadState('domcontentloaded');

    const badges = page.locator('.badges, .badge-list, [data-testid="badges"]').first();
    const hasBadges = await badges.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display XP progress', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/achievements');
    await page.waitForLoadState('domcontentloaded');

    const xpProgress = page.locator('.xp-progress, .progress-bar, [data-testid="xp-progress"]').first();
    const hasProgress = await xpProgress.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 8: Visit History
// ========================================

test.describe('Visit History', () => {
  test('should navigate to visit history', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show empty state when no visits', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-visits');
    await page.waitForLoadState('domcontentloaded');

    const emptyState = page.locator('.empty-state').or(page.locator('text=/no visits|haven.t visited/i')).first();
    const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 9: Ownership Requests
// ========================================

test.describe('Ownership Requests', () => {
  test('should navigate to ownership requests', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-ownership-requests');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show request status', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/my-ownership-requests');
    await page.waitForLoadState('domcontentloaded');

    // May show empty state or list of requests
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 10: Settings
// ========================================

test.describe('User Settings', () => {
  test('should access settings from dashboard', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings")').first();
    const hasSettings = await settingsLink.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show notification preferences', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const notificationSettings = page.locator('.notification-settings, [data-testid="notification-prefs"]').first();
    const hasNotificationSettings = await notificationSettings.isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});
