import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/public/stats:
 *   get:
 *     summary: Get public platform statistics
 *     description: Returns counts of establishments, employees, reviews, and zones (no auth required)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Platform statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 establishments:
 *                   type: number
 *                   description: Number of approved establishments
 *                 employees:
 *                   type: number
 *                   description: Number of approved employee profiles
 *                 reviews:
 *                   type: number
 *                   description: Total number of reviews/comments
 *                 zones:
 *                   type: number
 *                   description: Number of active zones
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Fetch all counts in parallel for performance
    const [establishmentsResult, employeesResult, reviewsResult, zonesResult] = await Promise.all([
      supabase
        .from('establishments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase
        .from('comments')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('zones')
        .select('id', { count: 'exact', head: true })
    ]);

    // Check for errors
    if (establishmentsResult.error) {
      logger.error('Error fetching establishments count:', establishmentsResult.error);
    }
    if (employeesResult.error) {
      logger.error('Error fetching employees count:', employeesResult.error);
    }
    if (reviewsResult.error) {
      logger.error('Error fetching reviews count:', reviewsResult.error);
    }
    if (zonesResult.error) {
      logger.error('Error fetching zones count:', zonesResult.error);
    }

    const stats = {
      establishments: establishmentsResult.count || 0,
      employees: employeesResult.count || 0,
      reviews: reviewsResult.count || 0,
      zones: zonesResult.count || 0
    };

    logger.debug('Public stats fetched:', stats);

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching public stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      establishments: 0,
      employees: 0,
      reviews: 0,
      zones: 0
    });
  }
});

export default router;
