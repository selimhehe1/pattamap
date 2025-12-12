import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGamification } from '../../contexts/GamificationContext';
import { Badge, UserBadge } from '../../contexts/GamificationContext';
import { logger } from '../../utils/logger';
import './BadgeShowcase.css';

interface BadgeShowcaseProps {
  userId?: string;
  compact?: boolean;
  maxDisplay?: number;
  showProgress?: boolean;
}

const BadgeShowcase: React.FC<BadgeShowcaseProps> = ({
  userId: _userId,
  compact = false,
  maxDisplay,
  showProgress = false
}) => {
  const { t } = useTranslation();
  const { userBadges, loading } = useGamification();
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loadingAllBadges, setLoadingAllBadges] = useState(false);

  // Fetch all available badges if showing progress
  useEffect(() => {
    if (!showProgress) return;

    const fetchAllBadges = async () => {
      setLoadingAllBadges(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/gamification/badges`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          setAllBadges(data.badges || []);
        }
      } catch (error) {
        logger.error('Error fetching all badges:', error);
      } finally {
        setLoadingAllBadges(false);
      }
    };

    fetchAllBadges();
  }, [showProgress]);

  if (loading || (showProgress && loadingAllBadges)) {
    return (
      <div className={`badge-showcase ${compact ? 'badge-showcase-compact' : ''}`}>
        <div className="badge-showcase-loading">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="badge-card-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const earnedBadges = userBadges;
  const displayBadges = maxDisplay ? earnedBadges.slice(0, maxDisplay) : earnedBadges;

  // Get rarity color
  const getRarityColor = (rarity: string): string => {
    const colors: Record<string, string> = {
      common: '#9ca3af',    // Gray
      rare: '#3b82f6',      // Blue
      epic: '#a855f7',      // Purple
      legendary: '#f59e0b'  // Gold
    };
    return colors[rarity] || colors.common;
  };

  // Get category icon
  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      exploration: '🗺️',
      contribution: '📝',
      social: '👥',
      quality: '⭐',
      temporal: '⏰',
      secret: '🎭'
    };
    return icons[category] || '🏆';
  };

  return (
    <div className={`badge-showcase ${compact ? 'badge-showcase-compact' : ''}`}>
      {/* Header */}
      {!compact && (
        <div className="badge-showcase-header">
          <h3>{t('gamification.badges.earned')}</h3>
          <span className="badge-count">
            {earnedBadges.length}
            {showProgress && allBadges.length > 0 && ` / ${allBadges.length}`}
          </span>
        </div>
      )}

      {/* Badge Grid */}
      {earnedBadges.length === 0 ? (
        <div className="badge-showcase-empty">
          <div className="empty-icon">🏆</div>
          <p>{t('gamification.badges.empty')}</p>
          <span className="empty-subtitle">{t('gamification.badges.emptySubtitle')}</span>
        </div>
      ) : (
        <div className={`badge-grid ${compact ? 'badge-grid-compact' : ''}`}>
          {displayBadges.map((userBadge: UserBadge) => (
            <div
              key={userBadge.id}
              className="badge-card"
              style={{ '--rarity-color': getRarityColor(userBadge.badge.rarity) } as React.CSSProperties}
              title={`${userBadge.badge.name}\n${userBadge.badge.description}\nEarned: ${new Date(userBadge.earned_at).toLocaleDateString()}`}
            >
              {/* Badge Icon */}
              <div className="badge-icon">
                {userBadge.badge.icon_url}
              </div>

              {/* Badge Info */}
              {!compact && (
                <>
                  <div className="badge-name">{userBadge.badge.name}</div>
                  <div className="badge-meta">
                    <span className="badge-category" title={userBadge.badge.category}>
                      {getCategoryIcon(userBadge.badge.category)}
                    </span>
                    <span className={`badge-rarity badge-rarity-${userBadge.badge.rarity}`}>
                      {t(`gamification.badges.rarity.${userBadge.badge.rarity}`)}
                    </span>
                  </div>
                </>
              )}

              {/* Shine effect */}
              <div className="badge-shine" />
            </div>
          ))}

          {/* Show more indicator */}
          {maxDisplay && earnedBadges.length > maxDisplay && (
            <div className="badge-card badge-card-more">
              <div className="badge-more-icon">
                +{earnedBadges.length - maxDisplay}
              </div>
              <div className="badge-more-text">{t('gamification.badges.more')}</div>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar (if showProgress) */}
      {showProgress && allBadges.length > 0 && (
        <div className="badge-progress">
          <div className="badge-progress-bar">
            <div
              className="badge-progress-fill"
              style={{ width: `${(earnedBadges.length / allBadges.length) * 100}%` }}
            />
          </div>
          <div className="badge-progress-text">
            {Math.round((earnedBadges.length / allBadges.length) * 100)}% {t('gamification.badges.complete')}
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgeShowcase;
