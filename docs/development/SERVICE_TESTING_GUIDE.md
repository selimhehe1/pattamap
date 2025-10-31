# Service Testing Guide

## Overview

This guide explains how to write comprehensive tests for PattaMap services using Jest, TypeScript, and our standardized mocking patterns.

## Table of Contents

- [Getting Started](#getting-started)
- [Mock Setup Pattern](#mock-setup-pattern)
- [Testing Services](#testing-services)
- [Common Patterns](#common-patterns)
- [Examples](#examples)
- [Coverage Requirements](#coverage-requirements)

---

## Getting Started

All service tests are located in `backend/src/services/__tests__/`

### File Structure
```
backend/src/services/
├── gamificationService.ts
├── badgeAwardService.ts
├── pushService.ts
└── __tests__/
    ├── gamificationService.test.ts
    ├── badgeAwardService.test.ts
    └── pushService.test.ts
```

### Running Tests

```bash
# Run all service tests
npm test services/__tests__

# Run specific service tests
npm test gamificationService.test.ts

# Run with coverage
npm test -- --coverage services/__tests__

# Watch mode
npm run test:watch gamificationService
```

---

## Mock Setup Pattern

### Standard Mock Configuration

All service tests follow this standardized pattern:

```typescript
// 1. Import mock helpers FIRST
import { createMockQueryBuilder, mockSuccess, mockNotFound, mockError } from '../../config/__mocks__/supabase';

// 2. Mock dependencies with explicit factory
jest.mock('../../config/supabase', () => {
  const mockModule = jest.requireActual('../../config/__mocks__/supabase');
  return {
    supabase: mockModule.supabase,
    supabaseClient: mockModule.supabaseClient,
    createMockQueryBuilder: mockModule.createMockQueryBuilder,
    mockSuccess: mockModule.mockSuccess,
    mockNotFound: mockModule.mockNotFound,
    mockError: mockModule.mockError,
  };
});

jest.mock('../../utils/logger');

// 3. Import service AFTER jest.mock
import { supabase } from '../../config/supabase';
import { myService } from '../myService';

describe('MyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.from = jest.fn(); // Reset to prevent mock pollution
  });
});
```

### Why This Pattern?

1. **Explicit Factory**: Ensures mock module is loaded correctly
2. **Import Order**: Mocks must be set up before importing the service
3. **Reset in beforeEach**: Prevents test pollution and flaky tests

---

## Testing Services

### Pure Functions (No Database)

Pure functions are the easiest to test - no mocking required!

```typescript
describe('calculateLevel', () => {
  it('should return level 1 for 0 XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('should return level 2 for 100-199 XP', () => {
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(150)).toBe(2);
    expect(calculateLevel(199)).toBe(2);
  });

  it('should handle negative XP', () => {
    expect(calculateLevel(-100)).toBe(1);
  });
});
```

### Async Functions with Database

For async functions that interact with Supabase:

```typescript
describe('getUserPoints', () => {
  it('should return user points if found', async () => {
    const mockPoints = {
      total_xp: 250,
      monthly_xp: 100,
      current_level: 3
    };

    (supabase.from as jest.Mock).mockReturnValueOnce(
      createMockQueryBuilder(mockSuccess(mockPoints))
    );

    const result = await getUserPoints('user-123');

    expect(result).toEqual(mockPoints);
    expect(supabase.from).toHaveBeenCalledWith('user_points');
  });

  it('should return null if not found', async () => {
    (supabase.from as jest.Mock).mockReturnValueOnce(
      createMockQueryBuilder(mockNotFound())
    );

    const result = await getUserPoints('user-123');

    expect(result).toBeNull();
  });

  it('should handle database errors', async () => {
    (supabase.from as jest.Mock).mockReturnValueOnce(
      createMockQueryBuilder(mockError('Database error'))
    );

    const result = await getUserPoints('user-123');

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });
});
```

### Sequential Database Queries

For functions that make multiple database calls:

```typescript
it('should award XP and update user_points', async () => {
  const existingPoints = { total_xp: 100, current_level: 2 };

  // Mock queries in order: 1) insert transaction, 2) fetch points, 3) update points
  (supabase.from as jest.Mock)
    .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'tx-1' })))
    .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(existingPoints)))
    .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'points-1' })));

  await awardXP('user-123', 50, 'review_created');

  expect(supabase.from).toHaveBeenCalledWith('xp_transactions');
  expect(supabase.from).toHaveBeenCalledWith('user_points');
});
```

---

## Common Patterns

### 1. Testing Validation

```typescript
it('should throw error if userId is missing', async () => {
  await expect(awardXP('', 50, 'review_created'))
    .rejects.toThrow('userId is required');
});

it('should throw error if xpAmount is negative', async () => {
  await expect(awardXP('user-123', -10, 'review_created'))
    .rejects.toThrow('xpAmount must be positive');
});

it('should throw error if xpAmount is not integer', async () => {
  await expect(awardXP('user-123', 10.5, 'review_created'))
    .rejects.toThrow('xpAmount must be an integer');
});
```

### 2. Testing Error Handling

```typescript
it('should handle database errors gracefully', async () => {
  (supabase.from as jest.Mock).mockReturnValueOnce(
    createMockQueryBuilder(mockError('Connection failed'))
  );

  await expect(myFunction()).rejects.toThrow('Connection failed');
  expect(logger.error).toHaveBeenCalledWith(
    'Error message',
    expect.any(Object)
  );
});
```

### 3. Testing Empty States

```typescript
it('should return empty array when no data found', async () => {
  (supabase.from as jest.Mock).mockReturnValueOnce(
    createMockQueryBuilder(mockSuccess([]))
  );

  const result = await getItems();

  expect(result).toEqual([]);
});
```

### 4. Testing with Multiple `.eq()` Calls

When a query chains multiple `.eq()` calls:

```typescript
it('should check with multiple conditions', async () => {
  const mockBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis()
  };
  mockBuilder.eq = jest.fn()
    .mockReturnValueOnce(mockBuilder) // First eq returns builder
    .mockResolvedValueOnce({ count: 10, error: null }); // Second eq resolves

  (supabase.from as jest.Mock).mockReturnValueOnce(mockBuilder);

  const result = await checkRequirement();

  expect(result).toBe(true);
});
```

### 5. Testing Singleton Services

For services exported as singletons (classes):

```typescript
it('should award badge successfully', async () => {
  // Access private methods via type casting
  const service = badgeAwardService as any;
  const result = await service.awardBadge('user-123', 'badge-1', 'Badge Name');

  expect(result).toBe(true);
});
```

### 6. Testing with Environment Variables

Set env vars BEFORE importing modules that read them at init:

```typescript
// At top of test file, before imports
process.env.VAPID_PUBLIC_KEY = 'test-key';
process.env.VAPID_PRIVATE_KEY = 'test-private-key';

import { pushService } from '../pushService';

describe('PushService', () => {
  // Tests here
});
```

### 7. Testing Batch Operations

```typescript
it('should process large batches', async () => {
  const mockData = Array(150).fill(null).map((_, i) => ({
    id: `item-${i}`
  }));

  (supabase.from as jest.Mock).mockReturnValueOnce(
    createMockQueryBuilder(mockSuccess(mockData))
  );

  const result = await processBatch(mockData);

  expect(result).toBe(150);
});
```

---

## Examples

### Example 1: gamificationService

See `backend/src/services/__tests__/gamificationService.test.ts`

- **26 tests**, 100% coverage
- Tests pure functions (calculateLevel)
- Tests async functions with validation
- Tests sequential database operations
- Tests error handling

### Example 2: badgeAwardService

See `backend/src/services/__tests__/badgeAwardService.test.ts`

- **21 tests**, 100% coverage
- Tests singleton class methods
- Tests requirement checking logic
- Tests duplicate prevention (unique constraint errors)
- Tests complex filtering logic

### Example 3: pushService

See `backend/src/services/__tests__/pushService.test.ts`

- **16 tests**, 100% coverage
- Tests with external library mocking (web-push)
- Tests batch processing
- Tests environment variable configuration
- Tests error handling (404/410 expired subscriptions)

---

## Coverage Requirements

### Global Thresholds

```javascript
coverageThreshold: {
  global: {
    statements: 70,
    branches: 65,
    functions: 70,
    lines: 70
  }
}
```

### Service-Specific Thresholds

Critical services have higher requirements:

- **gamificationService**: 90% statements, 85% branches
- **badgeAwardService**: 85% statements, 80% branches
- **pushService**: 80% statements, 75% branches

### Checking Coverage

```bash
# Run tests with coverage report
npm test -- --coverage services/__tests__

# View HTML report
open backend/coverage/index.html
```

---

## Best Practices

### ✅ DO

- Write tests for all public functions
- Test error cases and edge cases
- Use descriptive test names: `should award XP and update user_points`
- Reset mocks in `beforeEach`
- Use `mockReturnValueOnce` for sequential calls
- Test validation logic thoroughly
- Check that logger is called appropriately

### ❌ DON'T

- Don't skip error handling tests
- Don't modify `process.env` after module imports
- Don't reuse mocks between tests without resetting
- Don't use actual database connections in tests
- Don't test implementation details (private methods unless necessary)
- Don't ignore flaky tests

---

## Troubleshooting

### Mock Not Being Used

**Problem**: Supabase queries not using mocks

**Solution**: Ensure explicit factory function:
```typescript
jest.mock('../../config/supabase', () => {
  const mockModule = jest.requireActual('../../config/__mocks__/supabase');
  return { supabase: mockModule.supabase, ... };
});
```

### Mock Pollution Between Tests

**Problem**: Tests fail when run together but pass individually

**Solution**: Reset `supabase.from` in `beforeEach`:
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  supabase.from = jest.fn(); // Important!
});
```

### TypeScript Type Errors

**Problem**: `Property 'user' does not exist on type 'Request'`

**Solution**: Use type casting:
```typescript
(mockRequest as any).user = { id: 'user-123' };
```

### Environment Variables Not Working

**Problem**: `getVapidPublicKey()` returns empty string

**Solution**: Set env vars BEFORE imports:
```typescript
// Top of file, before ALL imports
process.env.VAPID_PUBLIC_KEY = 'test-key';

import { pushService } from '../pushService';
```

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](./TESTING.md)
- [CI/CD Documentation](./CI_CD.md)
- [Coverage Reports](http://localhost:8000/coverage)

---

**Last Updated**: 2025-01-31
**Maintained by**: Development Team
