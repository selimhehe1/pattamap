/**
 * Rewards Controller
 *
 * Handles feature unlocks, rewards claiming, and user reward progress.
 * Extracted from gamificationController.ts
 */

import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { asyncHandler, BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError, InternalServerError } from '../middleware/asyncHandler';

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

/**
 * Get all available rewards
 * GET /api/gamification/rewards
 */
export const getRewards = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { data: rewards, error } = await supabase
      .from('feature_unlocks')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      logger.error('Get rewards error:', error);
      throw InternalServerError('Failed to fetch rewards');
    }

    res.json({ rewards: rewards || [] });
});

/**
 * Get current user's rewards (with unlock status)
 * GET /api/gamification/my-rewards
 */
export const getMyRewards = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw UnauthorizedError('Authentication required');
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

      res.json({
        rewards: combinedRewards,
        currentLevel,
        totalXp
      });
      return;
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
});

/**
 * Claim a reward (for rewards that require claiming)
 * POST /api/gamification/claim-reward/:rewardId
 */
export const claimReward = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { rewardId } = req.params;

    if (!userId) {
      throw UnauthorizedError('Authentication required');
    }

    // Check if reward exists and user is eligible
    const { data: reward, error: rewardError } = await supabase
      .from('feature_unlocks')
      .select('*')
      .eq('id', rewardId)
      .eq('is_active', true)
      .single();

    if (rewardError || !reward) {
      throw NotFoundError('Reward not found');
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
      throw ForbiddenError('Not eligible for this reward');
    }

    // Check if already claimed
    const { data: existing } = await supabase
      .from('user_unlocks')
      .select('id, claimed')
      .eq('user_id', userId)
      .eq('unlock_id', rewardId)
      .single();

    if (existing?.claimed) {
      throw BadRequestError('Reward already claimed');
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
        throw InternalServerError('Failed to claim reward');
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
        throw InternalServerError('Failed to claim reward');
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
});
