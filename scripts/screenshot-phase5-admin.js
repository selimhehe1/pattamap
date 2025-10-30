/**
 * SCREENSHOT AUTOMATION - Phase 5: Admin Pages
 *
 * Capture screenshots pour audit CSS Phase 5
 * Pages: AdminPanel (8 tabs), Admin modals, Audit logs
 *
 * Usage: node scripts/screenshot-phase5-admin.js
 *
 * Credentials: admin2 / admin123!
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = 'audit-css-screenshots/5-admin';
const ADMIN_CREDENTIALS = {
  email: 'admin2@gmail.com',
  password: 'admin123!'
};

// Viewports
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  mobile: { width: 375, height: 812 }
};

// Admin tabs
const ADMIN_TABS = [
  'Dashboard',
  'Users',
  'Employees',
  'Establishments',
  'Reviews',
  'Ownership',
  'Audit Logs',
  'Statistics'
];

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`📁 Created directory: ${OUTPUT_DIR}`);
}

async function loginAsAdmin(page) {
  console.log(`🔐 Logging in as admin (${ADMIN_CREDENTIALS.email})...`);

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  try {
    const loginButton = await page.waitForSelector('button:has-text("Login"), a:has-text("Login")', { timeout: 3000 });
    if (loginButton) {
      await loginButton.click();
      await page.waitForTimeout(1000);

      await page.fill('input[name="email"], input[type="email"]', ADMIN_CREDENTIALS.email);
      await page.fill('input[name="password"], input[type="password"]', ADMIN_CREDENTIALS.password);

      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(3000);
        console.log(`✅ Logged in successfully as admin`);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.log(`⚠️  Login failed: ${error.message}`);
    return false;
  }
}

async function capturePhase5Screenshots() {
  console.log(`\n🚀 Phase 5: Admin Pages Screenshot Capture\n`);
  console.log(`📸 Target: 25 screenshots`);
  console.log(`👤 Admin: ${ADMIN_CREDENTIALS.email}\n`);

  const browser = await chromium.launch({
    headless: true
  });

  try {
    // ===================================================================
    // 1. DESKTOP: Admin Panel Tabs
    // ===================================================================
    console.log(`\n📱 DESKTOP - Admin Panel Tabs\n`);

    const desktopContext = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      deviceScaleFactor: 2
    });
    const desktopPage = await desktopContext.newPage();

    await loginAsAdmin(desktopPage);

    // Navigate to admin panel
    console.log(`Navigating to admin panel...`);
    try {
      await desktopPage.goto(BASE_URL + '/admin', { waitUntil: 'networkidle', timeout: 20000 });
      await desktopPage.waitForTimeout(2000);
    } catch (error) {
      console.log(`⚠️  Could not navigate to admin panel: ${error.message}`);
    }

    // Capture each tab (Desktop)
    for (let i = 0; i < ADMIN_TABS.length; i++) {
      const tabName = ADMIN_TABS[i];
      const screenshotNum = i + 1;

      console.log(`${screenshotNum}/25 - Capturing Admin Tab: ${tabName} (desktop)...`);

      try {
        // Click tab
        const tabSelector = `button:has-text("${tabName}"), a:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`;
        const tab = await desktopPage.$(tabSelector);

        if (tab) {
          await tab.click();
          await desktopPage.waitForTimeout(1500);

          const filename = `${screenshotNum < 10 ? '0' : ''}${screenshotNum}-desktop-admin-${tabName.toLowerCase().replace(/ /g, '-')}.png`;
          await desktopPage.screenshot({
            path: path.join(OUTPUT_DIR, filename),
            fullPage: true
          });
          console.log(`✅ Saved: ${filename}`);
        } else {
          console.log(`⚠️  Tab "${tabName}" not found`);
        }
      } catch (error) {
        console.log(`⚠️  Could not capture ${tabName} tab: ${error.message}`);
      }
    }

    // Admin Modals (Desktop) - starting from screenshot 9
    console.log(`\n📱 DESKTOP - Admin Modals\n`);

    // Try to open Create User Modal
    console.log(`9/25 - Capturing Create User Modal (desktop)...`);
    try {
      // Go to Users tab first
      const usersTab = await desktopPage.$('button:has-text("Users")');
      if (usersTab) {
        await usersTab.click();
        await desktopPage.waitForTimeout(1000);

        const createButton = await desktopPage.$('button:has-text("Create"), button:has-text("Add User")');
        if (createButton) {
          await createButton.click();
          await desktopPage.waitForTimeout(1000);
          await desktopPage.screenshot({
            path: path.join(OUTPUT_DIR, '09-desktop-admin-create-user-modal.png'),
            fullPage: false
          });
          console.log(`✅ Saved: 09-desktop-admin-create-user-modal.png`);

          const closeButton = await desktopPage.$('button[aria-label*="lose"]');
          if (closeButton) await closeButton.click();
        }
      }
    } catch (error) {
      console.log(`⚠️  Could not capture Create User Modal: ${error.message}`);
    }

    // Audit Logs Detailed
    console.log(`10/25 - Capturing Audit Logs Detailed (desktop)...`);
    try {
      const auditTab = await desktopPage.$('button:has-text("Audit Logs")');
      if (auditTab) {
        await auditTab.click();
        await desktopPage.waitForTimeout(1500);

        // Scroll to see more logs
        await desktopPage.evaluate(() => window.scrollBy(0, 500));
        await desktopPage.waitForTimeout(500);

        await desktopPage.screenshot({
          path: path.join(OUTPUT_DIR, '10-desktop-admin-audit-logs-detailed.png'),
          fullPage: true
        });
        console.log(`✅ Saved: 10-desktop-admin-audit-logs-detailed.png`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture Audit Logs: ${error.message}`);
    }

    await desktopContext.close();

    // ===================================================================
    // 2. MOBILE: Admin Panel Tabs
    // ===================================================================
    console.log(`\n📱 MOBILE - Admin Panel Tabs\n`);

    const mobileContext = await browser.newContext({
      viewport: VIEWPORTS.mobile,
      deviceScaleFactor: 2
    });
    const mobilePage = await mobileContext.newPage();

    await loginAsAdmin(mobilePage);

    // Navigate to admin panel
    try {
      await mobilePage.goto(BASE_URL + '/admin', { waitUntil: 'networkidle', timeout: 20000 });
      await mobilePage.waitForTimeout(2000);
    } catch (error) {
      console.log(`⚠️  Could not navigate to admin panel (mobile): ${error.message}`);
    }

    // Capture key tabs on mobile (not all 8 to save time)
    const mobileTabs = ['Dashboard', 'Users', 'Employees', 'Establishments', 'Reviews', 'Audit Logs'];

    for (let i = 0; i < mobileTabs.length; i++) {
      const tabName = mobileTabs[i];
      const screenshotNum = 11 + i;

      console.log(`${screenshotNum}/25 - Capturing Admin Tab: ${tabName} (mobile)...`);

      try {
        const tab = await mobilePage.$(`button:has-text("${tabName}"), [role="tab"]:has-text("${tabName}")`);

        if (tab) {
          await tab.click();
          await mobilePage.waitForTimeout(1500);

          const filename = `${screenshotNum}-mobile-admin-${tabName.toLowerCase().replace(/ /g, '-')}.png`;
          await mobilePage.screenshot({
            path: path.join(OUTPUT_DIR, filename),
            fullPage: true
          });
          console.log(`✅ Saved: ${filename}`);
        } else {
          console.log(`⚠️  Tab "${tabName}" not found (mobile)`);
        }
      } catch (error) {
        console.log(`⚠️  Could not capture ${tabName} tab (mobile): ${error.message}`);
      }
    }

    // Admin Stats Dashboard Mobile
    console.log(`17/25 - Capturing Admin Stats Dashboard (mobile)...`);
    try {
      const dashboardTab = await mobilePage.$('button:has-text("Dashboard")');
      if (dashboardTab) {
        await dashboardTab.click();
        await mobilePage.waitForTimeout(1500);
        await mobilePage.screenshot({
          path: path.join(OUTPUT_DIR, '17-mobile-admin-stats-dashboard.png'),
          fullPage: true
        });
        console.log(`✅ Saved: 17-mobile-admin-stats-dashboard.png`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture stats dashboard: ${error.message}`);
    }

    await mobileContext.close();

    console.log(`\n✅ Phase 5 Screenshot Capture Complete!`);
    console.log(`📂 Output directory: ${OUTPUT_DIR}\n`);

  } catch (error) {
    console.error(`❌ Fatal error:`, error);
  } finally {
    await browser.close();
  }
}

// Run script
capturePhase5Screenshots();
