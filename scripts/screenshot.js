/**
 * SCREENSHOT AUTOMATION - Playwright
 *
 * Capture automatique de screenshots du frontend localhost
 * pour debugging visuel avec Claude Code
 *
 * Usage:
 *   node scripts/screenshot.js
 *   node scripts/screenshot.js desktop     # Desktop screenshot (default)
 *   node scripts/screenshot.js mobile      # Mobile viewport
 *   node scripts/screenshot.js landscape   # Mobile landscape
 *
 * Output: temp-screenshot.png (root directory)
 */

const { chromium } = require('playwright');

// Viewport configurations
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  mobile: { width: 375, height: 812 },  // iPhone X/11/12
  landscape: { width: 812, height: 375 } // Mobile landscape
};

async function takeScreenshot(viewportType = 'desktop') {
  const viewport = VIEWPORTS[viewportType] || VIEWPORTS.desktop;

  console.log(`📸 Starting screenshot capture...`);
  console.log(`📱 Viewport: ${viewportType} (${viewport.width}x${viewport.height})`);

  const browser = await chromium.launch({
    headless: true
  });

  try {
    const context = await browser.newContext({
      viewport: viewport,
      deviceScaleFactor: 2 // Retina display
    });

    const page = await context.newPage();

    // Navigate to localhost with cache disabled
    console.log(`🌐 Navigating to http://localhost:3000...`);
    await page.goto('http://localhost:3000?_=' + Date.now(), {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for map to load (adjust selector if needed)
    console.log(`⏳ Waiting for content to load...`);
    await page.waitForTimeout(2000); // Extra time for animations

    // Take screenshot
    const screenshotPath = 'temp-screenshot.png';
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    console.log(`✅ Screenshot saved: ${screenshotPath}`);
    console.log(`👁️  Claude can now read this image with: Read temp-screenshot.png`);

  } catch (error) {
    console.error(`❌ Error taking screenshot:`, error.message);
    if (error.message.includes('Timeout')) {
      console.error(`💡 Tip: Make sure frontend is running on http://localhost:3000`);
    }
  } finally {
    await browser.close();
  }
}

// Parse command line argument
const viewportType = process.argv[2] || 'desktop';

if (!VIEWPORTS[viewportType]) {
  console.error(`❌ Invalid viewport type: ${viewportType}`);
  console.error(`Valid options: desktop, mobile, landscape`);
  process.exit(1);
}

takeScreenshot(viewportType);
