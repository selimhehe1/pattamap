/**
 * Cursor-based Pagination Utilities
 *
 * Provides efficient pagination for large datasets using cursors
 * instead of offset-based pagination.
 *
 * Why cursor pagination?
 * - Offset pagination: Performance degrades with page number (page 1000 = slow)
 * - Cursor pagination: Constant performance regardless of page depth
 *
 * How it works:
 * - Uses (created_at, id) as composite cursor
 * - Query: WHERE (created_at, id) < (last_cursor) ORDER BY created_at DESC, id DESC
 * - Database uses index directly, no full table scan
 *
 * @example
 * // First page
 * const result = await paginateQuery(supabase.from('establishments').select('*'));
 *
 * // Next page
 * const result = await paginateQuery(
 *   supabase.from('establishments').select('*'),
 *   { cursor: result.nextCursor }
 * );
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Cursor type: base64-encoded JSON with created_at + id
 */
export type Cursor = string;

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;           // Items per page (default: 20)
  cursor?: Cursor;          // Cursor for next page
  sortField?: string;       // Field to sort by (default: 'created_at')
  sortOrder?: 'asc' | 'desc'; // Sort direction (default: 'desc')
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    hasNextPage: boolean;
    nextCursor: Cursor | null;
    previousCursor: Cursor | null;
  };
}

/**
 * Decoded cursor value
 */
interface CursorValue {
  created_at: string;
  id: string;
}

/**
 * Encode cursor from item
 */
export const encodeCursor = (item: any, sortField: string = 'created_at'): Cursor => {
  const cursorValue: CursorValue = {
    created_at: item[sortField] || item.created_at,
    id: item.id,
  };

  return Buffer.from(JSON.stringify(cursorValue)).toString('base64');
};

/**
 * Decode cursor to value
 */
export const decodeCursor = (cursor: Cursor): CursorValue | null => {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded) as CursorValue;
  } catch (error) {
    return null;
  }
};

/**
 * Apply cursor-based pagination to Supabase query
 *
 * @param query - Supabase query builder
 * @param options - Pagination options
 * @returns Paginated response
 *
 * @example
 * const result = await paginateQuery(
 *   supabase.from('establishments').select('*').eq('status', 'approved'),
 *   { limit: 20, cursor: 'eyJjcmVhdGVkX2F0IjoiMjAyNC0wMS0wMVQxMjowMDowMFoiLCJpZCI6IjEyMyJ9' }
 * );
 */
export const paginateQuery = async <T extends Record<string, any>>(
  queryBuilder: any,
  options: PaginationOptions = {}
): Promise<PaginatedResponse<T>> => {
  const {
    limit = 20,
    cursor,
    sortField = 'created_at',
    sortOrder = 'desc',
  } = options;

  // Validate limit (max 100 to prevent abuse)
  const safeLimit = Math.min(Math.max(1, limit), 100);

  // Fetch one extra item to determine if there's a next page
  const fetchLimit = safeLimit + 1;

  let query = queryBuilder;

  // Apply cursor filter if provided
  if (cursor) {
    const cursorValue = decodeCursor(cursor);

    if (cursorValue) {
      // Use composite cursor for deterministic pagination
      if (sortOrder === 'desc') {
        // For descending order: (created_at, id) < (cursor_created_at, cursor_id)
        query = query.or(
          `${sortField}.lt.${cursorValue.created_at},and(${sortField}.eq.${cursorValue.created_at},id.lt.${cursorValue.id})`
        );
      } else {
        // For ascending order: (created_at, id) > (cursor_created_at, cursor_id)
        query = query.or(
          `${sortField}.gt.${cursorValue.created_at},and(${sortField}.eq.${cursorValue.created_at},id.gt.${cursorValue.id})`
        );
      }
    }
  }

  // Apply sorting
  query = query
    .order(sortField, { ascending: sortOrder === 'asc' })
    .order('id', { ascending: sortOrder === 'asc' }) // Tie-breaker for determinism
    .limit(fetchLimit);

  // Execute query
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // Determine if there's a next page
  const hasNextPage = data.length > safeLimit;

  // Remove the extra item if we fetched one
  const items = hasNextPage ? data.slice(0, safeLimit) : data;

  // Generate cursors
  const nextCursor = hasNextPage && items.length > 0
    ? encodeCursor(items[items.length - 1], sortField)
    : null;

  const previousCursor = items.length > 0
    ? encodeCursor(items[0], sortField)
    : null;

  return {
    data: items,
    pagination: {
      limit: safeLimit,
      hasNextPage,
      nextCursor,
      previousCursor,
    },
  };
};

/**
 * Convert offset-based pagination params to cursor-based
 * (for backward compatibility)
 *
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Offset for range query
 */
export const offsetFromPage = (page: number, limit: number): number => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(limit, 100));

  return (safePage - 1) * safeLimit;
};

/**
 * Build pagination metadata for offset-based pagination
 * (legacy support)
 *
 * @param totalCount - Total number of items
 * @param page - Current page
 * @param limit - Items per page
 * @returns Pagination metadata
 */
export const buildOffsetPaginationMeta = (
  totalCount: number,
  page: number,
  limit: number
) => {
  const totalPages = Math.ceil(totalCount / limit);

  return {
    currentPage: page,
    totalPages,
    totalItems: totalCount,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

/**
 * Validate and sanitize pagination params
 *
 * @param params - Raw pagination params from request
 * @returns Validated pagination options
 */
export const validatePaginationParams = (params: {
  cursor?: string;
  limit?: string | number;
  page?: string | number;
  sort?: string;
  order?: string;
}): PaginationOptions => {
  const { cursor, limit, sort, order } = params;

  // Validate limit
  const parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  const safeLimit = parsedLimit && !isNaN(parsedLimit)
    ? Math.min(Math.max(1, parsedLimit), 100)
    : 20;

  // Validate sort order
  const sortOrder = order === 'asc' || order === 'desc' ? order : 'desc';

  // Validate sort field (whitelist to prevent SQL injection)
  const allowedSortFields = [
    'created_at',
    'updated_at',
    'name',
    'age',
    'nationality',
  ];
  const sortField = sort && allowedSortFields.includes(sort)
    ? sort
    : 'created_at';

  return {
    cursor: cursor || undefined,
    limit: safeLimit,
    sortField,
    sortOrder,
  };
};
