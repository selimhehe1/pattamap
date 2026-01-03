/**
 * Leaderboard Controller
 *
 * Handles all leaderboard-related endpoints including global, monthly, weekly, zone and category.
 * Extracted from gamificationController.ts
 */

import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { asyncHandler, BadRequestError, InternalServerError } from '../middleware/asyncHandler';
import { getCategoryFallback } from '../utils/gamificationHelpers';

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
  avatar_url?: string | null;
}

// Check-in type - Supabase returns nested relations as arrays
interface ZoneCheckIn {
  user_id: string;
  establishment?: {
    zone: string;
  }[];
}

/**
 * Get leaderboard
 * GET /api/gamification/leaderboard/:type
 * Types: global, monthly, zone
 * Query params: ?zone=Soi 6&limit=50
 */
export const getLeaderboard = asyncHandler(async (req: AuthRequest, res: Response) => {
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
        throw InternalServerError('Failed to fetch leaderboard');
      }

      // Join with users to get usernames and avatars
      const userIds = leaderboard.map((entry: LeaderboardEntry) => entry.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, pseudonym, avatar_url')
        .in('id', userIds);

      if (usersError) {
        logger.error('Get leaderboard users error:', usersError);
      }

      // Merge user data
      const enrichedLeaderboard = leaderboard.map((entry: LeaderboardEntry) => {
        const user = (users as UserLookup[] | null)?.find((u) => u.id === entry.user_id);
        return {
          ...entry,
          username: user?.pseudonym || 'Unknown',
          avatar_url: user?.avatar_url || null
        };
      });

      res.json({ leaderboard: enrichedLeaderboard, type: 'global' });
      return;
    }

    if (type === 'monthly') {
      // Use materialized view
      const { data: leaderboard, error } = await supabase
        .from('leaderboard_monthly')
        .select('*')
        .limit(parseInt(limit as string, 10));

      if (error) {
        logger.error('Get monthly leaderboard error:', error);
        throw InternalServerError('Failed to fetch leaderboard');
      }

      // Join with users
      const userIds = leaderboard.map((entry: LeaderboardEntry) => entry.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, pseudonym, avatar_url')
        .in('id', userIds);

      if (usersError) {
        logger.error('Get leaderboard users error:', usersError);
      }

      const enrichedLeaderboard = leaderboard.map((entry: LeaderboardEntry) => {
        const user = (users as UserLookup[] | null)?.find((u) => u.id === entry.user_id);
        return {
          ...entry,
          username: user?.pseudonym || 'Unknown',
          avatar_url: user?.avatar_url || null
        };
      });

      res.json({ leaderboard: enrichedLeaderboard, type: 'monthly' });
      return;
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
        throw InternalServerError('Failed to fetch zone leaderboard');
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

      // Get usernames and avatars
      const userIds = sortedUsers.map(u => u.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, pseudonym, avatar_url')
        .in('id', userIds);

      if (usersError) {
        logger.error('Get zone leaderboard users error:', usersError);
      }

      const enrichedLeaderboard = sortedUsers.map(entry => {
        const user = (users as UserLookup[] | null)?.find((u) => u.id === entry.user_id);
        return {
          ...entry,
          username: user?.pseudonym || 'Unknown',
          avatar_url: user?.avatar_url || null
        };
      });

      res.json({ leaderboard: enrichedLeaderboard, type: 'zone', zone });
      return;
    }

    throw BadRequestError('Invalid leaderboard type or missing zone parameter');
});

/**
 * Get weekly leaderboard
 * GET /api/gamification/leaderboard/weekly
 * Query: ?week=50&year=2025 (optional, defaults to current week)
 */
export const getWeeklyLeaderboard = asyncHandler(async (req: AuthRequest, res: Response) => {
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
        throw InternalServerError('Failed to fetch weekly leaderboard');
      }

      // Note: Supabase returns nested relations as arrays
      const fallbackLeaderboard = (fallback || []).map((entry: LeaderboardEntry & { users?: { pseudonym: string }[] }, index: number) => ({
        user_id: entry.user_id,
        username: entry.users?.[0]?.pseudonym || 'Unknown',
        weekly_xp: entry.total_xp, // Using total as fallback
        current_level: entry.current_level,
        rank: index + 1
      }));

      res.json({ leaderboard: fallbackLeaderboard, type: 'weekly' });
      return;
    }

    // Add rank to results
    const enrichedLeaderboard = (leaderboard || []).map((entry: LeaderboardEntry, index: number) => ({
      ...entry,
      rank: index + 1
    }));

    res.json({ leaderboard: enrichedLeaderboard, type: 'weekly' });
});

/**
 * Get category leaderboard
 * GET /api/gamification/leaderboard/category/:category
 * Categories: reviewers, photographers, checkins, helpful
 */
export const getCategoryLeaderboard = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { category } = req.params;
    const { limit = '50' } = req.query;

    const validCategories = ['reviewers', 'photographers', 'checkins', 'helpful'];
    if (!validCategories.includes(category)) {
      throw BadRequestError('Invalid category. Must be one of: reviewers, photographers, checkins, helpful');
    }

    const viewName = `leaderboard_${category}`;

    // Try to get from materialized view
    const { data: leaderboard, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(parseInt(limit as string, 10));

    if (error) {
      logger.error(`Get ${category} leaderboard error:`, error);

      // Use helper for fallback data
      const fallbackData = await getCategoryFallback(category, parseInt(limit as string, 10));
      const rankedData = fallbackData.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      res.json({ leaderboard: rankedData, type: category });
      return;
    }

    // Add rank to results
    const enrichedLeaderboard = (leaderboard || []).map((entry: LeaderboardEntry, index: number) => ({
      ...entry,
      rank: index + 1
    }));

    res.json({ leaderboard: enrichedLeaderboard, type: category });
});
