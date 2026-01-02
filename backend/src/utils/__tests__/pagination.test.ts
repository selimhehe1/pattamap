/**
 * Pagination Utilities Tests
 *
 * Tests for cursor-based pagination system:
 * - encodeCursor / decodeCursor
 * - paginateQuery
 * - offsetFromPage
 * - buildOffsetPaginationMeta
 * - validatePaginationParams
 */

import {
  encodeCursor,
  decodeCursor,
  paginateQuery,
  offsetFromPage,
  buildOffsetPaginationMeta,
  validatePaginationParams,
  Cursor,
  PaginationOptions
} from '../pagination';

describe('Pagination Utilities', () => {
  // ========================================
  // encodeCursor Tests
  // ========================================
  describe('encodeCursor', () => {
    it('should encode item with id and created_at to base64 cursor', () => {
      const item = {
        id: 'test-123',
        created_at: '2025-01-01T12:00:00Z'
      };

      const cursor = encodeCursor(item);

      // Decode to verify structure
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      expect(decoded).toEqual({
        created_at: '2025-01-01T12:00:00Z',
        id: 'test-123'
      });
    });

    it('should use custom sortField when provided', () => {
      const item = {
        id: 'test-456',
        created_at: '2025-01-01T12:00:00Z',
        updated_at: '2025-01-02T12:00:00Z'
      };

      const cursor = encodeCursor(item, 'updated_at');

      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      expect(decoded).toEqual({
        created_at: '2025-01-02T12:00:00Z',
        id: 'test-456'
      });
    });

    it('should handle missing created_at with fallback to empty string', () => {
      const item = {
        id: 'test-789'
      };

      const cursor = encodeCursor(item);

      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      expect(decoded).toEqual({
        created_at: '',
        id: 'test-789'
      });
    });

    it('should handle item with additional properties', () => {
      const item = {
        id: 'test-abc',
        created_at: '2025-01-01T00:00:00Z',
        name: 'Test Item',
        status: 'active'
      };

      const cursor = encodeCursor(item);

      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      // Only created_at and id should be in cursor
      expect(decoded).toEqual({
        created_at: '2025-01-01T00:00:00Z',
        id: 'test-abc'
      });
      expect(decoded.name).toBeUndefined();
    });
  });

  // ========================================
  // decodeCursor Tests
  // ========================================
  describe('decodeCursor', () => {
    it('should decode valid base64 cursor', () => {
      const cursorValue = {
        created_at: '2025-01-01T12:00:00Z',
        id: 'test-123'
      };
      const cursor = Buffer.from(JSON.stringify(cursorValue)).toString('base64');

      const decoded = decodeCursor(cursor);

      expect(decoded).toEqual(cursorValue);
    });

    it('should return null for invalid base64', () => {
      const decoded = decodeCursor('not-valid-base64!!!');

      expect(decoded).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const cursor = Buffer.from('not json').toString('base64');

      const decoded = decodeCursor(cursor);

      expect(decoded).toBeNull();
    });

    it('should return null for empty string', () => {
      const decoded = decodeCursor('');

      expect(decoded).toBeNull();
    });

    it('should handle cursor with special characters in id', () => {
      const cursorValue = {
        created_at: '2025-01-01T12:00:00Z',
        id: 'test-id-with-special-chars_!@#$%'
      };
      const cursor = Buffer.from(JSON.stringify(cursorValue)).toString('base64');

      const decoded = decodeCursor(cursor);

      expect(decoded).toEqual(cursorValue);
    });
  });

  // ========================================
  // offsetFromPage Tests
  // ========================================
  describe('offsetFromPage', () => {
    it('should calculate correct offset for page 1', () => {
      expect(offsetFromPage(1, 20)).toBe(0);
    });

    it('should calculate correct offset for page 2', () => {
      expect(offsetFromPage(2, 20)).toBe(20);
    });

    it('should calculate correct offset for page 5 with limit 10', () => {
      expect(offsetFromPage(5, 10)).toBe(40);
    });

    it('should handle page 0 as page 1', () => {
      expect(offsetFromPage(0, 20)).toBe(0);
    });

    it('should handle negative page as page 1', () => {
      expect(offsetFromPage(-5, 20)).toBe(0);
    });

    it('should cap limit at 100', () => {
      // Page 2 with limit 150 should use limit 100
      expect(offsetFromPage(2, 150)).toBe(100);
    });

    it('should handle limit 0 as limit 1', () => {
      expect(offsetFromPage(2, 0)).toBe(1);
    });

    it('should handle negative limit as limit 1', () => {
      expect(offsetFromPage(3, -10)).toBe(2);
    });
  });

  // ========================================
  // buildOffsetPaginationMeta Tests
  // ========================================
  describe('buildOffsetPaginationMeta', () => {
    it('should build correct metadata for first page', () => {
      const meta = buildOffsetPaginationMeta(100, 1, 20);

      expect(meta).toEqual({
        currentPage: 1,
        totalPages: 5,
        totalItems: 100,
        itemsPerPage: 20,
        hasNextPage: true,
        hasPreviousPage: false
      });
    });

    it('should build correct metadata for middle page', () => {
      const meta = buildOffsetPaginationMeta(100, 3, 20);

      expect(meta).toEqual({
        currentPage: 3,
        totalPages: 5,
        totalItems: 100,
        itemsPerPage: 20,
        hasNextPage: true,
        hasPreviousPage: true
      });
    });

    it('should build correct metadata for last page', () => {
      const meta = buildOffsetPaginationMeta(100, 5, 20);

      expect(meta).toEqual({
        currentPage: 5,
        totalPages: 5,
        totalItems: 100,
        itemsPerPage: 20,
        hasNextPage: false,
        hasPreviousPage: true
      });
    });

    it('should handle single page', () => {
      const meta = buildOffsetPaginationMeta(10, 1, 20);

      expect(meta).toEqual({
        currentPage: 1,
        totalPages: 1,
        totalItems: 10,
        itemsPerPage: 20,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should handle empty result set', () => {
      const meta = buildOffsetPaginationMeta(0, 1, 20);

      expect(meta).toEqual({
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 20,
        hasNextPage: false,
        hasPreviousPage: false
      });
    });

    it('should handle exact page boundaries', () => {
      const meta = buildOffsetPaginationMeta(40, 2, 20);

      expect(meta).toEqual({
        currentPage: 2,
        totalPages: 2,
        totalItems: 40,
        itemsPerPage: 20,
        hasNextPage: false,
        hasPreviousPage: true
      });
    });
  });

  // ========================================
  // validatePaginationParams Tests
  // ========================================
  describe('validatePaginationParams', () => {
    it('should return defaults when no params provided', () => {
      const result = validatePaginationParams({});

      expect(result).toEqual({
        cursor: undefined,
        limit: 20,
        sortField: 'created_at',
        sortOrder: 'desc'
      });
    });

    it('should parse string limit', () => {
      const result = validatePaginationParams({ limit: '50' });

      expect(result.limit).toBe(50);
    });

    it('should parse number limit', () => {
      const result = validatePaginationParams({ limit: 30 });

      expect(result.limit).toBe(30);
    });

    it('should cap limit at 100', () => {
      const result = validatePaginationParams({ limit: '200' });

      expect(result.limit).toBe(100);
    });

    it('should enforce minimum limit of 1', () => {
      const result = validatePaginationParams({ limit: '-5' });

      expect(result.limit).toBe(1);
    });

    it('should handle NaN limit', () => {
      const result = validatePaginationParams({ limit: 'not-a-number' });

      expect(result.limit).toBe(20);
    });

    it('should accept valid cursor', () => {
      const cursor = Buffer.from(JSON.stringify({ created_at: '2025-01-01', id: '123' })).toString('base64');
      const result = validatePaginationParams({ cursor });

      expect(result.cursor).toBe(cursor);
    });

    it('should set cursor to undefined when not provided', () => {
      const result = validatePaginationParams({});

      expect(result.cursor).toBeUndefined();
    });

    it('should accept asc sort order', () => {
      const result = validatePaginationParams({ order: 'asc' });

      expect(result.sortOrder).toBe('asc');
    });

    it('should accept desc sort order', () => {
      const result = validatePaginationParams({ order: 'desc' });

      expect(result.sortOrder).toBe('desc');
    });

    it('should default to desc for invalid sort order', () => {
      const result = validatePaginationParams({ order: 'invalid' });

      expect(result.sortOrder).toBe('desc');
    });

    it('should accept whitelisted sort fields', () => {
      const allowedFields = ['created_at', 'updated_at', 'name', 'age', 'nationality'];

      for (const field of allowedFields) {
        const result = validatePaginationParams({ sort: field });
        expect(result.sortField).toBe(field);
      }
    });

    it('should reject non-whitelisted sort fields (SQL injection prevention)', () => {
      const result = validatePaginationParams({ sort: 'DROP TABLE users;--' });

      expect(result.sortField).toBe('created_at');
    });

    it('should handle all params together', () => {
      const cursor = Buffer.from(JSON.stringify({ created_at: '2025-01-01', id: '123' })).toString('base64');
      const result = validatePaginationParams({
        cursor,
        limit: '25',
        sort: 'name',
        order: 'asc'
      });

      expect(result).toEqual({
        cursor,
        limit: 25,
        sortField: 'name',
        sortOrder: 'asc'
      });
    });
  });

  // ========================================
  // paginateQuery Tests
  // ========================================
  describe('paginateQuery', () => {
    // Mock query builder for testing
    const createMockQueryBuilder = (data: unknown[], error: Error | null = null) => {
      const builder = {
        order: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return Promise.resolve(callback({ data, error, count: data?.length || 0 }));
        })
      };
      return builder;
    };

    it('should return paginated response with hasNextPage=false when less items than limit', async () => {
      const mockData = [
        { id: '1', created_at: '2025-01-01T12:00:00Z' },
        { id: '2', created_at: '2025-01-01T11:00:00Z' }
      ];
      const queryBuilder = createMockQueryBuilder(mockData);

      const result = await paginateQuery(queryBuilder, { limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.limit).toBe(20);
    });

    it('should return hasNextPage=true when more items available', async () => {
      // Create 21 items (limit + 1)
      const mockData = Array.from({ length: 21 }, (_, i) => ({
        id: `${i + 1}`,
        created_at: `2025-01-01T${String(12 - i).padStart(2, '0')}:00:00Z`
      }));
      const queryBuilder = createMockQueryBuilder(mockData);

      const result = await paginateQuery(queryBuilder, { limit: 20 });

      expect(result.data).toHaveLength(20);
      expect(result.pagination.hasNextPage).toBe(true);
    });

    it('should generate nextCursor when hasNextPage=true', async () => {
      const mockData = Array.from({ length: 21 }, (_, i) => ({
        id: `${i + 1}`,
        created_at: `2025-01-01T${String(20 - i).padStart(2, '0')}:00:00Z`
      }));
      const queryBuilder = createMockQueryBuilder(mockData);

      const result = await paginateQuery(queryBuilder, { limit: 20 });

      expect(result.pagination.nextCursor).not.toBeNull();
      // Verify cursor can be decoded
      const decoded = decodeCursor(result.pagination.nextCursor!);
      expect(decoded).not.toBeNull();
      expect(decoded?.id).toBe('20'); // Last item in returned data
    });

    it('should return null nextCursor when no next page', async () => {
      const mockData = [
        { id: '1', created_at: '2025-01-01T12:00:00Z' }
      ];
      const queryBuilder = createMockQueryBuilder(mockData);

      const result = await paginateQuery(queryBuilder, { limit: 20 });

      expect(result.pagination.nextCursor).toBeNull();
    });

    it('should apply cursor filter for descending order', async () => {
      const mockData = [
        { id: '5', created_at: '2025-01-01T10:00:00Z' }
      ];
      const queryBuilder = createMockQueryBuilder(mockData);
      const cursor = encodeCursor({ id: '10', created_at: '2025-01-01T12:00:00Z' });

      await paginateQuery(queryBuilder, { limit: 20, cursor, sortOrder: 'desc' });

      expect(queryBuilder.or).toHaveBeenCalled();
    });

    it('should apply cursor filter for ascending order', async () => {
      const mockData = [
        { id: '15', created_at: '2025-01-01T14:00:00Z' }
      ];
      const queryBuilder = createMockQueryBuilder(mockData);
      const cursor = encodeCursor({ id: '10', created_at: '2025-01-01T12:00:00Z' });

      await paginateQuery(queryBuilder, { limit: 20, cursor, sortOrder: 'asc' });

      expect(queryBuilder.or).toHaveBeenCalled();
    });

    it('should throw error when query fails', async () => {
      const queryBuilder = createMockQueryBuilder([], new Error('Database error'));

      await expect(paginateQuery(queryBuilder, { limit: 20 })).rejects.toThrow('Database error');
    });

    it('should handle empty result set', async () => {
      const queryBuilder = createMockQueryBuilder([]);

      const result = await paginateQuery(queryBuilder, { limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.nextCursor).toBeNull();
      expect(result.pagination.previousCursor).toBeNull();
    });

    it('should handle null data from query', async () => {
      const builder = {
        order: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return Promise.resolve(callback({ data: null, error: null, count: 0 }));
        })
      };

      const result = await paginateQuery(builder, { limit: 20 });

      expect(result.data).toHaveLength(0);
    });

    it('should cap limit at 100', async () => {
      const mockData = [{ id: '1', created_at: '2025-01-01T12:00:00Z' }];
      const queryBuilder = createMockQueryBuilder(mockData);

      const result = await paginateQuery(queryBuilder, { limit: 200 });

      expect(result.pagination.limit).toBe(100);
    });

    it('should enforce minimum limit of 1', async () => {
      const mockData = [{ id: '1', created_at: '2025-01-01T12:00:00Z' }];
      const queryBuilder = createMockQueryBuilder(mockData);

      const result = await paginateQuery(queryBuilder, { limit: -5 });

      expect(result.pagination.limit).toBe(1);
    });

    it('should use default sortField when not provided', async () => {
      const mockData = [{ id: '1', created_at: '2025-01-01T12:00:00Z' }];
      const queryBuilder = createMockQueryBuilder(mockData);

      await paginateQuery(queryBuilder, {});

      expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should use custom sortField when provided', async () => {
      const mockData = [{ id: '1', created_at: '2025-01-01T12:00:00Z', updated_at: '2025-01-02T12:00:00Z' }];
      const queryBuilder = createMockQueryBuilder(mockData);

      await paginateQuery(queryBuilder, { sortField: 'updated_at' });

      expect(queryBuilder.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    });

    it('should return previousCursor for first item', async () => {
      const mockData = [
        { id: '1', created_at: '2025-01-01T12:00:00Z' },
        { id: '2', created_at: '2025-01-01T11:00:00Z' }
      ];
      const queryBuilder = createMockQueryBuilder(mockData);

      const result = await paginateQuery(queryBuilder, { limit: 20 });

      expect(result.pagination.previousCursor).not.toBeNull();
      const decoded = decodeCursor(result.pagination.previousCursor!);
      expect(decoded?.id).toBe('1'); // First item
    });

    it('should ignore invalid cursor', async () => {
      const mockData = [{ id: '1', created_at: '2025-01-01T12:00:00Z' }];
      const queryBuilder = createMockQueryBuilder(mockData);

      // Should not throw, just ignore invalid cursor
      const result = await paginateQuery(queryBuilder, { cursor: 'invalid-cursor' });

      expect(result.data).toHaveLength(1);
    });
  });
});
