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

export const createMockChain = (finalData: any = { data: [], error: null }) => {
  const chain: any = {
    _finalData: finalData
  };

  // All chainable methods
  const chainMethods = [
    'select', 'eq', 'or', 'and', 'order', 'range', 'limit', 'update',
    'insert', 'delete', 'is', 'ilike', 'gte', 'lte', 'gt', 'lt',
    'in', 'neq', 'contains', 'filter', 'not', 'match', 'single'
  ];

  chainMethods.forEach(method => {
    chain[method] = jest.fn((...args) => {
      // Special handling for .select() with count option
      if (method === 'select' && args[1]?.count === 'exact') {
        // Mark this chain as a count query
        chain._isCountQuery = true;
        return chain; // Continue chaining for count queries
      }

      // Special handling for .single() - return Promise
      if (method === 'single') {
        const data = chain._finalData.data;
        const error = chain._finalData.error;

        if (Array.isArray(data)) {
          if (data.length === 0) {
            return Promise.resolve({
              data: null,
              error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
            });
          } else if (data.length === 1) {
            return Promise.resolve({ data: data[0], error: null });
          } else {
            return Promise.resolve({
              data: null,
              error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }
            });
          }
        }
        return Promise.resolve({ data, error });
      }

      return chain; // Continue chaining
    });
  });

  // Make chain itself awaitable - REAL Promise
  chain.then = function(resolve: any, reject?: any) {
    // If this is a count query, return count format
    if (chain._isCountQuery) {
      const data = chain._finalData.data;
      const count = chain._finalData.count !== undefined
        ? chain._finalData.count
        : (Array.isArray(data) ? data.length : 0);

      return Promise.resolve({
        count,
        error: chain._finalData.error
      }).then(resolve, reject);
    }

    // Normal query - return data format
    return Promise.resolve(chain._finalData).then(resolve, reject);
  };

  chain.catch = function(reject: any) {
    return Promise.resolve(chain._finalData).catch(reject);
  };

  return chain;
};

/**
 * Helper to create mock for auth + additional Supabase calls
 *
 * @param user - User object to return from auth query
 * @param additionalMocks - Function to handle additional table queries
 */
export const mockSupabaseAuth = (user: any, additionalMocks?: (table: string, callCount: number) => any) => {
  let callCount = 0;
  return jest.fn((table: string) => {
    callCount++;

    // First call is always auth (users table)
    if (callCount === 1 && table === 'users') {
      return createMockChain({ data: user, error: null });
    }

    // Subsequent calls use additionalMocks if provided
    if (additionalMocks) {
      return additionalMocks(table, callCount);
    }

    // Default: empty array
    return createMockChain({ data: [], error: null });
  });
};
