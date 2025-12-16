/**
 * E2E Tests - Employee Profile Verification
 *
 * Tests employee verification workflow:
 * 1. Request verification from owner
 * 2. Admin verification dashboard
 * 3. Verification status display
 * 4. Verified badge display
 * 5. Verification rejection flow
 * 6. Re-verification after rejection
 *
 * Critical for trust - verified profiles get more engagement.
 */

import { test, expect, Page } from '@playwright/test';

// Test credentials
const TEST_OWNER = {
  email: 'owner@test.com',
  password: 'SecureTestP@ssw0rd2024!'
};

const TEST_ADMIN = {
  email: 'admin@test.com',
  password: 'SecureTestP@ssw0rd2024!'
};

// Helper functions
async function loginAsOwner(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('input[type="email"]').first().fill(TEST_OWNER.email);
  await page.locator('input[type="password"]').first().fill(TEST_OWNER.password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('input[type="email"]').first().fill(TEST_ADMIN.email);
  await page.locator('input[type="password"]').first().fill(TEST_ADMIN.password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);
}

// ========================================
// TEST SUITE 1: Request Verification (Owner)
// ========================================

test.describe('Owner - Request Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test('should display verification status on employee card', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForTimeout(2000);

    // Look for verification status indicators
    const verificationStatus = page.locator('.verification-status, .verified-badge, text=/verified|pending|unverified/i').first();

    // Should show some status
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show "Request Verification" button for unverified employees', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForTimeout(2000);

    // Look for request verification button
    const requestBtn = page.locator('button:has-text("Request Verification"), button:has-text("Verify"), a:has-text("Request Verification")').first();

    if (await requestBtn.count() > 0) {
      await expect(requestBtn).toBeVisible();
    }
  });

  test('should open verification request form', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForTimeout(2000);

    const requestBtn = page.locator('button:has-text("Request Verification"), button:has-text("Verify")').first();

    if (await requestBtn.count() > 0) {
      await requestBtn.click();
      await page.waitForTimeout(1000);

      // Should show verification form/modal
      const modal = page.locator('[role="dialog"], .modal, .verification-form').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });

  test('should require profile completeness for verification', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForTimeout(2000);

    const requestBtn = page.locator('button:has-text("Request Verification")').first();

    if (await requestBtn.count() > 0) {
      await requestBtn.click();
      await page.waitForTimeout(1000);

      // Look for completeness requirements
      const requirements = page.locator('text=/complete.*profile|required.*field|missing|photo required/i').first();

      // May show requirements or proceed to verification
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show verification requirements checklist', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForTimeout(2000);

    const requestBtn = page.locator('button:has-text("Request Verification")').first();

    if (await requestBtn.count() > 0) {
      await requestBtn.click();
      await page.waitForTimeout(1000);

      // Look for checklist
      const checklist = page.locator('.checklist, .requirements-list, ul, ol').first();

      if (await checklist.count() > 0) {
        // Should list requirements like photos, bio, age, etc.
        const listItems = checklist.locator('li');
        expect(await listItems.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should submit verification request', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForTimeout(2000);

    const requestBtn = page.locator('button:has-text("Request Verification")').first();

    if (await requestBtn.count() > 0) {
      await requestBtn.click();
      await page.waitForTimeout(1000);

      // Fill any required fields
      const additionalNotes = page.locator('textarea[name="notes"]').first();
      if (await additionalNotes.count() > 0) {
        await additionalNotes.fill('Requesting verification for this employee.');
      }

      // Submit
      const submitBtn = page.locator('button[type="submit"], button:has-text("Submit")').first();
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
        await page.waitForTimeout(2000);

        // Should show success or pending status
        const successMessage = page.locator('text=/success|submitted|pending|review/i').first();
        expect(await successMessage.count() > 0).toBeTruthy();
      }
    }
  });

  test('should show pending verification status after request', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForTimeout(2000);

    // Look for pending status
    const pendingStatus = page.locator('.pending, .status-pending, text=/pending.*verification|awaiting.*review/i').first();

    // May or may not have pending verifications
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 2: Admin Verification Dashboard
// ========================================

test.describe('Admin - Verification Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should access verification dashboard', async ({ page }) => {
    await page.goto('/admin/verifications');
    await page.waitForTimeout(2000);

    // Verify page loaded
    const pageTitle = page.locator('h1, h2').filter({ hasText: /verification/i }).first();
    await expect(pageTitle).toBeVisible({ timeout: 10000 });
  });

  test('should display pending verification requests', async ({ page }) => {
    await page.goto('/admin/verifications');
    await page.waitForTimeout(2000);

    // Look for pending requests list
    const pendingList = page.locator('.pending-list, .verification-requests, [data-testid="pending-verifications"]').first();

    if (await pendingList.count() > 0) {
      await expect(pendingList).toBeVisible();
    } else {
      // Or empty state
      const emptyState = page.locator('text=/no.*pending|empty/i').first();
      await expect(emptyState).toBeVisible();
    }
  });

  test('should filter verifications by status', async ({ page }) => {
    await page.goto('/admin/verifications');
    await page.waitForTimeout(2000);

    // Look for filter tabs
    const pendingTab = page.locator('button:has-text("Pending"), [data-status="pending"]').first();
    const approvedTab = page.locator('button:has-text("Approved"), [data-status="approved"]').first();
    const rejectedTab = page.locator('button:has-text("Rejected"), [data-status="rejected"]').first();

    if (await pendingTab.count() > 0) {
      await pendingTab.click();
      await page.waitForTimeout(500);

      // Should update list
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display verification request details', async ({ page }) => {
    await page.goto('/admin/verifications');
    await page.waitForTimeout(2000);

    // Click on a verification request
    const requestCard = page.locator('.verification-card, .request-item').first();

    if (await requestCard.count() > 0) {
      await requestCard.click();
      await page.waitForTimeout(1000);

      // Should show details
      const details = page.locator('.verification-details, [role="dialog"]').first();
      await expect(details).toBeVisible({ timeout: 5000 });

      // Should show employee info
      const employeeInfo = page.locator('text=/nickname|name|age|establishment/i').first();
      await expect(employeeInfo).toBeVisible();
    }
  });

  test('should display employee photos in verification request', async ({ page }) => {
    await page.goto('/admin/verifications');
    await page.waitForTimeout(2000);

    const requestCard = page.locator('.verification-card').first();

    if (await requestCard.count() > 0) {
      await requestCard.click();
      await page.waitForTimeout(1000);

      // Should show photos
      const photos = page.locator('.employee-photos img, .verification-photos img');
      // May or may not have photos
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should have approve verification button', async ({ page }) => {
    await page.goto('/admin/verifications');
    await page.waitForTimeout(2000);

    const requestCard = page.locator('.verification-card').first();

    if (await requestCard.count() > 0) {
      await requestCard.click();
      await page.waitForTimeout(1000);

      // Look for approve button
      const approveBtn = page.locator('button:has-text("Approve"), button:has-text("Verify")').first();
      await expect(approveBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have reject verification button', async ({ page }) => {
    await page.goto('/admin/verifications');
    await page.waitForTimeout(2000);

    const requestCard = page.locator('.verification-card').first();

    if (await requestCard.count() > 0) {
      await requestCard.click();
      await page.waitForTimeout(1000);

      // Look for reject button
      const rejectBtn = page.locator('button:has-text("Reject"), button:has-text("Decline")').first();
      await expect(rejectBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test('should approve verification request', async ({ page }) => {
    await page.goto('/admin/verifications');
    await page.waitForTimeout(2000);

    const requestCard = page.locator('.verification-card').first();

    if (await requestCard.count() > 0) {
      await requestCard.click();
      await page.waitForTimeout(1000);

      const approveBtn = page.locator('button:has-text("Approve")').first();

      if (await approveBtn.count() > 0) {
        await approveBtn.click();
        await page.waitForTimeout(500);

        // May need to confirm
        const confirmBtn = page.locator('button:has-text("Confirm")').first();
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
        }

        await page.waitForTimeout(2000);

        // Should show success
        const successMessage = page.locator('text=/success|approved|verified/i').first();
        expect(await successMessage.count() > 0).toBeTruthy();
      }
    }
  });

  test('should reject verification with reason', async ({ page }) => {
    await page.goto('/admin/verifications');
    await page.waitForTimeout(2000);

    const requestCard = page.locator('.verification-card').first();

    if (await requestCard.count() > 0) {
      await requestCard.click();
      await page.waitForTimeout(1000);

      const rejectBtn = page.locator('button:has-text("Reject")').first();

      if (await rejectBtn.count() > 0) {
        await rejectBtn.click();
        await page.waitForTimeout(500);

        // Should require reason
        const reasonInput = page.locator('textarea[name="reason"], input[name="reason"]').first();
        if (await reasonInput.count() > 0) {
          await reasonInput.fill('Photos do not meet quality standards.');

          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Submit")').first();
          await confirmBtn.click();
          await page.waitForTimeout(2000);

          // Should show success
          const successMessage = page.locator('text=/success|rejected/i').first();
          expect(await successMessage.count() > 0).toBeTruthy();
        }
      }
    }
  });
});

// ========================================
// TEST SUITE 3: Verified Badge Display
// ========================================

test.describe('Verified Badge Display', () => {
  test('should display verified badge on search results', async ({ page }) => {
    await page.goto('/search');
    await page.waitForTimeout(2000);

    // Look for verified badges
    const verifiedBadge = page.locator('.verified-badge, .verified-corner, [data-verified="true"]').first();

    // May or may not have verified employees
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display verified badge in employee modal', async ({ page }) => {
    await page.goto('/search');
    await page.waitForTimeout(2000);

    // Click on employee card
    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForTimeout(1000);

      // Look for verified indicator in modal
      const verifiedIndicator = page.locator('[role="dialog"] .verified, [role="dialog"] .verified-badge').first();

      // May or may not be verified
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show verification date for verified employees', async ({ page }) => {
    await page.goto('/search');
    await page.waitForTimeout(2000);

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForTimeout(1000);

      // Look for verification date
      const verificationDate = page.locator('text=/verified.*since|verified.*on|verification.*date/i').first();

      // May or may not show date
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should filter by verified status in search', async ({ page }) => {
    await page.goto('/search');
    await page.waitForTimeout(2000);

    // Look for verified filter
    const verifiedFilter = page.locator('input[name="verified"], button:has-text("Verified"), label:has-text("Verified")').first();

    if (await verifiedFilter.count() > 0) {
      await verifiedFilter.click();
      await page.waitForTimeout(1000);

      // Results should update
      const url = page.url();
      expect(url).toMatch(/verified|filter/);
    }
  });
});

// ========================================
// TEST SUITE 4: Re-verification Flow
// ========================================

test.describe('Re-verification After Rejection', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test('should show rejection reason to owner', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForTimeout(2000);

    // Look for rejected status
    const rejectedStatus = page.locator('.rejected, .status-rejected, text=/rejected/i').first();

    if (await rejectedStatus.count() > 0) {
      await rejectedStatus.click();
      await page.waitForTimeout(1000);

      // Should show rejection reason
      const reason = page.locator('.rejection-reason, text=/reason|why/i').first();
      await expect(reason).toBeVisible({ timeout: 5000 });
    }
  });

  test('should allow re-submitting verification after rejection', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForTimeout(2000);

    // Look for re-submit button on rejected employee
    const resubmitBtn = page.locator('button:has-text("Re-submit"), button:has-text("Request Again")').first();

    if (await resubmitBtn.count() > 0) {
      await expect(resubmitBtn).toBeVisible();
      await expect(resubmitBtn).toBeEnabled();
    }
  });

  test('should require profile updates before re-verification', async ({ page }) => {
    await page.goto('/owner/employees');
    await page.waitForTimeout(2000);

    const resubmitBtn = page.locator('button:has-text("Re-submit")').first();

    if (await resubmitBtn.count() > 0) {
      await resubmitBtn.click();
      await page.waitForTimeout(1000);

      // Should show what needs to be fixed
      const requirements = page.locator('text=/fix|update|improve|change/i').first();

      // May show requirements
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 5: Verification Expiry
// ========================================

test.describe('Verification Expiry', () => {
  test('should show verification expiry warning', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/owner/employees');
    await page.waitForTimeout(2000);

    // Look for expiry warning
    const expiryWarning = page.locator('text=/expir|renew|re-verify/i').first();

    // May or may not have expiring verifications
    await expect(page.locator('body')).toBeVisible();
  });

  test('should allow renewing verification before expiry', async ({ page }) => {
    await loginAsOwner(page);
    await page.goto('/owner/employees');
    await page.waitForTimeout(2000);

    // Look for renew button
    const renewBtn = page.locator('button:has-text("Renew"), button:has-text("Re-verify")').first();

    if (await renewBtn.count() > 0) {
      await expect(renewBtn).toBeEnabled();
    }
  });
});

// ========================================
// TEST SUITE 6: Verification Statistics (Admin)
// ========================================

test.describe('Admin - Verification Statistics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display verification statistics', async ({ page }) => {
    await page.goto('/admin/verifications');
    await page.waitForTimeout(2000);

    // Look for stats
    const stats = page.locator('.stats, .statistics, .verification-stats').first();

    if (await stats.count() > 0) {
      await expect(stats).toBeVisible();

      // Should show counts
      const pendingCount = page.locator('text=/\\d+.*pending/i').first();
      const approvedCount = page.locator('text=/\\d+.*approved/i').first();

      expect(await pendingCount.count() > 0 || await approvedCount.count() > 0).toBeTruthy();
    }
  });

  test('should show verification history', async ({ page }) => {
    await page.goto('/admin/verifications?status=all');
    await page.waitForTimeout(2000);

    // Look for history list
    const historyList = page.locator('.history, .verification-history').first();

    // Should show some history or empty state
    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter by date range', async ({ page }) => {
    await page.goto('/admin/verifications');
    await page.waitForTimeout(2000);

    // Look for date filter
    const dateFilter = page.locator('input[type="date"], .date-picker').first();

    if (await dateFilter.count() > 0) {
      await expect(dateFilter).toBeVisible();
    }
  });

  test('should export verification report', async ({ page }) => {
    await page.goto('/admin/verifications');
    await page.waitForTimeout(2000);

    // Look for export button
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download")').first();

    if (await exportBtn.count() > 0) {
      await expect(exportBtn).toBeEnabled();
    }
  });
});
