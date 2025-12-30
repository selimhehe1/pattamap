import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { missionTrackingService } from '../services/missionTrackingService';

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

// Leaderboard entry types
interface LeaderboardEntry {
  user_id: string;
  total_xp?: number;
  monthly_xp?: number;
  current_level?: number;
  rank?: number;
  check_ins?: number;
}

// User type for lookups
interface UserLookup {
  id: string;
  pseudonym: string;
}

// Check-in type - Supabase returns nested relations as arrays
interface ZoneCheckIn {
  user_id: string;
  establishment?: {
    zone: string;
  }[];
}

// Reward type
interface _RewardEntry {
  id: string;
  reward_type: string;
  reward_value: unknown;
  claimed_at: string | null;
  expires_at?: string;
  user_id: string;
}

// Database reward with user unlocks
interface DbReward {
  id: string;
  name: string;
  description: string;
  unlock_type: string;
  unlock_value: number;
  category: string;
  icon: string;
  sort_order: number;
  user_unlocks?: Array<{
    unlocked_at: string;
    claimed: boolean;
  }>;
}

// Fallback data type
interface FallbackLeaderboardEntry {
  user_id: string;
  username: string;
  review_count?: number;
  upload_count?: number;
  zone_count?: number;
  rank?: number;
}

// ========================================
// XP & POINTS
// ========================================

/**
 * Award XP to a user
 * POST /api/gamification/award-xp
 * Body: { userId, xpAmount, reason, entityType?, entityId?, metadata? }
 */
export const awardXP = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, xpAmount, reason, entityType, entityId, metadata }: XPAwardRequest = req.body;

    if (!userId || !xpAmount || !reason) {
      return res.status(400).json({ error: 'Missing required fields: userId, xpAmount, reason' });
    }

    // Call PostgreSQL function to award XP
    const { data: success, error } = await supabase.rpc('award_xp', {
      p_user_id: userId,
      p_xp_amount: xpAmount,
      p_reason: reason,
      p_entity_type: entityType || null,
      p_entity_id: entityId || null
    });

    if (error) {
      logger.error('Award XP error:', error);
      return res.status(500).json({ error: 'Failed to award XP' });
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
  } catch (error) {
    logger.error('Award XP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user's gamification progress
 * GET /api/gamification/user-progress/:userId
 */
export const getUserProgress = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Get user points
    const { data: userPoints, error: pointsError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (pointsError && pointsError.code !== 'PGRST116') { // PGRST116 = no rows
      logger.error('Get user progress error:', pointsError);
      return res.status(500).json({ error: 'Failed to fetch user progress' });
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
        return res.status(500).json({ error: 'Failed to initialize user points' });
      }

      return res.json(newPoints);
    }

    res.json(userPoints);
  } catch (error) {
    logger.error('Get user progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get current user's progress
 * GET /api/gamification/my-progress
 */
export const getMyProgress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    req.params.userId = userId;
    return getUserProgress(req, res);
  } catch (error) {
    logger.error('Get my progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================
// BADGES
// ========================================

/**
 * Get all available badges
 * GET /api/gamification/badges
 * Query params: ?category=exploration&rarity=rare
 */
export const getBadges = async (req: AuthRequest, res: Response) => {
  try {
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
      return res.status(500).json({ error: 'Failed to fetch badges' });
    }

    res.json({ badges });
  } catch (error) {
    logger.error('Get badges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user's earned badges
 * GET /api/gamification/badges/user/:userId
 */
export const getUserBadges = async (req: AuthRequest, res: Response) => {
  try {
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
      return res.status(500).json({ error: 'Failed to fetch user badges' });
    }

    res.json({ userBadges });
  } catch (error) {
    logger.error('Get user badges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get current user's badges
 * GET /api/gamification/my-badges
 */
export const getMyBadges = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    req.params.userId = userId;
    return getUserBadges(req, res);
  } catch (error) {
    logger.error('Get my badges error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================
// LEADERBOARDS
// ========================================

/**
 * Get leaderboard
 * GET /api/gamification/leaderboard/:type
 * Types: global, monthly, zone
 * Query params: ?zone=Soi 6&limit=50
 */
export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params;
    const { zone, limit = '50' } = req.query;

    if (type === 'global') {
      // Use materialized view
      const { data: leaderboard, error } = await supabase
        .from('leaderboard_global')
        .select('*')
        .limit(parseInt(limit as string, 10));

      if (error) {
        logger.error('Get global leaderboard error:', error);
        return res.status(500).json({ error: 'Failed to fetch leaderboard' });
      }

      // Join with users to get usernames
      const userIds = leaderboard.map((entry: LeaderboardEntry) => entry.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, pseudonym')
        .in('id', userIds);

      if (usersError) {
        logger.error('Get leaderboard users error:', usersError);
      }

      // Merge user data
      const enrichedLeaderboard = leaderboard.map((entry: LeaderboardEntry) => ({
        ...entry,
        username: (users as UserLookup[] | null)?.find((u) => u.id === entry.user_id)?.pseudonym || 'Unknown'
      }));

      return res.json({ leaderboard: enrichedLeaderboard, type: 'global' });
    }

    if (type === 'monthly') {
      // Use materialized view
      const { data: leaderboard, error } = await supabase
        .from('leaderboard_monthly')
        .select('*')
        .limit(parseInt(limit as string, 10));

      if (error) {
        logger.error('Get monthly leaderboard error:', error);
        return res.status(500).json({ error: 'Failed to fetch leaderboard' });
      }

      // Join with users
      const userIds = leaderboard.map((entry: LeaderboardEntry) => entry.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, pseudonym')
        .in('id', userIds);

      if (usersError) {
        logger.error('Get leaderboard users error:', usersError);
      }

      const enrichedLeaderboard = leaderboard.map((entry: LeaderboardEntry) => ({
        ...entry,
        username: (users as UserLookup[] | null)?.find((u) => u.id === entry.user_id)?.pseudonym || 'Unknown'
      }));

      return res.json({ leaderboard: enrichedLeaderboard, type: 'monthly' });
    }

    if (type === 'zone' && zone) {
      // Zone leaderboard: top contributors in specific zone
      // Based on check-ins in that zone
      const { data: zoneCheckIns, error } = await supabase
        .from('check_ins')
        .select(`
          user_id,
          establishment:establishments!inner(zone)
        `)
        .eq('establishments.zone', zone)
        .eq('verified', true);

      if (error) {
        logger.error('Get zone leaderboard error:', error);
        return res.status(500).json({ error: 'Failed to fetch zone leaderboard' });
      }

      // Count check-ins per user
      const userCheckInCounts: Record<string, number> = {};
      (zoneCheckIns as ZoneCheckIn[]).forEach((checkIn) => {
        userCheckInCounts[checkIn.user_id] = (userCheckInCounts[checkIn.user_id] || 0) + 1;
      });

      // Sort by count
      const sortedUsers = Object.entries(userCheckInCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, parseInt(limit as string, 10))
        .map(([userId, count], index) => ({ user_id: userId, check_ins: count, rank: index + 1 }));

      // Get usernames
      const userIds = sortedUsers.map(u => u.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, pseudonym')
        .in('id', userIds);

      if (usersError) {
        logger.error('Get zone leaderboard users error:', usersError);
      }

      const enrichedLeaderboard = sortedUsers.map(entry => ({
        ...entry,
        username: (users as UserLookup[] | null)?.find((u) => u.id === entry.user_id)?.pseudonym || 'Unknown'
      }));

      return res.json({ leaderboard: enrichedLeaderboard, type: 'zone', zone });
    }

    res.status(400).json({ error: 'Invalid leaderboard type or missing zone parameter' });
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================
// MISSIONS
// ========================================

/**
 * Get available missions
 * GET /api/gamification/missions
 * Query params: ?type=daily&is_active=true
 */
export const getMissions = async (req: AuthRequest, res: Response) => {
  try {
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
      return res.status(500).json({ error: 'Failed to fetch missions' });
    }

    res.json({ missions });
  } catch (error) {
    logger.error('Get missions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user's mission progress
 * GET /api/gamification/my-missions
 */
export const getMyMissions = async (req: AuthRequest, res: Response) => {
  try {
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
      return res.status(500).json({ error: 'Failed to fetch mission progress' });
    }

    res.json({ missionProgress });
  } catch (error) {
    logger.error('Get my missions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================
// SOCIAL
// ========================================

/**
 * Follow a user
 * POST /api/gamification/follow/:userId
 */
export const followUser = async (req: AuthRequest, res: Response) => {
  try {
    const followerId = req.user!.id;
    const { userId: followingId } = req.params;

    if (followerId === followingId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Check if already following
    const { data: existing, error: checkError } = await supabase
      .from('user_followers')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'You are already following this user' });
    }

    // Insert follow relationship
    const { data: follow, error } = await supabase
      .from('user_followers')
      .insert({ follower_id: followerId, following_id: followingId })
      .select()
      .single();

    if (error) {
      logger.error('Follow user error:', error);
      return res.status(500).json({ error: 'Failed to follow user' });
    }

    // Track mission progress (follow missions for both users)
    await missionTrackingService.onFollowAction(followerId, followingId);

    res.json({ message: 'User followed successfully', follow });
  } catch (error) {
    logger.error('Follow user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Unfollow a user
 * DELETE /api/gamification/follow/:userId
 */
export const unfollowUser = async (req: AuthRequest, res: Response) => {
  try {
    const followerId = req.user!.id;
    const { userId: followingId } = req.params;

    const { error } = await supabase
      .from('user_followers')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      logger.error('Unfollow user error:', error);
      return res.status(500).json({ error: 'Failed to unfollow user' });
    }

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    logger.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Vote on a review (helpful)
 * POST /api/gamification/reviews/:reviewId/vote
 * Body: { voteType: 'helpful' | 'not_helpful' }
 */
export const voteOnReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { reviewId } = req.params;
    const { voteType = 'helpful' } = req.body;

    // Check if already voted
    const { data: existing, error: checkError } = await supabase
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
        return res.status(500).json({ error: 'Failed to update vote' });
      }

      return res.json({ message: 'Vote updated successfully' });
    }

    // Insert new vote
    const { data: vote, error } = await supabase
      .from('review_votes')
      .insert({ review_id: reviewId, user_id: userId, vote_type: voteType })
      .select()
      .single();

    if (error) {
      logger.error('Vote on review error:', error);
      return res.status(500).json({ error: 'Failed to vote on review' });
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
  } catch (error) {
    logger.error('Vote on review error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================
// XP HISTORY (NEW)
// ========================================

/**
 * Get XP history for the current user
 * GET /api/gamification/xp-history
 * Query: ?period=7|30|90 (days, default 30)
 */
export const getXPHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const period = parseInt(req.query.period as string) || 30;

    // Validate period
    if (![7, 30, 90].includes(period)) {
      return res.status(400).json({ error: 'Period must be 7, 30, or 90 days' });
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
      return res.status(500).json({ error: 'Failed to fetch XP history' });
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
  } catch (error) {
    logger.error('Get XP history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================
// ENHANCED LEADERBOARDS
// ========================================

/**
 * Get weekly leaderboard
 * GET /api/gamification/leaderboard/weekly
 * Query: ?week=50&year=2025 (optional, defaults to current week)
 */
export const getWeeklyLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = '50' } = req.query;

    // Get from materialized view
    const { data: leaderboard, error } = await supabase
      .from('leaderboard_weekly')
      .select('*')
      .limit(parseInt(limit as string, 10));

    if (error) {
      logger.error('Get weekly leaderboard error:', error);
      // Fallback to user_points if view doesn't exist
      const { data: fallback, error: fallbackError } = await supabase
        .from('user_points')
        .select(`
          user_id,
          total_xp,
          current_level,
          users!inner(pseudonym)
        `)
        .order('total_xp', { ascending: false })
        .limit(parseInt(limit as string, 10));

      if (fallbackError) {
        return res.status(500).json({ error: 'Failed to fetch weekly leaderboard' });
      }

      // Note: Supabase returns nested relations as arrays
      const fallbackLeaderboard = (fallback || []).map((entry: LeaderboardEntry & { users?: { pseudonym: string }[] }, index: number) => ({
        user_id: entry.user_id,
        username: entry.users?.[0]?.pseudonym || 'Unknown',
        weekly_xp: entry.total_xp, // Using total as fallback
        current_level: entry.current_level,
        rank: index + 1
      }));

      return res.json({ leaderboard: fallbackLeaderboard, type: 'weekly' });
    }

    // Add rank to results
    const enrichedLeaderboard = (leaderboard || []).map((entry: LeaderboardEntry, index: number) => ({
      ...entry,
      rank: index + 1
    }));

    res.json({ leaderboard: enrichedLeaderboard, type: 'weekly' });
  } catch (error) {
    logger.error('Get weekly leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get category leaderboard
 * GET /api/gamification/leaderboard/category/:category
 * Categories: reviewers, photographers, checkins, helpful
 */
export const getCategoryLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.params;
    const { limit = '50' } = req.query;

    const validCategories = ['reviewers', 'photographers', 'checkins', 'helpful'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category. Must be one of: reviewers, photographers, checkins, helpful'
      });
    }

    const viewName = `leaderboard_${category}`;

    // Try to get from materialized view
    const { data: leaderboard, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(parseInt(limit as string, 10));

    if (error) {
      logger.error(`Get ${category} leaderboard error:`, error);

      // Provide fallback for each category
      let fallbackData: FallbackLeaderboardEntry[] = [];

      if (category === 'reviewers') {
        const { data } = await supabase
          .from('comments')
          .select('user_id, users!inner(pseudonym)')
          .not('content', 'is', null);

        // Group by user_id and count
        const counts = new Map<string, { count: number; username: string }>();
        for (const row of data || []) {
          const existing = counts.get(row.user_id) || { count: 0, username: (row.users as any)?.pseudonym || 'Unknown' };
          existing.count++;
          counts.set(row.user_id, existing);
        }
        fallbackData = Array.from(counts.entries())
          .map(([user_id, { count, username }]) => ({ user_id, username, review_count: count }))
          .sort((a, b) => b.review_count - a.review_count)
          .slice(0, parseInt(limit as string, 10));
      }

      if (category === 'photographers') {
        const { data } = await supabase
          .from('user_photo_uploads')
          .select('user_id, users!inner(pseudonym)')
          .eq('status', 'approved');

        const counts = new Map<string, { count: number; username: string }>();
        for (const row of data || []) {
          const existing = counts.get(row.user_id) || { count: 0, username: (row.users as any)?.pseudonym || 'Unknown' };
          existing.count++;
          counts.set(row.user_id, existing);
        }
        fallbackData = Array.from(counts.entries())
          .map(([user_id, { count, username }]) => ({ user_id, username, photo_count: count }))
          .sort((a, b) => b.photo_count - a.photo_count)
          .slice(0, parseInt(limit as string, 10));
      }

      if (category === 'checkins') {
        const { data } = await supabase
          .from('check_ins')
          .select('user_id, verified, users!inner(pseudonym)');

        const counts = new Map<string, { total: number; verified: number; username: string }>();
        for (const row of data || []) {
          const existing = counts.get(row.user_id) || { total: 0, verified: 0, username: (row.users as any)?.pseudonym || 'Unknown' };
          existing.total++;
          if (row.verified) existing.verified++;
          counts.set(row.user_id, existing);
        }
        fallbackData = Array.from(counts.entries())
          .map(([user_id, { total, verified, username }]) => ({
            user_id,
            username,
            checkin_count: total,
            verified_checkins: verified
          }))
          .sort((a, b) => b.verified_checkins - a.verified_checkins)
          .slice(0, parseInt(limit as string, 10));
      }

      if (category === 'helpful') {
        const { data } = await supabase
          .from('review_votes')
          .select('review_id, vote_type, comments!inner(user_id, users!inner(pseudonym))')
          .eq('vote_type', 'helpful');

        const counts = new Map<string, { count: number; username: string }>();
        for (const row of data || []) {
          const authorId = (row.comments as any)?.user_id;
          const username = (row.comments as any)?.users?.pseudonym || 'Unknown';
          if (authorId) {
            const existing = counts.get(authorId) || { count: 0, username };
            existing.count++;
            counts.set(authorId, existing);
          }
        }
        fallbackData = Array.from(counts.entries())
          .map(([user_id, { count, username }]) => ({ user_id, username, helpful_votes: count }))
          .sort((a, b) => b.helpful_votes - a.helpful_votes)
          .slice(0, parseInt(limit as string, 10));
      }

      const rankedData = fallbackData.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      return res.json({ leaderboard: rankedData, type: category });
    }

    // Add rank to results
    const enrichedLeaderboard = (leaderboard || []).map((entry: LeaderboardEntry, index: number) => ({
      ...entry,
      rank: index + 1
    }));

    res.json({ leaderboard: enrichedLeaderboard, type: category });
  } catch (error) {
    logger.error('Get category leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================================
// REWARDS SYSTEM
// ========================================

/**
 * Get all available rewards
 * GET /api/gamification/rewards
 */
export const getRewards = async (req: AuthRequest, res: Response) => {
  try {
    const { data: rewards, error } = await supabase
      .from('feature_unlocks')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      logger.error('Get rewards error:', error);
      return res.status(500).json({ error: 'Failed to fetch rewards' });
    }

    res.json({ rewards: rewards || [] });
  } catch (error) {
    logger.error('Get rewards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get current user's rewards (with unlock status)
 * GET /api/gamification/my-rewards
 */
export const getMyRewards = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's current level
    const { data: userProgress, error: progressError } = await supabase
      .from('user_points')
      .select('current_level, total_xp')
      .eq('user_id', userId)
      .single();

    if (progressError && progressError.code !== 'PGRST116') {
      logger.error('Get user progress error:', progressError);
    }

    const currentLevel = userProgress?.current_level || 1;
    const totalXp = userProgress?.total_xp || 0;

    // Get all rewards with user's unlock status
    const { data: allRewards, error: rewardsError } = await supabase
      .from('feature_unlocks')
      .select(`
        *,
        user_unlocks!left(
          id,
          unlocked_at,
          claimed
        )
      `)
      .eq('is_active', true)
      .eq('user_unlocks.user_id', userId)
      .order('sort_order', { ascending: true });

    if (rewardsError) {
      logger.error('Get rewards error:', rewardsError);

      // Fallback: get rewards separately
      const { data: rewards } = await supabase
        .from('feature_unlocks')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      const { data: userUnlocks } = await supabase
        .from('user_unlocks')
        .select('unlock_id, unlocked_at, claimed')
        .eq('user_id', userId);

      const unlockMap = new Map(
        (userUnlocks || []).map(u => [u.unlock_id, u])
      );

      const combinedRewards = (rewards || []).map(reward => ({
        ...reward,
        is_unlocked: unlockMap.has(reward.id),
        unlocked_at: unlockMap.get(reward.id)?.unlocked_at || null,
        claimed: unlockMap.get(reward.id)?.claimed || false
      }));

      return res.json({
        rewards: combinedRewards,
        currentLevel,
        totalXp
      });
    }

    // Process rewards with unlock status
    const processedRewards = (allRewards || []).map((reward: DbReward) => {
      const userUnlock = reward.user_unlocks?.[0];
      return {
        id: reward.id,
        name: reward.name,
        description: reward.description,
        unlock_type: reward.unlock_type,
        unlock_value: reward.unlock_value,
        category: reward.category,
        icon: reward.icon,
        sort_order: reward.sort_order,
        is_unlocked: !!userUnlock,
        unlocked_at: userUnlock?.unlocked_at || null,
        claimed: userUnlock?.claimed || false
      };
    });

    res.json({
      rewards: processedRewards,
      currentLevel,
      totalXp
    });
  } catch (error) {
    logger.error('Get my rewards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Claim a reward (for rewards that require claiming)
 * POST /api/gamification/claim-reward/:rewardId
 */
export const claimReward = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { rewardId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if reward exists and user is eligible
    const { data: reward, error: rewardError } = await supabase
      .from('feature_unlocks')
      .select('*')
      .eq('id', rewardId)
      .eq('is_active', true)
      .single();

    if (rewardError || !reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    // Get user's current level
    const { data: userProgress } = await supabase
      .from('user_points')
      .select('current_level, total_xp')
      .eq('user_id', userId)
      .single();

    const currentLevel = userProgress?.current_level || 1;

    // Check eligibility
    let eligible = false;
    if (reward.unlock_type === 'level' && currentLevel >= reward.unlock_value) {
      eligible = true;
    } else if (reward.unlock_type === 'xp' && (userProgress?.total_xp || 0) >= reward.unlock_value) {
      eligible = true;
    }
    // Add more eligibility checks for badge/achievement types as needed

    if (!eligible) {
      return res.status(403).json({
        error: 'Not eligible for this reward',
        required: {
          type: reward.unlock_type,
          value: reward.unlock_value
        },
        current: {
          level: currentLevel,
          xp: userProgress?.total_xp || 0
        }
      });
    }

    // Check if already claimed
    const { data: existing } = await supabase
      .from('user_unlocks')
      .select('id, claimed')
      .eq('user_id', userId)
      .eq('unlock_id', rewardId)
      .single();

    if (existing?.claimed) {
      return res.status(400).json({ error: 'Reward already claimed' });
    }

    // Grant or update the unlock
    if (existing) {
      // Update existing unlock to claimed
      const { error: updateError } = await supabase
        .from('user_unlocks')
        .update({ claimed: true, claimed_at: new Date().toISOString() })
        .eq('id', existing.id);

      if (updateError) {
        logger.error('Update unlock error:', updateError);
        return res.status(500).json({ error: 'Failed to claim reward' });
      }
    } else {
      // Insert new unlock
      const { error: insertError } = await supabase
        .from('user_unlocks')
        .insert({
          user_id: userId,
          unlock_id: rewardId,
          claimed: true,
          claimed_at: new Date().toISOString()
        });

      if (insertError) {
        logger.error('Insert unlock error:', insertError);
        return res.status(500).json({ error: 'Failed to claim reward' });
      }
    }

    res.json({
      message: 'Reward claimed successfully',
      reward: {
        id: reward.id,
        name: reward.name,
        icon: reward.icon,
        category: reward.category
      }
    });
  } catch (error) {
    logger.error('Claim reward error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
