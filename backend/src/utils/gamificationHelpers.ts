/**
 * Gamification Helper Functions
 *
 * Extracted from gamificationController.ts to reduce complexity
 */

import { supabase } from '../config/supabase';

// Types
interface FallbackLeaderboardEntry {
  user_id: string;
  username: string;
  review_count?: number;
  photo_count?: number;
  checkin_count?: number;
  verified_checkins?: number;
  helpful_votes?: number;
}

/**
 * Get reviewers leaderboard fallback data
 */
export async function getReviewersFallback(limit: number): Promise<FallbackLeaderboardEntry[]> {
  const { data } = await supabase
    .from('comments')
    .select('user_id, users!inner(pseudonym)')
    .not('content', 'is', null);

  const counts = new Map<string, { count: number; username: string }>();
  for (const row of data || []) {
    const usersArray = row.users as { pseudonym: string }[] | null;
    const existing = counts.get(row.user_id) || { count: 0, username: usersArray?.[0]?.pseudonym || 'Unknown' };
    existing.count++;
    counts.set(row.user_id, existing);
  }

  return Array.from(counts.entries())
    .map(([user_id, { count, username }]) => ({ user_id, username, review_count: count }))
    .sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
    .slice(0, limit);
}

/**
 * Get photographers leaderboard fallback data
 */
export async function getPhotographersFallback(limit: number): Promise<FallbackLeaderboardEntry[]> {
  const { data } = await supabase
    .from('user_photo_uploads')
    .select('user_id, users!inner(pseudonym)')
    .eq('status', 'approved');

  const counts = new Map<string, { count: number; username: string }>();
  for (const row of data || []) {
    const usersArray = row.users as { pseudonym: string }[] | null;
    const existing = counts.get(row.user_id) || { count: 0, username: usersArray?.[0]?.pseudonym || 'Unknown' };
    existing.count++;
    counts.set(row.user_id, existing);
  }

  return Array.from(counts.entries())
    .map(([user_id, { count, username }]) => ({ user_id, username, photo_count: count }))
    .sort((a, b) => (b.photo_count || 0) - (a.photo_count || 0))
    .slice(0, limit);
}

/**
 * Get checkins leaderboard fallback data
 */
export async function getCheckinsFallback(limit: number): Promise<FallbackLeaderboardEntry[]> {
  const { data } = await supabase
    .from('check_ins')
    .select('user_id, verified, users!inner(pseudonym)');

  const counts = new Map<string, { total: number; verified: number; username: string }>();
  for (const row of data || []) {
    const usersArray = row.users as { pseudonym: string }[] | null;
    const existing = counts.get(row.user_id) || { total: 0, verified: 0, username: usersArray?.[0]?.pseudonym || 'Unknown' };
    existing.total++;
    if (row.verified) existing.verified++;
    counts.set(row.user_id, existing);
  }

  return Array.from(counts.entries())
    .map(([user_id, { total, verified, username }]) => ({
      user_id,
      username,
      checkin_count: total,
      verified_checkins: verified
    }))
    .sort((a, b) => (b.verified_checkins || 0) - (a.verified_checkins || 0))
    .slice(0, limit);
}

/**
 * Get helpful votes leaderboard fallback data
 */
export async function getHelpfulFallback(limit: number): Promise<FallbackLeaderboardEntry[]> {
  const { data } = await supabase
    .from('review_votes')
    .select('review_id, vote_type, comments!inner(user_id, users!inner(pseudonym))')
    .eq('vote_type', 'helpful');

  const counts = new Map<string, { count: number; username: string }>();
  for (const row of data || []) {
    const commentsArray = row.comments as { user_id: string; users: { pseudonym: string }[] | null }[] | null;
    const comment = commentsArray?.[0];
    const authorId = comment?.user_id;
    const username = comment?.users?.[0]?.pseudonym || 'Unknown';
    if (authorId) {
      const existing = counts.get(authorId) || { count: 0, username };
      existing.count++;
      counts.set(authorId, existing);
    }
  }

  return Array.from(counts.entries())
    .map(([user_id, { count, username }]) => ({ user_id, username, helpful_votes: count }))
    .sort((a, b) => (b.helpful_votes || 0) - (a.helpful_votes || 0))
    .slice(0, limit);
}

/**
 * Get category leaderboard fallback based on category type
 */
export async function getCategoryFallback(
  category: string,
  limit: number
): Promise<FallbackLeaderboardEntry[]> {
  switch (category) {
    case 'reviewers':
      return getReviewersFallback(limit);
    case 'photographers':
      return getPhotographersFallback(limit);
    case 'checkins':
      return getCheckinsFallback(limit);
    case 'helpful':
      return getHelpfulFallback(limit);
    default:
      return [];
  }
}
