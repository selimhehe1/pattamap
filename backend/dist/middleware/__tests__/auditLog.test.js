"use strict";
/**
 * Audit Log Middleware Tests
 *
 * Tests for audit logging system:
 * - createAuditLog (4 tests)
 * - auditLogger middleware (9 tests)
 * - auditAdminLogin (2 tests)
 * - auditUserAction (2 tests)
 * - auditContentAction (2 tests)
 * - queryAuditLogs (8 tests)
 * - cleanupAuditLogs (3 tests)
 *
 * Day 5+ Sprint - Security Testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const auditLog_1 = require("../auditLog");
const supabase_1 = require("../../config/supabase");
const supabase_2 = require("../../config/__mocks__/supabase");
// Mock dependencies
jest.mock('../../config/supabase', () => {
    const mockModule = jest.requireActual('../../config/__mocks__/supabase');
    return {
        supabase: mockModule.supabase,
        createMockQueryBuilder: mockModule.createMockQueryBuilder,
        mockSuccess: mockModule.mockSuccess,
        mockError: mockModule.mockError
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
// Import logger after mocking to get mock functions
const logger_1 = require("../../utils/logger");
describe('auditLog Middleware', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
    let jsonMock;
    let statusMock;
    let sendMock;
    const validUser = {
        id: 'admin-123',
        role: 'admin',
        pseudonym: 'AdminUser'
    };
    beforeEach(() => {
        // Setup response mocks with EventEmitter capabilities
        jsonMock = jest.fn().mockReturnThis();
        sendMock = jest.fn().mockReturnThis();
        statusMock = jest.fn().mockReturnThis();
        mockResponse = Object.assign(new events_1.EventEmitter(), {
            status: statusMock,
            json: jsonMock,
            send: sendMock
        });
        mockRequest = {
            user: validUser,
            body: {},
            params: {},
            query: {},
            method: 'GET',
            originalUrl: '/api/admin/test',
            ip: '192.168.1.1',
            connection: { remoteAddress: '192.168.1.1' },
            get: jest.fn().mockImplementation((header) => {
                if (header === 'User-Agent')
                    return 'TestBrowser/1.0';
                return undefined;
            })
        };
        mockNext = jest.fn();
        // Reset mocks
        jest.clearAllMocks();
        supabase_1.supabase.from.mockImplementation(() => (0, supabase_2.createMockQueryBuilder)());
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('createAuditLog', () => {
        it('should create audit log entry with all fields', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null)));
            const logEntry = {
                user_id: 'user-123',
                user_role: 'admin',
                user_pseudonym: 'TestAdmin',
                action: 'test_action',
                resource_type: 'test_resource',
                resource_id: 'resource-123',
                ip_address: '192.168.1.1',
                user_agent: 'TestBrowser/1.0',
                details: { extra: 'data' },
                status: 'success'
            };
            await (0, auditLog_1.createAuditLog)(logEntry);
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('audit_logs');
        });
        it('should use default values for missing fields', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            await (0, auditLog_1.createAuditLog)({});
            expect(capturedEntry).toMatchObject({
                user_id: 'system',
                user_role: 'unknown',
                user_pseudonym: 'Unknown',
                action: 'unknown_action',
                resource_type: 'unknown',
                ip_address: 'unknown',
                user_agent: 'unknown',
                details: {},
                status: 'success'
            });
            expect(capturedEntry.timestamp).toBeDefined();
        });
        it('should log error on database failure but not throw', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockError)('Database error')));
            // Should not throw
            await (0, auditLog_1.createAuditLog)({ action: 'test_action' });
            expect(logger_1.logger.error).toHaveBeenCalledWith('Failed to create audit log:', 'Database error');
        });
        it('should catch and log exceptions', async () => {
            supabase_1.supabase.from.mockImplementation(() => {
                throw new Error('Unexpected error');
            });
            // Should not throw
            await (0, auditLog_1.createAuditLog)({ action: 'test_action' });
            expect(logger_1.logger.error).toHaveBeenCalledWith('Audit log creation error:', expect.any(Error));
        });
    });
    describe('auditLogger middleware', () => {
        it('should call next immediately', async () => {
            const middleware = (0, auditLog_1.auditLogger)('test_action', 'test_resource');
            await middleware(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should capture success status (2xx)', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null)));
            const middleware = (0, auditLog_1.auditLogger)('view_users', 'user');
            await middleware(mockRequest, mockResponse, mockNext);
            // Simulate response
            mockResponse.status(200);
            mockResponse.json({ data: 'test' });
            mockResponse.emit('finish');
            // Wait for async audit log
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('audit_logs');
        });
        it('should detect denied status (4xx)', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            const middleware = (0, auditLog_1.auditLogger)('delete_user', 'user');
            await middleware(mockRequest, mockResponse, mockNext);
            // Simulate 403 response
            mockResponse.status(403);
            mockResponse.json({ error: 'Forbidden' });
            mockResponse.emit('finish');
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.status).toBe('denied');
            expect(capturedEntry.details.statusCode).toBe(403);
        });
        it('should detect failed status (5xx)', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            const middleware = (0, auditLog_1.auditLogger)('create_user', 'user');
            await middleware(mockRequest, mockResponse, mockNext);
            // Simulate 500 response
            mockResponse.status(500);
            mockResponse.json({ error: 'Internal server error' });
            mockResponse.emit('finish');
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.status).toBe('failed');
            expect(capturedEntry.details.error).toBe('Internal server error');
        });
        it('should sanitize sensitive data from request body', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            mockRequest.method = 'POST';
            mockRequest.body = {
                username: 'testuser',
                password: 'secret123',
                token: 'jwt-token',
                secret: 'api-secret',
                email: 'test@example.com'
            };
            const middleware = (0, auditLog_1.auditLogger)('create_user', 'user');
            await middleware(mockRequest, mockResponse, mockNext);
            mockResponse.status(201);
            mockResponse.json({ success: true });
            mockResponse.emit('finish');
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.details.requestBody).toEqual({
                username: 'testuser',
                email: 'test@example.com'
            });
            expect(capturedEntry.details.requestBody.password).toBeUndefined();
            expect(capturedEntry.details.requestBody.token).toBeUndefined();
            expect(capturedEntry.details.requestBody.secret).toBeUndefined();
        });
        it('should capture query parameters', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            mockRequest.query = { page: '1', limit: '10' };
            const middleware = (0, auditLog_1.auditLogger)('list_users', 'user');
            await middleware(mockRequest, mockResponse, mockNext);
            mockResponse.status(200);
            mockResponse.json({ data: [] });
            mockResponse.emit('finish');
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.details.queryParams).toEqual({ page: '1', limit: '10' });
        });
        it('should extract resource ID from various param names', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            mockRequest.params = { userId: 'target-user-123' };
            const middleware = (0, auditLog_1.auditLogger)('update_user', 'user');
            await middleware(mockRequest, mockResponse, mockNext);
            mockResponse.status(200);
            mockResponse.json({ success: true });
            mockResponse.emit('finish');
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.resource_id).toBe('target-user-123');
        });
        it('should log critical actions to console', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabase_2.createMockQueryBuilder)((0, supabase_2.mockSuccess)(null)));
            const middleware = (0, auditLog_1.auditLogger)('delete_admin', 'user', auditLog_1.AuditLevel.CRITICAL);
            await middleware(mockRequest, mockResponse, mockNext);
            mockResponse.status(200);
            mockResponse.json({ success: true });
            mockResponse.emit('finish');
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(logger_1.logger.warn).toHaveBeenCalledWith(expect.stringContaining('CRITICAL AUDIT'));
        });
        it('should include audit level in details', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            const middleware = (0, auditLog_1.auditLogger)('view_logs', 'audit', auditLog_1.AuditLevel.HIGH);
            await middleware(mockRequest, mockResponse, mockNext);
            mockResponse.status(200);
            mockResponse.json({ data: [] });
            mockResponse.emit('finish');
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.details.level).toBe(auditLog_1.AuditLevel.HIGH);
        });
    });
    describe('auditAdminLogin', () => {
        it('should log successful admin login', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            (0, auditLog_1.auditAdminLogin)(mockRequest, true);
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.action).toBe('admin_login');
            expect(capturedEntry.resource_type).toBe('authentication');
            expect(capturedEntry.status).toBe('success');
            expect(capturedEntry.details.loginMethod).toBe('password');
        });
        it('should log failed admin login', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            (0, auditLog_1.auditAdminLogin)(mockRequest, false);
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.status).toBe('failed');
        });
    });
    describe('auditUserAction', () => {
        it('should log user action with target user ID', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            (0, auditLog_1.auditUserAction)(mockRequest, 'ban_user', 'target-user-456', { reason: 'Spam' });
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.action).toBe('ban_user');
            expect(capturedEntry.resource_type).toBe('user');
            expect(capturedEntry.resource_id).toBe('target-user-456');
            expect(capturedEntry.details.reason).toBe('Spam');
        });
        it('should use request user info for actor', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            (0, auditLog_1.auditUserAction)(mockRequest, 'promote_user', 'user-789');
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.user_id).toBe('admin-123');
            expect(capturedEntry.user_role).toBe('admin');
            expect(capturedEntry.user_pseudonym).toBe('AdminUser');
        });
    });
    describe('auditContentAction', () => {
        it('should log content moderation action', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            (0, auditLog_1.auditContentAction)(mockRequest, 'delete_comment', 'comment', 'comment-123', { moderationReason: 'Inappropriate content' });
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.action).toBe('delete_comment');
            expect(capturedEntry.resource_type).toBe('comment');
            expect(capturedEntry.resource_id).toBe('comment-123');
            expect(capturedEntry.details.moderationReason).toBe('Inappropriate content');
        });
        it('should capture IP and user agent', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            (0, auditLog_1.auditContentAction)(mockRequest, 'approve_establishment', 'establishment', 'est-456');
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.ip_address).toBe('192.168.1.1');
            expect(capturedEntry.user_agent).toBe('TestBrowser/1.0');
        });
    });
    describe('queryAuditLogs', () => {
        it('should return audit logs with default pagination', async () => {
            const mockLogs = [
                { id: '1', action: 'test', timestamp: '2024-01-01T00:00:00Z' },
                { id: '2', action: 'test2', timestamp: '2024-01-02T00:00:00Z' }
            ];
            supabase_1.supabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                gte: jest.fn().mockReturnThis(),
                lte: jest.fn().mockReturnThis(),
                contains: jest.fn().mockReturnThis(),
                range: jest.fn().mockResolvedValue({ data: mockLogs, error: null })
            });
            const result = await (0, auditLog_1.queryAuditLogs)({});
            expect(result).toEqual(mockLogs);
        });
        it('should filter by userId', async () => {
            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                range: jest.fn().mockResolvedValue({ data: [], error: null })
            };
            supabase_1.supabase.from.mockReturnValue(mockQuery);
            await (0, auditLog_1.queryAuditLogs)({ userId: 'user-123' });
            expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
        });
        it('should filter by action', async () => {
            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                range: jest.fn().mockResolvedValue({ data: [], error: null })
            };
            supabase_1.supabase.from.mockReturnValue(mockQuery);
            await (0, auditLog_1.queryAuditLogs)({ action: 'admin_login' });
            expect(mockQuery.eq).toHaveBeenCalledWith('action', 'admin_login');
        });
        it('should filter by resourceType', async () => {
            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                range: jest.fn().mockResolvedValue({ data: [], error: null })
            };
            supabase_1.supabase.from.mockReturnValue(mockQuery);
            await (0, auditLog_1.queryAuditLogs)({ resourceType: 'user' });
            expect(mockQuery.eq).toHaveBeenCalledWith('resource_type', 'user');
        });
        it('should filter by date range', async () => {
            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                gte: jest.fn().mockReturnThis(),
                lte: jest.fn().mockReturnThis(),
                range: jest.fn().mockResolvedValue({ data: [], error: null })
            };
            supabase_1.supabase.from.mockReturnValue(mockQuery);
            await (0, auditLog_1.queryAuditLogs)({
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            });
            expect(mockQuery.gte).toHaveBeenCalledWith('timestamp', '2024-01-01');
            expect(mockQuery.lte).toHaveBeenCalledWith('timestamp', '2024-12-31');
        });
        it('should filter by audit level', async () => {
            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                contains: jest.fn().mockReturnThis(),
                range: jest.fn().mockResolvedValue({ data: [], error: null })
            };
            supabase_1.supabase.from.mockReturnValue(mockQuery);
            await (0, auditLog_1.queryAuditLogs)({ level: auditLog_1.AuditLevel.CRITICAL });
            expect(mockQuery.contains).toHaveBeenCalledWith('details', { level: auditLog_1.AuditLevel.CRITICAL });
        });
        it('should apply custom pagination', async () => {
            const mockQuery = {
                select: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                range: jest.fn().mockResolvedValue({ data: [], error: null })
            };
            supabase_1.supabase.from.mockReturnValue(mockQuery);
            await (0, auditLog_1.queryAuditLogs)({ limit: 50, offset: 100 });
            expect(mockQuery.range).toHaveBeenCalledWith(100, 149);
        });
        it('should return empty array on error', async () => {
            supabase_1.supabase.from.mockReturnValue({
                select: jest.fn().mockReturnThis(),
                order: jest.fn().mockReturnThis(),
                range: jest.fn().mockResolvedValue({ data: null, error: new Error('Query failed') })
            });
            const result = await (0, auditLog_1.queryAuditLogs)({});
            expect(result).toEqual([]);
            expect(logger_1.logger.error).toHaveBeenCalledWith('Query audit logs error:', expect.any(Error));
        });
    });
    describe('cleanupAuditLogs', () => {
        it('should delete logs older than retention period', async () => {
            const mockQuery = {
                delete: jest.fn().mockReturnThis(),
                lt: jest.fn().mockResolvedValue({ error: null })
            };
            supabase_1.supabase.from.mockReturnValue(mockQuery);
            const result = await (0, auditLog_1.cleanupAuditLogs)(90);
            expect(supabase_1.supabase.from).toHaveBeenCalledWith('audit_logs');
            expect(mockQuery.delete).toHaveBeenCalled();
            expect(mockQuery.lt).toHaveBeenCalledWith('timestamp', expect.any(String));
            expect(result).toBe(true);
            expect(logger_1.logger.debug).toHaveBeenCalledWith(expect.stringContaining('90 days cleaned up successfully'));
        });
        it('should use default 90 day retention', async () => {
            const mockQuery = {
                delete: jest.fn().mockReturnThis(),
                lt: jest.fn().mockResolvedValue({ error: null })
            };
            supabase_1.supabase.from.mockReturnValue(mockQuery);
            await (0, auditLog_1.cleanupAuditLogs)();
            // Verify the cutoff date is approximately 90 days ago
            const ltCall = mockQuery.lt.mock.calls[0];
            const cutoffDate = new Date(ltCall[1]);
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - cutoffDate.getTime()) / (24 * 60 * 60 * 1000));
            expect(diffDays).toBeGreaterThanOrEqual(89);
            expect(diffDays).toBeLessThanOrEqual(91);
        });
        it('should return false on error', async () => {
            supabase_1.supabase.from.mockReturnValue({
                delete: jest.fn().mockReturnThis(),
                lt: jest.fn().mockResolvedValue({ error: new Error('Delete failed') })
            });
            const result = await (0, auditLog_1.cleanupAuditLogs)(30);
            expect(result).toBe(false);
            expect(logger_1.logger.error).toHaveBeenCalledWith('Audit log cleanup error:', expect.any(Error));
        });
    });
    describe('Edge cases', () => {
        it('should handle missing user in request', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            const requestWithoutUser = {
                ...mockRequest,
                user: undefined
            };
            const middleware = (0, auditLog_1.auditLogger)('anonymous_action', 'resource');
            await middleware(requestWithoutUser, mockResponse, mockNext);
            mockResponse.status(200);
            mockResponse.json({ success: true });
            mockResponse.emit('finish');
            await new Promise(resolve => setTimeout(resolve, 10));
            // When user is missing, createAuditLog uses default values
            expect(capturedEntry.user_id).toBe('system');
            expect(capturedEntry.user_role).toBe('unknown');
        });
        it('should handle missing IP address', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            const requestWithoutIp = {
                ...mockRequest,
                ip: undefined,
                connection: { remoteAddress: undefined }
            };
            (0, auditLog_1.auditUserAction)(requestWithoutIp, 'test_action', 'target-123');
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.ip_address).toBe('unknown');
        });
        it('should handle missing User-Agent', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            const requestWithoutUA = {
                ...mockRequest,
                get: jest.fn().mockReturnValue(undefined)
            };
            (0, auditLog_1.auditContentAction)(requestWithoutUA, 'test_action', 'content', 'id-123');
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.user_agent).toBe('unknown');
        });
        it('should fallback to connection.remoteAddress when ip is missing', async () => {
            let capturedEntry;
            supabase_1.supabase.from.mockReturnValue({
                insert: jest.fn().mockImplementation((entry) => {
                    capturedEntry = entry;
                    return Promise.resolve({ error: null });
                })
            });
            const requestWithFallbackIp = {
                ...mockRequest,
                ip: undefined,
                connection: { remoteAddress: '10.0.0.1' }
            };
            (0, auditLog_1.auditUserAction)(requestWithFallbackIp, 'test_action', 'target-123');
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(capturedEntry.ip_address).toBe('10.0.0.1');
        });
    });
});
//# sourceMappingURL=auditLog.test.js.map