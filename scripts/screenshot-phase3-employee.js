/**
 * SCREENSHOT AUTOMATION - Phase 3: Employee Pages
 *
 * Capture screenshots pour audit CSS Phase 3
 * Pages: EmployeeDashboard, EmployeeProfileWizard (5 steps), EmployeeSettings
 *
 * Usage: node scripts/screenshot-phase3-employee.js
 *
 * Credentials: clam1 / Claim123!
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = 'audit-css-screenshots/3-employee';
const EMPLOYEE_CREDENTIALS = {
  email: 'clam1@gmail.com',
  password: 'Claim123!'
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

async function loginAsEmployee(page) {
  console.log(`🔐 Logging in as employee (${EMPLOYEE_CREDENTIALS.email})...`);

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  try {
    // Try to find and click login button
    const loginSelectors = [
      'button:has-text("Login")',
      'a:has-text("Login")',
      '.auth-button:has-text("Login")'
    ];

    let loginButton = null;
    for (const selector of loginSelectors) {
      try {
        loginButton = await page.waitForSelector(selector, { timeout: 3000 });
        if (loginButton) break;
      } catch (e) {
        // Try next selector
      }
    }

    if (!loginButton) {
      // Try hamburger menu on mobile
      const hamburger = await page.$('.hamburger-menu, .mobile-menu-button, button[aria-label*="enu"]');
      if (hamburger) {
        await hamburger.click();
        await page.waitForTimeout(500);
        loginButton = await page.$('button:has-text("Login"), a:has-text("Login")');
      }
    }

    if (loginButton) {
      await loginButton.click();
      await page.waitForTimeout(1000);

      // Fill login form
      await page.fill('input[name="email"], input[type="email"]', EMPLOYEE_CREDENTIALS.email);
      await page.fill('input[name="password"], input[type="password"]', EMPLOYEE_CREDENTIALS.password);

      // Submit
      const submitButton = await page.$('button[type="submit"]:has-text("Login"), button:has-text("Sign In")');
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(3000); // Wait for auth redirect
        console.log(`✅ Logged in successfully as employee`);
        return true;
      }
    }

    console.log(`⚠️  Could not complete login`);
    return false;
  } catch (error) {
    console.log(`⚠️  Login failed: ${error.message}`);
    return false;
  }
}

async function capturePhase3Screenshots() {
  console.log(`\n🚀 Phase 3: Employee Pages Screenshot Capture\n`);
  console.log(`📸 Target: 12 screenshots`);
  console.log(`👤 Employee: ${EMPLOYEE_CREDENTIALS.email}\n`);

  const browser = await chromium.launch({
    headless: true
  });

  try {
    // ===================================================================
    // 1. DESKTOP: Employee Pages
    // ===================================================================
    console.log(`\n📱 DESKTOP - Employee Pages\n`);

    const desktopContext = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      deviceScaleFactor: 2
    });
    const desktopPage = await desktopContext.newPage();

    // Login
    const loginSuccess = await loginAsEmployee(desktopPage);

    if (!loginSuccess) {
      console.log(`⚠️  Skipping authenticated screenshots (login failed)`);
    }

    // EmployeeDashboard Desktop
    console.log(`1/12 - Capturing EmployeeDashboard (desktop)...`);
    try {
      await desktopPage.goto(BASE_URL + '/employee/dashboard', { waitUntil: 'networkidle', timeout: 20000 });
      await desktopPage.waitForTimeout(2000);
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '01-desktop-employee-dashboard.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 01-desktop-employee-dashboard.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture EmployeeDashboard: ${error.message}`);
    }

    // EmployeeProfileWizard - Step 1
    console.log(`2/12 - Capturing EmployeeProfileWizard Step 1 (desktop)...`);
    try {
      await desktopPage.goto(BASE_URL + '/employee/profile-wizard', { waitUntil: 'networkidle', timeout: 20000 });
      await desktopPage.waitForTimeout(2000);
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '02-desktop-profile-wizard-step1.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 02-desktop-profile-wizard-step1.png`);

      // Try to navigate to next steps
      for (let step = 2; step <= 5; step++) {
        console.log(`${step + 1}/12 - Capturing EmployeeProfileWizard Step ${step} (desktop)...`);
        try {
          const nextButton = await desktopPage.$('button:has-text("Next"), button:has-text("Continue")');
          if (nextButton) {
            await nextButton.click();
            await desktopPage.waitForTimeout(1500);
            await desktopPage.screenshot({
              path: path.join(OUTPUT_DIR, `0${step + 1}-desktop-profile-wizard-step${step}.png`),
              fullPage: true
            });
            console.log(`✅ Saved: 0${step + 1}-desktop-profile-wizard-step${step}.png`);
          } else {
            console.log(`⚠️  Next button not found for step ${step}`);
            break;
          }
        } catch (error) {
          console.log(`⚠️  Could not capture Step ${step}: ${error.message}`);
          break;
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not capture ProfileWizard: ${error.message}`);
    }

    // EmployeeSettings Desktop
    console.log(`7/12 - Capturing EmployeeSettings (desktop)...`);
    try {
      await desktopPage.goto(BASE_URL + '/employee/settings', { waitUntil: 'networkidle', timeout: 20000 });
      await desktopPage.waitForTimeout(2000);
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '07-desktop-employee-settings.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 07-desktop-employee-settings.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture EmployeeSettings: ${error.message}`);
    }

    await desktopContext.close();

    // ===================================================================
    // 2. MOBILE: Employee Pages
    // ===================================================================
    console.log(`\n📱 MOBILE - Employee Pages\n`);

    const mobileContext = await browser.newContext({
      viewport: VIEWPORTS.mobile,
      deviceScaleFactor: 2
    });
    const mobilePage = await mobileContext.newPage();

    // Login on mobile
    const mobileLoginSuccess = await loginAsEmployee(mobilePage);

    // EmployeeDashboard Mobile
    console.log(`8/12 - Capturing EmployeeDashboard (mobile)...`);
    try {
      await mobilePage.goto(BASE_URL + '/employee/dashboard', { waitUntil: 'networkidle', timeout: 20000 });
      await mobilePage.waitForTimeout(2000);
      await mobilePage.screenshot({
        path: path.join(OUTPUT_DIR, '08-mobile-employee-dashboard.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 08-mobile-employee-dashboard.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture EmployeeDashboard (mobile): ${error.message}`);
    }

    // EmployeeProfileWizard Mobile - Step 1
    console.log(`9/12 - Capturing EmployeeProfileWizard Step 1 (mobile)...`);
    try {
      await mobilePage.goto(BASE_URL + '/employee/profile-wizard', { waitUntil: 'networkidle', timeout: 20000 });
      await mobilePage.waitForTimeout(2000);
      await mobilePage.screenshot({
        path: path.join(OUTPUT_DIR, '09-mobile-profile-wizard-step1.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 09-mobile-profile-wizard-step1.png`);

      // Navigate to Step 2 and Step 3 for mobile
      for (let step = 2; step <= 3; step++) {
        console.log(`${step + 8}/12 - Capturing EmployeeProfileWizard Step ${step} (mobile)...`);
        try {
          const nextButton = await mobilePage.$('button:has-text("Next"), button:has-text("Continue")');
          if (nextButton) {
            await nextButton.click();
            await mobilePage.waitForTimeout(1500);
            await mobilePage.screenshot({
              path: path.join(OUTPUT_DIR, `${step + 8 < 10 ? '0' : ''}${step + 8}-mobile-profile-wizard-step${step}.png`),
              fullPage: true
            });
            console.log(`✅ Saved: ${step + 8 < 10 ? '0' : ''}${step + 8}-mobile-profile-wizard-step${step}.png`);
          } else {
            console.log(`⚠️  Next button not found for step ${step} (mobile)`);
            break;
          }
        } catch (error) {
          console.log(`⚠️  Could not capture Step ${step} (mobile): ${error.message}`);
          break;
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not capture ProfileWizard (mobile): ${error.message}`);
    }

    // EmployeeSettings Mobile
    console.log(`12/12 - Capturing EmployeeSettings (mobile)...`);
    try {
      await mobilePage.goto(BASE_URL + '/employee/settings', { waitUntil: 'networkidle', timeout: 20000 });
      await mobilePage.waitForTimeout(2000);
      await mobilePage.screenshot({
        path: path.join(OUTPUT_DIR, '12-mobile-employee-settings.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 12-mobile-employee-settings.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture EmployeeSettings (mobile): ${error.message}`);
    }

    await mobileContext.close();

    console.log(`\n✅ Phase 3 Screenshot Capture Complete!`);
    console.log(`📂 Output directory: ${OUTPUT_DIR}`);
    console.log(`📸 Screenshots captured: Check ${OUTPUT_DIR}/ for all files\n`);

  } catch (error) {
    console.error(`❌ Fatal error:`, error);
  } finally {
    await browser.close();
  }
}

// Run script
capturePhase3Screenshots();
