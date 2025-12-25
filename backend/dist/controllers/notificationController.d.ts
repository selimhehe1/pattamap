import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Get current user's notifications
 * GET /api/notifications
 * Query params: ?unread_only=true&limit=20
 */
export declare const getMyNotifications: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get unread notification count
 * GET /api/notifications/unread-count
 */
export declare const getUnreadCount: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
export declare const markAsRead: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Mark all notifications as read
 * PATCH /api/notifications/mark-all-read
 */
export declare const markAllRead: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
export declare const deleteNotification: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=notificationController.d.ts.map