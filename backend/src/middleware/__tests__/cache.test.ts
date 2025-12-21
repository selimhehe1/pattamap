/**
 * Cache Middleware Tests
 *
 * Tests for caching functionality:
 * - defaultKeyGenerator (3 tests)
 * - cacheMiddleware (10 tests)
 * - skipCacheForAdmin (2 tests)
 * - Pre-configured middlewares (4 tests)
 *
 * Day 5+ Sprint - Backend Middleware Testing
 */

import { Request, Response, NextFunction } from 'express';
import {
  cacheMiddleware,
  skipCacheForAdmin,
  categoriesCache,
  dashboardStatsCache,
  listingsCache,
  detailCache,
  userCache,
  conditionalCache,
} from '../cache';
import { AuthRequest } from '../auth';

// Mock redis module
const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();

jest.mock('../../config/redis', () => ({
  cacheGet: (...args: any[]) => mockCacheGet(...args),
  cacheSet: (...args: any[]) => mockCacheSet(...args),
  CACHE_TTL: {
    CATEGORIES: 3600,
    DASHBOARD_STATS: 300,
    LISTINGS: 900,
    DETAIL: 600,
    USER_DATA: 300,
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { logger } from '../../utils/logger';

// Helper to create mock request with writable path
const createMockRequest = (overrides: Record<string, any> = {}): Record<string, any> => ({
  method: 'GET',
  path: '/api/test',
  query: {},
  params: {},
  ...overrides,
});

describe('Cache Middleware', () => {
  let mockRequest: Record<string, any>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let setMock: jest.Mock;
  let statusCodeValue: number;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn().mockImplementation(function (this: Response, body: any) {
      return this;
    });
    setMock = jest.fn().mockReturnThis();
    statusCodeValue = 200;

    mockResponse = {
      json: jsonMock,
      set: setMock,
      get statusCode() {
        return statusCodeValue;
      },
      set statusCode(value: number) {
        statusCodeValue = value;
      },
    };

    mockRequest = createMockRequest();

    mockNext = jest.fn();

    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(undefined);
  });

  describe('defaultKeyGenerator', () => {
    it('should generate key from path only when no query params', async () => {
      mockRequest.path = '/api/categories';
      mockRequest.query = {};

      const middleware = cacheMiddleware({});
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCacheGet).toHaveBeenCalledWith('/api/categories');
    });

    it('should generate key from path and sorted query params', async () => {
      mockRequest.path = '/api/listings';
      mockRequest.query = { page: '1', limit: '10', category: 'bars' };

      const middleware = cacheMiddleware({});
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Query params should be sorted alphabetically
      expect(mockCacheGet).toHaveBeenCalledWith('/api/listings?category=bars&limit=10&page=1');
    });

    it('should produce consistent keys regardless of query param order', async () => {
      // First request with one order
      mockRequest.path = '/api/test';
      mockRequest.query = { z: '1', a: '2', m: '3' };

      const middleware = cacheMiddleware({});
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const firstKey = mockCacheGet.mock.calls[0][0];

      // Second request with different order
      mockCacheGet.mockClear();
      mockRequest.query = { a: '2', m: '3', z: '1' };
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      const secondKey = mockCacheGet.mock.calls[0][0];

      expect(firstKey).toBe(secondKey);
      expect(firstKey).toBe('/api/test?a=2&m=3&z=1');
    });
  });

  describe('cacheMiddleware', () => {
    it('should return cached data on cache hit', async () => {
      const cachedData = { data: [{ id: 1, name: 'Test' }] };
      mockCacheGet.mockResolvedValue(cachedData);

      const middleware = cacheMiddleware({});
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setMock).toHaveBeenCalledWith('X-Cache', 'HIT');
      expect(jsonMock).toHaveBeenCalledWith(cachedData);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set X-Cache: MISS header on cache miss', async () => {
      mockCacheGet.mockResolvedValue(null);

      const middleware = cacheMiddleware({});
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setMock).toHaveBeenCalledWith('X-Cache', 'MISS');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should cache successful responses (2xx)', async () => {
      mockCacheGet.mockResolvedValue(null);

      const middleware = cacheMiddleware({ ttl: 600 });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate calling json with response
      const responseData = { data: 'test' };
      mockResponse.json!(responseData);

      // Wait for async cache set
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCacheSet).toHaveBeenCalledWith('/api/test', responseData, 600);
    });

    it('should not cache error responses (4xx/5xx)', async () => {
      mockCacheGet.mockResolvedValue(null);
      statusCodeValue = 404;

      const middleware = cacheMiddleware({});
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate calling json with error response
      mockResponse.json!({ error: 'Not found' });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCacheSet).not.toHaveBeenCalled();
    });

    it('should skip cache for non-GET requests', async () => {
      mockRequest.method = 'POST';

      const middleware = cacheMiddleware({});
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCacheGet).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip cache when skipCache returns true', async () => {
      const middleware = cacheMiddleware({
        skipCache: () => true,
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCacheGet).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use custom key generator', async () => {
      const customKeyGenerator = () => 'custom-key';

      const middleware = cacheMiddleware({
        keyGenerator: customKeyGenerator,
      });

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCacheGet).toHaveBeenCalledWith('custom-key');
    });

    it('should use custom TTL', async () => {
      mockCacheGet.mockResolvedValue(null);

      const middleware = cacheMiddleware({ ttl: 1800 });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate response
      mockResponse.json!({ data: 'test' });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        1800
      );
    });

    it('should continue on cache errors (fail-open)', async () => {
      mockCacheGet.mockRejectedValue(new Error('Redis connection error'));

      const middleware = cacheMiddleware({});
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        'Cache middleware error:',
        expect.any(Error)
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle cache set errors gracefully', async () => {
      mockCacheGet.mockResolvedValue(null);
      mockCacheSet.mockRejectedValue(new Error('Cache set failed'));

      const middleware = cacheMiddleware({});
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // Simulate response - should not throw
      mockResponse.json!({ data: 'test' });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to cache response:',
        expect.any(Error)
      );
    });
  });

  describe('skipCacheForAdmin', () => {
    it('should return true for admin users', () => {
      const authReq = {
        user: { id: 'admin-1', role: 'admin' },
      } as AuthRequest;

      expect(skipCacheForAdmin(authReq)).toBe(true);
    });

    it('should return true for moderator users', () => {
      const authReq = {
        user: { id: 'mod-1', role: 'moderator' },
      } as AuthRequest;

      expect(skipCacheForAdmin(authReq)).toBe(true);
    });

    it('should return false for regular users', () => {
      const authReq = {
        user: { id: 'user-1', role: 'user' },
      } as AuthRequest;

      expect(skipCacheForAdmin(authReq)).toBe(false);
    });

    it('should return false for unauthenticated requests', () => {
      const req = {} as Request;

      expect(skipCacheForAdmin(req)).toBe(false);
    });
  });

  describe('Pre-configured middlewares', () => {
    describe('categoriesCache', () => {
      it('should use fixed cache key', async () => {
        mockRequest.path = '/api/categories';

        await categoriesCache(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockCacheGet).toHaveBeenCalledWith('categories:all');
      });
    });

    describe('dashboardStatsCache', () => {
      it('should use fixed cache key', async () => {
        mockRequest.path = '/api/admin/stats';

        await dashboardStatsCache(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockCacheGet).toHaveBeenCalledWith('dashboard:stats');
      });

      it('should skip cache for admin users', async () => {
        const authRequest = {
          ...mockRequest,
          user: { id: 'admin-1', role: 'admin' },
        } as AuthRequest;

        await dashboardStatsCache(authRequest as Request, mockResponse as Response, mockNext);

        expect(mockCacheGet).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('listingsCache', () => {
      it('should include status, page, limit in cache key', async () => {
        mockRequest.path = '/api/establishments';
        mockRequest.query = { status: 'active', page: '1', limit: '20' };

        const middleware = listingsCache();
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockCacheGet).toHaveBeenCalledWith('/api/establishments:s=active:p=1:l=20');
      });

      it('should include category and zone in cache key', async () => {
        mockRequest.path = '/api/establishments';
        mockRequest.query = {
          status: 'active',
          page: '1',
          limit: '10',
          category_id: 'cat-1',
          zone: 'walking-street',
        };

        const middleware = listingsCache();
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockCacheGet).toHaveBeenCalledWith(
          '/api/establishments:s=active:p=1:l=10:c=cat-1:z=walking-street'
        );
      });

      it('should include search in cache key', async () => {
        mockRequest.path = '/api/establishments';
        mockRequest.query = { search: 'test bar' };

        const middleware = listingsCache();
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockCacheGet).toHaveBeenCalledWith('/api/establishments:q=test bar');
      });

      it('should accept custom TTL', async () => {
        mockCacheGet.mockResolvedValue(null);
        mockRequest.path = '/api/establishments';

        const middleware = listingsCache(1800);
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        mockResponse.json!({ data: [] });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockCacheSet).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          1800
        );
      });
    });

    describe('detailCache', () => {
      it('should use resource type and ID in cache key', async () => {
        mockRequest.params = { id: 'est-123' };

        const middleware = detailCache('establishment');
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockCacheGet).toHaveBeenCalledWith('establishment:est-123');
      });

      it('should accept custom TTL', async () => {
        mockCacheGet.mockResolvedValue(null);
        mockRequest.params = { id: 'emp-456' };

        const middleware = detailCache('employee', 1200);
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        mockResponse.json!({ data: {} });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockCacheSet).toHaveBeenCalledWith(
          'employee:emp-456',
          expect.any(Object),
          1200
        );
      });
    });

    describe('userCache', () => {
      it('should include user ID in cache key', async () => {
        mockRequest.path = '/api/user/favorites';
        (mockRequest as AuthRequest).user = { id: 'user-123' } as any;

        const middleware = userCache();
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockCacheGet).toHaveBeenCalledWith('/api/user/favorites:user:user-123');
      });

      it('should use anonymous for unauthenticated users', async () => {
        mockRequest.path = '/api/public/data';

        const middleware = userCache();
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockCacheGet).toHaveBeenCalledWith('/api/public/data:user:anonymous');
      });
    });

    describe('conditionalCache', () => {
      it('should cache when condition is true', async () => {
        const middleware = conditionalCache(() => true);
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockCacheGet).toHaveBeenCalled();
      });

      it('should skip cache when condition is false', async () => {
        const middleware = conditionalCache(() => false);
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockCacheGet).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();
      });

      it('should use provided options', async () => {
        mockCacheGet.mockResolvedValue(null);

        const middleware = conditionalCache(() => true, {
          ttl: 7200,
          keyGenerator: () => 'conditional-key',
        });

        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockCacheGet).toHaveBeenCalledWith('conditional-key');

        mockResponse.json!({ data: 'test' });
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockCacheSet).toHaveBeenCalledWith('conditional-key', expect.any(Object), 7200);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty query object', async () => {
      mockRequest.path = '/api/test';
      mockRequest.query = {};

      const middleware = cacheMiddleware({});
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCacheGet).toHaveBeenCalledWith('/api/test');
    });

    it('should handle undefined params', async () => {
      mockRequest.params = undefined as any;

      const middleware = detailCache('resource');

      // Should not throw
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);
    });

    it('should handle PUT/PATCH/DELETE methods', async () => {
      for (const method of ['PUT', 'PATCH', 'DELETE']) {
        mockCacheGet.mockClear();
        mockRequest.method = method;

        const middleware = cacheMiddleware({});
        await middleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockCacheGet).not.toHaveBeenCalled();
      }
    });
  });
});
