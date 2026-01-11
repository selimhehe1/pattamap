import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import * as userController from '../controllers/userController';

const router = express.Router();

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: Delete current user's account (GDPR right to erasure)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to delete account
 */
router.delete('/me', authenticateToken, csrfProtection, userController.deleteAccount);

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
