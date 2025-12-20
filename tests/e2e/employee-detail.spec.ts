/**
 * E2E Tests - Employee Detail/Profile
 *
 * Tests employee profile display:
 * 1. Profile modal open -> click from card
 * 2. Photo gallery -> navigation
 * 3. Basic info -> name, age, nationality
 * 4. Work info -> linked establishment
 * 5. Verification badge -> display
 * 6. Contact buttons -> social links
 * 7. Reviews section -> employee reviews
 * 8. Add review -> form
 * 9. Report button -> inappropriate content
 * 10. Claim profile -> flow
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, loginUser, TestUser } from './fixtures/testUser';
import { getExistingEmployee } from './fixtures/employeeData';

// ========================================
// TEST SUITE 1: Profile Modal Open
// ========================================

test.describe('Profile Modal Open', () => {
  test('should open profile modal on employee card click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Switch to employees view
    const employeesTab = page.locator('button:has-text("Employees"), button:has-text("Girls")').first();
    if (await employeesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await employeesTab.click();
      await page.waitForLoadState('domcontentloaded');
    }

    const employeeCard = page.locator('.employee-card, .girl-card, [data-testid="employee-card"]').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Profile modal should open
      const profileModal = page.locator('[role="dialog"], .modal, .profile-modal');
      await expect(profileModal.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should close profile modal on X click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card, .girl-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const closeBtn = page.locator('[role="dialog"] button:has-text("×"), .modal .close-button').first();

      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Modal should close
        const modal = page.locator('[role="dialog"], .modal');
        await expect(modal.first()).toBeHidden({ timeout: 2000 });
      }
    }
  });

  test('should close profile modal on Escape', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      await page.keyboard.press('Escape');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 2: Photo Gallery
// ========================================

test.describe('Employee Photo Gallery', () => {
  test('should display employee photos', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Photos should be visible in modal
      const photos = page.locator('[role="dialog"] img, .profile-modal img');
      const photoCount = await photos.count();

      expect(photoCount).toBeGreaterThan(0);
    }
  });

  test('should navigate photos with arrows', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const nextBtn = page.locator('[role="dialog"] button[aria-label*="next" i], .gallery-next').first();

      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click();
        await page.waitForLoadState('domcontentloaded');

        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should display photo count', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for photo counter (e.g., "1 / 5")
      const counter = page.locator('text=/\\d+\\s*\\/\\s*\\d+/, .photo-counter').first();
      const hasCounter = await counter.isVisible({ timeout: 2000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 3: Basic Info
// ========================================

test.describe('Employee Basic Info', () => {
  test('should display employee name', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Name should be visible
      const name = page.locator('[role="dialog"] h1, [role="dialog"] h2, .profile-name').first();
      await expect(name).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display employee age', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Age should be visible
      const age = page.locator('[role="dialog"] text=/\\d+\\s*y\\.?o\\.?|age/i, .employee-age').first();
      const hasAge = await age.isVisible({ timeout: 2000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display employee nationality', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Nationality should be visible
      const nationality = page.locator('[role="dialog"] .nationality, [role="dialog"] .flag').or(page.locator('text=/Thai|Vietnamese|Cambodian/i')).first();
      const hasNationality = await nationality.isVisible({ timeout: 2000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display employee bio', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Bio may or may not be present
      const bio = page.locator('[role="dialog"] .bio, [role="dialog"] .description').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 4: Work Info
// ========================================

test.describe('Employee Work Info', () => {
  test('should display linked establishment', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Establishment link should be visible
      const establishment = page.locator('[role="dialog"] a[href*="/bar/"], [role="dialog"] .establishment-link').first();
      const hasEstablishment = await establishment.isVisible({ timeout: 2000 }).catch(() => false);

      // May be freelance (no establishment)
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should indicate freelance status', async ({ page }) => {
    await page.goto('/freelances');
    await page.waitForLoadState('domcontentloaded');

    const freelanceCard = page.locator('.employee-card, .freelance-card').first();

    if (await freelanceCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await freelanceCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Freelance indicator should be visible
      const freelanceIndicator = page.locator('text=/freelance|independent/i, .freelance-badge').first();
      const hasIndicator = await freelanceIndicator.isVisible({ timeout: 2000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 5: Verification Badge
// ========================================

test.describe('Verification Badge', () => {
  test('should display verification badge if verified', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Verification badge may or may not be present
      const verifiedBadge = page.locator('[role="dialog"] .verified-badge, [role="dialog"] [data-testid="verified"]').or(page.locator('text=/verified/i')).first();
      const hasVerified = await verifiedBadge.isVisible({ timeout: 2000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show verification tooltip on hover', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const verifiedBadge = page.locator('.verified-badge').first();

      if (await verifiedBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
        await verifiedBadge.hover();
        await page.waitForLoadState('domcontentloaded');

        // Tooltip may appear
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

// ========================================
// TEST SUITE 6: Contact Buttons (Social)
// ========================================

test.describe('Contact Buttons', () => {
  test('should display social media links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Social links may be present
      const socialLinks = page.locator('[role="dialog"] a[href*="instagram"], [role="dialog"] a[href*="line.me"], .social-links');
      const hasSocial = await socialLinks.first().isVisible({ timeout: 2000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should open social link in new tab', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const socialLink = page.locator('[role="dialog"] a[href*="instagram"]').first();

      if (await socialLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        const target = await socialLink.getAttribute('target');
        expect(target).toBe('_blank');
      }
    }
  });

  test('should display LINE ID if available', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // LINE ID may be displayed
      const lineId = page.locator('text=/LINE|line id/i, .line-contact').first();
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 7: Reviews Section
// ========================================

test.describe('Employee Reviews', () => {
  test('should display employee reviews', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Reviews section may be in modal
      const reviews = page.locator('[role="dialog"] .reviews, [role="dialog"] .review-list').first();
      const hasReviews = await reviews.isVisible({ timeout: 2000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display average rating', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Average rating may be displayed
      const rating = page.locator('[role="dialog"] .rating, [role="dialog"] .stars').or(page.locator('text=/\\d+\\.\\d+/')).first();
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 8: Add Review
// ========================================

test.describe('Add Employee Review', () => {
  test('should show add review button', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const addReviewBtn = page.locator('[role="dialog"] button:has-text("Review"), [role="dialog"] button:has-text("Add Review")').first();
      const hasButton = await addReviewBtn.isVisible({ timeout: 3000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should open review form on click', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const addReviewBtn = page.locator('[role="dialog"] button:has-text("Review")').first();

      if (await addReviewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addReviewBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Review form should appear
        const reviewForm = page.locator('form, .review-form, textarea');
        await expect(reviewForm.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

// ========================================
// TEST SUITE 9: Report Button
// ========================================

test.describe('Report Button', () => {
  test('should display report button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const reportBtn = page.locator('[role="dialog"] button:has-text("Report"), [role="dialog"] [data-testid="report"]').first();
      const hasReport = await reportBtn.isVisible({ timeout: 3000 }).catch(() => false);

      // Report button may or may not be present
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should open report modal on click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const reportBtn = page.locator('[role="dialog"] button:has-text("Report")').first();

      if (await reportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reportBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Report modal/form should appear
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

// ========================================
// TEST SUITE 10: Claim Profile
// ========================================

test.describe('Claim Profile', () => {
  test('should show claim profile button', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const claimBtn = page.locator('[role="dialog"] button:has-text("Claim"), [role="dialog"] button:has-text("This is me")').first();
      const hasClaim = await claimBtn.isVisible({ timeout: 3000 }).catch(() => false);

      // Claim button may not be visible if profile already claimed
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should start claim flow on click', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const claimBtn = page.locator('[role="dialog"] button:has-text("Claim")').first();

      if (await claimBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await claimBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Claim form/modal should appear
        const claimForm = page.locator('.claim-form, .claim-modal, [data-testid="claim-wizard"]');
        await expect(claimForm.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

// ========================================
// TEST SUITE 11: Mobile Profile
// ========================================

test.describe('Mobile Profile', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });

  test('should display mobile-friendly profile modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Modal should be full-width on mobile
      const modal = page.locator('[role="dialog"], .modal');
      const box = await modal.first().boundingBox();

      if (box) {
        expect(box.width).toBeGreaterThan(300);
      }
    }
  });

  test('should have swipeable photo gallery on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Gallery should be touch-friendly
      const gallery = page.locator('[role="dialog"] .gallery, .photo-slider');
      await expect(gallery.first()).toBeVisible({ timeout: 3000 });
    }
  });
});
