import React, { useState } from 'react';
import {
  Trophy,
  BarChart3,
  Medal,
  Target,
  Zap,
  Flame,
  Calendar,
  Dumbbell,
  Lock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../contexts/GamificationContext';
import XPProgressBar from '../components/Gamification/XPProgressBar';
import BadgeShowcase from '../components/Gamification/BadgeShowcase';
import MissionsDashboard from '../components/Gamification/MissionsDashboard';
import Leaderboard from '../components/Gamification/Leaderboard';
import SEOHead from '../components/Common/SEOHead';
import '../styles/pages/MyAchievementsPage.css';

const MyAchievementsPage: React.FC = () => {
  const { user } = useAuth();
  const { userProgress, loading: _loading } = useGamification();
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'missions' | 'leaderboard'>('overview');

  if (!user) {
    return (
      <div className="achievements-page">
        <div className="achievements-container">
          <div className="achievements-error">
            <div className="achievements-error-icon">
              <Lock size={48} />
            </div>
            <h2>Login Required</h2>
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
          {/* Hero Section */}
          <div className="achievements-hero">
            <div className="achievements-hero-bg" />
            <div className="achievements-hero-glow" />

            <div className="achievements-hero-content">
              {/* Trophy Icon with Sparkles */}
              <div className="achievements-icon-container">
                <Trophy className="achievements-icon" />
                <Sparkles className="achievements-sparkle achievements-sparkle-1" />
                <Sparkles className="achievements-sparkle achievements-sparkle-2" />
                <Sparkles className="achievements-sparkle achievements-sparkle-3" />
              </div>

              <h1 className="achievements-hero-title">My Achievements</h1>
              <p className="achievements-hero-tagline">
                Track your progress and unlock exclusive rewards
              </p>

              {/* Quick Stats in Hero */}
              <div className="achievements-hero-stats">
                <div className="achievements-stat-card achievements-stat-card--gold">
                  <Zap className="achievements-stat-icon" />
                  <span className="achievements-stat-value">{userProgress?.total_xp.toLocaleString() || 0}</span>
                  <span className="achievements-stat-label">Total XP</span>
                </div>
                <div className="achievements-stat-card achievements-stat-card--orange">
                  <Flame className="achievements-stat-icon" />
                  <span className="achievements-stat-value">{userProgress?.current_streak_days || 0}</span>
                  <span className="achievements-stat-label">Day Streak</span>
                </div>
                <div className="achievements-stat-card achievements-stat-card--pink">
                  <Calendar className="achievements-stat-icon" />
                  <span className="achievements-stat-value">{userProgress?.monthly_xp.toLocaleString() || 0}</span>
                  <span className="achievements-stat-label">Monthly XP</span>
                </div>
                <div className="achievements-stat-card achievements-stat-card--cyan">
                  <Dumbbell className="achievements-stat-icon" />
                  <span className="achievements-stat-value">{userProgress?.longest_streak_days || 0}</span>
                  <span className="achievements-stat-label">Best Streak</span>
                </div>
              </div>
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
              <BarChart3 size={16} />
              <span>Overview</span>
            </button>
            <button
              className={`achievements-tab ${activeTab === 'badges' ? 'achievements-tab-active' : ''}`}
              onClick={() => setActiveTab('badges')}
            >
              <Medal size={16} />
              <span>Badges</span>
            </button>
            <button
              className={`achievements-tab ${activeTab === 'missions' ? 'achievements-tab-active' : ''}`}
              onClick={() => setActiveTab('missions')}
            >
              <Target size={16} />
              <span>Missions</span>
            </button>
            <button
              className={`achievements-tab ${activeTab === 'leaderboard' ? 'achievements-tab-active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              <Trophy size={16} />
              <span>Leaderboard</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="achievements-content">
            {activeTab === 'overview' && (
              <div className="achievements-overview">
                {/* Stats Cards */}
                <div className="stats-grid scroll-reveal-stagger">
                  <div className="stat-card stat-card--gold">
                    <div className="stat-icon"><Zap size={32} /></div>
                    <div className="stat-value">{userProgress?.total_xp.toLocaleString() || 0}</div>
                    <div className="stat-label">Total XP</div>
                  </div>
                  <div className="stat-card stat-card--orange">
                    <div className="stat-icon"><Flame size={32} /></div>
                    <div className="stat-value">{userProgress?.current_streak_days || 0}</div>
                    <div className="stat-label">Day Streak</div>
                  </div>
                  <div className="stat-card stat-card--pink">
                    <div className="stat-icon"><Calendar size={32} /></div>
                    <div className="stat-value">{userProgress?.monthly_xp.toLocaleString() || 0}</div>
                    <div className="stat-label">Monthly XP</div>
                  </div>
                  <div className="stat-card stat-card--cyan">
                    <div className="stat-icon"><Dumbbell size={32} /></div>
                    <div className="stat-value">{userProgress?.longest_streak_days || 0}</div>
                    <div className="stat-label">Longest Streak</div>
                  </div>
                </div>

                {/* Recent Badges */}
                <BadgeShowcase compact={false} maxDisplay={8} />
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
