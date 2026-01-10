/**
 * Core Notification Functions
 *
 * Fundamental functions for creating and sending notifications
 */

import { supabase } from '../../config/supabase';
import { logger } from '../logger';
import { sendPushToUser } from '../../services/pushService';
import { sanitizeInternalLink } from '../validation';
import { UserRole, CreateNotificationRequest } from './types';

// ============================================================================
// USER FETCHING
// ============================================================================

/**
 * Fetch user IDs by role(s)
 * @param roles - Single role or array of roles to fetch
 * @param activeOnly - Whether to filter by is_active (default: false for backward compat)
 * @returns Array of user IDs or empty array if none found
 */
export const fetchUserIdsByRole = async (
  roles: UserRole | UserRole[],
  activeOnly: boolean = false
): Promise<string[]> => {
  try {
    const roleArray = Array.isArray(roles) ? roles : [roles];

    let query = supabase
      .from('users')
      .select('id');

    if (roleArray.length === 1) {
      query = query.eq('role', roleArray[0]);
    } else {
      query = query.in('role', roleArray);
    }

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error || !data) {
      logger.warn(`No users found with role(s): ${roleArray.join(', ')}`);
      return [];
    }

    return data.map(u => u.id);
  } catch (error) {
    logger.error('Fetch users by role error:', error);
    return [];
  }
};

// ============================================================================
// NOTIFICATION CREATION
// ============================================================================

/**
 * Create a new in-app notification for a user
 * Automatically sends push notification if user has subscriptions
 *
 * v10.3 - i18n Support:
 * - NEW: Pass i18n_key + i18n_params for multilingual notifications
 * - Backward compatible: Still accepts title + message
 * - Metadata: i18n data stored in JSONB column
 *
 * @param params Notification parameters
 * @returns Created notification ID or null if failed
 */
export const createNotification = async (params: CreateNotificationRequest): Promise<string | null> => {
  try {
    // Build metadata object for i18n support
    const metadata: Record<string, unknown> = {};
    if (params.i18n_key) {
      metadata.i18n_key = params.i18n_key;
      if (params.i18n_params) {
        metadata.i18n_params = params.i18n_params;
      }
    }

    // Validation: Require either (i18n_key) OR (title + message)
    if (!params.i18n_key && (!params.title || !params.message)) {
      logger.error('Create notification validation error: Must provide either i18n_key OR (title + message)');
      return null;
    }

    // Validate and sanitize internal links to prevent open redirects/XSS
    const sanitizedLink = sanitizeInternalLink(params.link);
    if (params.link && !sanitizedLink) {
      logger.warn('Notification link rejected (invalid format)', {
        userId: params.user_id,
        type: params.type,
        originalLink: params.link?.substring(0, 100)
      });
    }

    // Fallback values for backward compatibility
    const title = params.title || 'Notification';
    const message = params.message || '';

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.user_id,
        type: params.type,
        title,
        message,
        link: sanitizedLink,
        related_entity_type: params.related_entity_type,
        related_entity_id: params.related_entity_id,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        is_read: false
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Create notification error:', error);
      return null;
    }

    logger.info('Notification created', {
      notificationId: data.id,
      userId: params.user_id,
      type: params.type,
      hasI18nKey: !!params.i18n_key
    });

    // Send push notification asynchronously (don't await to avoid blocking)
    sendPushToUser(params.user_id, {
      title,
      body: message,
      icon: '/logo192.png',
      badge: '/badge.png',
      data: {
        url: params.link,
        notificationId: data.id,
        type: params.type
      },
      tag: params.type,
      requireInteraction: false
    }).catch(error => {
      logger.warn('Push notification failed (non-blocking)', {
        notificationId: data.id,
        userId: params.user_id,
        error: error.message
      });
    });

    return data.id;
  } catch (error) {
    logger.error('Create notification error:', error);
    return null;
  }
};

// ============================================================================
// BATCH NOTIFICATIONS
// ============================================================================

/**
 * Send notifications to multiple users with Promise.allSettled
 * Handles logging and failure tracking automatically
 *
 * @param userIds - Array of user IDs to notify
 * @param notificationBuilder - Function that creates notification params for each user
 * @param context - Context string for logging (e.g., 'admin ownership request')
 */
export const notifyMultipleUsers = async (
  userIds: string[],
  notificationBuilder: (userId: string) => CreateNotificationRequest,
  context: string
): Promise<{ successCount: number; failedCount: number }> => {
  if (userIds.length === 0) {
    logger.warn(`No users to notify for: ${context}`);
    return { successCount: 0, failedCount: 0 };
  }

  const notificationPromises = userIds.map(userId =>
    createNotification(notificationBuilder(userId))
  );

  const results = await Promise.allSettled(notificationPromises);
  const failed = results.filter(r => r.status === 'rejected');
  const successCount = results.length - failed.length;
  const failedCount = failed.length;

  if (failedCount > 0) {
    logger.warn(`Some ${context} notifications failed`, { failedCount, totalCount: results.length });
  }

  logger.info(`Users notified: ${context}`, {
    userCount: userIds.length,
    successCount,
    failedCount
  });

  return { successCount, failedCount };
};
