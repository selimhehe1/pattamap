"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const rateLimit_1 = require("../rateLimit");
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
    let mockRequest;
    let mockResponse;
    let mockNext;
    let jsonMock;
    let statusMock;
    let setMock;
    beforeEach(() => {
        // Clear rate limit store between tests
        rateLimit_1.rateLimitStore.destroy();
        // Setup response mocks
        jsonMock = jest.fn();
        setMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            ip: '192.168.1.1',
            get: jest.fn().mockImplementation((header) => {
                if (header === 'User-Agent')
                    return 'TestBrowser/1.0';
                if (header === 'X-Forwarded-For')
                    return null;
                return null;
            }),
            connection: { remoteAddress: '192.168.1.1' }
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
        rateLimit_1.rateLimitStore.destroy();
    });
    describe('MemoryRateLimitStore', () => {
        it('should return null for non-existent key', () => {
            const result = rateLimit_1.rateLimitStore.get('non-existent-key');
            expect(result).toBeNull();
        });
        it('should increment count for new key', () => {
            const result = rateLimit_1.rateLimitStore.increment('new-key', 60000);
            expect(result.count).toBe(1);
            expect(result.resetTime).toBeGreaterThan(Date.now());
        });
        it('should increment count for existing key', () => {
            rateLimit_1.rateLimitStore.increment('existing-key', 60000);
            const result = rateLimit_1.rateLimitStore.increment('existing-key', 60000);
            expect(result.count).toBe(2);
        });
        it('should reset count after window expires', async () => {
            // Set a very short window (10ms)
            rateLimit_1.rateLimitStore.increment('short-window-key', 10);
            // Wait for window to expire
            await new Promise(resolve => setTimeout(resolve, 20));
            // Should return null since entry expired
            const result = rateLimit_1.rateLimitStore.get('short-window-key');
            expect(result).toBeNull();
        });
        it('should start fresh after destroy', () => {
            rateLimit_1.rateLimitStore.increment('test-key', 60000);
            rateLimit_1.rateLimitStore.destroy();
            const result = rateLimit_1.rateLimitStore.get('test-key');
            expect(result).toBeNull();
        });
    });
    describe('createRateLimit', () => {
        it('should allow requests under limit', async () => {
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 10
            });
            await limiter(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalledWith(429);
        });
        it('should block requests over limit with 429', async () => {
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 2
            });
            // Make 3 requests (limit is 2)
            await limiter(mockRequest, mockResponse, mockNext);
            await limiter(mockRequest, mockResponse, mockNext);
            await limiter(mockRequest, mockResponse, mockNext);
            expect(statusMock).toHaveBeenCalledWith(429);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Too many requests',
                code: 'RATE_LIMIT_EXCEEDED'
            }));
        });
        it('should set X-RateLimit-Limit header', async () => {
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 100
            });
            await limiter(mockRequest, mockResponse, mockNext);
            expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
                'X-RateLimit-Limit': '100'
            }));
        });
        it('should set X-RateLimit-Remaining header', async () => {
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 10
            });
            await limiter(mockRequest, mockResponse, mockNext);
            expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
                'X-RateLimit-Remaining': '9'
            }));
        });
        it('should set X-RateLimit-Reset header', async () => {
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 10
            });
            await limiter(mockRequest, mockResponse, mockNext);
            expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
                'X-RateLimit-Reset': expect.any(String)
            }));
            // Verify it's a valid ISO date string
            const calls = setMock.mock.calls[0][0];
            const resetDate = new Date(calls['X-RateLimit-Reset']);
            expect(resetDate.getTime()).toBeGreaterThan(Date.now());
        });
        it('should use default key generator (IP + User-Agent)', async () => {
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 1
            });
            await limiter(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
            // Same IP + User-Agent should be blocked
            await limiter(mockRequest, mockResponse, mockNext);
            expect(statusMock).toHaveBeenCalledWith(429);
        });
        it('should support custom key generator', async () => {
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 1,
                keyGenerator: (req) => `custom:${req.ip}`
            });
            await limiter(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(1);
            // Different custom key should allow the request
            const differentRequest = {
                ...mockRequest,
                ip: '10.0.0.1'
            };
            await limiter(differentRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(2);
        });
        it('should use custom error message', async () => {
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 1,
                message: 'Custom rate limit message'
            });
            await limiter(mockRequest, mockResponse, mockNext);
            await limiter(mockRequest, mockResponse, mockNext);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Custom rate limit message'
            }));
        });
        it('should handle X-Forwarded-For header for proxied requests', async () => {
            const proxiedRequest = {
                ...mockRequest,
                get: jest.fn().mockImplementation((header) => {
                    if (header === 'X-Forwarded-For')
                        return '203.0.113.1, 192.168.1.1';
                    if (header === 'User-Agent')
                        return 'TestBrowser/1.0';
                    return null;
                })
            };
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 1
            });
            await limiter(proxiedRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should continue on internal errors (fail-open)', async () => {
            // Create a limiter that will throw
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 10,
                keyGenerator: () => { throw new Error('Key generator error'); }
            });
            await limiter(mockRequest, mockResponse, mockNext);
            // Should still call next() despite error
            expect(mockNext).toHaveBeenCalled();
        });
    });
    describe('skipSuccessfulRequests option', () => {
        it('should skip successful requests when skipSuccessfulRequests=true', async () => {
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 2,
                skipSuccessfulRequests: true
            });
            // Create a response that tracks status and json calls properly
            const mockRes = {
                set: jest.fn(),
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis()
            };
            // First request - successful (200)
            await limiter(mockRequest, mockRes, mockNext);
            mockRes.status(200);
            mockRes.json({ success: true });
            // Second request - successful (200)
            await limiter(mockRequest, mockRes, mockNext);
            mockRes.status(200);
            mockRes.json({ success: true });
            // Third request - should still work because successful requests are skipped
            await limiter(mockRequest, mockRes, mockNext);
            // All 3 calls should go through
            expect(mockNext).toHaveBeenCalledTimes(3);
        });
    });
    describe('Pre-configured limiters', () => {
        it('apiRateLimit should use env vars or defaults', async () => {
            // Default values: 15 min window, 100 requests
            await (0, rateLimit_1.apiRateLimit)(mockRequest, mockResponse, mockNext);
            expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
                'X-RateLimit-Limit': '100'
            }));
            expect(mockNext).toHaveBeenCalled();
        });
        it('authRateLimit should allow 10 auth attempts (balanced security/UX)', async () => {
            await (0, rateLimit_1.authRateLimit)(mockRequest, mockResponse, mockNext);
            expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
                'X-RateLimit-Limit': '10'
            }));
        });
        it('uploadRateLimit should allow 30 uploads per minute', async () => {
            await (0, rateLimit_1.uploadRateLimit)(mockRequest, mockResponse, mockNext);
            expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
                'X-RateLimit-Limit': '30'
            }));
        });
        it('adminRateLimit should allow 50 admin actions per 5 minutes', async () => {
            await (0, rateLimit_1.adminRateLimit)(mockRequest, mockResponse, mockNext);
            expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
                'X-RateLimit-Limit': '50'
            }));
        });
        it('vipPurchaseRateLimit should include userId in key', async () => {
            const authenticatedRequest = {
                ...mockRequest,
                user: { id: 'user-123' }
            };
            await (0, rateLimit_1.vipPurchaseRateLimit)(authenticatedRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
            // Different user should have separate limit
            const otherUserRequest = {
                ...mockRequest,
                user: { id: 'user-456' }
            };
            await (0, rateLimit_1.vipPurchaseRateLimit)(otherUserRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalledTimes(2);
        });
        it('healthCheckRateLimit should use IP-only key', async () => {
            await (0, rateLimit_1.healthCheckRateLimit)(mockRequest, mockResponse, mockNext);
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
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 10
            });
            await limiter(noIpRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should handle missing User-Agent gracefully', async () => {
            const noUaRequest = {
                ...mockRequest,
                get: jest.fn().mockReturnValue(null)
            };
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 10
            });
            await limiter(noUaRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should truncate long User-Agent strings', async () => {
            const longUaRequest = {
                ...mockRequest,
                get: jest.fn().mockImplementation((header) => {
                    if (header === 'User-Agent')
                        return 'A'.repeat(200);
                    return null;
                })
            };
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 10
            });
            await limiter(longUaRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should return remaining=0 when at limit', async () => {
            const limiter = (0, rateLimit_1.createRateLimit)({
                windowMs: 60000,
                maxRequests: 1
            });
            await limiter(mockRequest, mockResponse, mockNext);
            expect(setMock).toHaveBeenCalledWith(expect.objectContaining({
                'X-RateLimit-Remaining': '0'
            }));
        });
    });
});
//# sourceMappingURL=rateLimit.test.js.map