import express from 'express';
import {
  getPublicKey,
  subscribe,
  unsubscribe,
  getUserSubscriptions,
  getPushStatus
} from '../controllers/pushController';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';

const router = express.Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================

/**
 * GET /api/push/vapid-public-key
 * Get VAPID public key for push subscription
 * Public endpoint - no auth required
 */
router.get('/vapid-public-key', getPublicKey);

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

/**
 * GET /api/push/status
 * Check if push is configured and if user is subscribed
 * Auth required
 */
router.get('/status', authenticateToken, getPushStatus);

/**
 * GET /api/push/subscriptions
 * Get all push subscriptions for current user
 * Auth required
 */
router.get('/subscriptions', authenticateToken, getUserSubscriptions);

/**
 * POST /api/push/subscribe
 * Subscribe to push notifications
 * Auth + CSRF required
 */
router.post('/subscribe', authenticateToken, csrfProtection, subscribe);

/**
 * POST /api/push/unsubscribe
 * Unsubscribe from push notifications
 * Auth + CSRF required
 */
router.post('/unsubscribe', authenticateToken, csrfProtection, unsubscribe);

export default router;
