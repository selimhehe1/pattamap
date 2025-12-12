import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import toast from '../../utils/toast';
import './ValidationVoteButtons.css';

interface ValidationVoteButtonsProps {
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
 * Validation Vote Buttons Component
 * Allows users to vote on employee profile existence
 *
 * Version: v10.3
 * Date: 2025-01-19
 */
const ValidationVoteButtons: React.FC<ValidationVoteButtonsProps> = ({ employeeId }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
  const queryClient = useQueryClient();

  // Fetch current stats (includes user's vote if authenticated) - React Query v5 syntax
  const { data: stats, isFetching } = useQuery<ValidationStats>({
    queryKey: ['validation-stats', employeeId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/employees/${employeeId}/validation-stats`,
        {
          credentials: 'include' // Include cookies for auth check
        }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch validation stats');
      }
      return response.json();
    },
    enabled: !!user, // Only fetch if user is authenticated
    staleTime: 60 * 1000, // Cache for 1 minute to reduce unnecessary refetches
    refetchOnMount: 'always', // Force refetch on every mount to avoid stale cache
    gcTime: 5 * 60 * 1000
  });

  // Vote mutation - React Query v5 syntax
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
      // Invalidate stats query to refresh badge
      queryClient.invalidateQueries({ queryKey: ['validation-stats', employeeId] });

      // Show success toast
      toast.success(t('validation.thanksForVote'), {
        icon: '🎉'
      });

      // Optional: Show XP award notification
      if (data.xpAwarded) {
        toast.success(`+${data.xpAwarded} XP`, {
          icon: '⭐',
          duration: 2000
        });
      }
    },
    onError: (error: Error) => {
      if (error.message === 'You have already voted on this profile') {
        // Immediately refetch stats to sync cache with server state
        queryClient.invalidateQueries({ queryKey: ['validation-stats', employeeId] });

        toast.error(t('validation.alreadyVoted'), {
          icon: '⚠️'
        });
      } else {
        toast.error(t('validation.voteFailed'), {
          icon: '❌'
        });
      }
    }
  });

  // Reset mutation state when employeeId changes (navigating to different profile)
  useEffect(() => {
    return () => {
      // Reset mutation state
      voteMutation.reset();
      // Invalidate queries to ensure fresh data on next mount
      queryClient.invalidateQueries({ queryKey: ['validation-stats', employeeId] });
    };
  }, [employeeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // User not authenticated
  if (!user) {
    return (
      <div className="validation-vote-buttons validation-login-required">
        <p className="login-prompt">
          🔒 {t('validation.loginToVote')}
        </p>
      </div>
    );
  }

  const userVote = stats?.userVote;
  const isVoting = voteMutation.isPending;
  // Use only userVote as source of truth (don't use voteMutation.isSuccess which persists too long)
  const hasVoted = !!userVote;
  const isDisabled = isFetching || isVoting || hasVoted;

  // Vote handler - blocks immediately if already voted (prevents 409 error)
  const handleVote = (voteType: 'exists' | 'not_exists'): void => {
    // Guard: Block IMMEDIATELY if already voted (prevents API call)
    if (hasVoted) {
      toast.info(t('validation.alreadyVoted'), {
        icon: '⚠️'
      });
      return;
    }

    // Guard: Block if currently voting or fetching
    if (isVoting || isFetching) {
      return;
    }

    // Execute vote (backend + cache prevent duplicates)
    voteMutation.mutate(voteType);
  };

  return (
    <div className="validation-vote-buttons">
      {hasVoted ? (
        // Show "already voted" message instead of buttons
        <div className="already-voted-message">
          <p className="voted-info">
            ✅ {t('validation.alreadyVoted')}
          </p>
          <p className="your-vote">
            {t('validation.yourVote')}:
            {userVote === 'exists' ? (
              <span className="vote-exists-label">✓ {t('validation.voteExists')}</span>
            ) : (
              <span className="vote-not-exists-label">✗ {t('validation.voteNotExists')}</span>
            )}
          </p>
        </div>
      ) : (
        // Show vote buttons if not yet voted
        <>
          <p className="vote-instructions">
            {t('validation.helpCommunityInfo')}
          </p>

          <div className="vote-buttons-container">
            <button
              onClick={() => handleVote('exists')}
              className="vote-button vote-exists"
              disabled={isDisabled}
              title={isFetching ? 'Loading...' : ''}
              aria-label={t('validation.voteExists')}
            >
              <span className="vote-icon">{isFetching ? '⏳' : '✓'}</span>
              <span className="vote-text">{t('validation.voteExists')}</span>
            </button>

            <button
              onClick={() => handleVote('not_exists')}
              className="vote-button vote-not-exists"
              disabled={isDisabled}
              title={isFetching ? 'Loading...' : ''}
              aria-label={t('validation.voteNotExists')}
            >
              <span className="vote-icon">{isFetching ? '⏳' : '✗'}</span>
              <span className="vote-text">{t('validation.voteNotExists')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ValidationVoteButtons;
