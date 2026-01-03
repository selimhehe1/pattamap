# 🧪 E2E Testing Guide for PattaMap

## Overview

PattaMap has comprehensive end-to-end (E2E) tests using Playwright that cover:
- User search flows
- Owner management workflows
- Admin VIP verification
- Performance tests

## Test Accounts

### Creating Test Accounts

**Option 1: Using the setup script (recommended)**
```bash
cd backend
node scripts/create-test-users.js
```

**Option 2: Manual registration through the app**

Register the following accounts through the frontend (/register):

1. **Admin Account**
   - Email: `admin@test.com`
   - Password: `SecureTestP@ssw0rd2024!`
   - Role: Need to be manually promoted to admin via Supabase dashboard

2. **Owner Account**
   - Email: `owner@test.com`
   - Password: `SecureTestP@ssw0rd2024!`
   - Role: Regular user (default)
   - Establishment: Create a bar named "Test Bar" with slug `test-bar-e2e`

### Why These Passwords?

The password `SecureTestP@ssw0rd2024!` was chosen because:
- ✅ **NOT in breach databases** (unlike common test passwords like "Test1234!")
- ✅ Meets all password requirements (uppercase, lowercase, number, special char)
- ✅ Strong enough to pass security checks
- ✅ Easy to remember for developers

⚠️ **NEVER use these credentials in production!**

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run specific test file
```bash
npx playwright test tests/e2e/user-search-flow.spec.ts
```

### Run tests for specific device
```bash
# Desktop only
npx playwright test --project=chromium-desktop

# Mobile only
npx playwright test --project=chromium-mobile

# Tablet only
npx playwright test --project=chromium-tablet
```

### Debug mode
```bash
npx playwright test --debug
```

### View test report
```bash
npx playwright show-report
```

## Test Structure

```
tests/e2e/
├── user-search-flow.spec.ts          # User search & filters (11 tests)
├── owner-management.spec.ts           # Owner dashboard & VIP (11 tests)
├── admin-vip-verification.spec.ts     # Admin VIP workflow (14 tests)
└── auth-integration.spec.ts           # Auth flows integration (15 tests)
```

## Auth Integration Tests

### Overview

The `auth-integration.spec.ts` file contains **15 tests** covering authentication flows across desktop and mobile viewports.

### Test Categories

**Desktop Tests (10 tests)**:
- Login form visibility
- Registration navigation
- Registration form visibility
- Form validation
- Protected routes redirect
- Mobile menu interaction
- Account type selection

**Mobile Tests (5 tests)**:
- Login access via hamburger menu
- Registration access
- Protected route redirection

### Helper Functions

```typescript
// Check if user is logged in (multi-detection)
async function isLoggedIn(page: Page): Promise<boolean> {
  const indicators = [
    page.locator('[data-testid="user-menu"]'),
    page.locator('[data-testid="logout-button"]'),
    page.locator('text=My Favorites'),
    page.locator('text=My Profile'),
    page.locator('text=Logout'),
  ];

  for (const indicator of indicators) {
    if (await indicator.isVisible({ timeout: 1000 }).catch(() => false)) {
      return true;
    }
  }
  return false;
}

// Login helper
async function performLogin(page: Page, credentials: {login: string, password: string}) {
  await page.fill('[data-testid="login-input"]', credentials.login);
  await page.fill('[data-testid="password-input"]', credentials.password);
  await page.click('[data-testid="login-submit"]');
}
```

### Troubleshooting

**Issue: Tests timeout on `waitForLoadState('networkidle')`**

**Cause**: `networkidle` waits for no network activity for 500ms, which can timeout if the app has continuous background requests (polling, analytics, etc.).

**Solution**: Use `domcontentloaded` instead:
```typescript
// BEFORE - Can timeout
await page.goto('/', { waitUntil: 'networkidle' });

// AFTER - More reliable
await page.goto('/', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="header"]', { timeout: 10000 });
```

**Issue: Flaky login state detection**

**Cause**: Single selector check may fail if UI varies between states.

**Solution**: Use multi-indicator detection (see `isLoggedIn` helper above).

## Common Issues

### Issue: "Password has been exposed in a data breach"

**Cause**: You're using a compromised password like `Test1234!` or `Admin1234!`

**Solution**: Use `SecureTestP@ssw0rd2024!` instead

### Issue: "Could not find admin@test.com"

**Cause**: Test accounts don't exist in the database

**Solution**: Run `node backend/scripts/create-test-users.js`

### Issue: "Access denied" when accessing admin pages

**Cause**: User doesn't have admin role

**Solution**:
1. Go to Supabase Dashboard
2. Navigate to `auth.users` table
3. Find `admin@test.com`
4. Update `raw_user_meta_data` to include `{"role": "admin"}`

### Issue: Tests timeout or fail sporadically

**Cause**:
- Backend/frontend not running
- Supabase temporarily unavailable
- Network issues

**Solution**:
1. Ensure backend is running: `cd backend && npm run dev`
2. Ensure frontend is running: `npm start`
3. Check Supabase status
4. Retry tests: Playwright auto-starts servers via `webServer` config

## Test Devices

Tests run on 3 different devices to ensure responsiveness:

| Device          | Resolution     | Use Case                      |
|-----------------|----------------|-------------------------------|
| Desktop Chrome  | 1920 × 1080    | Primary desktop experience    |
| iPhone 12       | 375 × 812      | Mobile portrait               |
| iPad Pro        | 1024 × 1366    | Tablet experience             |

## Continuous Integration

To integrate E2E tests in CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Writing New E2E Tests

### Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const button = page.locator('[data-testid="my-button"]');

    // Act
    await button.click();

    // Assert
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Best Practices

1. **Use data-testid attributes** for stable selectors
   ```tsx
   <button data-testid="submit-button">Submit</button>
   ```

2. **Wait for network idle** before assertions
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

3. **Use descriptive test names**
   ```typescript
   test('should display error when form is submitted without email', ...);
   ```

4. **Test both happy and error paths**
   ```typescript
   test.describe('Login Form', () => {
     test('should login with valid credentials', ...);
     test('should show error with invalid credentials', ...);
   });
   ```

5. **Keep tests independent** - each test should set up its own data

## Troubleshooting

### View test artifacts

After test failures, check:
```
playwright-report/
├── screenshots/     # Screenshots of failures
├── videos/         # Video recordings
└── traces/         # Full execution traces
```

### Open trace viewer
```bash
npx playwright show-trace path/to/trace.zip
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [PattaMap Architecture](../docs/ARCHITECTURE.md)
- [Test Helpers](../src/test-utils/test-helpers.tsx)
