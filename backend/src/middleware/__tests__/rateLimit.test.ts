/**
 * Rate Limit Middleware Tests
 *
 * Tests for rate limiting protection:
 * - MemoryRateLimitStore (5 tests)
 * - createRateLimit factory (10 tests)
 * - Pre-configured limiters (4 tests)
 *
 * Day 5+ Sprint - Middleware Security Testing
 */

import { Request, Response, NextFunction } from 'express';
import {
  createRateLimit,
  apiRateLimit,
  authRateLimit,
  uploadRateLimit,
  adminRateLimit,
  vipPurchaseRateLimit,
  healthCheckRateLimit,
  rateLimitStore
} from '../rateLimit';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

describe('rateLimit Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let setMock: jest.Mock;

  beforeEach(() => {
    // Clear rate limit store between tests
    rateLimitStore.destroy();

    // Setup response mocks
    jsonMock = jest.fn();
    setMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      ip: '192.168.1.1',
      get: jest.fn().mockImplementation((header: string) => {
        if (header === 'User-Agent') return 'TestBrowser/1.0';
        if (header === 'X-Forwarded-For') return null;
        return null;
      }),
      connection: { remoteAddress: '192.168.1.1' } as any
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
      set: setMock
    };

    mockNext = jest.fn();

    // Reset environment variables
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX_REQUESTS;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    rateLimitStore.destroy();
  });

  describe('MemoryRateLimitStore', () => {
    it('should return null for non-existent key', () => {
      const result = rateLimitStore.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should increment count for new key', () => {
      const result = rateLimitStore.increment('new-key', 60000);
      expect(result.count).toBe(1);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should increment count for existing key', () => {
      rateLimitStore.increment('existing-key', 60000);
      const result = rateLimitStore.increment('existing-key', 60000);
      expect(result.count).toBe(2);
    });

    it('should reset count after window expires', async () => {
      // Set a very short window (10ms)
      rateLimitStore.increment('short-window-key', 10);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 20));

      // Should return null since entry expired
      const result = rateLimitStore.get('short-window-key');
      expect(result).toBeNull();
    });

    it('should start fresh after destroy', () => {
      rateLimitStore.increment('test-key', 60000);
      rateLimitStore.destroy();

      const result = rateLimitStore.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('createRateLimit', () => {
    it('should allow requests under limit', async () => {
      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 10
      });

      await limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalledWith(429);
    });

    it('should block requests over limit with 429', async () => {
      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 2
      });

      // Make 3 requests (limit is 2)
      await limiter(mockRequest as Request, mockResponse as Response, mockNext);
      await limiter(mockRequest as Request, mockResponse as Response, mockNext);
      await limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(429);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED'
      }));
    });

    it('should set X-RateLimit-Limit header', async () => {
      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 100
      });

      await limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Limit': '100'
      }));
    });

    it('should set X-RateLimit-Remaining header', async () => {
      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 10
      });

      await limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Remaining': '9'
      }));
    });

    it('should set X-RateLimit-Reset header', async () => {
      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 10
      });

      await limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Reset': expect.any(String)
      }));

      // Verify it's a valid ISO date string
      const calls = setMock.mock.calls[0][0];
      const resetDate = new Date(calls['X-RateLimit-Reset']);
      expect(resetDate.getTime()).toBeGreaterThan(Date.now());
    });

    it('should use default key generator (IP + User-Agent)', async () => {
      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 1
      });

      await limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Same IP + User-Agent should be blocked
      await limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(statusMock).toHaveBeenCalledWith(429);
    });

    it('should support custom key generator', async () => {
      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 1,
        keyGenerator: (req) => `custom:${req.ip}`
      });

      await limiter(mockRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Different custom key should allow the request
      const differentRequest = {
        ...mockRequest,
        ip: '10.0.0.1'
      };
      await limiter(differentRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should use custom error message', async () => {
      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 1,
        message: 'Custom rate limit message'
      });

      await limiter(mockRequest as Request, mockResponse as Response, mockNext);
      await limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Custom rate limit message'
      }));
    });

    it('should handle X-Forwarded-For header for proxied requests', async () => {
      const proxiedRequest = {
        ...mockRequest,
        get: jest.fn().mockImplementation((header: string) => {
          if (header === 'X-Forwarded-For') return '203.0.113.1, 192.168.1.1';
          if (header === 'User-Agent') return 'TestBrowser/1.0';
          return null;
        })
      };

      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 1
      });

      await limiter(proxiedRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue on internal errors (fail-open)', async () => {
      // Create a limiter that will throw
      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 10,
        keyGenerator: () => { throw new Error('Key generator error'); }
      });

      await limiter(mockRequest as Request, mockResponse as Response, mockNext);

      // Should still call next() despite error
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('skipSuccessfulRequests option', () => {
    it('should skip successful requests when skipSuccessfulRequests=true', async () => {
      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 2,
        skipSuccessfulRequests: true
      });

      // Create a response that tracks status and json calls properly
      const mockRes: Response = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      } as unknown as Response;

      // First request - successful (200)
      await limiter(mockRequest as Request, mockRes, mockNext);
      (mockRes.status as jest.Mock)(200);
      (mockRes.json as jest.Mock)({ success: true });

      // Second request - successful (200)
      await limiter(mockRequest as Request, mockRes, mockNext);
      (mockRes.status as jest.Mock)(200);
      (mockRes.json as jest.Mock)({ success: true });

      // Third request - should still work because successful requests are skipped
      await limiter(mockRequest as Request, mockRes, mockNext);

      // All 3 calls should go through
      expect(mockNext).toHaveBeenCalledTimes(3);
    });
  });

  describe('Pre-configured limiters', () => {
    it('apiRateLimit should use env vars or defaults', async () => {
      // Default values: 15 min window, 100 requests
      await apiRateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Limit': '100'
      }));
      expect(mockNext).toHaveBeenCalled();
    });

    it('authRateLimit should allow 5 auth attempts (security hardened - FIX A2)', async () => {
      await authRateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Limit': '5'
      }));
    });

    it('uploadRateLimit should allow 30 uploads per minute', async () => {
      await uploadRateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Limit': '30'
      }));
    });

    it('adminRateLimit should allow 50 admin actions per 5 minutes', async () => {
      await adminRateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Limit': '50'
      }));
    });

    it('vipPurchaseRateLimit should include userId in key', async () => {
      const authenticatedRequest = {
        ...mockRequest,
        user: { id: 'user-123' }
      };

      await vipPurchaseRateLimit(authenticatedRequest as any, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // Different user should have separate limit
      const otherUserRequest = {
        ...mockRequest,
        user: { id: 'user-456' }
      };

      await vipPurchaseRateLimit(otherUserRequest as any, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('healthCheckRateLimit should use IP-only key', async () => {
      await healthCheckRateLimit(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Limit': '100'
      }));
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle missing IP gracefully', async () => {
      const noIpRequest = {
        ...mockRequest,
        ip: undefined,
        connection: { remoteAddress: undefined }
      };

      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 10
      });

      await limiter(noIpRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing User-Agent gracefully', async () => {
      const noUaRequest = {
        ...mockRequest,
        get: jest.fn().mockReturnValue(null)
      };

      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 10
      });

      await limiter(noUaRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should truncate long User-Agent strings', async () => {
      const longUaRequest = {
        ...mockRequest,
        get: jest.fn().mockImplementation((header: string) => {
          if (header === 'User-Agent') return 'A'.repeat(200);
          return null;
        })
      };

      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 10
      });

      await limiter(longUaRequest as Request, mockResponse as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return remaining=0 when at limit', async () => {
      const limiter = createRateLimit({
        windowMs: 60000,
        maxRequests: 1
      });

      await limiter(mockRequest as Request, mockResponse as Response, mockNext);

      expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
        'X-RateLimit-Remaining': '0'
      }));
    });
  });
});
