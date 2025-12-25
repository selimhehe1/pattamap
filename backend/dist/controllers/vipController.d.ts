/**
 * 🆕 v10.3 Phase 1 - VIP Subscriptions Controller
 *
 * Handles VIP subscription purchases, status checks, and admin verification
 * Updated: Fixed subscription_id NOT NULL constraint by reordering workflow
 */
import { Request, Response } from 'express';
/**
 * GET /api/vip/pricing/:type
 * Returns all pricing options for a subscription type
 */
export declare const getPricingOptions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/vip/purchase
 * Initiates a VIP subscription purchase
 */
export declare const purchaseVIP: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/vip/my-subscriptions
 * Returns all VIP subscriptions for the authenticated user's entities
 */
export declare const getMyVIPSubscriptions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/vip/subscriptions/:id/cancel
 * Cancels an active VIP subscription
 */
export declare const cancelVIPSubscription: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/admin/vip/verify-payment/:transactionId
 * Admin verifies a cash payment and activates subscription
 */
export declare const verifyPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/admin/vip/transactions
 * Returns VIP payment transactions for admin verification
 * Query params:
 *  - payment_method: 'cash' | 'promptpay' | 'admin_grant'
 *  - status: 'pending' | 'completed' | 'failed' | 'refunded' | '' (all)
 */
export declare const getVIPTransactions: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/admin/vip/reject-payment/:transactionId
 * Reject a VIP payment and cancel the associated subscription
 */
export declare const rejectPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=vipController.d.ts.map