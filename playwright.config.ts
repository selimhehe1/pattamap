import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

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

// ES Module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auth state file paths
const AUTH_STATE_DIR = path.join(__dirname, 'tests/e2e/.auth');
const ADMIN_STATE_FILE = path.join(AUTH_STATE_DIR, 'admin.json');
const USER_STATE_FILE = path.join(AUTH_STATE_DIR, 'user.json');

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Global setup - pre-authenticate to avoid rate limiting
  globalSetup: './tests/e2e/global-setup.ts',

  // Maximum time one test can run for
  timeout: 60 * 1000, // 60 seconds per test

  // Test execution settings
  fullyParallel: false, // Sequential to avoid rate limiting on auth
  forbidOnly: !!process.env.CI, // Fail on .only() in CI
  retries: process.env.CI ? 2 : 1, // Retry failed tests (rate limit may have passed)
  workers: 1, // Single worker to avoid Supabase rate limiting on auth

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
    // ============ CHROMIUM (Chrome) ============
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

    // ============ FIREFOX ============
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'firefox-mobile',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
      },
    },

    // ============ WEBKIT (Safari) ============
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'webkit-mobile',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 390, height: 844 },
      },
    },

    // ============ EDGE ============
    {
      name: 'edge-desktop',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        viewport: { width: 1920, height: 1080 },
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
