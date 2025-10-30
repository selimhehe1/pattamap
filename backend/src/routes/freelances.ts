/**
 * Freelance Routes
 * Version: 10.3
 *
 * Routes for freelance-specific endpoints
 */

import express from 'express';
import {
  getFreelances,
  getFreelanceById
} from '../controllers/freelanceController';

const router = express.Router();

/**
 * @swagger
 * /api/freelances:
 *   get:
 *     tags:
 *       - Freelances
 *     summary: Get all freelance employees
 *     description: Fetch all employees marked as freelance. VIP freelances appear first. Supports filtering and pagination.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of results per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, nickname, or description
 *       - in: query
 *         name: nationality
 *         schema:
 *           type: string
 *         description: Filter by nationality
 *       - in: query
 *         name: age_min
 *         schema:
 *           type: integer
 *         description: Minimum age
 *       - in: query
 *         name: age_max
 *         schema:
 *           type: integer
 *         description: Maximum age
 *       - in: query
 *         name: has_nightclub
 *         schema:
 *           type: boolean
 *         description: Filter by nightclub association (true = with nightclub, false = free freelance)
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [vip, name, age, created_at]
 *           default: vip
 *         description: Sort order (VIP always first)
 *     responses:
 *       200:
 *         description: List of freelances
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 freelances:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     total_pages:
 *                       type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/', getFreelances);

/**
 * @swagger
 * /api/freelances/{id}:
 *   get:
 *     tags:
 *       - Freelances
 *     summary: Get freelance by ID
 *     description: Fetch a specific freelance employee with nightclub associations, comments, and ratings
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Freelance employee ID
 *     responses:
 *       200:
 *         description: Freelance details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 freelance:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Employee'
 *                     - type: object
 *                       properties:
 *                         nightclubs:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               address:
 *                                 type: string
 *                               zone:
 *                                 type: string
 *                               start_date:
 *                                 type: string
 *                                 format: date
 *                         comments:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Comment'
 *                         average_rating:
 *                           type: number
 *                           nullable: true
 *                         comment_count:
 *                           type: integer
 *       404:
 *         description: Freelance not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', getFreelanceById);

export default router;
