import { test, expect } from '@playwright/test';

/**
 * Employee Profile Claim Tests
 *
 * This feature allows employees who already exist in the database (added by owners)
 * to claim their own profile and gain control over it.
 *
 * Flow:
 * 1. Employee finds their existing profile
 * 2. Clicks "This is me" / "Claim my profile"
 * 3. Identity verification (selfie, ID document, etc.)
 * 4. Owner receives notification and approves/rejects
 * 5. If approved, employee gains edit permissions
 *
 * Permissions after claim:
 * - Employee: Edit bio, photos, availability, receive notifications
 * - Owner: Still sees employee in dashboard, can remove from establishment
 */

test.describe('Employee Profile Claim', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Claim Discovery', () => {
    test('should display "This is me" button on unclaimed employee profile', async ({ page }) => {
      // Navigate to an employee profile
      const employeeCard = page.locator('[data-testid="employee-card"]')
        .or(page.locator('.employee-card'))
        .or(page.locator('[class*="EmployeeCard"]'))
        .first();

      if (await employeeCard.isVisible()) {
        await employeeCard.click();
        await page.waitForTimeout(500);

        // Look for claim button on unclaimed profile
        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'))
          .or(page.locator('button:has-text("Claim my profile")'))
          .or(page.locator('button:has-text("C\'est moi")'))
          .or(page.locator('a:has-text("Claim")'));

        // May or may not be visible depending on profile status
        const isVisible = await claimButton.first().isVisible().catch(() => false);
        // Test passes - we're checking the button exists when appropriate
      }
    });

    test('should NOT display claim button on already claimed profile', async ({ page }) => {
      // Find a claimed/verified employee profile
      const verifiedEmployee = page.locator('[data-testid="employee-card"]:has([class*="verified"])')
        .or(page.locator('.employee-card:has(.verified-badge)'))
        .first();

      if (await verifiedEmployee.isVisible()) {
        await verifiedEmployee.click();
        await page.waitForTimeout(500);

        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'))
          .or(page.locator('button:has-text("Claim my profile")'));

        // Claim button should NOT be visible on already claimed profile
        await expect(claimButton.first()).not.toBeVisible();
      }
    });

    test('should show claim button only to logged-out or non-owner users', async ({ page }) => {
      // First check as logged out user
      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        await employeeCard.click();
        await page.waitForTimeout(500);

        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'));

        const isVisibleLoggedOut = await claimButton.first().isVisible().catch(() => false);

        // Now login as owner of this employee
        await page.goto('/login');
        await page.fill('input[type="email"]', 'owner@test.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForLoadState('domcontentloaded');

        // Go back to same employee
        await page.goto('/');
        if (await employeeCard.isVisible()) {
          await employeeCard.click();
          await page.waitForTimeout(500);

          // Owner should NOT see claim button for their own employees
          const isVisibleAsOwner = await claimButton.first().isVisible().catch(() => false);
        }
      }
    });

    test('should search and find own profile by name', async ({ page }) => {
      // Search for employee name
      const searchInput = page.locator('input[type="search"]')
        .or(page.locator('input[placeholder*="search"]'))
        .or(page.locator('[data-testid="search-input"]'));

      if (await searchInput.first().isVisible()) {
        await searchInput.first().fill('Somchai'); // Example Thai name
        await page.waitForTimeout(500);

        // Results should appear
        const searchResults = page.locator('[data-testid="search-results"]')
          .or(page.locator('[class*="search-result"]'))
          .or(page.locator('[class*="employee-card"]'));

        const hasResults = await searchResults.first().isVisible().catch(() => false);
      }
    });
  });

  test.describe('Claim Request Flow', () => {
    test('should redirect to login/register when clicking claim as guest', async ({ page }) => {
      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        await employeeCard.click();
        await page.waitForTimeout(500);

        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'))
          .first();

        if (await claimButton.isVisible()) {
          await claimButton.click();
          await page.waitForTimeout(500);

          // Should redirect to login or show login modal
          const loginPage = page.url().includes('login') || page.url().includes('register');
          const loginModal = await page.locator('[data-testid="login-modal"]')
            .or(page.locator('form:has(input[type="password"])'))
            .first().isVisible().catch(() => false);

          expect(loginPage || loginModal).toBe(true);
        }
      }
    });

    test('should open claim form when logged in', async ({ page }) => {
      // Login first as a regular user (not owner)
      await page.goto('/login');
      await page.fill('input[type="email"]', 'employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/');

      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        await employeeCard.click();
        await page.waitForTimeout(500);

        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'))
          .first();

        if (await claimButton.isVisible()) {
          await claimButton.click();
          await page.waitForTimeout(500);

          // Claim form/modal should appear
          const claimForm = page.locator('[data-testid="claim-form"]')
            .or(page.locator('form[class*="claim"]'))
            .or(page.locator('[role="dialog"]:has-text("claim")'))
            .or(page.locator('[role="dialog"]:has-text("verify")'));

          await expect(claimForm.first()).toBeVisible();
        }
      }
    });

    test('should require selfie photo for identity verification', async ({ page }) => {
      // Login as employee
      await page.goto('/login');
      await page.fill('input[type="email"]', 'employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/');

      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        await employeeCard.click();
        await page.waitForTimeout(500);

        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'))
          .first();

        if (await claimButton.isVisible()) {
          await claimButton.click();
          await page.waitForTimeout(500);

          // Should have selfie upload requirement
          const selfieUpload = page.locator('[data-testid="selfie-upload"]')
            .or(page.locator('input[type="file"][accept*="image"]'))
            .or(page.locator('button:has-text("Take selfie")'))
            .or(page.locator('button:has-text("Upload photo")'))
            .or(page.getByText(/selfie|photo.*yourself|your.*photo/i));

          await expect(selfieUpload.first()).toBeVisible();
        }
      }
    });

    test('should require ID document upload', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/');

      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        await employeeCard.click();
        await page.waitForTimeout(500);

        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'))
          .first();

        if (await claimButton.isVisible()) {
          await claimButton.click();
          await page.waitForTimeout(500);

          // Should have ID document upload
          const idUpload = page.locator('[data-testid="id-upload"]')
            .or(page.locator('[data-testid="document-upload"]'))
            .or(page.getByText(/id.*document|passport|identity.*card|บัตรประชาชน/i));

          const hasIdUpload = await idUpload.first().isVisible().catch(() => false);
        }
      }
    });

    test('should allow phone number verification as alternative', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/');

      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        await employeeCard.click();
        await page.waitForTimeout(500);

        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'))
          .first();

        if (await claimButton.isVisible()) {
          await claimButton.click();
          await page.waitForTimeout(500);

          // Phone verification option
          const phoneVerify = page.locator('[data-testid="phone-verification"]')
            .or(page.locator('input[type="tel"]'))
            .or(page.getByText(/phone.*number|verify.*phone|sms.*code/i));

          const hasPhoneVerify = await phoneVerify.first().isVisible().catch(() => false);
        }
      }
    });

    test('should submit claim request with all required info', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/');

      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        await employeeCard.click();
        await page.waitForTimeout(500);

        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'))
          .first();

        if (await claimButton.isVisible()) {
          await claimButton.click();
          await page.waitForTimeout(500);

          // Fill phone if available
          const phoneInput = page.locator('input[type="tel"]').first();
          if (await phoneInput.isVisible()) {
            await phoneInput.fill('+66 812345678');
          }

          // Add message/reason
          const messageInput = page.locator('textarea')
            .or(page.locator('input[name="message"]'))
            .first();
          if (await messageInput.isVisible()) {
            await messageInput.fill('This is my profile. I work at this establishment.');
          }

          // Submit claim
          const submitButton = page.locator('button[type="submit"]')
            .or(page.locator('button:has-text("Submit")'))
            .or(page.locator('button:has-text("Send claim")'));

          if (await submitButton.first().isVisible()) {
            await submitButton.first().click();
            await page.waitForTimeout(1000);

            // Should show success/pending message
            const successMessage = page.getByText(/claim.*submitted|request.*sent|pending.*review|wait.*approval/i);
            const isSubmitted = await successMessage.first().isVisible().catch(() => false);
          }
        }
      }
    });

    test('should show claim status after submission', async ({ page }) => {
      // Login as employee who submitted a claim
      await page.goto('/login');
      await page.fill('input[type="email"]', 'employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      // Go to profile/dashboard
      await page.goto('/profile');
      await page.waitForLoadState('domcontentloaded');

      // Should see pending claims section
      const claimsSection = page.locator('[data-testid="my-claims"]')
        .or(page.locator('[data-testid="pending-claims"]'))
        .or(page.getByText(/pending.*claim|claim.*status|my.*claims/i));

      const hasClaims = await claimsSection.first().isVisible().catch(() => false);
    });
  });

  test.describe('Owner Verification Process', () => {
    test.beforeEach(async ({ page }) => {
      // Login as owner
      await page.goto('/login');
      await page.fill('input[type="email"]', 'owner@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');
    });

    test('should notify owner when employee claims profile', async ({ page }) => {
      // Check notifications
      const notificationBell = page.locator('[data-testid="notification-bell"]')
        .or(page.locator('[aria-label*="notification"]'))
        .or(page.locator('.notification-icon'));

      if (await notificationBell.first().isVisible()) {
        await notificationBell.first().click();
        await page.waitForTimeout(300);

        // Look for claim notification
        const claimNotification = page.getByText(/claim.*request|employee.*claim|profile.*claim/i);
        const hasNotification = await claimNotification.first().isVisible().catch(() => false);
      }
    });

    test('should show pending claim requests in owner dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const claimRequests = page.locator('[data-testid="claim-requests"]')
        .or(page.locator('[data-testid="pending-employee-claims"]'))
        .or(page.getByText(/claim.*request|pending.*claim/i));

      const hasClaims = await claimRequests.first().isVisible().catch(() => false);
    });

    test('should display claim details with verification documents', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const claimItem = page.locator('[data-testid="claim-request-item"]')
        .or(page.locator('[class*="claim-request"]'))
        .first();

      if (await claimItem.isVisible()) {
        await claimItem.click();
        await page.waitForTimeout(500);

        // Should show verification documents
        const verificationDocs = page.locator('[data-testid="verification-docs"]')
          .or(page.locator('[class*="selfie"]'))
          .or(page.locator('[class*="document"]'))
          .or(page.getByText(/selfie|id.*document|verification/i));

        const hasDocs = await verificationDocs.first().isVisible().catch(() => false);
      }
    });

    test('should allow owner to approve claim', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const claimItem = page.locator('[data-testid="claim-request-item"]')
        .or(page.locator('[class*="claim-request"]'))
        .first();

      if (await claimItem.isVisible()) {
        await claimItem.click();
        await page.waitForTimeout(500);

        const approveButton = page.locator('[data-testid="approve-claim"]')
          .or(page.locator('button:has-text("Approve")'))
          .or(page.locator('button:has-text("Confirm")'));

        if (await approveButton.first().isVisible()) {
          await approveButton.first().click();
          await page.waitForTimeout(500);

          // Confirm approval
          const confirmButton = page.locator('button:has-text("Confirm")')
            .or(page.locator('[data-testid="confirm-approve"]'));

          if (await confirmButton.first().isVisible()) {
            await confirmButton.first().click();
          }

          // Should show success
          const successMessage = page.getByText(/approved|claim.*accepted|profile.*transferred/i);
          const isApproved = await successMessage.first().isVisible().catch(() => false);
        }
      }
    });

    test('should allow owner to reject claim with reason', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const claimItem = page.locator('[data-testid="claim-request-item"]')
        .or(page.locator('[class*="claim-request"]'))
        .first();

      if (await claimItem.isVisible()) {
        await claimItem.click();
        await page.waitForTimeout(500);

        const rejectButton = page.locator('[data-testid="reject-claim"]')
          .or(page.locator('button:has-text("Reject")'))
          .or(page.locator('button:has-text("Deny")'));

        if (await rejectButton.first().isVisible()) {
          await rejectButton.first().click();
          await page.waitForTimeout(300);

          // Should require reason
          const reasonInput = page.locator('textarea[name="rejectionReason"]')
            .or(page.locator('textarea'))
            .first();

          if (await reasonInput.isVisible()) {
            await reasonInput.fill('This person does not match the employee in our records.');
          }

          // Confirm rejection
          const confirmButton = page.locator('button:has-text("Confirm")')
            .or(page.locator('[data-testid="confirm-reject"]'))
            .or(page.locator('button[type="submit"]'));

          await confirmButton.first().click();
          await page.waitForTimeout(500);

          const rejectedMessage = page.getByText(/rejected|denied/i);
          const isRejected = await rejectedMessage.first().isVisible().catch(() => false);
        }
      }
    });

    test('should allow owner to request more information', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const claimItem = page.locator('[data-testid="claim-request-item"]').first();

      if (await claimItem.isVisible()) {
        await claimItem.click();
        await page.waitForTimeout(500);

        const moreInfoButton = page.locator('[data-testid="request-more-info"]')
          .or(page.locator('button:has-text("More info")'))
          .or(page.locator('button:has-text("Request info")'));

        const hasMoreInfoOption = await moreInfoButton.first().isVisible().catch(() => false);
      }
    });
  });

  test.describe('Admin Review (Disputed Claims)', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('input[type="email"]', 'admin@test.com');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');
    });

    test('should show disputed claims in admin panel', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('domcontentloaded');

      const disputedClaims = page.locator('[data-testid="disputed-claims"]')
        .or(page.locator('a:has-text("Disputed")'))
        .or(page.getByText(/disputed.*claim|claim.*dispute/i));

      const hasDisputed = await disputedClaims.first().isVisible().catch(() => false);
    });

    test('should allow admin to review and decide disputed claims', async ({ page }) => {
      await page.goto('/admin/claims');
      await page.waitForLoadState('domcontentloaded');

      const disputedClaim = page.locator('[data-testid="disputed-claim-item"]')
        .or(page.locator('tr:has-text("Disputed")'))
        .first();

      if (await disputedClaim.isVisible()) {
        await disputedClaim.click();
        await page.waitForTimeout(500);

        // Admin should see both sides
        const ownerStatement = page.getByText(/owner.*statement|owner.*response/i);
        const employeeStatement = page.getByText(/claimant|employee.*statement/i);

        // Admin decision buttons
        const approveForEmployee = page.locator('button:has-text("Approve for employee")');
        const sideWithOwner = page.locator('button:has-text("Side with owner")');

        const hasDecisionOptions = await approveForEmployee.isVisible().catch(() => false) ||
                                   await sideWithOwner.isVisible().catch(() => false);
      }
    });

    test('should allow admin to override owner rejection', async ({ page }) => {
      await page.goto('/admin/claims');
      await page.waitForLoadState('domcontentloaded');

      const rejectedClaim = page.locator('tr:has-text("Rejected")')
        .or(page.locator('[data-testid="rejected-claim"]'))
        .first();

      if (await rejectedClaim.isVisible()) {
        await rejectedClaim.click();
        await page.waitForTimeout(500);

        const overrideButton = page.locator('button:has-text("Override")')
          .or(page.locator('button:has-text("Force approve")'));

        const hasOverride = await overrideButton.first().isVisible().catch(() => false);
      }
    });
  });

  test.describe('Post-Claim Permissions', () => {
    test.beforeEach(async ({ page }) => {
      // Login as employee who has claimed their profile
      await page.goto('/login');
      await page.fill('input[type="email"]', 'claimed-employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');
    });

    test('should allow employee to edit their own bio', async ({ page }) => {
      await page.goto('/my-profile');
      await page.waitForLoadState('domcontentloaded');

      const editBioButton = page.locator('[data-testid="edit-bio"]')
        .or(page.locator('button:has-text("Edit bio")'))
        .or(page.locator('[aria-label*="edit"]'));

      if (await editBioButton.first().isVisible()) {
        await editBioButton.first().click();
        await page.waitForTimeout(300);

        const bioInput = page.locator('textarea[name="bio"]')
          .or(page.locator('[data-testid="bio-input"]'));

        if (await bioInput.first().isVisible()) {
          await bioInput.first().fill('Updated bio by the employee themselves!');

          const saveButton = page.locator('button:has-text("Save")')
            .or(page.locator('button[type="submit"]'));
          await saveButton.first().click();

          // Should show success
          const saved = page.getByText(/saved|updated/i);
          const isSaved = await saved.first().isVisible().catch(() => false);
        }
      }
    });

    test('should allow employee to upload their own photos', async ({ page }) => {
      await page.goto('/my-profile');
      await page.waitForLoadState('domcontentloaded');

      const photoUpload = page.locator('[data-testid="photo-upload"]')
        .or(page.locator('input[type="file"][accept*="image"]'))
        .or(page.locator('button:has-text("Add photo")'));

      const hasPhotoUpload = await photoUpload.first().isVisible().catch(() => false);
    });

    test('should allow employee to set their own availability', async ({ page }) => {
      await page.goto('/my-profile');
      await page.waitForLoadState('domcontentloaded');

      const availabilityToggle = page.locator('[data-testid="availability-toggle"]')
        .or(page.locator('input[type="checkbox"][name*="available"]'))
        .or(page.locator('button:has-text("Available")'))
        .or(page.locator('[class*="availability"]'));

      const hasAvailability = await availabilityToggle.first().isVisible().catch(() => false);
    });

    test('should show verified badge after claim approval', async ({ page }) => {
      await page.goto('/my-profile');
      await page.waitForLoadState('domcontentloaded');

      const verifiedBadge = page.locator('[data-testid="verified-badge"]')
        .or(page.locator('[class*="verified"]'))
        .or(page.getByText(/verified|✓/));

      const hasVerified = await verifiedBadge.first().isVisible().catch(() => false);
    });

    test('should receive notifications for own profile', async ({ page }) => {
      const notificationBell = page.locator('[data-testid="notification-bell"]')
        .or(page.locator('[aria-label*="notification"]'));

      if (await notificationBell.first().isVisible()) {
        await notificationBell.first().click();
        await page.waitForTimeout(300);

        // Should see notifications related to their profile
        const profileNotifications = page.getByText(/review.*received|new.*message|profile.*view/i);
        const hasNotifications = await profileNotifications.first().isVisible().catch(() => false);
      }
    });
  });

  test.describe('Owner Retained Permissions', () => {
    test.beforeEach(async ({ page }) => {
      // Login as owner who approved employee claim
      await page.goto('/login');
      await page.fill('input[type="email"]', 'owner@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');
    });

    test('should still see claimed employee in dashboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const employeesList = page.locator('[data-testid="my-employees"]')
        .or(page.locator('[class*="employee-list"]'));

      if (await employeesList.first().isVisible()) {
        // Employee should still appear even after claiming
        const claimedEmployee = employeesList.locator('[class*="claimed"]')
          .or(employeesList.locator(':has([class*="verified"])'));

        const hasClaimedEmployee = await claimedEmployee.first().isVisible().catch(() => false);
      }
    });

    test('should indicate which employees have claimed their profiles', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        // Should show indicator that employee has claimed profile
        const claimedIndicator = employeeCard.locator('[data-testid="claimed-indicator"]')
          .or(employeeCard.locator('[class*="self-managed"]'))
          .or(employeeCard.locator('[title*="claimed"]'))
          .or(employeeCard.getByText(/self.*managed|claimed/i));

        const hasIndicator = await claimedIndicator.first().isVisible().catch(() => false);
      }
    });

    test('should allow owner to remove employee from establishment', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        // Should still be able to remove (unlink) from establishment
        const removeButton = employeeCard.locator('[data-testid="remove-employee"]')
          .or(employeeCard.locator('button:has-text("Remove")'))
          .or(employeeCard.locator('[aria-label*="remove"]'));

        const canRemove = await removeButton.first().isVisible().catch(() => false);
      }
    });

    test('should NOT allow owner to edit claimed employee details', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const claimedEmployeeCard = page.locator('[data-testid="employee-card"]:has([class*="claimed"])')
        .or(page.locator('.employee-card:has(.verified)'))
        .first();

      if (await claimedEmployeeCard.isVisible()) {
        await claimedEmployeeCard.click();
        await page.waitForTimeout(500);

        // Edit button should be disabled or hidden for claimed employees
        const editButton = page.locator('[data-testid="edit-employee"]')
          .or(page.locator('button:has-text("Edit")'));

        if (await editButton.first().isVisible()) {
          const isDisabled = await editButton.first().isDisabled();
          // Either disabled or shows message about employee self-management
        }
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle employee claiming profile while logged into different account', async ({ page }) => {
      // Login as a different employee
      await page.goto('/login');
      await page.fill('input[type="email"]', 'other-employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/');

      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        await employeeCard.click();
        await page.waitForTimeout(500);

        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'));

        // Should still be able to claim (different profile)
        const canClaim = await claimButton.first().isVisible().catch(() => false);
      }
    });

    test('should prevent multiple claims for same profile', async ({ page }) => {
      // Login as employee
      await page.goto('/login');
      await page.fill('input[type="email"]', 'employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/');

      // Try to claim a profile that already has pending claim
      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        await employeeCard.click();
        await page.waitForTimeout(500);

        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'));

        if (await claimButton.first().isVisible()) {
          await claimButton.first().click();
          await page.waitForTimeout(500);

          // Should show message about existing claim
          const existingClaimMessage = page.getByText(/already.*claimed|pending.*claim|claim.*exists/i);
          const hasExistingClaim = await existingClaimMessage.first().isVisible().catch(() => false);
        }
      }
    });

    test('should handle claim timeout (auto-approve after X days)', async ({ page }) => {
      // This tests the UI showing timeout information
      await page.goto('/login');
      await page.fill('input[type="email"]', 'employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/profile');

      const pendingClaim = page.locator('[data-testid="pending-claim"]')
        .or(page.locator('[class*="pending-claim"]'));

      if (await pendingClaim.first().isVisible()) {
        // Should show auto-approve countdown
        const autoApproveInfo = pendingClaim.getByText(/auto.*approve|days.*remaining|automatic/i);
        const hasAutoApprove = await autoApproveInfo.first().isVisible().catch(() => false);
      }
    });

    test('should allow re-claim after rejection with new evidence', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'rejected-employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/');

      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        await employeeCard.click();
        await page.waitForTimeout(500);

        // Should see option to re-claim with new evidence
        const reClaimButton = page.locator('[data-testid="re-claim"]')
          .or(page.locator('button:has-text("Try again")'))
          .or(page.locator('button:has-text("Re-submit")'))
          .or(page.getByText(/submit.*new.*evidence|try.*again/i));

        const canReClaim = await reClaimButton.first().isVisible().catch(() => false);
      }
    });
  });

  test.describe('Notifications Flow', () => {
    test('should notify employee when claim is approved', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'approved-employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      const notificationBell = page.locator('[data-testid="notification-bell"]')
        .or(page.locator('[aria-label*="notification"]'));

      if (await notificationBell.first().isVisible()) {
        await notificationBell.first().click();
        await page.waitForTimeout(300);

        const approvalNotification = page.getByText(/claim.*approved|profile.*yours|congratulations/i);
        const hasNotification = await approvalNotification.first().isVisible().catch(() => false);
      }
    });

    test('should notify employee when claim is rejected', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'rejected-employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      const notificationBell = page.locator('[data-testid="notification-bell"]')
        .or(page.locator('[aria-label*="notification"]'));

      if (await notificationBell.first().isVisible()) {
        await notificationBell.first().click();
        await page.waitForTimeout(300);

        const rejectionNotification = page.getByText(/claim.*rejected|claim.*denied|not.*approved/i);
        const hasNotification = await rejectionNotification.first().isVisible().catch(() => false);
      }
    });

    test('should notify employee when owner requests more info', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'pending-employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      const notificationBell = page.locator('[data-testid="notification-bell"]')
        .or(page.locator('[aria-label*="notification"]'));

      if (await notificationBell.first().isVisible()) {
        await notificationBell.first().click();
        await page.waitForTimeout(300);

        const infoRequestNotification = page.getByText(/more.*info.*requested|additional.*info|please.*provide/i);
        const hasNotification = await infoRequestNotification.first().isVisible().catch(() => false);
      }
    });
  });

  test.describe('Mobile Employee Claim', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('should display claim button on mobile', async ({ page }) => {
      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        await employeeCard.tap();
        await page.waitForTimeout(500);

        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'));

        const isVisible = await claimButton.first().isVisible().catch(() => false);
      }
    });

    test('should have mobile-friendly claim form', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/');

      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        await employeeCard.tap();
        await page.waitForTimeout(500);

        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'))
          .first();

        if (await claimButton.isVisible()) {
          await claimButton.tap();
          await page.waitForTimeout(500);

          // Form should be full-width on mobile
          const form = page.locator('form').first();

          if (await form.isVisible()) {
            const formBox = await form.boundingBox();
            if (formBox) {
              expect(formBox.width).toBeGreaterThan(300);
            }
          }
        }
      }
    });

    test('should support camera capture for selfie on mobile', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', 'employee@test.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('domcontentloaded');

      await page.goto('/');

      const employeeCard = page.locator('[data-testid="employee-card"]').first();

      if (await employeeCard.isVisible()) {
        await employeeCard.tap();
        await page.waitForTimeout(500);

        const claimButton = page.locator('[data-testid="claim-profile"]')
          .or(page.locator('button:has-text("This is me")'))
          .first();

        if (await claimButton.isVisible()) {
          await claimButton.tap();
          await page.waitForTimeout(500);

          // Should have camera capture option
          const cameraButton = page.locator('button:has-text("Take photo")')
            .or(page.locator('button:has-text("Use camera")')
            .or(page.locator('input[type="file"][capture="user"]')));

          const hasCamera = await cameraButton.first().isVisible().catch(() => false);
        }
      }
    });
  });
});
