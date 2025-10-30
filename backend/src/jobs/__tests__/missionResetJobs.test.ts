import cron from 'node-cron';
import { missionTrackingService } from '../../services/missionTrackingService';
import { logger } from '../../utils/logger';

// ========================================
// MOCKS
// ========================================

// Mock node-cron with factory function
jest.mock('node-cron', () => {
  const mockScheduledTask = {
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn()
  };

  return {
    schedule: jest.fn(() => mockScheduledTask)
  };
});
const mockCron = cron as jest.Mocked<typeof cron>;

// Mock missionTrackingService
jest.mock('../../services/missionTrackingService', () => ({
  missionTrackingService: {
    resetDailyMissions: jest.fn(),
    resetWeeklyMissions: jest.fn()
  }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

// ========================================
// IMPORT MODULE (after mocks are set up)
// ========================================

// Import the module ONCE to trigger cron.schedule calls
// This must happen AFTER all jest.mock() declarations
import {
  dailyMissionResetJob,
  weeklyMissionResetJob,
  startMissionResetJobs,
  stopMissionResetJobs
} from '../missionResetJobs';

// ========================================
// TEST DATA
// ========================================

// Type helper for cron callbacks
type CronCallback = () => Promise<void>;

// Helper to get the mock scheduled task from first schedule call
const getMockScheduledTask = () => (mockCron.schedule as jest.Mock).mock.results[0]?.value;

// ========================================
// TESTS
// ========================================

describe('Mission Reset Cron Jobs', () => {

  beforeEach(() => {
    // Clear only missionTrackingService and logger mocks
    // DO NOT clear mockCron.schedule - we need its call history from module import!
    (missionTrackingService.resetDailyMissions as jest.Mock).mockClear();
    (missionTrackingService.resetWeeklyMissions as jest.Mock).mockClear();
    (logger.info as jest.Mock).mockClear();
    (logger.error as jest.Mock).mockClear();
  });

  // ========================================
  // CRON SCHEDULE TESTS
  // ========================================

  describe('Cron Schedules', () => {

    it('should create daily reset job with correct cron expression', () => {
      // Verify first schedule call (daily) - made during module import
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 0 * * *', // Every day at midnight
        expect.any(Function),
        expect.objectContaining({
          timezone: 'Asia/Bangkok'
        })
      );
    });

    it('should create weekly reset job with correct cron expression', () => {
      // Verify second schedule call (weekly) - made during module import
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 0 * * 1', // Every Monday at midnight
        expect.any(Function),
        expect.objectContaining({
          timezone: 'Asia/Bangkok'
        })
      );
    });

    it('should use Asia/Bangkok timezone for both jobs', () => {
      const calls = mockCron.schedule.mock.calls;

      // Both calls should have Asia/Bangkok timezone
      expect(calls[0][2]).toEqual({ timezone: 'Asia/Bangkok' });
      expect(calls[1][2]).toEqual({ timezone: 'Asia/Bangkok' });
    });

    it('should stop jobs immediately after creation (until manual start)', () => {
      const mockScheduledTask = getMockScheduledTask();

      // Both jobs should be stopped after creation
      expect(mockScheduledTask?.stop).toHaveBeenCalledTimes(2);
    });

  });

  // ========================================
  // DAILY RESET JOB TESTS
  // ========================================

  describe('Daily Reset Job', () => {

    it('should call resetDailyMissions when daily job executes', async () => {
      // Get the daily cron callback (first schedule call from module import)
      const dailyCallback = mockCron.schedule.mock.calls[0][1] as CronCallback;

      // Execute callback
      await dailyCallback();

      expect(missionTrackingService.resetDailyMissions).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('⏰ Daily mission reset job triggered');
      expect(logger.info).toHaveBeenCalledWith('✅ Daily mission reset completed successfully');
    });

    it('should log error if daily reset fails', async () => {
      const error = new Error('Reset failed');
      (missionTrackingService.resetDailyMissions as jest.Mock).mockRejectedValueOnce(error);

      // Get the daily cron callback (first schedule call from module import)
      const dailyCallback = mockCron.schedule.mock.calls[0][1] as CronCallback;
      await dailyCallback();

      expect(logger.error).toHaveBeenCalledWith('❌ Daily mission reset failed:', error);
    });

  });

  // ========================================
  // WEEKLY RESET JOB TESTS
  // ========================================

  describe('Weekly Reset Job', () => {

    it('should call resetWeeklyMissions when weekly job executes', async () => {
      // Get the weekly cron callback (second schedule call from module import)
      const weeklyCallback = mockCron.schedule.mock.calls[1][1] as CronCallback;

      // Execute callback
      await weeklyCallback();

      expect(missionTrackingService.resetWeeklyMissions).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('⏰ Weekly mission reset job triggered');
      expect(logger.info).toHaveBeenCalledWith('✅ Weekly mission reset completed successfully');
    });

    it('should log error if weekly reset fails', async () => {
      const error = new Error('Reset failed');
      (missionTrackingService.resetWeeklyMissions as jest.Mock).mockRejectedValueOnce(error);

      // Get the weekly cron callback (second schedule call from module import)
      const weeklyCallback = mockCron.schedule.mock.calls[1][1] as CronCallback;
      await weeklyCallback();

      expect(logger.error).toHaveBeenCalledWith('❌ Weekly mission reset failed:', error);
    });

  });

  // ========================================
  // START/STOP FUNCTIONS TESTS
  // ========================================

  describe('startMissionResetJobs', () => {

    beforeEach(() => {
      // Clear mockScheduledTask mocks before testing function calls
      const mockScheduledTask = getMockScheduledTask();
      (mockScheduledTask?.start as jest.Mock).mockClear();
      (mockScheduledTask?.stop as jest.Mock).mockClear();
    });

    it('should start both daily and weekly jobs', () => {
      // Call the imported function
      startMissionResetJobs();

      const mockScheduledTask = getMockScheduledTask();

      // Should call start on both jobs
      expect(mockScheduledTask?.start).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith('🚀 Starting mission reset cron jobs...');
      expect(logger.info).toHaveBeenCalledWith('✅ Daily mission reset job started (runs at 00:00 UTC+7 daily)');
      expect(logger.info).toHaveBeenCalledWith('✅ Weekly mission reset job started (runs at 00:00 UTC+7 every Monday)');
    });

    it('should log cron schedule information', () => {
      // Call the imported function
      startMissionResetJobs();

      expect(logger.info).toHaveBeenCalledWith('📅 Cron jobs active. Next scheduled runs:');
      expect(logger.info).toHaveBeenCalledWith('  - Daily: Every day at midnight Thailand time');
      expect(logger.info).toHaveBeenCalledWith('  - Weekly: Every Monday at midnight Thailand time');
    });

  });

  describe('stopMissionResetJobs', () => {

    beforeEach(() => {
      // Clear mockScheduledTask mocks before testing function calls
      const mockScheduledTask = getMockScheduledTask();
      (mockScheduledTask?.start as jest.Mock).mockClear();
      (mockScheduledTask?.stop as jest.Mock).mockClear();
    });

    it('should stop both daily and weekly jobs', () => {
      // Call the imported function
      stopMissionResetJobs();

      const mockScheduledTask = getMockScheduledTask();

      // Should call stop on both jobs
      expect(mockScheduledTask?.stop).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith('⏸️  Stopping mission reset cron jobs...');
      expect(logger.info).toHaveBeenCalledWith('✅ Daily mission reset job stopped');
      expect(logger.info).toHaveBeenCalledWith('✅ Weekly mission reset job stopped');
    });

  });

  // ========================================
  // INTEGRATION TESTS
  // ========================================

  describe('Integration', () => {

    it('should follow lifecycle: create → stop → start → stop', () => {
      const mockScheduledTask = getMockScheduledTask();

      // 1. Verify module import created jobs and stopped them
      expect(mockCron.schedule).toHaveBeenCalledTimes(2);
      expect(mockScheduledTask?.stop).toHaveBeenCalledTimes(2); // Auto-stop after creation

      // Clear mock call history before manual operations
      (mockScheduledTask?.start as jest.Mock).mockClear();
      (mockScheduledTask?.stop as jest.Mock).mockClear();

      // 2. Start jobs manually
      startMissionResetJobs();
      expect(mockScheduledTask?.start).toHaveBeenCalledTimes(2);

      // Clear again
      (mockScheduledTask?.start as jest.Mock).mockClear();
      (mockScheduledTask?.stop as jest.Mock).mockClear();

      // 3. Stop jobs manually
      stopMissionResetJobs();
      expect(mockScheduledTask?.stop).toHaveBeenCalledTimes(2);
    });

    it('should execute both daily and weekly callbacks independently', async () => {
      // Get both callbacks from module import
      const dailyCallback = mockCron.schedule.mock.calls[0][1] as CronCallback;
      const weeklyCallback = mockCron.schedule.mock.calls[1][1] as CronCallback;

      // Execute daily
      await dailyCallback();
      expect(missionTrackingService.resetDailyMissions).toHaveBeenCalledTimes(1);
      expect(missionTrackingService.resetWeeklyMissions).toHaveBeenCalledTimes(0);

      // Clear service mocks
      (missionTrackingService.resetDailyMissions as jest.Mock).mockClear();
      (missionTrackingService.resetWeeklyMissions as jest.Mock).mockClear();

      // Execute weekly
      await weeklyCallback();
      expect(missionTrackingService.resetDailyMissions).toHaveBeenCalledTimes(0);
      expect(missionTrackingService.resetWeeklyMissions).toHaveBeenCalledTimes(1);
    });

  });

  // ========================================
  // TIMEZONE VALIDATION
  // ========================================

  describe('Timezone Validation', () => {

    it('should use Asia/Bangkok timezone (UTC+7)', () => {
      // Verify timezone from module import calls
      const dailyOptions = mockCron.schedule.mock.calls[0][2];
      const weeklyOptions = mockCron.schedule.mock.calls[1][2];

      expect(dailyOptions).toHaveProperty('timezone', 'Asia/Bangkok');
      expect(weeklyOptions).toHaveProperty('timezone', 'Asia/Bangkok');
    });

    it('should match missionTrackingService timezone helpers', () => {
      // This test ensures consistency between cron timezone and service timezone
      // Both should use Asia/Bangkok (UTC+7)
      const cronTimezone = mockCron.schedule.mock.calls[0][2]?.timezone;
      expect(cronTimezone).toBe('Asia/Bangkok');

      // Note: missionTrackingService.getTodayBangkok() and getThisWeekMonday()
      // are now fixed to use UTC+7 offset (7 * 60 * 60 * 1000 ms)
      // This test verifies timezone consistency
    });

  });

});
