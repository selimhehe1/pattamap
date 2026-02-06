/**
 * Mock Supabase Client for Testing
 * Provides a chainable mock interface matching Supabase's API
 *
 * Updated v10.3.3 - Support for complex queries with joins and configurable mock data
 */

export interface MockData<T = unknown> {
  data: T | null;
  error: unknown;
}

/**
 * Creates a configurable mock query builder
 * @param mockData - Data to return when query resolves (default: {data: null, error: null})
 * @returns Chainable query builder mock
 */
export const createMockQueryBuilder = (mockData: MockData = { data: null, error: null }) => {
  const builder: Record<string, jest.Mock> = {
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

/**
 * Helper: Create mock response with data
 * @param data - Data to return
 * @returns MockData object
 */
export const mockSuccess = <T = unknown>(data: T): MockData<T> => ({
  data,
  error: null,
});

/**
 * Helper: Create mock response with error
 * @param error - Error to return
 * @returns MockData object
 */
export const mockError = (error: unknown): MockData => ({
  data: null,
  error,
});

/**
 * Helper: Create mock response for empty query (maybeSingle)
 * @returns MockData object with null data
 */
export const mockNotFound = (): MockData => ({
  data: null,
  error: null,
});

// Mock Supabase client
export const supabase = {
  from: jest.fn((table: string) => createMockQueryBuilder()),
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

export const supabaseClient = {
  ...supabase,
};

/**
 * Helper: Reset all Supabase mocks
 * Call this in beforeEach() to ensure clean slate
 */
export const resetSupabaseMocks = () => {
  jest.clearAllMocks();
  (supabase.from as jest.Mock).mockImplementation(() => createMockQueryBuilder());
};
