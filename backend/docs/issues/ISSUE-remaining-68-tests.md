# Fix Remaining 68 Integration Tests (88% → 100% passing)

## 📊 Current Status
- **Passing**: 509/578 tests (88.0%)
- **Failing**: 68 tests across 7 test suites
- **Progress**: +3 tests fixed in Phase 1 (from 71 to 68 failing)

## ✅ Phase 1 Completed (Commit 28b41d5)
1. Created shared helper `backend/src/test-helpers/supabaseMockChain.ts`
2. Fixed `admin.complete.test.ts` - Improved `createDefaultChain` helper
3. Fixed `admin.integration.test.ts` - Endpoint paths + response structure
4. Fixed `establishments.integration.test.ts` - Replaced 4 manual mocks
5. Fixed `missionTrackingService.test.ts` - Updated for RPC implementation

## ❌ Remaining Failures (7 test suites, 68 tests)

### 1. **missionTrackingService.test.ts** (6 failing)
**Location**: `backend/src/services/__tests__/missionTrackingService.test.ts`

**Failures**:
- `getReviewsWithPhotosCount › should return 0 (Phase 3 placeholder)` - Expected 0, received 3
- `getThisWeekMonday › should return Monday 00:00:00 of current week` - Day mismatch
- `getThisWeekMonday › should handle Sunday correctly` - Day mismatch  
- `should handle missions without count requirement (default to 1)`
- `should not award duplicate badges`

**Root Cause**: Tests expect old implementation behavior. Implementation now uses:
- RPC functions for progress updates
- Different date handling for weekly missions
- Photo uploads table for counting

**Estimated Fix**: 1-2 hours (update test expectations to match RPC implementation)

---

### 2. **establishments.integration.test.ts** (7 failing)
**Location**: `backend/src/routes/__tests__/establishments.integration.test.ts`

**Failures**:
- `GET /api/establishments › should return 200 OK with array of establishments`
- `GET /api/establishments › should filter by zone parameter`
- `GET /api/establishments/:id › should return 200 OK with single establishment`
- `POST /api/establishments › should return 403 Forbidden for user role`
- `POST /api/establishments › should return 403 Forbidden without CSRF token`
- `PUT /api/establishments/:id › should update establishment with valid admin credentials`
- `GET /api/establishments/my-owned › should return owned establishments`

**Root Cause**: Phase 1 fixed 4 mocks, but more manual mocks remain in:
- POST/PUT tests (auth + CSRF mocks)
- my-owned endpoint (ownership table mocks)

**Estimated Fix**: 2-3 hours (replace remaining manual mocks with `createMockChain`)

---

### 3. **admin.integration.test.ts** (3 failing)
**Location**: `backend/src/routes/__tests__/admin.integration.test.ts`

**Failures**:
- `should return 403 Forbidden for regular user` - Expected 403, got 404
- `GET /api/admin/dashboard-stats › should return dashboard statistics` - ✅ FIXED in Phase 1
- `POST /api/admin/users/:id/role › should allow admin to update user roles` - Expected [200, 400], got 500

**Root Cause**:
- Test 1: Route not found (404) before auth check (403)
- Test 3: Complex `mockImplementation` with nested objects doesn't return Promises

**Estimated Fix**: 1 hour (use `mockSupabaseAuth` helper from supabaseMockChain.ts)

---

### 4. **vipVerification.test.ts** (11 failing)
**Location**: `backend/src/__tests__/vip/vipVerification.test.ts`

**Failures**:
- `GET /api/admin/vip/transactions` - All filtering tests (4 tests)
- `POST /api/admin/vip/verify-payment/:transactionId` - All tests (4 tests)
- `POST /api/admin/vip/reject-payment/:transactionId` - All tests (3 tests)

**Root Cause**: 
- No admin authentication mocks
- Manual mock chains don't return Promises
- Missing joined data mocks (users, employees, establishments, subscriptions)

**Estimated Fix**: 3-4 hours (add admin auth + replace ~15 mock chains)

---

### 5. **vipPurchase.test.ts** (20 failing)
**Location**: `backend/src/__tests__/vip/vipPurchase.test.ts`

**Failures**:
- `GET /api/vip/pricing/:type` - All tests
- `POST /api/vip/purchase` - All validation + success tests
- `GET /api/vip/my-subscriptions` - All tests
- `PATCH /api/vip/subscriptions/:id/cancel` - All tests

**Root Cause**: Similar to vipVerification - manual mocks, no auth, complex chains

**Estimated Fix**: 4-5 hours (largest file, ~20 mock chains to replace)

---

### 6. **employees.integration.test.ts** (12 failing)
**Location**: `backend/src/routes/__tests__/employees.integration.test.ts`

**Failures**: (List not provided, but similar pattern to establishments)

**Root Cause**: Manual mock chains like establishments.integration.test.ts

**Estimated Fix**: 2-3 hours (replace ~12 mock chains)

---

### 7. **admin.complete.test.ts** (9 failing)
**Location**: `backend/src/routes/__tests__/admin.complete.test.ts`

**Failures**: (Detailed list needed - run test individually to see)

**Root Cause**: Despite Phase 1 fixes to helper, some tests still have assertion mismatches or complex scenarios

**Estimated Fix**: 2-3 hours (review assertions + complex mock scenarios)

---

## 🛠️ Fix Strategy

### Recommended Approach
1. **Quick Wins** (4-5 hours):
   - missionTrackingService.test.ts (6 tests) - Update expectations
   - admin.integration.test.ts (2 remaining) - Use `mockSupabaseAuth` helper

2. **Medium Effort** (7-9 hours):
   - establishments.integration.test.ts (7 tests) - Replace remaining mocks
   - employees.integration.test.ts (12 tests) - Similar pattern
   - admin.complete.test.ts (9 tests) - Review assertions

3. **Complex VIP Tests** (7-9 hours):
   - vipPurchase.test.ts (20 tests) - Largest file
   - vipVerification.test.ts (11 tests) - Admin auth + joined data

**Total Estimated**: 18-23 hours (2-3 dedicated days)

---

## 📝 Implementation Guide

### Pattern 1: Simple Mock Replacement
```typescript
// BEFORE (manual)
(supabase.from as jest.Mock).mockReturnValue({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockResolvedValue({ data: mockData, error: null })
  })
});

// AFTER (helper)
import { createMockChain } from '../../test-helpers/supabaseMockChain';
(supabase.from as jest.Mock).mockReturnValue(
  createMockChain({ data: mockData, error: null })
);
```

### Pattern 2: Auth + Additional Mocks
```typescript
import { mockSupabaseAuth, createMockChain } from '../../test-helpers/supabaseMockChain';

(supabase.from as jest.Mock) = mockSupabaseAuth(
  { id: 'admin-123', role: 'admin', ... }, // Admin user
  (table, callCount) => {
    if (table === 'vip_transactions') {
      return createMockChain({ data: mockTransactions, error: null });
    }
    return createMockChain({ data: [], error: null }); // Default
  }
);
```

### Pattern 3: RPC Function Tests
```typescript
// For services using RPC functions
const mockRpc = jest.fn().mockResolvedValue({ data: true, error: null });
(supabase.rpc as jest.Mock) = mockRpc;

await service.someMethod();

expect(mockRpc).toHaveBeenCalledWith('rpc_function_name', {
  p_param1: value1,
  p_param2: value2
});
```

---

## 🎯 Success Criteria
- ✅ All 578 tests passing (100%)
- ✅ CI/CD pipeline green
- ✅ No flaky tests (run 3 times, all pass)
- ✅ Test execution time < 40 seconds

---

## 📚 Related Resources
- **Shared Helper**: `backend/src/test-helpers/supabaseMockChain.ts`
- **Phase 1 Commit**: `28b41d5` - test(integration): fix Supabase mock chains
- **Service Testing Guide**: `docs/development/SERVICE_TESTING_GUIDE.md`
- **CI/CD Docs**: `docs/development/CI_CD.md`

---

## 🏷️ Labels
- `tests`
- `integration-tests`
- `technical-debt`
- `good-second-issue`
- `priority: medium`
- `effort: large` (18-23 hours)

---

**Created**: Phase 6 Stabilization Sprint (Day 1)
**Assigned**: TBD
**Milestone**: v10.4 - Test Stabilization
