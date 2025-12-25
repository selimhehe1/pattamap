import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Get VAPID public key
 * Public endpoint - needed for frontend to subscribe to push
 * GET /api/push/vapid-public-key
 */
export declare const getPublicKey: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Subscribe to push notifications
 * Creates a new push subscription for the authenticated user
 * POST /api/push/subscribe
 * Body: { subscription: PushSubscription }
 */
export declare const subscribe: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Unsubscribe from push notifications
 * Removes a push subscription for the authenticated user
 * POST /api/push/unsubscribe
 * Body: { endpoint: string }
 */
export declare const unsubscribe: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get user's push subscriptions
 * Returns all active push subscriptions for the authenticated user
 * GET /api/push/subscriptions
 */
export declare const getUserSubscriptions: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Check if push is supported and user is subscribed
 * GET /api/push/status
 */
export declare const getPushStatus: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=pushController.d.ts.map