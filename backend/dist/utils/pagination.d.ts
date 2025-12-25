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
/**
 * Cursor type: base64-encoded JSON with created_at + id
 */
export type Cursor = string;
/**
 * Pagination options
 */
export interface PaginationOptions {
    limit?: number;
    cursor?: Cursor;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
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
export declare const encodeCursor: (item: any, sortField?: string) => Cursor;
/**
 * Decode cursor to value
 */
export declare const decodeCursor: (cursor: Cursor) => CursorValue | null;
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
export declare const paginateQuery: <T extends Record<string, any>>(queryBuilder: any, options?: PaginationOptions) => Promise<PaginatedResponse<T>>;
/**
 * Convert offset-based pagination params to cursor-based
 * (for backward compatibility)
 *
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Offset for range query
 */
export declare const offsetFromPage: (page: number, limit: number) => number;
/**
 * Build pagination metadata for offset-based pagination
 * (legacy support)
 *
 * @param totalCount - Total number of items
 * @param page - Current page
 * @param limit - Items per page
 * @returns Pagination metadata
 */
export declare const buildOffsetPaginationMeta: (totalCount: number, page: number, limit: number) => {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
};
/**
 * Validate and sanitize pagination params
 *
 * @param params - Raw pagination params from request
 * @returns Validated pagination options
 */
export declare const validatePaginationParams: (params: {
    cursor?: string;
    limit?: string | number;
    page?: string | number;
    sort?: string;
    order?: string;
}) => PaginationOptions;
export {};
//# sourceMappingURL=pagination.d.ts.map