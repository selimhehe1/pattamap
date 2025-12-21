# 🧪 Guide de Tests - PattaMap

## Vue d'ensemble

**Dernière mise à jour**: 21 Décembre 2024

### Résumé Couverture

| Zone | Tests | Couverture | Status |
|------|-------|------------|--------|
| **Backend** | 299 tests | 85%+ middleware | ✅ Excellent |
| **Frontend Hooks** | 7 fichiers | 89% stmts, 74% branches | ✅ Excellent |
| **Frontend Utils** | 3 fichiers | 85% stmts, 72% branches | ✅ Bon |
| **Frontend Contexts** | 7 fichiers | 63%+ | ✅ Bon |
| **E2E (Playwright)** | 46 tests | Parcours critiques | ✅ Complet |

**Frameworks**: Jest + Supertest (backend), Vitest + React Testing Library (frontend), Playwright (E2E)

---

## Backend Tests

### Configuration

```javascript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ]
};
```

### Commandes

```bash
cd backend

npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm test -- auth.test    # Run specific file
```

### Structure Tests

```
backend/src/
├── middleware/__tests__/
│   ├── auth.test.ts           # 18 tests - JWT authentication
│   ├── csrf.test.ts           # 15 tests - CSRF protection
│   ├── rateLimit.test.ts      # 26 tests - Rate limiting
│   ├── refreshToken.test.ts   # 22 tests - JWT refresh tokens
│   └── auditLog.test.ts       # 34 tests - Audit logging
│
├── controllers/__tests__/
│   ├── authController.test.ts       # 25 tests
│   ├── employeeController.test.ts   # 40 tests
│   ├── vipController.test.ts        # 40 tests
│   ├── commentController.test.ts    # 28 tests
│   ├── favoriteController.test.ts   # 13 tests
│   ├── notificationController.test.ts # 18 tests
│   ├── pushController.test.ts       # 29 tests
│   ├── uploadController.test.ts     # 15 tests
│   └── ownershipRequestController.test.ts # 18 tests
│
├── services/__tests__/
│   ├── gamificationService.test.ts  # ~15 tests
│   ├── badgeAwardService.test.ts    # ~15 tests
│   └── pushService.test.ts          # 16 tests
│
└── utils/__tests__/
    └── notificationHelper.test.ts   # 41 tests
```

**Total Backend**: 299 tests

### Exemple Test - Authentication

```typescript
// backend/src/middleware/__tests__/auth.test.ts
import { Request, Response } from 'express';
import { authenticateToken } from '../auth';

describe('authenticateToken Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = { cookies: {}, headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should authenticate with valid cookie token', async () => {
    const token = jwt.sign({ userId: '123', role: 'user' }, JWT_SECRET);
    req.cookies = { 'auth-token': token };

    await authenticateToken(req as Request, res as Response, next);

    expect(req.user).toBeDefined();
    expect(req.user?.userId).toBe('123');
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if no token provided', async () => {
    await authenticateToken(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied' });
    expect(next).not.toHaveBeenCalled();
  });
});
```

### Exemple Test - CSRF

```typescript
// backend/src/middleware/__tests__/csrf.test.ts
describe('CSRF Protection', () => {
  it('should reject request without CSRF token', async () => {
    const response = await request(app)
      .post('/api/comments')
      .set('Cookie', `auth-token=${validToken}`)
      .send({ text: 'Test comment' });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Invalid CSRF token');
  });

  it('should accept request with valid CSRF token', async () => {
    const csrfToken = 'valid-token';

    const response = await request(app)
      .post('/api/comments')
      .set('Cookie', `auth-token=${validToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ text: 'Test comment' });

    expect(response.status).toBe(201);
  });
});
```

---

## Frontend Tests

### Configuration

```javascript
// vitest.config.ts - Vitest pour tests unitaires
// playwright.config.ts - Playwright pour E2E
```

### Commandes

```bash
npm test                        # Run tous tests Vitest
npm test -- --watch             # Watch mode
npm test -- --coverage          # Coverage report
npm run test:e2e                # Run tests Playwright E2E
```

### Structure Tests Frontend

```
src/
├── hooks/__tests__/
│   ├── useEmployees.test.ts        # 31 tests (99% coverage)
│   ├── useEstablishments.test.ts   # 26 tests (99% coverage)
│   ├── useFavorites.test.ts        # 25 tests (91% coverage)
│   ├── useOfflineQueue.test.ts     # 20 tests (89% coverage)
│   ├── useSecureFetch.test.ts      # 23 tests (76% coverage)
│   ├── useAutoSave.test.ts         # 10 tests (90% coverage)
│   └── useFormValidation.test.ts   # 13 tests (86% coverage)
│
├── utils/__tests__/
│   ├── cloudinary.test.ts          # ~20 tests (95% coverage)
│   ├── offlineQueue.test.ts        # 33 tests (90% coverage)
│   └── pushManager.test.ts         # 43 tests (96% coverage)
│
└── contexts/__tests__/
    ├── SidebarContext.test.tsx       # 6 tests (100% coverage)
    ├── MapControlsContext.test.tsx   # 12 tests (100% coverage)
    ├── ThemeContext.test.tsx         # 19 tests (76% coverage)
    ├── ModalContext.test.tsx         # 25 tests (95% coverage)
    ├── CSRFContext.test.tsx          # 11 tests (93% coverage)
    ├── GamificationContext.test.tsx  # 16 tests
    └── AuthContext.test.tsx          # 16 tests (79% coverage)
```

### Lacunes Mineures (Faible Priorité)

| Fichier | Couverture | Priorité | Raison |
|---------|------------|----------|--------|
| `haptics.ts` | 17% | BASSE | Mobile-only, edge case |
| `toast.ts` | 60% | BASSE | UI feedback simple |
| `logger.ts` | 61% | BASSE | Dev tooling |
| `useFocusTrap.ts` | 21% | BASSE | A11y edge case |
| `useRewards.ts` | 72% | MOYENNE | Gamification |

### Exemple Test - Component

```typescript
// src/components/__tests__/EmployeeCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { EmployeeCard } from '../EmployeeCard';

describe('EmployeeCard', () => {
  const mockEmployee = {
    id: '1',
    name: 'Jane Doe',
    age: 25,
    nationality: 'Thai'
  };

  it('should render employee name', () => {
    render(<EmployeeCard employee={mockEmployee} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('should call onEdit when edit button clicked', () => {
    const onEdit = jest.fn();
    render(<EmployeeCard employee={mockEmployee} onEdit={onEdit} />);

    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith('1');
  });
});
```

### Exemple Test - Hook

```typescript
// src/hooks/__tests__/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';

describe('useAuth', () => {
  it('should login successfully', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('user@example.com', 'password');
    });

    expect(result.current.user).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

---

## Frontend Context Tests

### Vue d'ensemble

**105 tests** couvrant les **7 contextes React** du frontend avec **63.45% coverage**.

### Structure Tests

```
src/contexts/__tests__/
├── SidebarContext.test.tsx      # 6 tests - Sidebar state (100% coverage)
├── MapControlsContext.test.tsx  # 12 tests - Map controls (100% coverage)
├── ThemeContext.test.tsx        # 19 tests - Theme switching (76.54% coverage)
├── ModalContext.test.tsx        # 25 tests - Modal stack (94.82% coverage)
├── CSRFContext.test.tsx         # 11 tests - CSRF tokens (93.1% coverage)
├── GamificationContext.test.tsx # 16 tests - XP/levels (via mock provider)
└── AuthContext.test.tsx         # 16 tests - Auth state (79.43% coverage)
```

### Commandes

```bash
# Run tous les tests contexts
npm test -- --testPathPattern="contexts/__tests__"

# Run avec coverage
npm test -- --coverage --collectCoverageFrom="src/contexts/**/*.tsx"

# Run un fichier spécifique
npm test -- AuthContext.test.tsx
```

### Exemple Test - Context avec Hook

```typescript
// src/contexts/__tests__/ModalContext.test.tsx
import { renderHook, act } from '@testing-library/react';
import { ModalProvider, useModal } from '../ModalContext';

describe('ModalContext', () => {
  it('should open modal and add to stack', () => {
    const { result } = renderHook(() => useModal(), {
      wrapper: ModalProvider,
    });

    act(() => {
      result.current.openModal('test-modal', MockComponent);
    });

    expect(result.current.modals.length).toBe(1);
    expect(result.current.modals[0].id).toBe('test-modal');
  });

  it('should throw when used outside provider', () => {
    expect(() => {
      renderHook(() => useModal());
    }).toThrow('useModal must be used within a ModalProvider');
  });
});
```

### Patterns de Test Contexts

**1. Mock Provider Pattern** (pour contexts complexes):
```typescript
const createTestProvider = (initialState) => {
  const TestProvider = ({ children }) => {
    const [state, setState] = useState(initialState);
    return (
      <MyContext.Provider value={{ state, setState }}>
        {children}
      </MyContext.Provider>
    );
  };
  return TestProvider;
};
```

**2. Mock Date.now()** (pour timestamps):
```typescript
let mockTime = 1000;
vi.spyOn(Date, 'now').mockImplementation(() => mockTime++);
// ... test with unique timestamps
vi.restoreAllMocks();
```

**3. Mock fetch** (pour API calls):
```typescript
const mockFetch = vi.fn();
global.fetch = mockFetch;

mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ data: 'test' }),
});
```

---

## Testing Best Practices

### AAA Pattern

```typescript
it('should do something', () => {
  // Arrange - Setup
  const input = 'test';
  const expected = 'TEST';

  // Act - Execute
  const result = transform(input);

  // Assert - Verify
  expect(result).toBe(expected);
});
```

### Mock External Dependencies

```typescript
// Mock Supabase
jest.mock('@/config/database', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ data: {}, error: null })
    }))
  }
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: 'test' })
  })
) as jest.Mock;
```

### Test Error Cases

```typescript
it('should handle API errors gracefully', async () => {
  // Mock error
  jest.spyOn(api, 'fetchData').mockRejectedValue(new Error('Network error'));

  render(<MyComponent />);

  // Should display error message
  expect(await screen.findByText(/error/i)).toBeInTheDocument();
});
```

---

## Coverage Goals

### Targets
- **Critical Paths**: 100% (auth, payment, security)
- **Business Logic**: 90%+
- **UI Components**: 80%+
- **Utilities**: 95%+

### Current Coverage (Décembre 2024)

**Backend Middleware**:
```
File                   | % Stmts | % Branch | % Funcs | % Lines
-----------------------|---------|----------|---------|--------
middleware/auth.ts     |   92.5  |    85.7  |   100   |   92.1
middleware/csrf.ts     |   88.3  |    80.0  |   100   |   87.5
middleware/rateLimit.ts|   90+   |    85+   |   100   |   90+
middleware/refreshToken|   90+   |    85+   |   100   |   90+
middleware/auditLog.ts |   90+   |    85+   |   100   |   90+
```

**Frontend Hooks** (89% statements, 74% branches):
```
File                      | % Stmts | % Branch | % Funcs | % Lines
--------------------------|---------|----------|---------|--------
useEmployees.ts           |   99    |    90+   |   100   |   99
useEstablishments.ts      |   99    |    90+   |   100   |   99
useFavorites.ts           |   91    |    80+   |   100   |   91
useOfflineQueue.ts        |   89    |    75+   |   100   |   89
useSecureFetch.ts         |   76    |    65+   |   90+   |   76
useAutoSave.ts            |   90    |    80+   |   100   |   90
useFormValidation.ts      |   86    |    75+   |   100   |   86
```

**Frontend Utils** (85% statements, 72% branches):
```
File                      | % Stmts | % Branch | % Funcs | % Lines
--------------------------|---------|----------|---------|--------
cloudinary.ts             |   95    |    85+   |   100   |   95
offlineQueue.ts           |   90    |    80+   |   100   |   90
pushManager.ts            |   96    |    85+   |   100   |   96
```

---

## E2E Testing (Playwright)

**46 tests E2E** couvrant les parcours utilisateur critiques.

### Commandes

```bash
npm run test:e2e              # Run tous tests
npm run test:e2e -- --ui      # Mode UI interactif
npm run test:e2e -- --debug   # Mode debug
```

### Structure Tests E2E

```
e2e/
├── user-search.spec.ts          # Recherche utilisateur
├── owner-management.spec.ts     # Gestion propriétaires
├── admin-vip.spec.ts            # VIP administration
├── map-performance.spec.ts      # Performance cartes
└── auth-integration.spec.ts     # Authentification (15 tests)
```

### Example E2E Test

```typescript
// e2e/auth-integration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Welcome')).toBeVisible();
  });
});
```

---

## CI/CD Integration (Planned)

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm test
      - run: cd backend && npm ci && npm test
```

---

## 🚀 CI/CD Integration

### GitHub Actions Workflow

Les tests s'exécutent automatiquement sur chaque push/PR via GitHub Actions.

**Workflow**: `.github/workflows/test.yml`

**4 jobs parallèles**:
1. **Backend Tests** - Jest avec coverage
2. **Frontend Tests** - React Testing Library
3. **Lint** - ESLint code quality
4. **Type Check** - TypeScript compilation

**Triggers**:
```yaml
on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]
```

**Voir détails**: [docs/development/CI_CD.md](./CI_CD.md)

---

## 📊 Coverage Requirements

### Seuils Globaux

```javascript
// backend/jest.config.js
coverageThreshold: {
  global: {
    statements: 70,
    branches: 65,
    functions: 70,
    lines: 70
  }
}
```

### Seuils Services (Plus élevés)

| Service | Statements | Branches | Functions | Lines |
|---------|-----------|----------|-----------|-------|
| gamificationService | 90% | 85% | 90% | 90% |
| badgeAwardService | 85% | 80% | 85% | 85% |
| pushService | 80% | 75% | 80% | 80% |

### Coverage Actuelle (Décembre 2024)

| Module | Tests | Coverage | Status |
|--------|-------|----------|--------|
| **Middleware** | 115 tests | 90%+ | ✅ Excellent |
| **Services** | 46+ tests | 90%+ | ✅ Excellent |
| **Controllers** | 225+ tests | 80%+ | ✅ Excellent |
| **Utils Backend** | 41 tests | 85%+ | ✅ Excellent |
| **Frontend Hooks** | 148 tests | 89% stmts | ✅ Excellent |
| **Frontend Utils** | 96 tests | 85% stmts | ✅ Bon |
| **Frontend Contexts** | 105 tests | 63%+ | ✅ Bon |
| **E2E (Playwright)** | 46 tests | N/A | ✅ Implémenté |
| **TOTAL** | **~820 tests** | - | ✅ Excellent |

### Commandes Coverage

```bash
# Backend coverage complet
cd backend
npm test -- --coverage

# View HTML report
open coverage/index.html

# Coverage par service
npm test services/__tests__ -- --coverage

# Coverage par controller
npm test controllers/__tests__ -- --coverage
```

### Codecov Integration

Coverage reports automatiquement uploadés vers [Codecov](https://codecov.io) après chaque CI run.

**Voir dans Codecov**:
- Coverage trends over time
- Line-by-line coverage
- Coverage diffs dans PRs
- Sunburst visualization

---

## 📚 Documentation Tests Supplémentaire

### Service Testing

Guide complet pour tester les services avec mocks Supabase:
→ [docs/development/SERVICE_TESTING_GUIDE.md](./SERVICE_TESTING_GUIDE.md)

**Topics couverts**:
- Mock setup pattern
- Testing pure functions
- Testing async with database
- Sequential queries
- Error handling
- Environment variables

### CI/CD Documentation

Guide complet GitHub Actions workflow:
→ [docs/development/CI_CD.md](./CI_CD.md)

**Topics couverts**:
- Workflow overview
- Job configuration
- Coverage reports
- Troubleshooting
- Optimization tips

---

## Dernière mise à jour

v10.4.1 (21 Décembre 2024) - Audit tests complet
- Backend: 299 tests passants
- Frontend Hooks: 89% statements, 74% branches
- Frontend Utils: 85% statements, 72% branches
- E2E Playwright: 46 tests
