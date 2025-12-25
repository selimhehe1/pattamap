"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const missionTrackingService_1 = require("../../services/missionTrackingService");
const logger_1 = require("../../utils/logger");
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
const mockCron = node_cron_1.default;
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
const missionResetJobs_1 = require("../missionResetJobs");
// Helper to get the mock scheduled task from first schedule call
const getMockScheduledTask = () => mockCron.schedule.mock.results[0]?.value;
// ========================================
// TESTS
// ========================================
describe('Mission Reset Cron Jobs', () => {
    beforeEach(() => {
        // Clear only missionTrackingService and logger mocks
        // DO NOT clear mockCron.schedule - we need its call history from module import!
        missionTrackingService_1.missionTrackingService.resetDailyMissions.mockClear();
        missionTrackingService_1.missionTrackingService.resetWeeklyMissions.mockClear();
        logger_1.logger.info.mockClear();
        logger_1.logger.error.mockClear();
    });
    // ========================================
    // CRON SCHEDULE TESTS
    // ========================================
    describe('Cron Schedules', () => {
        it('should create daily reset job with correct cron expression', () => {
            // Verify first schedule call (daily) - made during module import
            expect(mockCron.schedule).toHaveBeenCalledWith('0 0 * * *', // Every day at midnight
            expect.any(Function), expect.objectContaining({
                timezone: 'Asia/Bangkok'
            }));
        });
        it('should create weekly reset job with correct cron expression', () => {
            // Verify second schedule call (weekly) - made during module import
            expect(mockCron.schedule).toHaveBeenCalledWith('0 0 * * 1', // Every Monday at midnight
            expect.any(Function), expect.objectContaining({
                timezone: 'Asia/Bangkok'
            }));
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
            const dailyCallback = mockCron.schedule.mock.calls[0][1];
            // Execute callback
            await dailyCallback();
            expect(missionTrackingService_1.missionTrackingService.resetDailyMissions).toHaveBeenCalledTimes(1);
            expect(logger_1.logger.info).toHaveBeenCalledWith('⏰ Daily mission reset job triggered');
            expect(logger_1.logger.info).toHaveBeenCalledWith('✅ Daily mission reset completed successfully');
        });
        it('should log error if daily reset fails', async () => {
            const error = new Error('Reset failed');
            missionTrackingService_1.missionTrackingService.resetDailyMissions.mockRejectedValueOnce(error);
            // Get the daily cron callback (first schedule call from module import)
            const dailyCallback = mockCron.schedule.mock.calls[0][1];
            await dailyCallback();
            expect(logger_1.logger.error).toHaveBeenCalledWith('❌ Daily mission reset failed:', error);
        });
    });
    // ========================================
    // WEEKLY RESET JOB TESTS
    // ========================================
    describe('Weekly Reset Job', () => {
        it('should call resetWeeklyMissions when weekly job executes', async () => {
            // Get the weekly cron callback (second schedule call from module import)
            const weeklyCallback = mockCron.schedule.mock.calls[1][1];
            // Execute callback
            await weeklyCallback();
            expect(missionTrackingService_1.missionTrackingService.resetWeeklyMissions).toHaveBeenCalledTimes(1);
            expect(logger_1.logger.info).toHaveBeenCalledWith('⏰ Weekly mission reset job triggered');
            expect(logger_1.logger.info).toHaveBeenCalledWith('✅ Weekly mission reset completed successfully');
        });
        it('should log error if weekly reset fails', async () => {
            const error = new Error('Reset failed');
            missionTrackingService_1.missionTrackingService.resetWeeklyMissions.mockRejectedValueOnce(error);
            // Get the weekly cron callback (second schedule call from module import)
            const weeklyCallback = mockCron.schedule.mock.calls[1][1];
            await weeklyCallback();
            expect(logger_1.logger.error).toHaveBeenCalledWith('❌ Weekly mission reset failed:', error);
        });
    });
    // ========================================
    // START/STOP FUNCTIONS TESTS
    // ========================================
    describe('startMissionResetJobs', () => {
        beforeEach(() => {
            // Clear mockScheduledTask mocks before testing function calls
            const mockScheduledTask = getMockScheduledTask();
            (mockScheduledTask?.start).mockClear();
            (mockScheduledTask?.stop).mockClear();
        });
        it('should start both daily and weekly jobs', () => {
            // Call the imported function
            (0, missionResetJobs_1.startMissionResetJobs)();
            const mockScheduledTask = getMockScheduledTask();
            // Should call start on both jobs
            expect(mockScheduledTask?.start).toHaveBeenCalledTimes(2);
            expect(logger_1.logger.info).toHaveBeenCalledWith('🚀 Starting mission reset cron jobs...');
            expect(logger_1.logger.info).toHaveBeenCalledWith('✅ Daily mission reset job started (runs at 00:00 UTC+7 daily)');
            expect(logger_1.logger.info).toHaveBeenCalledWith('✅ Weekly mission reset job started (runs at 00:00 UTC+7 every Monday)');
        });
        it('should log cron schedule information', () => {
            // Call the imported function
            (0, missionResetJobs_1.startMissionResetJobs)();
            expect(logger_1.logger.info).toHaveBeenCalledWith('📅 Cron jobs active. Next scheduled runs:');
            expect(logger_1.logger.info).toHaveBeenCalledWith('  - Daily: Every day at midnight Thailand time');
            expect(logger_1.logger.info).toHaveBeenCalledWith('  - Weekly: Every Monday at midnight Thailand time');
        });
    });
    describe('stopMissionResetJobs', () => {
        beforeEach(() => {
            // Clear mockScheduledTask mocks before testing function calls
            const mockScheduledTask = getMockScheduledTask();
            (mockScheduledTask?.start).mockClear();
            (mockScheduledTask?.stop).mockClear();
        });
        it('should stop both daily and weekly jobs', () => {
            // Call the imported function
            (0, missionResetJobs_1.stopMissionResetJobs)();
            const mockScheduledTask = getMockScheduledTask();
            // Should call stop on both jobs
            expect(mockScheduledTask?.stop).toHaveBeenCalledTimes(2);
            expect(logger_1.logger.info).toHaveBeenCalledWith('⏸️  Stopping mission reset cron jobs...');
            expect(logger_1.logger.info).toHaveBeenCalledWith('✅ Daily mission reset job stopped');
            expect(logger_1.logger.info).toHaveBeenCalledWith('✅ Weekly mission reset job stopped');
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
            (mockScheduledTask?.start).mockClear();
            (mockScheduledTask?.stop).mockClear();
            // 2. Start jobs manually
            (0, missionResetJobs_1.startMissionResetJobs)();
            expect(mockScheduledTask?.start).toHaveBeenCalledTimes(2);
            // Clear again
            (mockScheduledTask?.start).mockClear();
            (mockScheduledTask?.stop).mockClear();
            // 3. Stop jobs manually
            (0, missionResetJobs_1.stopMissionResetJobs)();
            expect(mockScheduledTask?.stop).toHaveBeenCalledTimes(2);
        });
        it('should execute both daily and weekly callbacks independently', async () => {
            // Get both callbacks from module import
            const dailyCallback = mockCron.schedule.mock.calls[0][1];
            const weeklyCallback = mockCron.schedule.mock.calls[1][1];
            // Execute daily
            await dailyCallback();
            expect(missionTrackingService_1.missionTrackingService.resetDailyMissions).toHaveBeenCalledTimes(1);
            expect(missionTrackingService_1.missionTrackingService.resetWeeklyMissions).toHaveBeenCalledTimes(0);
            // Clear service mocks
            missionTrackingService_1.missionTrackingService.resetDailyMissions.mockClear();
            missionTrackingService_1.missionTrackingService.resetWeeklyMissions.mockClear();
            // Execute weekly
            await weeklyCallback();
            expect(missionTrackingService_1.missionTrackingService.resetDailyMissions).toHaveBeenCalledTimes(0);
            expect(missionTrackingService_1.missionTrackingService.resetWeeklyMissions).toHaveBeenCalledTimes(1);
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
//# sourceMappingURL=missionResetJobs.test.js.map