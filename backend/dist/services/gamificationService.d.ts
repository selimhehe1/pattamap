/**
 * Gamification Service - PattaMap
 *
 * Handles XP attribution, level calculation, and gamification mechanics.
 *
 * @module gamificationService
 */
/**
 * XP Award Sources
 */
export type XPSource = 'review_created' | 'comment_reply' | 'check_in' | 'profile_updated' | 'profile_approved' | 'daily_login' | 'mission_completed' | 'badge_unlocked' | 'admin_manual' | 'test_manual';
/**
 * Entity Types for XP attribution
 */
export type EntityType = 'comment' | 'employee' | 'establishment' | 'mission' | 'badge' | 'user';
/**
 * Calculate user level based on total XP
 * Formula: level = floor(totalXP / 100) + 1
 *
 * @param totalXP - Total XP accumulated
 * @returns User level (1+)
 */
export declare function calculateLevel(totalXP: number): number;
/**
 * Calculate XP required for next level
 *
 * @param currentLevel - Current user level
 * @returns XP needed to reach next level
 */
export declare function getXPForNextLevel(currentLevel: number): number;
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
export declare function awardXP(userId: string, xpAmount: number, source: XPSource, entityType?: EntityType, entityId?: string, description?: string): Promise<void>;
/**
 * Get user's current XP and level
 *
 * @param userId - User UUID
 * @returns User points data or null if not found
 */
export declare function getUserPoints(userId: string): Promise<{
    total_xp: number;
    monthly_xp: number;
    current_level: number;
    current_streak_days: number;
    longest_streak_days: number;
} | null>;
/**
 * Reset monthly XP for all users (scheduled monthly job)
 *
 * @returns Number of users reset
 */
export declare function resetMonthlyXP(): Promise<number>;
//# sourceMappingURL=gamificationService.d.ts.map