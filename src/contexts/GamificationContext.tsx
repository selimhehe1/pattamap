import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { logger } from '../utils/logger';

// ========================================
// TYPES
// ========================================

export interface UserProgress {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  monthly_xp: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date: string;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  category: 'exploration' | 'contribution' | 'social' | 'quality' | 'temporal' | 'secret';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement_type: string;
  requirement_value: number;
  is_active: boolean;
  is_hidden: boolean;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge: Badge;
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'event' | 'narrative';
  xp_reward: number;
  badge_reward?: string;
  reset_frequency?: string;
  start_date?: string;
  end_date?: string;
  requirements: Record<string, any>;
  is_active: boolean;
}

export interface UserMissionProgress {
  id: string;
  user_id: string;
  mission_id: string;
  progress: number;
  completed: boolean;
  completed_at?: string;
  mission: Mission;
}

export interface XPNotification {
  xpAmount: number;
  reason: string;
  timestamp: number;
}

interface GamificationContextType {
  // User Progress
  userProgress: UserProgress | null;
  userBadges: UserBadge[];
  userMissions: UserMissionProgress[];
  loading: boolean;

  // XP Notifications (for toast animations)
  xpNotifications: XPNotification[];
  addXPNotification: (xp: number, reason: string) => void;
  clearXPNotification: (timestamp: number) => void;

  // Functions
  refreshUserProgress: () => Promise<void>;
  refreshUserBadges: () => Promise<void>;
  refreshUserMissions: () => Promise<void>;
  awardXP: (xpAmount: number, reason: string, entityType?: string, entityId?: string) => Promise<void>;

  // Helper functions
  getLevelName: (level: number) => string;
  getLevelIcon: (level: number) => string;
  getXPForNextLevel: (currentLevel: number) => number;
  getProgressToNextLevel: (currentXP: number, currentLevel: number) => number;
}

// Export context for testing
export const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

// Level configuration - defined outside component to prevent dependency issues
const LEVEL_CONFIG = [
  { level: 1, name: 'Newbie', icon: '🌱', minXP: 0 },
  { level: 2, name: 'Explorer', icon: '🗺️', minXP: 100 },
  { level: 3, name: 'Regular', icon: '🍻', minXP: 300 },
  { level: 4, name: 'Insider', icon: '🌟', minXP: 700 },
  { level: 5, name: 'VIP', icon: '💎', minXP: 1500 },
  { level: 6, name: 'Legend', icon: '🏆', minXP: 3000 },
  { level: 7, name: 'Ambassador', icon: '👑', minXP: 6000 }
];

interface GamificationProviderProps {
  children: ReactNode;
}

export const GamificationProvider: React.FC<GamificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [userMissions, setUserMissions] = useState<UserMissionProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [xpNotifications, setXPNotifications] = useState<XPNotification[]>([]);

  // ========================================
  // XP NOTIFICATIONS (for toast animations)
  // ========================================

  const addXPNotification = useCallback((xp: number, reason: string) => {
    const notification: XPNotification = {
      xpAmount: xp,
      reason,
      timestamp: Date.now()
    };
    setXPNotifications((prev) => [...prev, notification]);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      clearXPNotification(notification.timestamp);
    }, 3000);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clearXPNotification is stable (useCallback with no deps)
  }, []);

  const clearXPNotification = useCallback((timestamp: number) => {
    setXPNotifications((prev) => prev.filter((n) => n.timestamp !== timestamp));
  }, []);

  // ========================================
  // LEVEL HELPERS
  // ========================================

  const getLevelName = useCallback((level: number): string => {
    return LEVEL_CONFIG.find((l) => l.level === level)?.name || 'Unknown';
  }, []);

  const getLevelIcon = useCallback((level: number): string => {
    return LEVEL_CONFIG.find((l) => l.level === level)?.icon || '❓';
  }, []);

  const getXPForNextLevel = useCallback((currentLevel: number): number => {
    if (currentLevel >= 7) return 0; // Max level
    return LEVEL_CONFIG.find((l) => l.level === currentLevel + 1)?.minXP || 0;
  }, []);

  const getProgressToNextLevel = useCallback((currentXP: number, currentLevel: number): number => {
    if (currentLevel >= 7) return 100; // Max level
    const currentLevelXP = LEVEL_CONFIG.find((l) => l.level === currentLevel)?.minXP || 0;
    const nextLevelXP = getXPForNextLevel(currentLevel);
    const progress = ((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  }, [getXPForNextLevel]);

  // ========================================
  // FETCH USER PROGRESS
  // ========================================

  const refreshUserProgress = useCallback(async () => {
    if (!user) {
      setUserProgress(null);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/gamification/my-progress`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserProgress(data);
        logger.debug('User progress fetched:', data);
      } else {
        logger.error('Failed to fetch user progress:', response.statusText);
      }
    } catch (error) {
      logger.error('Error fetching user progress:', error);
    }
  }, [user]);

  // ========================================
  // FETCH USER BADGES
  // ========================================

  const refreshUserBadges = useCallback(async () => {
    if (!user) {
      setUserBadges([]);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/gamification/my-badges`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserBadges(data.userBadges || []);
        logger.debug('User badges fetched:', data.userBadges?.length || 0);
      } else {
        logger.error('Failed to fetch user badges:', response.statusText);
      }
    } catch (error) {
      logger.error('Error fetching user badges:', error);
    }
  }, [user]);

  // ========================================
  // FETCH USER MISSIONS
  // ========================================

  const refreshUserMissions = useCallback(async () => {
    if (!user) {
      setUserMissions([]);
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/gamification/my-missions`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserMissions(data.missionProgress || []);
        logger.debug('User missions fetched:', data.missionProgress?.length || 0);
      } else {
        logger.error('Failed to fetch user missions:', response.statusText);
      }
    } catch (error) {
      logger.error('Error fetching user missions:', error);
    }
  }, [user]);

  // ========================================
  // AWARD XP
  // ========================================

  const awardXP = useCallback(async (
    xpAmount: number,
    reason: string,
    entityType?: string,
    entityId?: string
  ) => {
    if (!user) return;

    // Save current level before refresh
    const previousLevel = userProgress?.current_level || 1;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/gamification/award-xp`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.cookie
            .split('; ')
            .find((row) => row.startsWith('csrf-token='))
            ?.split('=')[1] || ''
        },
        body: JSON.stringify({
          userId: user.id,
          xpAmount,
          reason,
          entityType,
          entityId
        })
      });

      if (response.ok) {
        const data = await response.json();
        logger.debug('XP awarded:', data);

        // Show XP notification
        addXPNotification(xpAmount, reason);

        // Refresh user progress
        try {
          await refreshUserProgress();
        } catch (refreshError) {
          logger.error('Failed to refresh user progress after XP award:', refreshError);
          // Continue even if refresh fails - XP was still awarded
        }

        // Check for level up
        try {
          const newProgress = await fetch(`${import.meta.env.VITE_API_URL}/api/gamification/my-progress`, {
            credentials: 'include'
          }).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          });

          if (newProgress && newProgress.userProgress && newProgress.userProgress.current_level > previousLevel) {
            const newLevel = newProgress.userProgress.current_level;
            const levelName = getLevelName(newLevel);
            const levelIcon = getLevelIcon(newLevel);

            // Show special level-up notification
            addXPNotification(0, `level_up:${newLevel}:${levelName}:${levelIcon}`);
            logger.info(`🎉 Level Up! ${previousLevel} → ${newLevel} (${levelName})`);
          }
        } catch (levelCheckError) {
          logger.error('Failed to check level-up:', levelCheckError);
          // Continue - level up notification is nice-to-have
        }

        // Check for new badges (could be done server-side)
        try {
          await refreshUserBadges();
        } catch (badgeError) {
          logger.error('Failed to refresh badges after XP award:', badgeError);
          // Continue - badges refresh is not critical
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        logger.error('Failed to award XP:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        // Don't show XP notification if award failed
      }
    } catch (error) {
      logger.error('Error awarding XP:', error);
      // Network error or other issue - user should know XP might not have been awarded
      if (error instanceof Error) {
        logger.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
    }
  }, [user, userProgress, addXPNotification, refreshUserProgress, refreshUserBadges, getLevelName, getLevelIcon]);

  // ========================================
  // INITIAL DATA FETCH
  // ========================================

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await Promise.all([
          refreshUserProgress(),
          refreshUserBadges(),
          refreshUserMissions()
        ]);
      } catch (error) {
        logger.error('Error fetching initial gamification data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user, refreshUserProgress, refreshUserBadges, refreshUserMissions]);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const value: GamificationContextType = {
    userProgress,
    userBadges,
    userMissions,
    loading,
    xpNotifications,
    addXPNotification,
    clearXPNotification,
    refreshUserProgress,
    refreshUserBadges,
    refreshUserMissions,
    awardXP,
    getLevelName,
    getLevelIcon,
    getXPForNextLevel,
    getProgressToNextLevel
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
};

// ========================================
// CUSTOM HOOK
// ========================================

export const useGamification = (): GamificationContextType => {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
};
