/**
 * Screenshot Gamification Features
 *
 * Captures screenshots of PattaMap gamification UI for visual validation
 *
 * Usage:
 *   node scripts/screenshot-gamification.js
 */

const { chromium } = require('playwright');
const path = require('path');

async function captureGamificationScreenshots() {
  console.log('🚀 Starting Playwright browser...');
  const browser = await chromium.launch({ headless: false }); // headless: false to see what's happening

  try {
    // ========================================
    // SETUP
    // ========================================

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    const page = await context.newPage();
    const screenshotsDir = path.join(__dirname, '../temp-screenshots');

    console.log('📁 Screenshots will be saved to:', screenshotsDir);

    // ========================================
    // NAVIGATE TO HOME
    // ========================================

    console.log('\n📍 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for animations

    // ========================================
    // LOGIN (required for gamification features)
    // ========================================

    console.log('\n🔐 Checking if login is needed...');

    // Check if user menu exists (already logged in)
    const userMenuExists = await page.locator('.user-menu').count() > 0;

    if (!userMenuExists) {
      console.log('🔓 Not logged in. Please login manually...');
      console.log('⏳ Waiting 30 seconds for you to login...');
      await page.waitForTimeout(30000); // Wait 30s for manual login
    } else {
      console.log('✅ Already logged in!');
    }

    // ========================================
    // SCREENSHOT 1: Header with XP Indicator
    // ========================================

    console.log('\n📸 Screenshot 1: Header with XP indicator');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Locate header
    const header = page.locator('header.header');
    if (await header.count() > 0) {
      await header.screenshot({
        path: path.join(screenshotsDir, '1-header-xp-desktop.png')
      });
      console.log('✅ Saved: 1-header-xp-desktop.png');
    } else {
      console.log('⚠️  Header not found!');
    }

    // ========================================
    // SCREENSHOT 2-5: Achievements Page (4 tabs)
    // ========================================

    console.log('\n📍 Navigating to /achievements...');
    await page.goto('http://localhost:3000/achievements', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Tab 1: Overview
    console.log('\n📸 Screenshot 2: Achievements - Overview tab');
    await page.click('button:has-text("📊 Overview")');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, '2-achievements-overview-desktop.png'),
      fullPage: true
    });
    console.log('✅ Saved: 2-achievements-overview-desktop.png');

    // Tab 2: Badges
    console.log('\n📸 Screenshot 3: Achievements - Badges tab');
    await page.click('button:has-text("🏅 Badges")');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, '3-achievements-badges-desktop.png'),
      fullPage: true
    });
    console.log('✅ Saved: 3-achievements-badges-desktop.png');

    // Tab 3: Missions
    console.log('\n📸 Screenshot 4: Achievements - Missions tab');
    await page.click('button:has-text("🎯 Missions")');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, '4-achievements-missions-desktop.png'),
      fullPage: true
    });
    console.log('✅ Saved: 4-achievements-missions-desktop.png');

    // Tab 4: Leaderboard
    console.log('\n📸 Screenshot 5: Achievements - Leaderboard tab');
    await page.click('button:has-text("🏆 Leaderboard")');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, '5-achievements-leaderboard-desktop.png'),
      fullPage: true
    });
    console.log('✅ Saved: 5-achievements-leaderboard-desktop.png');

    // ========================================
    // SCREENSHOT 6-7: Mobile Responsive
    // ========================================

    console.log('\n📱 Switching to mobile viewport (375x812)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);

    // Mobile Header
    console.log('\n📸 Screenshot 6: Header XP - Mobile');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotsDir, '6-header-xp-mobile.png'),
      fullPage: false
    });
    console.log('✅ Saved: 6-header-xp-mobile.png');

    // Mobile Achievements
    console.log('\n📸 Screenshot 7: Achievements - Mobile');
    await page.goto('http://localhost:3000/achievements', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(screenshotsDir, '7-achievements-mobile.png'),
      fullPage: true
    });
    console.log('✅ Saved: 7-achievements-mobile.png');

    console.log('\n✅ All screenshots captured successfully!');
    console.log('📁 Location:', screenshotsDir);

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
  } finally {
    console.log('\n🔒 Closing browser...');
    await browser.close();
    console.log('✅ Done!');
  }
}

// Run the script
captureGamificationScreenshots().catch(console.error);
