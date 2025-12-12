import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  reportComment,
  getEmployeeRatings,
  getUserRating,
  updateUserRating,
  createEstablishmentResponse,
  getEstablishmentReviews
} from '../controllers/commentController';

const router = Router();

// Public routes
router.get('/', getComments); // Get comments for an employee
router.get('/ratings/:employee_id', getEmployeeRatings); // Get rating statistics

// Protected routes
router.post('/', authenticateToken, csrfProtection, createComment);
router.put('/:id', authenticateToken, updateComment);
router.delete('/:id', authenticateToken, deleteComment);
router.post('/:id/report', authenticateToken, reportComment);

/**
 * @swagger
 * /api/comments/user-rating/{employee_id}:
 *   get:
 *     summary: Get user's rating for an employee
 *     description: Récupère la note donnée par l'utilisateur authentifié pour une employée
 *     tags: [Comments]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employee_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee UUID
 *     responses:
 *       200:
 *         description: Rating retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_rating:
 *                   $ref: '#/components/schemas/Comment'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 🎯 NEW: User rating management routes
router.get('/user-rating/:employee_id', authenticateToken, getUserRating);

/**
 * @swagger
 * /api/comments/user-rating/{employee_id}:
 *   put:
 *     summary: Update or create user rating
 *     description: Met à jour ou crée une note pour une employée (CSRF protected)
 *     tags: [Comments]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: employee_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - content
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Star rating (1-5)
 *                 example: 5
 *               content:
 *                 type: string
 *                 description: Comment text
 *                 example: Rating updated
 *     responses:
 *       200:
 *         description: Rating updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comment:
 *                   $ref: '#/components/schemas/Comment'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: CSRF token invalid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/user-rating/:employee_id', authenticateToken, csrfProtection, updateUserRating);

/**
 * @swagger
 * /api/comments/{id}/establishment-response:
 *   post:
 *     summary: Create establishment response to a review
 *     description: Allows establishment owners to respond to reviews about their employees
 *     tags: [Comments]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Comment/Review UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - establishment_id
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 10
 *                 description: Response content
 *               establishment_id:
 *                 type: string
 *                 format: uuid
 *                 description: Establishment UUID
 *     responses:
 *       201:
 *         description: Response created successfully
 *       403:
 *         description: Not authorized (not establishment owner)
 *       404:
 *         description: Review not found
 */
router.post('/:id/establishment-response', authenticateToken, csrfProtection, createEstablishmentResponse);

/**
 * @swagger
 * /api/comments/establishment/{establishment_id}/reviews:
 *   get:
 *     summary: Get reviews for an establishment's employees
 *     description: Retrieves all reviews for employees working at an establishment (for owner panel)
 *     tags: [Comments]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: establishment_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Establishment UUID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 *       403:
 *         description: Not authorized (not establishment owner)
 */
router.get('/establishment/:establishment_id/reviews', authenticateToken, getEstablishmentReviews);

export default router;