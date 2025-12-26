import React, { useState, useEffect } from 'react';
import { AlertTriangle, Lock, Check, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useGamification } from '../../contexts/GamificationContext';
import { logger } from '../../utils/logger';
import './FollowButton.css';

interface FollowButtonProps {
  targetUserId: string;
  targetUsername: string;
  initialIsFollowing?: boolean;
  initialFollowerCount?: number;
  compact?: boolean;
  showCount?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  targetUserId,
  targetUsername,
  initialIsFollowing = false,
  initialFollowerCount = 0,
  compact = false,
  showCount = true,
  onFollowChange
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { awardXP, refreshUserProgress } = useGamification();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial follow status
  useEffect(() => {
    const fetchFollowStatus = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/gamification/following/${targetUserId}/status`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.isFollowing);
          setFollowerCount(data.followerCount);
        }
      } catch (err) {
        logger.error('Error fetching follow status:', err);
      }
    };

    if (user && user.id !== targetUserId) {
      fetchFollowStatus();
    }
  }, [user, targetUserId]);

  const handleToggleFollow = async () => {
    if (!user) {
      setError(t('gamification.follow.loginRequired'));
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (user.id === targetUserId) {
      setError(t('gamification.follow.cannotFollowSelf'));
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = isFollowing
        ? `${import.meta.env.VITE_API_URL}/api/gamification/unfollow/${targetUserId}`
        : `${import.meta.env.VITE_API_URL}/api/gamification/follow/${targetUserId}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('gamification.follow.failed'));
      }

      const data = await response.json();

      // Update state
      const newIsFollowing = !isFollowing;
      setIsFollowing(newIsFollowing);
      setFollowerCount(prev => newIsFollowing ? prev + 1 : Math.max(0, prev - 1));

      // Award XP for following (only when following, not unfollowing)
      if (newIsFollowing && data.xpAwarded) {
        await awardXP(data.xpAwarded, 'follow_user', 'user', targetUserId);
      }

      // Refresh user progress
      await refreshUserProgress();

      // Notify parent component
      if (onFollowChange) {
        onFollowChange(newIsFollowing);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage || t('gamification.follow.failed'));
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Don't show button if viewing own profile
  if (user && user.id === targetUserId) {
    return null;
  }

  return (
    <div className={`follow-button-container ${compact ? 'follow-compact' : ''}`}>
      <button
        onClick={handleToggleFollow}
        disabled={loading || !user}
        className={`follow-button ${isFollowing ? 'follow-button-following' : ''} ${loading ? 'follow-loading' : ''}`}
      >
        {loading ? (
          <>
            <span className="follow-spinner" />
            <span>{compact ? '...' : t('gamification.follow.loading')}</span>
          </>
        ) : (
          <>
            <span className="follow-icon">{isFollowing ? <Check size={14} /> : <Plus size={14} />}</span>
            <span>
              {compact
                ? (isFollowing ? t('gamification.follow.following') : t('gamification.follow.follow'))
                : (isFollowing ? t('gamification.follow.following') : t('gamification.follow.followUser', { username: targetUsername }))
              }
            </span>
            {showCount && followerCount > 0 && (
              <span className="follow-count">{followerCount}</span>
            )}
          </>
        )}
      </button>

      {/* Error Tooltip */}
      {error && (
        <div className="follow-error-tooltip">
          <span className="follow-error-icon"><AlertTriangle size={14} /></span>
          <span>{error}</span>
        </div>
      )}

      {/* Login Hint */}
      {!user && (
        <div className="follow-hint">
          <span><Lock size={14} /></span>
          <span>{t('gamification.follow.loginRequired')}</span>
        </div>
      )}
    </div>
  );
};

export default FollowButton;
