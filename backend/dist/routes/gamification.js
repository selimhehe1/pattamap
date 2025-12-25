"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const csrf_1 = require("../middleware/csrf");
const gamificationController = __importStar(require("../controllers/gamificationController"));
const router = express_1.default.Router();
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
router.post('/award-xp', auth_1.authenticateToken, csrf_1.csrfProtection, gamificationController.awardXP);
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
router.get('/user-progress/:userId', auth_1.authenticateToken, gamificationController.getUserProgress);
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
router.get('/my-progress', auth_1.authenticateToken, gamificationController.getMyProgress);
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
router.get('/xp-history', auth_1.authenticateToken, gamificationController.getXPHistory);
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
router.get('/badges', auth_1.authenticateToken, gamificationController.getBadges);
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
router.get('/badges/user/:userId', auth_1.authenticateToken, gamificationController.getUserBadges);
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
router.get('/my-badges', auth_1.authenticateToken, gamificationController.getMyBadges);
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
router.get('/leaderboard/:type', auth_1.authenticateToken, gamificationController.getLeaderboard);
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
router.get('/leaderboard-weekly', auth_1.authenticateToken, gamificationController.getWeeklyLeaderboard);
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
router.get('/leaderboard-category/:category', auth_1.authenticateToken, gamificationController.getCategoryLeaderboard);
// ========================================
// CHECK-INS (Protected, CSRF)
// ========================================
/**
 * @swagger
 * /api/gamification/check-in:
 *   post:
 *     summary: Create a check-in at an establishment (geolocation)
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
 *               - establishmentId
 *               - latitude
 *               - longitude
 *             properties:
 *               establishmentId:
 *                 type: string
 *                 format: uuid
 *               latitude:
 *                 type: number
 *                 example: 12.9305
 *               longitude:
 *                 type: number
 *                 example: 100.8830
 *     responses:
 *       200:
 *         description: Check-in created (verified if within 100m)
 *       400:
 *         description: Missing required fields
 */
router.post('/check-in', auth_1.authenticateToken, csrf_1.csrfProtection, gamificationController.checkIn);
/**
 * @swagger
 * /api/gamification/my-check-ins:
 *   get:
 *     summary: Get current user's check-in history
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
 *         description: Check-ins retrieved
 */
router.get('/my-check-ins', auth_1.authenticateToken, gamificationController.getMyCheckIns);
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
router.get('/missions', auth_1.authenticateToken, gamificationController.getMissions);
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
router.get('/my-missions', auth_1.authenticateToken, gamificationController.getMyMissions);
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
router.post('/follow/:userId', auth_1.authenticateToken, csrf_1.csrfProtection, gamificationController.followUser);
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
router.delete('/follow/:userId', auth_1.authenticateToken, csrf_1.csrfProtection, gamificationController.unfollowUser);
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
router.post('/reviews/:reviewId/vote', auth_1.authenticateToken, csrf_1.csrfProtection, gamificationController.voteOnReview);
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
router.get('/rewards', auth_1.authenticateToken, gamificationController.getRewards);
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
router.get('/my-rewards', auth_1.authenticateToken, gamificationController.getMyRewards);
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
router.post('/claim-reward/:rewardId', auth_1.authenticateToken, csrf_1.csrfProtection, gamificationController.claimReward);
exports.default = router;
//# sourceMappingURL=gamification.js.map