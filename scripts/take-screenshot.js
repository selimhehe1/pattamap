/**
 * Take Screenshots - PattaMap UX Audit
 * Captures desktop and mobile views of the homepage
 */

const { chromium } = require('playwright');

async function takeScreenshots() {
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({ headless: true });

  try {
    // Desktop screenshot (1920x1080)
    console.log('📸 Taking DESKTOP screenshot (1920x1080)...');
    const desktopPage = await browser.newPage({
      viewport: { width: 1920, height: 1080 }
    });

    await desktopPage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await desktopPage.waitForTimeout(2000); // Wait for images to load
    await desktopPage.screenshot({ path: 'screenshot-desktop.png', fullPage: false });
    console.log('✅ Desktop screenshot saved: screenshot-desktop.png');
    await desktopPage.close();

    // Mobile screenshot (375x812 - iPhone X)
    console.log('📱 Taking MOBILE screenshot (375x812)...');
    const mobilePage = await browser.newPage({
      viewport: { width: 375, height: 812 }
    });

    await mobilePage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await mobilePage.waitForTimeout(2000);
    await mobilePage.screenshot({ path: 'screenshot-mobile.png', fullPage: false });
    console.log('✅ Mobile screenshot saved: screenshot-mobile.png');
    await mobilePage.close();

    console.log('\n🎉 Screenshots completed successfully!\n');
    console.log('Files created:');
    console.log('  - screenshot-desktop.png (1920x1080)');
    console.log('  - screenshot-mobile.png (375x812)');

  } catch (error) {
    console.error('❌ Error taking screenshots:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

takeScreenshots();
