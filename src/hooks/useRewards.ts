import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';

export interface Reward {
  id: string;
  name: string;
  description: string;
  unlock_type: 'level' | 'xp' | 'badge' | 'achievement';
  unlock_value: number | null;
  unlock_badge_id: string | null;
  category: 'feature' | 'cosmetic' | 'title';
  icon: string;
  is_unlocked: boolean;
  unlocked_at: string | null;
  claimed: boolean;
  claimed_at: string | null;
}

export interface UserRewardsData {
  rewards: Reward[];
  currentLevel: number;
  totalXp: number;
}

interface UseRewardsReturn {
  data: UserRewardsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  claimReward: (rewardId: string) => Promise<boolean>;
}

export const useRewards = (): UseRewardsReturn => {
  const [data, setData] = useState<UserRewardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/gamification/my-rewards', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch rewards: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch rewards';
      logger.error('Error fetching rewards:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const claimReward = useCallback(async (rewardId: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Get CSRF token
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

      const response = await fetch(`/api/gamification/claim-reward/${rewardId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to claim reward');
      }

      // Refetch to update the list
      await fetchRewards();
      return true;
    } catch (err) {
      logger.error('Error claiming reward:', err);
      return false;
    }
  }, [fetchRewards]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  return {
    data,
    loading,
    error,
    refetch: fetchRewards,
    claimReward,
  };
};

// Helper function to get level name
export const getLevelName = (level: number): string => {
  const levelNames: Record<number, string> = {
    1: 'Newbie',
    2: 'Explorer',
    3: 'Regular',
    4: 'Insider',
    5: 'VIP',
    6: 'Legend',
    7: 'Ambassador',
  };
  return levelNames[level] || 'Unknown';
};

// Helper to calculate XP needed for next level
export const getXPForNextLevel = (currentLevel: number): number => {
  const xpThresholds: Record<number, number> = {
    1: 100,    // Level 1 → 2
    2: 250,    // Level 2 → 3
    3: 500,    // Level 3 → 4
    4: 1000,   // Level 4 → 5
    5: 2000,   // Level 5 → 6
    6: 5000,   // Level 6 → 7
    7: Infinity, // Max level
  };
  return xpThresholds[currentLevel] || Infinity;
};

// Helper to get previous level XP threshold
export const getXPForCurrentLevel = (currentLevel: number): number => {
  const xpThresholds: Record<number, number> = {
    1: 0,
    2: 100,
    3: 250,
    4: 500,
    5: 1000,
    6: 2000,
    7: 5000,
  };
  return xpThresholds[currentLevel] || 0;
};
