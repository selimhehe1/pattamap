/**
 * Shared test helper for mocking Supabase query chains
 *
 * This creates a mock that:
 * 1. Supports any chain order (select().order().eq() or select().eq().order())
 * 2. Returns real Promises (not just mockReturnThis)
 * 3. Handles .single() correctly (array → object, errors for 0 or 2+ rows)
 * 4. Handles .select() with count option
 * 5. Makes the chain itself awaitable
 *
 * Usage:
 * ```typescript
 * import { createMockChain } from '../../test-helpers/supabaseMockChain';
 *
 * (supabase.from as jest.Mock).mockReturnValue(
 *   createMockChain({ data: mockData, error: null })
 * );
 * ```
 */
export declare const createMockChain: (finalData?: any) => any;
/**
 * Helper to create mock for auth + additional Supabase calls
 *
 * @param user - User object to return from auth query
 * @param additionalMocks - Function to handle additional table queries
 */
export declare const mockSupabaseAuth: (user: any, additionalMocks?: (table: string, callCount: number) => any) => jest.Mock<any, [table: string], any>;
//# sourceMappingURL=supabaseMockChain.d.ts.map