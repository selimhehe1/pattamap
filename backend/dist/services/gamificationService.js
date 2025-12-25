"use strict";
/**
 * Gamification Service - PattaMap
 *
 * Handles XP attribution, level calculation, and gamification mechanics.
 *
 * @module gamificationService
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLevel = calculateLevel;
exports.getXPForNextLevel = getXPForNextLevel;
exports.awardXP = awardXP;
exports.getUserPoints = getUserPoints;
exports.resetMonthlyXP = resetMonthlyXP;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const notificationHelper_1 = require("../utils/notificationHelper");
/**
 * Calculate user level based on total XP
 * Formula: level = floor(totalXP / 100) + 1
 *
 * @param totalXP - Total XP accumulated
 * @returns User level (1+)
 */
function calculateLevel(totalXP) {
    if (totalXP < 0)
        return 1;
    return Math.floor(totalXP / 100) + 1;
}
/**
 * Calculate XP required for next level
 *
 * @param currentLevel - Current user level
 * @returns XP needed to reach next level
 */
function getXPForNextLevel(currentLevel) {
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
async function awardXP(userId, xpAmount, source, entityType, entityId, description) {
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
        logger_1.logger.debug('🎯 Awarding XP:', {
            userId,
            xpAmount,
            source,
            entityType,
            entityId
        });
        // Step 1: Create XP transaction (audit trail)
        const { error: txError } = await supabase_1.supabase
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
            logger_1.logger.error('❌ XP transaction insert failed:', txError);
            throw new Error(`Failed to create XP transaction: ${txError.message}`);
        }
        logger_1.logger.debug('✅ XP transaction created');
        // Step 2: Get current user_points
        const { data: existingPoints, error: fetchError } = await supabase_1.supabase
            .from('user_points')
            .select('total_xp, monthly_xp, current_level')
            .eq('user_id', userId)
            .maybeSingle();
        if (fetchError) {
            logger_1.logger.error('❌ Failed to fetch user_points:', fetchError);
            throw new Error(`Failed to fetch user points: ${fetchError.message}`);
        }
        const newTotalXP = (existingPoints?.total_xp || 0) + xpAmount;
        const newMonthlyXP = (existingPoints?.monthly_xp || 0) + xpAmount;
        const newLevel = calculateLevel(newTotalXP);
        logger_1.logger.debug('📊 XP Calculation:', {
            previousTotal: existingPoints?.total_xp || 0,
            awarded: xpAmount,
            newTotal: newTotalXP,
            previousLevel: existingPoints?.current_level || 1,
            newLevel
        });
        // Step 3: Upsert user_points
        if (existingPoints) {
            // Update existing record
            const { error: updateError } = await supabase_1.supabase
                .from('user_points')
                .update({
                total_xp: newTotalXP,
                monthly_xp: newMonthlyXP,
                current_level: newLevel,
                last_activity_date: new Date().toISOString().split('T')[0] // DATE format
            })
                .eq('user_id', userId);
            if (updateError) {
                logger_1.logger.error('❌ Failed to update user_points:', updateError);
                throw new Error(`Failed to update user points: ${updateError.message}`);
            }
            logger_1.logger.debug('✅ user_points updated');
        }
        else {
            // Create new record
            const { error: insertError } = await supabase_1.supabase
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
                logger_1.logger.error('❌ Failed to insert user_points:', insertError);
                throw new Error(`Failed to insert user points: ${insertError.message}`);
            }
            logger_1.logger.debug('✅ user_points created');
        }
        // Step 4: Check for level up and send notification
        if (existingPoints && newLevel > existingPoints.current_level) {
            logger_1.logger.info(`🎉 LEVEL UP! User ${userId}: Level ${existingPoints.current_level} → ${newLevel}`);
            // Send level-up notification using 'system' type with i18n support
            (0, notificationHelper_1.createNotification)({
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
                logger_1.logger.warn('Failed to send level-up notification:', err);
            });
        }
        logger_1.logger.info(`✅ XP awarded successfully: +${xpAmount} XP to user ${userId} (Total: ${newTotalXP} XP, Level ${newLevel})`);
    }
    catch (error) {
        logger_1.logger.error('❌ awardXP failed:', error);
        throw error;
    }
}
/**
 * Get user's current XP and level
 *
 * @param userId - User UUID
 * @returns User points data or null if not found
 */
async function getUserPoints(userId) {
    try {
        const { data, error } = await supabase_1.supabase
            .from('user_points')
            .select('total_xp, monthly_xp, current_level, current_streak_days, longest_streak_days')
            .eq('user_id', userId)
            .maybeSingle();
        if (error) {
            logger_1.logger.error('Failed to get user points:', error);
            return null;
        }
        return data;
    }
    catch (error) {
        logger_1.logger.error('getUserPoints failed:', error);
        return null;
    }
}
/**
 * Reset monthly XP for all users (scheduled monthly job)
 *
 * @returns Number of users reset
 */
async function resetMonthlyXP() {
    try {
        const { data, error } = await supabase_1.supabase
            .from('user_points')
            .update({ monthly_xp: 0 })
            .neq('monthly_xp', 0)
            .select('user_id');
        if (error) {
            logger_1.logger.error('Failed to reset monthly XP:', error);
            throw error;
        }
        const count = data?.length || 0;
        logger_1.logger.info(`✅ Monthly XP reset for ${count} users`);
        return count;
    }
    catch (error) {
        logger_1.logger.error('resetMonthlyXP failed:', error);
        throw error;
    }
}
//# sourceMappingURL=gamificationService.js.map