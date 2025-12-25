"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const missionTrackingService_1 = require("../missionTrackingService");
const supabase_1 = require("../../config/supabase");
const logger_1 = require("../../utils/logger");
// ========================================
// MOCKS
// ========================================
// Mock Supabase
jest.mock('../../config/supabase', () => ({
    supabase: {
        from: jest.fn(),
        rpc: jest.fn()
    }
}));
// Mock Logger
jest.mock('../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn()
    }
}));
// ========================================
// TEST DATA
// ========================================
const mockUserId = 'user-123';
const mockEstablishmentId = 'establishment-456';
const mockMissionId = 'mission-789';
const mockReviewId = 'review-101';
const mockZone = 'Walking Street';
const mockDailyMission = {
    id: mockMissionId,
    name: 'Explorer',
    type: 'daily',
    xp_reward: 50,
    requirements: { type: 'check_in', count: 1 },
    is_active: true
};
const mockWeeklyMission = {
    id: 'mission-weekly',
    name: 'Weekly Explorer',
    type: 'weekly',
    xp_reward: 200,
    requirements: { type: 'check_in', count: 5, unique: true },
    is_active: true
};
const mockNarrativeMission = {
    id: 'mission-narrative',
    name: 'Grand Tour: Walking Street',
    type: 'narrative',
    xp_reward: 500,
    requirements: { type: 'check_in_zone', zone: 'Walking Street', quest_id: 'grand-tour', step: 1 },
    is_active: true
};
const mockReviewMission = {
    id: 'mission-review',
    name: 'Daily Reviewer',
    type: 'daily',
    xp_reward: 30,
    requirements: { type: 'write_reviews', count: 1 },
    is_active: true
};
const mockQualityReviewMission = {
    id: 'mission-quality',
    name: 'Quality Reviewer',
    type: 'daily',
    xp_reward: 100,
    requirements: { type: 'write_quality_review', min_length: 100, with_photo: true, count: 1 },
    is_active: true
};
// ========================================
// HELPER FUNCTIONS
// ========================================
const mockSupabaseChain = (returnData, returnError = null) => {
    const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        then: jest.fn((callback) => callback({ data: returnData, error: returnError, count: returnData?.length }))
    };
    return chain;
};
// ========================================
// TEST SUITES
// ========================================
describe('MissionTrackingService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // ========================================
    // EVENT LISTENER TESTS
    // ========================================
    describe('Event Listeners', () => {
        describe('onCheckIn', () => {
            it('should skip mission tracking for unverified check-ins', async () => {
                await missionTrackingService_1.missionTrackingService.onCheckIn(mockUserId, mockEstablishmentId, mockZone, false);
                expect(logger_1.logger.debug).toHaveBeenCalledWith('Check-in not verified, skipping mission tracking');
                expect(supabase_1.supabase.from).not.toHaveBeenCalled();
            });
            it('should fetch active check-in missions on verified check-in', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain([mockDailyMission], null));
                supabase_1.supabase.from = mockFrom;
                const mockRpc = jest.fn().mockResolvedValue({ data: true, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.onCheckIn(mockUserId, mockEstablishmentId, mockZone, true);
                expect(mockFrom).toHaveBeenCalledWith('missions');
                expect(logger_1.logger.debug).toHaveBeenCalledWith('Mission tracking: check-in event', expect.objectContaining({
                    userId: mockUserId,
                    establishmentId: mockEstablishmentId,
                    zone: mockZone
                }));
            });
            it('should handle no active missions gracefully', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain([], null));
                supabase_1.supabase.from = mockFrom;
                await missionTrackingService_1.missionTrackingService.onCheckIn(mockUserId, mockEstablishmentId, mockZone, true);
                expect(logger_1.logger.debug).toHaveBeenCalledWith('No active check-in missions found');
            });
            it('should handle database errors gracefully', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(null, { message: 'DB Error' }));
                supabase_1.supabase.from = mockFrom;
                await missionTrackingService_1.missionTrackingService.onCheckIn(mockUserId, mockEstablishmentId, mockZone, true);
                expect(logger_1.logger.error).toHaveBeenCalledWith('Failed to fetch check-in missions:', expect.any(Object));
            });
        });
        describe('onReviewCreated', () => {
            it('should fetch active review missions', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain([mockReviewMission], null));
                supabase_1.supabase.from = mockFrom;
                await missionTrackingService_1.missionTrackingService.onReviewCreated(mockUserId, mockReviewId, 150, false);
                expect(mockFrom).toHaveBeenCalledWith('missions');
                expect(logger_1.logger.debug).toHaveBeenCalledWith('Mission tracking: review created event', expect.objectContaining({
                    userId: mockUserId,
                    reviewId: mockReviewId,
                    reviewLength: 150,
                    hasPhotos: false
                }));
            });
            it('should handle no active review missions gracefully', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain([], null));
                supabase_1.supabase.from = mockFrom;
                await missionTrackingService_1.missionTrackingService.onReviewCreated(mockUserId, mockReviewId, 150, false);
                expect(logger_1.logger.debug).toHaveBeenCalledWith('No active review missions found');
            });
        });
        describe('onVoteCast', () => {
            it('should skip non-helpful votes', async () => {
                await missionTrackingService_1.missionTrackingService.onVoteCast(mockUserId, mockReviewId, 'not_helpful');
                expect(supabase_1.supabase.from).not.toHaveBeenCalled();
            });
            it('should fetch active vote missions for helpful votes', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain([mockDailyMission], null));
                supabase_1.supabase.from = mockFrom;
                const mockRpc = jest.fn().mockResolvedValue({ data: true, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.onVoteCast(mockUserId, mockReviewId, 'helpful');
                expect(mockFrom).toHaveBeenCalledWith('missions');
                expect(logger_1.logger.debug).toHaveBeenCalledWith('Mission tracking: vote cast event', expect.any(Object));
            });
        });
        describe('onFollowAction', () => {
            it('should track follow missions for both follower and followed user', async () => {
                const mockFollowMissions = [
                    { id: 'mission-follow-1', requirements: { type: 'follow_users' }, is_active: true },
                    { id: 'mission-follow-2', requirements: { type: 'gain_followers' }, is_active: true }
                ];
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockFollowMissions, null));
                supabase_1.supabase.from = mockFrom;
                const mockRpc = jest.fn().mockResolvedValue({ data: true, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.onFollowAction('follower-id', 'following-id');
                expect(mockFrom).toHaveBeenCalledWith('missions');
                expect(logger_1.logger.debug).toHaveBeenCalledWith('Mission tracking: follow action event', expect.any(Object));
            });
        });
        describe('onHelpfulVoteReceived', () => {
            it('should track helpful vote received missions', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain([mockDailyMission], null));
                supabase_1.supabase.from = mockFrom;
                const mockRpc = jest.fn().mockResolvedValue({ data: true, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.onHelpfulVoteReceived(mockUserId, mockReviewId);
                expect(mockFrom).toHaveBeenCalledWith('missions');
                expect(logger_1.logger.debug).toHaveBeenCalledWith('Mission tracking: helpful vote received event', expect.any(Object));
            });
        });
        describe('onPhotoUploaded', () => {
            it('should track photo upload missions (Phase 3 placeholder)', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain([mockDailyMission], null));
                supabase_1.supabase.from = mockFrom;
                const mockRpc = jest.fn().mockResolvedValue({ data: true, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.onPhotoUploaded(mockUserId, 'photo-url', 'review', mockReviewId);
                expect(mockFrom).toHaveBeenCalledWith('missions');
                expect(logger_1.logger.debug).toHaveBeenCalledWith('Mission tracking: photo uploaded event', expect.any(Object));
            });
        });
    });
    // ========================================
    // MISSION PROCESSING TESTS
    // ========================================
    describe('Mission Processing', () => {
        describe('processCheckInMission', () => {
            it('should process simple check-in mission (non-unique)', async () => {
                const mockMission = {
                    ...mockDailyMission,
                    requirements: { type: 'check_in', count: 3 }
                };
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain([mockMission], null));
                supabase_1.supabase.from = mockFrom;
                const mockRpc = jest.fn().mockResolvedValue({ data: true, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.onCheckIn(mockUserId, mockEstablishmentId, mockZone, true);
                expect(mockRpc).toHaveBeenCalledWith('update_mission_progress', expect.objectContaining({
                    p_increment: 1
                }));
            });
            it('should process unique check-in mission', async () => {
                const mockMission = {
                    ...mockDailyMission,
                    requirements: { type: 'check_in', count: 5, unique: true }
                };
                const mockCheckIns = [
                    { establishment_id: 'est-1' },
                    { establishment_id: 'est-2' }
                ];
                let fromCallCount = 0;
                const mockFrom = jest.fn(() => {
                    fromCallCount++;
                    if (fromCallCount === 1) {
                        // Get missions
                        return mockSupabaseChain([mockMission], null);
                    }
                    else {
                        // Get check-ins for counting
                        return mockSupabaseChain(mockCheckIns, null);
                    }
                });
                supabase_1.supabase.from = mockFrom;
                let rpcCallCount = 0;
                const mockRpc = jest.fn(() => {
                    rpcCallCount++;
                    if (rpcCallCount === 1) {
                        // First RPC call (set progress)
                        return mockSupabaseChain(null, null);
                    }
                    else {
                        // Second RPC call (award XP)
                        return { data: null, error: null };
                    }
                });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.onCheckIn(mockUserId, mockEstablishmentId, mockZone, true);
                // Should count unique establishments and set progress
                expect(mockFrom).toHaveBeenCalledWith('check_ins');
            });
            it('should process zone-specific check-in mission', async () => {
                const mockMission = {
                    ...mockNarrativeMission,
                    requirements: { type: 'check_in_zone', zone: 'Walking Street', count: 3 }
                };
                let fromCallCount = 0;
                const mockFrom = jest.fn(() => {
                    fromCallCount++;
                    if (fromCallCount === 1) {
                        return mockSupabaseChain([mockMission], null);
                    }
                    else {
                        return mockSupabaseChain([], null);
                    }
                });
                supabase_1.supabase.from = mockFrom;
                const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.onCheckIn(mockUserId, mockEstablishmentId, 'Walking Street', true);
                expect(mockFrom).toHaveBeenCalledWith('check_ins');
            });
            it('should process all-zones check-in mission', async () => {
                const mockMission = {
                    ...mockNarrativeMission,
                    requirements: { type: 'check_in_all_zones', count: 9 }
                };
                const mockCheckIns = [
                    { establishment: { zone: 'Zone A' } },
                    { establishment: { zone: 'Zone B' } }
                ];
                let fromCallCount = 0;
                const mockFrom = jest.fn(() => {
                    fromCallCount++;
                    if (fromCallCount === 1) {
                        return mockSupabaseChain([mockMission], null);
                    }
                    else {
                        return mockSupabaseChain(mockCheckIns, null);
                    }
                });
                supabase_1.supabase.from = mockFrom;
                const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.onCheckIn(mockUserId, mockEstablishmentId, mockZone, true);
                expect(mockFrom).toHaveBeenCalledWith('check_ins');
            });
        });
        describe('processReviewMission', () => {
            it('should process simple review mission', async () => {
                const mockMission = {
                    ...mockReviewMission,
                    requirements: { type: 'write_reviews', count: 1 }
                };
                const mockComments = [{}];
                let fromCallCount = 0;
                const mockFrom = jest.fn(() => {
                    fromCallCount++;
                    if (fromCallCount === 1) {
                        return mockSupabaseChain([mockMission], null);
                    }
                    else {
                        return mockSupabaseChain(mockComments, null);
                    }
                });
                supabase_1.supabase.from = mockFrom;
                const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.onReviewCreated(mockUserId, mockReviewId, 50, false);
                expect(mockFrom).toHaveBeenCalledWith('comments');
            });
            it('should process quality review mission with min length', async () => {
                const mockMission = {
                    ...mockQualityReviewMission,
                    requirements: { type: 'write_quality_review', min_length: 100, count: 1 }
                };
                const mockReviews = [
                    { comment: 'A'.repeat(150) }
                ];
                let fromCallCount = 0;
                const mockFrom = jest.fn(() => {
                    fromCallCount++;
                    if (fromCallCount === 1) {
                        return mockSupabaseChain([mockMission], null);
                    }
                    else {
                        return mockSupabaseChain(mockReviews, null);
                    }
                });
                supabase_1.supabase.from = mockFrom;
                const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.onReviewCreated(mockUserId, mockReviewId, 150, false);
                expect(mockFrom).toHaveBeenCalledWith('comments');
            });
            it('should process reviews with photos mission', async () => {
                const mockMission = {
                    ...mockReviewMission,
                    requirements: { type: 'write_reviews', with_photos: true, count: 3 }
                };
                let fromCallCount = 0;
                const mockFrom = jest.fn(() => {
                    fromCallCount++;
                    if (fromCallCount === 1) {
                        return mockSupabaseChain([mockMission], null);
                    }
                    else {
                        return mockSupabaseChain([], null);
                    }
                });
                supabase_1.supabase.from = mockFrom;
                await missionTrackingService_1.missionTrackingService.onReviewCreated(mockUserId, mockReviewId, 100, true);
                // Phase 3 placeholder: getReviewsWithPhotosCount returns 0
                expect(logger_1.logger.debug).toHaveBeenCalled();
            });
            it('should process reviews with min_length in requirements', async () => {
                const mockMission = {
                    ...mockReviewMission,
                    requirements: { type: 'write_reviews', min_length: 50, count: 5 }
                };
                const mockReviews = [
                    { comment: 'A'.repeat(60) }
                ];
                let fromCallCount = 0;
                const mockFrom = jest.fn(() => {
                    fromCallCount++;
                    if (fromCallCount === 1) {
                        return mockSupabaseChain([mockMission], null);
                    }
                    else {
                        return mockSupabaseChain(mockReviews, null);
                    }
                });
                supabase_1.supabase.from = mockFrom;
                const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.onReviewCreated(mockUserId, mockReviewId, 60, false);
                expect(mockFrom).toHaveBeenCalledWith('comments');
            });
            it('should process narrative quest review missions', async () => {
                const mockMission = {
                    ...mockReviewMission,
                    type: 'narrative',
                    requirements: { type: 'write_reviews', quest_id: 'reviewer-path', step: 1, count: 1 }
                };
                const mockReviews = [{}];
                let fromCallCount = 0;
                const mockFrom = jest.fn(() => {
                    fromCallCount++;
                    if (fromCallCount === 1) {
                        return mockSupabaseChain([mockMission], null);
                    }
                    else {
                        return mockSupabaseChain(mockReviews, null);
                    }
                });
                supabase_1.supabase.from = mockFrom;
                const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.onReviewCreated(mockUserId, mockReviewId, 100, false);
                expect(mockFrom).toHaveBeenCalledWith('comments');
            });
        });
    });
    // ========================================
    // PROGRESS TRACKING TESTS
    // ========================================
    describe('Progress Tracking', () => {
        describe('updateMissionProgress', () => {
            it('should call update_mission_progress RPC function', async () => {
                const mockRpc = jest.fn().mockResolvedValue({ data: true, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.updateMissionProgress(mockUserId, mockMissionId, 1);
                expect(mockRpc).toHaveBeenCalledWith('update_mission_progress', {
                    p_user_id: mockUserId,
                    p_mission_id: mockMissionId,
                    p_increment: 1
                });
                expect(logger_1.logger.debug).toHaveBeenCalledWith('Mission progress updated', expect.any(Object));
            });
            it('should handle RPC errors gracefully', async () => {
                const mockRpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'RPC Error' } });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.updateMissionProgress(mockUserId, mockMissionId, 1);
                expect(logger_1.logger.error).toHaveBeenCalledWith('Failed to update mission progress:', expect.any(Object));
            });
            it('should trigger completion handling when mission completed', async () => {
                const mockRpc = jest.fn().mockResolvedValue({ data: true, error: null });
                supabase_1.supabase.rpc = mockRpc;
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockDailyMission, null));
                supabase_1.supabase.from = mockFrom;
                await missionTrackingService_1.missionTrackingService.updateMissionProgress(mockUserId, mockMissionId, 1);
                // Should call handleMissionCompletion which fetches mission details
                expect(mockFrom).toHaveBeenCalledWith('missions');
            });
        });
        describe('setMissionProgress', () => {
            it('should call RPC function to set progress', async () => {
                const mockRpc = jest.fn().mockResolvedValue({ data: true, error: null }); // completed = true
                supabase_1.supabase.rpc = mockRpc;
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockDailyMission, null));
                supabase_1.supabase.from = mockFrom;
                await missionTrackingService_1.missionTrackingService.setMissionProgress(mockUserId, mockMissionId, 5);
                expect(mockRpc).toHaveBeenCalledWith('set_mission_progress_absolute', {
                    p_user_id: mockUserId,
                    p_mission_id: mockMissionId,
                    p_new_progress: 5
                });
                expect(logger_1.logger.debug).toHaveBeenCalledWith('Mission progress set', expect.objectContaining({
                    progress: 5,
                    completed: true
                }));
            });
            it('should handle RPC errors gracefully', async () => {
                const mockRpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'RPC Error' } });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.setMissionProgress(mockUserId, mockMissionId, 5);
                expect(logger_1.logger.error).toHaveBeenCalledWith('Failed to set mission progress:', expect.any(Object));
            });
            it('should trigger completion handling when RPC returns completed=true', async () => {
                const mockRpc = jest.fn().mockResolvedValue({ data: true, error: null }); // completed
                supabase_1.supabase.rpc = mockRpc;
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockDailyMission, null));
                supabase_1.supabase.from = mockFrom;
                await missionTrackingService_1.missionTrackingService.setMissionProgress(mockUserId, mockMissionId, 5);
                // Should call handleMissionCompletion which fetches mission details
                expect(mockFrom).toHaveBeenCalledWith('missions');
            });
        });
    });
    // ========================================
    // COMPLETION DETECTION TESTS
    // ========================================
    describe('Completion Detection', () => {
        describe('handleMissionCompletion', () => {
            it('should log completion and fetch mission details', async () => {
                const mockMissionNoQuest = {
                    ...mockDailyMission,
                    requirements: { type: 'check_in', count: 5 } // No quest_id
                };
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockMissionNoQuest, null));
                supabase_1.supabase.from = mockFrom;
                await missionTrackingService_1.missionTrackingService.handleMissionCompletion(mockUserId, mockMissionId);
                // Should log completion
                expect(logger_1.logger.info).toHaveBeenCalledWith('Mission completed!', expect.objectContaining({
                    userId: mockUserId,
                    missionId: mockMissionId
                }));
                // Should fetch mission details
                expect(mockFrom).toHaveBeenCalledWith('missions');
                // NOTE: XP + badge are already awarded by RPC functions (update_mission_progress or set_mission_progress_absolute)
                // This function ONLY handles quest unlocking, NOT rewards
            });
            it('should unlock next quest step for narrative missions', async () => {
                const mockNarrativeStep1 = {
                    ...mockNarrativeMission,
                    requirements: { quest_id: 'grand-tour', step: 1 }
                };
                let callCount = 0;
                const mockFrom = jest.fn(() => {
                    callCount++;
                    if (callCount === 1) {
                        // Get completed mission
                        return mockSupabaseChain(mockNarrativeStep1, null);
                    }
                    else if (callCount === 2) {
                        // Find next mission (step 2)
                        return mockSupabaseChain({ id: 'mission-step-2', name: 'Grand Tour Step 2' }, null);
                    }
                    else {
                        // Initialize next step progress
                        return mockSupabaseChain(null, null);
                    }
                });
                supabase_1.supabase.from = mockFrom;
                const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.handleMissionCompletion(mockUserId, mockMissionId);
                // Check that next mission was looked up
                expect(mockFrom).toHaveBeenCalledWith('missions');
                expect(logger_1.logger.info).toHaveBeenCalledWith('Next quest step unlocked', expect.objectContaining({
                    step: 2
                }));
            });
        });
    });
    // ========================================
    // RESET MECHANISMS TESTS
    // ========================================
    describe('Reset Mechanisms', () => {
        describe('resetDailyMissions', () => {
            it('should call reset_missions RPC with daily type', async () => {
                const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.resetDailyMissions();
                expect(mockRpc).toHaveBeenCalledWith('reset_missions', {
                    p_mission_type: 'daily'
                });
                expect(logger_1.logger.info).toHaveBeenCalledWith('Resetting daily missions...');
                expect(logger_1.logger.info).toHaveBeenCalledWith('Daily missions reset successfully');
            });
            it('should handle reset errors gracefully', async () => {
                const mockRpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'Reset Error' } });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.resetDailyMissions();
                expect(logger_1.logger.error).toHaveBeenCalledWith('Failed to reset daily missions:', expect.any(Object));
            });
        });
        describe('resetWeeklyMissions', () => {
            it('should call reset_missions RPC with weekly type', async () => {
                const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
                supabase_1.supabase.rpc = mockRpc;
                await missionTrackingService_1.missionTrackingService.resetWeeklyMissions();
                expect(mockRpc).toHaveBeenCalledWith('reset_missions', {
                    p_mission_type: 'weekly'
                });
                expect(logger_1.logger.info).toHaveBeenCalledWith('Resetting weekly missions...');
                expect(logger_1.logger.info).toHaveBeenCalledWith('Weekly missions reset successfully');
            });
        });
    });
    // ========================================
    // COUNTING HELPERS TESTS
    // ========================================
    describe('Counting Helpers', () => {
        describe('getUniqueCheckInCount', () => {
            it('should count unique establishments for daily missions', async () => {
                const mockCheckIns = [
                    { establishment_id: 'est-1' },
                    { establishment_id: 'est-2' },
                    { establishment_id: 'est-1' } // Duplicate
                ];
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockCheckIns, null));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getUniqueCheckInCount(mockUserId, 'daily');
                expect(count).toBe(2); // 2 unique establishments
            });
            it('should count unique establishments for weekly missions', async () => {
                const mockCheckIns = [
                    { establishment_id: 'est-1' },
                    { establishment_id: 'est-2' },
                    { establishment_id: 'est-3' }
                ];
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockCheckIns, null));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getUniqueCheckInCount(mockUserId, 'weekly');
                expect(count).toBe(3);
            });
            it('should return 0 on database error', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(null, { message: 'DB Error' }));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getUniqueCheckInCount(mockUserId, 'daily');
                expect(count).toBe(0);
                expect(logger_1.logger.error).toHaveBeenCalledWith('Failed to count unique check-ins:', expect.any(Object));
            });
        });
        describe('getZoneCheckInCount', () => {
            it('should count check-ins in specific zone for daily missions', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain([], null));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getZoneCheckInCount(mockUserId, mockZone, 'daily');
                expect(mockFrom).toHaveBeenCalledWith('check_ins');
                expect(count).toBe(0);
            });
            it('should count check-ins in zone for narrative missions (all-time)', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain([], null));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getZoneCheckInCount(mockUserId, mockZone, 'narrative');
                expect(count).toBe(0);
            });
            it('should handle errors gracefully', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(null, { message: 'Error' }));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getZoneCheckInCount(mockUserId, mockZone, 'daily');
                expect(count).toBe(0);
                expect(logger_1.logger.error).toHaveBeenCalledWith('Failed to count zone check-ins:', expect.any(Object));
            });
        });
        describe('getUniqueZonesVisited', () => {
            it('should count unique zones for all-time', async () => {
                const mockCheckIns = [
                    { establishment: { zone: 'Walking Street' } },
                    { establishment: { zone: 'Soi 6' } },
                    { establishment: { zone: 'Walking Street' } } // Duplicate
                ];
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockCheckIns, null));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getUniqueZonesVisited(mockUserId);
                expect(count).toBe(2); // 2 unique zones
            });
            it('should count unique zones for weekly missions', async () => {
                const mockCheckIns = [
                    { establishment: { zone: 'LK Metro' } },
                    { establishment: { zone: 'Treetown' } }
                ];
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockCheckIns, null));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getUniqueZonesVisited(mockUserId, 'weekly');
                expect(count).toBe(2);
            });
            it('should handle null zones gracefully', async () => {
                const mockCheckIns = [
                    { establishment: { zone: 'Zone A' } },
                    { establishment: null }, // Null establishment
                    { establishment: { zone: null } } // Null zone
                ];
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockCheckIns, null));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getUniqueZonesVisited(mockUserId);
                expect(count).toBe(1); // Only Zone A
            });
        });
        describe('getReviewCount', () => {
            it('should count reviews for daily missions with date filter', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain([{}, {}, {}], null));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getReviewCount(mockUserId, 'daily');
                expect(count).toBe(3);
            });
            it('should count all-time reviews for narrative missions', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain([{}, {}, {}, {}, {}], null));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getReviewCount(mockUserId, 'narrative');
                expect(count).toBe(5);
            });
            it('should count reviews for weekly missions', async () => {
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain([{}, {}], null));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getReviewCount(mockUserId, 'weekly');
                expect(count).toBe(2);
            });
        });
        describe('getQualityReviewCount', () => {
            it('should count reviews meeting min length requirement', async () => {
                const mockReviews = [
                    { comment: 'A'.repeat(150) }, // 150 chars - meets requirement
                    { comment: 'Short' }, // Too short
                    { comment: 'B'.repeat(200) } // 200 chars - meets requirement
                ];
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockReviews, null));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getQualityReviewCount(mockUserId, 100, false, 'daily');
                expect(count).toBe(2);
            });
            it('should handle photo requirement (Phase 3 placeholder)', async () => {
                const mockReviews = [
                    { comment: 'A'.repeat(150) }
                ];
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockReviews, null));
                supabase_1.supabase.from = mockFrom;
                // With photo required, count should be 0 (Phase 3 placeholder returns false)
                const count = await missionTrackingService_1.missionTrackingService.getQualityReviewCount(mockUserId, 100, true, 'daily');
                expect(count).toBe(0);
            });
        });
        describe('getReviewsMinLengthCount', () => {
            it('should count reviews with minimum length', async () => {
                const mockReviews = [
                    { comment: 'A'.repeat(50) }, // 50 chars
                    { comment: 'B'.repeat(100) }, // 100 chars
                    { comment: 'Short' } // Too short
                ];
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockReviews, null));
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getReviewsMinLengthCount(mockUserId, 50, 'daily');
                expect(count).toBe(2);
            });
        });
        describe('getReviewsWithPhotosCount', () => {
            it('should return photo count from user_photo_uploads table', async () => {
                // Mock user_photo_uploads data (3 photo uploads for reviews)
                const mockPhotos = [
                    { id: 'photo-1', user_id: mockUserId, entity_type: 'review', uploaded_at: new Date().toISOString() },
                    { id: 'photo-2', user_id: mockUserId, entity_type: 'review', uploaded_at: new Date().toISOString() },
                    { id: 'photo-3', user_id: mockUserId, entity_type: 'review', uploaded_at: new Date().toISOString() }
                ];
                const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockPhotos, null)); // count = mockPhotos.length = 3
                supabase_1.supabase.from = mockFrom;
                const count = await missionTrackingService_1.missionTrackingService.getReviewsWithPhotosCount(mockUserId, 'daily');
                expect(count).toBe(3);
                expect(mockFrom).toHaveBeenCalledWith('user_photo_uploads');
                expect(logger_1.logger.debug).toHaveBeenCalledWith('Reviews with photos count:', expect.objectContaining({
                    userId: mockUserId,
                    count: 3,
                    missionType: 'daily'
                }));
            });
        });
    });
    // ========================================
    // UTILITY TESTS
    // ========================================
    describe('Utility Functions', () => {
        describe('getThisWeekMonday', () => {
            it('should return Monday 00:00:00 of current week in Bangkok timezone', () => {
                const mondayISO = missionTrackingService_1.missionTrackingService.getThisWeekMonday();
                expect(typeof mondayISO).toBe('string');
                // Parse the ISO string
                const mondayUTC = new Date(mondayISO);
                // Convert to Bangkok time to verify it's Monday 00:00:00
                const THAILAND_OFFSET_MS = 7 * 60 * 60 * 1000;
                const mondayBangkok = new Date(mondayUTC.getTime() + THAILAND_OFFSET_MS);
                // Check it's Monday at 00:00:00 Bangkok time
                expect(mondayBangkok.getUTCDay()).toBe(1); // Monday = 1
                expect(mondayBangkok.getUTCHours()).toBe(0);
                expect(mondayBangkok.getUTCMinutes()).toBe(0);
                expect(mondayBangkok.getUTCSeconds()).toBe(0);
            });
            it('should handle Sunday correctly (previous Monday)', () => {
                // Use jest fake timers to set a specific date
                // Sunday Jan 26, 2025 at noon UTC (7pm Bangkok time)
                jest.useFakeTimers();
                jest.setSystemTime(new Date('2025-01-26T12:00:00Z'));
                const mondayISO = missionTrackingService_1.missionTrackingService.getThisWeekMonday();
                const mondayUTC = new Date(mondayISO);
                // Convert to Bangkok timezone
                const THAILAND_OFFSET_MS = 7 * 60 * 60 * 1000;
                const mondayBangkok = new Date(mondayUTC.getTime() + THAILAND_OFFSET_MS);
                // Should be Monday (previous week) at 00:00:00 Bangkok time
                expect(mondayBangkok.getUTCDay()).toBe(1); // Monday = 1
                expect(mondayBangkok.getUTCDate()).toBe(20); // Previous Monday (Jan 20)
                // Restore
                jest.useRealTimers();
            });
        });
    });
    // ========================================
    // EDGE CASES & ERROR HANDLING
    // ========================================
    describe('Edge Cases', () => {
        it('should handle concurrent mission updates gracefully', async () => {
            const mockRpc = jest.fn().mockResolvedValue({ data: true, error: null });
            supabase_1.supabase.rpc = mockRpc;
            const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockDailyMission, null));
            supabase_1.supabase.from = mockFrom;
            // Simulate concurrent updates
            await Promise.all([
                missionTrackingService_1.missionTrackingService.updateMissionProgress(mockUserId, mockMissionId, 1),
                missionTrackingService_1.missionTrackingService.updateMissionProgress(mockUserId, mockMissionId, 1)
            ]);
            // RPC function should be called for:
            // - 2x update_mission_progress
            // - 2x award_xp (if both completed)
            // So expect at least 2 calls (could be more if completion triggered)
            expect(mockRpc.mock.calls.length).toBeGreaterThanOrEqual(2);
            expect(mockRpc).toHaveBeenCalledWith('update_mission_progress', expect.any(Object));
        });
        it('should handle missions without count requirement (default to 1)', async () => {
            const mockMissionNoCount = {
                ...mockDailyMission,
                requirements: { type: 'check_in' } // No count specified
            };
            let callCount = 0;
            const mockFrom = jest.fn(() => {
                callCount++;
                if (callCount === 1) {
                    return mockSupabaseChain(null, { code: 'PGRST116' });
                }
                else if (callCount === 2) {
                    return mockSupabaseChain(mockMissionNoCount, null);
                }
                else {
                    return mockSupabaseChain(null, null);
                }
            });
            supabase_1.supabase.from = mockFrom;
            // RPC returns completed as null (calculated by RPC, not returned in data)
            const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
            supabase_1.supabase.rpc = mockRpc;
            await missionTrackingService_1.missionTrackingService.setMissionProgress(mockUserId, mockMissionId, 1);
            // RPC function set_mission_progress_absolute was called with progress=1
            expect(mockRpc).toHaveBeenCalledWith('set_mission_progress_absolute', {
                p_user_id: mockUserId,
                p_mission_id: mockMissionId,
                p_new_progress: 1 // Correct RPC parameter name
            });
            // Mission with count=1 (default) and progress=1 should complete
            expect(logger_1.logger.debug).toHaveBeenCalledWith('Mission progress set', expect.objectContaining({
                missionId: mockMissionId,
                progress: 1,
                completed: null // RPC doesn't return completed field
            }));
        });
        it('should handle mission completion without duplicate badge awards', async () => {
            // Badge awarding is now handled by RPC functions (update_mission_progress / set_mission_progress_absolute)
            // These RPCs have ON CONFLICT DO NOTHING to prevent duplicate badges
            // handleMissionCompletion only handles quest unlocking, not badge awards
            const mockMissionWithQuest = {
                ...mockDailyMission,
                badge_reward: 'badge-123',
                requirements: {
                    type: 'check_in',
                    quest_id: 'quest-1',
                    step: 1
                }
            };
            const mockFrom = jest.fn().mockReturnValue(mockSupabaseChain(mockMissionWithQuest, null));
            supabase_1.supabase.from = mockFrom;
            const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
            supabase_1.supabase.rpc = mockRpc;
            // First completion
            await missionTrackingService_1.missionTrackingService.handleMissionCompletion(mockUserId, mockMissionId);
            // Second completion (RPC handles duplicate prevention)
            await missionTrackingService_1.missionTrackingService.handleMissionCompletion(mockUserId, mockMissionId);
            // Verify quest unlocking was attempted (not badge insertion)
            expect(mockFrom).toHaveBeenCalledWith('missions');
            expect(mockFrom).not.toHaveBeenCalledWith('user_badges'); // Badges handled by RPC now
        });
    });
});
//# sourceMappingURL=missionTrackingService.test.js.map