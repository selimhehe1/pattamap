import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGamification } from '../../contexts/GamificationContext';
import './XPProgressBar.css';

interface XPProgressBarProps {
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

const XPProgressBar: React.FC<XPProgressBarProps> = ({
  compact = false,
  showDetails = true,
  className = ''
}) => {
  const { t } = useTranslation();
  const {
    userProgress,
    loading,
    getLevelName,
    getLevelIcon,
    getXPForNextLevel,
    getProgressToNextLevel
  } = useGamification();

  if (loading || !userProgress) {
    return (
      <div className={`xp-progress-bar xp-progress-bar-loading ${className}`}>
        <div className="xp-progress-skeleton" />
      </div>
    );
  }

  const currentLevel = userProgress.current_level;
  const currentXP = userProgress.total_xp;
  const levelName = getLevelName(currentLevel);
  const levelIcon = getLevelIcon(currentLevel);
  const nextLevelXP = getXPForNextLevel(currentLevel);
  const progress = getProgressToNextLevel(currentXP, currentLevel);
  const isMaxLevel = currentLevel >= 7;

  return (
    <div className={`xp-progress-bar ${compact ? 'xp-progress-bar-compact' : ''} ${className}`}>
      {/* Level Badge */}
      <div className="xp-level-badge" title={`${t('gamification.level.current')} ${currentLevel}: ${levelName}`}>
        <span className="xp-level-icon">{levelIcon}</span>
        {!compact && (
          <div className="xp-level-info">
            <span className="xp-level-number">{t('gamification.level.abbreviation')}{currentLevel}</span>
            <span className="xp-level-name">{levelName}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="xp-progress-container">
        <div className="xp-progress-track">
          <div
            className="xp-progress-fill"
            style={{ width: `${progress}%` }}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
          >
            <div className="xp-progress-shine" />
          </div>
        </div>

        {showDetails && !compact && (
          <div className="xp-progress-details">
            {isMaxLevel ? (
              <span className="xp-progress-text-max">
                👑 {t('gamification.level.maxReached', { xp: currentXP.toLocaleString() })}
              </span>
            ) : (
              <span className="xp-progress-text">
                {currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()} {t('gamification.xp.points')}
                <span className="xp-progress-remaining">
                  ({(nextLevelXP - currentXP).toLocaleString()} {t('gamification.xp.toNextLevel')})
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Streak Badge (if active) */}
      {userProgress.current_streak_days > 0 && !compact && (
        <div
          className="xp-streak-badge"
          title={t('gamification.streak.tooltip', {
            days: userProgress.current_streak_days,
            longest: userProgress.longest_streak_days
          })}
        >
          🔥 {userProgress.current_streak_days}
        </div>
      )}
    </div>
  );
};

export default XPProgressBar;
