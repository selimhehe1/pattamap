import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  reportComment,
  getEmployeeRatings,
  getUserRating,
  updateUserRating
} from '../controllers/commentController';

const router = Router();

// Public routes
router.get('/', getComments); // Get comments for an employee
router.get('/ratings/:employee_id', getEmployeeRatings); // Get rating statistics

// Protected routes
router.post('/', authenticateToken, createComment);
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
router.put('/user-rating/:employee_id', authenticateToken, updateUserRating);

export default router;