import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration - PattaMap E2E Tests
 *
 * Tests gamification features:
 * - User registration & XP earning
 * - Achievements page (4 tabs)
 * - Mission progress tracking
 * - Leaderboard functionality
 * - Badge showcase
 *
 * Usage:
 *   npm run test:e2e              # Run all E2E tests
 *   npm run test:e2e:headed       # Run with browser visible
 *   npm run test:e2e:debug        # Debug mode with Playwright Inspector
 */

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Maximum time one test can run for
  timeout: 60 * 1000, // 60 seconds

  // Test execution settings
  fullyParallel: false, // Run tests sequentially (avoid DB conflicts)
  forbidOnly: !!process.env.CI, // Fail on .only() in CI
  retries: process.env.CI ? 2 : 0, // Retry failed tests in CI
  workers: 1, // Single worker (sequential execution)

  // Reporter config
  reporter: [
    ['html', { outputFolder: 'tests/e2e/reports/html' }],
    ['json', { outputFile: 'tests/e2e/reports/results.json' }],
    ['list'] // Console output
  ],

  // Global test settings
  use: {
    // Base URL for navigation
    baseURL: 'http://localhost:3000',

    // Timeouts
    actionTimeout: 15 * 1000, // 15s per action
    navigationTimeout: 30 * 1000, // 30s page load

    // Screenshots & videos
    screenshot: 'only-on-failure', // Capture on test failure
    video: 'retain-on-failure', // Keep video on failure
    trace: 'retain-on-failure', // Keep trace on failure

    // Browser context options
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
    bypassCSP: true, // Bypass Content Security Policy
  },

  // Projects for different browsers/viewports
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    {
      name: 'chromium-mobile',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 812 },
      },
    },

    {
      name: 'chromium-tablet',
      use: {
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 1366 },
      },
    },
  ],

  // Web Server (start dev servers before tests)
  // In CI, servers are started separately, so we skip this
  webServer: process.env.CI ? undefined : [
    {
      command: 'cd backend && npm run dev',
      url: 'http://localhost:8080/api/health',
      timeout: 120 * 1000, // 2 minutes to start
      reuseExistingServer: true, // Don't restart if already running
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm start',
      url: 'http://localhost:3000',
      timeout: 120 * 1000,
      reuseExistingServer: true,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
