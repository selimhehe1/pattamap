"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const csrf_1 = require("../../middleware/csrf");
const notifications_1 = __importDefault(require("../notifications"));
const supabase_1 = require("../../config/supabase");
const notificationHelper = __importStar(require("../../utils/notificationHelper"));
const supabaseMockChain_1 = require("../../test-helpers/supabaseMockChain");
// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('../../utils/notificationHelper');
jest.mock('jsonwebtoken');
jest.mock('../../middleware/csrf', () => ({
    csrfTokenGenerator: (req, res, next) => next(),
    csrfProtection: (req, res, next) => next() // Bypass CSRF for tests
}));
describe('Notification Routes Integration Tests', () => {
    let app;
    let authToken;
    let csrfToken;
    beforeAll(() => {
        process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests-minimum-32-chars';
        process.env.SESSION_SECRET = 'test-session-secret';
        process.env.NODE_ENV = 'test';
        app = (0, express_1.default)();
        app.use((0, cookie_parser_1.default)());
        app.use(express_1.default.json());
        app.use((0, express_session_1.default)({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: { secure: false }
        }));
        app.use(csrf_1.csrfTokenGenerator);
        app.use('/api/notifications', notifications_1.default);
    });
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock JWT verify to return test user payload
        jsonwebtoken_1.default.verify.mockReturnValue({
            userId: 'user-123',
            email: 'test@example.com',
            role: 'user',
            iat: Date.now(),
            exp: Date.now() + 3600
        });
        // Mock Supabase user lookup (used by authenticateToken middleware)
        supabase_1.supabase.from.mockImplementation((table) => {
            if (table === 'users') {
                return (0, supabaseMockChain_1.createMockChain)({
                    data: [{
                            id: 'user-123',
                            pseudonym: 'testuser',
                            email: 'test@example.com',
                            role: 'user',
                            is_active: true,
                            account_type: 'regular'
                        }],
                    error: null
                });
            }
            return (0, supabaseMockChain_1.createMockChain)({ data: [], error: null });
        });
        authToken = 'test-jwt-token';
        csrfToken = 'test-csrf-token';
    });
    describe('GET /api/notifications', () => {
        it('should return user notifications with authentication', async () => {
            const mockNotifications = [
                {
                    id: 'notif-1',
                    user_id: 'user-123',
                    type: 'comment_reply',
                    title: 'New Reply',
                    message: 'Someone replied to your comment',
                    is_read: false,
                    created_at: '2025-01-15T10:00:00Z'
                },
                {
                    id: 'notif-2',
                    user_id: 'user-123',
                    type: 'new_favorite',
                    title: 'New Favorite',
                    message: 'Someone favorited your profile',
                    is_read: true,
                    created_at: '2025-01-14T10:00:00Z'
                }
            ];
            // Mock RPC separately (supabase.from already mocked for auth in beforeEach)
            supabase_1.supabase.rpc.mockResolvedValueOnce({
                data: mockNotifications,
                error: null
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/notifications')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(response.body).toHaveProperty('notifications');
            expect(response.body).toHaveProperty('total');
            expect(response.body.notifications).toHaveLength(2);
            expect(response.body.total).toBe(2);
            expect(supabase_1.supabase.rpc).toHaveBeenCalledWith('get_user_notifications', {
                p_user_id: 'user-123',
                p_limit: 50,
                p_unread_only: false
            });
        });
        it('should filter unread notifications when unread_only=true', async () => {
            const mockNotifications = [
                {
                    id: 'notif-1',
                    type: 'comment_reply',
                    is_read: false
                }
            ];
            supabase_1.supabase.rpc.mockResolvedValue({
                data: mockNotifications,
                error: null
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/notifications?unread_only=true')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(supabase_1.supabase.rpc).toHaveBeenCalledWith('get_user_notifications', {
                p_user_id: 'user-123',
                p_limit: 50,
                p_unread_only: true
            });
            expect(response.body.notifications).toHaveLength(1);
        });
        it('should apply custom limit parameter', async () => {
            supabase_1.supabase.rpc.mockResolvedValue({
                data: [],
                error: null
            });
            await (0, supertest_1.default)(app)
                .get('/api/notifications?limit=10')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(supabase_1.supabase.rpc).toHaveBeenCalledWith('get_user_notifications', {
                p_user_id: 'user-123',
                p_limit: 10,
                p_unread_only: false
            });
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/notifications')
                .expect(401);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('GET /api/notifications/unread-count', () => {
        it('should return unread notification count with authentication', async () => {
            notificationHelper.getUnreadNotificationCount.mockResolvedValueOnce(5);
            const response = await (0, supertest_1.default)(app)
                .get('/api/notifications/unread-count')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(response.body).toHaveProperty('count');
            expect(response.body.count).toBe(5);
            expect(notificationHelper.getUnreadNotificationCount).toHaveBeenCalledWith('user-123');
        });
        it('should return 0 when user has no unread notifications', async () => {
            notificationHelper.getUnreadNotificationCount.mockResolvedValueOnce(0);
            const response = await (0, supertest_1.default)(app)
                .get('/api/notifications/unread-count')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(response.body.count).toBe(0);
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/notifications/unread-count')
                .expect(401);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('PATCH /api/notifications/:id/read', () => {
        it('should mark notification as read with authentication', async () => {
            supabase_1.supabase.rpc.mockResolvedValue({
                data: true,
                error: null
            });
            const response = await (0, supertest_1.default)(app)
                .patch('/api/notifications/notif-123/read')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Notification marked as read');
            expect(supabase_1.supabase.rpc).toHaveBeenCalledWith('mark_notification_read', {
                p_notification_id: 'notif-123',
                p_user_id: 'user-123'
            });
        });
        it('should return 404 when notification not found or belongs to another user', async () => {
            supabase_1.supabase.rpc.mockResolvedValue({
                data: false,
                error: null
            });
            const response = await (0, supertest_1.default)(app)
                .patch('/api/notifications/other-user-notif/read')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(404);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('does not belong to you');
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch('/api/notifications/notif-123/read')
                .expect(401);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('PATCH /api/notifications/mark-all-read', () => {
        it('should mark all notifications as read with authentication', async () => {
            supabase_1.supabase.rpc.mockResolvedValue({
                data: true,
                error: null
            });
            const response = await (0, supertest_1.default)(app)
                .patch('/api/notifications/mark-all-read')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('All notifications marked as read');
            expect(supabase_1.supabase.rpc).toHaveBeenCalledWith('mark_all_notifications_read', {
                p_user_id: 'user-123'
            });
        });
        it('should succeed even when user has no notifications', async () => {
            supabase_1.supabase.rpc.mockResolvedValue({
                data: true,
                error: null
            });
            const response = await (0, supertest_1.default)(app)
                .patch('/api/notifications/mark-all-read')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(response.body.message).toBe('All notifications marked as read');
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch('/api/notifications/mark-all-read')
                .expect(401);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('DELETE /api/notifications/:id', () => {
        it('should delete notification with authentication', async () => {
            supabase_1.supabase.rpc.mockResolvedValue({
                data: true,
                error: null
            });
            const response = await (0, supertest_1.default)(app)
                .delete('/api/notifications/notif-123')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toBe('Notification deleted');
            expect(supabase_1.supabase.rpc).toHaveBeenCalledWith('delete_notification', {
                p_notification_id: 'notif-123',
                p_user_id: 'user-123'
            });
        });
        it('should succeed even if notification does not exist (idempotent)', async () => {
            supabase_1.supabase.rpc.mockResolvedValue({
                data: true,
                error: null
            });
            const response = await (0, supertest_1.default)(app)
                .delete('/api/notifications/nonexistent')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(response.body.message).toBe('Notification deleted');
        });
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .delete('/api/notifications/notif-123')
                .expect(401);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('Database Error Handling', () => {
        it('should handle database errors gracefully for GET /api/notifications', async () => {
            supabase_1.supabase.rpc.mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/notifications')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(500);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Failed to fetch notifications');
        });
        it('should handle database errors gracefully for PATCH mark-all-read', async () => {
            supabase_1.supabase.rpc.mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
            });
            const response = await (0, supertest_1.default)(app)
                .patch('/api/notifications/mark-all-read')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(500);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Failed to mark all as read');
        });
    });
    describe('Complete Notification Flow', () => {
        it('should complete: Fetch notifications → Mark one as read → Mark all as read → Delete one', async () => {
            // Step 1: Fetch notifications (2 unread)
            supabase_1.supabase.rpc.mockResolvedValueOnce({
                data: [
                    { id: 'notif-1', is_read: false },
                    { id: 'notif-2', is_read: false }
                ],
                error: null
            });
            let response = await (0, supertest_1.default)(app)
                .get('/api/notifications')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(response.body.notifications).toHaveLength(2);
            // Step 2: Mark one notification as read
            supabase_1.supabase.rpc.mockResolvedValueOnce({
                data: true,
                error: null
            });
            response = await (0, supertest_1.default)(app)
                .patch('/api/notifications/notif-1/read')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(response.body.message).toBe('Notification marked as read');
            // Step 3: Mark all as read
            supabase_1.supabase.rpc.mockResolvedValueOnce({
                data: true,
                error: null
            });
            response = await (0, supertest_1.default)(app)
                .patch('/api/notifications/mark-all-read')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(response.body.message).toBe('All notifications marked as read');
            // Step 4: Delete one notification
            supabase_1.supabase.rpc.mockResolvedValueOnce({
                data: true,
                error: null
            });
            response = await (0, supertest_1.default)(app)
                .delete('/api/notifications/notif-1')
                .set('Cookie', [`auth-token=${authToken}`])
                .expect(200);
            expect(response.body.message).toBe('Notification deleted');
        });
    });
});
//# sourceMappingURL=notifications.integration.test.js.map