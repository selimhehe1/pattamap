"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeAwardService = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
// ========================================
// BADGE AWARD SERVICE
// ========================================
/**
 * Service responsible for checking badge requirements and awarding badges to users
 */
class BadgeAwardService {
    /**
     * Check and award badges to a user based on action type
     * @param userId - User UUID
     * @param actionType - Action that triggered badge check (review_created, check_in, etc.)
     */
    async checkAndAwardBadges(userId, actionType) {
        try {
            logger_1.logger.debug(`🏅 Checking badges for user ${userId} after action: ${actionType}`);
            // Get all active badges from database
            const { data: badges, error: badgesError } = await supabase_1.supabase
                .from('badges')
                .select('*')
                .order('requirement_value', { ascending: true });
            if (badgesError) {
                logger_1.logger.error('Failed to fetch badges:', badgesError);
                return [];
            }
            if (!badges || badges.length === 0) {
                logger_1.logger.debug('No badges found in database');
                return [];
            }
            // Get user's already awarded badges
            const { data: userBadges, error: userBadgesError } = await supabase_1.supabase
                .from('user_badges')
                .select('badge_id')
                .eq('user_id', userId);
            if (userBadgesError) {
                logger_1.logger.error('Failed to fetch user badges:', userBadgesError);
                return [];
            }
            const awardedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);
            // Filter badges relevant to this action type
            const relevantBadges = badges.filter(badge => {
                return this.isBadgeRelevantForAction(badge, actionType);
            });
            logger_1.logger.debug(`Found ${relevantBadges.length} relevant badges for action ${actionType}`);
            // Check each relevant badge and award if requirements are met
            const newlyAwardedBadges = [];
            for (const badge of relevantBadges) {
                // Skip if user already has this badge
                if (awardedBadgeIds.has(badge.id)) {
                    continue;
                }
                // Check if requirements are met
                const requirementsMet = await this.checkBadgeRequirements(userId, badge);
                if (requirementsMet) {
                    const awarded = await this.awardBadge(userId, badge.id, badge.name);
                    if (awarded) {
                        newlyAwardedBadges.push(badge.name);
                    }
                }
            }
            if (newlyAwardedBadges.length > 0) {
                logger_1.logger.info(`🎉 Awarded ${newlyAwardedBadges.length} badge(s) to user ${userId}: ${newlyAwardedBadges.join(', ')}`);
            }
            return newlyAwardedBadges;
        }
        catch (error) {
            logger_1.logger.error('Error in checkAndAwardBadges:', error);
            return [];
        }
    }
    /**
     * Check if a badge is relevant for a given action type
     */
    isBadgeRelevantForAction(badge, actionType) {
        const actionToBadgeTypeMap = {
            'review_created': ['review_count', 'complete_reviews', 'detailed_reviews', 'all_ratings_used', 'helpful_percentage'],
            'check_in': ['check_in_count', 'unique_zones_visited', 'zone_check_ins', 'night_check_ins', 'early_check_ins', 'unique_establishments_visited'],
            'photo_uploaded': ['photo_count', 'high_res_photos'],
            'follower_gained': ['follower_count'],
            'helpful_vote_received': ['helpful_votes_received'],
            'edit_approved': ['approved_edits'],
            'referral_completed': ['referrals_completed']
        };
        const relevantTypes = actionToBadgeTypeMap[actionType] || [];
        return relevantTypes.includes(badge.requirement_type);
    }
    /**
     * Check if user meets badge requirements
     */
    async checkBadgeRequirements(userId, badge) {
        try {
            const requirementType = badge.requirement_type;
            const requirementValue = badge.requirement_value;
            switch (requirementType) {
                case 'review_count': {
                    // Count total reviews by user
                    const { count, error } = await supabase_1.supabase
                        .from('comments')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', userId);
                    if (error) {
                        logger_1.logger.error('Error counting reviews:', error);
                        return false;
                    }
                    return (count || 0) >= requirementValue;
                }
                case 'check_in_count': {
                    // Count total check-ins by user
                    const { count, error } = await supabase_1.supabase
                        .from('user_check_ins')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', userId)
                        .eq('verified', true);
                    if (error) {
                        logger_1.logger.error('Error counting check-ins:', error);
                        return false;
                    }
                    return (count || 0) >= requirementValue;
                }
                case 'photo_count': {
                    // Count photos uploaded by user (would need to track this in a photos table)
                    // For now, return false as we don't have this tracking yet
                    return false;
                }
                case 'unique_zones_visited': {
                    // Count unique zones user has checked in to
                    const { data, error } = await supabase_1.supabase
                        .from('user_check_ins')
                        .select('zone')
                        .eq('user_id', userId)
                        .eq('verified', true);
                    if (error) {
                        logger_1.logger.error('Error counting unique zones:', error);
                        return false;
                    }
                    const uniqueZones = new Set(data?.map(ci => ci.zone) || []);
                    return uniqueZones.size >= requirementValue;
                }
                case 'follower_count': {
                    // Would need a followers table to implement this
                    return false;
                }
                case 'helpful_votes_received': {
                    // Would need to track helpful votes on comments
                    return false;
                }
                default:
                    logger_1.logger.debug(`Badge requirement type '${requirementType}' not yet implemented`);
                    return false;
            }
        }
        catch (error) {
            logger_1.logger.error(`Error checking requirements for badge ${badge.name}:`, error);
            return false;
        }
    }
    /**
     * Award a badge to a user
     */
    async awardBadge(userId, badgeId, badgeName) {
        try {
            const { error } = await supabase_1.supabase
                .from('user_badges')
                .insert({
                user_id: userId,
                badge_id: badgeId
                // earned_at uses DEFAULT now() in database
            });
            if (error) {
                // Check if error is due to unique constraint (already awarded)
                if (error.code === '23505') {
                    logger_1.logger.debug(`Badge '${badgeName}' already awarded to user ${userId}`);
                    return false;
                }
                logger_1.logger.error(`Failed to award badge '${badgeName}' to user ${userId}:`, error);
                return false;
            }
            logger_1.logger.info(`✅ Awarded badge '${badgeName}' to user ${userId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Error awarding badge to user ${userId}:`, error);
            return false;
        }
    }
}
// Export singleton instance
exports.badgeAwardService = new BadgeAwardService();
//# sourceMappingURL=badgeAwardService.js.map