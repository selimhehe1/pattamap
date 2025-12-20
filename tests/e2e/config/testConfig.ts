/**
 * E2E Test Configuration
 *
 * Centralized configuration for all E2E tests.
 * Values can be overridden via environment variables.
 */

export const TEST_CONFIG = {
  // API Configuration
  api: {
    baseUrl: process.env.E2E_API_URL || 'http://localhost:8080/api',
    frontendUrl: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.E2E_API_TIMEOUT || '10000', 10)
  },

  // Test Credentials (used when real auth is needed)
  credentials: {
    admin: {
      email: process.env.E2E_ADMIN_EMAIL || 'admin@test.com',
      password: process.env.E2E_ADMIN_PASSWORD || 'SecureTestP@ssw0rd2024!'
    },
    owner: {
      email: process.env.E2E_OWNER_EMAIL || 'owner@test.com',
      password: process.env.E2E_OWNER_PASSWORD || 'SecureTestP@ssw0rd2024!'
    }
  },

  // Test Data Settings
  testData: {
    establishmentName: process.env.E2E_TEST_ESTABLISHMENT || 'Test Bar',
    cleanupEnabled: process.env.E2E_CLEANUP_DATA === 'true'
  },

  // Auth Mode
  auth: {
    useMockAuth: process.env.E2E_USE_MOCK_AUTH !== 'false'
  },

  // Timeouts
  timeouts: {
    navigation: 15000,
    element: 10000,
    action: 5000
  }
};

// Export individual configs for convenience
export const API_BASE_URL = TEST_CONFIG.api.baseUrl;
export const FRONTEND_URL = TEST_CONFIG.api.frontendUrl;
export const ADMIN_CREDENTIALS = TEST_CONFIG.credentials.admin;
export const OWNER_CREDENTIALS = TEST_CONFIG.credentials.owner;
export const USE_MOCK_AUTH = TEST_CONFIG.auth.useMockAuth;
