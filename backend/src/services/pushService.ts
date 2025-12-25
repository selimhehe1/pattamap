import webpush from 'web-push';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { NotificationType } from '../types';

// ==========================================
// WEB PUSH CONFIGURATION
// ==========================================

// VAPID keys for Web Push API authentication
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || '').trim();
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@pattamap.com';

// Configure web-push with error handling for invalid keys
let vapidConfigured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
  } catch (error: any) {
    logger.error('❌ VAPID configuration failed:', error.message);
    logger.error('Push notifications will be disabled. Please check your VAPID keys.');
    logger.error('Keys must be URL-safe Base64 without "=" padding.');
  }
} else {
  logger.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
  logger.warn('Generate keys with: npx web-push generate-vapid-keys');
}

// ==========================================
// TYPES
// ==========================================

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: {
    url?: string;
    notificationId?: string;
    type?: NotificationType;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string; // Group notifications by tag
  requireInteraction?: boolean;
}

// ==========================================
// CORE PUSH FUNCTIONS
// ==========================================

/**
 * Send push notification to a single subscription
 * @param subscription Web Push API subscription object
 * @param payload Notification payload
 * @returns Success boolean
 */
export const sendPushNotification = async (
  subscription: PushSubscription,
  payload: PushNotificationPayload
): Promise<boolean> => {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      logger.error('Cannot send push: VAPID keys not configured');
      return false;
    }

    const payloadString = JSON.stringify(payload);

    await webpush.sendNotification(subscription, payloadString);

    // Update last_used_at for this subscription
    await supabase.rpc('update_subscription_last_used', {
      p_endpoint: subscription.endpoint
    });

    logger.info('Push notification sent successfully', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      title: payload.title
    });

    return true;
  } catch (error: any) {
    // Handle specific push errors
    if (error.statusCode === 404 || error.statusCode === 410) {
      // Subscription expired or invalid - remove it
      logger.warn('Push subscription expired/invalid, removing:', {
        endpoint: subscription.endpoint.substring(0, 50) + '...',
        statusCode: error.statusCode
      });

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', subscription.endpoint);

      return false;
    }

    logger.error('Send push notification error:', {
      error: error.message,
      statusCode: error.statusCode,
      endpoint: subscription.endpoint.substring(0, 50) + '...'
    });

    return false;
  }
};

/**
 * Send push notification to a specific user (all their devices)
 * @param userId User ID
 * @param payload Notification payload
 * @returns Number of successful sends
 */
export const sendPushToUser = async (
  userId: string,
  payload: PushNotificationPayload
): Promise<number> => {
  try {
    // Get all subscriptions for this user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh_key, auth_key')
      .eq('user_id', userId);

    if (error || !subscriptions || subscriptions.length === 0) {
      logger.debug('No push subscriptions found for user', { userId });
      return 0;
    }

    // Send to all user's devices in parallel
    const results = await Promise.all(
      subscriptions.map(sub =>
        sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key
            }
          },
          payload
        )
      )
    );

    const successCount = results.filter(success => success).length;

    logger.info('Push notifications sent to user', {
      userId,
      totalDevices: subscriptions.length,
      successful: successCount,
      title: payload.title
    });

    return successCount;
  } catch (error) {
    logger.error('Send push to user error:', error);
    return 0;
  }
};

/**
 * Send push notification to multiple users (batch)
 * @param userIds Array of user IDs
 * @param payload Notification payload
 * @returns Total number of successful sends
 */
export const sendPushToUsers = async (
  userIds: string[],
  payload: PushNotificationPayload
): Promise<number> => {
  try {
    if (userIds.length === 0) {
      return 0;
    }

    // Get all subscriptions for these users
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh_key, auth_key, user_id')
      .in('user_id', userIds);

    if (error || !subscriptions || subscriptions.length === 0) {
      logger.debug('No push subscriptions found for users', {
        userCount: userIds.length
      });
      return 0;
    }

    // Send to all devices in parallel (with rate limiting)
    // Split into batches of 100 to avoid overwhelming the push service
    const batchSize = 100;
    let totalSuccess = 0;

    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(sub =>
          sendPushNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh_key,
                auth: sub.auth_key
              }
            },
            payload
          )
        )
      );

      totalSuccess += results.filter(success => success).length;
    }

    logger.info('Batch push notifications sent', {
      userCount: userIds.length,
      totalDevices: subscriptions.length,
      successful: totalSuccess,
      title: payload.title
    });

    return totalSuccess;
  } catch (error) {
    logger.error('Send push to users error:', error);
    return 0;
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Create push notification payload from in-app notification
 * @param notification In-app notification object
 * @returns Push notification payload
 */
export const createPushPayload = (notification: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  related_entity_id?: string;
}): PushNotificationPayload => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  return {
    title: notification.title,
    body: notification.message,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: {
      url: notification.link ? `${baseUrl}${notification.link}` : baseUrl,
      notificationId: notification.related_entity_id,
      type: notification.type
    },
    tag: notification.type, // Group by notification type
    requireInteraction: false // Don't force user interaction
  };
};

/**
 * Get VAPID public key (for frontend subscription)
 * @returns VAPID public key
 */
export const getVapidPublicKey = (): string => {
  return VAPID_PUBLIC_KEY;
};

/**
 * Check if push notifications are configured
 * @returns Boolean indicating if VAPID keys are set and valid
 */
export const isPushConfigured = (): boolean => {
  return vapidConfigured;
};
