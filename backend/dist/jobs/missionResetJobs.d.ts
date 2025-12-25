/**
 * Daily Mission Reset Job
 * Runs every day at midnight (00:00) UTC+7 (Thailand time)
 * Cron expression: '0 0 * * *'
 *
 * Resets all daily missions:
 * - Explorer (1 check-in)
 * - Daily Reviewer (1 review)
 * - Quality Reviewer (1 quality review)
 * - Photo Hunter (5 photos) [Phase 3]
 */
export declare const dailyMissionResetJob: import("node-cron").ScheduledTask;
/**
 * Weekly Mission Reset Job
 * Runs every Monday at midnight (00:00) UTC+7 (Thailand time)
 * Cron expression: '0 0 * * 1'
 *
 * Resets all weekly missions:
 * - Weekly Explorer (5 unique check-ins)
 * - Helpful Week (3 helpful votes received)
 * - Weekly Contributor (3 reviews with photos) [Phase 3]
 * - Photo Marathon (25 photos) [Phase 3]
 */
export declare const weeklyMissionResetJob: import("node-cron").ScheduledTask;
/**
 * Start all mission reset cron jobs
 * Called from server.ts on application startup
 */
export declare const startMissionResetJobs: () => void;
/**
 * Stop all mission reset cron jobs
 * Called on graceful server shutdown
 */
export declare const stopMissionResetJobs: () => void;
/**
 * Cron Expression Format:
 *
 *  ┌────────────── second (optional) 0-59
 *  │ ┌──────────── minute 0-59
 *  │ │ ┌────────── hour 0-23
 *  │ │ │ ┌──────── day of month 1-31
 *  │ │ │ │ ┌────── month 1-12 (or names)
 *  │ │ │ │ │ ┌──── day of week 0-7 (0 or 7 is Sunday, or names)
 *  │ │ │ │ │ │
 *  * * * * * *
 *
 * Examples:
 * - '0 0 * * *'     → Every day at midnight
 * - '0 0 * * 1'     → Every Monday at midnight
 * - '0 * /6 * * *'  → Every 6 hours (remove space in actual use)
 * - '30 14 * * 5'   → Every Friday at 14:30
 * - '0 0 1 * *'     → First day of every month at midnight
 *
 * Timezone: 'Asia/Bangkok' (UTC+7)
 */
/**
 * Manual trigger for testing (DO NOT use in production)
 * Only use in development/testing environment
 *
 * Example usage in Node REPL or test script:
 *
 * import { missionTrackingService } from './services/missionTrackingService';
 *
 * // Test daily reset
 * await missionTrackingService.resetDailyMissions();
 *
 * // Test weekly reset
 * await missionTrackingService.resetWeeklyMissions();
 */
//# sourceMappingURL=missionResetJobs.d.ts.map