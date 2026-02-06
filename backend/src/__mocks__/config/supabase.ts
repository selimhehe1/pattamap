/**
 * Mock Supabase Client for Testing
 * Provides a chainable mock interface matching Supabase's API
 */

interface MockData<T = unknown> {
  data: T | null;
  error: unknown;
}

// Mock query builder with chainable methods
const createMockQueryBuilder = (mockData: MockData = { data: null, error: null }) => {
  const chainableMethods = {
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
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    then: jest.fn((resolve: (value: MockData) => void) => resolve(mockData)), // Make it thenable
  };

  return chainableMethods;
};

// Mock Supabase client
export const supabase = {
  from: jest.fn((_table: string) => createMockQueryBuilder()),
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
      list: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  },
  rpc: jest.fn(),
  // Add helper to set mock data for specific queries
  __setMockData: <T = unknown>(data: T) => {
    (supabase.from as jest.Mock).mockImplementation(() => createMockQueryBuilder({ data, error: null }));
  },
  __setMockError: (error: unknown) => {
    (supabase.from as jest.Mock).mockImplementation(() => createMockQueryBuilder({ data: null, error }));
  },
};

export const supabaseClient = {
  ...supabase,
};

// Export helper functions for test setup
export const mockSupabaseResponse = <T = unknown>(data: T, error: unknown = null) => {
  return { data, error };
};

export const resetSupabaseMocks = () => {
  jest.clearAllMocks();
  (supabase.from as jest.Mock).mockImplementation(() => createMockQueryBuilder());
};
