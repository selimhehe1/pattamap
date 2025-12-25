"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPushConfigured = exports.getVapidPublicKey = exports.createPushPayload = exports.sendPushToUsers = exports.sendPushToUser = exports.sendPushNotification = void 0;
const web_push_1 = __importDefault(require("web-push"));
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
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
        web_push_1.default.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
        vapidConfigured = true;
    }
    catch (error) {
        logger_1.logger.error('❌ VAPID configuration failed:', error.message);
        logger_1.logger.error('Push notifications will be disabled. Please check your VAPID keys.');
        logger_1.logger.error('Keys must be URL-safe Base64 without "=" padding.');
    }
}
else {
    logger_1.logger.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
    logger_1.logger.warn('Generate keys with: npx web-push generate-vapid-keys');
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
const sendPushNotification = async (subscription, payload) => {
    try {
        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            logger_1.logger.error('Cannot send push: VAPID keys not configured');
            return false;
        }
        const payloadString = JSON.stringify(payload);
        await web_push_1.default.sendNotification(subscription, payloadString);
        // Update last_used_at for this subscription
        await supabase_1.supabase.rpc('update_subscription_last_used', {
            p_endpoint: subscription.endpoint
        });
        logger_1.logger.info('Push notification sent successfully', {
            endpoint: subscription.endpoint.substring(0, 50) + '...',
            title: payload.title
        });
        return true;
    }
    catch (error) {
        // Handle specific push errors
        if (error.statusCode === 404 || error.statusCode === 410) {
            // Subscription expired or invalid - remove it
            logger_1.logger.warn('Push subscription expired/invalid, removing:', {
                endpoint: subscription.endpoint.substring(0, 50) + '...',
                statusCode: error.statusCode
            });
            await supabase_1.supabase
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', subscription.endpoint);
            return false;
        }
        logger_1.logger.error('Send push notification error:', {
            error: error.message,
            statusCode: error.statusCode,
            endpoint: subscription.endpoint.substring(0, 50) + '...'
        });
        return false;
    }
};
exports.sendPushNotification = sendPushNotification;
/**
 * Send push notification to a specific user (all their devices)
 * @param userId User ID
 * @param payload Notification payload
 * @returns Number of successful sends
 */
const sendPushToUser = async (userId, payload) => {
    try {
        // Get all subscriptions for this user
        const { data: subscriptions, error } = await supabase_1.supabase
            .from('push_subscriptions')
            .select('endpoint, p256dh_key, auth_key')
            .eq('user_id', userId);
        if (error || !subscriptions || subscriptions.length === 0) {
            logger_1.logger.debug('No push subscriptions found for user', { userId });
            return 0;
        }
        // Send to all user's devices in parallel
        const results = await Promise.all(subscriptions.map(sub => (0, exports.sendPushNotification)({
            endpoint: sub.endpoint,
            keys: {
                p256dh: sub.p256dh_key,
                auth: sub.auth_key
            }
        }, payload)));
        const successCount = results.filter(success => success).length;
        logger_1.logger.info('Push notifications sent to user', {
            userId,
            totalDevices: subscriptions.length,
            successful: successCount,
            title: payload.title
        });
        return successCount;
    }
    catch (error) {
        logger_1.logger.error('Send push to user error:', error);
        return 0;
    }
};
exports.sendPushToUser = sendPushToUser;
/**
 * Send push notification to multiple users (batch)
 * @param userIds Array of user IDs
 * @param payload Notification payload
 * @returns Total number of successful sends
 */
const sendPushToUsers = async (userIds, payload) => {
    try {
        if (userIds.length === 0) {
            return 0;
        }
        // Get all subscriptions for these users
        const { data: subscriptions, error } = await supabase_1.supabase
            .from('push_subscriptions')
            .select('endpoint, p256dh_key, auth_key, user_id')
            .in('user_id', userIds);
        if (error || !subscriptions || subscriptions.length === 0) {
            logger_1.logger.debug('No push subscriptions found for users', {
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
            const results = await Promise.all(batch.map(sub => (0, exports.sendPushNotification)({
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh_key,
                    auth: sub.auth_key
                }
            }, payload)));
            totalSuccess += results.filter(success => success).length;
        }
        logger_1.logger.info('Batch push notifications sent', {
            userCount: userIds.length,
            totalDevices: subscriptions.length,
            successful: totalSuccess,
            title: payload.title
        });
        return totalSuccess;
    }
    catch (error) {
        logger_1.logger.error('Send push to users error:', error);
        return 0;
    }
};
exports.sendPushToUsers = sendPushToUsers;
// ==========================================
// HELPER FUNCTIONS
// ==========================================
/**
 * Create push notification payload from in-app notification
 * @param notification In-app notification object
 * @returns Push notification payload
 */
const createPushPayload = (notification) => {
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
exports.createPushPayload = createPushPayload;
/**
 * Get VAPID public key (for frontend subscription)
 * @returns VAPID public key
 */
const getVapidPublicKey = () => {
    return VAPID_PUBLIC_KEY;
};
exports.getVapidPublicKey = getVapidPublicKey;
/**
 * Check if push notifications are configured
 * @returns Boolean indicating if VAPID keys are set and valid
 */
const isPushConfigured = () => {
    return vapidConfigured;
};
exports.isPushConfigured = isPushConfigured;
//# sourceMappingURL=pushService.js.map