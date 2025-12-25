/**
 * Mock Supabase Client for Testing
 * Provides a chainable mock interface matching Supabase's API
 *
 * Updated v10.3.3 - Support for complex queries with joins and configurable mock data
 */
export interface MockData {
    data: any;
    error: any;
}
/**
 * Creates a configurable mock query builder
 * @param mockData - Data to return when query resolves (default: {data: null, error: null})
 * @returns Chainable query builder mock
 */
export declare const createMockQueryBuilder: (mockData?: MockData) => any;
/**
 * Helper: Create mock response with data
 * @param data - Data to return
 * @returns MockData object
 */
export declare const mockSuccess: (data: any) => MockData;
/**
 * Helper: Create mock response with error
 * @param error - Error to return
 * @returns MockData object
 */
export declare const mockError: (error: any) => MockData;
/**
 * Helper: Create mock response for empty query (maybeSingle)
 * @returns MockData object with null data
 */
export declare const mockNotFound: () => MockData;
export declare const supabase: {
    from: jest.Mock<any, [table: string], any>;
    auth: {
        signUp: jest.Mock<any, any, any>;
        signInWithPassword: jest.Mock<any, any, any>;
        signOut: jest.Mock<any, any, any>;
        getUser: jest.Mock<any, any, any>;
        getSession: jest.Mock<any, any, any>;
    };
    storage: {
        from: jest.Mock<{
            upload: jest.Mock<any, any, any>;
            download: jest.Mock<any, any, any>;
            remove: jest.Mock<any, any, any>;
            list: jest.Mock<any, any, any>;
            getPublicUrl: jest.Mock<any, any, any>;
        }, [], any>;
    };
    rpc: jest.Mock<any, any, any>;
};
export declare const supabaseClient: {
    from: jest.Mock<any, [table: string], any>;
    auth: {
        signUp: jest.Mock<any, any, any>;
        signInWithPassword: jest.Mock<any, any, any>;
        signOut: jest.Mock<any, any, any>;
        getUser: jest.Mock<any, any, any>;
        getSession: jest.Mock<any, any, any>;
    };
    storage: {
        from: jest.Mock<{
            upload: jest.Mock<any, any, any>;
            download: jest.Mock<any, any, any>;
            remove: jest.Mock<any, any, any>;
            list: jest.Mock<any, any, any>;
            getPublicUrl: jest.Mock<any, any, any>;
        }, [], any>;
    };
    rpc: jest.Mock<any, any, any>;
};
/**
 * Helper: Reset all Supabase mocks
 * Call this in beforeEach() to ensure clean slate
 */
export declare const resetSupabaseMocks: () => void;
//# sourceMappingURL=supabase.d.ts.map