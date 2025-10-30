import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGamification } from '../../contexts/GamificationContext';
import { Mission, UserMissionProgress } from '../../contexts/GamificationContext';
import './MissionsDashboard.css';

interface MissionsDashboardProps {
  compact?: boolean;
  maxDisplay?: number;
}

const MissionsDashboard: React.FC<MissionsDashboardProps> = ({
  compact = false,
  maxDisplay
}) => {
  const { t } = useTranslation();
  const { userMissions, loading, refreshUserMissions } = useGamification();
  const [activeMissions, setActiveMissions] = useState<Mission[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'narrative'>('daily');

  // Fetch all active missions
  useEffect(() => {
    const fetchMissions = async () => {
      setLoadingMissions(true);
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/gamification/missions?is_active=true`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setActiveMissions(data.missions || []);
        }
      } catch (error) {
        console.error('Error fetching missions:', error);
      } finally {
        setLoadingMissions(false);
      }
    };

    fetchMissions();
  }, []);

  // Get mission progress for a specific mission
  const getMissionProgress = (missionId: string): UserMissionProgress | undefined => {
    return userMissions.find((mp) => mp.mission_id === missionId);
  };

  // Calculate progress percentage
  const getProgressPercentage = (mission: Mission, userProgress?: UserMissionProgress): number => {
    if (!userProgress) return 0;
    if (userProgress.completed) return 100;

    const required = mission.requirements?.count || 1;
    const current = userProgress.progress || 0;
    return Math.min((current / required) * 100, 100);
  };

  // Filter missions by tab
  const filteredMissions = activeMissions.filter((m) => m.type === activeTab);
  const displayMissions = maxDisplay ? filteredMissions.slice(0, maxDisplay) : filteredMissions;

  // Get mission type icon
  const getMissionIcon = (type: string): string => {
    const icons: Record<string, string> = {
      daily: '📅',
      weekly: '📆',
      event: '🎉',
      narrative: '📖'
    };
    return icons[type] || '🎯';
  };

  if (loading || loadingMissions) {
    return (
      <div className={`missions-dashboard ${compact ? 'missions-dashboard-compact' : ''}`}>
        <div className="missions-loading">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mission-card-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`missions-dashboard ${compact ? 'missions-dashboard-compact' : ''}`}>
      {/* Header */}
      {!compact && (
        <div className="missions-header">
          <h3>{t('gamification.missions.active')}</h3>
          <button onClick={refreshUserMissions} className="missions-refresh-btn">
            🔄 {t('gamification.missions.refresh')}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="missions-tabs">
        <button
          className={`missions-tab ${activeTab === 'daily' ? 'missions-tab-active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          📅 {t('gamification.missions.daily')}
        </button>
        <button
          className={`missions-tab ${activeTab === 'weekly' ? 'missions-tab-active' : ''}`}
          onClick={() => setActiveTab('weekly')}
        >
          📆 {t('gamification.missions.weekly')}
        </button>
        <button
          className={`missions-tab ${activeTab === 'narrative' ? 'missions-tab-active' : ''}`}
          onClick={() => setActiveTab('narrative')}
        >
          📖 {t('gamification.missions.quests')}
        </button>
      </div>

      {/* Mission List */}
      {displayMissions.length === 0 ? (
        <div className="missions-empty">
          <div className="empty-icon">{getMissionIcon(activeTab)}</div>
          <p>{t('gamification.missions.empty', { type: t(`gamification.missions.${activeTab}`) })}</p>
          <span className="empty-subtitle">{t('gamification.missions.emptySubtitle')}</span>
        </div>
      ) : (
        <div className="missions-list">
          {displayMissions.map((mission) => {
            const userProgress = getMissionProgress(mission.id);
            const progressPercentage = getProgressPercentage(mission, userProgress);
            const isCompleted = userProgress?.completed || false;

            return (
              <div
                key={mission.id}
                className={`mission-card ${isCompleted ? 'mission-card-completed' : ''}`}
              >
                {/* Mission Icon & Info */}
                <div className="mission-info">
                  <div className="mission-icon">{getMissionIcon(mission.type)}</div>
                  <div className="mission-details">
                    <div className="mission-name">{mission.name}</div>
                    <div className="mission-description">{mission.description}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mission-progress">
                  <div className="mission-progress-bar">
                    <div
                      className="mission-progress-fill"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="mission-progress-text">
                    {userProgress ? `${userProgress.progress || 0}` : '0'} / {mission.requirements?.count || 1}
                  </div>
                </div>

                {/* Reward */}
                <div className="mission-reward">
                  <span className="mission-xp">+{mission.xp_reward} {t('gamification.xp.points')}</span>
                  {mission.badge_reward && (
                    <span className="mission-badge-reward" title={t('gamification.missions.badgeReward')}>
                      🏅
                    </span>
                  )}
                </div>

                {/* Completed Checkmark */}
                {isCompleted && (
                  <div className="mission-completed-badge">
                    ✓
                  </div>
                )}
              </div>
            );
          })}

          {/* Show more indicator */}
          {maxDisplay && filteredMissions.length > maxDisplay && (
            <div className="missions-show-more">
              {t('gamification.missions.showMore', { count: filteredMissions.length - maxDisplay })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MissionsDashboard;
