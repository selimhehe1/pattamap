"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopMissionResetJobs = exports.startMissionResetJobs = exports.weeklyMissionResetJob = exports.dailyMissionResetJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const missionTrackingService_1 = require("../services/missionTrackingService");
const logger_1 = require("../utils/logger");
// ========================================
// MISSION RESET CRON JOBS
// ========================================
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
exports.dailyMissionResetJob = node_cron_1.default.schedule('0 0 * * *', async () => {
    try {
        logger_1.logger.info('⏰ Daily mission reset job triggered');
        await missionTrackingService_1.missionTrackingService.resetDailyMissions();
        logger_1.logger.info('✅ Daily mission reset completed successfully');
    }
    catch (error) {
        logger_1.logger.error('❌ Daily mission reset failed:', error);
    }
}, {
    timezone: 'Asia/Bangkok' // UTC+7 (Thailand time)
});
// Stop immediately - will be started manually in server.ts
exports.dailyMissionResetJob.stop();
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
exports.weeklyMissionResetJob = node_cron_1.default.schedule('0 0 * * 1', async () => {
    try {
        logger_1.logger.info('⏰ Weekly mission reset job triggered');
        await missionTrackingService_1.missionTrackingService.resetWeeklyMissions();
        logger_1.logger.info('✅ Weekly mission reset completed successfully');
    }
    catch (error) {
        logger_1.logger.error('❌ Weekly mission reset failed:', error);
    }
}, {
    timezone: 'Asia/Bangkok' // UTC+7 (Thailand time)
});
// Stop immediately - will be started manually in server.ts
exports.weeklyMissionResetJob.stop();
/**
 * Start all mission reset cron jobs
 * Called from server.ts on application startup
 */
const startMissionResetJobs = () => {
    logger_1.logger.info('🚀 Starting mission reset cron jobs...');
    exports.dailyMissionResetJob.start();
    logger_1.logger.info('✅ Daily mission reset job started (runs at 00:00 UTC+7 daily)');
    exports.weeklyMissionResetJob.start();
    logger_1.logger.info('✅ Weekly mission reset job started (runs at 00:00 UTC+7 every Monday)');
    logger_1.logger.info('📅 Cron jobs active. Next scheduled runs:');
    logger_1.logger.info(`  - Daily: Every day at midnight Thailand time`);
    logger_1.logger.info(`  - Weekly: Every Monday at midnight Thailand time`);
};
exports.startMissionResetJobs = startMissionResetJobs;
/**
 * Stop all mission reset cron jobs
 * Called on graceful server shutdown
 */
const stopMissionResetJobs = () => {
    logger_1.logger.info('⏸️  Stopping mission reset cron jobs...');
    exports.dailyMissionResetJob.stop();
    logger_1.logger.info('✅ Daily mission reset job stopped');
    exports.weeklyMissionResetJob.stop();
    logger_1.logger.info('✅ Weekly mission reset job stopped');
};
exports.stopMissionResetJobs = stopMissionResetJobs;
// ========================================
// CRON SCHEDULE REFERENCE
// ========================================
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
// ========================================
// MANUAL TESTING
// ========================================
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
//# sourceMappingURL=missionResetJobs.js.map