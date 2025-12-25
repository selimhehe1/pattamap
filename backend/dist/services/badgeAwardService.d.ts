/**
 * Service responsible for checking badge requirements and awarding badges to users
 */
declare class BadgeAwardService {
    /**
     * Check and award badges to a user based on action type
     * @param userId - User UUID
     * @param actionType - Action that triggered badge check (review_created, check_in, etc.)
     */
    checkAndAwardBadges(userId: string, actionType: string): Promise<string[]>;
    /**
     * Check if a badge is relevant for a given action type
     */
    private isBadgeRelevantForAction;
    /**
     * Check if user meets badge requirements
     */
    private checkBadgeRequirements;
    /**
     * Award a badge to a user
     */
    private awardBadge;
}
export declare const badgeAwardService: BadgeAwardService;
export {};
//# sourceMappingURL=badgeAwardService.d.ts.map