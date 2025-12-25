"use strict";
/**
 * 🆕 v10.3 Phase 1 - VIP Subscriptions Routes (SIMPLIFIED)
 *
 * API endpoints for VIP subscription management
 * IMPORTANT: No more "basic"/"premium" tiers - just Employee VIP and Establishment VIP
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const vipController_1 = require("../controllers/vipController");
const auth_1 = require("../middleware/auth");
const csrf_1 = require("../middleware/csrf");
const rateLimit_1 = require("../middleware/rateLimit");
const router = express_1.default.Router();
// =====================================================
// PUBLIC ENDPOINTS
// =====================================================
/**
 * @swagger
 * /api/vip/pricing/{type}:
 *   get:
 *     summary: Get VIP pricing options
 *     description: Returns VIP pricing, durations, and features for employees or establishments. No authentication required. SIMPLIFIED - returns single pricing config per type (no basic/premium distinction).
 *     tags: [VIP Subscriptions]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [employee, establishment]
 *         description: Type of VIP subscription (employee or establishment)
 *     responses:
 *       200:
 *         description: Pricing options retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 type:
 *                   type: string
 *                   example: employee
 *                 pricing:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: Employee VIP
 *                     description:
 *                       type: string
 *                       example: Boost your visibility in lineup and search results
 *                     features:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["👑 VIP Badge on profile (gold border)", "🏆 Top position in establishment lineup", "🔍 Search ranking boost (priority in results)"]
 *                     prices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           duration:
 *                             type: integer
 *                             example: 30
 *                           price:
 *                             type: number
 *                             example: 3600
 *                           discount:
 *                             type: integer
 *                             example: 10
 *                           originalPrice:
 *                             type: number
 *                             example: 4000
 *                           popular:
 *                             type: boolean
 *                             example: true
 *       400:
 *         description: Invalid subscription type
 *       500:
 *         description: Server error
 */
router.get('/pricing/:type', vipController_1.getPricingOptions);
// =====================================================
// AUTHENTICATED ENDPOINTS
// =====================================================
/**
 * @swagger
 * /api/vip/purchase:
 *   post:
 *     summary: Purchase VIP subscription
 *     description: Initiates a VIP subscription purchase for an employee or establishment. Tier is auto-assigned based on subscription_type (employee → 'employee', establishment → 'establishment'). Requires establishment owner authentication with appropriate permissions. Rate limited to 5 requests per hour.
 *     tags: [VIP Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscription_type
 *               - entity_id
 *               - duration
 *               - payment_method
 *             properties:
 *               subscription_type:
 *                 type: string
 *                 enum: [employee, establishment]
 *                 description: Type of subscription (tier will be auto-assigned)
 *                 example: employee
 *               entity_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of employee or establishment
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               duration:
 *                 type: integer
 *                 enum: [7, 30, 90, 365]
 *                 description: Subscription duration in days
 *                 example: 30
 *               payment_method:
 *                 type: string
 *                 enum: [promptpay, cash, admin_grant]
 *                 description: Payment method
 *                 example: cash
 *     responses:
 *       201:
 *         description: VIP subscription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: VIP subscription created. Please contact admin to verify cash payment.
 *                 subscription:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     type:
 *                       type: string
 *                       example: employee
 *                     entity_id:
 *                       type: string
 *                       format: uuid
 *                     tier:
 *                       type: string
 *                       example: employee
 *                     duration:
 *                       type: integer
 *                       example: 30
 *                     status:
 *                       type: string
 *                       example: pending_payment
 *                     starts_at:
 *                       type: string
 *                       format: date-time
 *                     expires_at:
 *                       type: string
 *                       format: date-time
 *                     price_paid:
 *                       type: number
 *                       example: 3600
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     amount:
 *                       type: number
 *                       example: 3600
 *                     currency:
 *                       type: string
 *                       example: THB
 *                     payment_method:
 *                       type: string
 *                       example: cash
 *                     payment_status:
 *                       type: string
 *                       example: pending
 *       400:
 *         description: Invalid request (missing fields, invalid values)
 *       401:
 *         description: Unauthorized (not authenticated)
 *       403:
 *         description: Forbidden (no permission to purchase VIP for this entity)
 *       409:
 *         description: Conflict (active subscription already exists)
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.post('/purchase', auth_1.authenticateToken, csrf_1.csrfProtection, rateLimit_1.vipPurchaseRateLimit, vipController_1.purchaseVIP);
/**
 * @swagger
 * /api/vip/my-subscriptions:
 *   get:
 *     summary: Get my VIP subscriptions
 *     description: Returns all VIP subscriptions for entities owned/managed by the authenticated user. Rate limited to 60 requests per minute.
 *     tags: [VIP Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: VIP subscriptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 subscriptions:
 *                   type: object
 *                   properties:
 *                     employees:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           employee_id:
 *                             type: string
 *                             format: uuid
 *                           status:
 *                             type: string
 *                             example: active
 *                           tier:
 *                             type: string
 *                             example: employee
 *                           duration:
 *                             type: integer
 *                             example: 30
 *                           starts_at:
 *                             type: string
 *                             format: date-time
 *                           expires_at:
 *                             type: string
 *                             format: date-time
 *                           price_paid:
 *                             type: number
 *                             example: 3600
 *                           employees:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               nickname:
 *                                 type: string
 *                     establishments:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Server error
 */
router.get('/my-subscriptions', auth_1.authenticateToken, rateLimit_1.vipStatusCheckRateLimit, vipController_1.getMyVIPSubscriptions);
/**
 * @swagger
 * /api/vip/subscriptions/{id}/cancel:
 *   patch:
 *     summary: Cancel VIP subscription
 *     description: Cancels an active VIP subscription. Only the establishment owner/manager can cancel subscriptions for their entities.
 *     tags: [VIP Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscription_type
 *             properties:
 *               subscription_type:
 *                 type: string
 *                 enum: [employee, establishment]
 *                 description: Type of subscription
 *                 example: employee
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: VIP subscription cancelled successfully
 *                 subscription:
 *                   type: object
 *       400:
 *         description: Subscription not active
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (no permission to cancel this subscription)
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Server error
 */
router.patch('/subscriptions/:id/cancel', auth_1.authenticateToken, csrf_1.csrfProtection, vipController_1.cancelVIPSubscription);
// =====================================================
// ADMIN ENDPOINTS
// =====================================================
/**
 * @swagger
 * /api/admin/vip/verify-payment/{transactionId}:
 *   post:
 *     summary: Verify cash payment (Admin only)
 *     description: Admin verifies a cash payment and activates the corresponding VIP subscription. Only admins can access this endpoint.
 *     tags: [VIP Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Payment transaction ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               admin_notes:
 *                 type: string
 *                 description: Optional admin notes about the payment verification
 *                 example: Cash payment received and verified on 2025-01-15
 *     responses:
 *       200:
 *         description: Payment verified and subscription activated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Payment verified and subscription activated
 *                 subscription:
 *                   type: object
 *       400:
 *         description: Payment already verified or invalid payment method
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not an admin)
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.post('/admin/vip/verify-payment/:transactionId', auth_1.authenticateToken, auth_1.requireAdmin, csrf_1.csrfProtection, vipController_1.verifyPayment);
/**
 * @swagger
 * /api/admin/vip/transactions:
 *   get:
 *     summary: Get VIP payment transactions (Admin only)
 *     description: Retrieves VIP payment transactions with filters. Admin can view all transactions to verify cash payments. Includes joined data for users, employees, establishments, and subscription details.
 *     tags: [VIP Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: payment_method
 *         schema:
 *           type: string
 *           enum: [cash, promptpay, admin_grant]
 *         description: Filter by payment method (optional)
 *         example: cash
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed, refunded, all]
 *         description: Filter by payment status (optional, defaults to all)
 *         example: pending
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       subscription_type:
 *                         type: string
 *                         example: employee
 *                       subscription_id:
 *                         type: string
 *                         format: uuid
 *                       user_id:
 *                         type: string
 *                         format: uuid
 *                       amount:
 *                         type: number
 *                         example: 3600
 *                       currency:
 *                         type: string
 *                         example: THB
 *                       payment_method:
 *                         type: string
 *                         example: cash
 *                       payment_status:
 *                         type: string
 *                         example: pending
 *                       admin_notes:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           pseudonym:
 *                             type: string
 *                           email:
 *                             type: string
 *                       employee:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           nickname:
 *                             type: string
 *                       establishment:
 *                         type: object
 *                       subscription:
 *                         type: object
 *                         properties:
 *                           tier:
 *                             type: string
 *                             example: employee
 *                           duration:
 *                             type: integer
 *                             example: 30
 *                           starts_at:
 *                             type: string
 *                             format: date-time
 *                           expires_at:
 *                             type: string
 *                             format: date-time
 *                 count:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not an admin)
 *       500:
 *         description: Server error
 */
router.get('/admin/vip/transactions', auth_1.authenticateToken, auth_1.requireAdmin, vipController_1.getVIPTransactions);
/**
 * @swagger
 * /api/admin/vip/reject-payment/{transactionId}:
 *   post:
 *     summary: Reject cash payment (Admin only)
 *     description: Admin rejects a cash payment and cancels the corresponding VIP subscription. Requires a rejection reason in admin_notes. Only admins can access this endpoint.
 *     tags: [VIP Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Payment transaction ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - admin_notes
 *             properties:
 *               admin_notes:
 *                 type: string
 *                 description: Rejection reason (required)
 *                 example: Payment verification failed - incorrect amount received
 *     responses:
 *       200:
 *         description: Payment rejected and subscription cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Payment rejected successfully
 *       400:
 *         description: Missing rejection reason or payment already processed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not an admin)
 *       404:
 *         description: Transaction not found
 *       500:
 *         description: Server error
 */
router.post('/admin/vip/reject-payment/:transactionId', auth_1.authenticateToken, auth_1.requireAdmin, csrf_1.csrfProtection, vipController_1.rejectPayment);
exports.default = router;
//# sourceMappingURL=vip.js.map