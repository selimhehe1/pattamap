/**
 * Notification Database Operations
 *
 * CRUD operations for notification management
 */

import { supabase } from '../../config/supabase';
import { logger } from '../logger';

/**
 * Mark notification as read
 * @param notificationId Notification ID
 * @param userId User ID (for security check)
 * @returns Success boolean
 */
export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId); // Ensure user owns this notification

    if (error) {
      logger.error('Mark notification as read error:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Mark notification as read error:', error);
    return false;
  }
};

/**
 * Mark all notifications as read for a user
 * @param userId User ID
 * @returns Success boolean
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      logger.error('Mark all notifications as read error:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Mark all notifications as read error:', error);
    return false;
  }
};

/**
 * Get unread notification count for a user
 * @param userId User ID
 * @returns Unread count or 0 if error
 */
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    // Use RPC function to bypass PostgREST cache issue
    const { data: count, error } = await supabase.rpc('get_unread_count', {
      p_user_id: userId
    });

    if (error) {
      logger.error('Get unread notification count error:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    logger.error('Get unread notification count error:', error);
    return 0;
  }
};
