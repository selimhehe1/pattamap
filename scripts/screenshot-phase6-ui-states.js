/**
 * SCREENSHOT AUTOMATION - Phase 6: UI States
 *
 * Capture screenshots pour audit CSS Phase 6
 * States: Modals (login/register), Notifications, Forms, Loading
 *
 * Usage: node scripts/screenshot-phase6-ui-states.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = 'audit-css-screenshots/6-ui-states';

// Viewports
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  mobile: { width: 375, height: 812 }
};

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`📁 Created directory: ${OUTPUT_DIR}`);
}

async function capturePhase6Screenshots() {
  console.log(`\n🚀 Phase 6: UI States Screenshot Capture\n`);
  console.log(`📸 Target: 15 screenshots`);
  console.log(`🎨 Focus: Modals, Forms, Notifications, Loading States\n`);

  const browser = await chromium.launch({
    headless: true
  });

  try {
    // ===================================================================
    // 1. LOGIN MODAL STATES (Desktop)
    // ===================================================================
    console.log(`\n📱 LOGIN MODAL - States\n`);

    const desktopContext = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      deviceScaleFactor: 2
    });
    const desktopPage = await desktopContext.newPage();

    await desktopPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(1000);

    // Login Modal - Empty State
    console.log(`1/15 - Capturing Login Modal Empty (desktop)...`);
    try {
      const loginButton = await desktopPage.$('button:has-text("Login")');
      if (loginButton) {
        await loginButton.click();
        await desktopPage.waitForTimeout(1000);
        await desktopPage.screenshot({
          path: path.join(OUTPUT_DIR, '01-desktop-login-modal-empty.png'),
          fullPage: false
        });
        console.log(`✅ Saved: 01-desktop-login-modal-empty.png`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture login modal empty: ${error.message}`);
    }

    // Login Modal - Filled State
    console.log(`2/15 - Capturing Login Modal Filled (desktop)...`);
    try {
      await desktopPage.fill('input[name="email"]', 'test@example.com');
      await desktopPage.fill('input[name="password"]', 'Test123!');
      await desktopPage.waitForTimeout(500);
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '02-desktop-login-modal-filled.png'),
        fullPage: false
      });
      console.log(`✅ Saved: 02-desktop-login-modal-filled.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture login modal filled: ${error.message}`);
    }

    // Login Modal - Error State (try submit with wrong credentials)
    console.log(`3/15 - Capturing Login Modal Error (desktop)...`);
    try {
      const submitButton = await desktopPage.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await desktopPage.waitForTimeout(2000); // Wait for error message
        await desktopPage.screenshot({
          path: path.join(OUTPUT_DIR, '03-desktop-login-modal-error.png'),
          fullPage: false
        });
        console.log(`✅ Saved: 03-desktop-login-modal-error.png`);
      }

      // Close modal
      const closeButton = await desktopPage.$('button[aria-label*="lose"]');
      if (closeButton) await closeButton.click();
      await desktopPage.waitForTimeout(500);
    } catch (error) {
      console.log(`⚠️  Could not capture login modal error: ${error.message}`);
    }

    // ===================================================================
    // 2. REGISTER MODAL STATES (Desktop)
    // ===================================================================
    console.log(`\n📱 REGISTER MODAL - States\n`);

    // Register Modal - Step 1 Empty
    console.log(`4/15 - Capturing Register Modal Step 1 Empty (desktop)...`);
    try {
      const registerButton = await desktopPage.$('button:has-text("Register"), button:has-text("Sign Up")');
      if (registerButton) {
        await registerButton.click();
        await desktopPage.waitForTimeout(1000);
        await desktopPage.screenshot({
          path: path.join(OUTPUT_DIR, '04-desktop-register-modal-step1-empty.png'),
          fullPage: false
        });
        console.log(`✅ Saved: 04-desktop-register-modal-step1-empty.png`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture register modal: ${error.message}`);
    }

    // Register Modal - Step 1 Filled
    console.log(`5/15 - Capturing Register Modal Step 1 Filled (desktop)...`);
    try {
      await desktopPage.fill('input[name="email"]', 'newuser@example.com');
      await desktopPage.fill('input[name="password"]', 'NewUser123!');
      await desktopPage.waitForTimeout(500);
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '05-desktop-register-modal-step1-filled.png'),
        fullPage: false
      });
      console.log(`✅ Saved: 05-desktop-register-modal-step1-filled.png`);

      // Try to go to Step 2
      const nextButton = await desktopPage.$('button:has-text("Next"), button:has-text("Continue")');
      if (nextButton) {
        await nextButton.click();
        await desktopPage.waitForTimeout(1000);
      }
    } catch (error) {
      console.log(`⚠️  Could not fill register form: ${error.message}`);
    }

    // Register Modal - Step 2
    console.log(`6/15 - Capturing Register Modal Step 2 (desktop)...`);
    try {
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '06-desktop-register-modal-step2.png'),
        fullPage: false
      });
      console.log(`✅ Saved: 06-desktop-register-modal-step2.png`);

      // Close modal
      const closeButton = await desktopPage.$('button[aria-label*="lose"]');
      if (closeButton) await closeButton.click();
      await desktopPage.waitForTimeout(500);
    } catch (error) {
      console.log(`⚠️  Could not capture step 2: ${error.message}`);
    }

    await desktopContext.close();

    // ===================================================================
    // 3. NOTIFICATION BELL STATES (Desktop)
    // ===================================================================
    console.log(`\n📱 NOTIFICATION BELL - States\n`);

    // Login as user to access notifications
    const notifContext = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      deviceScaleFactor: 2
    });
    const notifPage = await notifContext.newPage();

    // Try to login
    await notifPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await notifPage.waitForTimeout(1000);

    try {
      const loginBtn = await notifPage.$('button:has-text("Login")');
      if (loginBtn) {
        await loginBtn.click();
        await notifPage.waitForTimeout(1000);
        await notifPage.fill('input[name="email"]', 'bobbob@gmail.com');
        await notifPage.fill('input[name="password"]', 'Bobbob123!');
        const submitBtn = await notifPage.$('button[type="submit"]');
        if (submitBtn) {
          await submitBtn.click();
          await notifPage.waitForTimeout(3000);
        }
      }
    } catch (error) {
      console.log(`⚠️  Login for notifications failed: ${error.message}`);
    }

    // NotificationBell - Closed State
    console.log(`7/15 - Capturing NotificationBell Closed (desktop)...`);
    try {
      await notifPage.screenshot({
        path: path.join(OUTPUT_DIR, '07-desktop-notification-bell-closed.png'),
        fullPage: false // Just header area
      });
      console.log(`✅ Saved: 07-desktop-notification-bell-closed.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture bell closed: ${error.message}`);
    }

    // NotificationBell - Open with Notifications
    console.log(`8/15 - Capturing NotificationBell Open Full (desktop)...`);
    try {
      const bellButton = await notifPage.$('.notification-bell, button[aria-label*="otification"]');
      if (bellButton) {
        await bellButton.click();
        await notifPage.waitForTimeout(1000);
        await notifPage.screenshot({
          path: path.join(OUTPUT_DIR, '08-desktop-notification-bell-open-full.png'),
          fullPage: false
        });
        console.log(`✅ Saved: 08-desktop-notification-bell-open-full.png`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture bell open: ${error.message}`);
    }

    // NotificationBell - Filtered State
    console.log(`9/15 - Capturing NotificationBell Filtered (desktop)...`);
    try {
      // Click on a filter chip
      const filterButton = await notifPage.$('.notification-filter, button[aria-label*="ilter"]');
      if (filterButton) {
        await filterButton.click();
        await notifPage.waitForTimeout(500);
        await notifPage.screenshot({
          path: path.join(OUTPUT_DIR, '09-desktop-notification-bell-filtered.png'),
          fullPage: false
        });
        console.log(`✅ Saved: 09-desktop-notification-bell-filtered.png`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture bell filtered: ${error.message}`);
    }

    // NotificationBell - Grouped State
    console.log(`10/15 - Capturing NotificationBell Grouped (desktop)...`);
    try {
      // Try to toggle grouping
      const groupButton = await notifPage.$('button:has-text("Group"), button[aria-label*="roup"]');
      if (groupButton) {
        await groupButton.click();
        await notifPage.waitForTimeout(500);
        await notifPage.screenshot({
          path: path.join(OUTPUT_DIR, '10-desktop-notification-bell-grouped.png'),
          fullPage: false
        });
        console.log(`✅ Saved: 10-desktop-notification-bell-grouped.png`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture bell grouped: ${error.message}`);
    }

    await notifContext.close();

    // ===================================================================
    // 4. FORM VALIDATION STATES (Desktop)
    // ===================================================================
    console.log(`\n📱 FORM VALIDATION - States\n`);

    const formContext = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      deviceScaleFactor: 2
    });
    const formPage = await formContext.newPage();

    await formPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await formPage.waitForTimeout(1000);

    // Open register to get form validation
    try {
      const registerBtn = await formPage.$('button:has-text("Register")');
      if (registerBtn) {
        await registerBtn.click();
        await formPage.waitForTimeout(1000);
      }
    } catch (error) {
      console.log(`⚠️  Could not open register form: ${error.message}`);
    }

    // Form - Error State (invalid email)
    console.log(`11/15 - Capturing Form Validation Error (desktop)...`);
    try {
      await formPage.fill('input[name="email"]', 'invalid-email');
      await formPage.fill('input[name="password"]', '123'); // Too short
      await formPage.waitForTimeout(500);

      // Try to submit to trigger validation
      const submitBtn = await formPage.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await formPage.waitForTimeout(1000);
      }

      await formPage.screenshot({
        path: path.join(OUTPUT_DIR, '11-desktop-form-validation-error.png'),
        fullPage: false
      });
      console.log(`✅ Saved: 11-desktop-form-validation-error.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture form error: ${error.message}`);
    }

    // Form - Success State (valid input with green checkmarks)
    console.log(`12/15 - Capturing Form Validation Success (desktop)...`);
    try {
      await formPage.fill('input[name="email"]', 'valid@example.com');
      await formPage.fill('input[name="password"]', 'ValidPass123!');
      await formPage.waitForTimeout(500);

      await formPage.screenshot({
        path: path.join(OUTPUT_DIR, '12-desktop-form-validation-success.png'),
        fullPage: false
      });
      console.log(`✅ Saved: 12-desktop-form-validation-success.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture form success: ${error.message}`);
    }

    await formContext.close();

    // ===================================================================
    // 5. LOADING STATES (Desktop)
    // ===================================================================
    console.log(`\n📱 LOADING - States\n`);

    const loadingContext = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      deviceScaleFactor: 2
    });
    const loadingPage = await loadingContext.newPage();

    // Loading Spinner State
    console.log(`13/15 - Capturing Loading Spinner (desktop)...`);
    try {
      // Navigate to a slow-loading page
      await loadingPage.goto(BASE_URL + '/search', { waitUntil: 'domcontentloaded' }); // Don't wait for networkidle
      await loadingPage.waitForTimeout(500); // Capture during load

      await loadingPage.screenshot({
        path: path.join(OUTPUT_DIR, '13-desktop-loading-spinner.png'),
        fullPage: false
      });
      console.log(`✅ Saved: 13-desktop-loading-spinner.png`);

      await loadingPage.waitForTimeout(2000); // Let it finish loading
    } catch (error) {
      console.log(`⚠️  Could not capture loading spinner: ${error.message}`);
    }

    // Loading Skeleton State
    console.log(`14/15 - Capturing Loading Skeleton (desktop)...`);
    try {
      // Refresh page to catch skeleton
      await loadingPage.reload({ waitUntil: 'domcontentloaded' });
      await loadingPage.waitForTimeout(300); // Very quick to catch skeleton

      await loadingPage.screenshot({
        path: path.join(OUTPUT_DIR, '14-desktop-loading-skeleton.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 14-desktop-loading-skeleton.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture loading skeleton: ${error.message}`);
    }

    // Empty State vs Full State
    console.log(`15/15 - Capturing Empty State (desktop)...`);
    try {
      // Navigate to a page that might have empty state
      await loadingPage.goto(BASE_URL + '/user/dashboard', { waitUntil: 'networkidle' });
      await loadingPage.waitForTimeout(2000);

      await loadingPage.screenshot({
        path: path.join(OUTPUT_DIR, '15-desktop-empty-state-dashboard.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 15-desktop-empty-state-dashboard.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture empty state: ${error.message}`);
    }

    await loadingContext.close();

    console.log(`\n✅ Phase 6 Screenshot Capture Complete!`);
    console.log(`📂 Output directory: ${OUTPUT_DIR}\n`);

  } catch (error) {
    console.error(`❌ Fatal error:`, error);
  } finally {
    await browser.close();
  }
}

// Run script
capturePhase6Screenshots();
