import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import './ValidationBadge.css';

interface ValidationBadgeProps {
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

/**
 * Validation Badge Component
 * Displays community validation status for employee profiles
 *
 * Badge types:
 * - "?" (pending) : < 20 votes
 * - Neutral : ≥ 20 votes + >50% validation
 * - "⚠️" (warning) : ≥ 20 votes + ≤50% validation
 *
 * Version: v10.3
 * Date: 2025-01-19
 */
const ValidationBadge: React.FC<ValidationBadgeProps> = ({ employeeId }) => {
  const { t } = useTranslation();

  // Fetch validation stats (React Query v5 syntax)
  const { data: stats, isPending } = useQuery<ValidationStats>({
    queryKey: ['validation-stats', employeeId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/employees/${employeeId}/validation-stats`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch validation stats');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes (formerly cacheTime)
  });

  if (isPending) {
    return (
      <div className="validation-badge validation-loading">
        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Simple badge: just show vote counts
  return (
    <div className="validation-badge validation-simple">
      <div className="validation-counts">
        <span className="count-positive" title={t('validation.voteExists')}>
          ✓ {stats.existsVotes}
        </span>
        <span className="count-separator">|</span>
        <span className="count-negative" title={t('validation.voteNotExists')}>
          ✗ {stats.notExistsVotes}
        </span>
      </div>
    </div>
  );
};

export default ValidationBadge;
