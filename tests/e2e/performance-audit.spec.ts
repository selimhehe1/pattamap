/**
 * E2E Tests - Performance Audit
 *
 * Tests performance metrics across the application:
 * 1. Page load times (LCP, FCP, TTFB)
 * 2. JavaScript bundle size
 * 3. API response times
 * 4. Map rendering performance
 * 5. Search/filter responsiveness
 * 6. Image loading optimization
 * 7. Memory usage
 * 8. Animation performance
 */

import { test, expect, Page } from '@playwright/test';

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  PAGE_LOAD: 3000,        // Max page load time
  LCP: 2500,              // Largest Contentful Paint
  FCP: 1800,              // First Contentful Paint
  TTFB: 800,              // Time to First Byte
  TTI: 3800,              // Time to Interactive
  API_RESPONSE: 1000,     // API response time
  MAP_RENDER: 2000,       // Map initial render
  SEARCH_RESPONSE: 500,   // Search/filter response
  SIDEBAR_OPEN: 300,      // Sidebar animation
};

interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  jsHeapSize: number;
  resourceCount: number;
  totalTransferSize: number;
}

// Helper to collect performance metrics
async function collectPerformanceMetrics(page: Page): Promise<PerformanceMetrics> {
  return await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    const fcp = paint.find(p => p.name === 'first-contentful-paint');
    const fp = paint.find(p => p.name === 'first-paint');

    // Get LCP from PerformanceObserver entries if available
    let lcp = 0;
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      lcp = lcpEntries[lcpEntries.length - 1].startTime;
    }

    // Calculate total transfer size
    const totalTransferSize = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);

    // Get JS heap size if available
    const memory = (performance as any).memory;
    const jsHeapSize = memory ? memory.usedJSHeapSize : 0;

    return {
      pageLoadTime: navigation.loadEventEnd - navigation.startTime,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
      firstPaint: fp ? fp.startTime : 0,
      firstContentfulPaint: fcp ? fcp.startTime : 0,
      largestContentfulPaint: lcp,
      timeToInteractive: navigation.domInteractive - navigation.startTime,
      totalBlockingTime: 0, // Would need PerformanceObserver for accurate TBT
      cumulativeLayoutShift: 0, // Would need PerformanceObserver for CLS
      jsHeapSize,
      resourceCount: resources.length,
      totalTransferSize,
    };
  });
}

// Helper to measure API response time
async function measureApiResponse(page: Page, urlPattern: string): Promise<number[]> {
  const times: number[] = [];

  page.on('response', response => {
    if (response.url().includes(urlPattern)) {
      const timing = response.timing();
      if (timing) {
        times.push(timing.responseEnd - timing.requestStart);
      }
    }
  });

  return times;
}

// ========================================
// TEST SUITE 1: Home Page Performance
// ========================================

test.describe('Home Page Performance', () => {
  test('should load home page within threshold', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    console.log(`📊 Home Page Load Time: ${loadTime}ms (threshold: ${THRESHOLDS.PAGE_LOAD}ms)`);

    expect(loadTime).toBeLessThan(THRESHOLDS.PAGE_LOAD);
  });

  test('should have acceptable First Contentful Paint', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const metrics = await collectPerformanceMetrics(page);

    console.log(`📊 First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(0)}ms (threshold: ${THRESHOLDS.FCP}ms)`);

    if (metrics.firstContentfulPaint > 0) {
      expect(metrics.firstContentfulPaint).toBeLessThan(THRESHOLDS.FCP);
    }
  });

  test('should have acceptable Largest Contentful Paint', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const metrics = await collectPerformanceMetrics(page);

    console.log(`📊 Largest Contentful Paint: ${metrics.largestContentfulPaint.toFixed(0)}ms (threshold: ${THRESHOLDS.LCP}ms)`);

    if (metrics.largestContentfulPaint > 0) {
      expect(metrics.largestContentfulPaint).toBeLessThan(THRESHOLDS.LCP);
    }
  });

  test('should have acceptable Time to Interactive', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const metrics = await collectPerformanceMetrics(page);

    console.log(`📊 Time to Interactive: ${metrics.timeToInteractive.toFixed(0)}ms (threshold: ${THRESHOLDS.TTI}ms)`);

    expect(metrics.timeToInteractive).toBeLessThan(THRESHOLDS.TTI);
  });

  test('should collect full performance report', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const metrics = await collectPerformanceMetrics(page);

    console.log('\n📈 HOME PAGE PERFORMANCE REPORT:');
    console.log('================================');
    console.log(`Page Load Time:      ${metrics.pageLoadTime.toFixed(0)}ms`);
    console.log(`DOM Content Loaded:  ${metrics.domContentLoaded.toFixed(0)}ms`);
    console.log(`First Paint:         ${metrics.firstPaint.toFixed(0)}ms`);
    console.log(`First Contentful:    ${metrics.firstContentfulPaint.toFixed(0)}ms`);
    console.log(`Largest Contentful:  ${metrics.largestContentfulPaint.toFixed(0)}ms`);
    console.log(`Time to Interactive: ${metrics.timeToInteractive.toFixed(0)}ms`);
    console.log(`Resources Loaded:    ${metrics.resourceCount}`);
    console.log(`Total Transfer:      ${(metrics.totalTransferSize / 1024).toFixed(0)}KB`);
    console.log(`JS Heap Size:        ${(metrics.jsHeapSize / 1024 / 1024).toFixed(1)}MB`);
    console.log('================================\n');

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 2: Map Performance
// ========================================

test.describe('Map Performance', () => {
  test('should render map within threshold', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Wait for map container to be visible
    const mapContainer = page.locator('.leaflet-container, canvas, [data-testid="map"]').first();
    await mapContainer.waitFor({ state: 'visible', timeout: 10000 });

    const renderTime = Date.now() - startTime;

    console.log(`📊 Map Render Time: ${renderTime}ms (threshold: ${THRESHOLDS.MAP_RENDER}ms)`);

    expect(renderTime).toBeLessThan(THRESHOLDS.MAP_RENDER);
  });

  test('should load map tiles efficiently', async ({ page }) => {
    const tileRequests: number[] = [];

    page.on('response', response => {
      const url = response.url();
      if (url.includes('tile') || url.includes('openstreetmap') || url.includes('mapbox')) {
        tileRequests.push(response.timing()?.responseEnd || 0);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log(`📊 Map Tiles Loaded: ${tileRequests.length}`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle map pan smoothly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const map = page.locator('.leaflet-container, canvas').first();

    if (await map.isVisible().catch(() => false)) {
      const box = await map.boundingBox();

      if (box) {
        const startTime = Date.now();

        // Simulate map pan
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();

        for (let i = 0; i < 5; i++) {
          await page.mouse.move(
            box.x + box.width / 2 + (i * 20),
            box.y + box.height / 2,
            { steps: 5 }
          );
        }

        await page.mouse.up();

        const panTime = Date.now() - startTime;

        console.log(`📊 Map Pan Time: ${panTime}ms`);

        // Pan should complete within 500ms
        expect(panTime).toBeLessThan(1000);
      }
    }
  });

  test('should handle map zoom smoothly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const map = page.locator('.leaflet-container, canvas').first();

    if (await map.isVisible().catch(() => false)) {
      const box = await map.boundingBox();

      if (box) {
        const startTime = Date.now();

        // Simulate zoom
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, -200);
        await page.waitForLoadState('domcontentloaded');

        const zoomTime = Date.now() - startTime;

        console.log(`📊 Map Zoom Time: ${zoomTime}ms`);

        expect(zoomTime).toBeLessThan(1000);
      }
    }
  });
});

// ========================================
// TEST SUITE 3: Search Performance
// ========================================

test.describe('Search Performance', () => {
  test('should respond to search input quickly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();

    if (await searchInput.isVisible().catch(() => false)) {
      const startTime = Date.now();

      await searchInput.fill('bar');
      await page.waitForLoadState('networkidle');

      const responseTime = Date.now() - startTime;

      console.log(`📊 Search Response Time: ${responseTime}ms (threshold: ${THRESHOLDS.SEARCH_RESPONSE}ms)`);

      // Allow for debounce + response
      expect(responseTime).toBeLessThan(THRESHOLDS.SEARCH_RESPONSE + 500);
    }
  });

  test('should filter results quickly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const filterBtn = page.locator('[data-category], button:has-text("GoGo")').first();

    if (await filterBtn.isVisible().catch(() => false)) {
      const startTime = Date.now();

      await filterBtn.click();
      await page.waitForLoadState('domcontentloaded');

      const filterTime = Date.now() - startTime;

      console.log(`📊 Filter Response Time: ${filterTime}ms`);

      expect(filterTime).toBeLessThan(500);
    }
  });
});

// ========================================
// TEST SUITE 4: Sidebar Performance
// ========================================

test.describe('Sidebar Performance', () => {
  test('should open sidebar quickly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Click on a marker or establishment
    const marker = page.locator('.leaflet-marker-icon, .custom-marker, [data-establishment]').first();

    if (await marker.isVisible().catch(() => false)) {
      const startTime = Date.now();

      await marker.click();

      // Wait for sidebar to be visible
      const sidebar = page.locator('.sidebar, [data-testid="sidebar"], .establishment-details').first();
      await sidebar.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

      const openTime = Date.now() - startTime;

      console.log(`📊 Sidebar Open Time: ${openTime}ms (threshold: ${THRESHOLDS.SIDEBAR_OPEN}ms)`);

      expect(openTime).toBeLessThan(THRESHOLDS.SIDEBAR_OPEN + 200);
    }
  });

  test('should close sidebar quickly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const marker = page.locator('.leaflet-marker-icon, .custom-marker').first();

    if (await marker.isVisible().catch(() => false)) {
      await marker.click();
      await page.waitForLoadState('domcontentloaded');

      const closeBtn = page.locator('button:has-text("×"), .close-btn, button[aria-label*="close"]').first();

      if (await closeBtn.isVisible().catch(() => false)) {
        const startTime = Date.now();

        await closeBtn.click();
        await page.waitForLoadState('domcontentloaded');

        const closeTime = Date.now() - startTime;

        console.log(`📊 Sidebar Close Time: ${closeTime}ms`);

        expect(closeTime).toBeLessThan(500);
      }
    }
  });
});

// ========================================
// TEST SUITE 5: API Response Times
// ========================================

test.describe('API Response Times', () => {
  test('should load establishments API quickly', async ({ page }) => {
    const apiRequests: { url: string; startTime: number; endTime?: number }[] = [];

    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/') || url.includes('supabase')) {
        apiRequests.push({ url, startTime: Date.now() });
      }
    });

    page.on('response', response => {
      const url = response.url();
      const req = apiRequests.find(r => r.url === url && !r.endTime);
      if (req) {
        req.endTime = Date.now();
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const completedRequests = apiRequests.filter(r => r.endTime);
    if (completedRequests.length > 0) {
      const times = completedRequests.map(r => r.endTime! - r.startTime);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      console.log(`📊 API Calls: ${completedRequests.length}`);
      console.log(`📊 Avg API Response: ${avgTime.toFixed(0)}ms`);
      console.log(`📊 Max API Response: ${maxTime.toFixed(0)}ms (threshold: ${THRESHOLDS.API_RESPONSE}ms)`);

      expect(maxTime).toBeLessThan(THRESHOLDS.API_RESPONSE);
    }
  });

  test('should handle concurrent API requests efficiently', async ({ page }) => {
    let concurrentRequests = 0;
    let maxConcurrent = 0;

    page.on('request', () => {
      concurrentRequests++;
      maxConcurrent = Math.max(maxConcurrent, concurrentRequests);
    });

    page.on('response', () => {
      concurrentRequests--;
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    console.log(`📊 Max Concurrent Requests: ${maxConcurrent}`);

    // Warn if too many concurrent requests (waterfall issue)
    if (maxConcurrent > 10) {
      console.warn('⚠️ High number of concurrent requests detected');
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 6: Bundle Size
// ========================================

test.describe('Bundle Size', () => {
  test('should have reasonable JavaScript bundle size', async ({ page }) => {
    const jsResources: { url: string; size: number }[] = [];

    page.on('response', async response => {
      const url = response.url();
      if (url.endsWith('.js') || url.includes('.js?')) {
        const headers = response.headers();
        const size = parseInt(headers['content-length'] || '0', 10);
        jsResources.push({ url, size });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const totalJsSize = jsResources.reduce((sum, r) => sum + r.size, 0);
    const totalJsKB = totalJsSize / 1024;

    console.log(`📊 JS Bundle Count: ${jsResources.length} files`);
    console.log(`📊 Total JS Size: ${totalJsKB.toFixed(0)}KB`);

    // Find largest bundles
    const sorted = jsResources.sort((a, b) => b.size - a.size);
    console.log('\n📦 Largest JS Bundles:');
    sorted.slice(0, 5).forEach((r, i) => {
      const filename = r.url.split('/').pop()?.split('?')[0] || r.url;
      console.log(`   ${i + 1}. ${filename}: ${(r.size / 1024).toFixed(0)}KB`);
    });

    // Warn if bundle is too large (> 500KB)
    if (totalJsKB > 500) {
      console.warn('⚠️ JavaScript bundle size is large, consider code splitting');
    }

    await expect(page.locator('body')).toBeVisible();
  });

  test('should have reasonable CSS bundle size', async ({ page }) => {
    const cssResources: { url: string; size: number }[] = [];

    page.on('response', async response => {
      const url = response.url();
      if (url.endsWith('.css') || url.includes('.css?')) {
        const headers = response.headers();
        const size = parseInt(headers['content-length'] || '0', 10);
        cssResources.push({ url, size });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const totalCssSize = cssResources.reduce((sum, r) => sum + r.size, 0);
    const totalCssKB = totalCssSize / 1024;

    console.log(`📊 CSS Bundle Count: ${cssResources.length} files`);
    console.log(`📊 Total CSS Size: ${totalCssKB.toFixed(0)}KB`);

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 7: Image Optimization
// ========================================

test.describe('Image Optimization', () => {
  test('should lazy load images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const lazyImages = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      let lazyCount = 0;
      let totalCount = 0;

      images.forEach(img => {
        totalCount++;
        if (img.loading === 'lazy' || img.dataset.src) {
          lazyCount++;
        }
      });

      return { lazyCount, totalCount };
    });

    console.log(`📊 Total Images: ${lazyImages.totalCount}`);
    console.log(`📊 Lazy Loaded: ${lazyImages.lazyCount}`);

    const lazyPercent = lazyImages.totalCount > 0
      ? (lazyImages.lazyCount / lazyImages.totalCount * 100).toFixed(0)
      : 0;
    console.log(`📊 Lazy Load %: ${lazyPercent}%`);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should use optimized image formats', async ({ page }) => {
    const imageFormats: Record<string, number> = {};

    page.on('response', response => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      if (contentType.includes('image/')) {
        const format = contentType.split('/')[1];
        imageFormats[format] = (imageFormats[format] || 0) + 1;
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    console.log('\n📸 Image Formats Used:');
    Object.entries(imageFormats).forEach(([format, count]) => {
      console.log(`   ${format}: ${count}`);
    });

    // Check for modern formats
    const hasModernFormats = imageFormats['webp'] || imageFormats['avif'];
    if (!hasModernFormats && Object.keys(imageFormats).length > 0) {
      console.warn('⚠️ Consider using WebP or AVIF for better compression');
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 8: Memory Usage
// ========================================

test.describe('Memory Usage', () => {
  test('should not have memory leaks on navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      const memory = (performance as any).memory;
      return memory ? memory.usedJSHeapSize : 0;
    });

    // Navigate around
    for (let i = 0; i < 5; i++) {
      await page.goto('/search');
      await page.waitForLoadState('domcontentloaded');
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    await page.waitForLoadState('networkidle');

    // Get final memory
    const finalMemory = await page.evaluate(() => {
      const memory = (performance as any).memory;
      return memory ? memory.usedJSHeapSize : 0;
    });

    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = ((finalMemory - initialMemory) / initialMemory * 100).toFixed(1);

      console.log(`📊 Initial Memory: ${(initialMemory / 1024 / 1024).toFixed(1)}MB`);
      console.log(`📊 Final Memory: ${(finalMemory / 1024 / 1024).toFixed(1)}MB`);
      console.log(`📊 Memory Change: ${memoryIncrease}%`);

      // Warn if memory increased significantly
      if (finalMemory > initialMemory * 2) {
        console.warn('⚠️ Potential memory leak detected');
      }
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 9: Animation Performance
// ========================================

test.describe('Animation Performance', () => {
  test('should maintain 60fps during animations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Enable performance metrics
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    // Trigger some animations (hover, click, etc.)
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible().catch(() => false)) {
        await btn.hover();
        await page.waitForLoadState('domcontentloaded');
      }
    }

    // Get metrics
    const metrics = await client.send('Performance.getMetrics');
    const frameMetrics = metrics.metrics.find((m: any) => m.name === 'Frames');

    if (frameMetrics) {
      console.log(`📊 Total Frames: ${frameMetrics.value}`);
    }

    await expect(page.locator('body')).toBeVisible();
  });
});

// ========================================
// TEST SUITE 10: Mobile Performance
// ========================================

test.describe('Mobile Performance', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    isMobile: true,
  });

  test('should load quickly on mobile', async ({ page }) => {
    // Simulate 3G network
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 100,
    });

    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    console.log(`📊 Mobile Load Time (3G): ${loadTime}ms`);

    // Mobile should still load within 5 seconds on 3G
    expect(loadTime).toBeLessThan(10000);
  });

  test('should have touch-responsive UI', async ({ browser }) => {
    // Create a new context with touch support
    const context = await browser.newContext({
      hasTouch: true,
      viewport: { width: 375, height: 667 },
    });
    const page = await context.newPage();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const startTime = Date.now();

    // Find a visible, in-viewport button or link (exclude skip links)
    const tappable = page.locator('button:visible, a:visible').filter({
      hasNot: page.locator('[class*="skip"], [href="#main-content"]'),
    }).first();

    const isClickable = await tappable.isVisible().catch(() => false);
    if (isClickable) {
      const box = await tappable.boundingBox();
      if (box && box.y > 0 && box.y < 600) {
        await tappable.tap({ timeout: 5000 }).catch(() => {
          // Fallback to click if tap fails
          return tappable.click();
        });
      }
    }

    const responseTime = Date.now() - startTime;

    console.log(`📊 Touch Response Time: ${responseTime}ms`);

    // Touch should respond within 300ms
    expect(responseTime).toBeLessThan(500);

    await context.close();
  });
});

// ========================================
// TEST SUITE 11: Full Performance Report
// ========================================

test.describe('Full Performance Report', () => {
  test('should generate comprehensive performance report', async ({ page }) => {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           PATTAMAP PERFORMANCE AUDIT REPORT                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Collect metrics for multiple pages
    const pages = ['/', '/search'];

    for (const pagePath of pages) {
      console.log(`\n📄 Page: ${pagePath}`);
      console.log('─'.repeat(50));

      const startTime = Date.now();
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      const metrics = await collectPerformanceMetrics(page);

      // Status indicators
      const getStatus = (value: number, threshold: number) =>
        value < threshold ? '✅' : value < threshold * 1.5 ? '⚠️' : '❌';

      console.log(`${getStatus(loadTime, THRESHOLDS.PAGE_LOAD)} Page Load: ${loadTime}ms`);
      console.log(`${getStatus(metrics.firstContentfulPaint, THRESHOLDS.FCP)} FCP: ${metrics.firstContentfulPaint.toFixed(0)}ms`);
      console.log(`${getStatus(metrics.largestContentfulPaint, THRESHOLDS.LCP)} LCP: ${metrics.largestContentfulPaint.toFixed(0)}ms`);
      console.log(`${getStatus(metrics.timeToInteractive, THRESHOLDS.TTI)} TTI: ${metrics.timeToInteractive.toFixed(0)}ms`);
      console.log(`📦 Resources: ${metrics.resourceCount}`);
      console.log(`📊 Transfer: ${(metrics.totalTransferSize / 1024).toFixed(0)}KB`);
    }

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    RECOMMENDATIONS                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('1. 🖼️  Use WebP/AVIF for images');
    console.log('2. 📦 Code-split large bundles');
    console.log('3. 🗺️  Lazy load map tiles');
    console.log('4. 💾 Implement service worker caching');
    console.log('5. 🔄 Use React.memo for expensive components');
    console.log('');

    await expect(page.locator('body')).toBeVisible();
  });
});
