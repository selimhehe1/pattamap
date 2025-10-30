/**
 * SCREENSHOT AUTOMATION - Phase 7: Public Pages Detailed
 *
 * Capture screenshots pour audit CSS Phase 7
 * Pages: SearchPage (filters/sort), EmployeeProfilePage, EstablishmentPage, MapPage zones
 *
 * Usage: node scripts/screenshot-phase7-public-detailed.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = 'audit-css-screenshots/7-public-detailed';

// Viewports
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 }
};

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`📁 Created directory: ${OUTPUT_DIR}`);
}

async function capturePhase7Screenshots() {
  console.log(`\n🚀 Phase 7: Public Pages Detailed Screenshot Capture\n`);
  console.log(`📸 Target: 22 screenshots`);
  console.log(`🌐 Focus: Search filters, Profiles, Establishments, Maps\n`);

  const browser = await chromium.launch({
    headless: true
  });

  try {
    // ===================================================================
    // 1. SEARCH PAGE - Filters & States (Desktop)
    // ===================================================================
    console.log(`\n📱 SEARCH PAGE - Filters & States\n`);

    const desktopContext = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      deviceScaleFactor: 2
    });
    const desktopPage = await desktopContext.newPage();

    // SearchPage - All Results
    console.log(`1/22 - Capturing SearchPage All Results (desktop)...`);
    try {
      await desktopPage.goto(BASE_URL + '/search', { waitUntil: 'networkidle', timeout: 30000 });
      await desktopPage.waitForTimeout(2000);
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '01-desktop-search-all-results.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 01-desktop-search-all-results.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture search page: ${error.message}`);
    }

    // SearchPage - Freelance Filter
    console.log(`2/22 - Capturing SearchPage Freelance Filter (desktop)...`);
    try {
      const freelanceFilter = await desktopPage.$('button:has-text("Freelance"), input[name="freelance"]');
      if (freelanceFilter) {
        await freelanceFilter.click();
        await desktopPage.waitForTimeout(1500);
        await desktopPage.screenshot({
          path: path.join(OUTPUT_DIR, '02-desktop-search-freelance-filter.png'),
          fullPage: true
        });
        console.log(`✅ Saved: 02-desktop-search-freelance-filter.png`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture freelance filter: ${error.message}`);
    }

    // SearchPage - Regular Filter
    console.log(`3/22 - Capturing SearchPage Regular Filter (desktop)...`);
    try {
      // Reset filters first
      const resetButton = await desktopPage.$('button:has-text("Reset"), button:has-text("Clear")');
      if (resetButton) await resetButton.click();
      await desktopPage.waitForTimeout(1000);

      const regularFilter = await desktopPage.$('button:has-text("Regular"), input[name="regular"]');
      if (regularFilter) {
        await regularFilter.click();
        await desktopPage.waitForTimeout(1500);
        await desktopPage.screenshot({
          path: path.join(OUTPUT_DIR, '03-desktop-search-regular-filter.png'),
          fullPage: true
        });
        console.log(`✅ Saved: 03-desktop-search-regular-filter.png`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture regular filter: ${error.message}`);
    }

    // SearchPage - Sort by Rating
    console.log(`4/22 - Capturing SearchPage Sort by Rating (desktop)...`);
    try {
      const sortDropdown = await desktopPage.$('select[name="sort"], button:has-text("Sort")');
      if (sortDropdown) {
        await sortDropdown.click();
        await desktopPage.waitForTimeout(500);

        // Try to select rating option
        const ratingOption = await desktopPage.$('option[value="rating"], button:has-text("Rating")');
        if (ratingOption) await ratingOption.click();

        await desktopPage.waitForTimeout(1500);
        await desktopPage.screenshot({
          path: path.join(OUTPUT_DIR, '04-desktop-search-sort-rating.png'),
          fullPage: true
        });
        console.log(`✅ Saved: 04-desktop-search-sort-rating.png`);
      }
    } catch (error) {
      console.log(`⚠️  Could not capture sort: ${error.message}`);
    }

    // SearchPage - Pagination
    console.log(`5/22 - Capturing SearchPage Pagination (desktop)...`);
    try {
      // Scroll to bottom where pagination usually is
      await desktopPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await desktopPage.waitForTimeout(1000);

      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '05-desktop-search-pagination.png'),
        fullPage: false // Just viewport to focus on pagination
      });
      console.log(`✅ Saved: 05-desktop-search-pagination.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture pagination: ${error.message}`);
    }

    // SearchPage - Mobile
    console.log(`6/22 - Capturing SearchPage (mobile)...`);
    const mobileContext = await browser.newContext({
      viewport: VIEWPORTS.mobile,
      deviceScaleFactor: 2
    });
    const mobilePage = await mobileContext.newPage();

    try {
      await mobilePage.goto(BASE_URL + '/search', { waitUntil: 'networkidle', timeout: 30000 });
      await mobilePage.waitForTimeout(2000);
      await mobilePage.screenshot({
        path: path.join(OUTPUT_DIR, '06-mobile-search-all-results.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 06-mobile-search-all-results.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture search (mobile): ${error.message}`);
    }

    await mobileContext.close();

    // ===================================================================
    // 2. EMPLOYEE PROFILE PAGE (Desktop/Tablet/Mobile)
    // ===================================================================
    console.log(`\n📱 EMPLOYEE PROFILE PAGE - Responsive\n`);

    // Desktop
    console.log(`7/22 - Capturing EmployeeProfilePage (desktop)...`);
    try {
      // Navigate to first employee profile (assuming ID 1 exists)
      await desktopPage.goto(BASE_URL + '/employee/profile/1', { waitUntil: 'networkidle', timeout: 30000 });
      await desktopPage.waitForTimeout(2000);
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '07-desktop-employee-profile.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 07-desktop-employee-profile.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture employee profile: ${error.message}`);
    }

    // Employee Profile - With Reviews Section
    console.log(`8/22 - Capturing EmployeeProfile Reviews Section (desktop)...`);
    try {
      // Scroll to reviews section
      await desktopPage.evaluate(() => {
        const reviewsSection = document.querySelector('.reviews-section, #reviews, [id*="review"]');
        if (reviewsSection) reviewsSection.scrollIntoView();
      });
      await desktopPage.waitForTimeout(1000);

      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '08-desktop-employee-profile-reviews.png'),
        fullPage: false
      });
      console.log(`✅ Saved: 08-desktop-employee-profile-reviews.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture reviews section: ${error.message}`);
    }

    // Tablet
    console.log(`9/22 - Capturing EmployeeProfilePage (tablet)...`);
    const tabletContext = await browser.newContext({
      viewport: VIEWPORTS.tablet,
      deviceScaleFactor: 2
    });
    const tabletPage = await tabletContext.newPage();

    try {
      await tabletPage.goto(BASE_URL + '/employee/profile/1', { waitUntil: 'networkidle', timeout: 30000 });
      await tabletPage.waitForTimeout(2000);
      await tabletPage.screenshot({
        path: path.join(OUTPUT_DIR, '09-tablet-employee-profile.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 09-tablet-employee-profile.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture employee profile (tablet): ${error.message}`);
    }

    await tabletContext.close();

    // Mobile
    console.log(`10/22 - Capturing EmployeeProfilePage (mobile)...`);
    const mobileProfileContext = await browser.newContext({
      viewport: VIEWPORTS.mobile,
      deviceScaleFactor: 2
    });
    const mobileProfilePage = await mobileProfileContext.newPage();

    try {
      await mobileProfilePage.goto(BASE_URL + '/employee/profile/1', { waitUntil: 'networkidle', timeout: 30000 });
      await mobileProfilePage.waitForTimeout(2000);
      await mobileProfilePage.screenshot({
        path: path.join(OUTPUT_DIR, '10-mobile-employee-profile.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 10-mobile-employee-profile.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture employee profile (mobile): ${error.message}`);
    }

    await mobileProfileContext.close();

    // ===================================================================
    // 3. ESTABLISHMENT PAGE (Desktop/Mobile)
    // ===================================================================
    console.log(`\n📱 ESTABLISHMENT PAGE - Responsive\n`);

    // Desktop
    console.log(`11/22 - Capturing EstablishmentPage (desktop)...`);
    try {
      await desktopPage.goto(BASE_URL + '/establishment/1', { waitUntil: 'networkidle', timeout: 30000 });
      await desktopPage.waitForTimeout(2000);
      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '11-desktop-establishment-page.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 11-desktop-establishment-page.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture establishment page: ${error.message}`);
    }

    // Establishment - Photos Gallery
    console.log(`12/22 - Capturing Establishment Photos (desktop)...`);
    try {
      // Scroll to photos section
      await desktopPage.evaluate(() => {
        const photosSection = document.querySelector('.photos-gallery, .establishment-photos, [class*="photo"]');
        if (photosSection) photosSection.scrollIntoView();
      });
      await desktopPage.waitForTimeout(1000);

      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, '12-desktop-establishment-photos.png'),
        fullPage: false
      });
      console.log(`✅ Saved: 12-desktop-establishment-photos.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture photos gallery: ${error.message}`);
    }

    // Mobile
    console.log(`13/22 - Capturing EstablishmentPage (mobile)...`);
    const mobileEstabContext = await browser.newContext({
      viewport: VIEWPORTS.mobile,
      deviceScaleFactor: 2
    });
    const mobileEstabPage = await mobileEstabContext.newPage();

    try {
      await mobileEstabPage.goto(BASE_URL + '/establishment/1', { waitUntil: 'networkidle', timeout: 30000 });
      await mobileEstabPage.waitForTimeout(2000);
      await mobileEstabPage.screenshot({
        path: path.join(OUTPUT_DIR, '13-mobile-establishment-page.png'),
        fullPage: true
      });
      console.log(`✅ Saved: 13-mobile-establishment-page.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture establishment page (mobile): ${error.message}`);
    }

    await mobileEstabContext.close();

    // ===================================================================
    // 4. MAP PAGES - Different Zones (Desktop/Mobile)
    // ===================================================================
    console.log(`\n📱 MAP PAGES - Zones\n`);

    const zones = [
      { name: 'Soi 6', path: '/map/soi-6' },
      { name: 'Walking Street', path: '/map/walking-street' },
      { name: 'LK Metro', path: '/map/lk-metro' }
    ];

    let screenshotNum = 14;

    for (const zone of zones) {
      // Desktop
      console.log(`${screenshotNum}/22 - Capturing MapPage ${zone.name} (desktop)...`);
      try {
        await desktopPage.goto(BASE_URL + zone.path, { waitUntil: 'networkidle', timeout: 30000 });
        await desktopPage.waitForTimeout(2000);

        const filename = `${screenshotNum}-desktop-map-${zone.name.toLowerCase().replace(/ /g, '-')}.png`;
        await desktopPage.screenshot({
          path: path.join(OUTPUT_DIR, filename),
          fullPage: true
        });
        console.log(`✅ Saved: ${filename}`);
        screenshotNum++;
      } catch (error) {
        console.log(`⚠️  Could not capture ${zone.name} map: ${error.message}`);
        screenshotNum++;
      }

      // Mobile
      console.log(`${screenshotNum}/22 - Capturing MapPage ${zone.name} (mobile)...`);
      const mobileMapContext = await browser.newContext({
        viewport: VIEWPORTS.mobile,
        deviceScaleFactor: 2
      });
      const mobileMapPage = await mobileMapContext.newPage();

      try {
        await mobileMapPage.goto(BASE_URL + zone.path, { waitUntil: 'networkidle', timeout: 30000 });
        await mobileMapPage.waitForTimeout(2000);

        const filename = `${screenshotNum}-mobile-map-${zone.name.toLowerCase().replace(/ /g, '-')}.png`;
        await mobileMapPage.screenshot({
          path: path.join(OUTPUT_DIR, filename),
          fullPage: true
        });
        console.log(`✅ Saved: ${filename}`);
        screenshotNum++;
      } catch (error) {
        console.log(`⚠️  Could not capture ${zone.name} map (mobile): ${error.message}`);
        screenshotNum++;
      }

      await mobileMapContext.close();
    }

    // ===================================================================
    // 5. HOMEPAGE SECTIONS
    // ===================================================================
    console.log(`\n📱 HOMEPAGE - Sections\n`);

    // Homepage Hero
    console.log(`${screenshotNum}/22 - Capturing Homepage Hero (desktop)...`);
    try {
      await desktopPage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await desktopPage.waitForTimeout(2000);

      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, `${screenshotNum}-desktop-homepage-hero.png`),
        fullPage: false // Just hero section
      });
      console.log(`✅ Saved: ${screenshotNum}-desktop-homepage-hero.png`);
      screenshotNum++;
    } catch (error) {
      console.log(`⚠️  Could not capture homepage hero: ${error.message}`);
      screenshotNum++;
    }

    // Homepage Features Section
    console.log(`${screenshotNum}/22 - Capturing Homepage Features (desktop)...`);
    try {
      // Scroll to features section
      await desktopPage.evaluate(() => window.scrollBy(0, 800));
      await desktopPage.waitForTimeout(1000);

      await desktopPage.screenshot({
        path: path.join(OUTPUT_DIR, `${screenshotNum}-desktop-homepage-features.png`),
        fullPage: false
      });
      console.log(`✅ Saved: ${screenshotNum}-desktop-homepage-features.png`);
    } catch (error) {
      console.log(`⚠️  Could not capture homepage features: ${error.message}`);
    }

    await desktopContext.close();

    console.log(`\n✅ Phase 7 Screenshot Capture Complete!`);
    console.log(`📂 Output directory: ${OUTPUT_DIR}\n`);

  } catch (error) {
    console.error(`❌ Fatal error:`, error);
  } finally {
    await browser.close();
  }
}

// Run script
capturePhase7Screenshots();
