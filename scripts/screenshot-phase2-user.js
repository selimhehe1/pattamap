/**
 * SCREENSHOT AUTOMATION - Phase 2: User Pages
 *
 * Capture screenshots pour audit CSS Phase 2
 * Pages: Auth modals, UserDashboard, MyAchievementsPage
 *
 * Usage: node scripts/screenshot-phase2-user.js
 *
 * Credentials: bobbob / Bobbob123!
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = 'audit-css-screenshots/2-user';
const USER_CREDENTIALS = {
  email: 'bobbob@gmail.com',
  password: 'Bobbob123!'
};

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

async function capturePhase2Screenshots() {
  console.log(`\n🚀 Phase 2: User Pages Screenshot Capture\n`);
  console.log(`📸 Target: 15 screenshots`);
  console.log(`👤 User: ${USER_CREDENTIALS.email}\n`);

  const browser = await chromium.launch({
    headless: true
  });

  try {
    // ===================================================================
    // 1. DESKTOP: Auth Modals (Login + Register)
    // ===================================================================
    console.log(`\n📱 DESKTOP - Auth Modals\n`);

    const desktopContext = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      deviceScaleFactor: 2
    });
    const desktopPage = await desktopContext.newPage();

    // Homepage
    console.log(`1/15 - Navigating to homepage...`);
    await desktopPage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await desktopPage.waitForTimeout(2000);

    // Click Login button to open modal
    console.log(`2/15 - Opening Login modal...`);
    try {
      // Try multiple selectors for login button
      const loginSelectors = [
        'button:has-text("Login")',
        'button:has-text("Se connecter")',
        'a[href*="login"]',
        '.header-auth-buttons button:first-child',
        'header button:has-text("Login")'
      ];

      let loginButton = null;
      for (const selector of loginSelectors) {
        try {
          loginButton = await desktopPage.waitForSelector(selector, { timeout: 3000 });
          if (loginButton) break;
        } catch (e) {
          // Try next selector
        }
      }

      if (loginButton) {
        await loginButton.click();
        await desktopPage.waitForTimeout(1000);
        await desktopPage.screenshot({
          path: path.join(OUTPUT_DIR, '01-desktop-login-modal.png'),
          fullPage: false // Only visible area to capture modal
        });
        console.log(`✅ Saved: 01-desktop-login-modal.png`);

        // Close modal
        const closeButton = await desktopPage.$('button[aria-label*="lose"], .modal-close, .close-button');
        if (closeButton) await closeButton.click();
        await desktopPage.waitForTimeout(500);
      } else {
        console.log(`⚠️  Login button not found, skipping modal screenshot`);
      }
    } catch (error) {
      console.log(`⚠️  Could not open login modal: ${error.message}`);
    }

    // Click Register button to open modal
    console.log(`3/15 - Opening Register modal...`);
    try {
      const registerSelectors = [
        'button:has-text("Register")',
        'button:has-text("Sign Up")',
        'a[href*="register"]',
        '.header-auth-buttons button:last-child',
        'header button:has-text("Register")'
      ];

      let registerButton = null;
      for (const selector of registerSelectors) {
        try {
          registerButton = await desktopPage.waitForSelector(selector, { timeout: 3000 });
          if (registerButton) break;
        } catch (e) {
          // Try next selector
        }
      }

      if (registerButton) {
        await registerButton.click();
        await desktopPage.waitForTimeout(1000);

        // Step 1
        await desktopPage.screenshot({
          path: path.join(OUTPUT_DIR, '02-desktop-register-modal-step1.png'),
          fullPage: false
        });
        console.log(`✅ Saved: 02-desktop-register-modal-step1.png`);

        // Try to navigate to Step 2 (if multi-step form exists)
        try {
          const nextButton = await desktopPage.$('button:has-text("Next"), button:has-text("Continue")');
          if (nextButton) {
            // Fill required fields for Step 1
            await desktopPage.fill('input[name="email"], input[type="email"]', 'test@example.com');
            await desktopPage.fill('input[name="password"], input[type="password"]:first-of-type', 'Test123!');
            await nextButton.click();
            await desktopPage.waitForTimeout(1000);

            // Step 2
            await desktopPage.screenshot({
              path: path.join(OUTPUT_DIR, '03-desktop-register-modal-step2.png'),
              fullPage: false
            });
            console.log(`✅ Saved: 03-desktop-register-modal-step2.png`);
          }
        } catch (e) {
          console.log(`⚠️  Multi-step form not detected or error navigating: ${e.message}`);
        }

        // Close modal
        const closeButton = await desktopPage.$('button[aria-label*="lose"], .modal-close, .close-button');
        if (closeButton) await closeButton.click();
        await desktopPage.waitForTimeout(500);
      } else {
        console.log(`⚠️  Register button not found, skipping modal screenshot`);
      }
    } catch (error) {
      console.log(`⚠️  Could not open register modal: ${error.message}`);
    }

    // Close desktop context before login
    await desktopContext.close();

    // ===================================================================
    // 2. LOGIN AS USER & CAPTURE DASHBOARD
    // ===================================================================
    console.log(`\n📱 DESKTOP - Logged In User Pages\n`);

    const loggedInDesktopContext = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      deviceScaleFactor: 2
    });
    const loggedInDesktopPage = await loggedInDesktopContext.newPage();

    // Navigate to homepage and login
    console.log(`4/15 - Logging in as user...`);
    await loggedInDesktopPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await loggedInDesktopPage.waitForTimeout(1000);

    try {
      // Click login button
      const loginButton = await loggedInDesktopPage.waitForSelector('button:has-text("Login"), a[href*="login"]', { timeout: 5000 });
      await loginButton.click();
      await loggedInDesktopPage.waitForTimeout(1000);

      // Fill login form
      await loggedInDesktopPage.fill('input[name="email"], input[type="email"]', USER_CREDENTIALS.email);
      await loggedInDesktopPage.fill('input[name="password"], input[type="password"]', USER_CREDENTIALS.password);

      // Submit
      const submitButton = await loggedInDesktopPage.$('button[type="submit"]:has-text("Login"), button:has-text("Sign In")');
      if (submitButton) {
        await submitButton.click();
        await loggedInDesktopPage.waitForTimeout(3000); // Wait for auth redirect
        console.log(`✅ Logged in successfully`);
      }
    } catch (error) {
      console.log(`⚠️  Login failed: ${error.message}`);
      console.log(`Continuing with unauthenticated screenshots...`);
    }

    // UserDashboard Desktop
    console.log(`5/15 - Capturing UserDashboard (desktop)...`);
    try {
      await loggedInDesktopPage.goto(BASE_URL + '/user/dashboard', { waitUntil: 'networkidle', timeout: 20000 });
      await loggedInDesktopPage.waitForTimeout(2000);
      await loggedInDesktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '04-desktop-user-dashboard.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 04-desktop-user-dashboard.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture UserDashboard: ${error.message}`);
    }

    // MyAchievementsPage Desktop
    console.log(`6/15 - Capturing MyAchievementsPage (desktop)...`);
    try {
      await loggedInDesktopPage.goto(BASE_URL + '/user/achievements', { waitUntil: 'networkidle', timeout: 20000 });
      await loggedInDesktopPage.waitForTimeout(2000);
      await loggedInDesktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '05-desktop-my-achievements.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 05-desktop-my-achievements.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture MyAchievementsPage: ${error.message}`);
    }

    // Notification Bell Desktop
    console.log(`7/15 - Capturing NotificationBell (desktop)...`);
    try {
      await loggedInDesktopPage.goto(BASE_URL + '/user/dashboard', { waitUntil: 'networkidle' });
      await loggedInDesktopPage.waitForTimeout(1000);

      // Click notification bell
      const bellButton = await loggedInDesktopPage.$('.notification-bell, button[aria-label*="otification"]');
      if (bellButton) {
        await bellButton.click();
        await loggedInDesktopPage.waitForTimeout(1000);
        await loggedInDesktopPage.screenshot({
          path: path.join(OUTPUT_DIR, '06-desktop-notification-bell-open.png'),
          fullPage: false
        });
        console.log(`✅ Saved: 06-desktop-notification-bell-open.png`);
      } else {
        console.log(`⚠️  Notification bell not found`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture NotificationBell: ${error.message}`);
    }

    // User Menu Desktop
    console.log(`8/15 - Capturing User Menu (desktop)...`);
    try {
      // Click user menu button
      const userMenuButton = await loggedInDesktopPage.$('.user-menu, button[aria-label*="ser menu"], .avatar-button');
      if (userMenuButton) {
        await userMenuButton.click();
        await loggedInDesktopPage.waitForTimeout(500);
        await loggedInDesktopPage.screenshot({
          path: path.join(OUTPUT_DIR, '07-desktop-user-menu-open.png'),
          fullPage: false
        });
        console.log(`✅ Saved: 07-desktop-user-menu-open.png`);
      } else {
        console.log(`⚠️  User menu button not found`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture User Menu: ${error.message}`);
    }

    await loggedInDesktopContext.close();

    // ===================================================================
    // 3. MOBILE: Logged In User Pages
    // ===================================================================
    console.log(`\n📱 MOBILE - Logged In User Pages\n`);

    const loggedInMobileContext = await browser.newContext({
      viewport: VIEWPORTS.mobile,
      deviceScaleFactor: 2
    });
    const loggedInMobilePage = await loggedInMobileContext.newPage();

    // Login on mobile
    console.log(`9/15 - Logging in as user (mobile)...`);
    await loggedInMobilePage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await loggedInMobilePage.waitForTimeout(1000);

    try {
      // Mobile login
      const loginButton = await loggedInMobilePage.waitForSelector('button:has-text("Login"), a[href*="login"]', { timeout: 5000 });
      await loginButton.click();
      await loggedInMobilePage.waitForTimeout(1000);

      await loggedInMobilePage.fill('input[name="email"], input[type="email"]', USER_CREDENTIALS.email);
      await loggedInMobilePage.fill('input[name="password"], input[type="password"]', USER_CREDENTIALS.password);

      const submitButton = await loggedInMobilePage.$('button[type="submit"]:has-text("Login"), button:has-text("Sign In")');
      if (submitButton) {
        await submitButton.click();
        await loggedInMobilePage.waitForTimeout(3000);
        console.log(`✅ Logged in successfully (mobile)`);
      }
    } catch (error) {
      console.log(`⚠️  Mobile login failed: ${error.message}`);
    }

    // UserDashboard Mobile
    console.log(`10/15 - Capturing UserDashboard (mobile)...`);
    try {
      await loggedInMobilePage.goto(BASE_URL + '/user/dashboard', { waitUntil: 'networkidle', timeout: 20000 });
      await loggedInMobilePage.waitForTimeout(2000);
      await loggedInMobilePage.screenshot({
        path: path.join(OUTPUT_DIR, '08-mobile-user-dashboard.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 08-mobile-user-dashboard.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture UserDashboard (mobile): ${error.message}`);
    }

    // MyAchievementsPage Mobile
    console.log(`11/15 - Capturing MyAchievementsPage (mobile)...`);
    try {
      await loggedInMobilePage.goto(BASE_URL + '/user/achievements', { waitUntil: 'networkidle', timeout: 20000 });
      await loggedInMobilePage.waitForTimeout(2000);
      await loggedInMobilePage.screenshot({
        path: path.join(OUTPUT_DIR, '09-mobile-my-achievements.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 09-mobile-my-achievements.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture MyAchievementsPage (mobile): ${error.message}`);
    }

    // NotificationBell Mobile
    console.log(`12/15 - Capturing NotificationBell (mobile)...`);
    try {
      await loggedInMobilePage.goto(BASE_URL + '/user/dashboard', { waitUntil: 'networkidle' });
      await loggedInMobilePage.waitForTimeout(1000);

      const bellButton = await loggedInMobilePage.$('.notification-bell, button[aria-label*="otification"]');
      if (bellButton) {
        await bellButton.click();
        await loggedInMobilePage.waitForTimeout(1000);
        await loggedInMobilePage.screenshot({
          path: path.join(OUTPUT_DIR, '10-mobile-notification-bell-open.png'),
          fullPage: true
        });
        console.log(`✅ Saved: 10-mobile-notification-bell-open.png`);
      } else {
        console.log(`⚠️  Notification bell not found (mobile)`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture NotificationBell (mobile): ${error.message}`);
    }

    // Hamburger Menu Mobile
    console.log(`13/15 - Capturing Hamburger Menu (mobile)...`);
    try {
      // Click hamburger menu
      const hamburgerButton = await loggedInMobilePage.$('.hamburger-menu, button[aria-label*="enu"], .mobile-menu-button');
      if (hamburgerButton) {
        await hamburgerButton.click();
        await loggedInMobilePage.waitForTimeout(500);
        await loggedInMobilePage.screenshot({
          path: path.join(OUTPUT_DIR, '11-mobile-hamburger-menu-open.png'),
          fullPage: true
        });
        console.log(`✅ Saved: 11-mobile-hamburger-menu-open.png`);
      } else {
        console.log(`⚠️  Hamburger menu not found (mobile)`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture Hamburger Menu (mobile): ${error.message}`);
    }

    await loggedInMobileContext.close();

    // ===================================================================
    // 4. FAVORITES & INTERACTIONS
    // ===================================================================
    console.log(`\n📱 INTERACTIONS - Favorites & Settings\n`);

    const interactionsContext = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      deviceScaleFactor: 2
    });
    const interactionsPage = await interactionsContext.newPage();

    // Login
    console.log(`14/15 - Setting up for interactions...`);
    await interactionsPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await interactionsPage.waitForTimeout(1000);

    try {
      const loginButton = await interactionsPage.waitForSelector('button:has-text("Login")', { timeout: 5000 });
      await loginButton.click();
      await interactionsPage.waitForTimeout(1000);
      await interactionsPage.fill('input[name="email"]', USER_CREDENTIALS.email);
      await interactionsPage.fill('input[name="password"]', USER_CREDENTIALS.password);
      const submitButton = await interactionsPage.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await interactionsPage.waitForTimeout(3000);
      }
    } catch (error) {
      console.log(`⚠️  Interactions login failed: ${error.message}`);
    }

    // Navigate to search page and click favorite
    console.log(`15/15 - Capturing Favorite interaction...`);
    try {
      await interactionsPage.goto(BASE_URL + '/search', { waitUntil: 'networkidle', timeout: 20000 });
      await interactionsPage.waitForTimeout(2000);

      // Find and click favorite button
      const favoriteButton = await interactionsPage.$('.favorite-button, button[aria-label*="avorite"]');
      if (favoriteButton) {
        await favoriteButton.click();
        await interactionsPage.waitForTimeout(1000);
        await interactionsPage.screenshot({
          path: path.join(OUTPUT_DIR, '12-desktop-favorite-interaction.png'),
          fullPage: false
        });
        console.log(`✅ Saved: 12-desktop-favorite-interaction.png`);
      } else {
        console.log(`⚠️  Favorite button not found`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture Favorite interaction: ${error.message}`);
    }

    await interactionsContext.close();

    console.log(`\n✅ Phase 2 Screenshot Capture Complete!`);
    console.log(`📂 Output directory: ${OUTPUT_DIR}`);
    console.log(`📸 Screenshots captured: Check ${OUTPUT_DIR}/ for all files\n`);

  } catch (error) {
    console.error(`❌ Fatal error:`, error);
  } finally {
    await browser.close();
  }
}

// Run script
capturePhase2Screenshots();
