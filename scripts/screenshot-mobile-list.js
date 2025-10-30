const playwright = require('playwright');

(async () => {
  console.log('📸 Starting mobile screenshot capture (LIST VIEW)...');

  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone X/11/12
    isMobile: true,
    hasTouch: true
  });

  const page = await context.newPage();

  console.log('🌐 Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  console.log('⏳ Waiting for content to load...');
  await page.waitForTimeout(2000);

  // Click on Soi 6 zone to open the map
  console.log('📍 Clicking Soi 6 zone...');
  await page.click('text=Soi 6');
  await page.waitForTimeout(1500);

  // Click the list view toggle button (📋)
  console.log('📋 Clicking list view toggle...');
  const listButton = await page.locator('button[title="List view"]');
  if (await listButton.count() > 0) {
    await listButton.click();
    await page.waitForTimeout(2000); // Wait for list view to render
  } else {
    console.log('⚠️  List button not found, trying alternative selector...');
    await page.click('.sidebar-view-btn-nightlife:has-text("📋")');
    await page.waitForTimeout(2000);
  }

  console.log('📸 Capturing mobile screenshot...');
  await page.screenshot({
    path: 'temp-screenshot.png',
    fullPage: false
  });

  console.log('✅ Screenshot saved: temp-screenshot.png');
  console.log('👁️  Claude can now read this image with: Read temp-screenshot.png');

  await browser.close();
})();
