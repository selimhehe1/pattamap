"use strict";
/**
 * Refresh Token Middleware Tests
 *
 * Tests for JWT refresh token system:
 * - generateRefreshToken (2 tests)
 * - generateTokenPair (4 tests)
 * - refreshAccessToken (9 tests)
 * - autoRefreshMiddleware (3 tests)
 * - cleanupExpiredTokens (1 test)
 * - revokeAllUserTokens (2 tests)
 *
 * Day 5+ Sprint - Security Testing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const refreshToken_1 = require("../refreshToken");
const supabase_1 = require("../../config/supabase");
const supabase_2 = require("../../config/__mocks__/supabase");
// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../config/supabase', () => {
    const mockModule = jest.requireActual('../../config/__mocks__/supabase');
    return {
        supabase: mockModule.supabase,
        createMockQueryBuilder: mockModule.createMockQueryBuilder,
        mockSuccess: mockModule.mockSuccess,
        mockError: mockModule.mockError,
        mockNotFound: mockModule.mockNotFound
    };
});
jest.mock('../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    }
}));
describe('refreshToken Middleware', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
    let jsonMock;
    let statusMock;
    let cookieMock;
    const validUser = {
        id: 'user-123',
        pseudonym: 'testuser',
        email: 'test@example.com',
        role: 'user',
        is_active: true
    };
    beforeEach(() => {
        // Setup response mocks
        jsonMock = jest.fn();
        cookieMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            cookies: {},
            user: undefined
        };
        mockResponse = {
            status: statusMock,
            json: jsonMock,
            cookie: cookieMock
        };
        mockNext = jest.fn();
        // Set environment variables
        process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
        process.env.REFRESH_SECRET = 'test-refresh-secret-for-testing-only';
        process.env.NODE_ENV = 'test';
        // Reset mocks
        jest.clearAllMocks();
        supabase_1.supabase.from.mockImplementation(() => (0, supabase_2.createMockQueryBuilder)());
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('generateRefreshToken', () => {
        it('should generate 128-character hex string', () => {
            const token = (0, refreshToken_1.generateRefreshToken)();
            expect(token).toHaveLength(128);
            expect(/^[a-f0-9]+$/.test(token)).toBe(true);
        });
        it('should generate unique tokens', () => {
            const token1 = (0, refreshToken_1.generateRefreshToken)();
            const token2 = (0, refreshToken_1.generateRefreshToken)();
            expect(token1).not.toBe(token2);
        });
    });
    describe('generateTokenPair', () => {
        beforeEach(() => {
            jsonwebtoken_1.default.sign.mockReturnValue('mocked-token');
        });
        it('should generate access and refresh tokens', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null)));
            const result = await (0, refreshToken_1.generateTokenPair)('user-123', 'test@example.com', 'user');
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('tokenFamily');
            expect(jsonwebtoken_1.default.sign).toHaveBeenCalledTimes(2);
        });
        it('should store token in database with hash', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null)));
            await (0, refreshToken_1.generateTokenPair)('user-123', 'test@example.com', 'user');
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('refresh_tokens');
        });
        it('should throw if JWT_SECRET missing', async () => {
            delete process.env.JWT_SECRET;
            await expect((0, refreshToken_1.generateTokenPair)('user-123', 'test@example.com', 'user'))
                .rejects.toThrow('JWT secrets not configured');
        });
        it('should throw if database insert fails', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockError)('Database error')));
            await expect((0, refreshToken_1.generateTokenPair)('user-123', 'test@example.com', 'user'))
                .rejects.toThrow('Failed to generate token pair');
        });
    });
    describe('refreshAccessToken', () => {
        const mockRefreshToken = 'valid-refresh-token';
        const mockDecodedToken = {
            userId: 'user-123',
            tokenFamily: 'family-123',
            iat: Date.now() / 1000,
            exp: (Date.now() / 1000) + 7 * 24 * 60 * 60
        };
        it('should return 401 if no refresh token cookie', async () => {
            mockRequest.cookies = {};
            await (0, refreshToken_1.refreshAccessToken)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Refresh token required',
                code: 'REFRESH_TOKEN_MISSING'
            });
        });
        it('should return 401 if token invalid', async () => {
            mockRequest.cookies = { 'refresh-token': mockRefreshToken };
            jsonwebtoken_1.default.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });
            await (0, refreshToken_1.refreshAccessToken)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Invalid refresh token',
                code: 'REFRESH_TOKEN_INVALID'
            });
        });
        it('should return 401 if token not found in database (reuse detection)', async () => {
            mockRequest.cookies = { 'refresh-token': mockRefreshToken };
            jsonwebtoken_1.default.verify.mockReturnValue(mockDecodedToken);
            // Token not found in database
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockNotFound)()));
            await (0, refreshToken_1.refreshAccessToken)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Refresh token invalid or reused',
                code: 'REFRESH_TOKEN_REUSED'
            });
        });
        it('should invalidate token family on reuse', async () => {
            mockRequest.cookies = { 'refresh-token': mockRefreshToken };
            jsonwebtoken_1.default.verify.mockReturnValue(mockDecodedToken);
            // Token not found - indicates reuse
            const mockSelectBuilder = (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockNotFound)());
            const mockUpdateBuilder = (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null));
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1)
                    return mockSelectBuilder;
                return mockUpdateBuilder;
            });
            await (0, refreshToken_1.refreshAccessToken)(mockRequest, mockResponse);
            // Should have called update to invalidate the token family
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('refresh_tokens');
        });
        it('should return 401 if token expired', async () => {
            mockRequest.cookies = { 'refresh-token': mockRefreshToken };
            jsonwebtoken_1.default.verify.mockReturnValue(mockDecodedToken);
            const expiredToken = {
                user_id: 'user-123',
                token_family: 'family-123',
                expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
                is_active: true
            };
            const mockSelectBuilder = (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(expiredToken));
            const mockUpdateBuilder = (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null));
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1)
                    return mockSelectBuilder;
                return mockUpdateBuilder;
            });
            await (0, refreshToken_1.refreshAccessToken)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Refresh token expired',
                code: 'REFRESH_TOKEN_EXPIRED'
            });
        });
        it('should return 401 if user inactive', async () => {
            mockRequest.cookies = { 'refresh-token': mockRefreshToken };
            jsonwebtoken_1.default.verify.mockReturnValue(mockDecodedToken);
            const validStoredToken = {
                user_id: 'user-123',
                token_family: 'family-123',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                is_active: true
            };
            // First call returns stored token, second returns user not found
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1)
                    return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(validStoredToken));
                return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockNotFound)()); // User not found
            });
            await (0, refreshToken_1.refreshAccessToken)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'User not found or inactive',
                code: 'USER_INVALID'
            });
        });
        it('should generate new token pair on success', async () => {
            mockRequest.cookies = { 'refresh-token': mockRefreshToken };
            jsonwebtoken_1.default.verify.mockReturnValue(mockDecodedToken);
            jsonwebtoken_1.default.sign.mockReturnValue('new-access-token');
            const validStoredToken = {
                user_id: 'user-123',
                token_family: 'family-123',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                is_active: true
            };
            // Mock successful flow
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1)
                    return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(validStoredToken));
                if (callCount === 2)
                    return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(validUser));
                return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null));
            });
            await (0, refreshToken_1.refreshAccessToken)(mockRequest, mockResponse);
            expect(jsonwebtoken_1.default.sign).toHaveBeenCalled();
        });
        it('should set httpOnly cookies correctly', async () => {
            mockRequest.cookies = { 'refresh-token': mockRefreshToken };
            jsonwebtoken_1.default.verify.mockReturnValue(mockDecodedToken);
            jsonwebtoken_1.default.sign.mockReturnValue('new-token');
            const validStoredToken = {
                user_id: 'user-123',
                token_family: 'family-123',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                is_active: true
            };
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1)
                    return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(validStoredToken));
                if (callCount === 2)
                    return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(validUser));
                return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null));
            });
            await (0, refreshToken_1.refreshAccessToken)(mockRequest, mockResponse);
            // Should set auth-token cookie
            expect(cookieMock).toHaveBeenCalledWith('auth-token', expect.any(String), expect.objectContaining({
                httpOnly: true,
                sameSite: 'strict',
                path: '/'
            }));
            // Should set refresh-token cookie
            expect(cookieMock).toHaveBeenCalledWith('refresh-token', expect.any(String), expect.objectContaining({
                httpOnly: true,
                sameSite: 'strict',
                path: '/'
            }));
        });
        it('should return user data on success', async () => {
            mockRequest.cookies = { 'refresh-token': mockRefreshToken };
            jsonwebtoken_1.default.verify.mockReturnValue(mockDecodedToken);
            jsonwebtoken_1.default.sign.mockReturnValue('new-token');
            const validStoredToken = {
                user_id: 'user-123',
                token_family: 'family-123',
                expires_at: new Date(Date.now() + 86400000).toISOString(),
                is_active: true
            };
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1)
                    return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(validStoredToken));
                if (callCount === 2)
                    return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(validUser));
                return (0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null));
            });
            await (0, refreshToken_1.refreshAccessToken)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Token refreshed successfully',
                user: validUser
            });
        });
        it('should return 500 if REFRESH_SECRET missing', async () => {
            delete process.env.REFRESH_SECRET;
            delete process.env.JWT_SECRET;
            mockRequest.cookies = { 'refresh-token': mockRefreshToken };
            await (0, refreshToken_1.refreshAccessToken)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Server configuration error' });
        });
    });
    describe('autoRefreshMiddleware', () => {
        it('should skip if no user', async () => {
            const authRequest = { ...mockRequest, user: undefined };
            await (0, refreshToken_1.autoRefreshMiddleware)(authRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(jsonwebtoken_1.default.decode).not.toHaveBeenCalled();
        });
        it('should skip if no auth-token cookie', async () => {
            const authRequest = { ...mockRequest, user: validUser, cookies: {} };
            await (0, refreshToken_1.autoRefreshMiddleware)(authRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should call next even if refresh fails', async () => {
            const authRequest = {
                ...mockRequest,
                user: validUser,
                cookies: { 'auth-token': 'some-token' }
            };
            jsonwebtoken_1.default.decode.mockReturnValue({
                exp: (Date.now() / 1000) + 60 // Expires in 1 minute (within 5 min threshold)
            });
            await (0, refreshToken_1.autoRefreshMiddleware)(authRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });
    describe('cleanupExpiredTokens', () => {
        it('should deactivate expired tokens', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null)));
            await (0, refreshToken_1.cleanupExpiredTokens)();
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('refresh_tokens');
        });
    });
    describe('revokeAllUserTokens', () => {
        it('should deactivate all user tokens', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null)));
            const result = await (0, refreshToken_1.revokeAllUserTokens)('user-123');
            expect(result).toBe(true);
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('refresh_tokens');
        });
        it('should return false on error', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockError)('Database error')));
            const result = await (0, refreshToken_1.revokeAllUserTokens)('user-123');
            expect(result).toBe(false);
        });
    });
});
//# sourceMappingURL=refreshToken.test.js.map