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

import {
  calculateLevel,
  getXPForNextLevel,
  awardXP,
  getUserPoints,
  resetMonthlyXP
} from '../gamificationService';
import { logger } from '../../utils/logger';

// Import mock helpers
import { createMockQueryBuilder, mockSuccess, mockNotFound, mockError } from '../../config/__mocks__/supabase';

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
import { supabase } from '../../config/supabase';

describe('GamificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.from = jest.fn();
  });

  describe('calculateLevel', () => {
    it('should return level 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('should return level 1 for negative XP', () => {
      expect(calculateLevel(-100)).toBe(1);
      expect(calculateLevel(-1)).toBe(1);
    });

    it('should calculate level 1 for 1-99 XP', () => {
      expect(calculateLevel(1)).toBe(1);
      expect(calculateLevel(50)).toBe(1);
      expect(calculateLevel(99)).toBe(1);
    });

    it('should calculate level 2 for 100-199 XP', () => {
      expect(calculateLevel(100)).toBe(2);
      expect(calculateLevel(150)).toBe(2);
      expect(calculateLevel(199)).toBe(2);
    });

    it('should calculate level 10 for 900-999 XP', () => {
      expect(calculateLevel(900)).toBe(10);
      expect(calculateLevel(950)).toBe(10);
      expect(calculateLevel(999)).toBe(10);
    });

    it('should handle large XP values', () => {
      expect(calculateLevel(10000)).toBe(101);
      expect(calculateLevel(100000)).toBe(1001);
    });
  });

  describe('getXPForNextLevel', () => {
    it('should return 100 XP for level 1', () => {
      expect(getXPForNextLevel(1)).toBe(100);
    });

    it('should return 500 XP for level 5', () => {
      expect(getXPForNextLevel(5)).toBe(500);
    });

    it('should return 1000 XP for level 10', () => {
      expect(getXPForNextLevel(10)).toBe(1000);
    });

    it('should handle large levels', () => {
      expect(getXPForNextLevel(100)).toBe(10000);
    });
  });

  describe('awardXP', () => {
    it('should award XP and create new user_points record', async () => {
      const userId = 'user-123';
      const xpAmount = 50;

      // Mock: 1) insert transaction, 2) fetch existing points (not found), 3) insert new points
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'tx-1' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'points-1' })));

      await awardXP(userId, xpAmount, 'review_created', 'comment', 'comment-123');

      expect(supabase.from).toHaveBeenCalledWith('xp_transactions');
      expect(supabase.from).toHaveBeenCalledWith('user_points');
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
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'tx-1' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(existingPoints)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'points-1' })));

      await awardXP(userId, xpAmount, 'check_in', 'employee', 'emp-123');

      expect(supabase.from).toHaveBeenCalledWith('xp_transactions');
      expect(supabase.from).toHaveBeenCalledWith('user_points');
    });

    it('should throw error if userId is missing', async () => {
      await expect(awardXP('', 50, 'review_created')).rejects.toThrow('userId is required');
    });

    it('should throw error if xpAmount is zero', async () => {
      await expect(awardXP('user-123', 0, 'review_created')).rejects.toThrow('xpAmount must be positive');
    });

    it('should throw error if xpAmount is negative', async () => {
      await expect(awardXP('user-123', -10, 'review_created')).rejects.toThrow('xpAmount must be positive');
    });

    it('should throw error if xpAmount is not an integer', async () => {
      await expect(awardXP('user-123', 10.5, 'review_created')).rejects.toThrow('xpAmount must be an integer');
    });

    it('should handle transaction creation error', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockError('Database error'))
      );

      await expect(awardXP('user-123', 50, 'review_created')).rejects.toThrow('Failed to create XP transaction');
    });

    it('should handle user_points fetch error', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'tx-1' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockError('Fetch error')));

      await expect(awardXP('user-123', 50, 'review_created')).rejects.toThrow('Failed to fetch user points');
    });

    it('should handle user_points update error', async () => {
      const existingPoints = {
        total_xp: 100,
        monthly_xp: 50,
        current_level: 2
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'tx-1' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(existingPoints)))
        .mockReturnValueOnce(createMockQueryBuilder(mockError('Update error')));

      await expect(awardXP('user-123', 50, 'review_created')).rejects.toThrow('Failed to update user points');
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
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'tx-1' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(existingPoints)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'points-1' })));

      await awardXP(userId, xpAmount, 'review_created');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('LEVEL UP')
      );
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

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(mockPoints))
      );

      const result = await getUserPoints('user-123');

      expect(result).toEqual(mockPoints);
      expect(supabase.from).toHaveBeenCalledWith('user_points');
    });

    it('should return null if user points not found', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );

      const result = await getUserPoints('user-123');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockError('Database error'))
      );

      const result = await getUserPoints('user-123');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get user points:',
        'Database error'
      );
    });
  });

  describe('resetMonthlyXP', () => {
    it('should reset monthly XP for all users', async () => {
      const mockUsers = [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
        { user_id: 'user-3' }
      ];

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(mockUsers))
      );

      const count = await resetMonthlyXP();

      expect(count).toBe(3);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Monthly XP reset for 3 users')
      );
    });

    it('should return 0 if no users have monthly XP', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess([]))
      );

      const count = await resetMonthlyXP();

      expect(count).toBe(0);
    });

    it('should throw error on database failure', async () => {
      const dbError = new Error('Database error');

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockError(dbError))
      );

      await expect(resetMonthlyXP()).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to reset monthly XP:',
        dbError
      );
    });
  });
});
