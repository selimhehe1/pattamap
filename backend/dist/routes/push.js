"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pushController_1 = require("../controllers/pushController");
const auth_1 = require("../middleware/auth");
const csrf_1 = require("../middleware/csrf");
const router = express_1.default.Router();
// ==========================================
// PUBLIC ROUTES
// ==========================================
/**
 * GET /api/push/vapid-public-key
 * Get VAPID public key for push subscription
 * Public endpoint - no auth required
 */
router.get('/vapid-public-key', pushController_1.getPublicKey);
// ==========================================
// AUTHENTICATED ROUTES
// ==========================================
/**
 * GET /api/push/status
 * Check if push is configured and if user is subscribed
 * Auth required
 */
router.get('/status', auth_1.authenticateToken, pushController_1.getPushStatus);
/**
 * GET /api/push/subscriptions
 * Get all push subscriptions for current user
 * Auth required
 */
router.get('/subscriptions', auth_1.authenticateToken, pushController_1.getUserSubscriptions);
/**
 * POST /api/push/subscribe
 * Subscribe to push notifications
 * Auth + CSRF required
 */
router.post('/subscribe', auth_1.authenticateToken, csrf_1.csrfProtection, pushController_1.subscribe);
/**
 * POST /api/push/unsubscribe
 * Unsubscribe from push notifications
 * Auth + CSRF required
 */
router.post('/unsubscribe', auth_1.authenticateToken, csrf_1.csrfProtection, pushController_1.unsubscribe);
exports.default = router;
//# sourceMappingURL=push.js.map