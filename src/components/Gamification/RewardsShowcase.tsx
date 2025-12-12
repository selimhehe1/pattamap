import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRewards, Reward, getLevelName, getXPForNextLevel, getXPForCurrentLevel } from '../../hooks/useRewards';
import './RewardsShowcase.css';

type CategoryFilter = 'all' | 'feature' | 'cosmetic' | 'title';

const RewardsShowcase: React.FC = () => {
  const { t } = useTranslation();
  const { data, loading, error, claimReward } = useRewards();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaim = async (rewardId: string) => {
    setClaimingId(rewardId);
    await claimReward(rewardId);
    setClaimingId(null);
  };

  if (loading) {
    return (
      <div className="rewards-showcase rewards-showcase--loading">
        <div className="rewards-showcase__header">
          <div className="shimmer shimmer-title"></div>
        </div>
        <div className="rewards-showcase__progress">
          <div className="shimmer shimmer-bar"></div>
        </div>
        <div className="rewards-showcase__grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="reward-card reward-card--skeleton">
              <div className="shimmer shimmer-icon"></div>
              <div className="shimmer shimmer-text"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rewards-showcase rewards-showcase--error">
        <div className="rewards-showcase__error-icon">⚠️</div>
        <p>{t('gamification.rewards.error', 'Failed to load rewards')}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { rewards, currentLevel, totalXp } = data;
  const levelName = getLevelName(currentLevel);
  const xpForNext = getXPForNextLevel(currentLevel);
  const xpForCurrent = getXPForCurrentLevel(currentLevel);
  const xpProgress = totalXp - xpForCurrent;
  const xpNeeded = xpForNext - xpForCurrent;
  const progressPercent = xpForNext === Infinity ? 100 : Math.min((xpProgress / xpNeeded) * 100, 100);

  // Filter rewards by category
  const filteredRewards = categoryFilter === 'all'
    ? rewards
    : rewards.filter(r => r.category === categoryFilter);

  // Separate unlocked and locked
  const unlockedRewards = filteredRewards.filter(r => r.is_unlocked);
  const lockedRewards = filteredRewards.filter(r => !r.is_unlocked);

  // Sort locked by unlock_value
  lockedRewards.sort((a, b) => (a.unlock_value || 0) - (b.unlock_value || 0));

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'feature': return '⚙️';
      case 'cosmetic': return '✨';
      case 'title': return '🏷️';
      default: return '🎁';
    }
  };

  const getUnlockRequirement = (reward: Reward): string => {
    if (reward.unlock_type === 'level') {
      return t('gamification.rewards.requireLevel', 'Level {{level}}', { level: reward.unlock_value });
    }
    if (reward.unlock_type === 'xp') {
      return t('gamification.rewards.requireXP', '{{xp}} XP', { xp: reward.unlock_value });
    }
    if (reward.unlock_type === 'badge') {
      return t('gamification.rewards.requireBadge', 'Badge required');
    }
    return t('gamification.rewards.requireSpecial', 'Special achievement');
  };

  return (
    <div className="rewards-showcase">
      {/* Header with level info */}
      <div className="rewards-showcase__header">
        <h2 className="rewards-showcase__title">
          <span className="rewards-showcase__title-icon">🎁</span>
          {t('gamification.rewards.title', 'Rewards & Unlocks')}
        </h2>
      </div>

      {/* Level Progress */}
      <div className="rewards-showcase__level-info">
        <div className="rewards-showcase__level-badge">
          <span className="level-number">{currentLevel}</span>
          <span className="level-name">{levelName}</span>
        </div>
        <div className="rewards-showcase__xp-progress">
          <div className="xp-progress-bar">
            <div
              className="xp-progress-bar__fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="xp-progress-text">
            {xpForNext === Infinity ? (
              <span>{t('gamification.rewards.maxLevel', 'Max Level!')}</span>
            ) : (
              <span>
                {xpProgress.toLocaleString()} / {xpNeeded.toLocaleString()} XP
                {t('gamification.rewards.toNextLevel', ' to Level {{level}}', { level: currentLevel + 1 })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="rewards-showcase__filters">
        <button
          className={`filter-btn ${categoryFilter === 'all' ? 'filter-btn--active' : ''}`}
          onClick={() => setCategoryFilter('all')}
        >
          {t('gamification.rewards.filterAll', 'All')}
        </button>
        <button
          className={`filter-btn ${categoryFilter === 'feature' ? 'filter-btn--active' : ''}`}
          onClick={() => setCategoryFilter('feature')}
        >
          ⚙️ {t('gamification.rewards.filterFeatures', 'Features')}
        </button>
        <button
          className={`filter-btn ${categoryFilter === 'cosmetic' ? 'filter-btn--active' : ''}`}
          onClick={() => setCategoryFilter('cosmetic')}
        >
          ✨ {t('gamification.rewards.filterCosmetics', 'Cosmetics')}
        </button>
        <button
          className={`filter-btn ${categoryFilter === 'title' ? 'filter-btn--active' : ''}`}
          onClick={() => setCategoryFilter('title')}
        >
          🏷️ {t('gamification.rewards.filterTitles', 'Titles')}
        </button>
      </div>

      {/* Unlocked Rewards */}
      {unlockedRewards.length > 0 && (
        <div className="rewards-showcase__section">
          <h3 className="rewards-showcase__section-title">
            <span className="section-icon">✅</span>
            {t('gamification.rewards.unlocked', 'Unlocked')}
            <span className="section-count">{unlockedRewards.length}</span>
          </h3>
          <div className="rewards-showcase__grid">
            {unlockedRewards.map((reward) => (
              <div
                key={reward.id}
                className={`reward-card reward-card--unlocked reward-card--${reward.category}`}
              >
                <div className="reward-card__icon">{reward.icon}</div>
                <div className="reward-card__content">
                  <div className="reward-card__name">{reward.name.replace(/_/g, ' ')}</div>
                  <div className="reward-card__description">{reward.description}</div>
                  <div className="reward-card__category">
                    {getCategoryIcon(reward.category)} {reward.category}
                  </div>
                </div>
                <div className="reward-card__status">
                  {reward.claimed ? (
                    <span className="reward-card__claimed">✓</span>
                  ) : (
                    <button
                      className="reward-card__claim-btn"
                      onClick={() => handleClaim(reward.id)}
                      disabled={claimingId === reward.id}
                    >
                      {claimingId === reward.id
                        ? t('gamification.rewards.claiming', 'Claiming...')
                        : t('gamification.rewards.claim', 'Claim')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked Rewards */}
      {lockedRewards.length > 0 && (
        <div className="rewards-showcase__section">
          <h3 className="rewards-showcase__section-title">
            <span className="section-icon">🔒</span>
            {t('gamification.rewards.locked', 'Locked')}
            <span className="section-count">{lockedRewards.length}</span>
          </h3>
          <div className="rewards-showcase__grid">
            {lockedRewards.map((reward) => (
              <div
                key={reward.id}
                className={`reward-card reward-card--locked reward-card--${reward.category}`}
              >
                <div className="reward-card__icon reward-card__icon--locked">{reward.icon}</div>
                <div className="reward-card__content">
                  <div className="reward-card__name">{reward.name.replace(/_/g, ' ')}</div>
                  <div className="reward-card__description">{reward.description}</div>
                  <div className="reward-card__requirement">
                    🔓 {getUnlockRequirement(reward)}
                  </div>
                </div>
                <div className="reward-card__lock-icon">🔒</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredRewards.length === 0 && (
        <div className="rewards-showcase__empty">
          <span className="empty-icon">📭</span>
          <p>{t('gamification.rewards.noRewards', 'No rewards in this category')}</p>
        </div>
      )}

      {/* Stats Summary */}
      <div className="rewards-showcase__stats">
        <div className="stat-item">
          <span className="stat-value">{unlockedRewards.length}</span>
          <span className="stat-label">{t('gamification.rewards.statsUnlocked', 'Unlocked')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{lockedRewards.length}</span>
          <span className="stat-label">{t('gamification.rewards.statsLocked', 'Remaining')}</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{totalXp.toLocaleString()}</span>
          <span className="stat-label">{t('gamification.rewards.statsTotalXP', 'Total XP')}</span>
        </div>
      </div>
    </div>
  );
};

export default RewardsShowcase;
