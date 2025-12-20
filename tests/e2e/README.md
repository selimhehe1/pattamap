# 🧪 PattaMap E2E Tests - Gamification System

Playwright end-to-end tests for PattaMap gamification features.

---

## 📋 Overview

Tests E2E complets pour PattaMap couvrant:
- ✅ **Authentification** - Login, logout, registration, session
- ✅ **Navigation** - Header, sidebar, map, filtres, recherche
- ✅ **Employés** - CRUD, profils, vérification, claim
- ✅ **Établissements** - Détails, claim, ownership
- ✅ **Gamification** - XP, badges, missions, leaderboard, check-in
- ✅ **Admin** - Panel admin, VIP verification, modération
- ✅ **Accessibilité** - WCAG 2.1 AA, clavier, ARIA
- ✅ **Performance** - Audit Lighthouse, temps de chargement
- ✅ **PWA** - Offline, service worker, installation
- ✅ **Multi-navigateurs** - Chrome, Firefox, Safari, Edge
- ✅ **Responsive** - Desktop, mobile, tablet

**Test Coverage**: ~1,016 tests across 45 files

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- Backend running on http://localhost:8080
- Frontend running on http://localhost:3000

### Installation
```bash
# Install Playwright (if not already installed)
npx playwright install chromium
```

### Run All Tests
```bash
npm run test:e2e
```

---

## 📝 Available Commands

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all E2E tests (headless) |
| `npm run test:e2e:headed` | Run with browser visible |
| `npm run test:e2e:debug` | Debug mode with Playwright Inspector |
| `npm run test:e2e:ui` | Interactive UI mode |
| `npm run test:e2e:desktop` | Desktop tests only (1920×1080) |
| `npm run test:e2e:mobile` | Mobile tests only (375×812) |
| `npm run test:screenshots` | Generate screenshots only |
| `npm run test:report` | View HTML test report |

### Advanced Commands
```bash
# Run specific test file
npx playwright test gamification.spec.ts

# Run tests matching pattern
npx playwright test --grep "badge"

# Run in specific browser
npx playwright test --project=chromium-desktop

# Generate trace for debugging
npx playwright test --trace on

# Update snapshots (if using visual regression)
npx playwright test --update-snapshots
```

---

## 📂 Test Structure

```
tests/e2e/
├── README.md                        # This file
├── fixtures/
│   ├── testUser.ts                  # Helper functions (register, login, XP)
│   └── mockAuth.ts                  # Mock auth (avoid rate limiting)
├── *.spec.ts                        # 45 test files (see list below)
├── screenshots/                     # Auto-generated on failure
└── reports/
    ├── html/                        # HTML report (index.html)
    └── results.json                 # JSON results
```

### Test Files (45 fichiers)

| Catégorie | Fichiers |
|-----------|----------|
| **Auth** | `authentication.spec.ts`, `registration-flows.spec.ts` |
| **Navigation** | `smoke.spec.ts`, `header-navigation.spec.ts`, `sidebar-establishment.spec.ts`, `map-interactions.spec.ts` |
| **Search** | `filters.spec.ts`, `search-page.spec.ts`, `user-search-flow.spec.ts` |
| **Employees** | `employee-crud.spec.ts`, `employee-detail.spec.ts`, `employee-verification.spec.ts`, `employee-profile-claim.spec.ts` |
| **Establishments** | `establishment-detail.spec.ts`, `claim-establishment.spec.ts`, `owner-management.spec.ts` |
| **Gamification** | `gamification.spec.ts`, `gamification-complete.spec.ts` |
| **User** | `profile-edit.spec.ts`, `user-dashboard.spec.ts`, `user-profile-page.spec.ts`, `visit-history-page.spec.ts`, `favorites.spec.ts` |
| **VIP** | `vip-system.spec.ts`, `vip-payment-flow.spec.ts`, `admin-vip-verification.spec.ts` |
| **Admin** | `admin-panel.spec.ts` |
| **Reviews** | `reviews-ratings.spec.ts`, `notifications.spec.ts` |
| **Media** | `photo-upload.spec.ts` |
| **UI/UX** | `modals-forms.spec.ts`, `buttons-interactions.spec.ts`, `theme-switching.spec.ts` |
| **i18n** | `i18n.spec.ts` |
| **Accessibility** | `accessibility.spec.ts`, `accessibility-audit.spec.ts`, `keyboard-navigation.spec.ts` |
| **Performance** | `performance-audit.spec.ts`, `map-performance.spec.ts` |
| **PWA** | `pwa.spec.ts` |
| **Errors** | `error-handling.spec.ts`, `network-errors.spec.ts`, `not-found-page.spec.ts` |
| **Mobile** | `mobile.spec.ts` |
| **Other** | `freelances-page.spec.ts`

---

## 🧩 Test Suites (Exemples)

### Authentication & Users
- Login/logout, session persistence, protected routes
- Registration multi-étapes, validation formulaires
- Profile editing, avatar upload, preferences

### Map & Navigation
- Zone selection, category filters, view modes
- Marker interactions, sidebar, search
- Header navigation, theme toggle, i18n

### Employees & Establishments
- CRUD complet, photo gallery, reviews
- Verification flow, profile claim
- Ownership management, VIP features

### Gamification
- XP earning (reviews, check-ins)
- Badges, missions, leaderboard
- Streak system, level progression

### Admin Panel
- Dashboard stats, user management
- Content moderation, VIP verification
- Claims approval, bulk actions

### Accessibility & Performance
- WCAG 2.1 AA compliance
- Keyboard navigation, screen reader
- Lighthouse audits, Core Web Vitals

---

## 📸 Screenshots

Tests automatically capture screenshots on:
- ✅ Test completion (key visual states)
- ✅ Test failure (for debugging)

Screenshots saved to: `tests/e2e/screenshots/`

### Manual Screenshot Capture
```typescript
await page.screenshot({
  path: 'tests/e2e/screenshots/my-screenshot.png',
  fullPage: true
});
```

---

## 🔐 Authentication (Mock Auth)

**Important**: Les tests utilisent **Mock Auth par défaut** pour éviter le rate limiting Supabase.

### Pourquoi Mock Auth ?

| Problème | Solution Mock Auth |
|----------|-------------------|
| Rate limiting Supabase | Aucune requête auth réelle |
| Tests lents (~2s/login) | Instantané (~0.1s) |
| Flaky en CI/CD | 100% fiable |
| Dépendance réseau | Pas de dépendance |

### Usage par défaut (Mock)

```typescript
import { generateTestUser, registerUser, loginUser, loginAsAdmin } from './fixtures/testUser';

// Par défaut : Mock Auth (rapide, sans rate limiting)
const user = generateTestUser();
await registerUser(page, user);  // ← Mock automatique
await loginUser(page, user);     // ← Mock automatique

// Admin login (mock)
await loginAsAdmin(page);
```

### Forcer l'auth réelle (pour smoke/auth tests)

```typescript
// Force real Supabase auth
await registerUser(page, user, { useMock: false });
await loginUser(page, user, { useMock: false });
```

### API Mock Auth directe

```typescript
import { setupMockAuth, setupMockAdminAuth } from './fixtures/mockAuth';

test.beforeEach(async ({ page }) => {
  await setupMockAuth(page);  // User mock
  // ou
  await setupMockAdminAuth(page);  // Admin mock
});
```

### Fichiers concernés

| Fichier | Description |
|---------|-------------|
| `fixtures/mockAuth.ts` | Utilitaires mock Supabase |
| `fixtures/testUser.ts` | Intégration mock (défaut ON) |

---

## 🛠️ Test User Helper

`fixtures/testUser.ts` provides utilities:

```typescript
import { generateTestUser, registerUser, loginUser, loginAsAdmin } from './fixtures/testUser';

// Generate unique test user
const testUser = generateTestUser();
// → { email: 'test.e2e.1234567890.456@pattamap.test', username: 'TestUser...', password: '...' }

// Register (mock auth by default - fast, no rate limiting)
await registerUser(page, testUser);

// Login (mock auth by default)
await loginUser(page, testUser);

// Login as admin (mock auth by default)
await loginAsAdmin(page);

// Force real auth (only for authentication tests)
await registerUser(page, testUser, { useMock: false });

// Create review to earn XP (+50 XP)
await createReviewForXP(page);

// Check-in to establishment (+10 XP)
await checkInForXP(page);

// Get current XP from Header
const xp = await getCurrentXP(page);

// Wait for XP to update
await waitForXPUpdate(page, expectedXP, timeout);
```

---

## 🔑 Pre-Authenticated Sessions (storageState)

Tests use **pre-authenticated browser sessions** to avoid rate limiting and speed up test execution.

### How It Works

1. **Global Setup** (`global-setup.ts`) runs before all tests
2. Creates authenticated sessions for admin and owner users
3. Saves browser state (cookies, localStorage) to `.auth/` folder
4. Tests load this state instead of logging in each time

### Auth State Files

| File | User | Account Type | Usage |
|------|------|--------------|-------|
| `.auth/admin.json` | admin@test.com | Admin | Admin panel tests, VIP verification |
| `.auth/user.json` | owner@test.com | Establishment Owner | Owner dashboard, employee management |

### Using storageState in Tests

```typescript
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// For admin tests
const ADMIN_STATE_FILE = path.join(__dirname, '.auth', 'admin.json');

// For owner/user tests
const USER_STATE_FILE = path.join(__dirname, '.auth', 'user.json');

// Apply to all tests in file
test.use({
  storageState: ADMIN_STATE_FILE, // or USER_STATE_FILE
});

test.describe('My Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // User is already authenticated!
  });
});
```

### Mock Auth vs storageState

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **storageState** | Real cookies, faster, works with backend | Requires global-setup | Admin, Owner tests |
| **Mock Auth** | No backend needed, isolated | Frontend only | Unit-style E2E |

---

## 🚩 Feature Flags

Some tests depend on feature flags. Tests skip gracefully when features are disabled.

### Current Feature Flags

| Flag | Default | Tests Affected |
|------|---------|----------------|
| `VITE_FEATURE_VIP_SYSTEM` | `false` | `admin-vip-verification.spec.ts`, `vip-*.spec.ts` |
| `VITE_FEATURE_PAYMENTS` | `false` | Payment flow tests |
| `VITE_FEATURE_GAMIFICATION` | `true` | `gamification.spec.ts` |

### Enabling VIP Tests

To run VIP verification tests, set in `.env`:
```env
VITE_FEATURE_VIP_SYSTEM=true
VITE_FEATURE_PAYMENTS=true
```

### How Tests Handle Disabled Features

```typescript
// Tests check if feature is enabled before running
async function isVIPEnabled(page): Promise<boolean> {
  await page.goto('/admin');
  const vipTab = page.locator('[data-testid="vip-verification-link"]');
  return await vipTab.isVisible({ timeout: 5000 }).catch(() => false);
}

test('VIP specific test', async ({ page }) => {
  if (!await isVIPEnabled(page)) {
    test.skip(); // Skip gracefully, not fail
    return;
  }
  // ... test code
});
```

---

## ⚙️ Configuration

`playwright.config.ts` includes:
- **Base URL**: http://localhost:3000
- **Timeout**: 60s per test
- **Workers**: 1 (sequential execution to avoid DB conflicts)
- **Projects**:
  - `chromium-desktop` (1920×1080)
  - `chromium-mobile` (375×812 iPhone 12)
  - `chromium-tablet` (1024×1366 iPad Pro)
- **Web Server**: Auto-starts backend + frontend before tests
- **Reports**: HTML + JSON
- **Screenshots**: Captured on failure
- **Video**: Retained on failure
- **Trace**: Retained on failure

---

## 🐛 Debugging

### Method 1: Playwright Inspector
```bash
npm run test:e2e:debug
```
- Step through tests line by line
- Inspect DOM elements
- View console logs

### Method 2: Headed Mode
```bash
npm run test:e2e:headed
```
- See browser window during test execution
- Useful for visual debugging

### Method 3: Trace Viewer
```bash
npx playwright test --trace on
npx playwright show-trace trace.zip
```
- Full recording of test execution
- Network requests, console logs, DOM snapshots

### Method 4: Pause in Code
```typescript
await page.pause(); // Test pauses, opens Playwright Inspector
```

---

## 📊 Test Reports

### HTML Report (Interactive)
```bash
npm run test:report
```
Opens: `tests/e2e/reports/html/index.html`

Features:
- ✅ Pass/fail status per test
- ✅ Screenshots on failure
- ✅ Execution time
- ✅ Error stack traces

### JSON Report
```json
// tests/e2e/reports/results.json
{
  "suites": [...],
  "stats": {
    "total": 35,
    "expected": 35,
    "unexpected": 0,
    "skipped": 0
  }
}
```

---

## 🚨 Troubleshooting

### Issue: Tests timeout on CI/CD
**Solution**: Increase `timeout` in `playwright.config.ts`
```typescript
timeout: 120 * 1000, // 2 minutes
```

### Issue: "Cannot find element" errors
**Solution**: Adjust selectors in tests or increase `actionTimeout`
```typescript
await expect(page.locator('button')).toBeVisible({ timeout: 15000 });
```

### Issue: Database conflicts (parallel tests)
**Solution**: Already configured `workers: 1` for sequential execution

### Issue: Supabase rate limiting ("Too many requests")
**Solution**: Mock Auth est activé par défaut. Si vous voyez cette erreur:
1. Vérifiez que vous utilisez `registerUser(page, user)` sans `{ useMock: false }`
2. Ou utilisez directement `setupMockAuth(page)` dans `beforeEach`
```typescript
import { setupMockAuth } from './fixtures/mockAuth';
test.beforeEach(async ({ page }) => {
  await setupMockAuth(page);
});
```

### Issue: Backend/frontend not running
**Solution**: Config auto-starts servers via `webServer` option. If fails:
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
npm start

# Terminal 3
npm run test:e2e
```

### Issue: Missing screenshots
**Solution**: Check `tests/e2e/screenshots/` folder permissions or:
```bash
mkdir -p tests/e2e/screenshots
```

---

## 📈 Metrics

| Metric | Value |
|--------|-------|
| **Total Tests** | ~1,016 tests |
| **Test Files** | 45 fichiers |
| **Browsers** | 8 projets (Chrome, Firefox, Safari, Edge × Desktop/Mobile) |
| **Screenshots** | Auto-generated on failure |
| **Execution Time** | ~15-20 min (sequential, all browsers) |
| **Code Coverage** | ~95% fonctionnalités UI |

---

## 🎯 Completed Features

- ✅ **Multi-browser**: Chrome, Firefox, Safari, Edge
- ✅ **Accessibility**: WCAG 2.1 AA, axe-core audit
- ✅ **Mock Auth**: Évite rate limiting Supabase
- ✅ **Performance**: Lighthouse audits
- ✅ **PWA**: Offline, service worker tests

### Prochaines Améliorations Possibles
1. **Visual Regression**: Screenshot comparison
2. **CI/CD**: GitHub Actions workflow
3. **Load Testing**: Stress tests avec data volumineuse

---

## 📚 Resources

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Playwright Inspector**: https://playwright.dev/docs/debug#playwright-inspector
- **Best Practices**: https://playwright.dev/docs/best-practices

---

**Updated**: December 2025
**Tests**: 45 files, ~1,016 tests
**Coverage**: ~95% UI functionality

🎮 **Happy Testing!**
