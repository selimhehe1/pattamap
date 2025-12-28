import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// ========================================
// TYPES
// ========================================

interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  category: string;
  rarity: string;
  requirement_type: string;
  requirement_value: number;
  is_hidden: boolean;
}

interface _UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  progress?: number;
}

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
  async checkAndAwardBadges(userId: string, actionType: string): Promise<string[]> {
    try {
      logger.debug(`🏅 Checking badges for user ${userId} after action: ${actionType}`);

      // Get all active badges from database
      const { data: badges, error: badgesError } = await supabase
        .from('badges')
        .select('*')
        .order('requirement_value', { ascending: true });

      if (badgesError) {
        logger.error('Failed to fetch badges:', badgesError);
        return [];
      }

      if (!badges || badges.length === 0) {
        logger.debug('No badges found in database');
        return [];
      }

      // Get user's already awarded badges
      const { data: userBadges, error: userBadgesError } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId);

      if (userBadgesError) {
        logger.error('Failed to fetch user badges:', userBadgesError);
        return [];
      }

      const awardedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);

      // Filter badges relevant to this action type
      const relevantBadges = badges.filter(badge => {
        return this.isBadgeRelevantForAction(badge, actionType);
      });

      logger.debug(`Found ${relevantBadges.length} relevant badges for action ${actionType}`);

      // Check each relevant badge and award if requirements are met
      const newlyAwardedBadges: string[] = [];

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
        logger.info(`🎉 Awarded ${newlyAwardedBadges.length} badge(s) to user ${userId}: ${newlyAwardedBadges.join(', ')}`);
      }

      return newlyAwardedBadges;
    } catch (error) {
      logger.error('Error in checkAndAwardBadges:', error);
      return [];
    }
  }

  /**
   * Check if a badge is relevant for a given action type
   */
  private isBadgeRelevantForAction(badge: Badge, actionType: string): boolean {
    const actionToBadgeTypeMap: Record<string, string[]> = {
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
  private async checkBadgeRequirements(userId: string, badge: Badge): Promise<boolean> {
    try {
      const requirementType = badge.requirement_type;
      const requirementValue = badge.requirement_value;

      switch (requirementType) {
        case 'review_count': {
          // Count total reviews by user
          const { count, error } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

          if (error) {
            logger.error('Error counting reviews:', error);
            return false;
          }

          return (count || 0) >= requirementValue;
        }

        case 'check_in_count': {
          // Count total check-ins by user
          const { count, error } = await supabase
            .from('user_check_ins')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('verified', true);

          if (error) {
            logger.error('Error counting check-ins:', error);
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
          const { data, error } = await supabase
            .from('user_check_ins')
            .select('zone')
            .eq('user_id', userId)
            .eq('verified', true);

          if (error) {
            logger.error('Error counting unique zones:', error);
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
          logger.debug(`Badge requirement type '${requirementType}' not yet implemented`);
          return false;
      }
    } catch (error) {
      logger.error(`Error checking requirements for badge ${badge.name}:`, error);
      return false;
    }
  }

  /**
   * Award a badge to a user
   */
  private async awardBadge(userId: string, badgeId: string, badgeName: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badgeId
          // earned_at uses DEFAULT now() in database
        });

      if (error) {
        // Check if error is due to unique constraint (already awarded)
        if (error.code === '23505') {
          logger.debug(`Badge '${badgeName}' already awarded to user ${userId}`);
          return false;
        }

        logger.error(`Failed to award badge '${badgeName}' to user ${userId}:`, error);
        return false;
      }

      logger.info(`✅ Awarded badge '${badgeName}' to user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error awarding badge to user ${userId}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const badgeAwardService = new BadgeAwardService();
