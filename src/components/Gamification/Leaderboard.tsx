import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGamification } from '../../contexts/GamificationContext';
import { logger } from '../../utils/logger';
import './Leaderboard.css';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_xp?: number;
  monthly_xp?: number;
  weekly_xp?: number;
  current_level?: number;
  check_ins?: number;
  review_count?: number;
  photo_count?: number;
  checkin_count?: number;
  verified_checkins?: number;
  helpful_votes?: number;
  rank: number;
}

interface LeaderboardProps {
  compact?: boolean;
  maxDisplay?: number;
}

type LeaderboardTab = 'global' | 'monthly' | 'weekly' | 'category';
type CategoryType = 'reviewers' | 'photographers' | 'checkins' | 'helpful';

const Leaderboard: React.FC<LeaderboardProps> = ({
  compact = false,
  maxDisplay = 50
}) => {
  const { t } = useTranslation();
  const { getLevelIcon, getLevelName } = useGamification();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('global');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('reviewers');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Category config
  const categories: { key: CategoryType; icon: string; labelKey: string }[] = [
    { key: 'reviewers', icon: '📝', labelKey: 'gamification.leaderboard.categories.reviewers' },
    { key: 'photographers', icon: '📸', labelKey: 'gamification.leaderboard.categories.photographers' },
    { key: 'checkins', icon: '📍', labelKey: 'gamification.leaderboard.categories.checkins' },
    { key: 'helpful', icon: '👍', labelKey: 'gamification.leaderboard.categories.helpful' },
  ];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        let url: string;

        if (activeTab === 'category') {
          url = `${import.meta.env.VITE_API_URL}/api/gamification/leaderboard-category/${activeCategory}?limit=${maxDisplay}`;
        } else if (activeTab === 'weekly') {
          url = `${import.meta.env.VITE_API_URL}/api/gamification/leaderboard-weekly?limit=${maxDisplay}`;
        } else {
          url = `${import.meta.env.VITE_API_URL}/api/gamification/leaderboard/${activeTab}?limit=${maxDisplay}`;
        }

        const response = await fetch(url, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          setLeaderboardData(data.leaderboard || []);
        }
      } catch (error) {
        logger.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [activeTab, activeCategory, maxDisplay]);

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

  // Get stat value based on active tab/category
  const getStatValue = (entry: LeaderboardEntry): string => {
    if (activeTab === 'category') {
      switch (activeCategory) {
        case 'reviewers':
          return `${entry.review_count || 0} ${t('gamification.leaderboard.reviews')}`;
        case 'photographers':
          return `${entry.photo_count || 0} ${t('gamification.leaderboard.photos')}`;
        case 'checkins':
          return `${entry.verified_checkins || entry.checkin_count || 0} ${t('gamification.leaderboard.checkins')}`;
        case 'helpful':
          return `${entry.helpful_votes || 0} ${t('gamification.leaderboard.votes')}`;
        default:
          return '';
      }
    }

    if (activeTab === 'weekly') {
      return `${(entry.weekly_xp || 0).toLocaleString()} XP`;
    }

    if (activeTab === 'monthly') {
      return `${(entry.monthly_xp || 0).toLocaleString()} XP`;
    }

    return `${(entry.total_xp || 0).toLocaleString()} XP`;
  };

  const handleCategorySelect = (category: CategoryType) => {
    setActiveCategory(category);
    setActiveTab('category');
    setShowCategoryDropdown(false);
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

  const currentCategory = categories.find(c => c.key === activeCategory);

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
            <button
              className={`leaderboard-tab ${activeTab === 'weekly' ? 'leaderboard-tab-active' : ''}`}
              onClick={() => setActiveTab('weekly')}
            >
              📆 {t('gamification.leaderboard.weekly')}
            </button>

            {/* Category Dropdown */}
            <div className="leaderboard-dropdown-container" ref={dropdownRef}>
              <button
                className={`leaderboard-tab leaderboard-tab-dropdown ${activeTab === 'category' ? 'leaderboard-tab-active' : ''}`}
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              >
                {activeTab === 'category' ? currentCategory?.icon : '🏅'}{' '}
                {activeTab === 'category'
                  ? t(currentCategory?.labelKey || '')
                  : t('gamification.leaderboard.categories.title')}
                <span className="dropdown-arrow">{showCategoryDropdown ? '▲' : '▼'}</span>
              </button>

              {showCategoryDropdown && (
                <div className="leaderboard-dropdown">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      className={`dropdown-item ${activeCategory === cat.key && activeTab === 'category' ? 'dropdown-item-active' : ''}`}
                      onClick={() => handleCategorySelect(cat.key)}
                    >
                      {cat.icon} {t(cat.labelKey)}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                <div className="podium-xp">{getStatValue(leaderboardData[1])}</div>
              </div>

              {/* 1st Place */}
              <div className="podium-entry podium-first">
                <div className="podium-rank">🥇</div>
                <div className="podium-avatar">
                  {getLevelIcon(leaderboardData[0].current_level || 1)}
                </div>
                <div className="podium-username">{leaderboardData[0].username}</div>
                <div className="podium-xp">{getStatValue(leaderboardData[0])}</div>
              </div>

              {/* 3rd Place */}
              <div className="podium-entry podium-third">
                <div className="podium-rank">🥉</div>
                <div className="podium-avatar">
                  {getLevelIcon(leaderboardData[2].current_level || 1)}
                </div>
                <div className="podium-username">{leaderboardData[2].username}</div>
                <div className="podium-xp">{getStatValue(leaderboardData[2])}</div>
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

                {/* Stats */}
                <div className="entry-xp">{getStatValue(entry)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
