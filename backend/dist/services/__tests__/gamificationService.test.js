"use strict";
/**
 * 🧪 Gamification Service Tests
 *
 * Tests for XP and level management system
 * - calculateLevel (6/6 tests ✅)
 * - getXPForNextLevel (4/4 tests ✅)
 * - awardXP (10/10 tests ✅)
 * - getUserPoints (3/3 tests ✅)
 * - resetMonthlyXP (3/3 tests ✅)
 *
 * CURRENT STATUS: 26/26 tests passing (100%) ✅
 *
 * Day 5 Sprint - Services Testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
const gamificationService_1 = require("../gamificationService");
const logger_1 = require("../../utils/logger");
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
describe('GamificationService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        supabase_2.supabase.from = jest.fn();
    });
    describe('calculateLevel', () => {
        it('should return level 1 for 0 XP', () => {
            expect((0, gamificationService_1.calculateLevel)(0)).toBe(1);
        });
        it('should return level 1 for negative XP', () => {
            expect((0, gamificationService_1.calculateLevel)(-100)).toBe(1);
            expect((0, gamificationService_1.calculateLevel)(-1)).toBe(1);
        });
        it('should calculate level 1 for 1-99 XP', () => {
            expect((0, gamificationService_1.calculateLevel)(1)).toBe(1);
            expect((0, gamificationService_1.calculateLevel)(50)).toBe(1);
            expect((0, gamificationService_1.calculateLevel)(99)).toBe(1);
        });
        it('should calculate level 2 for 100-199 XP', () => {
            expect((0, gamificationService_1.calculateLevel)(100)).toBe(2);
            expect((0, gamificationService_1.calculateLevel)(150)).toBe(2);
            expect((0, gamificationService_1.calculateLevel)(199)).toBe(2);
        });
        it('should calculate level 10 for 900-999 XP', () => {
            expect((0, gamificationService_1.calculateLevel)(900)).toBe(10);
            expect((0, gamificationService_1.calculateLevel)(950)).toBe(10);
            expect((0, gamificationService_1.calculateLevel)(999)).toBe(10);
        });
        it('should handle large XP values', () => {
            expect((0, gamificationService_1.calculateLevel)(10000)).toBe(101);
            expect((0, gamificationService_1.calculateLevel)(100000)).toBe(1001);
        });
    });
    describe('getXPForNextLevel', () => {
        it('should return 100 XP for level 1', () => {
            expect((0, gamificationService_1.getXPForNextLevel)(1)).toBe(100);
        });
        it('should return 500 XP for level 5', () => {
            expect((0, gamificationService_1.getXPForNextLevel)(5)).toBe(500);
        });
        it('should return 1000 XP for level 10', () => {
            expect((0, gamificationService_1.getXPForNextLevel)(10)).toBe(1000);
        });
        it('should handle large levels', () => {
            expect((0, gamificationService_1.getXPForNextLevel)(100)).toBe(10000);
        });
    });
    describe('awardXP', () => {
        it('should award XP and create new user_points record', async () => {
            const userId = 'user-123';
            const xpAmount = 50;
            // Mock: 1) insert transaction, 2) fetch existing points (not found), 3) insert new points
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'tx-1' })))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'points-1' })));
            await (0, gamificationService_1.awardXP)(userId, xpAmount, 'review_created', 'comment', 'comment-123');
            expect(supabase_2.supabase.from).toHaveBeenCalledWith('xp_transactions');
            expect(supabase_2.supabase.from).toHaveBeenCalledWith('user_points');
        });
        it('should award XP and update existing user_points record', async () => {
            const userId = 'user-123';
            const xpAmount = 50;
            const existingPoints = {
                total_xp: 100,
                monthly_xp: 50,
                current_level: 2
            };
            // Mock: 1) insert transaction, 2) fetch existing points, 3) update points
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'tx-1' })))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(existingPoints)))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'points-1' })));
            await (0, gamificationService_1.awardXP)(userId, xpAmount, 'check_in', 'employee', 'emp-123');
            expect(supabase_2.supabase.from).toHaveBeenCalledWith('xp_transactions');
            expect(supabase_2.supabase.from).toHaveBeenCalledWith('user_points');
        });
        it('should throw error if userId is missing', async () => {
            await expect((0, gamificationService_1.awardXP)('', 50, 'review_created')).rejects.toThrow('userId is required');
        });
        it('should throw error if xpAmount is zero', async () => {
            await expect((0, gamificationService_1.awardXP)('user-123', 0, 'review_created')).rejects.toThrow('xpAmount must be positive');
        });
        it('should throw error if xpAmount is negative', async () => {
            await expect((0, gamificationService_1.awardXP)('user-123', -10, 'review_created')).rejects.toThrow('xpAmount must be positive');
        });
        it('should throw error if xpAmount is not an integer', async () => {
            await expect((0, gamificationService_1.awardXP)('user-123', 10.5, 'review_created')).rejects.toThrow('xpAmount must be an integer');
        });
        it('should handle transaction creation error', async () => {
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Database error')));
            await expect((0, gamificationService_1.awardXP)('user-123', 50, 'review_created')).rejects.toThrow('Failed to create XP transaction');
        });
        it('should handle user_points fetch error', async () => {
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'tx-1' })))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Fetch error')));
            await expect((0, gamificationService_1.awardXP)('user-123', 50, 'review_created')).rejects.toThrow('Failed to fetch user points');
        });
        it('should handle user_points update error', async () => {
            const existingPoints = {
                total_xp: 100,
                monthly_xp: 50,
                current_level: 2
            };
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'tx-1' })))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(existingPoints)))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Update error')));
            await expect((0, gamificationService_1.awardXP)('user-123', 50, 'review_created')).rejects.toThrow('Failed to update user points');
        });
        it('should calculate level up correctly', async () => {
            const userId = 'user-123';
            const xpAmount = 50;
            const existingPoints = {
                total_xp: 90, // Level 1
                monthly_xp: 90,
                current_level: 1
            };
            // Adding 50 XP brings total to 140 = Level 2
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'tx-1' })))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(existingPoints)))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)({ id: 'points-1' })));
            await (0, gamificationService_1.awardXP)(userId, xpAmount, 'review_created');
            expect(logger_1.logger.info).toHaveBeenCalledWith(expect.stringContaining('LEVEL UP'));
        });
    });
    describe('getUserPoints', () => {
        it('should return user points if found', async () => {
            const mockPoints = {
                total_xp: 250,
                monthly_xp: 100,
                current_level: 3,
                current_streak_days: 5,
                longest_streak_days: 10
            };
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockPoints)));
            const result = await (0, gamificationService_1.getUserPoints)('user-123');
            expect(result).toEqual(mockPoints);
            expect(supabase_2.supabase.from).toHaveBeenCalledWith('user_points');
        });
        it('should return null if user points not found', async () => {
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            const result = await (0, gamificationService_1.getUserPoints)('user-123');
            expect(result).toBeNull();
        });
        it('should return null on database error', async () => {
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)('Database error')));
            const result = await (0, gamificationService_1.getUserPoints)('user-123');
            expect(result).toBeNull();
            expect(logger_1.logger.error).toHaveBeenCalledWith('Failed to get user points:', 'Database error');
        });
    });
    describe('resetMonthlyXP', () => {
        it('should reset monthly XP for all users', async () => {
            const mockUsers = [
                { user_id: 'user-1' },
                { user_id: 'user-2' },
                { user_id: 'user-3' }
            ];
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockUsers)));
            const count = await (0, gamificationService_1.resetMonthlyXP)();
            expect(count).toBe(3);
            expect(logger_1.logger.info).toHaveBeenCalledWith(expect.stringContaining('Monthly XP reset for 3 users'));
        });
        it('should return 0 if no users have monthly XP', async () => {
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            const count = await (0, gamificationService_1.resetMonthlyXP)();
            expect(count).toBe(0);
        });
        it('should throw error on database failure', async () => {
            const dbError = new Error('Database error');
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockError)(dbError)));
            await expect((0, gamificationService_1.resetMonthlyXP)()).rejects.toThrow('Database error');
            expect(logger_1.logger.error).toHaveBeenCalledWith('Failed to reset monthly XP:', dbError);
        });
    });
});
//# sourceMappingURL=gamificationService.test.js.map