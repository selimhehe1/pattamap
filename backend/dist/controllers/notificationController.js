"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllRead = exports.markAsRead = exports.getUnreadCount = exports.getMyNotifications = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const notificationHelper_1 = require("../utils/notificationHelper");
/**
 * Get current user's notifications
 * GET /api/notifications
 * Query params: ?unread_only=true&limit=20
 */
const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { unread_only, limit: rawLimit = '50' } = req.query;
        // 🔧 FIX N4: Validate and sanitize limit parameter (1-100)
        const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 50));
        // Use RPC function to bypass PostgREST cache issue
        const { data: notifications, error } = await supabase_1.supabase.rpc('get_user_notifications', {
            p_user_id: userId,
            p_limit: limit,
            p_unread_only: unread_only === 'true'
        });
        if (error) {
            logger_1.logger.error('Get notifications error:', error);
            return res.status(500).json({ error: 'Failed to fetch notifications' });
        }
        res.json({
            notifications: notifications || [],
            total: notifications?.length || 0
        });
    }
    catch (error) {
        logger_1.logger.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMyNotifications = getMyNotifications;
/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await (0, notificationHelper_1.getUnreadNotificationCount)(userId);
        res.json({ count });
    }
    catch (error) {
        logger_1.logger.error('Get unread count error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getUnreadCount = getUnreadCount;
/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // Use RPC function
        const { data: success, error } = await supabase_1.supabase.rpc('mark_notification_read', {
            p_notification_id: id,
            p_user_id: userId
        });
        if (error) {
            logger_1.logger.error('Mark notification as read error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!success) {
            return res.status(404).json({
                error: 'Notification not found or does not belong to you'
            });
        }
        res.json({ message: 'Notification marked as read' });
    }
    catch (error) {
        logger_1.logger.error('Mark notification as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.markAsRead = markAsRead;
/**
 * Mark all notifications as read
 * PATCH /api/notifications/mark-all-read
 */
const markAllRead = async (req, res) => {
    try {
        const userId = req.user.id;
        // Use RPC function
        const { data: success, error } = await supabase_1.supabase.rpc('mark_all_notifications_read', {
            p_user_id: userId
        });
        if (error) {
            logger_1.logger.error('Mark all notifications as read error:', error);
            return res.status(500).json({ error: 'Failed to mark all as read' });
        }
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        logger_1.logger.error('Mark all notifications as read error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.markAllRead = markAllRead;
/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // Use RPC function
        const { data: success, error } = await supabase_1.supabase.rpc('delete_notification', {
            p_notification_id: id,
            p_user_id: userId
        });
        if (error) {
            logger_1.logger.error('Delete notification error:', error);
            return res.status(500).json({ error: 'Failed to delete notification' });
        }
        res.json({ message: 'Notification deleted' });
    }
    catch (error) {
        logger_1.logger.error('Delete notification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.deleteNotification = deleteNotification;
//# sourceMappingURL=notificationController.js.map