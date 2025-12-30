import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Award XP to a user
 * POST /api/gamification/award-xp
 * Body: { userId, xpAmount, reason, entityType?, entityId?, metadata? }
 */
export declare const awardXP: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get user's gamification progress
 * GET /api/gamification/user-progress/:userId
 */
export declare const getUserProgress: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get current user's progress
 * GET /api/gamification/my-progress
 */
export declare const getMyProgress: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get all available badges
 * GET /api/gamification/badges
 * Query params: ?category=exploration&rarity=rare
 */
export declare const getBadges: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get user's earned badges
 * GET /api/gamification/badges/user/:userId
 */
export declare const getUserBadges: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get current user's badges
 * GET /api/gamification/my-badges
 */
export declare const getMyBadges: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get leaderboard
 * GET /api/gamification/leaderboard/:type
 * Types: global, monthly, zone
 * Query params: ?zone=Soi 6&limit=50
 */
export declare const getLeaderboard: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get available missions
 * GET /api/gamification/missions
 * Query params: ?type=daily&is_active=true
 */
export declare const getMissions: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get user's mission progress
 * GET /api/gamification/my-missions
 */
export declare const getMyMissions: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Follow a user
 * POST /api/gamification/follow/:userId
 */
export declare const followUser: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Unfollow a user
 * DELETE /api/gamification/follow/:userId
 */
export declare const unfollowUser: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Vote on a review (helpful)
 * POST /api/gamification/reviews/:reviewId/vote
 * Body: { voteType: 'helpful' | 'not_helpful' }
 */
export declare const voteOnReview: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get XP history for the current user
 * GET /api/gamification/xp-history
 * Query: ?period=7|30|90 (days, default 30)
 */
export declare const getXPHistory: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get weekly leaderboard
 * GET /api/gamification/leaderboard/weekly
 * Query: ?week=50&year=2025 (optional, defaults to current week)
 */
export declare const getWeeklyLeaderboard: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get category leaderboard
 * GET /api/gamification/leaderboard/category/:category
 * Categories: reviewers, photographers, checkins, helpful
 */
export declare const getCategoryLeaderboard: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get all available rewards
 * GET /api/gamification/rewards
 */
export declare const getRewards: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get current user's rewards (with unlock status)
 * GET /api/gamification/my-rewards
 */
export declare const getMyRewards: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Claim a reward (for rewards that require claiming)
 * POST /api/gamification/claim-reward/:rewardId
 */
export declare const claimReward: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=gamificationController.d.ts.map