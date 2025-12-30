import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import * as gamificationController from '../controllers/gamificationController';

const router = express.Router();

// ========================================
// XP & POINTS (Protected)
// ========================================

/**
 * @swagger
 * /api/gamification/award-xp:
 *   post:
 *     summary: Award XP to a user
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - xpAmount
 *               - reason
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               xpAmount:
 *                 type: integer
 *                 minimum: 1
 *               reason:
 *                 type: string
 *                 example: "review_created"
 *               entityType:
 *                 type: string
 *                 example: "comment"
 *               entityId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: XP awarded successfully
 *       400:
 *         description: Missing required fields
 */
router.post('/award-xp', authenticateToken, csrfProtection, gamificationController.awardXP);

/**
 * @swagger
 * /api/gamification/user-progress/{userId}:
 *   get:
 *     summary: Get user's gamification progress
 *     tags: [Gamification]
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
 *         description: User progress retrieved
 */
router.get('/user-progress/:userId', authenticateToken, gamificationController.getUserProgress);

/**
 * @swagger
 * /api/gamification/my-progress:
 *   get:
 *     summary: Get current user's gamification progress
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User progress retrieved
 */
router.get('/my-progress', authenticateToken, gamificationController.getMyProgress);

/**
 * @swagger
 * /api/gamification/xp-history:
 *   get:
 *     summary: Get XP history over time
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           enum: [7, 30, 90]
 *           default: 30
 *         description: Number of days to fetch history for
 *     responses:
 *       200:
 *         description: XP history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: integer
 *                 totalXPGained:
 *                   type: integer
 *                 dataPoints:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       xp:
 *                         type: integer
 *                       sources:
 *                         type: object
 *                 breakdown:
 *                   type: object
 */
router.get('/xp-history', authenticateToken, gamificationController.getXPHistory);

// ========================================
// BADGES (Protected)
// ========================================

/**
 * @swagger
 * /api/gamification/badges:
 *   get:
 *     summary: Get all available badges
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [exploration, contribution, social, quality, temporal, secret]
 *       - in: query
 *         name: rarity
 *         schema:
 *           type: string
 *           enum: [common, rare, epic, legendary]
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Badges retrieved
 */
router.get('/badges', authenticateToken, gamificationController.getBadges);

/**
 * @swagger
 * /api/gamification/badges/user/{userId}:
 *   get:
 *     summary: Get user's earned badges
 *     tags: [Gamification]
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
 *         description: User badges retrieved
 */
router.get('/badges/user/:userId', authenticateToken, gamificationController.getUserBadges);

/**
 * @swagger
 * /api/gamification/my-badges:
 *   get:
 *     summary: Get current user's badges
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User badges retrieved
 */
router.get('/my-badges', authenticateToken, gamificationController.getMyBadges);

// ========================================
// LEADERBOARDS (Protected)
// ========================================

/**
 * @swagger
 * /api/gamification/leaderboard/{type}:
 *   get:
 *     summary: Get leaderboard by type
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [global, monthly, zone]
 *       - in: query
 *         name: zone
 *         schema:
 *           type: string
 *           example: "Soi 6"
 *         description: Required if type is "zone"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Leaderboard retrieved
 */
router.get('/leaderboard/:type', authenticateToken, gamificationController.getLeaderboard);

/**
 * @swagger
 * /api/gamification/leaderboard/weekly:
 *   get:
 *     summary: Get weekly leaderboard
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Weekly leaderboard retrieved
 */
router.get('/leaderboard-weekly', authenticateToken, gamificationController.getWeeklyLeaderboard);

/**
 * @swagger
 * /api/gamification/leaderboard/category/{category}:
 *   get:
 *     summary: Get category-specific leaderboard
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [reviewers, photographers, checkins, helpful]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Category leaderboard retrieved
 *       400:
 *         description: Invalid category
 */
router.get('/leaderboard-category/:category', authenticateToken, gamificationController.getCategoryLeaderboard);

// ========================================
// MISSIONS (Protected)
// ========================================

/**
 * @swagger
 * /api/gamification/missions:
 *   get:
 *     summary: Get available missions
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [daily, weekly, event, narrative]
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Missions retrieved
 */
router.get('/missions', authenticateToken, gamificationController.getMissions);

/**
 * @swagger
 * /api/gamification/my-missions:
 *   get:
 *     summary: Get current user's mission progress
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Mission progress retrieved
 */
router.get('/my-missions', authenticateToken, gamificationController.getMyMissions);

// ========================================
// SOCIAL (Protected, CSRF for mutations)
// ========================================

/**
 * @swagger
 * /api/gamification/follow/{userId}:
 *   post:
 *     summary: Follow a user
 *     tags: [Gamification]
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
 *         description: User followed successfully
 *       400:
 *         description: Cannot follow yourself or already following
 */
router.post('/follow/:userId', authenticateToken, csrfProtection, gamificationController.followUser);

/**
 * @swagger
 * /api/gamification/follow/{userId}:
 *   delete:
 *     summary: Unfollow a user
 *     tags: [Gamification]
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
 *         description: User unfollowed successfully
 */
router.delete('/follow/:userId', authenticateToken, csrfProtection, gamificationController.unfollowUser);

/**
 * @swagger
 * /api/gamification/reviews/{reviewId}/vote:
 *   post:
 *     summary: Vote on a review (helpful/not_helpful)
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               voteType:
 *                 type: string
 *                 enum: [helpful, not_helpful]
 *                 default: helpful
 *     responses:
 *       200:
 *         description: Vote recorded successfully
 */
router.post('/reviews/:reviewId/vote', authenticateToken, csrfProtection, gamificationController.voteOnReview);

// ========================================
// REWARDS SYSTEM (Protected)
// ========================================

/**
 * @swagger
 * /api/gamification/rewards:
 *   get:
 *     summary: Get all available rewards/unlocks
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Rewards list retrieved
 */
router.get('/rewards', authenticateToken, gamificationController.getRewards);

/**
 * @swagger
 * /api/gamification/my-rewards:
 *   get:
 *     summary: Get current user's rewards with unlock status
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User rewards retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rewards:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       unlock_type:
 *                         type: string
 *                         enum: [level, xp, badge, achievement]
 *                       unlock_value:
 *                         type: integer
 *                       category:
 *                         type: string
 *                         enum: [feature, cosmetic, title]
 *                       icon:
 *                         type: string
 *                       is_unlocked:
 *                         type: boolean
 *                       unlocked_at:
 *                         type: string
 *                         format: date-time
 *                 currentLevel:
 *                   type: integer
 *                 totalXp:
 *                   type: integer
 */
router.get('/my-rewards', authenticateToken, gamificationController.getMyRewards);

/**
 * @swagger
 * /api/gamification/claim-reward/{rewardId}:
 *   post:
 *     summary: Claim an unlocked reward
 *     tags: [Gamification]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: rewardId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Reward claimed successfully
 *       403:
 *         description: Not eligible for this reward
 *       404:
 *         description: Reward not found
 */
router.post('/claim-reward/:rewardId', authenticateToken, csrfProtection, gamificationController.claimReward);

export default router;
