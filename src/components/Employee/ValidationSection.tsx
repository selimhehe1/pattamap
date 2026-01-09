import React, { useEffect, createElement } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Lock, ThumbsUp, ThumbsDown, Loader2, PartyPopper, Star, AlertTriangle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import notification from '../../utils/notification';
import '../../styles/features/employee/ValidationSection.css';

interface ValidationSectionProps {
  employeeId: string;
}

interface ValidationStats {
  totalVotes: number;
  existsVotes: number;
  notExistsVotes: number;
  validationPercentage: number;
  badgeType: '?' | 'neutral' | 'warning';
  userVote: 'exists' | 'not_exists' | null;
}

interface VoteResponse {
  success: boolean;
  stats: ValidationStats;
  xpAwarded?: number;
}

/**
 * Unified Validation Section Component
 * Combines badge display and vote buttons in a single component
 *
 * Behavior:
 * - If user hasn't voted: Shows vote buttons (thumbs up/down)
 * - If user has voted: Shows compact stats badge only
 * - Dynamic coloring based on validation ratio
 *
 * Version: v11.0
 * Date: 2025-01-08
 */
const ValidationSection: React.FC<ValidationSectionProps> = ({ employeeId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
  const queryClient = useQueryClient();

  // Fetch validation stats
  const { data: stats, isPending, isFetching } = useQuery<ValidationStats>({
    queryKey: ['validation-stats', employeeId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/employees/${employeeId}/validation-stats`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch validation stats');
      }
      return response.json();
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always'
  });

  // Vote mutation
  const voteMutation = useMutation<VoteResponse, Error, 'exists' | 'not_exists'>({
    mutationFn: async (voteType: 'exists' | 'not_exists') => {
      const response = await secureFetch(
        `${import.meta.env.VITE_API_URL}/api/employees/${employeeId}/validation-vote`,
        {
          method: 'POST',
          body: JSON.stringify({ voteType })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit vote');
      }

      return response.json();
    },
    onSuccess: (data: VoteResponse) => {
      queryClient.invalidateQueries({ queryKey: ['validation-stats', employeeId] });

      notification.success(t('validation.thanksForVote'), {
        icon: createElement(PartyPopper, { size: 20, color: '#ffffff' })
      });

      if (data.xpAwarded) {
        notification.success(`+${data.xpAwarded} XP`, {
          icon: createElement(Star, { size: 20, color: '#FFD700' }),
          duration: 2000
        });
      }
    },
    onError: (error: Error) => {
      if (error.message === 'You have already voted on this profile') {
        queryClient.invalidateQueries({ queryKey: ['validation-stats', employeeId] });
        notification.error(t('validation.alreadyVoted'), {
          icon: createElement(AlertTriangle, { size: 20, color: '#ffffff' })
        });
      } else {
        notification.error(t('validation.voteFailed'), {
          icon: createElement(XCircle, { size: 20, color: '#ffffff' })
        });
      }
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voteMutation.reset();
      queryClient.invalidateQueries({ queryKey: ['validation-stats', employeeId] });
    };
  }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const userVote = stats?.userVote;
  const hasVoted = !!userVote;
  const isVoting = voteMutation.isPending;
  const isDisabled = isFetching || isVoting || hasVoted;

  // Vote handler
  const handleVote = (voteType: 'exists' | 'not_exists'): void => {
    if (hasVoted) {
      notification.info(t('validation.alreadyVoted'), {
        icon: createElement(AlertTriangle, { size: 20, color: '#ffffff' })
      });
      return;
    }

    if (isVoting || isFetching) {
      return;
    }

    voteMutation.mutate(voteType);
  };

  // Determine validation status for styling
  const getValidationStatus = (): 'positive' | 'negative' | 'neutral' => {
    if (!stats || stats.totalVotes < 5) return 'neutral';
    if (stats.validationPercentage >= 70) return 'positive';
    if (stats.validationPercentage <= 30) return 'negative';
    return 'neutral';
  };

  const validationStatus = getValidationStatus();

  // Loading state
  if (isPending) {
    return (
      <div className="validation-section validation-section--loading">
        <Loader2 size={16} className="validation-spinner" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  // User not authenticated - show login prompt
  if (!user) {
    return (
      <a href="/login" className="validation-section validation-section--login-required">
        <Lock size={16} />
        <span>{t('validation.loginToVote')}</span>
      </a>
    );
  }

  // User has already voted - show compact stats only
  if (hasVoted && stats) {
    return (
      <div className={`validation-section validation-section--stats validation-section--${validationStatus}`}>
        <div className="validation-stats">
          <span className="stat stat--positive" title={t('validation.voteExists')}>
            <ThumbsUp size={14} />
            <span className="stat-count">{stats.existsVotes}</span>
          </span>
          <span className="stat-separator">|</span>
          <span className="stat stat--negative" title={t('validation.voteNotExists')}>
            <ThumbsDown size={14} />
            <span className="stat-count">{stats.notExistsVotes}</span>
          </span>
        </div>
        {validationStatus === 'negative' && (
          <div className="validation-warning">
            <AlertTriangle size={12} />
            <span>{t('validation.lowValidation', 'Low validation')}</span>
          </div>
        )}
      </div>
    );
  }

  // User hasn't voted - show vote buttons
  return (
    <div className="validation-section validation-section--vote">
      <p className="vote-prompt">{t('validation.helpCommunityInfo')}</p>

      <div className="vote-buttons">
        <button
          onClick={() => handleVote('exists')}
          className="vote-btn vote-btn--positive"
          disabled={isDisabled}
          aria-label={t('validation.voteExists')}
        >
          {isFetching || isVoting ? (
            <Loader2 size={18} className="validation-spinner" />
          ) : (
            <ThumbsUp size={18} />
          )}
          <span>{t('validation.voteExists')}</span>
        </button>

        <button
          onClick={() => handleVote('not_exists')}
          className="vote-btn vote-btn--negative"
          disabled={isDisabled}
          aria-label={t('validation.voteNotExists')}
        >
          {isFetching || isVoting ? (
            <Loader2 size={18} className="validation-spinner" />
          ) : (
            <ThumbsDown size={18} />
          )}
          <span>{t('validation.voteNotExists')}</span>
        </button>
      </div>

      {stats && (
        <div className="current-stats">
          <span className="stat stat--positive">
            <ThumbsUp size={12} /> {stats.existsVotes}
          </span>
          <span className="stat-separator">|</span>
          <span className="stat stat--negative">
            <ThumbsDown size={12} /> {stats.notExistsVotes}
          </span>
        </div>
      )}
    </div>
  );
};

export default ValidationSection;
