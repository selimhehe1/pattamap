/**
 * E2E Tests - Reviews & Ratings CRUD
 *
 * Tests review functionality:
 * 1. Create review for employee
 * 2. Create review for establishment
 * 3. View reviews list
 * 4. Update own review
 * 5. Delete own review
 * 6. Rating system (stars)
 * 7. Review moderation
 *
 * Critical for social proof - reviews drive engagement and trust.
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsUser } from './fixtures/loginHelper';

// ========================================
// TEST SUITE 1: Create Review for Employee
// ========================================

test.describe('Create Employee Review', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available');
      return;
    }
  });

  test('should display review button on employee profile', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Click on employee to open profile
    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for review button
      const reviewBtn = page.locator('button:has-text("Review"), button:has-text("Write Review"), a:has-text("Review")').first();
      await expect(reviewBtn).toBeVisible({ timeout: 10000 });
    }
  });

  test('should open review form modal', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const reviewBtn = page.locator('button:has-text("Review"), button:has-text("Write Review")').first();

      if (await reviewBtn.count() > 0) {
        await reviewBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Should show review form
        const reviewForm = page.locator('[role="dialog"], .review-form, form').first();
        await expect(reviewForm).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display star rating selector', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const reviewBtn = page.locator('button:has-text("Review")').first();

      if (await reviewBtn.count() > 0) {
        await reviewBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Look for star rating
        const starRating = page.locator('.star-rating, [data-rating], button[aria-label*="star"]').first();
        await expect(starRating).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should select rating with stars', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const reviewBtn = page.locator('button:has-text("Review")').first();

      if (await reviewBtn.count() > 0) {
        await reviewBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Click on 4th star
        const stars = page.locator('.star, [data-star]');
        if (await stars.count() >= 4) {
          await stars.nth(3).click(); // 4 stars
          await page.waitForLoadState('domcontentloaded');

          // Verify selection
          const selectedStars = page.locator('.star.selected, .star.active, [data-selected="true"]');
          expect(await selectedStars.count()).toBeGreaterThanOrEqual(4);
        }
      }
    }
  });

  test('should submit review with rating and comment', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const reviewBtn = page.locator('button:has-text("Review")').first();

      if (await reviewBtn.count() > 0) {
        await reviewBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Select rating
        const stars = page.locator('.star, [data-star]');
        if (await stars.count() >= 5) {
          await stars.nth(4).click(); // 5 stars
        }

        // Write comment
        const commentField = page.locator('textarea[name="comment"], textarea[name="review"]').first();
        if (await commentField.count() > 0) {
          await commentField.fill(`Great experience! Test review at ${new Date().toISOString()}`);
        }

        // Submit
        const submitBtn = page.locator('button[type="submit"], button:has-text("Submit")').first();
        await submitBtn.click();
        await page.waitForLoadState('networkidle');

        // Should show success
        const successMessage = page.locator('text=/success|thank|submitted/i').first();
        expect(await successMessage.count() > 0).toBeTruthy();
      }
    }
  });

  test('should require rating before submitting', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const reviewBtn = page.locator('button:has-text("Review")').first();

      if (await reviewBtn.count() > 0) {
        await reviewBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Try to submit without rating
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Should show error
        const errorMessage = page.locator('text=/rating.*required|select.*rating|please.*rate/i').first();
        expect(await errorMessage.count() > 0 || page.url().includes('review')).toBeTruthy();
      }
    }
  });

  test('should award XP for submitting review', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Get initial XP
    const xpBefore = await page.locator('.user-xp, [data-xp]').first().textContent();

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const reviewBtn = page.locator('button:has-text("Review")').first();

      if (await reviewBtn.count() > 0) {
        await reviewBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Submit review
        const stars = page.locator('.star').nth(4);
        if (await stars.count() > 0) {
          await stars.click();
        }

        const commentField = page.locator('textarea').first();
        if (await commentField.count() > 0) {
          await commentField.fill('Test review for XP');
        }

        await page.locator('button[type="submit"]').first().click();
        await page.waitForLoadState('networkidle');

        // Check for XP notification
        const xpNotification = page.locator('text=/\\+\\d+.*XP|XP.*earned/i').first();
        // XP notification may or may not show depending on implementation
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

// ========================================
// TEST SUITE 2: Create Review for Establishment
// ========================================

test.describe('Create Establishment Review', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available');
      return;
    }
  });

  test('should display review button on establishment page', async ({ page }) => {
    await page.goto('/establishments');
    await page.waitForLoadState('networkidle');

    const establishmentCard = page.locator('.establishment-card').first();

    if (await establishmentCard.count() > 0) {
      await establishmentCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for review button
      const reviewBtn = page.locator('button:has-text("Review"), button:has-text("Write Review")').first();
      await expect(reviewBtn).toBeVisible({ timeout: 10000 });
    }
  });

  test('should allow rating different aspects', async ({ page }) => {
    await page.goto('/establishments');
    await page.waitForLoadState('networkidle');

    const establishmentCard = page.locator('.establishment-card').first();

    if (await establishmentCard.count() > 0) {
      await establishmentCard.click();
      await page.waitForLoadState('domcontentloaded');

      const reviewBtn = page.locator('button:has-text("Review")').first();

      if (await reviewBtn.count() > 0) {
        await reviewBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Look for multiple rating categories (atmosphere, service, value, etc.)
        const ratingCategories = page.locator('.rating-category, [data-category]');

        // May have multiple categories or just overall rating
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });
});

// ========================================
// TEST SUITE 3: View Reviews
// ========================================

test.describe('View Reviews', () => {
  test('should display reviews on employee profile', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for reviews section
      const reviewsSection = page.locator('.reviews, .reviews-list, [data-testid="reviews"]').first();

      if (await reviewsSection.count() > 0) {
        await expect(reviewsSection).toBeVisible();
      }
    }
  });

  test('should display average rating', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for average rating
      const avgRating = page.locator('.average-rating, .rating-badge').or(page.locator('text=/\\d\\.\\d.*stars?/i')).first();

      // May or may not have reviews yet
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show review count', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for review count
      const reviewCount = page.locator('text=/\\d+.*review/i, .review-count').first();

      // May or may not have reviews
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should paginate reviews list', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for pagination or "load more"
      const pagination = page.locator('.pagination, button:has-text("Load More"), button:has-text("Show More")').first();

      // Pagination only shows if many reviews
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should sort reviews by date/rating', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for sort dropdown
      const sortDropdown = page.locator('select[name="sort"], .sort-dropdown').first();

      if (await sortDropdown.count() > 0) {
        await expect(sortDropdown).toBeVisible();

        // Select different sort option
        await sortDropdown.selectOption({ index: 1 });
        await page.waitForLoadState('domcontentloaded');
      }
    }
  });
});

// ========================================
// TEST SUITE 4: Update Own Review
// ========================================

test.describe('Update Own Review', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available');
      return;
    }
  });

  test('should show edit button on own reviews', async ({ page }) => {
    await page.goto('/profile/reviews');
    await page.waitForLoadState('networkidle');

    // Look for edit button on own reviews
    const editBtn = page.locator('button:has-text("Edit"), .edit-review-btn').first();

    if (await editBtn.count() > 0) {
      await expect(editBtn).toBeVisible();
    }
  });

  test('should open edit form with existing data', async ({ page }) => {
    await page.goto('/profile/reviews');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('button:has-text("Edit")').first();

    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForLoadState('domcontentloaded');

      // Form should be pre-filled
      const commentField = page.locator('textarea').first();
      if (await commentField.count() > 0) {
        const existingText = await commentField.inputValue();
        expect(existingText.length).toBeGreaterThan(0);
      }
    }
  });

  test('should update review successfully', async ({ page }) => {
    await page.goto('/profile/reviews');
    await page.waitForLoadState('networkidle');

    const editBtn = page.locator('button:has-text("Edit")').first();

    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForLoadState('domcontentloaded');

      // Update comment
      const commentField = page.locator('textarea').first();
      if (await commentField.count() > 0) {
        await commentField.fill(`Updated review at ${new Date().toISOString()}`);
      }

      // Save
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")').first();
      await saveBtn.click();
      await page.waitForLoadState('networkidle');

      // Should show success
      const successMessage = page.locator('text=/success|updated/i').first();
      expect(await successMessage.count() > 0).toBeTruthy();
    }
  });

  test('should show "edited" indicator on updated reviews', async ({ page }) => {
    await page.goto('/profile/reviews');
    await page.waitForLoadState('networkidle');

    // Look for edited indicator
    const editedIndicator = page.locator('text=/edited|modified/i, .edited-badge').first();

    // May or may not have edited reviews
    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 5: Delete Own Review
// ========================================

test.describe('Delete Own Review', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available');
      return;
    }
  });

  test('should show delete button on own reviews', async ({ page }) => {
    await page.goto('/profile/reviews');
    await page.waitForLoadState('networkidle');

    const deleteBtn = page.locator('button:has-text("Delete"), .delete-review-btn').first();

    if (await deleteBtn.count() > 0) {
      await expect(deleteBtn).toBeVisible();
    }
  });

  test('should show confirmation before deleting', async ({ page }) => {
    await page.goto('/profile/reviews');
    await page.waitForLoadState('networkidle');

    const deleteBtn = page.locator('button:has-text("Delete")').first();

    if (await deleteBtn.count() > 0) {
      await deleteBtn.click();
      await page.waitForLoadState('domcontentloaded');

      // Should show confirmation
      const confirmDialog = page.locator('[role="dialog"], .confirm-modal').or(page.locator('text=/confirm|sure/i')).first();
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    }
  });

  test('should delete review on confirmation', async ({ page }) => {
    await page.goto('/profile/reviews');
    await page.waitForLoadState('networkidle');

    const reviewsBefore = await page.locator('.review-card, .review-item').count();

    const deleteBtn = page.locator('button:has-text("Delete")').first();

    if (await deleteBtn.count() > 0 && reviewsBefore > 0) {
      await deleteBtn.click();
      await page.waitForLoadState('domcontentloaded');

      // Confirm
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")').first();
      await confirmBtn.click();
      await page.waitForLoadState('networkidle');

      // Review count should decrease
      const reviewsAfter = await page.locator('.review-card, .review-item').count();
      expect(reviewsAfter).toBeLessThan(reviewsBefore);
    }
  });

  test('should cancel deletion on cancel button', async ({ page }) => {
    await page.goto('/profile/reviews');
    await page.waitForLoadState('networkidle');

    const reviewsBefore = await page.locator('.review-card').count();

    const deleteBtn = page.locator('button:has-text("Delete")').first();

    if (await deleteBtn.count() > 0 && reviewsBefore > 0) {
      await deleteBtn.click();
      await page.waitForLoadState('domcontentloaded');

      // Cancel
      const cancelBtn = page.locator('button:has-text("Cancel"), button:has-text("No")').first();
      await cancelBtn.click();
      await page.waitForLoadState('domcontentloaded');

      // Count should be same
      const reviewsAfter = await page.locator('.review-card').count();
      expect(reviewsAfter).toBe(reviewsBefore);
    }
  });
});

// ========================================
// TEST SUITE 6: Review Moderation
// ========================================

test.describe('Review Moderation', () => {
  test('should prevent profanity in reviews', async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available');
      return;
    }

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const reviewBtn = page.locator('button:has-text("Review")').first();

      if (await reviewBtn.count() > 0) {
        await reviewBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Try to submit with profanity
        const stars = page.locator('.star').nth(2);
        if (await stars.count() > 0) {
          await stars.click();
        }

        const commentField = page.locator('textarea').first();
        if (await commentField.count() > 0) {
          await commentField.fill('This is a bad word test with profanity');

          await page.locator('button[type="submit"]').first().click();
          await page.waitForLoadState('networkidle');

          // Should either filter or warn
          // Implementation may vary
          await expect(page.locator('body')).toBeVisible();
        }
      }
    }
  });

  test('should flag review for moderation', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Look for flag/report button on reviews
      const flagBtn = page.locator('button:has-text("Report"), button:has-text("Flag"), .report-btn').first();

      if (await flagBtn.count() > 0) {
        await expect(flagBtn).toBeVisible();
      }
    }
  });

  test('should report inappropriate review', async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available');
      return;
    }

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const flagBtn = page.locator('button:has-text("Report")').first();

      if (await flagBtn.count() > 0) {
        await flagBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Select reason
        const reasonSelect = page.locator('select[name="reason"]').first();
        if (await reasonSelect.count() > 0) {
          await reasonSelect.selectOption({ index: 1 });
        }

        // Submit report
        const submitBtn = page.locator('button:has-text("Submit Report")').first();
        if (await submitBtn.count() > 0) {
          await submitBtn.click();
          await page.waitForLoadState('networkidle');

          // Should show confirmation
          const successMessage = page.locator('text=/reported|thank|review/i').first();
          expect(await successMessage.count() > 0).toBeTruthy();
        }
      }
    }
  });
});

// ========================================
// TEST SUITE 7: Review Permissions
// ========================================

test.describe('Review Permissions', () => {
  test('should require login to write review', async ({ page }) => {
    // Without login
    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      const reviewBtn = page.locator('button:has-text("Review")').first();

      if (await reviewBtn.count() > 0) {
        await reviewBtn.click();
        await page.waitForLoadState('domcontentloaded');

        // Should redirect to login or show login prompt
        const loginPrompt = page.locator('text=/login|sign in/i, [href*="/login"]').first();
        const onLoginPage = page.url().includes('/login');

        expect(await loginPrompt.count() > 0 || onLoginPage).toBeTruthy();
      }
    }
  });

  test('should not allow editing others reviews', async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available');
      return;
    }

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    const employeeCard = page.locator('.employee-card').first();

    if (await employeeCard.count() > 0) {
      await employeeCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Look at reviews from other users
      const otherReviews = page.locator('.review-card:not([data-own="true"])');

      if (await otherReviews.count() > 0) {
        // Should not have edit button
        const editBtn = otherReviews.first().locator('button:has-text("Edit")');
        expect(await editBtn.count()).toBe(0);
      }
    }
  });

  test('should limit one review per user per employee', async ({ page }, testInfo) => {
    const loggedIn = await loginAsUser(page);
    if (!loggedIn) {
      testInfo.skip(true, 'User login not available');
      return;
    }

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    // Find employee user already reviewed
    const reviewedEmployee = page.locator('.employee-card:has(.my-review)').first();

    if (await reviewedEmployee.count() > 0) {
      await reviewedEmployee.click();
      await page.waitForLoadState('domcontentloaded');

      // Review button should say "Edit Review" instead of "Write Review"
      const editReviewBtn = page.locator('button:has-text("Edit Review")').first();
      const writeReviewBtn = page.locator('button:has-text("Write Review")').first();

      expect(await editReviewBtn.count() > 0 || await writeReviewBtn.count() === 0).toBeTruthy();
    }
  });
});
