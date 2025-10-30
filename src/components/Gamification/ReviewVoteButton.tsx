import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useGamification } from '../../contexts/GamificationContext';
import './ReviewVoteButton.css';

interface ReviewVoteButtonProps {
  reviewId: string;
  reviewAuthorId: string;
  initialVoteCount?: number;
  initialHasVoted?: boolean;
  compact?: boolean;
  showCount?: boolean;
  onVoteChange?: (voteCount: number, hasVoted: boolean) => void;
}

const ReviewVoteButton: React.FC<ReviewVoteButtonProps> = ({
  reviewId,
  reviewAuthorId,
  initialVoteCount = 0,
  initialHasVoted = false,
  compact = false,
  showCount = true,
  onVoteChange
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { awardXP, refreshUserProgress } = useGamification();
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial vote status
  useEffect(() => {
    if (user) {
      fetchVoteStatus();
    }
  }, [user, reviewId]);

  const fetchVoteStatus = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/gamification/reviews/${reviewId}/votes/status`,
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setVoteCount(data.voteCount);
        setHasVoted(data.hasVoted);
      }
    } catch (err) {
      console.error('Error fetching vote status:', err);
    }
  };

  const handleToggleVote = async () => {
    if (!user) {
      setError(t('gamification.votes.loginRequired'));
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (user.id === reviewAuthorId) {
      setError(t('gamification.votes.cannotVoteSelf'));
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/gamification/reviews/${reviewId}/vote`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('gamification.votes.failed'));
      }

      const data = await response.json();

      // Update state
      const newHasVoted = !hasVoted;
      setHasVoted(newHasVoted);
      setVoteCount(data.voteCount);

      // Award XP to review author (only when voting, not unvoting)
      if (newHasVoted && data.xpAwarded) {
        // Note: XP is awarded to review author via backend, not the voter
        await refreshUserProgress();
      }

      // Notify parent component
      if (onVoteChange) {
        onVoteChange(data.voteCount, newHasVoted);
      }
    } catch (err: any) {
      setError(err.message || t('gamification.votes.failed'));
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`review-vote-container ${compact ? 'review-vote-compact' : ''}`}>
      <button
        onClick={handleToggleVote}
        disabled={loading || !user}
        className={`review-vote-button ${hasVoted ? 'review-vote-active' : ''} ${loading ? 'review-vote-loading' : ''}`}
        title={hasVoted ? t('gamification.votes.remove') : t('gamification.votes.markHelpful')}
      >
        {loading ? (
          <span className="review-vote-spinner" />
        ) : (
          <>
            <span className="review-vote-icon">👍</span>
            {showCount && (
              <span className="review-vote-count">
                {voteCount > 0 ? voteCount : (compact ? '' : '0')}
              </span>
            )}
            {!compact && <span className="review-vote-label">{t('gamification.votes.helpful')}</span>}
          </>
        )}
      </button>

      {/* Error Tooltip */}
      {error && (
        <div className="review-vote-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default ReviewVoteButton;
