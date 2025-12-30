"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
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
router.get('/stats', async (req, res) => {
    try {
        // Fetch all counts in parallel for performance
        const [establishmentsResult, employeesResult, reviewsResult, zonesResult] = await Promise.all([
            supabase_1.supabase
                .from('establishments')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'approved'),
            supabase_1.supabase
                .from('employees')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'approved'),
            supabase_1.supabase
                .from('comments')
                .select('id', { count: 'exact', head: true }),
            supabase_1.supabase
                .from('zones')
                .select('id', { count: 'exact', head: true })
        ]);
        // Check for errors
        if (establishmentsResult.error) {
            logger_1.logger.error('Error fetching establishments count:', establishmentsResult.error);
        }
        if (employeesResult.error) {
            logger_1.logger.error('Error fetching employees count:', employeesResult.error);
        }
        if (reviewsResult.error) {
            logger_1.logger.error('Error fetching reviews count:', reviewsResult.error);
        }
        if (zonesResult.error) {
            logger_1.logger.error('Error fetching zones count:', zonesResult.error);
        }
        const stats = {
            establishments: establishmentsResult.count || 0,
            employees: employeesResult.count || 0,
            reviews: reviewsResult.count || 0,
            zones: zonesResult.count || 0
        };
        logger_1.logger.debug('Public stats fetched:', stats);
        res.json(stats);
    }
    catch (error) {
        logger_1.logger.error('Error fetching public stats:', error);
        res.status(500).json({
            error: 'Failed to fetch statistics',
            establishments: 0,
            employees: 0,
            reviews: 0,
            zones: 0
        });
    }
});
exports.default = router;
//# sourceMappingURL=public.js.map