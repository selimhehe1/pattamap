import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// ========================================
// TYPES
// ========================================

interface MissionRequirement {
  type: string;
  count?: number;
  zone?: string;
  unique?: boolean;
  min_length?: number;
  with_photo?: boolean;
  with_photos?: boolean;
  quest_id?: string;
  step?: number;
  prerequisite?: string;
  event?: string;
}

interface Mission {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'event' | 'narrative';
  xp_reward: number;
  badge_reward?: string;
  requirements: MissionRequirement;
  is_active: boolean;
}

interface UserMissionProgress {
  id: string;
  user_id: string;
  mission_id: string;
  progress: number;
  completed: boolean;
  completed_at?: string;
}

// ========================================
// MISSION TRACKING SERVICE
// ========================================

/**
 * Service responsible for tracking user mission progress
 * Listens to events (check-ins, reviews, votes, follows) and updates mission progress automatically
 */
class MissionTrackingService {

  // ========================================
  // EVENT LISTENERS
  // ========================================

  /**
   * Called when user creates a check-in
   * Updates missions: Explorer, Weekly Explorer, Grand Tour, Zone Master, Event missions
   */
  async onCheckIn(userId: string, establishmentId: string, zone: string, verified: boolean): Promise<void> {
    try {
      if (!verified) {
        // Only count verified check-ins for missions
        logger.debug('Check-in not verified, skipping mission tracking');
        return;
      }

      logger.debug('Mission tracking: check-in event', { userId, establishmentId, zone });

      // Get active check-in related missions
      const { data: missions, error } = await supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        .or('requirements->>type.eq.check_in,requirements->>type.eq.check_in_zone,requirements->>type.eq.check_in_all_zones');

      if (error) {
        logger.error('Failed to fetch check-in missions:', error);
        return;
      }

      if (!missions || missions.length === 0) {
        logger.debug('No active check-in missions found');
        return;
      }

      // Process each relevant mission in parallel (FIXED: was sequential N+1 queries)
      await Promise.all(
        missions.map(mission => this.processCheckInMission(userId, mission, establishmentId, zone))
      );
    } catch (error) {
      logger.error('Error in onCheckIn mission tracking:', error);
    }
  }

  /**
   * Called when user creates a review
   * Updates missions: Daily Reviewer, Quality Reviewer, Reviewer Path, Weekly Contributor
   */
  async onReviewCreated(userId: string, reviewId: string, reviewLength: number, hasPhotos: boolean): Promise<void> {
    try {
      logger.debug('Mission tracking: review created event', { userId, reviewId, reviewLength, hasPhotos });

      // Get active review related missions
      const { data: missions, error } = await supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        .or('requirements->>type.eq.write_reviews,requirements->>type.eq.write_quality_review');

      if (error) {
        logger.error('Failed to fetch review missions:', error);
        return;
      }

      if (!missions || missions.length === 0) {
        logger.debug('No active review missions found');
        return;
      }

      // Process each relevant mission in parallel (FIXED: was sequential N+1 queries)
      await Promise.all(
        missions.map(mission => this.processReviewMission(userId, mission, reviewLength, hasPhotos))
      );
    } catch (error) {
      logger.error('Error in onReviewCreated mission tracking:', error);
    }
  }

  /**
   * Called when user votes on a review (helpful)
   * Updates missions: Helpful Community Member
   */
  async onVoteCast(userId: string, reviewId: string, voteType: string): Promise<void> {
    try {
      if (voteType !== 'helpful') {
        // Only count helpful votes for missions
        return;
      }

      logger.debug('Mission tracking: vote cast event', { userId, reviewId, voteType });

      // Get active vote related missions
      const { data: missions, error } = await supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        .eq('requirements->>type', 'vote_helpful');

      if (error) {
        logger.error('Failed to fetch vote missions:', error);
        return;
      }

      if (!missions || missions.length === 0) {
        logger.debug('No active vote missions found');
        return;
      }

      // Process each relevant mission in parallel (FIXED: was sequential updates)
      await Promise.all(
        missions.map(mission => this.updateMissionProgress(userId, mission.id, 1))
      );
    } catch (error) {
      logger.error('Error in onVoteCast mission tracking:', error);
    }
  }

  /**
   * Called when user follows another user
   * Updates missions: Social Networker, Social Butterfly
   */
  async onFollowAction(followerId: string, followingId: string): Promise<void> {
    try {
      logger.debug('Mission tracking: follow action event', { followerId, followingId });

      // Get active follow related missions
      const { data: missions, error } = await supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        .or('requirements->>type.eq.follow_users,requirements->>type.eq.gain_followers');

      if (error) {
        logger.error('Failed to fetch follow missions:', error);
        return;
      }

      if (!missions || missions.length === 0) {
        logger.debug('No active follow missions found');
        return;
      }

      // Process follower's missions (user who followed)
      const followerMissions = missions.filter(m => m.requirements.type === 'follow_users');
      for (const mission of followerMissions) {
        await this.updateMissionProgress(followerId, mission.id, 1);
      }

      // Process followed user's missions (user who gained follower)
      const followedMissions = missions.filter(m => m.requirements.type === 'gain_followers');
      for (const mission of followedMissions) {
        await this.updateMissionProgress(followingId, mission.id, 1);
      }
    } catch (error) {
      logger.error('Error in onFollowAction mission tracking:', error);
    }
  }

  /**
   * Called when user receives helpful vote on their review
   * Updates missions: Helpful Week, Social Butterfly (receive_helpful_votes)
   */
  async onHelpfulVoteReceived(reviewAuthorId: string, reviewId: string): Promise<void> {
    try {
      logger.debug('Mission tracking: helpful vote received event', { reviewAuthorId, reviewId });

      // Get active receive_helpful_votes missions
      const { data: missions, error } = await supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        .eq('requirements->>type', 'receive_helpful_votes');

      if (error) {
        logger.error('Failed to fetch helpful vote received missions:', error);
        return;
      }

      if (!missions || missions.length === 0) {
        logger.debug('No active receive helpful vote missions found');
        return;
      }

      // Process each relevant mission
      for (const mission of missions) {
        await this.updateMissionProgress(reviewAuthorId, mission.id, 1);
      }
    } catch (error) {
      logger.error('Error in onHelpfulVoteReceived mission tracking:', error);
    }
  }

  /**
   * Called when user uploads a photo
   * Updates missions: Photo Hunter, Photo Marathon
   * NOTE: This will be implemented in Phase 3 (Photo Tracking Infrastructure)
   */
  async onPhotoUploaded(userId: string, photoUrl: string, entityType: string, entityId: string | null): Promise<void> {
    try {
      logger.debug('Mission tracking: photo uploaded event', { userId, photoUrl, entityType, entityId });

      // Get active photo upload missions
      const { data: missions, error } = await supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        .eq('requirements->>type', 'upload_photos');

      if (error) {
        logger.error('Failed to fetch photo upload missions:', error);
        return;
      }

      if (!missions || missions.length === 0) {
        logger.debug('No active photo upload missions found');
        return;
      }

      // Process each relevant mission in parallel (FIXED: was sequential updates)
      await Promise.all(
        missions.map(mission => this.updateMissionProgress(userId, mission.id, 1))
      );
    } catch (error) {
      logger.error('Error in onPhotoUploaded mission tracking:', error);
    }
  }

  // ========================================
  // MISSION PROCESSING (TYPE-SPECIFIC)
  // ========================================

  /**
   * Process check-in related missions
   */
  private async processCheckInMission(
    userId: string,
    mission: Mission,
    establishmentId: string,
    zone: string
  ): Promise<void> {
    try {
      const req = mission.requirements;

      // Type 1: Simple check-in count (daily/weekly)
      if (req.type === 'check_in') {
        if (req.unique) {
          // Count unique establishments only
          const count = await this.getUniqueCheckInCount(userId, mission.type);
          await this.setMissionProgress(userId, mission.id, count);
        } else {
          // Simple increment
          await this.updateMissionProgress(userId, mission.id, 1);
        }
        return;
      }

      // Type 2: Check-in in specific zone (Grand Tour quests)
      if (req.type === 'check_in_zone' && req.zone === zone) {
        const count = await this.getZoneCheckInCount(userId, zone, mission.type);
        await this.setMissionProgress(userId, mission.id, count);
        return;
      }

      // Type 3: Check-in in all zones (Grand Tour final step)
      if (req.type === 'check_in_all_zones') {
        const uniqueZones = await this.getUniqueZonesVisited(userId);
        await this.setMissionProgress(userId, mission.id, uniqueZones);
        return;
      }

      // Type 4: Visit different zones (Weekly Explorer)
      if (req.type === 'visit_zones' && req.unique) {
        const uniqueZones = await this.getUniqueZonesVisited(userId, mission.type);
        await this.setMissionProgress(userId, mission.id, uniqueZones);
        return;
      }
    } catch (error) {
      logger.error('Error processing check-in mission:', error);
    }
  }

  /**
   * Process review related missions
   */
  private async processReviewMission(
    userId: string,
    mission: Mission,
    reviewLength: number,
    hasPhotos: boolean
  ): Promise<void> {
    try {
      const req = mission.requirements;

      // Type 1: Simple review count (Daily Reviewer)
      if (req.type === 'write_reviews' && !req.min_length && !req.with_photos) {
        const count = await this.getReviewCount(userId, mission.type);
        await this.setMissionProgress(userId, mission.id, count);
        return;
      }

      // Type 2: Quality review (min length + photo) (Quality Reviewer)
      if (req.type === 'write_quality_review') {
        const minLength = req.min_length || 0;
        const requirePhoto = req.with_photo || false;

        if (reviewLength >= minLength && (!requirePhoto || hasPhotos)) {
          const count = await this.getQualityReviewCount(userId, minLength, requirePhoto, mission.type);
          await this.setMissionProgress(userId, mission.id, count);
        }
        return;
      }

      // Type 3: Reviews with photos (Weekly Contributor)
      // FIXED: Removed "&& hasPhotos" condition - we should count ALL reviews with photos,
      // not just check if current review has photo
      if (req.type === 'write_reviews' && req.with_photos) {
        const count = await this.getReviewsWithPhotosCount(userId, mission.type);
        await this.setMissionProgress(userId, mission.id, count);
        return;
      }

      // Type 4: Reviews with min length (Reviewer Path: Quality Matters)
      if (req.type === 'write_reviews' && req.min_length && reviewLength >= req.min_length) {
        const count = await this.getReviewsMinLengthCount(userId, req.min_length, mission.type);
        await this.setMissionProgress(userId, mission.id, count);
        return;
      }

      // Type 5: Simple review count for narrative quests (Reviewer Path)
      if (req.type === 'write_reviews' && req.quest_id) {
        const count = await this.getReviewCount(userId, 'narrative'); // Count all-time for narrative
        await this.setMissionProgress(userId, mission.id, count);
        return;
      }
    } catch (error) {
      logger.error('Error processing review mission:', error);
    }
  }

  // ========================================
  // PROGRESS TRACKING
  // ========================================

  /**
   * Update mission progress by increment
   */
  async updateMissionProgress(userId: string, missionId: string, increment: number): Promise<void> {
    try {
      // Call PostgreSQL RPC function for atomic update
      const { data, error } = await supabase.rpc('update_mission_progress', {
        p_user_id: userId,
        p_mission_id: missionId,
        p_increment: increment
      });

      if (error) {
        logger.error('Failed to update mission progress:', error);
        return;
      }

      logger.debug('Mission progress updated', { userId, missionId, increment, completed: data });

      // If mission completed, check for badge reward
      if (data === true) {
        await this.handleMissionCompletion(userId, missionId);
      }
    } catch (error) {
      logger.error('Error updating mission progress:', error);
    }
  }

  /**
   * Set mission progress to specific value (for counted missions)
   * FIXED: Now uses atomic RPC function to prevent race conditions
   */
  async setMissionProgress(userId: string, missionId: string, progress: number): Promise<void> {
    try {
      // Call PostgreSQL RPC function for atomic SET (thread-safe)
      // This fixes race condition where concurrent updates could lose progress
      const { data: completed, error } = await supabase.rpc('set_mission_progress_absolute', {
        p_user_id: userId,
        p_mission_id: missionId,
        p_new_progress: progress
      });

      if (error) {
        logger.error('Failed to set mission progress:', error);
        return;
      }

      logger.debug('Mission progress set', { userId, missionId, progress, completed });

      // If mission completed, handle quest unlocking (RPC already awarded XP + badge)
      if (completed === true) {
        await this.handleMissionCompletion(userId, missionId);
      }
    } catch (error) {
      logger.error('Error setting mission progress:', error);
    }
  }

  /**
   * Handle mission completion (unlock next quest step)
   * NOTE: XP + badge are already awarded by RPC functions (update_mission_progress or set_mission_progress_absolute)
   */
  private async handleMissionCompletion(userId: string, missionId: string): Promise<void> {
    try {
      logger.info('Mission completed!', { userId, missionId });

      // Get mission details
      const { data: mission, error } = await supabase
        .from('missions')
        .select('name, requirements')
        .eq('id', missionId)
        .single();

      if (error || !mission) {
        logger.error('Failed to get completed mission:', error);
        return;
      }

      // If narrative quest, unlock next step
      if (mission.requirements.quest_id && mission.requirements.step) {
        await this.unlockNextQuestStep(userId, mission.requirements.quest_id, mission.requirements.step);
      }
    } catch (error) {
      logger.error('Error handling mission completion:', error);
    }
  }

  /**
   * Award mission rewards (XP + optional badge)
   * REMOVED: This functionality is now handled by RPC functions:
   * - update_mission_progress (for increment-based missions)
   * - set_mission_progress_absolute (for counted missions)
   * Both RPCs award XP + badge atomically on completion.
   *
   * Keeping this comment for documentation - previous implementation duplicated logic.
   */

  /**
   * Unlock next step in narrative quest
   */
  private async unlockNextQuestStep(userId: string, questId: string, currentStep: number): Promise<void> {
    try {
      // Find next step mission
      const { data: nextMission, error } = await supabase
        .from('missions')
        .select('id, name')
        .eq('requirements->>quest_id', questId)
        .eq('requirements->>step', currentStep + 1)
        .single();

      if (error || !nextMission) {
        logger.debug('No next quest step found', { questId, currentStep });
        return;
      }

      // Initialize progress for next step
      const { error: initError } = await supabase
        .from('user_mission_progress')
        .upsert({
          user_id: userId,
          mission_id: nextMission.id,
          progress: 0,
          completed: false
        }, {
          onConflict: 'user_id,mission_id'
        });

      if (initError) {
        logger.error('Failed to unlock next quest step:', initError);
      } else {
        logger.info('Next quest step unlocked', { userId, questId, step: currentStep + 1, missionName: nextMission.name });
      }
    } catch (error) {
      logger.error('Error unlocking next quest step:', error);
    }
  }

  // ========================================
  // COUNTING HELPERS (FOR PROGRESS CALCULATION)
  // ========================================

  /**
   * Get unique check-in count for user (within time period if daily/weekly)
   */
  private async getUniqueCheckInCount(userId: string, missionType: string): Promise<number> {
    try {
      let query = supabase
        .from('check_ins')
        .select('establishment_id', { count: 'exact', head: false })
        .eq('user_id', userId)
        .eq('verified', true);

      // Apply time filter for daily/weekly missions
      // FIXED: Now uses Bangkok timezone to match cron job reset times
      if (missionType === 'daily') {
        const today = this.getTodayBangkok();
        query = query.gte('created_at', today);
      } else if (missionType === 'weekly') {
        const monday = this.getThisWeekMonday();
        query = query.gte('created_at', monday);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to count unique check-ins:', error);
        return 0;
      }

      // Count unique establishments
      const uniqueEstablishments = new Set(data?.map((ci: any) => ci.establishment_id) || []);
      return uniqueEstablishments.size;
    } catch (error) {
      logger.error('Error counting unique check-ins:', error);
      return 0;
    }
  }

  /**
   * Get check-in count in specific zone
   */
  private async getZoneCheckInCount(userId: string, zone: string, missionType: string): Promise<number> {
    try {
      let query = supabase
        .from('check_ins')
        .select('id, establishment:establishments!inner(zone)', { count: 'exact' })
        .eq('user_id', userId)
        .eq('verified', true)
        .eq('establishments.zone', zone);

      // Narrative missions count all-time, no date filter
      if (missionType === 'daily') {
        const today = this.getTodayBangkok();
        query = query.gte('created_at', today);
      } else if (missionType === 'weekly') {
        const monday = this.getThisWeekMonday();
        query = query.gte('created_at', monday);
      }

      const { count, error } = await query;

      if (error) {
        logger.error('Failed to count zone check-ins:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error('Error counting zone check-ins:', error);
      return 0;
    }
  }

  /**
   * Get unique zones visited
   */
  private async getUniqueZonesVisited(userId: string, missionType?: string): Promise<number> {
    try {
      let query = supabase
        .from('check_ins')
        .select('establishment:establishments!inner(zone)')
        .eq('user_id', userId)
        .eq('verified', true);

      // Apply time filter for weekly missions
      if (missionType === 'weekly') {
        const monday = this.getThisWeekMonday();
        query = query.gte('created_at', monday);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to count unique zones:', error);
        return 0;
      }

      // Count unique zones
      const uniqueZones = new Set(data?.map((ci: any) => ci.establishment?.zone).filter(Boolean) || []);
      return uniqueZones.size;
    } catch (error) {
      logger.error('Error counting unique zones:', error);
      return 0;
    }
  }

  /**
   * Get review count for user
   */
  private async getReviewCount(userId: string, missionType: string): Promise<number> {
    try {
      let query = supabase
        .from('comments')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      // Apply time filter for daily/weekly missions
      // FIXED: Now uses Bangkok timezone to match cron job reset times
      if (missionType === 'daily') {
        const today = this.getTodayBangkok();
        query = query.gte('created_at', today);
      } else if (missionType === 'weekly') {
        const monday = this.getThisWeekMonday();
        query = query.gte('created_at', monday);
      }

      const { count, error } = await query;

      if (error) {
        logger.error('Failed to count reviews:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      logger.error('Error counting reviews:', error);
      return 0;
    }
  }

  /**
   * Get quality review count (min length + optional photo)
   */
  private async getQualityReviewCount(userId: string, minLength: number, requirePhoto: boolean, missionType: string): Promise<number> {
    try {
      let query = supabase
        .from('comments')
        .select('id, comment', { count: 'exact' })
        .eq('user_id', userId);

      // Apply time filter
      if (missionType === 'daily') {
        const today = this.getTodayBangkok();
        query = query.gte('created_at', today);
      } else if (missionType === 'weekly') {
        const monday = this.getThisWeekMonday();
        query = query.gte('created_at', monday);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to count quality reviews:', error);
        return 0;
      }

      // Phase 3: Get all review IDs that have photos (single query, efficient)
      let reviewPhotosSet = new Set<string>();
      if (requirePhoto) {
        const { data: photosData } = await supabase
          .from('user_photo_uploads')
          .select('entity_id')
          .eq('user_id', userId)
          .eq('entity_type', 'review')
          .not('entity_id', 'is', null);

        reviewPhotosSet = new Set((photosData || []).map(p => p.entity_id));
      }

      // Filter by length and photo requirement
      let count = 0;
      for (const review of data || []) {
        const meetsLength = (review.comment?.length || 0) >= minLength;
        const hasPhoto = requirePhoto ? reviewPhotosSet.has(review.id) : true;
        if (meetsLength && hasPhoto) {
          count++;
        }
      }

      return count;
    } catch (error) {
      logger.error('Error counting quality reviews:', error);
      return 0;
    }
  }

  /**
   * Get reviews with photos count
   * Phase 3: Implemented - queries user_photo_uploads table
   */
  private async getReviewsWithPhotosCount(userId: string, missionType: string): Promise<number> {
    try {
      let query = supabase
        .from('user_photo_uploads')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('entity_type', 'review');

      // Apply time filter based on mission type
      if (missionType === 'daily') {
        const today = this.getTodayBangkok();
        query = query.gte('uploaded_at', today);
      } else if (missionType === 'weekly') {
        const monday = this.getThisWeekMonday();
        query = query.gte('uploaded_at', monday);
      }

      const { count, error } = await query;

      if (error) {
        logger.error('Failed to count reviews with photos:', error);
        return 0;
      }

      logger.debug('Reviews with photos count:', { userId, count, missionType });
      return count || 0;
    } catch (error) {
      logger.error('Error counting reviews with photos:', error);
      return 0;
    }
  }

  /**
   * Get reviews with minimum length count
   */
  private async getReviewsMinLengthCount(userId: string, minLength: number, missionType: string): Promise<number> {
    try {
      let query = supabase
        .from('comments')
        .select('id, comment', { count: 'exact' })
        .eq('user_id', userId);

      // Apply time filter
      if (missionType === 'daily') {
        const today = this.getTodayBangkok();
        query = query.gte('created_at', today);
      } else if (missionType === 'weekly') {
        const monday = this.getThisWeekMonday();
        query = query.gte('created_at', monday);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to count min length reviews:', error);
        return 0;
      }

      // Filter by length
      const count = (data || []).filter(r => (r.comment?.length || 0) >= minLength).length;
      return count;
    } catch (error) {
      logger.error('Error counting min length reviews:', error);
      return 0;
    }
  }

  // ========================================
  // RESET MECHANISMS
  // ========================================

  /**
   * Reset all daily missions progress (called by cron at midnight)
   */
  async resetDailyMissions(): Promise<void> {
    try {
      logger.info('Resetting daily missions...');

      // Call PostgreSQL RPC function
      const { error } = await supabase.rpc('reset_missions', {
        p_mission_type: 'daily'
      });

      if (error) {
        logger.error('Failed to reset daily missions:', error);
      } else {
        logger.info('Daily missions reset successfully');
      }
    } catch (error) {
      logger.error('Error resetting daily missions:', error);
    }
  }

  /**
   * Reset all weekly missions progress (called by cron on Monday midnight)
   */
  async resetWeeklyMissions(): Promise<void> {
    try {
      logger.info('Resetting weekly missions...');

      // Call PostgreSQL RPC function
      const { error } = await supabase.rpc('reset_missions', {
        p_mission_type: 'weekly'
      });

      if (error) {
        logger.error('Failed to reset weekly missions:', error);
      } else {
        logger.info('Weekly missions reset successfully');
      }
    } catch (error) {
      logger.error('Error resetting weekly missions:', error);
    }
  }

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  /**
   * Get today's date at 00:00:00 in Asia/Bangkok timezone (UTC+7)
   * Returns ISO string for database queries (e.g., "2025-01-21T00:00:00.000Z")
   * FIXED: Now uses Bangkok timezone to match cron jobs
   */
  private getTodayBangkok(): string {
    // Thailand timezone: UTC+7 (420 minutes offset)
    const THAILAND_OFFSET_MS = 7 * 60 * 60 * 1000;

    // Get current UTC time
    const now = new Date();

    // Convert to Thailand time
    const thailandNow = new Date(now.getTime() + THAILAND_OFFSET_MS);

    // Get today at 00:00:00 Thailand time
    const todayThailand = new Date(thailandNow.getTime());
    todayThailand.setUTCHours(0, 0, 0, 0);

    // Convert back to UTC
    const todayUTC = new Date(todayThailand.getTime() - THAILAND_OFFSET_MS);

    return todayUTC.toISOString();
  }

  /**
   * Get this week's Monday at 00:00:00 in Asia/Bangkok timezone (UTC+7)
   * FIXED: Now uses Bangkok timezone to match cron jobs (was using server timezone)
   */
  private getThisWeekMonday(): string {
    // Thailand timezone: UTC+7 (420 minutes offset)
    const THAILAND_OFFSET_MS = 7 * 60 * 60 * 1000; // 7 hours in milliseconds

    // Get current UTC time
    const now = new Date();

    // Convert to Thailand time by adding offset
    const thailandNow = new Date(now.getTime() + THAILAND_OFFSET_MS);

    // Calculate this week's Monday in Thailand timezone
    // Use UTC methods since we already applied Thailand offset
    const dayOfWeek = thailandNow.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days since Monday

    // Get Monday at 00:00:00 Thailand time
    const mondayThailand = new Date(thailandNow.getTime());
    mondayThailand.setUTCDate(thailandNow.getUTCDate() - diff);
    mondayThailand.setUTCHours(0, 0, 0, 0);

    // Convert back to UTC for database storage
    // Subtract Thailand offset to get UTC equivalent of "Monday 00:00 Bangkok time"
    const mondayUTC = new Date(mondayThailand.getTime() - THAILAND_OFFSET_MS);

    return mondayUTC.toISOString();
  }
}

// ========================================
// EXPORT SINGLETON INSTANCE
// ========================================

export const missionTrackingService = new MissionTrackingService();
