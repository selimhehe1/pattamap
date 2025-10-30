import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGamification } from '../../contexts/GamificationContext';
import './Leaderboard.css';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_xp?: number;
  monthly_xp?: number;
  current_level?: number;
  check_ins?: number;
  rank: number;
}

interface LeaderboardProps {
  compact?: boolean;
  maxDisplay?: number;
}

const Leaderboard: React.FC<LeaderboardProps> = ({
  compact = false,
  maxDisplay = 50
}) => {
  const { t } = useTranslation();
  const { getLevelIcon, getLevelName } = useGamification();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'global' | 'monthly'>('global');

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/api/gamification/leaderboard/${activeTab}?limit=${maxDisplay}`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setLeaderboardData(data.leaderboard || []);
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [activeTab, maxDisplay]);

  // Get rank color
  const getRankColor = (rank: number): string => {
    if (rank === 1) return '#fbbf24'; // Gold
    if (rank === 2) return '#9ca3af'; // Silver
    if (rank === 3) return '#cd7f32'; // Bronze
    return 'rgba(255, 255, 255, 0.7)';
  };

  // Get rank icon
  const getRankIcon = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div className={`leaderboard ${compact ? 'leaderboard-compact' : ''}`}>
        <div className="leaderboard-loading">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="leaderboard-entry-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`leaderboard ${compact ? 'leaderboard-compact' : ''}`}>
      {/* Header */}
      {!compact && (
        <div className="leaderboard-header">
          <h3>{t('gamification.leaderboard.title')}</h3>
          <div className="leaderboard-tabs">
            <button
              className={`leaderboard-tab ${activeTab === 'global' ? 'leaderboard-tab-active' : ''}`}
              onClick={() => setActiveTab('global')}
            >
              🌍 {t('gamification.leaderboard.allTime')}
            </button>
            <button
              className={`leaderboard-tab ${activeTab === 'monthly' ? 'leaderboard-tab-active' : ''}`}
              onClick={() => setActiveTab('monthly')}
            >
              📅 {t('gamification.leaderboard.monthly')}
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard Entries */}
      {leaderboardData.length === 0 ? (
        <div className="leaderboard-empty">
          <div className="empty-icon">🏆</div>
          <p>{t('gamification.leaderboard.empty')}</p>
          <span className="empty-subtitle">{t('gamification.leaderboard.emptySubtitle')}</span>
        </div>
      ) : (
        <div className="leaderboard-list">
          {/* Top 3 Podium */}
          {!compact && leaderboardData.length >= 3 && (
            <div className="leaderboard-podium">
              {/* 2nd Place */}
              <div className="podium-entry podium-second">
                <div className="podium-rank">🥈</div>
                <div className="podium-avatar">
                  {getLevelIcon(leaderboardData[1].current_level || 1)}
                </div>
                <div className="podium-username">{leaderboardData[1].username}</div>
                <div className="podium-xp">
                  {activeTab === 'global'
                    ? leaderboardData[1].total_xp?.toLocaleString()
                    : leaderboardData[1].monthly_xp?.toLocaleString()}{' '}
                  XP
                </div>
              </div>

              {/* 1st Place */}
              <div className="podium-entry podium-first">
                <div className="podium-rank">🥇</div>
                <div className="podium-avatar">
                  {getLevelIcon(leaderboardData[0].current_level || 1)}
                </div>
                <div className="podium-username">{leaderboardData[0].username}</div>
                <div className="podium-xp">
                  {activeTab === 'global'
                    ? leaderboardData[0].total_xp?.toLocaleString()
                    : leaderboardData[0].monthly_xp?.toLocaleString()}{' '}
                  XP
                </div>
              </div>

              {/* 3rd Place */}
              <div className="podium-entry podium-third">
                <div className="podium-rank">🥉</div>
                <div className="podium-avatar">
                  {getLevelIcon(leaderboardData[2].current_level || 1)}
                </div>
                <div className="podium-username">{leaderboardData[2].username}</div>
                <div className="podium-xp">
                  {activeTab === 'global'
                    ? leaderboardData[2].total_xp?.toLocaleString()
                    : leaderboardData[2].monthly_xp?.toLocaleString()}{' '}
                  XP
                </div>
              </div>
            </div>
          )}

          {/* Remaining Entries */}
          <div className="leaderboard-entries">
            {leaderboardData.slice(compact ? 0 : 3).map((entry) => (
              <div key={entry.user_id} className="leaderboard-entry">
                {/* Rank */}
                <div
                  className="entry-rank"
                  style={{ color: getRankColor(entry.rank) }}
                >
                  {getRankIcon(entry.rank)}
                </div>

                {/* User Info */}
                <div className="entry-info">
                  <div className="entry-avatar">
                    {getLevelIcon(entry.current_level || 1)}
                  </div>
                  <div className="entry-details">
                    <div className="entry-username">{entry.username}</div>
                    <div className="entry-level">
                      {getLevelName(entry.current_level || 1)}
                    </div>
                  </div>
                </div>

                {/* XP */}
                <div className="entry-xp">
                  {activeTab === 'global'
                    ? entry.total_xp?.toLocaleString()
                    : entry.monthly_xp?.toLocaleString()}{' '}
                  XP
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
