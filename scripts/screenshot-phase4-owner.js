/**
 * SCREENSHOT AUTOMATION - Phase 4: Owner Pages
 *
 * Capture screenshots pour audit CSS Phase 4
 * Pages: MyEstablishmentsPage, MyOwnershipRequests, EstablishmentEditModal
 *
 * Usage: node scripts/screenshot-phase4-owner.js
 *
 * Credentials: owner / Owner123!
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = 'audit-css-screenshots/4-owner';
const OWNER_CREDENTIALS = {
  email: 'owner@gmail.com',
  password: 'Owner123!'
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

async function loginAsOwner(page) {
  console.log(`🔐 Logging in as owner (${OWNER_CREDENTIALS.email})...`);

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);

  try {
    const loginSelectors = [
      'button:has-text("Login")',
      'a:has-text("Login")'
    ];

    let loginButton = null;
    for (const selector of loginSelectors) {
      try {
        loginButton = await page.waitForSelector(selector, { timeout: 3000 });
        if (loginButton) break;
      } catch (e) {
        // Try next
      }
    }

    if (!loginButton) {
      const hamburger = await page.$('.hamburger-menu, .mobile-menu-button');
      if (hamburger) {
        await hamburger.click();
        await page.waitForTimeout(500);
        loginButton = await page.$('button:has-text("Login")');
      }
    }

    if (loginButton) {
      await loginButton.click();
      await page.waitForTimeout(1000);

      await page.fill('input[name="email"], input[type="email"]', OWNER_CREDENTIALS.email);
      await page.fill('input[name="password"], input[type="password"]', OWNER_CREDENTIALS.password);

      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(3000);
        console.log(`✅ Logged in successfully as owner`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.log(`⚠️  Login failed: ${error.message}`);
    return false;
  }
}

async function capturePhase4Screenshots() {
  console.log(`\n🚀 Phase 4: Owner Pages Screenshot Capture\n`);
  console.log(`📸 Target: 10 screenshots`);
  console.log(`👤 Owner: ${OWNER_CREDENTIALS.email}\n`);

  const browser = await chromium.launch({
    headless: true
  });

  try {
    // ===================================================================
    // 1. DESKTOP: Owner Pages
    // ===================================================================
    console.log(`\n📱 DESKTOP - Owner Pages\n`);

    const desktopContext = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      deviceScaleFactor: 2
    });
    const desktopPage = await desktopContext.newPage();

    await loginAsOwner(desktopPage);

    // MyEstablishmentsPage Desktop
    console.log(`1/10 - Capturing MyEstablishmentsPage (desktop)...`);
    try {
      await desktopPage.goto(BASE_URL + '/my-establishments', { waitUntil: 'networkidle', timeout: 20000 });
      await desktopPage.waitForTimeout(2000);
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '01-desktop-my-establishments.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 01-desktop-my-establishments.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture MyEstablishmentsPage: ${error.message}`);
    }

    // MyEstablishments Stats Cards Desktop
    console.log(`2/10 - Capturing MyEstablishments Stats (desktop)...`);
    try {
      // Same page, just focused on stats section
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '02-desktop-my-establishments-stats.png'),
        fullPage: false // Viewport only to focus on stats
      });
      console.log(`✅ Saved: 02-desktop-my-establishments-stats.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture stats: ${error.message}`);
    }

    // Try to open Edit Modal
    console.log(`3/10 - Capturing EstablishmentEditModal (desktop)...`);
    try {
      const editButton = await desktopPage.$('button:has-text("Edit"), button[aria-label*="dit"]');
      if (editButton) {
        await editButton.click();
        await desktopPage.waitForTimeout(1500);
        await desktopPage.screenshot({
          path: path.join(OUTPUT_DIR, '03-desktop-edit-establishment-modal.png'),
          fullPage: false
        });
        console.log(`✅ Saved: 03-desktop-edit-establishment-modal.png`);

        // Close modal
        const closeButton = await desktopPage.$('button[aria-label*="lose"], .modal-close');
        if (closeButton) await closeButton.click();
        await desktopPage.waitForTimeout(500);
      } else {
        console.log(`⚠️  Edit button not found`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture EditModal: ${error.message}`);
    }

    // MyOwnershipRequests Desktop
    console.log(`4/10 - Capturing MyOwnershipRequests (desktop)...`);
    try {
      await desktopPage.goto(BASE_URL + '/my-ownership-requests', { waitUntil: 'networkidle', timeout: 20000 });
      await desktopPage.waitForTimeout(2000);
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '04-desktop-my-ownership-requests.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 04-desktop-my-ownership-requests.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture MyOwnershipRequests: ${error.message}`);
    }

    // Owner Menu Dropdown Desktop
    console.log(`5/10 - Capturing Owner Menu (desktop)...`);
    try {
      await desktopPage.goto(BASE_URL + '/my-establishments', { waitUntil: 'networkidle' });
      await desktopPage.waitForTimeout(1000);

      const userMenu = await desktopPage.$('.user-menu, button[aria-label*="ser menu"]');
      if (userMenu) {
        await userMenu.click();
        await desktopPage.waitForTimeout(500);
        await desktopPage.screenshot({
          path: path.join(OUTPUT_DIR, '05-desktop-owner-menu-dropdown.png'),
          fullPage: false
        });
        console.log(`✅ Saved: 05-desktop-owner-menu-dropdown.png`);
      } else {
        console.log(`⚠️  User menu not found`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture menu: ${error.message}`);
    }

    await desktopContext.close();

    // ===================================================================
    // 2. MOBILE: Owner Pages
    // ===================================================================
    console.log(`\n📱 MOBILE - Owner Pages\n`);

    const mobileContext = await browser.newContext({
      viewport: VIEWPORTS.mobile,
      deviceScaleFactor: 2
    });
    const mobilePage = await mobileContext.newPage();

    await loginAsOwner(mobilePage);

    // MyEstablishmentsPage Mobile
    console.log(`6/10 - Capturing MyEstablishmentsPage (mobile)...`);
    try {
      await mobilePage.goto(BASE_URL + '/my-establishments', { waitUntil: 'networkidle', timeout: 20000 });
      await mobilePage.waitForTimeout(2000);
      await mobilePage.screenshot({
        path: path.join(OUTPUT_DIR, '06-mobile-my-establishments.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 06-mobile-my-establishments.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture MyEstablishmentsPage (mobile): ${error.message}`);
    }

    // MyEstablishments Stats Mobile
    console.log(`7/10 - Capturing MyEstablishments Stats (mobile)...`);
    try {
      await mobilePage.screenshot({
        path: path.join(OUTPUT_DIR, '07-mobile-my-establishments-stats.png'),
        fullPage: false
      });
      console.log(`✅ Saved: 07-mobile-my-establishments-stats.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture stats (mobile): ${error.message}`);
    }

    // EstablishmentEditModal Mobile
    console.log(`8/10 - Capturing EstablishmentEditModal (mobile)...`);
    try {
      const editButton = await mobilePage.$('button:has-text("Edit")');
      if (editButton) {
        await editButton.click();
        await mobilePage.waitForTimeout(1500);
        await mobilePage.screenshot({
          path: path.join(OUTPUT_DIR, '08-mobile-edit-establishment-modal.png'),
          fullPage: true
        });
        console.log(`✅ Saved: 08-mobile-edit-establishment-modal.png`);

        const closeButton = await mobilePage.$('button[aria-label*="lose"]');
        if (closeButton) await closeButton.click();
      }
    } catch (error) {
      console.log(`⚠️  Could not capture EditModal (mobile): ${error.message}`);
    }

    // MyOwnershipRequests Mobile
    console.log(`9/10 - Capturing MyOwnershipRequests (mobile)...`);
    try {
      await mobilePage.goto(BASE_URL + '/my-ownership-requests', { waitUntil: 'networkidle', timeout: 20000 });
      await mobilePage.waitForTimeout(2000);
      await mobilePage.screenshot({
        path: path.join(OUTPUT_DIR, '09-mobile-my-ownership-requests.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 09-mobile-my-ownership-requests.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture MyOwnershipRequests (mobile): ${error.message}`);
    }

    // Hamburger Menu Owner Mobile
    console.log(`10/10 - Capturing Hamburger Menu Owner (mobile)...`);
    try {
      const hamburger = await mobilePage.$('.hamburger-menu, .mobile-menu-button');
      if (hamburger) {
        await hamburger.click();
        await mobilePage.waitForTimeout(500);
        await mobilePage.screenshot({
          path: path.join(OUTPUT_DIR, '10-mobile-hamburger-menu-owner.png'),
          fullPage: true
        });
        console.log(`✅ Saved: 10-mobile-hamburger-menu-owner.png`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture hamburger menu: ${error.message}`);
    }

    await mobileContext.close();

    console.log(`\n✅ Phase 4 Screenshot Capture Complete!`);
    console.log(`📂 Output directory: ${OUTPUT_DIR}\n`);

  } catch (error) {
    console.error(`❌ Fatal error:`, error);
  } finally {
    await browser.close();
  }
}

// Run script
capturePhase4Screenshots();
