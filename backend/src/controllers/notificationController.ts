import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  getUnreadNotificationCount
} from '../utils/notificationHelper';

/**
 * Get current user's notifications
 * GET /api/notifications
 * Query params: ?unread_only=true&limit=20
 */
export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { unread_only, limit: rawLimit = '50' } = req.query;

    // 🔧 FIX N4: Validate and sanitize limit parameter (1-100)
    const limit = Math.min(100, Math.max(1, parseInt(rawLimit as string, 10) || 50));

    // Use RPC function to bypass PostgREST cache issue
    const { data: notifications, error } = await supabase.rpc('get_user_notifications', {
      p_user_id: userId,
      p_limit: limit,
      p_unread_only: unread_only === 'true'
    });

    if (error) {
      logger.error('Get notifications error:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    res.json({
      notifications: notifications || [],
      total: notifications?.length || 0
    });
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const count = await getUnreadNotificationCount(userId);

    res.json({ count });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Use RPC function
    const { data: success, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: id,
      p_user_id: userId
    });

    if (error) {
      logger.error('Mark notification as read error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!success) {
      return res.status(404).json({
        error: 'Notification not found or does not belong to you'
      });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mark all notifications as read
 * PATCH /api/notifications/mark-all-read
 */
export const markAllRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Use RPC function
    const { data: success, error } = await supabase.rpc('mark_all_notifications_read', {
      p_user_id: userId
    });

    if (error) {
      logger.error('Mark all notifications as read error:', error);
      return res.status(500).json({ error: 'Failed to mark all as read' });
    }

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Use RPC function
    const { data: success, error } = await supabase.rpc('delete_notification', {
      p_notification_id: id,
      p_user_id: userId
    });

    if (error) {
      logger.error('Delete notification error:', error);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    logger.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
