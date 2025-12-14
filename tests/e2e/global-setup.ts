/**
 * Global Setup for Playwright E2E Tests
 *
 * Creates authenticated state files for admin and standard user
 * to avoid rate limiting from Supabase Auth.
 *
 * Run once before all tests to:
 * 1. Login as admin user
 * 2. Login as standard test user
 * 3. Save browser states to reuse in tests
 */

import { chromium, FullConfig } from '@playwright/test';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'http://localhost:8080/api';

// Auth state storage paths
export const AUTH_STATE_DIR = path.join(__dirname, '.auth');
export const ADMIN_STATE_FILE = path.join(AUTH_STATE_DIR, 'admin.json');
export const USER_STATE_FILE = path.join(AUTH_STATE_DIR, 'user.json');

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@test.com',
  password: 'SecureTestP@ssw0rd2024!'
};

const USER_CREDENTIALS = {
  email: 'owner@test.com',
  password: 'SecureTestP@ssw0rd2024!'
};

async function globalSetup(config: FullConfig) {
  console.log('\n🔧 Global Setup: Preparing authentication states...\n');

  // Ensure auth state directory exists
  if (!fs.existsSync(AUTH_STATE_DIR)) {
    fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });
  }

  const browser = await chromium.launch();

  try {
    // Setup admin state
    await setupAuthState(browser, ADMIN_CREDENTIALS, ADMIN_STATE_FILE, 'admin');

    // Setup user state
    await setupAuthState(browser, USER_CREDENTIALS, USER_STATE_FILE, 'user');

    console.log('\n✅ Global Setup complete!\n');
  } catch (error) {
    console.error('❌ Global Setup failed:', error);
    // Don't throw - let tests run even if pre-auth fails
    // Tests will handle auth individually
  } finally {
    await browser.close();
  }
}

async function setupAuthState(
  browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never,
  credentials: { email: string; password: string },
  stateFile: string,
  label: string
) {
  console.log(`📝 Setting up ${label} authentication...`);

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Attempt API login with longer timeout in CI and retry logic
    const timeout = process.env.CI ? 30000 : 10000; // 30s in CI, 10s locally
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`   🔄 Retry attempt ${attempt}/${maxRetries} for ${label}...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
        }

        const loginResponse = await axios.post(
          `${API_BASE_URL}/auth/login`,
          {
            login: credentials.email,
            password: credentials.password
          },
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
            timeout
          }
        );

        // Get cookies from response
        const setCookies = loginResponse.headers['set-cookie'] || [];

        if (setCookies.length > 0) {
          const cookiesToAdd = [];

          for (const cookie of setCookies) {
            const [nameValue] = cookie.split(';');
            const [name, value] = nameValue.split('=');

            cookiesToAdd.push({
              name: name.trim(),
              value: value?.trim() || '',
              domain: 'localhost',
              path: '/',
              httpOnly: true,
              secure: false,
              sameSite: 'Lax' as const
            });
          }

          await context.addCookies(cookiesToAdd);
        }

        // Navigate to app to establish frontend state
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

        // Store CSRF token and user data in localStorage if available
        if (loginResponse.data.csrfToken) {
          await page.evaluate((token) => {
            localStorage.setItem('csrfToken', token);
          }, loginResponse.data.csrfToken);
        }

        if (loginResponse.data.user) {
          await page.evaluate((user) => {
            localStorage.setItem('user', JSON.stringify(user));
          }, loginResponse.data.user);
        }

        // Save storage state
        await context.storageState({ path: stateFile });

        console.log(`   ✅ ${label} state saved to ${path.basename(stateFile)}`);
        return; // Success - exit retry loop
      } catch (retryError) {
        lastError = retryError;
        if (attempt === maxRetries) {
          throw retryError; // Re-throw on final attempt
        }
      }
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.message;
      console.log(`   ⚠️  ${label} login failed: ${errorMessage}`);

      // Check for rate limiting
      if (errorMessage.includes('Too many')) {
        console.log(`   ℹ️  Rate limited - tests will handle auth individually`);
      }
    } else {
      console.log(`   ⚠️  ${label} setup error:`, error);
    }

    // Create empty state file so tests know pre-auth failed
    fs.writeFileSync(stateFile, JSON.stringify({ cookies: [], origins: [] }));
  } finally {
    await context.close();
  }
}

export default globalSetup;
