/**
 * AUDIT CSS - Automated Screenshot Capture
 *
 * Capture tous les screenshots nécessaires pour l'audit CSS complet
 * avec navigation automatique et authentification
 *
 * Usage: node scripts/audit-css-screenshots.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Credentials
const CREDENTIALS = {
  admin: { username: 'admin2', password: 'admin123!' },
  user: { username: 'bobbob', password: 'Bobbob123!' },
  employee: { username: 'clam1', password: 'Claim123!' },
  owner: { username: 'owner', password: 'Owner123!' }
};

// Output directory
const OUTPUT_DIR = 'audit-css-screenshots';

// Viewport configurations
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  mobile: { width: 375, height: 812 },
  landscape: { width: 812, height: 375 }
};

// Screenshot scenarios
const SCENARIOS = {
  public: [
    { name: 'homepage-desktop-initial', url: '/', viewport: 'desktop', wait: 2000 },
    { name: 'homepage-mobile-initial', url: '/', viewport: 'mobile', wait: 2000 },
    { name: 'homepage-landscape', url: '/', viewport: 'landscape', wait: 2000 },
    { name: 'search-desktop-empty', url: '/search', viewport: 'desktop', wait: 2000 },
    { name: 'search-mobile', url: '/search', viewport: 'mobile', wait: 2000 },
    { name: 'freelances-desktop', url: '/freelances', viewport: 'desktop', wait: 2000 },
    { name: 'freelances-mobile', url: '/freelances', viewport: 'mobile', wait: 2000 },
  ],
  user: [
    { name: 'dashboard-desktop', url: '/dashboard', viewport: 'desktop', wait: 2000 },
    { name: 'dashboard-mobile', url: '/dashboard', viewport: 'mobile', wait: 2000 },
    { name: 'achievements-desktop', url: '/achievements', viewport: 'desktop', wait: 2000 },
    { name: 'achievements-mobile', url: '/achievements', viewport: 'mobile', wait: 2000 },
  ],
  employee: [
    { name: 'employee-dashboard-desktop', url: '/employee/dashboard', viewport: 'desktop', wait: 2000 },
    { name: 'employee-dashboard-mobile', url: '/employee/dashboard', viewport: 'mobile', wait: 2000 },
  ],
  owner: [
    { name: 'my-establishments-desktop', url: '/my-establishments', viewport: 'desktop', wait: 2000 },
    { name: 'my-establishments-mobile', url: '/my-establishments', viewport: 'mobile', wait: 2000 },
    { name: 'ownership-requests-desktop', url: '/my-ownership-requests', viewport: 'desktop', wait: 2000 },
  ],
  admin: [
    { name: 'admin-dashboard', url: '/admin', viewport: 'desktop', wait: 2000 },
    { name: 'admin-mobile', url: '/admin', viewport: 'mobile', wait: 2000 },
  ]
};

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function login(page, role) {
  console.log(`🔐 Logging in as ${role}...`);

  const creds = CREDENTIALS[role];
  if (!creds) {
    throw new Error(`Unknown role: ${role}`);
  }

  // Navigate to home page
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Click login button (assuming it opens a modal)
  try {
    // Look for login button in header - adjust selector as needed
    const loginButton = await page.locator('text=Login').first();
    await loginButton.click();
    await page.waitForTimeout(1000);

    // Fill in credentials
    await page.fill('input[name="username"], input[type="text"]', creds.username);
    await page.fill('input[name="password"], input[type="password"]', creds.password);

    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000); // Wait for login to complete

    console.log(`✅ Logged in as ${role}`);
  } catch (error) {
    console.error(`❌ Login failed for ${role}:`, error.message);
    throw error;
  }
}

async function captureScreenshot(page, scenario, outputDir) {
  const viewport = VIEWPORTS[scenario.viewport];

  // Set viewport
  await page.setViewportSize(viewport);

  console.log(`📸 Capturing: ${scenario.name} (${scenario.viewport} ${viewport.width}×${viewport.height})`);

  try {
    // Navigate to URL
    await page.goto(`http://localhost:3000${scenario.url}`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for content
    await page.waitForTimeout(scenario.wait);

    // Take screenshot
    const filename = `${scenario.name}.png`;
    const filepath = path.join(outputDir, filename);

    await page.screenshot({
      path: filepath,
      fullPage: true
    });

    console.log(`  ✅ Saved: ${filename}`);
    return true;
  } catch (error) {
    console.error(`  ❌ Failed: ${scenario.name} - ${error.message}`);
    return false;
  }
}

async function runAudit() {
  console.log('🚀 Starting CSS Audit Screenshot Automation\n');

  // Ensure output directory exists
  await ensureDir(OUTPUT_DIR);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage']
  });

  try {
    let successCount = 0;
    let totalCount = 0;

    // ========================================
    // PHASE 1: Public Pages (No Auth)
    // ========================================
    console.log('\n📂 PHASE 1: Public Pages');
    console.log('=' .repeat(50));

    const publicDir = path.join(OUTPUT_DIR, '1-public');
    await ensureDir(publicDir);

    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    for (const scenario of SCENARIOS.public) {
      totalCount++;
      const success = await captureScreenshot(page1, scenario, publicDir);
      if (success) successCount++;
    }

    await context1.close();

    // ========================================
    // PHASE 2: User Auth Pages
    // ========================================
    console.log('\n📂 PHASE 2: User Pages');
    console.log('='.repeat(50));

    const userDir = path.join(OUTPUT_DIR, '2-user');
    await ensureDir(userDir);

    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await login(page2, 'user');

    for (const scenario of SCENARIOS.user) {
      totalCount++;
      const success = await captureScreenshot(page2, scenario, userDir);
      if (success) successCount++;
    }

    await context2.close();

    // ========================================
    // PHASE 3: Employee Pages
    // ========================================
    console.log('\n📂 PHASE 3: Employee Pages');
    console.log('='.repeat(50));

    const employeeDir = path.join(OUTPUT_DIR, '3-employee');
    await ensureDir(employeeDir);

    const context3 = await browser.newContext();
    const page3 = await context3.newPage();

    await login(page3, 'employee');

    for (const scenario of SCENARIOS.employee) {
      totalCount++;
      const success = await captureScreenshot(page3, scenario, employeeDir);
      if (success) successCount++;
    }

    await context3.close();

    // ========================================
    // PHASE 4: Owner Pages
    // ========================================
    console.log('\n📂 PHASE 4: Owner Pages');
    console.log('='.repeat(50));

    const ownerDir = path.join(OUTPUT_DIR, '4-owner');
    await ensureDir(ownerDir);

    const context4 = await browser.newContext();
    const page4 = await context4.newPage();

    await login(page4, 'owner');

    for (const scenario of SCENARIOS.owner) {
      totalCount++;
      const success = await captureScreenshot(page4, scenario, ownerDir);
      if (success) successCount++;
    }

    await context4.close();

    // ========================================
    // PHASE 5: Admin Pages
    // ========================================
    console.log('\n📂 PHASE 5: Admin Pages');
    console.log('='.repeat(50));

    const adminDir = path.join(OUTPUT_DIR, '5-admin');
    await ensureDir(adminDir);

    const context5 = await browser.newContext();
    const page5 = await context5.newPage();

    await login(page5, 'admin');

    for (const scenario of SCENARIOS.admin) {
      totalCount++;
      const success = await captureScreenshot(page5, scenario, adminDir);
      if (success) successCount++;
    }

    await context5.close();

    // ========================================
    // Summary
    // ========================================
    console.log('\n' + '='.repeat(50));
    console.log('📊 AUDIT SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${successCount}/${totalCount}`);
    console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);
    console.log(`📁 Output: ${OUTPUT_DIR}/`);
    console.log('\n✨ Screenshot capture complete!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Run the audit
runAudit().catch(console.error);
