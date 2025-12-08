/**
 * Gamification Service - PattaMap
 *
 * Handles XP attribution, level calculation, and gamification mechanics.
 *
 * @module gamificationService
 */

import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { createNotification } from '../utils/notificationHelper';

/**
 * XP Award Sources
 */
export type XPSource =
  | 'review_created'
  | 'comment_reply'
  | 'check_in'
  | 'profile_updated'
  | 'daily_login'
  | 'mission_completed'
  | 'badge_unlocked'
  | 'admin_manual'
  | 'test_manual';

/**
 * Entity Types for XP attribution
 */
export type EntityType =
  | 'comment'
  | 'employee'
  | 'establishment'
  | 'mission'
  | 'badge'
  | 'user';

/**
 * Calculate user level based on total XP
 * Formula: level = floor(totalXP / 100) + 1
 *
 * @param totalXP - Total XP accumulated
 * @returns User level (1+)
 */
export function calculateLevel(totalXP: number): number {
  if (totalXP < 0) return 1;
  return Math.floor(totalXP / 100) + 1;
}

/**
 * Calculate XP required for next level
 *
 * @param currentLevel - Current user level
 * @returns XP needed to reach next level
 */
export function getXPForNextLevel(currentLevel: number): number {
  return currentLevel * 100;
}

/**
 * Award XP to a user and update user_points table
 *
 * This function:
 * 1. Creates an XP transaction record (audit trail)
 * 2. Updates or creates user_points entry
 * 3. Recalculates user level
 * 4. Updates last_activity_at timestamp
 *
 * @param userId - User UUID
 * @param xpAmount - Amount of XP to award (positive integer)
 * @param source - Source of XP (review_created, check_in, etc.)
 * @param entityType - Optional entity type related to XP award
 * @param entityId - Optional entity UUID
 * @param description - Optional description for admin manual awards
 *
 * @returns Promise<void>
 * @throws Error if XP attribution fails
 *
 * @example
 * await awardXP(userId, 50, 'review_created', 'comment', commentId);
 * await awardXP(userId, 10, 'check_in', 'employee', employeeId);
 */
export async function awardXP(
  userId: string,
  xpAmount: number,
  source: XPSource,
  entityType?: EntityType,
  entityId?: string,
  description?: string
): Promise<void> {
  try {
    // Validation
    if (!userId) {
      throw new Error('userId is required for XP attribution');
    }

    if (xpAmount <= 0) {
      throw new Error('xpAmount must be positive');
    }

    if (!Number.isInteger(xpAmount)) {
      throw new Error('xpAmount must be an integer');
    }

    logger.debug('🎯 Awarding XP:', {
      userId,
      xpAmount,
      source,
      entityType,
      entityId
    });

    // Step 1: Create XP transaction (audit trail)
    const { error: txError } = await supabase
      .from('xp_transactions')
      .insert({
        user_id: userId,
        xp_amount: xpAmount,
        reason: source, // DB uses 'reason' not 'source'
        related_entity_type: entityType || null,
        related_entity_id: entityId || null,
        metadata: description ? { description } : null,
        created_at: new Date().toISOString()
      });

    if (txError) {
      logger.error('❌ XP transaction insert failed:', txError);
      throw new Error(`Failed to create XP transaction: ${txError.message}`);
    }

    logger.debug('✅ XP transaction created');

    // Step 2: Get current user_points
    const { data: existingPoints, error: fetchError } = await supabase
      .from('user_points')
      .select('total_xp, monthly_xp, current_level')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      logger.error('❌ Failed to fetch user_points:', fetchError);
      throw new Error(`Failed to fetch user points: ${fetchError.message}`);
    }

    const newTotalXP = (existingPoints?.total_xp || 0) + xpAmount;
    const newMonthlyXP = (existingPoints?.monthly_xp || 0) + xpAmount;
    const newLevel = calculateLevel(newTotalXP);

    logger.debug('📊 XP Calculation:', {
      previousTotal: existingPoints?.total_xp || 0,
      awarded: xpAmount,
      newTotal: newTotalXP,
      previousLevel: existingPoints?.current_level || 1,
      newLevel
    });

    // Step 3: Upsert user_points
    if (existingPoints) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('user_points')
        .update({
          total_xp: newTotalXP,
          monthly_xp: newMonthlyXP,
          current_level: newLevel,
          last_activity_date: new Date().toISOString().split('T')[0] // DATE format
        })
        .eq('user_id', userId);

      if (updateError) {
        logger.error('❌ Failed to update user_points:', updateError);
        throw new Error(`Failed to update user points: ${updateError.message}`);
      }

      logger.debug('✅ user_points updated');
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('user_points')
        .insert({
          user_id: userId,
          total_xp: xpAmount,
          monthly_xp: xpAmount,
          current_level: newLevel,
          current_streak_days: 0,
          longest_streak_days: 0,
          last_activity_date: new Date().toISOString().split('T')[0] // DATE format
        });

      if (insertError) {
        logger.error('❌ Failed to insert user_points:', insertError);
        throw new Error(`Failed to insert user points: ${insertError.message}`);
      }

      logger.debug('✅ user_points created');
    }

    // Step 4: Check for level up and send notification
    if (existingPoints && newLevel > existingPoints.current_level) {
      logger.info(`🎉 LEVEL UP! User ${userId}: Level ${existingPoints.current_level} → ${newLevel}`);

      // Send level-up notification using 'system' type with i18n support
      createNotification({
        user_id: userId,
        type: 'system',
        title: `Level Up! You reached Level ${newLevel}`,
        message: `Congratulations! You've leveled up from Level ${existingPoints.current_level} to Level ${newLevel}. Keep contributing to earn more XP!`,
        i18n_key: 'gamification.levelUp',
        i18n_params: {
          oldLevel: existingPoints.current_level,
          newLevel: newLevel,
          totalXp: newTotalXP
        },
        link: '/dashboard'
      }).catch(err => {
        // Don't fail the XP award if notification fails
        logger.warn('Failed to send level-up notification:', err);
      });
    }

    logger.info(`✅ XP awarded successfully: +${xpAmount} XP to user ${userId} (Total: ${newTotalXP} XP, Level ${newLevel})`);

  } catch (error) {
    logger.error('❌ awardXP failed:', error);
    throw error;
  }
}

/**
 * Get user's current XP and level
 *
 * @param userId - User UUID
 * @returns User points data or null if not found
 */
export async function getUserPoints(userId: string): Promise<{
  total_xp: number;
  monthly_xp: number;
  current_level: number;
  current_streak_days: number;
  longest_streak_days: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from('user_points')
      .select('total_xp, monthly_xp, current_level, current_streak_days, longest_streak_days')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Failed to get user points:', error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error('getUserPoints failed:', error);
    return null;
  }
}

/**
 * Reset monthly XP for all users (scheduled monthly job)
 *
 * @returns Number of users reset
 */
export async function resetMonthlyXP(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_points')
      .update({ monthly_xp: 0 })
      .neq('monthly_xp', 0)
      .select('user_id');

    if (error) {
      logger.error('Failed to reset monthly XP:', error);
      throw error;
    }

    const count = data?.length || 0;
    logger.info(`✅ Monthly XP reset for ${count} users`);
    return count;
  } catch (error) {
    logger.error('resetMonthlyXP failed:', error);
    throw error;
  }
}
