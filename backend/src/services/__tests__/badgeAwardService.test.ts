/**
 * 🧪 Badge Award Service Tests
 *
 * Tests for badge checking and awarding system
 * - checkAndAwardBadges (7/7 tests ✅)
 * - isBadgeRelevantForAction (4/4 tests ✅)
 * - checkBadgeRequirements (6/6 tests ✅)
 * - awardBadge (4/4 tests ✅)
 *
 * CURRENT STATUS: 21/21 tests passing (100%) ✅
 *
 * Day 5 Sprint - Services Testing
 */

import { badgeAwardService } from '../badgeAwardService';
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

describe('BadgeAwardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.from = jest.fn();
  });

  describe('checkAndAwardBadges', () => {
    it('should award new badges when requirements are met', async () => {
      const userId = 'user-123';
      const mockBadges = [
        {
          id: 'badge-1',
          name: 'First Review',
          requirement_type: 'review_count',
          requirement_value: 1
        }
      ];

      const mockUserBadges: any[] = []; // No badges yet
      const mockReviewCount = { count: 5, error: null }; // User has 5 reviews

      // Mock queries: 1) get badges, 2) get user badges, 3) count reviews, 4) insert badge
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockBadges)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockUserBadges)))
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue(mockReviewCount)
        })
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'user-badge-1' })));

      const awarded = await badgeAwardService.checkAndAwardBadges(userId, 'review_created');

      expect(awarded).toEqual(['First Review']);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Awarded 1 badge(s)')
      );
    });

    it('should not award badges that user already has', async () => {
      const userId = 'user-123';
      const mockBadges = [
        {
          id: 'badge-1',
          name: 'First Review',
          requirement_type: 'review_count',
          requirement_value: 1
        }
      ];

      const mockUserBadges = [{ badge_id: 'badge-1' }]; // Already has badge

      // Mock queries: 1) get badges, 2) get user badges
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockBadges)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockUserBadges)));

      const awarded = await badgeAwardService.checkAndAwardBadges(userId, 'review_created');

      expect(awarded).toEqual([]);
    });

    it('should return empty array if no badges in database', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])));

      const awarded = await badgeAwardService.checkAndAwardBadges('user-123', 'review_created');

      expect(awarded).toEqual([]);
      expect(logger.debug).toHaveBeenCalledWith('No badges found in database');
    });

    it('should handle database error when fetching badges', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockError('Database error')));

      const awarded = await badgeAwardService.checkAndAwardBadges('user-123', 'review_created');

      expect(awarded).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith('Failed to fetch badges:', 'Database error');
    });

    it('should handle database error when fetching user badges', async () => {
      const mockBadges = [
        {
          id: 'badge-1',
          name: 'First Review',
          requirement_type: 'review_count',
          requirement_value: 1
        }
      ];

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockBadges)))
        .mockReturnValueOnce(createMockQueryBuilder(mockError('Database error')));

      const awarded = await badgeAwardService.checkAndAwardBadges('user-123', 'review_created');

      expect(awarded).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith('Failed to fetch user badges:', 'Database error');
    });

    it('should skip irrelevant badges for action type', async () => {
      const mockBadges = [
        {
          id: 'badge-1',
          name: 'Check-in Master',
          requirement_type: 'check_in_count',
          requirement_value: 10
        }
      ];

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockBadges)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])));

      // Trigger review action but badge is for check-ins
      const awarded = await badgeAwardService.checkAndAwardBadges('user-123', 'review_created');

      expect(awarded).toEqual([]);
    });

    it('should not award badge if requirements not met', async () => {
      const userId = 'user-123';
      const mockBadges = [
        {
          id: 'badge-1',
          name: 'Review Expert',
          requirement_type: 'review_count',
          requirement_value: 100
        }
      ];

      const mockUserBadges: any[] = [];
      const mockReviewCount = { count: 5, error: null }; // Only 5 reviews, needs 100

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockBadges)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockUserBadges)))
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue(mockReviewCount)
        });

      const awarded = await badgeAwardService.checkAndAwardBadges(userId, 'review_created');

      expect(awarded).toEqual([]);
    });
  });

  describe('isBadgeRelevantForAction', () => {
    it('should return true for review badges on review action', () => {
      const badge = {
        id: 'badge-1',
        name: 'First Review',
        requirement_type: 'review_count',
        requirement_value: 1,
        description: '',
        icon_url: '',
        category: '',
        rarity: '',
        is_hidden: false
      };

      // Access private method via instance cast
      const service = badgeAwardService as any;
      const result = service.isBadgeRelevantForAction(badge, 'review_created');

      expect(result).toBe(true);
    });

    it('should return true for check-in badges on check-in action', () => {
      const badge = {
        id: 'badge-1',
        name: 'First Check-in',
        requirement_type: 'check_in_count',
        requirement_value: 1,
        description: '',
        icon_url: '',
        category: '',
        rarity: '',
        is_hidden: false
      };

      const service = badgeAwardService as any;
      const result = service.isBadgeRelevantForAction(badge, 'check_in');

      expect(result).toBe(true);
    });

    it('should return false for mismatched action and badge type', () => {
      const badge = {
        id: 'badge-1',
        name: 'Check-in Master',
        requirement_type: 'check_in_count',
        requirement_value: 10,
        description: '',
        icon_url: '',
        category: '',
        rarity: '',
        is_hidden: false
      };

      const service = badgeAwardService as any;
      const result = service.isBadgeRelevantForAction(badge, 'review_created');

      expect(result).toBe(false);
    });

    it('should return false for unknown action types', () => {
      const badge = {
        id: 'badge-1',
        name: 'Some Badge',
        requirement_type: 'review_count',
        requirement_value: 1,
        description: '',
        icon_url: '',
        category: '',
        rarity: '',
        is_hidden: false
      };

      const service = badgeAwardService as any;
      const result = service.isBadgeRelevantForAction(badge, 'unknown_action');

      expect(result).toBe(false);
    });
  });

  describe('checkBadgeRequirements', () => {
    it('should check review_count requirement', async () => {
      const badge = {
        id: 'badge-1',
        name: 'Reviewer',
        requirement_type: 'review_count',
        requirement_value: 5,
        description: '',
        icon_url: '',
        category: '',
        rarity: '',
        is_hidden: false
      };

      const mockReviewCount = { count: 10, error: null };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(mockReviewCount)
      });

      const service = badgeAwardService as any;
      const result = await service.checkBadgeRequirements('user-123', badge);

      expect(result).toBe(true);
    });

    it('should check check_in_count requirement', async () => {
      const badge = {
        id: 'badge-1',
        name: 'Explorer',
        requirement_type: 'check_in_count',
        requirement_value: 5,
        description: '',
        icon_url: '',
        category: '',
        rarity: '',
        is_hidden: false
      };

      const mockCheckInCount = { count: 10, error: null };

      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };
      mockBuilder.eq = jest.fn()
        .mockReturnValueOnce(mockBuilder) // First eq returns builder
        .mockResolvedValueOnce(mockCheckInCount); // Second eq resolves

      (supabase.from as jest.Mock).mockReturnValueOnce(mockBuilder);

      const service = badgeAwardService as any;
      const result = await service.checkBadgeRequirements('user-123', badge);

      expect(result).toBe(true);
    });

    it('should check unique_zones_visited requirement', async () => {
      const badge = {
        id: 'badge-1',
        name: 'Zone Hopper',
        requirement_type: 'unique_zones_visited',
        requirement_value: 3,
        description: '',
        icon_url: '',
        category: '',
        rarity: '',
        is_hidden: false
      };

      const mockZones = [
        { zone: 'Walking Street' },
        { zone: 'Soi Buakhao' },
        { zone: 'Beach Road' },
        { zone: 'Walking Street' } // Duplicate
      ];

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(mockZones))
      );

      const service = badgeAwardService as any;
      const result = await service.checkBadgeRequirements('user-123', badge);

      expect(result).toBe(true); // 3 unique zones
    });

    it('should return false for unimplemented requirement types', async () => {
      const badge = {
        id: 'badge-1',
        name: 'Photo Master',
        requirement_type: 'photo_count',
        requirement_value: 10,
        description: '',
        icon_url: '',
        category: '',
        rarity: '',
        is_hidden: false
      };

      const service = badgeAwardService as any;
      const result = await service.checkBadgeRequirements('user-123', badge);

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const badge = {
        id: 'badge-1',
        name: 'Reviewer',
        requirement_type: 'review_count',
        requirement_value: 5,
        description: '',
        icon_url: '',
        category: '',
        rarity: '',
        is_hidden: false
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: null, error: 'Database error' })
      });

      const service = badgeAwardService as any;
      const result = await service.checkBadgeRequirements('user-123', badge);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Error counting reviews:',
        'Database error'
      );
    });

    it('should return false when count is below requirement', async () => {
      const badge = {
        id: 'badge-1',
        name: 'Master Reviewer',
        requirement_type: 'review_count',
        requirement_value: 100,
        description: '',
        icon_url: '',
        category: '',
        rarity: '',
        is_hidden: false
      };

      const mockReviewCount = { count: 50, error: null };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue(mockReviewCount)
      });

      const service = badgeAwardService as any;
      const result = await service.checkBadgeRequirements('user-123', badge);

      expect(result).toBe(false);
    });
  });

  describe('awardBadge', () => {
    it('should award badge successfully', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'user-badge-1' }))
      );

      const service = badgeAwardService as any;
      const result = await service.awardBadge('user-123', 'badge-1', 'First Review');

      expect(result).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("Awarded badge 'First Review'")
      );
    });

    it('should handle duplicate badge award (unique constraint)', async () => {
      const duplicateError = { code: '23505', message: 'Unique constraint violation' };

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockError(duplicateError))
      );

      const service = badgeAwardService as any;
      const result = await service.awardBadge('user-123', 'badge-1', 'First Review');

      expect(result).toBe(false);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('already awarded')
      );
    });

    it('should handle database errors', async () => {
      const dbError = { code: 'XXXX', message: 'Database error' };

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockError(dbError))
      );

      const service = badgeAwardService as any;
      const result = await service.awardBadge('user-123', 'badge-1', 'First Review');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to award badge'),
        dbError
      );
    });

    it('should handle unexpected exceptions', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const service = badgeAwardService as any;
      const result = await service.awardBadge('user-123', 'badge-1', 'First Review');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error awarding badge'),
        expect.any(Error)
      );
    });
  });
});
