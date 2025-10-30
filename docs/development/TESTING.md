# 🧪 Guide de Tests - PattaMap

## Vue d'ensemble

**Coverage actuel**: 85%+ sur middleware critiques
**Total tests**: 33 tests (18 unitaires + 15 intégration)
**Frameworks**: Jest + Supertest (backend), Jest + React Testing Library (frontend)

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
backend/src/middleware/__tests__/
├── auth.test.ts         # 18 tests - JWT auth
└── csrf.test.ts         # 15 tests - CSRF protection
```

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
// setupTests.ts
import '@testing-library/jest-dom';
```

### Commandes

```bash
npm test                 # Run all tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # Coverage report
```

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

### Current Coverage

```
File                 | % Stmts | % Branch | % Funcs | % Lines
---------------------|---------|----------|---------|--------
middleware/auth.ts   |   92.5  |    85.7  |   100   |   92.1
middleware/csrf.ts   |   88.3  |    80.0  |   100   |   87.5
```

---

## E2E Testing (Planned)

### Cypress Setup

```bash
# Install
npm install --save-dev cypress

# Run
npx cypress open
```

### Example E2E Test

```typescript
// cypress/e2e/login.cy.ts
describe('Login Flow', () => {
  it('should login successfully', () => {
    cy.visit('/login');
    cy.get('[data-testid="email"]').type('user@example.com');
    cy.get('[data-testid="password"]').type('password');
    cy.get('[data-testid="submit"]').click();

    cy.url().should('include', '/dashboard');
    cy.contains('Welcome').should('be.visible');
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

## Dernière mise à jour

v9.3.0 (Octobre 2025)
