import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimit';
import {
  exportFavorites,
  exportVisits,
  exportBadges,
  exportReviews,
} from '../controllers/exportController';

const router = Router();

/**
 * @swagger
 * /api/export/favorites:
 *   get:
 *     summary: Export user's favorites to CSV
 *     tags: [Export]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Not authenticated
 */
router.get('/favorites', authenticateToken, apiRateLimit, exportFavorites);

/**
 * @swagger
 * /api/export/visits:
 *   get:
 *     summary: Export user's visit history to CSV
 *     tags: [Export]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get('/visits', authenticateToken, apiRateLimit, exportVisits);

/**
 * @swagger
 * /api/export/badges:
 *   get:
 *     summary: Export user's earned badges to CSV
 *     tags: [Export]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get('/badges', authenticateToken, apiRateLimit, exportBadges);

/**
 * @swagger
 * /api/export/reviews:
 *   get:
 *     summary: Export user's reviews to CSV
 *     tags: [Export]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get('/reviews', authenticateToken, apiRateLimit, exportReviews);

export default router;
