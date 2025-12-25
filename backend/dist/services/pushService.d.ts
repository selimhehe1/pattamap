import { NotificationType } from '../types';
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
    tag?: string;
    requireInteraction?: boolean;
}
/**
 * Send push notification to a single subscription
 * @param subscription Web Push API subscription object
 * @param payload Notification payload
 * @returns Success boolean
 */
export declare const sendPushNotification: (subscription: PushSubscription, payload: PushNotificationPayload) => Promise<boolean>;
/**
 * Send push notification to a specific user (all their devices)
 * @param userId User ID
 * @param payload Notification payload
 * @returns Number of successful sends
 */
export declare const sendPushToUser: (userId: string, payload: PushNotificationPayload) => Promise<number>;
/**
 * Send push notification to multiple users (batch)
 * @param userIds Array of user IDs
 * @param payload Notification payload
 * @returns Total number of successful sends
 */
export declare const sendPushToUsers: (userIds: string[], payload: PushNotificationPayload) => Promise<number>;
/**
 * Create push notification payload from in-app notification
 * @param notification In-app notification object
 * @returns Push notification payload
 */
export declare const createPushPayload: (notification: {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    related_entity_id?: string;
}) => PushNotificationPayload;
/**
 * Get VAPID public key (for frontend subscription)
 * @returns VAPID public key
 */
export declare const getVapidPublicKey: () => string;
/**
 * Check if push notifications are configured
 * @returns Boolean indicating if VAPID keys are set and valid
 */
export declare const isPushConfigured: () => boolean;
//# sourceMappingURL=pushService.d.ts.map