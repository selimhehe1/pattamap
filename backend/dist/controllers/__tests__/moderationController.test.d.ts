/**
 * 🧪 Moderation Controller Tests
 *
 * Tests for moderation queue and content approval workflows
 * - getModerationQueue (2/2 tests ✅)
 * - approveItem (2/2 tests ✅)
 * - rejectItem (2/2 tests ✅)
 * - getModerationStats (2/2 tests ✅)
 * - getReports (2/2 tests ✅)
 * - resolveReport (2/2 tests ✅)
 *
 * CURRENT STATUS: 12/12 tests passing (100%) ✅
 *
 * 🔧 FIXED (Day 4 Sprint):
 * - Aligned mocks with actual controller implementation
 * - Properly mocked sequential query chains (get → update flow)
 * - Fixed batch query mocking for getModerationQueue (Promise.all pattern)
 * - Fixed mock pollution by resetting supabase.from in beforeEach
 * - Corrected error responses (500 not 400 for internal errors)
 * - Matched exact controller response messages
 *
 * Day 4 Sprint - Critical Controllers Testing
 */
export {};
//# sourceMappingURL=moderationController.test.d.ts.map