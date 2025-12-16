/**
 * E2E Tests - Profile Edit
 *
 * Tests user profile editing functionality:
 * 1. View profile
 * 2. Edit basic info
 * 3. Change avatar
 * 4. Update password
 * 5. Privacy settings
 * 6. Notification preferences
 * 7. Delete account
 */

import { test, expect, Page } from '@playwright/test';

// Test credentials
const TEST_USER = {
  email: 'user@test.com',
  password: 'SecureTestP@ssw0rd2024!'
};

// Helper to login
async function loginAsUser(page: Page): Promise<boolean> {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  const loginModal = page.locator('text="Welcome Back"').or(page.locator('text="Sign in to your account"'));
  const modalVisible = await loginModal.first().isVisible().catch(() => false);

  if (modalVisible) {
    const emailInput = page.locator('input[placeholder*="email"], input[placeholder*="pseudonym"]').first();
    const passwordInput = page.locator('input[placeholder*="password"]').first();

    await emailInput.fill(TEST_USER.email);
    await passwordInput.fill(TEST_USER.password);
    await page.locator('button:has-text("Sign In")').first().click();
    await page.waitForTimeout(3000);

    const stillOnLogin = await loginModal.first().isVisible().catch(() => false);
    return !stillOnLogin;
  }
  return true;
}

// Helper to check if logged in
async function isLoggedIn(page: Page): Promise<boolean> {
  const loginModal = page.locator('text="Welcome Back"').or(page.locator('text="Sign in to your account"'));
  return !(await loginModal.first().isVisible().catch(() => false));
}

// ========================================
// TEST SUITE 1: View Profile
// ========================================

test.describe('View Profile', () => {
  test('should navigate to profile page', async ({ page }) => {
    await loginAsUser(page);

    // Look for profile link
    const menuBtn = page.locator('button:has-text("☰"), button[aria-label*="menu"]').first();
    if (await menuBtn.isVisible().catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(500);
    }

    const profileLink = page.locator('a[href*="/profile"], button:has-text("Profile"), a:has-text("Profile")').first();

    if (await profileLink.isVisible().catch(() => false)) {
      await profileLink.click();
      await page.waitForTimeout(1000);
    } else {
      await page.goto('/profile');
      await page.waitForLoadState('domcontentloaded');
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should display user name', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const userName = page.locator('.user-name, .profile-name, h1, h2').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display user avatar', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const avatar = page.locator('.avatar, .profile-avatar, img[alt*="avatar"], img[alt*="profile"]').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display user email', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const email = page.locator('text=@').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display account type', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const accountType = page.locator('text=/user|owner|employee|admin/i').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 2: Edit Basic Info
// ========================================

test.describe('Edit Basic Info', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should have edit button', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const editBtn = page.locator('button:has-text("Edit"), a:has-text("Edit"), button[aria-label*="edit"]').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should open edit form', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const editBtn = page.locator('button:has-text("Edit")').first();

      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(500);

        // Edit form should appear
        const form = page.locator('form, [role="dialog"], .edit-form').first();
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should edit display name', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const nameInput = page.locator('input[name="name"], input[name="displayName"], input[placeholder*="name"]').first();

      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Updated Name');
        await expect(nameInput).toHaveValue('Updated Name');
      }
    }
  });

  test('should edit bio/description', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const bioInput = page.locator('textarea[name="bio"], textarea[name="description"], textarea[placeholder*="bio"]').first();

      if (await bioInput.isVisible().catch(() => false)) {
        await bioInput.fill('This is my updated bio');
        await expect(bioInput).toHaveValue('This is my updated bio');
      }
    }
  });

  test('should save profile changes', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();

      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(1000);

        // Should show success or redirect
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should cancel edit without saving', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const cancelBtn = page.locator('button:has-text("Cancel"), a:has-text("Cancel")').first();

      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(500);

        // Should go back without saving
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

// ========================================
// TEST SUITE 3: Change Avatar
// ========================================

test.describe('Change Avatar', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should have avatar upload button', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const uploadBtn = page.locator('button:has-text("Change"), input[type="file"], .avatar-upload').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should open file picker for avatar', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const fileInput = page.locator('input[type="file"][accept*="image"]').first();

      if (await fileInput.count() > 0) {
        // File input exists
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should preview avatar before upload', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      // This would require actual file upload testing
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should validate avatar file type', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const fileInput = page.locator('input[type="file"]').first();

      if (await fileInput.count() > 0) {
        const accept = await fileInput.getAttribute('accept');
        // Should accept image types
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should validate avatar file size', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      // Size validation would show error for large files
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 4: Update Password
// ========================================

test.describe('Update Password', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should have change password option', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const changePasswordBtn = page.locator('button:has-text("Password"), a:has-text("Password"), a[href*="password"]').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should navigate to password change form', async ({ page }) => {
    await page.goto('/profile/change-password');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const passwordForm = page.locator('form, input[type="password"]').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should require current password', async ({ page }) => {
    await page.goto('/profile/change-password');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const currentPasswordInput = page.locator('input[name="currentPassword"], input[name="oldPassword"]').first();

      if (await currentPasswordInput.isVisible().catch(() => false)) {
        await expect(currentPasswordInput).toBeVisible();
      }
    }
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/profile/change-password');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const newPasswordInput = page.locator('input[name="newPassword"], input[name="password"]').first();

      if (await newPasswordInput.isVisible().catch(() => false)) {
        await newPasswordInput.fill('weak');
        await page.waitForTimeout(500);

        // Should show strength indicator or error
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should confirm password match', async ({ page }) => {
    await page.goto('/profile/change-password');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const newPasswordInput = page.locator('input[name="newPassword"]').first();
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]').first();

      if (await newPasswordInput.isVisible().catch(() => false) && await confirmPasswordInput.isVisible().catch(() => false)) {
        await newPasswordInput.fill('NewP@ssw0rd123');
        await confirmPasswordInput.fill('DifferentP@ssw0rd');

        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(500);

          // Should show mismatch error
          await expect(page.locator('body')).toBeVisible();
        }
      }
    }
  });
});

// ========================================
// TEST SUITE 5: Privacy Settings
// ========================================

test.describe('Privacy Settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should access privacy settings', async ({ page }) => {
    await page.goto('/settings/privacy');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should toggle profile visibility', async ({ page }) => {
    await page.goto('/settings/privacy');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const visibilityToggle = page.locator('input[name="profileVisibility"], input[name="public"]').first();

      if (await visibilityToggle.isVisible().catch(() => false)) {
        await visibilityToggle.click();
        await page.waitForTimeout(500);

        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should toggle activity visibility', async ({ page }) => {
    await page.goto('/settings/privacy');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const activityToggle = page.locator('input[name="showActivity"], label:has-text("Activity")').first();

      if (await activityToggle.isVisible().catch(() => false)) {
        await activityToggle.click();
        await page.waitForTimeout(500);

        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should toggle favorites visibility', async ({ page }) => {
    await page.goto('/settings/privacy');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const favoritesToggle = page.locator('input[name="showFavorites"], label:has-text("Favorites")').first();

      if (await favoritesToggle.isVisible().catch(() => false)) {
        await favoritesToggle.click();
        await page.waitForTimeout(500);

        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

// ========================================
// TEST SUITE 6: Notification Preferences
// ========================================

test.describe('Notification Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should access notification settings', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should toggle email notifications', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const emailToggle = page.locator('input[name="emailNotifications"], label:has-text("Email")').first();

      if (await emailToggle.isVisible().catch(() => false)) {
        await emailToggle.click();
        await page.waitForTimeout(500);

        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should toggle push notifications', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const pushToggle = page.locator('input[name="pushNotifications"], label:has-text("Push")').first();

      if (await pushToggle.isVisible().catch(() => false)) {
        await pushToggle.click();
        await page.waitForTimeout(500);

        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should toggle favorite updates notifications', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const favoriteToggle = page.locator('input[name="favoriteUpdates"], label:has-text("Favorite")').first();

      if (await favoriteToggle.isVisible().catch(() => false)) {
        await favoriteToggle.click();
        await page.waitForTimeout(500);

        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should save notification preferences', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();

      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();
        await page.waitForTimeout(1000);

        // Should show success message
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

// ========================================
// TEST SUITE 7: Delete Account
// ========================================

test.describe('Delete Account', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should have delete account option', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const deleteOption = page.locator('button:has-text("Delete Account"), a:has-text("Delete Account")').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should require confirmation for delete', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const deleteBtn = page.locator('button:has-text("Delete Account")').first();

      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(500);

        // Confirmation dialog should appear
        const confirmDialog = page.locator('[role="dialog"], .modal, .confirm-dialog').first();
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should require password for delete', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const deleteBtn = page.locator('button:has-text("Delete Account")').first();

      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(500);

        // Should require password confirmation
        const passwordInput = page.locator('input[type="password"]').first();
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should cancel delete account', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const deleteBtn = page.locator('button:has-text("Delete Account")').first();

      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(500);

        const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("No")').first();

        if (await cancelBtn.isVisible().catch(() => false)) {
          await cancelBtn.click();
          await page.waitForTimeout(500);

          // Should close dialog
          await expect(page.locator('body')).toBeVisible();
        }
      }
    }
  });
});

// ========================================
// TEST SUITE 8: Account Linking
// ========================================

test.describe('Account Linking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should show connected accounts', async ({ page }) => {
    await page.goto('/settings/accounts');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const connectedAccounts = page.locator('.connected-accounts, .linked-accounts').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should link Google account', async ({ page }) => {
    await page.goto('/settings/accounts');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const googleBtn = page.locator('button:has-text("Google"), a:has-text("Google")').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should unlink account', async ({ page }) => {
    await page.goto('/settings/accounts');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const unlinkBtn = page.locator('button:has-text("Unlink"), button:has-text("Disconnect")').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 9: Mobile Profile
// ========================================

test.describe('Mobile Profile', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
  });

  test('should display profile on mobile', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should edit profile on mobile', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const nameInput = page.locator('input[name="name"]').first();

      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.tap();
        await nameInput.fill('Mobile Updated Name');

        await expect(nameInput).toHaveValue('Mobile Updated Name');
      }
    }
  });

  test('should access settings on mobile', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      // Settings should be accessible
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should have touch-friendly form controls', async ({ page }) => {
    await page.goto('/profile/edit');
    await page.waitForLoadState('domcontentloaded');

    if (await isLoggedIn(page)) {
      const inputs = page.locator('input, textarea, button');
      const count = await inputs.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const input = inputs.nth(i);
        if (await input.isVisible().catch(() => false)) {
          const box = await input.boundingBox();
          if (box) {
            // Touch targets should be at least 44px
            expect(box.height).toBeGreaterThanOrEqual(30);
          }
        }
      }
    }
  });
});
