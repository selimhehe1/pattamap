"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const csrf_1 = require("../middleware/csrf");
const rateLimit_1 = require("../middleware/rateLimit"); // 🔧 FIX N3
const notificationController_1 = require("../controllers/notificationController");
const router = express_1.default.Router();
// ========================================
// NOTIFICATIONS ROUTES
// ========================================
/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get current user's notifications
 *     description: Retrieve all notifications for the authenticated user. Supports filtering by read status and pagination with limit. Notifications are ordered by creation date (newest first).
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Maximum number of notifications to return
 *       - in: query
 *         name: unread_only
 *         schema:
 *           type: boolean
 *         description: If true, only return unread notifications
 *     responses:
 *       200:
 *         description: List of user's notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 total:
 *                   type: integer
 *                   description: Total count of notifications returned
 *       401:
 *         description: Unauthorized (not authenticated)
 *       500:
 *         description: Internal server error
 */
router.get('/', auth_1.authenticateToken, rateLimit_1.notificationRateLimit, notificationController_1.getMyNotifications); // 🔧 FIX N3: Rate limited
/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     description: Retrieve the count of unread notifications for the authenticated user. Used for notification bell badge display.
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   description: Number of unread notifications
 *                   example: 5
 *       401:
 *         description: Unauthorized (not authenticated)
 *       500:
 *         description: Internal server error
 */
router.get('/unread-count', auth_1.authenticateToken, rateLimit_1.notificationRateLimit, notificationController_1.getUnreadCount); // 🔧 FIX N3: Rate limited
/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Mark a specific notification as read. Users can only mark their own notifications. Updates is_read field to true.
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification marked as read
 *       401:
 *         description: Unauthorized (not authenticated)
 *       403:
 *         description: Forbidden (CSRF invalid)
 *       404:
 *         description: Notification not found or does not belong to user
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/read', auth_1.authenticateToken, rateLimit_1.notificationMutationRateLimit, csrf_1.csrfProtection, notificationController_1.markAsRead); // 🔧 FIX N3: Rate limited
/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Mark all notifications for the authenticated user as read. Bulk operation that updates is_read to true for all user's notifications.
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: All notifications marked as read
 *       401:
 *         description: Unauthorized (not authenticated)
 *       403:
 *         description: Forbidden (CSRF invalid)
 *       500:
 *         description: Internal server error or operation failed
 */
router.patch('/mark-all-read', auth_1.authenticateToken, rateLimit_1.notificationMutationRateLimit, csrf_1.csrfProtection, notificationController_1.markAllRead); // 🔧 FIX N3: Rate limited
/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     description: Delete a specific notification. Users can only delete their own notifications. Permanent deletion from database.
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification deleted
 *       401:
 *         description: Unauthorized (not authenticated)
 *       403:
 *         description: Forbidden (CSRF invalid)
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', auth_1.authenticateToken, rateLimit_1.notificationMutationRateLimit, csrf_1.csrfProtection, notificationController_1.deleteNotification); // 🔧 FIX N3: Rate limited
exports.default = router;
//# sourceMappingURL=notifications.js.map