/**
 * Tests for GamificationContext
 * Covers: XP notifications, level helpers, hook validation
 * Note: Integration tests with actual data fetching are done in E2E tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React, { useState } from 'react';
import { GamificationContext, useGamification } from '../GamificationContext';
import type { UserProgress, UserBadge, UserMissionProgress, XPNotification } from '../GamificationContext';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Create a test provider with controllable state
const createTestProvider = (initialState: Partial<{
  userProgress: UserProgress | null;
  userBadges: UserBadge[];
  userMissions: UserMissionProgress[];
  loading: boolean;
  xpNotifications: XPNotification[];
}> = {}) => {
  const TestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [xpNotifications, setXPNotifications] = useState<XPNotification[]>(
      initialState.xpNotifications || []
    );

    const addXPNotification = (xp: number, reason: string) => {
      const notification: XPNotification = {
        xpAmount: xp,
        reason,
        timestamp: Date.now(),
      };
      setXPNotifications((prev) => [...prev, notification]);
    };

    const clearXPNotification = (timestamp: number) => {
      setXPNotifications((prev) => prev.filter((n) => n.timestamp !== timestamp));
    };

    // Level configuration
    const LEVEL_CONFIG = [
      { level: 1, name: 'Newbie', icon: '🌱', minXP: 0 },
      { level: 2, name: 'Explorer', icon: '🗺️', minXP: 100 },
      { level: 3, name: 'Regular', icon: '🍻', minXP: 300 },
      { level: 4, name: 'Insider', icon: '🌟', minXP: 700 },
      { level: 5, name: 'VIP', icon: '💎', minXP: 1500 },
      { level: 6, name: 'Legend', icon: '🏆', minXP: 3000 },
      { level: 7, name: 'Ambassador', icon: '👑', minXP: 6000 },
    ];

    const getLevelName = (level: number): string => {
      return LEVEL_CONFIG.find((l) => l.level === level)?.name || 'Unknown';
    };

    const getLevelIcon = (level: number): string => {
      return LEVEL_CONFIG.find((l) => l.level === level)?.icon || '❓';
    };

    const getXPForNextLevel = (currentLevel: number): number => {
      if (currentLevel >= 7) return 0;
      return LEVEL_CONFIG.find((l) => l.level === currentLevel + 1)?.minXP || 0;
    };

    const getProgressToNextLevel = (currentXP: number, currentLevel: number): number => {
      if (currentLevel >= 7) return 100;
      const currentLevelXP = LEVEL_CONFIG.find((l) => l.level === currentLevel)?.minXP || 0;
      const nextLevelXP = getXPForNextLevel(currentLevel);
      const progress = ((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
      return Math.min(Math.max(progress, 0), 100);
    };

    const value = {
      userProgress: initialState.userProgress ?? null,
      userBadges: initialState.userBadges || [],
      userMissions: initialState.userMissions || [],
      loading: initialState.loading ?? false,
      xpNotifications,
      addXPNotification,
      clearXPNotification,
      refreshUserProgress: vi.fn().mockResolvedValue(undefined),
      refreshUserBadges: vi.fn().mockResolvedValue(undefined),
      refreshUserMissions: vi.fn().mockResolvedValue(undefined),
      awardXP: vi.fn().mockResolvedValue(undefined),
      getLevelName,
      getLevelIcon,
      getXPForNextLevel,
      getProgressToNextLevel,
    };

    return (
      <GamificationContext.Provider value={value}>
        {children}
      </GamificationContext.Provider>
    );
  };

  return TestProvider;
};

describe('GamificationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useGamification hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useGamification());
      }).toThrow('useGamification must be used within a GamificationProvider');

      consoleSpy.mockRestore();
    });

    it('should return all required properties', () => {
      const TestProvider = createTestProvider();
      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      expect(result.current).toHaveProperty('userProgress');
      expect(result.current).toHaveProperty('userBadges');
      expect(result.current).toHaveProperty('userMissions');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('xpNotifications');
    });

    it('should return all required functions', () => {
      const TestProvider = createTestProvider();
      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      expect(typeof result.current.addXPNotification).toBe('function');
      expect(typeof result.current.clearXPNotification).toBe('function');
      expect(typeof result.current.refreshUserProgress).toBe('function');
      expect(typeof result.current.refreshUserBadges).toBe('function');
      expect(typeof result.current.refreshUserMissions).toBe('function');
      expect(typeof result.current.awardXP).toBe('function');
      expect(typeof result.current.getLevelName).toBe('function');
      expect(typeof result.current.getLevelIcon).toBe('function');
      expect(typeof result.current.getXPForNextLevel).toBe('function');
      expect(typeof result.current.getProgressToNextLevel).toBe('function');
    });
  });

  describe('XP Notifications', () => {
    it('should add XP notification', () => {
      const TestProvider = createTestProvider();
      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      expect(result.current.xpNotifications.length).toBe(0);

      act(() => {
        result.current.addXPNotification(50, 'Test action');
      });

      expect(result.current.xpNotifications.length).toBe(1);
      expect(result.current.xpNotifications[0].xpAmount).toBe(50);
      expect(result.current.xpNotifications[0].reason).toBe('Test action');
    });

    it('should add multiple XP notifications', () => {
      const TestProvider = createTestProvider();
      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.addXPNotification(50, 'First');
        result.current.addXPNotification(100, 'Second');
      });

      expect(result.current.xpNotifications.length).toBe(2);
      expect(result.current.xpNotifications[0].reason).toBe('First');
      expect(result.current.xpNotifications[1].reason).toBe('Second');
    });

    it('should clear specific XP notification by timestamp', () => {
      // Mock Date.now to return different values
      let mockTime = 1000;
      vi.spyOn(Date, 'now').mockImplementation(() => mockTime++);

      const TestProvider = createTestProvider();
      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      act(() => {
        result.current.addXPNotification(50, 'First');
        result.current.addXPNotification(100, 'Second');
      });

      expect(result.current.xpNotifications.length).toBe(2);

      // First notification should have timestamp 1000, second should have 1001
      const firstTimestamp = result.current.xpNotifications[0].timestamp;

      act(() => {
        result.current.clearXPNotification(firstTimestamp);
      });

      expect(result.current.xpNotifications.length).toBe(1);
      expect(result.current.xpNotifications[0].reason).toBe('Second');

      vi.restoreAllMocks();
    });
  });

  describe('Level Helpers', () => {
    it('should return correct level names', () => {
      const TestProvider = createTestProvider();
      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      expect(result.current.getLevelName(1)).toBe('Newbie');
      expect(result.current.getLevelName(2)).toBe('Explorer');
      expect(result.current.getLevelName(3)).toBe('Regular');
      expect(result.current.getLevelName(4)).toBe('Insider');
      expect(result.current.getLevelName(5)).toBe('VIP');
      expect(result.current.getLevelName(6)).toBe('Legend');
      expect(result.current.getLevelName(7)).toBe('Ambassador');
    });

    it('should return Unknown for invalid level', () => {
      const TestProvider = createTestProvider();
      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      expect(result.current.getLevelName(0)).toBe('Unknown');
      expect(result.current.getLevelName(99)).toBe('Unknown');
    });

    it('should return correct level icons', () => {
      const TestProvider = createTestProvider();
      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      expect(result.current.getLevelIcon(1)).toBe('🌱');
      expect(result.current.getLevelIcon(5)).toBe('💎');
      expect(result.current.getLevelIcon(7)).toBe('👑');
    });

    it('should return ? for invalid level icon', () => {
      const TestProvider = createTestProvider();
      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      expect(result.current.getLevelIcon(99)).toBe('❓');
    });

    it('should return correct XP for next level', () => {
      const TestProvider = createTestProvider();
      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      expect(result.current.getXPForNextLevel(1)).toBe(100);
      expect(result.current.getXPForNextLevel(2)).toBe(300);
      expect(result.current.getXPForNextLevel(3)).toBe(700);
      expect(result.current.getXPForNextLevel(6)).toBe(6000);
    });

    it('should return 0 XP for max level', () => {
      const TestProvider = createTestProvider();
      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      expect(result.current.getXPForNextLevel(7)).toBe(0);
    });

    it('should calculate progress to next level correctly', () => {
      const TestProvider = createTestProvider();
      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      // Level 1: 0-100 XP, at 50 XP = 50%
      expect(result.current.getProgressToNextLevel(50, 1)).toBe(50);

      // Level 2: 100-300 XP, at 200 XP = 50%
      expect(result.current.getProgressToNextLevel(200, 2)).toBe(50);

      // At start of level 2: 100 XP = 0%
      expect(result.current.getProgressToNextLevel(100, 2)).toBe(0);

      // Almost at level 3: 299 XP ≈ 99.5%
      expect(result.current.getProgressToNextLevel(299, 2)).toBeCloseTo(99.5, 0);
    });

    it('should return 100% for max level', () => {
      const TestProvider = createTestProvider();
      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      expect(result.current.getProgressToNextLevel(10000, 7)).toBe(100);
    });
  });

  describe('Initial state', () => {
    it('should provide correct initial values', () => {
      const TestProvider = createTestProvider({
        loading: false,
        userProgress: null,
        userBadges: [],
        userMissions: [],
      });

      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.userProgress).toBe(null);
      expect(result.current.userBadges).toEqual([]);
      expect(result.current.userMissions).toEqual([]);
      expect(result.current.xpNotifications).toEqual([]);
    });

    it('should reflect provided user progress', () => {
      const mockProgress: UserProgress = {
        id: 'progress-1',
        user_id: 'user-1',
        total_xp: 500,
        current_level: 3,
        monthly_xp: 200,
        current_streak_days: 5,
        longest_streak_days: 10,
        last_activity_date: '2024-01-01',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const TestProvider = createTestProvider({
        userProgress: mockProgress,
      });

      const { result } = renderHook(() => useGamification(), {
        wrapper: TestProvider,
      });

      expect(result.current.userProgress).toEqual(mockProgress);
      expect(result.current.userProgress?.total_xp).toBe(500);
      expect(result.current.userProgress?.current_level).toBe(3);
    });
  });
});
