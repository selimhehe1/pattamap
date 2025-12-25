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
Object.defineProperty(exports, "__esModule", { value: true });
const notificationController_1 = require("../notificationController");
const supabase_1 = require("../../config/supabase");
const notificationHelper = __importStar(require("../../utils/notificationHelper"));
// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('../../utils/notificationHelper');
describe('NotificationController', () => {
    let mockRequest;
    let mockResponse;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            query: {},
            params: {},
            body: {},
            user: {
                id: 'user-123',
                pseudonym: 'testuser',
                email: 'user@test.com',
                role: 'user',
                is_active: true
            }
        };
        mockResponse = {
            status: statusMock,
            json: jsonMock
        };
        jest.clearAllMocks();
    });
    describe('getMyNotifications', () => {
        it('should return user\'s notifications with default limit', async () => {
            const mockNotifications = [
                {
                    id: 'notif-1',
                    user_id: 'user-123',
                    type: 'ownership_request_approved',
                    title: 'Request Approved',
                    message: 'Your ownership request has been approved',
                    is_read: false,
                    created_at: '2025-01-15T10:00:00Z'
                },
                {
                    id: 'notif-2',
                    user_id: 'user-123',
                    type: 'system',
                    title: 'System Update',
                    message: 'New features available',
                    is_read: true,
                    created_at: '2025-01-14T10:00:00Z'
                }
            ];
            // Mock RPC function call
            supabase_1.supabase.rpc.mockResolvedValue({
                data: mockNotifications,
                error: null
            });
            await (0, notificationController_1.getMyNotifications)(mockRequest, mockResponse);
            expect(supabase_1.supabase.rpc).toHaveBeenCalledWith('get_user_notifications', {
                p_user_id: 'user-123',
                p_limit: 50,
                p_unread_only: false
            });
            expect(jsonMock).toHaveBeenCalledWith({
                notifications: mockNotifications,
                total: 2
            });
        });
        it('should filter unread notifications when unread_only=true', async () => {
            mockRequest.query = { unread_only: 'true' };
            const mockNotifications = [
                {
                    id: 'notif-1',
                    type: 'ownership_request_approved',
                    is_read: false
                }
            ];
            // Mock RPC function call
            supabase_1.supabase.rpc.mockResolvedValue({
                data: mockNotifications,
                error: null
            });
            await (0, notificationController_1.getMyNotifications)(mockRequest, mockResponse);
            expect(supabase_1.supabase.rpc).toHaveBeenCalledWith('get_user_notifications', {
                p_user_id: 'user-123',
                p_limit: 50,
                p_unread_only: true
            });
        });
        it('should apply custom limit from query params', async () => {
            mockRequest.query = { limit: '10' };
            // Mock RPC function call
            supabase_1.supabase.rpc.mockResolvedValue({
                data: [],
                error: null
            });
            await (0, notificationController_1.getMyNotifications)(mockRequest, mockResponse);
            expect(supabase_1.supabase.rpc).toHaveBeenCalledWith('get_user_notifications', {
                p_user_id: 'user-123',
                p_limit: 10,
                p_unread_only: false
            });
        });
        it('should return empty array when no notifications found', async () => {
            // Mock RPC function returning null
            supabase_1.supabase.rpc.mockResolvedValue({
                data: null,
                error: null
            });
            await (0, notificationController_1.getMyNotifications)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                notifications: [],
                total: 0
            });
        });
        it('should handle database errors', async () => {
            // Mock RPC function error
            supabase_1.supabase.rpc.mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
            });
            await (0, notificationController_1.getMyNotifications)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Failed to fetch notifications'
            });
        });
    });
    describe('getUnreadCount', () => {
        it('should return unread notification count', async () => {
            notificationHelper.getUnreadNotificationCount.mockResolvedValue(5);
            await (0, notificationController_1.getUnreadCount)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({ count: 5 });
            expect(notificationHelper.getUnreadNotificationCount).toHaveBeenCalledWith('user-123');
        });
        it('should return 0 if user has no unread notifications', async () => {
            notificationHelper.getUnreadNotificationCount.mockResolvedValue(0);
            await (0, notificationController_1.getUnreadCount)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({ count: 0 });
        });
        it('should handle errors gracefully', async () => {
            notificationHelper.getUnreadNotificationCount.mockRejectedValue(new Error('Database error'));
            await (0, notificationController_1.getUnreadCount)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Internal server error'
            });
        });
    });
    describe('markAsRead', () => {
        it('should mark notification as read', async () => {
            mockRequest.params = { id: 'notif-1' };
            // Mock RPC function call
            supabase_1.supabase.rpc.mockResolvedValue({
                data: true,
                error: null
            });
            await (0, notificationController_1.markAsRead)(mockRequest, mockResponse);
            expect(supabase_1.supabase.rpc).toHaveBeenCalledWith('mark_notification_read', {
                p_notification_id: 'notif-1',
                p_user_id: 'user-123'
            });
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Notification marked as read'
            });
        });
        it('should return 404 if notification not found or does not belong to user', async () => {
            mockRequest.params = { id: 'notif-nonexistent' };
            // Mock RPC function returning false (not found)
            supabase_1.supabase.rpc.mockResolvedValue({
                data: false,
                error: null
            });
            await (0, notificationController_1.markAsRead)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Notification not found or does not belong to you'
            });
        });
        it('should handle errors gracefully', async () => {
            mockRequest.params = { id: 'notif-1' };
            // Mock RPC function error
            supabase_1.supabase.rpc.mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
            });
            await (0, notificationController_1.markAsRead)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Internal server error'
            });
        });
    });
    describe('markAllRead', () => {
        it('should mark all user\'s notifications as read', async () => {
            // Mock RPC function call
            supabase_1.supabase.rpc.mockResolvedValue({
                data: true,
                error: null
            });
            await (0, notificationController_1.markAllRead)(mockRequest, mockResponse);
            expect(supabase_1.supabase.rpc).toHaveBeenCalledWith('mark_all_notifications_read', {
                p_user_id: 'user-123'
            });
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'All notifications marked as read'
            });
        });
        it('should handle database errors', async () => {
            // Mock RPC function error
            supabase_1.supabase.rpc.mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
            });
            await (0, notificationController_1.markAllRead)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Failed to mark all as read'
            });
        });
        it('should handle unexpected errors gracefully', async () => {
            // Mock RPC throwing exception
            supabase_1.supabase.rpc.mockRejectedValue(new Error('Unexpected error'));
            await (0, notificationController_1.markAllRead)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Internal server error'
            });
        });
    });
    describe('deleteNotification', () => {
        it('should delete user\'s notification', async () => {
            mockRequest.params = { id: 'notif-1' };
            // Mock RPC function call
            supabase_1.supabase.rpc.mockResolvedValue({
                data: true,
                error: null
            });
            await (0, notificationController_1.deleteNotification)(mockRequest, mockResponse);
            expect(supabase_1.supabase.rpc).toHaveBeenCalledWith('delete_notification', {
                p_notification_id: 'notif-1',
                p_user_id: 'user-123'
            });
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Notification deleted'
            });
        });
        it('should succeed even if notification does not exist (idempotent)', async () => {
            mockRequest.params = { id: 'notif-nonexistent' };
            // Mock RPC function returning success (PostgreSQL function is idempotent)
            supabase_1.supabase.rpc.mockResolvedValue({
                data: true,
                error: null
            });
            await (0, notificationController_1.deleteNotification)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Notification deleted'
            });
        });
        it('should handle database errors', async () => {
            mockRequest.params = { id: 'notif-1' };
            // Mock RPC function error
            supabase_1.supabase.rpc.mockResolvedValue({
                data: null,
                error: { message: 'Database error' }
            });
            await (0, notificationController_1.deleteNotification)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Failed to delete notification'
            });
        });
        it('should handle unexpected errors', async () => {
            mockRequest.params = { id: 'notif-1' };
            // Mock RPC throwing exception
            supabase_1.supabase.rpc.mockRejectedValue(new Error('Unexpected error'));
            await (0, notificationController_1.deleteNotification)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Internal server error'
            });
        });
    });
});
//# sourceMappingURL=notificationController.test.js.map