import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  deleteNotification
} from '../notificationController';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import * as notificationHelper from '../../utils/notificationHelper';

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('../../utils/notificationHelper');

describe('NotificationController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

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
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockNotifications,
        error: null
      });

      await getMyNotifications(mockRequest as AuthRequest, mockResponse as Response);

      expect(supabase.rpc).toHaveBeenCalledWith('get_user_notifications', {
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
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: mockNotifications,
        error: null
      });

      await getMyNotifications(mockRequest as AuthRequest, mockResponse as Response);

      expect(supabase.rpc).toHaveBeenCalledWith('get_user_notifications', {
        p_user_id: 'user-123',
        p_limit: 50,
        p_unread_only: true
      });
    });

    it('should apply custom limit from query params', async () => {
      mockRequest.query = { limit: '10' };

      // Mock RPC function call
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: [],
        error: null
      });

      await getMyNotifications(mockRequest as AuthRequest, mockResponse as Response);

      expect(supabase.rpc).toHaveBeenCalledWith('get_user_notifications', {
        p_user_id: 'user-123',
        p_limit: 10,
        p_unread_only: false
      });
    });

    it('should return empty array when no notifications found', async () => {
      // Mock RPC function returning null
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: null
      });

      await getMyNotifications(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        notifications: [],
        total: 0
      });
    });

    it('should handle database errors', async () => {
      // Mock RPC function error
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await getMyNotifications(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch notifications'
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      (notificationHelper.getUnreadNotificationCount as jest.Mock).mockResolvedValue(5);

      await getUnreadCount(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ count: 5 });
      expect(notificationHelper.getUnreadNotificationCount).toHaveBeenCalledWith('user-123');
    });

    it('should return 0 if user has no unread notifications', async () => {
      (notificationHelper.getUnreadNotificationCount as jest.Mock).mockResolvedValue(0);

      await getUnreadCount(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ count: 0 });
    });

    it('should handle errors gracefully', async () => {
      (notificationHelper.getUnreadNotificationCount as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await getUnreadCount(mockRequest as AuthRequest, mockResponse as Response);

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
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null
      });

      await markAsRead(mockRequest as AuthRequest, mockResponse as Response);

      expect(supabase.rpc).toHaveBeenCalledWith('mark_notification_read', {
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
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: false,
        error: null
      });

      await markAsRead(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Notification not found or does not belong to you'
      });
    });

    it('should handle errors gracefully', async () => {
      mockRequest.params = { id: 'notif-1' };

      // Mock RPC function error
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await markAsRead(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });
  });

  describe('markAllRead', () => {
    it('should mark all user\'s notifications as read', async () => {
      // Mock RPC function call
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null
      });

      await markAllRead(mockRequest as AuthRequest, mockResponse as Response);

      expect(supabase.rpc).toHaveBeenCalledWith('mark_all_notifications_read', {
        p_user_id: 'user-123'
      });
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'All notifications marked as read'
      });
    });

    it('should handle database errors', async () => {
      // Mock RPC function error
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await markAllRead(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to mark all as read'
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock RPC throwing exception
      (supabase.rpc as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      await markAllRead(mockRequest as AuthRequest, mockResponse as Response);

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
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null
      });

      await deleteNotification(mockRequest as AuthRequest, mockResponse as Response);

      expect(supabase.rpc).toHaveBeenCalledWith('delete_notification', {
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
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: true,
        error: null
      });

      await deleteNotification(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Notification deleted'
      });
    });

    it('should handle database errors', async () => {
      mockRequest.params = { id: 'notif-1' };

      // Mock RPC function error
      (supabase.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await deleteNotification(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to delete notification'
      });
    });

    it('should handle unexpected errors', async () => {
      mockRequest.params = { id: 'notif-1' };

      // Mock RPC throwing exception
      (supabase.rpc as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      await deleteNotification(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });
  });
});
