/**
 * Gamification Controller
 *
 * Core gamification features: XP, badges, missions, and social actions.
 * Leaderboards are in leaderboardController.ts
 * Rewards are in rewardsController.ts
 */

import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { missionTrackingService } from '../services/missionTrackingService';
import { asyncHandler, BadRequestError, UnauthorizedError, InternalServerError } from '../middleware/asyncHandler';

// ========================================
// TYPES
// ========================================

interface XPAwardRequest {
  userId: string;
  xpAmount: number;
  reason: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

// ========================================
// XP & POINTS
// ========================================

/**
 * Award XP to a user
 * POST /api/gamification/award-xp
 * Body: { userId, xpAmount, reason, entityType?, entityId?, metadata? }
 */
export const awardXP = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId, xpAmount, reason, entityType, entityId, metadata: _metadata }: XPAwardRequest = req.body;

    if (!userId || !xpAmount || !reason) {
      throw BadRequestError('Missing required fields: userId, xpAmount, reason');
    }

    // Call PostgreSQL function to award XP
    const { data: _success, error } = await supabase.rpc('award_xp', {
      p_user_id: userId,
      p_xp_amount: xpAmount,
      p_reason: reason,
      p_entity_type: entityType || null,
      p_entity_id: entityId || null
    });

    if (error) {
      logger.error('Award XP error:', error);
      throw InternalServerError('Failed to award XP');
    }

    // Get updated user progress
    const { data: userProgress, error: progressError } = await supabase
      .from('user_points')
      .select('total_xp, current_level, monthly_xp, current_streak_days')
      .eq('user_id', userId)
      .single();

    if (progressError) {
      logger.error('Get user progress error:', progressError);
      // Still return success since XP was awarded
    }

    res.json({
      message: `Awarded ${xpAmount} XP for ${reason}`,
      xpAwarded: xpAmount,
      newProgress: userProgress || null
    });
});

/**
 * Get user's gamification progress
 * GET /api/gamification/user-progress/:userId
 */
export const getUserProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    // Get user points
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (pointsError && pointsError.code !== 'PGRST116') { // PGRST116 = no rows
      logger.error('Get user progress error:', pointsError);
      throw InternalServerError('Failed to fetch user progress');
    }

    // If no points record exists, create one
    if (!userPoints) {
      const { data: newPoints, error: createError } = await supabase
        .from('user_points')
        .insert({ user_id: userId })
        .select()
        .single();

      if (createError) {
        logger.error('Create user points error:', createError);
        throw InternalServerError('Failed to initialize user points');
      }

      res.json(newPoints);
      return;
    }

    res.json(userPoints);
});

/**
 * Get current user's progress
 * GET /api/gamification/my-progress
 */
export const getMyProgress = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    req.params.userId = userId;
    return getUserProgress(req, res, () => {});
});

// ========================================
// BADGES
// ========================================

/**
 * Get all available badges
 * GET /api/gamification/badges
 * Query params: ?category=exploration&rarity=rare
 */
export const getBadges = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { category, rarity, is_active } = req.query;

    let query = supabase
      .from('badges')
      .select('*')
      .order('sort_order', { ascending: true });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    if (rarity) {
      query = query.eq('rarity', rarity);
    }
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: badges, error } = await query;

    if (error) {
      logger.error('Get badges error:', error);
      throw InternalServerError('Failed to fetch badges');
    }

    res.json({ badges });
});

/**
 * Get user's earned badges
 * GET /api/gamification/badges/user/:userId
 */
export const getUserBadges = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;

    const { data: userBadges, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      logger.error('Get user badges error:', error);
      throw InternalServerError('Failed to fetch user badges');
    }

    res.json({ userBadges });
});

/**
 * Get current user's badges
 * GET /api/gamification/my-badges
 */
export const getMyBadges = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    req.params.userId = userId;
    return getUserBadges(req, res, () => {});
});

// ========================================
// MISSIONS
// ========================================

/**
 * Get available missions
 * GET /api/gamification/missions
 * Query params: ?type=daily&is_active=true
 */
export const getMissions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, is_active } = req.query;

    let query = supabase
      .from('missions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: missions, error } = await query;

    if (error) {
      logger.error('Get missions error:', error);
      throw InternalServerError('Failed to fetch missions');
    }

    res.json({ missions });
});

/**
 * Get user's mission progress
 * GET /api/gamification/my-missions
 */
export const getMyMissions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const { data: missionProgress, error } = await supabase
      .from('user_mission_progress')
      .select(`
        *,
        mission:missions(*)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error('Get my missions error:', error);
      throw InternalServerError('Failed to fetch mission progress');
    }

    res.json({ missionProgress });
});

// ========================================
// SOCIAL
// ========================================

/**
 * Follow a user
 * POST /api/gamification/follow/:userId
 */
export const followUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const followerId = req.user!.id;
    const { userId: followingId } = req.params;

    if (followerId === followingId) {
      throw BadRequestError('You cannot follow yourself');
    }

    // Check if already following
    const { data: existing, error: _checkError } = await supabase
      .from('user_followers')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (existing) {
      throw BadRequestError('You are already following this user');
    }

    // Insert follow relationship
    const { data: follow, error } = await supabase
      .from('user_followers')
      .insert({ follower_id: followerId, following_id: followingId })
      .select()
      .single();

    if (error) {
      logger.error('Follow user error:', error);
      throw InternalServerError('Failed to follow user');
    }

    // Track mission progress (follow missions for both users)
    await missionTrackingService.onFollowAction(followerId, followingId);

    res.json({ message: 'User followed successfully', follow });
});

/**
 * Unfollow a user
 * DELETE /api/gamification/follow/:userId
 */
export const unfollowUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const followerId = req.user!.id;
    const { userId: followingId } = req.params;

    const { error } = await supabase
      .from('user_followers')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      logger.error('Unfollow user error:', error);
      throw InternalServerError('Failed to unfollow user');
    }

    res.json({ message: 'User unfollowed successfully' });
});

/**
 * Vote on a review (helpful)
 * POST /api/gamification/reviews/:reviewId/vote
 * Body: { voteType: 'helpful' | 'not_helpful' }
 */
export const voteOnReview = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { reviewId } = req.params;
    const { voteType = 'helpful' } = req.body;

    // Check if already voted
    const { data: existing, error: _checkError2 } = await supabase
      .from('review_votes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing vote
      const { error: updateError } = await supabase
        .from('review_votes')
        .update({ vote_type: voteType })
        .eq('id', existing.id);

      if (updateError) {
        logger.error('Update review vote error:', updateError);
        throw InternalServerError('Failed to update vote');
      }

      res.json({ message: 'Vote updated successfully' });
      return;
    }

    // Insert new vote
    const { data: vote, error } = await supabase
      .from('review_votes')
      .insert({ review_id: reviewId, user_id: userId, vote_type: voteType })
      .select()
      .single();

    if (error) {
      logger.error('Vote on review error:', error);
      throw InternalServerError('Failed to vote on review');
    }

    // Award XP to review author if helpful vote
    if (voteType === 'helpful') {
      const { data: review, error: reviewError } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', reviewId)
        .single();

      if (review && !reviewError) {
        await supabase.rpc('award_xp', {
          p_user_id: review.user_id,
          p_xp_amount: 3,
          p_reason: 'helpful_vote_received',
          p_entity_type: 'comment',
          p_entity_id: reviewId
        });

        // Track mission progress: helpful vote RECEIVED (for review author)
        await missionTrackingService.onHelpfulVoteReceived(review.user_id, reviewId);
      }
    }

    // Track mission progress: vote CAST (for voter)
    await missionTrackingService.onVoteCast(userId, reviewId, voteType);

    res.json({ message: 'Vote recorded successfully', vote });
});

// ========================================
// XP HISTORY
// ========================================

/**
 * Get XP history for the current user
 * GET /api/gamification/xp-history
 * Query: ?period=7|30|90 (days, default 30)
 */
export const getXPHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw UnauthorizedError('Authentication required');
    }

    const period = parseInt(req.query.period as string) || 30;

    // Validate period
    if (![7, 30, 90].includes(period)) {
      throw BadRequestError('Period must be 7, 30, or 90 days');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Get XP transactions for the period
    const { data: transactions, error } = await supabase
      .from('xp_transactions')
      .select('xp_amount, reason, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('Get XP history error:', error);
      throw InternalServerError('Failed to fetch XP history');
    }

    // Group by date and calculate breakdown
    const dataPointsMap = new Map<string, { xp: number; sources: Record<string, number> }>();
    const breakdown: Record<string, number> = {};
    let totalXPGained = 0;

    for (const tx of transactions || []) {
      const date = new Date(tx.created_at).toISOString().split('T')[0];

      // Initialize date if not exists
      if (!dataPointsMap.has(date)) {
        dataPointsMap.set(date, { xp: 0, sources: {} });
      }

      const dayData = dataPointsMap.get(date)!;
      dayData.xp += tx.xp_amount;
      dayData.sources[tx.reason] = (dayData.sources[tx.reason] || 0) + tx.xp_amount;

      // Update breakdown totals
      breakdown[tx.reason] = (breakdown[tx.reason] || 0) + tx.xp_amount;
      totalXPGained += tx.xp_amount;
    }

    // Convert map to array
    const dataPoints = Array.from(dataPointsMap.entries()).map(([date, data]) => ({
      date,
      xp: data.xp,
      sources: data.sources
    }));

    // Fill in missing dates with 0 XP
    const filledDataPoints = [];
    const currentDate = new Date(startDate);
    const endDate = new Date();

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existingData = dataPoints.find(dp => dp.date === dateStr);

      if (existingData) {
        filledDataPoints.push(existingData);
      } else {
        filledDataPoints.push({ date: dateStr, xp: 0, sources: {} });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      period,
      totalXPGained,
      dataPoints: filledDataPoints,
      breakdown
    });
});

// Re-export from split controllers for backward compatibility
export { getLeaderboard, getWeeklyLeaderboard, getCategoryLeaderboard } from './leaderboardController';
export { getRewards, getMyRewards, claimReward } from './rewardsController';
