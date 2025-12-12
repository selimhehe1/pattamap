/**
 * @vitest-environment jsdom
 */
/**
 * Tests for RewardsShowcase component
 * Using Vitest syntax
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen as _screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import RewardsShowcase from '../RewardsShowcase';

// Mock useRewards hook
const mockClaimReward = vi.fn();
const mockUseRewards = vi.fn();

vi.mock('../../../hooks/useRewards', () => ({
  useRewards: () => mockUseRewards(),
  default: () => mockUseRewards(),
  getLevelName: (level: number) => {
    const names: Record<number, string> = {
      1: 'Newbie', 2: 'Explorer', 3: 'Regular', 4: 'Insider', 5: 'VIP', 6: 'Legend', 7: 'Ambassador'
    };
    return names[level] || 'Unknown';
  },
  getXPForNextLevel: (level: number) => {
    const thresholds: Record<number, number> = {
      1: 100, 2: 250, 3: 500, 4: 1000, 5: 2000, 6: 5000, 7: Infinity
    };
    return thresholds[level] || Infinity;
  },
  getXPForCurrentLevel: (level: number) => {
    const thresholds: Record<number, number> = {
      1: 0, 2: 100, 3: 250, 4: 500, 5: 1000, 6: 2000, 7: 5000
    };
    return thresholds[level] || 0;
  },
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | object) => {
      if (typeof fallback === 'string') return fallback;
      if (typeof fallback === 'object' && 'defaultValue' in fallback) return (fallback as any).defaultValue;
      return key.split('.').pop();
    },
  }),
}));

describe('RewardsShowcase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClaimReward.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render loading skeleton', () => {
    mockUseRewards.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      claimReward: mockClaimReward,
    });

    render(<RewardsShowcase />);

    expect(document.querySelector('.rewards-showcase--loading')).not.toBeNull();
    expect(document.querySelectorAll('.reward-card--skeleton').length).toBe(6);
  });

  it('should render error state', () => {
    mockUseRewards.mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed to load',
      claimReward: mockClaimReward,
    });

    render(<RewardsShowcase />);

    expect(document.querySelector('.rewards-showcase--error')).not.toBeNull();
  });

  it('should render unlocked rewards', () => {
    const mockData = {
      rewards: [
        {
          id: 'r1',
          name: 'photo_upload',
          description: 'Upload photos',
          unlock_type: 'level',
          unlock_value: 2,
          category: 'feature',
          icon: '📸',
          is_unlocked: true,
          claimed: false,
        },
        {
          id: 'r2',
          name: 'custom_title',
          description: 'Custom title',
          unlock_type: 'level',
          unlock_value: 3,
          category: 'cosmetic',
          icon: '🏷️',
          is_unlocked: true,
          claimed: true,
        },
      ],
      currentLevel: 4,
      totalXp: 600,
    };

    mockUseRewards.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      claimReward: mockClaimReward,
    });

    render(<RewardsShowcase />);

    // Check unlocked rewards are rendered
    expect(document.querySelectorAll('.reward-card--unlocked').length).toBe(2);
  });

  it('should render locked rewards', () => {
    const mockData = {
      rewards: [
        {
          id: 'r1',
          name: 'photo_upload',
          description: 'Upload photos',
          unlock_type: 'level',
          unlock_value: 2,
          category: 'feature',
          icon: '📸',
          is_unlocked: true,
          claimed: true,
        },
        {
          id: 'r2',
          name: 'vip_badge',
          description: 'VIP Badge',
          unlock_type: 'level',
          unlock_value: 5,
          category: 'cosmetic',
          icon: '👑',
          is_unlocked: false,
          claimed: false,
        },
      ],
      currentLevel: 3,
      totalXp: 350,
    };

    mockUseRewards.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      claimReward: mockClaimReward,
    });

    render(<RewardsShowcase />);

    // Check locked reward is rendered
    expect(document.querySelectorAll('.reward-card--locked').length).toBe(1);
  });

  it('should filter by category', () => {
    const mockData = {
      rewards: [
        {
          id: 'r1',
          name: 'feature_1',
          description: 'Feature',
          unlock_type: 'level',
          unlock_value: 2,
          category: 'feature',
          icon: '⚙️',
          is_unlocked: true,
          claimed: true,
        },
        {
          id: 'r2',
          name: 'cosmetic_1',
          description: 'Cosmetic',
          unlock_type: 'level',
          unlock_value: 3,
          category: 'cosmetic',
          icon: '✨',
          is_unlocked: true,
          claimed: true,
        },
        {
          id: 'r3',
          name: 'title_1',
          description: 'Title',
          unlock_type: 'level',
          unlock_value: 4,
          category: 'title',
          icon: '🏷️',
          is_unlocked: true,
          claimed: true,
        },
      ],
      currentLevel: 5,
      totalXp: 1000,
    };

    mockUseRewards.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      claimReward: mockClaimReward,
    });

    render(<RewardsShowcase />);

    // Initially all should be shown
    expect(document.querySelectorAll('.reward-card').length).toBeGreaterThanOrEqual(3);

    // Click features filter
    const filterButtons = document.querySelectorAll('.filter-btn');
    fireEvent.click(filterButtons[1]); // Features button

    // Feature filter should be active
    expect(filterButtons[1].classList.contains('filter-btn--active')).toBe(true);
  });

  it('should show level progress bar', () => {
    const mockData = {
      rewards: [],
      currentLevel: 5,
      totalXp: 1200, // Level 5
    };

    mockUseRewards.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      claimReward: mockClaimReward,
    });

    render(<RewardsShowcase />);

    expect(document.querySelector('.xp-progress-bar')).not.toBeNull();
    expect(document.querySelector('.xp-progress-bar__fill')).not.toBeNull();
    expect(document.querySelector('.level-number')).not.toBeNull();
    expect(document.querySelector('.level-name')).not.toBeNull();
  });

  it('should handle claim button click', async () => {
    const mockData = {
      rewards: [
        {
          id: 'r1',
          name: 'test_reward',
          description: 'Test',
          unlock_type: 'level',
          unlock_value: 2,
          category: 'feature',
          icon: '🎁',
          is_unlocked: true,
          claimed: false,
        },
      ],
      currentLevel: 3,
      totalXp: 300,
    };

    mockClaimReward.mockResolvedValueOnce(true);
    mockUseRewards.mockReturnValue({
      data: mockData,
      loading: false,
      error: null,
      claimReward: mockClaimReward,
    });

    render(<RewardsShowcase />);

    const claimButton = document.querySelector('.reward-card__claim-btn');
    expect(claimButton).not.toBeNull();

    fireEvent.click(claimButton!);

    await waitFor(() => {
      expect(mockClaimReward).toHaveBeenCalledWith('r1');
    });
  });
});
