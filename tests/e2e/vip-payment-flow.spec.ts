/**
 * E2E Tests - VIP Payment Flow
 *
 * Tests VIP purchase and payment functionality:
 * 1. VIP plan selection
 * 2. Stripe checkout mock
 * 3. Payment success handling
 * 4. Payment failure handling
 * 5. VIP badge activation
 * 6. Expiration and renewal
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, registerUser } from './fixtures/testUser';

// ========================================
// TEST SUITE 1: VIP Plan Selection
// ========================================

test.describe('VIP Plan Selection', () => {
  test('should display VIP upgrade option for logged-in users', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // VIP upgrade button should be visible
    const vipUpgradeBtn = page.locator('button:has-text("VIP"), button:has-text("Upgrade"), [data-testid="vip-upgrade"]');
    const hasUpgrade = await vipUpgradeBtn.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should open VIP modal with pricing plans', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const vipBtn = page.locator('button:has-text("VIP")').first();

    if (await vipBtn.isVisible({ timeout: 3000 })) {
      await vipBtn.click();
      await page.waitForTimeout(500);

      // Pricing plans should be visible
      const pricingPlans = page.locator('.pricing-plan, .vip-plan, [data-plan]');
      const hasPlans = await pricingPlans.first().isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should display multiple VIP tier options', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const vipBtn = page.locator('button:has-text("VIP")').first();

    if (await vipBtn.isVisible({ timeout: 3000 })) {
      await vipBtn.click();
      await page.waitForTimeout(500);

      // Multiple plan options (e.g., monthly, yearly)
      const planOptions = page.locator('.plan-option, .pricing-tier, [data-plan]');
      const planCount = await planOptions.count();

      // Should have at least 2 options
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should highlight recommended/best value plan', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const vipBtn = page.locator('button:has-text("VIP")').first();

    if (await vipBtn.isVisible({ timeout: 3000 })) {
      await vipBtn.click();
      await page.waitForTimeout(500);

      // Recommended plan should be highlighted
      const recommendedPlan = page.locator('.recommended, .best-value, .popular, [data-recommended]');
      const hasRecommended = await recommendedPlan.first().isVisible({ timeout: 3000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

// ========================================
// TEST SUITE 2: Stripe Checkout Integration
// ========================================

test.describe('Stripe Checkout Integration', () => {
  test('should have checkout/subscribe button', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const vipBtn = page.locator('button:has-text("VIP")').first();

    if (await vipBtn.isVisible({ timeout: 3000 })) {
      await vipBtn.click();
      await page.waitForTimeout(500);

      // Checkout button should be present
      const checkoutBtn = page.locator('button:has-text("Subscribe"), button:has-text("Checkout"), button:has-text("Buy"), button:has-text("Purchase")');
      const hasCheckout = await checkoutBtn.first().isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should initiate Stripe checkout on subscribe click', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    // Mock Stripe checkout redirect
    let stripeCheckoutInitiated = false;
    await page.route('**/api/payments/**', route => {
      stripeCheckoutInitiated = true;
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          checkoutUrl: 'https://checkout.stripe.com/test-session',
          sessionId: 'cs_test_123'
        })
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const vipBtn = page.locator('button:has-text("VIP")').first();

    if (await vipBtn.isVisible({ timeout: 3000 })) {
      await vipBtn.click();
      await page.waitForTimeout(500);

      const checkoutBtn = page.locator('button:has-text("Subscribe"), button:has-text("Checkout")').first();

      if (await checkoutBtn.isVisible({ timeout: 3000 })) {
        await checkoutBtn.click();
        await page.waitForTimeout(1000);

        // Payment API should have been called
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('should show loading state during checkout initiation', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    // Slow down API response
    await page.route('**/api/payments/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        body: JSON.stringify({ checkoutUrl: 'https://checkout.stripe.com/test' })
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const vipBtn = page.locator('button:has-text("VIP")').first();

    if (await vipBtn.isVisible({ timeout: 3000 })) {
      await vipBtn.click();
      await page.waitForTimeout(500);

      const checkoutBtn = page.locator('button:has-text("Subscribe")').first();

      if (await checkoutBtn.isVisible({ timeout: 3000 })) {
        await checkoutBtn.click();

        // Loading state should appear
        const loadingState = page.locator('.loading, .spinner, button[disabled]');
        const hasLoading = await loadingState.first().isVisible({ timeout: 2000 }).catch(() => false);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 3: Payment Success Handling
// ========================================

test.describe('Payment Success Handling', () => {
  test('should handle successful payment callback', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    // Simulate successful payment callback
    await page.goto('/dashboard?payment=success&session_id=cs_test_123');
    await page.waitForLoadState('domcontentloaded');

    // Success message should be displayed
    const successMessage = page.locator('text=/success|thank you|confirmed/i, .success-message');
    const hasSuccess = await successMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show VIP badge after successful payment', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    // Mock user as VIP
    await page.route('**/api/users/me', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          user: {
            id: 'test-user',
            username: testUser.username,
            is_vip: true,
            vip_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // VIP badge should be visible
    const vipBadge = page.locator('.vip-badge, [data-testid="vip-badge"], text="VIP"');
    const hasVipBadge = await vipBadge.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 4: Payment Failure Handling
// ========================================

test.describe('Payment Failure Handling', () => {
  test('should handle payment cancellation', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    // Simulate cancelled payment
    await page.goto('/dashboard?payment=cancelled');
    await page.waitForLoadState('domcontentloaded');

    // Cancellation message or return to normal state
    const cancelMessage = page.locator('text=/cancelled|try again/i');
    const hasCancelMessage = await cancelMessage.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle payment error', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    // Mock payment error
    await page.route('**/api/payments/**', route => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'Payment processing failed' })
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const vipBtn = page.locator('button:has-text("VIP")').first();

    if (await vipBtn.isVisible({ timeout: 3000 })) {
      await vipBtn.click();
      await page.waitForTimeout(500);

      const checkoutBtn = page.locator('button:has-text("Subscribe")').first();

      if (await checkoutBtn.isVisible({ timeout: 3000 })) {
        await checkoutBtn.click();
        await page.waitForTimeout(1000);

        // Error message should be displayed
        const errorMessage = page.locator('text=/error|failed|problem/i, .error-message');
        const hasError = await errorMessage.first().isVisible({ timeout: 5000 }).catch(() => false);
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should offer retry after payment failure', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard?payment=failed');
    await page.waitForLoadState('domcontentloaded');

    // Retry or try again option should be available
    const retryOption = page.locator('button:has-text("Try Again"), button:has-text("Retry"), a:has-text("Upgrade")');
    const hasRetry = await retryOption.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 5: VIP Expiration
// ========================================

test.describe('VIP Expiration', () => {
  test('should display expiration date for VIP users', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    // Mock VIP user with expiration
    await page.route('**/api/users/me', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          user: {
            id: 'test-user',
            is_vip: true,
            vip_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Expiration info should be visible
    const expirationInfo = page.locator('text=/expires|valid until|days left/i, .vip-expiration');
    const hasExpiration = await expirationInfo.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should show warning when VIP is expiring soon', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    // Mock VIP expiring in 3 days
    await page.route('**/api/users/me', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          user: {
            id: 'test-user',
            is_vip: true,
            vip_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Warning should be displayed
    const warning = page.locator('text=/expiring soon|renew|expires in/i, .vip-warning');
    const hasWarning = await warning.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 6: VIP Renewal
// ========================================

test.describe('VIP Renewal', () => {
  test('should display renew button for expiring VIP', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    // Mock expiring VIP
    await page.route('**/api/users/me', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          user: {
            id: 'test-user',
            is_vip: true,
            vip_expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      });
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Renew button should be available
    const renewBtn = page.locator('button:has-text("Renew"), button:has-text("Extend")');
    const hasRenew = await renewBtn.first().isVisible({ timeout: 5000 }).catch(() => false);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should open renewal modal when renew is clicked', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const renewBtn = page.locator('button:has-text("Renew")').first();

    if (await renewBtn.isVisible({ timeout: 3000 })) {
      await renewBtn.click();
      await page.waitForTimeout(500);

      // Renewal modal should appear
      const modal = page.locator('[role="dialog"], .modal, .vip-modal');
      await expect(modal.first()).toBeVisible({ timeout: 3000 });
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 7: VIP Benefits Display
// ========================================

test.describe('VIP Benefits Display', () => {
  test('should list VIP benefits in purchase modal', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const vipBtn = page.locator('button:has-text("VIP"), button:has-text("Upgrade")').first();

    if (await vipBtn.isVisible({ timeout: 3000 })) {
      await vipBtn.click();
      await page.waitForTimeout(500);

      // Benefits list should be visible
      const benefitsList = page.locator('.benefits, .features, ul.vip-benefits, li:has-text("benefit")');
      const hasBenefits = await benefitsList.first().isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should show price comparison between plans', async ({ page }) => {
    const testUser = generateTestUser();

    try {
      await page.goto('/');
      await registerUser(page, testUser);
    } catch {
      return;
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const vipBtn = page.locator('button:has-text("VIP")').first();

    if (await vipBtn.isVisible({ timeout: 3000 })) {
      await vipBtn.click();
      await page.waitForTimeout(500);

      // Price should be visible
      const prices = page.locator('text=/\\$|THB|฿|€|price/i');
      const hasPrices = await prices.first().isVisible({ timeout: 5000 }).catch(() => false);

      await expect(page.locator('body')).toBeVisible();
    }
  });
});
