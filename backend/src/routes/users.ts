import express from 'express';
import { authenticateToken } from '../middleware/auth';
import * as userController from '../controllers/userController';

const router = express.Router();

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: Get user public profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       404:
 *         description: User not found
 */
router.get('/:userId', authenticateToken, userController.getUser);

export default router;
