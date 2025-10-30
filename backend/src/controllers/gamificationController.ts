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
  metadata?: Record<string, any>;
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
      const userIds = leaderboard.map((entry: any) => entry.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, pseudonym')
        .in('id', userIds);

      if (usersError) {
        logger.error('Get leaderboard users error:', usersError);
      }

      // Merge user data
      const enrichedLeaderboard = leaderboard.map((entry: any) => ({
        ...entry,
        username: users?.find((u: any) => u.id === entry.user_id)?.pseudonym || 'Unknown'
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
      const userIds = leaderboard.map((entry: any) => entry.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, pseudonym')
        .in('id', userIds);

      if (usersError) {
        logger.error('Get leaderboard users error:', usersError);
      }

      const enrichedLeaderboard = leaderboard.map((entry: any) => ({
        ...entry,
        username: users?.find((u: any) => u.id === entry.user_id)?.pseudonym || 'Unknown'
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
      zoneCheckIns.forEach((checkIn: any) => {
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
        username: users?.find((u: any) => u.id === entry.user_id)?.pseudonym || 'Unknown'
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
// CHECK-INS
// ========================================

/**
 * Create a check-in (geolocation)
 * POST /api/gamification/check-in
 * Body: { establishmentId, latitude, longitude }
 */
export const checkIn = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { establishmentId, latitude, longitude } = req.body;

    if (!establishmentId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing required fields: establishmentId, latitude, longitude' });
    }

    // Get establishment coordinates
    // Note: Using PostGIS extraction directly in select() causes TypeScript parsing issues
    // So we select the basic fields and location separately
    const { data: establishmentData, error: estError } = await supabase
      .from('establishments')
      .select('name, zone, location')
      .eq('id', establishmentId)
      .single();

    if (estError || !establishmentData) {
      logger.error('Get establishment for check-in error:', estError);
      return res.status(404).json({ error: 'Establishment not found' });
    }

    // Parse PostGIS location (stored as GeoJSON)
    // Supabase returns PostGIS geography as GeoJSON: { type: 'Point', coordinates: [lng, lat] }
    const location = establishmentData.location as any;
    const estLongitude = location?.coordinates?.[0] ?? null;
    const estLatitude = location?.coordinates?.[1] ?? null;

    const establishment = {
      name: establishmentData.name as string,
      zone: establishmentData.zone as string,
      latitude: estLatitude,
      longitude: estLongitude,
    };

    // Calculate distance (simplified Haversine formula for short distances)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371000; // Earth radius in meters
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const distance = establishment.latitude && establishment.longitude
      ? calculateDistance(latitude, longitude, establishment.latitude, establishment.longitude)
      : 999999; // Unknown establishment location

    // Development mode: Bypass GPS verification for testing missions locally
    const isDevMode = process.env.MISSION_DEV_MODE === 'true';
    const verified = isDevMode ? true : distance <= 100; // Within 100m (bypassed in dev mode)

    // Insert check-in
    const { data: checkIn, error: checkInError } = await supabase
      .from('check_ins')
      .insert({
        user_id: userId,
        establishment_id: establishmentId,
        latitude,
        longitude,
        verified,
        distance_meters: distance
      })
      .select()
      .single();

    if (checkInError) {
      logger.error('Create check-in error:', checkInError);
      return res.status(500).json({ error: 'Failed to create check-in' });
    }

    // Award XP if verified
    if (verified) {
      await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_xp_amount: 15,
        p_reason: 'check_in',
        p_entity_type: 'establishment',
        p_entity_id: establishmentId
      });
    }

    // Track mission progress (check-in missions)
    await missionTrackingService.onCheckIn(userId, establishmentId, establishment.zone, verified);

    res.json({
      checkIn,
      verified,
      distance: Math.round(distance),
      xpAwarded: verified ? 15 : 0,
      message: verified
        ? `Check-in verified! You're ${Math.round(distance)}m from ${establishment.name}. +15 XP`
        : `Check-in recorded but not verified (${Math.round(distance)}m away). You must be within 100m.`
    });
  } catch (error) {
    logger.error('Check-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user's check-in history
 * GET /api/gamification/my-check-ins
 * Query params: ?limit=20
 */
export const getMyCheckIns = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = '50' } = req.query;

    const { data: checkIns, error } = await supabase
      .from('check_ins')
      .select(`
        *,
        establishment:establishments(id, name, zone)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string, 10));

    if (error) {
      logger.error('Get check-ins error:', error);
      return res.status(500).json({ error: 'Failed to fetch check-ins' });
    }

    res.json({ checkIns });
  } catch (error) {
    logger.error('Get check-ins error:', error);
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
