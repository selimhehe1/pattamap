import cron from 'node-cron';
import { missionTrackingService } from '../services/missionTrackingService';
import { logger } from '../utils/logger';

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
export const dailyMissionResetJob = cron.schedule(
  '0 0 * * *',
  async () => {
    try {
      logger.info('⏰ Daily mission reset job triggered');
      await missionTrackingService.resetDailyMissions();
      logger.info('✅ Daily mission reset completed successfully');
    } catch (error) {
      logger.error('❌ Daily mission reset failed:', error);
    }
  },
  {
    timezone: 'Asia/Bangkok' // UTC+7 (Thailand time)
  }
);

// Stop immediately - will be started manually in server.ts
dailyMissionResetJob.stop();

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
export const weeklyMissionResetJob = cron.schedule(
  '0 0 * * 1',
  async () => {
    try {
      logger.info('⏰ Weekly mission reset job triggered');
      await missionTrackingService.resetWeeklyMissions();
      logger.info('✅ Weekly mission reset completed successfully');
    } catch (error) {
      logger.error('❌ Weekly mission reset failed:', error);
    }
  },
  {
    timezone: 'Asia/Bangkok' // UTC+7 (Thailand time)
  }
);

// Stop immediately - will be started manually in server.ts
weeklyMissionResetJob.stop();

/**
 * Start all mission reset cron jobs
 * Called from server.ts on application startup
 */
export const startMissionResetJobs = (): void => {
  logger.info('🚀 Starting mission reset cron jobs...');

  dailyMissionResetJob.start();
  logger.info('✅ Daily mission reset job started (runs at 00:00 UTC+7 daily)');

  weeklyMissionResetJob.start();
  logger.info('✅ Weekly mission reset job started (runs at 00:00 UTC+7 every Monday)');

  logger.info('📅 Cron jobs active. Next scheduled runs:');
  logger.info(`  - Daily: Every day at midnight Thailand time`);
  logger.info(`  - Weekly: Every Monday at midnight Thailand time`);
};

/**
 * Stop all mission reset cron jobs
 * Called on graceful server shutdown
 */
export const stopMissionResetJobs = (): void => {
  logger.info('⏸️  Stopping mission reset cron jobs...');

  dailyMissionResetJob.stop();
  logger.info('✅ Daily mission reset job stopped');

  weeklyMissionResetJob.stop();
  logger.info('✅ Weekly mission reset job stopped');
};

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
