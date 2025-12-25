/**
 * Service responsible for tracking user mission progress
 * Listens to events (check-ins, reviews, votes, follows) and updates mission progress automatically
 */
declare class MissionTrackingService {
    /**
     * Called when user creates a check-in
     * Updates missions: Explorer, Weekly Explorer, Grand Tour, Zone Master, Event missions
     */
    onCheckIn(userId: string, establishmentId: string, zone: string, verified: boolean): Promise<void>;
    /**
     * Called when user creates a review
     * Updates missions: Daily Reviewer, Quality Reviewer, Reviewer Path, Weekly Contributor
     */
    onReviewCreated(userId: string, reviewId: string, reviewLength: number, hasPhotos: boolean): Promise<void>;
    /**
     * Called when user votes on a review (helpful)
     * Updates missions: Helpful Community Member
     */
    onVoteCast(userId: string, reviewId: string, voteType: string): Promise<void>;
    /**
     * Called when user follows another user
     * Updates missions: Social Networker, Social Butterfly
     */
    onFollowAction(followerId: string, followingId: string): Promise<void>;
    /**
     * Called when user receives helpful vote on their review
     * Updates missions: Helpful Week, Social Butterfly (receive_helpful_votes)
     */
    onHelpfulVoteReceived(reviewAuthorId: string, reviewId: string): Promise<void>;
    /**
     * Called when user uploads a photo
     * Updates missions: Photo Hunter, Photo Marathon
     * NOTE: This will be implemented in Phase 3 (Photo Tracking Infrastructure)
     */
    onPhotoUploaded(userId: string, photoUrl: string, entityType: string, entityId: string | null): Promise<void>;
    /**
     * Process check-in related missions
     */
    private processCheckInMission;
    /**
     * Process review related missions
     */
    private processReviewMission;
    /**
     * Update mission progress by increment
     */
    updateMissionProgress(userId: string, missionId: string, increment: number): Promise<void>;
    /**
     * Set mission progress to specific value (for counted missions)
     * FIXED: Now uses atomic RPC function to prevent race conditions
     */
    setMissionProgress(userId: string, missionId: string, progress: number): Promise<void>;
    /**
     * Handle mission completion (unlock next quest step)
     * NOTE: XP + badge are already awarded by RPC functions (update_mission_progress or set_mission_progress_absolute)
     */
    private handleMissionCompletion;
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
    private unlockNextQuestStep;
    /**
     * Get unique check-in count for user (within time period if daily/weekly)
     */
    private getUniqueCheckInCount;
    /**
     * Get check-in count in specific zone
     */
    private getZoneCheckInCount;
    /**
     * Get unique zones visited
     */
    private getUniqueZonesVisited;
    /**
     * Get review count for user
     */
    private getReviewCount;
    /**
     * Get quality review count (min length + optional photo)
     */
    private getQualityReviewCount;
    /**
     * Get reviews with photos count
     * Phase 3: Implemented - queries user_photo_uploads table
     */
    private getReviewsWithPhotosCount;
    /**
     * Get reviews with minimum length count
     */
    private getReviewsMinLengthCount;
    /**
     * Reset all daily missions progress (called by cron at midnight)
     */
    resetDailyMissions(): Promise<void>;
    /**
     * Reset all weekly missions progress (called by cron on Monday midnight)
     */
    resetWeeklyMissions(): Promise<void>;
    /**
     * Get today's date at 00:00:00 in Asia/Bangkok timezone (UTC+7)
     * Returns ISO string for database queries (e.g., "2025-01-21T00:00:00.000Z")
     * FIXED: Now uses Bangkok timezone to match cron jobs
     */
    private getTodayBangkok;
    /**
     * Get this week's Monday at 00:00:00 in Asia/Bangkok timezone (UTC+7)
     * FIXED: Now uses Bangkok timezone to match cron jobs (was using server timezone)
     */
    private getThisWeekMonday;
}
export declare const missionTrackingService: MissionTrackingService;
export {};
//# sourceMappingURL=missionTrackingService.d.ts.map