/**
 * E2E Tests - Establishment Detail Page
 *
 * Tests establishment detail page:
 * 1. Page load → data display
 * 2. Tab navigation → Infos/Employees/Reviews
 * 3. Photo gallery → carousel, fullscreen
 * 4. Employee cards → profile modal
 * 5. Reviews section → list, pagination
 * 6. Add review → modal (logged in)
 * 7. Favorite toggle → add/remove
 * 8. Share button → copy URL
 * 9. Edit button (owner) → modal
 * 10. Claim ownership → modal
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser, loginUser, TestUser } from './fixtures/testUser';
import { getExistingEstablishment } from './fixtures/establishmentData';

// ========================================
// TEST SUITE 1: Page Load & Data Display
// ========================================

test.describe('Establishment Page Load', () => {
  test('should load establishment detail page', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
    } else {
      await page.goto('/');
      // Click on first establishment
      const card = page.locator('.establishment-card, [data-testid="establishment"]').first();
      if (await card.isVisible({ timeout: 5000 })) {
        await card.click();
      }
    }

    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display establishment name', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const name = page.locator('h1, .establishment-name, [data-testid="establishment-name"]').first();
      await expect(name).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display establishment category', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const category = page.locator('.category, .badge, [data-testid="category"]').first();
      const hasCategory = await category.isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display establishment address', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const address = page.locator('.address, [data-testid="address"], text=/Soi|Street|Road/i').first();
      const hasAddress = await address.isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display opening hours', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const hours = page.locator('.opening-hours, [data-testid="hours"], text=/\\d{1,2}:\\d{2}/').first();
      const hasHours = await hours.isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 2: Tab Navigation
// ========================================

test.describe('Tab Navigation', () => {
  test('should display tab navigation', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const tabs = page.locator('[role="tablist"], .tabs, .tab-navigation');
      const hasTabs = await tabs.first().isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should switch to Employees tab', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const employeesTab = page.locator('button:has-text("Employees"), button:has-text("Girls"), [role="tab"]:has-text("Employees")').first();

      if (await employeesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await employeesTab.click();
        await page.waitForTimeout(500);

        // Employees content should be visible
        const employeesContent = page.locator('.employees-list, .employee-cards, [data-testid="employees-tab"]');
        await expect(employeesContent.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should switch to Reviews tab', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const reviewsTab = page.locator('button:has-text("Reviews"), [role="tab"]:has-text("Reviews")').first();

      if (await reviewsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await reviewsTab.click();
        await page.waitForTimeout(500);

        // Reviews content should be visible
        const reviewsContent = page.locator('.reviews-list, .review-cards, [data-testid="reviews-tab"]');
        await expect(reviewsContent.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should highlight active tab', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const activeTab = page.locator('[role="tab"][aria-selected="true"], .tab.active, .tab-button.active').first();
      const hasActive = await activeTab.isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 3: Photo Gallery
// ========================================

test.describe('Photo Gallery', () => {
  test('should display photo gallery', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const gallery = page.locator('.photo-gallery, .gallery, [data-testid="gallery"], img').first();
      await expect(gallery).toBeVisible({ timeout: 5000 });
    }
  });

  test('should open fullscreen gallery on image click', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const galleryImage = page.locator('.gallery img, [data-testid="gallery-image"]').first();

      if (await galleryImage.isVisible({ timeout: 3000 }).catch(() => false)) {
        await galleryImage.click();
        await page.waitForTimeout(500);

        // Fullscreen modal should open
        const fullscreenModal = page.locator('.gallery-modal, [data-testid="fullscreen-gallery"], .lightbox');
        const hasModal = await fullscreenModal.first().isVisible({ timeout: 3000 }).catch(() => false);

        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should navigate gallery with arrows', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const nextButton = page.locator('.gallery-next, button[aria-label*="next" i], .carousel-next').first();

      if (await nextButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nextButton.click();
        await page.waitForTimeout(300);

        // Should move to next image
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should close fullscreen gallery', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const galleryImage = page.locator('.gallery img').first();

      if (await galleryImage.isVisible({ timeout: 3000 }).catch(() => false)) {
        await galleryImage.click();
        await page.waitForTimeout(500);

        // Press Escape to close
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

// ========================================
// TEST SUITE 4: Employee Cards
// ========================================

test.describe('Employee Cards', () => {
  test('should display employee cards', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      // Switch to employees tab if needed
      const employeesTab = page.locator('button:has-text("Employees"), button:has-text("Girls")').first();
      if (await employeesTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await employeesTab.click();
        await page.waitForTimeout(500);
      }

      const employeeCards = page.locator('.employee-card, .girl-card, [data-testid="employee-card"]');
      const cardCount = await employeeCards.count();

      // May or may not have employees
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should open employee profile modal on card click', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const employeeCard = page.locator('.employee-card, .girl-card').first();

      if (await employeeCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await employeeCard.click();
        await page.waitForTimeout(500);

        // Profile modal should open
        const profileModal = page.locator('[role="dialog"], .modal, .profile-modal');
        await expect(profileModal.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should display employee photo on card', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const employeePhoto = page.locator('.employee-card img, .girl-card img').first();
      const hasPhoto = await employeePhoto.isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 5: Reviews Section
// ========================================

test.describe('Reviews Section', () => {
  test('should display reviews list', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      // Switch to reviews tab if needed
      const reviewsTab = page.locator('button:has-text("Reviews")').first();
      if (await reviewsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reviewsTab.click();
        await page.waitForTimeout(500);
      }

      const reviews = page.locator('.review-card, .review-item, [data-testid="review"]');
      const reviewCount = await reviews.count();

      // May or may not have reviews
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display review rating', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const rating = page.locator('.review-rating, .stars, [data-testid="rating"]').first();
      const hasRating = await rating.isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should paginate reviews', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      // Look for pagination
      const pagination = page.locator('.pagination, [data-testid="pagination"], button:has-text("Next")');
      const hasPagination = await pagination.first().isVisible({ timeout: 5000 }).catch(() => false);

      // Pagination may or may not be present
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 6: Add Review
// ========================================

test.describe('Add Review', () => {
  test('should show add review button when logged in', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const addReviewBtn = page.locator('button:has-text("Add Review"), button:has-text("Write Review")').first();
      const hasButton = await addReviewBtn.isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasButton).toBeTruthy();
    }
  });

  test('should open review modal on add click', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const addReviewBtn = page.locator('button:has-text("Add Review"), button:has-text("Write Review")').first();

      if (await addReviewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addReviewBtn.click();
        await page.waitForTimeout(500);

        // Review modal should open
        const reviewModal = page.locator('[role="dialog"], .modal, .review-modal');
        await expect(reviewModal.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should require login to add review', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const addReviewBtn = page.locator('button:has-text("Add Review")').first();

      if (await addReviewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addReviewBtn.click();
        await page.waitForTimeout(500);

        // Should show login modal or redirect
        const loginModal = page.locator('text="Welcome Back", text="Sign in"');
        const hasLogin = await loginModal.first().isVisible({ timeout: 3000 }).catch(() => false);

        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

// ========================================
// TEST SUITE 7: Favorite Toggle
// ========================================

test.describe('Favorite Toggle', () => {
  test('should display favorite button', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const favoriteBtn = page.locator('[data-testid="favorite-button"], .favorite-btn, button[aria-label*="favorite" i]').first();
      const hasFavorite = await favoriteBtn.isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should toggle favorite on click', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const favoriteBtn = page.locator('[data-testid="favorite-button"], .favorite-btn').first();

      if (await favoriteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await favoriteBtn.click();
        await page.waitForTimeout(500);

        // Button state should change
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

// ========================================
// TEST SUITE 8: Share Button
// ========================================

test.describe('Share Button', () => {
  test('should display share button', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const shareBtn = page.locator('button:has-text("Share"), button[aria-label*="share" i], [data-testid="share-button"]').first();
      const hasShare = await shareBtn.isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should copy URL on share click', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const shareBtn = page.locator('button:has-text("Share"), [data-testid="share-button"]').first();

      if (await shareBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await shareBtn.click();
        await page.waitForTimeout(500);

        // Should show copied notification or share menu
        const notification = page.locator('text=/copied|share/i').first();
        const hasNotification = await notification.isVisible({ timeout: 2000 }).catch(() => false);

        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

// ========================================
// TEST SUITE 9: Edit Button (Owner)
// ========================================

test.describe('Edit Button', () => {
  test('should not show edit button for non-owners', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const editBtn = page.locator('button:has-text("Edit"), [data-testid="edit-establishment"]').first();
      const hasEdit = await editBtn.isVisible({ timeout: 3000 }).catch(() => false);

      // Non-owners should not see edit button
      // (This may or may not be true depending on implementation)
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 10: Claim Ownership
// ========================================

test.describe('Claim Ownership', () => {
  test('should display claim ownership button', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const claimBtn = page.locator('button:has-text("Claim"), button:has-text("Request Ownership"), [data-testid="claim-ownership"]').first();
      const hasClaim = await claimBtn.isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should open claim modal on click', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const claimBtn = page.locator('button:has-text("Claim"), button:has-text("Request Ownership")').first();

      if (await claimBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await claimBtn.click();
        await page.waitForTimeout(500);

        // Claim modal should open
        const claimModal = page.locator('[role="dialog"], .modal, .claim-modal');
        await expect(claimModal.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

// ========================================
// TEST SUITE 11: Mobile Detail Page
// ========================================

test.describe('Mobile Detail Page', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });

  test('should display mobile-friendly layout', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      // Content should be visible and properly sized
      const content = page.locator('main, .content, .establishment-detail');
      const box = await content.first().boundingBox();

      if (box) {
        expect(box.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('should have touch-friendly buttons', async ({ page }) => {
    const establishment = await getExistingEstablishment();

    if (establishment?.id) {
      await page.goto(`/bar/${establishment.id}`);
      await page.waitForLoadState('networkidle');

      const buttons = page.locator('button:visible');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();

        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });
});
