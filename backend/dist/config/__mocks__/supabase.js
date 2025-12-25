"use strict";
/**
 * Mock Supabase Client for Testing
 * Provides a chainable mock interface matching Supabase's API
 *
 * Updated v10.3.3 - Support for complex queries with joins and configurable mock data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetSupabaseMocks = exports.supabaseClient = exports.supabase = exports.mockNotFound = exports.mockError = exports.mockSuccess = exports.createMockQueryBuilder = void 0;
/**
 * Creates a configurable mock query builder
 * @param mockData - Data to return when query resolves (default: {data: null, error: null})
 * @returns Chainable query builder mock
 */
const createMockQueryBuilder = (mockData = { data: null, error: null }) => {
    const builder = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        like: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        match: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        containedBy: jest.fn().mockReturnThis(),
        overlaps: jest.fn().mockReturnThis(),
        textSearch: jest.fn().mockReturnThis(),
        // Terminal methods that resolve the query
        single: jest.fn().mockResolvedValue(mockData),
        maybeSingle: jest.fn().mockResolvedValue(mockData),
    };
    // Make the builder thenable (for queries without terminal methods)
    builder.then = jest.fn((resolve) => resolve(mockData));
    return builder;
};
exports.createMockQueryBuilder = createMockQueryBuilder;
/**
 * Helper: Create mock response with data
 * @param data - Data to return
 * @returns MockData object
 */
const mockSuccess = (data) => ({
    data,
    error: null,
});
exports.mockSuccess = mockSuccess;
/**
 * Helper: Create mock response with error
 * @param error - Error to return
 * @returns MockData object
 */
const mockError = (error) => ({
    data: null,
    error,
});
exports.mockError = mockError;
/**
 * Helper: Create mock response for empty query (maybeSingle)
 * @returns MockData object with null data
 */
const mockNotFound = () => ({
    data: null,
    error: null,
});
exports.mockNotFound = mockNotFound;
// Mock Supabase client
exports.supabase = {
    from: jest.fn((table) => (0, exports.createMockQueryBuilder)()),
    auth: {
        signUp: jest.fn().mockResolvedValue({ data: null, error: null }),
        signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: null }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
        getUser: jest.fn().mockResolvedValue({ data: null, error: null }),
        getSession: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    storage: {
        from: jest.fn(() => ({
            upload: jest.fn().mockResolvedValue({ data: null, error: null }),
            download: jest.fn().mockResolvedValue({ data: null, error: null }),
            remove: jest.fn().mockResolvedValue({ data: null, error: null }),
            list: jest.fn().mockResolvedValue({ data: null, error: null }),
            getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: '' } }),
        })),
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
};
exports.supabaseClient = {
    ...exports.supabase,
};
/**
 * Helper: Reset all Supabase mocks
 * Call this in beforeEach() to ensure clean slate
 */
const resetSupabaseMocks = () => {
    jest.clearAllMocks();
    exports.supabase.from.mockImplementation(() => (0, exports.createMockQueryBuilder)());
};
exports.resetSupabaseMocks = resetSupabaseMocks;
//# sourceMappingURL=supabase.js.map