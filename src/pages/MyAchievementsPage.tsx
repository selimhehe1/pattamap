import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../contexts/GamificationContext';
import XPProgressBar from '../components/Gamification/XPProgressBar';
import BadgeShowcase from '../components/Gamification/BadgeShowcase';
import MissionsDashboard from '../components/Gamification/MissionsDashboard';
import Leaderboard from '../components/Gamification/Leaderboard';
import SEOHead from '../components/Common/SEOHead';
import './MyAchievementsPage.css';

const MyAchievementsPage: React.FC = () => {
  const { user } = useAuth();
  const { userProgress, loading: _loading } = useGamification();
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'missions' | 'leaderboard'>('overview');

  if (!user) {
    return (
      <div className="achievements-page">
        <div className="achievements-container">
          <div className="achievements-error">
            <h2>🔒 Login Required</h2>
            <p>Please log in to view your achievements and progress.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="My Achievements - PattaMap"
        description="Track your progress, badges, and achievements on PattaMap"
        canonical="/achievements"
      />

      <div className="achievements-page">
        <div className="achievements-container">
          {/* Header */}
          <div className="achievements-header">
            <div className="achievements-title-section">
              <h1>🏆 My Achievements</h1>
              <p className="achievements-subtitle">
                Track your progress and unlock badges
              </p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="achievements-progress-section">
            <XPProgressBar showDetails={true} />
          </div>

          {/* Tabs */}
          <div className="achievements-tabs">
            <button
              className={`achievements-tab ${activeTab === 'overview' ? 'achievements-tab-active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Overview
            </button>
            <button
              className={`achievements-tab ${activeTab === 'badges' ? 'achievements-tab-active' : ''}`}
              onClick={() => setActiveTab('badges')}
            >
              🏅 Badges
            </button>
            <button
              className={`achievements-tab ${activeTab === 'missions' ? 'achievements-tab-active' : ''}`}
              onClick={() => setActiveTab('missions')}
            >
              🎯 Missions
            </button>
            <button
              className={`achievements-tab ${activeTab === 'leaderboard' ? 'achievements-tab-active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              🏆 Leaderboard
            </button>
          </div>

          {/* Tab Content */}
          <div className="achievements-content">
            {activeTab === 'overview' && (
              <div className="achievements-overview">
                {/* Stats Cards */}
                <div className="stats-grid scroll-reveal-stagger">
                  <div className="stat-card">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-value">{userProgress?.total_xp.toLocaleString() || 0}</div>
                    <div className="stat-label">Total XP</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">🔥</div>
                    <div className="stat-value">{userProgress?.current_streak_days || 0}</div>
                    <div className="stat-label">Day Streak</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-value">{userProgress?.monthly_xp.toLocaleString() || 0}</div>
                    <div className="stat-label">Monthly XP</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">💪</div>
                    <div className="stat-value">{userProgress?.longest_streak_days || 0}</div>
                    <div className="stat-label">Longest Streak</div>
                  </div>
                </div>

                {/* Recent Badges */}
                <div className="achievements-section">
                  <h3>Recent Badges</h3>
                  <BadgeShowcase compact={false} maxDisplay={8} />
                </div>
              </div>
            )}

            {activeTab === 'badges' && (
              <div className="achievements-badges">
                <BadgeShowcase showProgress={true} />
              </div>
            )}

            {activeTab === 'missions' && (
              <div className="achievements-missions">
                <MissionsDashboard />
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="achievements-leaderboard">
                <Leaderboard />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MyAchievementsPage;
