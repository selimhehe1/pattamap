"use strict";
/**
 * Gamification Controller Tests
 *
 * Tests for newly added gamification endpoints:
 * - getXPHistory (6 tests)
 * - getWeeklyLeaderboard (4 tests)
 * - getCategoryLeaderboard (6 tests)
 * - getRewards (3 tests)
 * - getMyRewards (5 tests)
 * - claimReward (6 tests)
 *
 * Total: 30 tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const gamificationController_1 = require("../gamificationController");
// Import mock helpers
const supabase_1 = require("../../config/__mocks__/supabase");
// Mock dependencies
jest.mock('../../config/supabase', () => {
    const mockModule = jest.requireActual('../../config/__mocks__/supabase');
    return {
        supabase: mockModule.supabase,
        supabaseClient: mockModule.supabaseClient,
        createMockQueryBuilder: mockModule.createMockQueryBuilder,
        mockSuccess: mockModule.mockSuccess,
        mockNotFound: mockModule.mockNotFound,
        mockError: mockModule.mockError,
    };
});
jest.mock('../../utils/logger');
// Import supabase AFTER jest.mock
const supabase_2 = require("../../config/supabase");
// Helper to create mock request/response
const createMockReqRes = (overrides = {}) => {
    const req = {
        user: { id: 'test-user-123' },
        params: {},
        query: {},
        body: {},
        ...overrides
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
    };
    return { req, res };
};
describe('GamificationController - New Features', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        supabase_2.supabase.from = jest.fn();
    });
    // ========================================
    // getXPHistory Tests
    // ========================================
    describe('getXPHistory', () => {
        it('should return XP history for default 30 day period', async () => {
            const { req, res } = createMockReqRes({ query: {} });
            const mockTransactions = [
                { xp_amount: 50, reason: 'check_in', created_at: '2025-12-10T10:00:00Z' },
                { xp_amount: 30, reason: 'review', created_at: '2025-12-10T11:00:00Z' },
                { xp_amount: 20, reason: 'mission', created_at: '2025-12-11T10:00:00Z' }
            ];
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockTransactions)));
            await (0, gamificationController_1.getXPHistory)(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                period: 30,
                totalXPGained: 100,
                breakdown: expect.objectContaining({
                    check_in: 50,
                    review: 30,
                    mission: 20
                })
            }));
        });
        it('should accept period query param (7, 30, 90)', async () => {
            const { req, res } = createMockReqRes({ query: { period: '7' } });
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, gamificationController_1.getXPHistory)(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ period: 7 }));
        });
        it('should reject invalid period values', async () => {
            const { req, res } = createMockReqRes({ query: { period: '15' } });
            await (0, gamificationController_1.getXPHistory)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Period must be 7, 30, or 90 days'
            });
        });
        it('should require authentication', async () => {
            const { req, res } = createMockReqRes({ user: undefined });
            await (0, gamificationController_1.getXPHistory)(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Authentication required'
            });
        });
        it('should handle empty data gracefully', async () => {
            const { req, res } = createMockReqRes();
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, gamificationController_1.getXPHistory)(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                totalXPGained: 0,
                breakdown: {}
            }));
        });
        it('should handle database error', async () => {
            const { req, res } = createMockReqRes();
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Database error')));
            await (0, gamificationController_1.getXPHistory)(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to fetch XP history'
            });
        });
    });
    // ========================================
    // getWeeklyLeaderboard Tests
    // ========================================
    describe('getWeeklyLeaderboard', () => {
        it('should return users sorted by weekly XP', async () => {
            const { req, res } = createMockReqRes();
            const mockLeaderboard = [
                { user_id: 'user-1', username: 'Player1', weekly_xp: 500, current_level: 5 },
                { user_id: 'user-2', username: 'Player2', weekly_xp: 300, current_level: 4 }
            ];
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockLeaderboard)));
            await (0, gamificationController_1.getWeeklyLeaderboard)(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                type: 'weekly',
                leaderboard: expect.arrayContaining([
                    expect.objectContaining({ rank: 1 }),
                    expect.objectContaining({ rank: 2 })
                ])
            }));
        });
        it('should respect limit param (default 50)', async () => {
            const { req, res } = createMockReqRes({ query: { limit: '10' } });
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, gamificationController_1.getWeeklyLeaderboard)(req, res);
            expect(supabase_2.supabase.from).toHaveBeenCalledWith('leaderboard_weekly');
        });
        it('should fallback to user_points if view does not exist', async () => {
            const { req, res } = createMockReqRes();
            // First call fails (view doesn't exist)
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Relation does not exist')));
            // Fallback query succeeds
            const mockFallback = [
                { user_id: 'user-1', total_xp: 500, current_level: 5, users: { pseudonym: 'Player1' } }
            ];
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockFallback)));
            await (0, gamificationController_1.getWeeklyLeaderboard)(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ type: 'weekly' }));
        });
        it('should handle database error', async () => {
            const { req, res } = createMockReqRes();
            // First call fails
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Database error')));
            // Fallback also fails
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Database error')));
            await (0, gamificationController_1.getWeeklyLeaderboard)(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
    // ========================================
    // getCategoryLeaderboard Tests
    // ========================================
    describe('getCategoryLeaderboard', () => {
        it('should return reviewers leaderboard', async () => {
            const { req, res } = createMockReqRes({ params: { category: 'reviewers' } });
            const mockLeaderboard = [
                { user_id: 'user-1', username: 'Reviewer1', review_count: 50 }
            ];
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockLeaderboard)));
            await (0, gamificationController_1.getCategoryLeaderboard)(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ type: 'reviewers' }));
        });
        it('should return photographers leaderboard', async () => {
            const { req, res } = createMockReqRes({ params: { category: 'photographers' } });
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, gamificationController_1.getCategoryLeaderboard)(req, res);
            expect(supabase_2.supabase.from).toHaveBeenCalledWith('leaderboard_photographers');
        });
        it('should return checkins leaderboard', async () => {
            const { req, res } = createMockReqRes({ params: { category: 'checkins' } });
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, gamificationController_1.getCategoryLeaderboard)(req, res);
            expect(supabase_2.supabase.from).toHaveBeenCalledWith('leaderboard_checkins');
        });
        it('should return helpful leaderboard', async () => {
            const { req, res } = createMockReqRes({ params: { category: 'helpful' } });
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, gamificationController_1.getCategoryLeaderboard)(req, res);
            expect(supabase_2.supabase.from).toHaveBeenCalledWith('leaderboard_helpful');
        });
        it('should reject invalid category', async () => {
            const { req, res } = createMockReqRes({ params: { category: 'invalid' } });
            await (0, gamificationController_1.getCategoryLeaderboard)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Invalid category. Must be one of: reviewers, photographers, checkins, helpful'
            });
        });
        it('should provide fallback when view does not exist', async () => {
            const { req, res } = createMockReqRes({ params: { category: 'reviewers' } });
            // View query fails
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Relation does not exist')));
            // Fallback query
            const mockComments = [
                { user_id: 'user-1', users: { pseudonym: 'User1' } },
                { user_id: 'user-1', users: { pseudonym: 'User1' } },
                { user_id: 'user-2', users: { pseudonym: 'User2' } }
            ];
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockComments)));
            await (0, gamificationController_1.getCategoryLeaderboard)(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ type: 'reviewers' }));
        });
    });
    // ========================================
    // getRewards Tests
    // ========================================
    describe('getRewards', () => {
        it('should return all active rewards', async () => {
            const { req, res } = createMockReqRes();
            const mockRewards = [
                { id: 'reward-1', name: 'Photo Upload', unlock_type: 'level', unlock_value: 2, is_active: true },
                { id: 'reward-2', name: 'Custom Title', unlock_type: 'level', unlock_value: 3, is_active: true }
            ];
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockRewards)));
            await (0, gamificationController_1.getRewards)(req, res);
            expect(res.json).toHaveBeenCalledWith({
                rewards: mockRewards
            });
        });
        it('should return empty array if no rewards', async () => {
            const { req, res } = createMockReqRes();
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            await (0, gamificationController_1.getRewards)(req, res);
            expect(res.json).toHaveBeenCalledWith({ rewards: [] });
        });
        it('should handle database error', async () => {
            const { req, res } = createMockReqRes();
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Database error')));
            await (0, gamificationController_1.getRewards)(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to fetch rewards'
            });
        });
    });
    // ========================================
    // getMyRewards Tests
    // ========================================
    describe('getMyRewards', () => {
        it('should return rewards with unlock status', async () => {
            const { req, res } = createMockReqRes();
            const mockProgress = { current_level: 5, total_xp: 500 };
            const mockRewards = [
                {
                    id: 'reward-1',
                    name: 'Photo Upload',
                    unlock_type: 'level',
                    unlock_value: 2,
                    category: 'feature',
                    icon: '📸',
                    is_active: true,
                    user_unlocks: [{ id: 'unlock-1', unlocked_at: '2025-12-10', claimed: true }]
                },
                {
                    id: 'reward-2',
                    name: 'VIP Badge',
                    unlock_type: 'level',
                    unlock_value: 10,
                    category: 'cosmetic',
                    icon: '👑',
                    is_active: true,
                    user_unlocks: []
                }
            ];
            // First query: user progress
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockProgress)));
            // Second query: rewards with unlocks
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockRewards)));
            await (0, gamificationController_1.getMyRewards)(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                currentLevel: 5,
                totalXp: 500,
                rewards: expect.arrayContaining([
                    expect.objectContaining({ is_unlocked: true }),
                    expect.objectContaining({ is_unlocked: false })
                ])
            }));
        });
        it('should include currentLevel and totalXp', async () => {
            const { req, res } = createMockReqRes();
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ current_level: 3, total_xp: 300 })));
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, gamificationController_1.getMyRewards)(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                currentLevel: 3,
                totalXp: 300
            }));
        });
        it('should require authentication', async () => {
            const { req, res } = createMockReqRes({ user: undefined });
            await (0, gamificationController_1.getMyRewards)(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Authentication required'
            });
        });
        it('should handle missing user progress gracefully', async () => {
            const { req, res } = createMockReqRes();
            // User progress not found (PGRST116)
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)({ data: null, error: { code: 'PGRST116' } }));
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, gamificationController_1.getMyRewards)(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                currentLevel: 1,
                totalXp: 0
            }));
        });
        it('should use fallback query if join fails', async () => {
            const { req, res } = createMockReqRes();
            // User progress
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ current_level: 4, total_xp: 400 })));
            // Join query fails
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Join failed')));
            // Fallback: rewards
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([{ id: 'r1', name: 'Test' }])));
            // Fallback: user_unlocks
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, gamificationController_1.getMyRewards)(req, res);
            expect(res.json).toHaveBeenCalled();
        });
    });
    // ========================================
    // claimReward Tests
    // ========================================
    describe('claimReward', () => {
        it('should claim eligible reward', async () => {
            const { req, res } = createMockReqRes({ params: { rewardId: 'reward-1' } });
            const mockReward = {
                id: 'reward-1',
                name: 'Photo Upload',
                unlock_type: 'level',
                unlock_value: 2,
                category: 'feature',
                icon: '📸',
                is_active: true
            };
            const mockProgress = { current_level: 5, total_xp: 500 };
            // Get reward
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockReward)));
            // Get user progress
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockProgress)));
            // Check existing unlock (none)
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            // Insert unlock
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'unlock-1' })));
            await (0, gamificationController_1.claimReward)(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Reward claimed successfully',
                reward: expect.objectContaining({
                    id: 'reward-1',
                    name: 'Photo Upload'
                })
            }));
        });
        it('should reject if not eligible (level too low)', async () => {
            const { req, res } = createMockReqRes({ params: { rewardId: 'reward-1' } });
            const mockReward = {
                id: 'reward-1',
                name: 'VIP Badge',
                unlock_type: 'level',
                unlock_value: 10,
                is_active: true
            };
            const mockProgress = { current_level: 3, total_xp: 300 };
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockReward)));
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockProgress)));
            await (0, gamificationController_1.claimReward)(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Not eligible for this reward'
            }));
        });
        it('should reject if already claimed', async () => {
            const { req, res } = createMockReqRes({ params: { rewardId: 'reward-1' } });
            const mockReward = {
                id: 'reward-1',
                name: 'Photo Upload',
                unlock_type: 'level',
                unlock_value: 2,
                is_active: true
            };
            const mockProgress = { current_level: 5, total_xp: 500 };
            const existingUnlock = { id: 'unlock-1', claimed: true };
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockReward)));
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockProgress)));
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(existingUnlock)));
            await (0, gamificationController_1.claimReward)(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Reward already claimed'
            });
        });
        it('should require authentication', async () => {
            const { req, res } = createMockReqRes({ user: undefined, params: { rewardId: 'reward-1' } });
            await (0, gamificationController_1.claimReward)(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Authentication required'
            });
        });
        it('should return 404 for non-existent reward', async () => {
            const { req, res } = createMockReqRes({ params: { rewardId: 'non-existent' } });
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            await (0, gamificationController_1.claimReward)(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Reward not found'
            });
        });
        it('should update existing unlock if unclaimed', async () => {
            const { req, res } = createMockReqRes({ params: { rewardId: 'reward-1' } });
            const mockReward = {
                id: 'reward-1',
                name: 'Photo Upload',
                unlock_type: 'level',
                unlock_value: 2,
                category: 'feature',
                icon: '📸',
                is_active: true
            };
            const mockProgress = { current_level: 5, total_xp: 500 };
            const existingUnlock = { id: 'unlock-1', claimed: false };
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockReward)));
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockProgress)));
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(existingUnlock)));
            // Update existing unlock
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            await (0, gamificationController_1.claimReward)(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Reward claimed successfully'
            }));
        });
    });
});
//# sourceMappingURL=gamificationController.test.js.map