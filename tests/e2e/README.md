# 🧪 PattaMap E2E Tests - Gamification System

Playwright end-to-end tests for PattaMap gamification features.

---

## 📋 Overview

Tests complete user flows for gamification:
- ✅ User registration & first XP earning
- ✅ Achievements page navigation (4 tabs: Overview, Badges, Missions, Leaderboard)
- ✅ Mission progress tracking (daily/weekly)
- ✅ Leaderboard functionality (global/monthly)
- ✅ Badge showcase (locked/unlocked)
- ✅ Mobile responsive (375×812 iPhone 12)
- ✅ Landscape orientation (812×375)

**Test Coverage**: ~35+ tests across 11 suites

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
├── README.md                    # This file
├── gamification.spec.ts         # Main gamification tests (5 suites, ~20 tests)
├── mobile.spec.ts               # Mobile responsive tests (6 suites, ~15 tests)
├── fixtures/
│   └── testUser.ts              # Helper functions (register, login, award XP)
├── screenshots/                 # Auto-generated screenshots
│   ├── 1-header-with-xp-desktop.png
│   ├── 2-achievements-overview-desktop.png
│   ├── 3-achievements-badges-desktop.png
│   ├── 4-achievements-missions-desktop.png
│   ├── 5-achievements-leaderboard-desktop.png
│   ├── 6-mission-completed.png
│   ├── 7-leaderboard-with-user.png
│   ├── 8-badges-showcase.png
│   ├── mobile-1-header-xp.png
│   ├── mobile-2-achievements-overview.png
│   ├── mobile-3-leaderboard.png
│   ├── mobile-4-badges.png
│   ├── mobile-5-missions.png
│   └── mobile-6-landscape.png
└── reports/                     # Test reports (HTML, JSON)
    ├── html/                    # HTML report (open index.html)
    └── results.json             # JSON results
```

---

## 🧩 Test Suites

### 1. User Registration & First XP (gamification.spec.ts)
- ✅ Register new user → GamificationContext loads
- ✅ Create review → Earn +50 XP → Header updates
- ✅ Unlock "First Review" badge

### 2. Achievements Page Navigation
- ✅ Navigate to /achievements → 4 tabs render
- ✅ Overview tab → 4 stat cards (Total XP, Streak, Monthly, Longest)
- ✅ Badges tab → BadgeShowcase (locked/unlocked)
- ✅ Missions tab → MissionsDashboard (daily/weekly/narrative)
- ✅ Leaderboard tab → Rankings (global/monthly)

### 3. Mission Progress Tracking
- ✅ Check-in to establishment → "Explorer" mission 0/1 → 1/1
- ✅ XP awarded (+10 XP)

### 4. Leaderboard Functionality
- ✅ User appears in leaderboard
- ✅ Switch between Global ↔ Monthly tabs

### 5. Badge Showcase
- ✅ Display locked badges (greyscale)
- ✅ Display unlocked badges (colored + glow)
- ✅ Badge tooltips on hover

### 6. Mobile Responsive (mobile.spec.ts)
- ✅ Header XP indicator on mobile
- ✅ XP progress bar
- ✅ Achievements page responsive layout
- ✅ Stat cards 2×2 grid
- ✅ Tab navigation
- ✅ Badges responsive grid
- ✅ Missions vertical stack
- ✅ Touch interactions (tap, scroll)
- ✅ Landscape orientation (812×375)

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

## 🛠️ Test User Helper

`fixtures/testUser.ts` provides utilities:

```typescript
import { generateTestUser, registerUser, loginUser } from './fixtures/testUser';

// Generate unique test user
const testUser = generateTestUser();
// → { email: 'test.e2e.1234567890.456@pattamap.test', username: 'TestUser...', password: '...' }

// Register via frontend UI
await registerUser(page, testUser);

// Login via frontend UI
await loginUser(page, testUser);

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
| **Total Tests** | ~35 tests |
| **Test Suites** | 11 suites |
| **Screenshots** | 14+ auto-generated |
| **Execution Time** | ~3-5 min (sequential) |
| **Code Coverage** | E2E user flows |

---

## 🎯 Next Steps

### Short Term
1. **Run tests locally**: `npm run test:e2e:headed`
2. **Adjust selectors**: If tests fail, update selectors to match your UI components
3. **Add test data**: Seed database with test establishments for `createReviewForXP()`

### Medium Term
1. **Visual Regression**: Add `@playwright/test` screenshot comparison
2. **Accessibility Tests**: Add `@axe-core/playwright` checks
3. **Performance Tests**: Measure Leaderboard query times

### Long Term
1. **CI/CD Integration**: GitHub Actions workflow for automated E2E tests
2. **Cross-browser**: Add Firefox + Safari projects
3. **Load Testing**: Test with 100+ users in leaderboard

---

## 📚 Resources

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Playwright Inspector**: https://playwright.dev/docs/debug#playwright-inspector
- **Best Practices**: https://playwright.dev/docs/best-practices
- **Selectors Guide**: https://playwright.dev/docs/selectors

---

**Created**: October 2025
**Maintained by**: PattaMap Team
**Questions?**: Check docs or file an issue

🎮 **Happy Testing!**
