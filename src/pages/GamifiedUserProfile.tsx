import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGamification } from '../contexts/GamificationContext';
import XPProgressBar from '../components/Gamification/XPProgressBar';
import BadgeShowcase from '../components/Gamification/BadgeShowcase';
import FollowButton from '../components/Gamification/FollowButton';
import UserAvatar from '../components/Common/UserAvatar';
import {
  XCircle,
  User,
  Zap,
  Calendar,
  Flame,
  Star,
  Medal,
  Users,
  Handshake,
  Trophy
} from 'lucide-react';
import '../styles/pages/GamifiedUserProfile.css';

interface UserProfile {
  id: string;
  username: string;
  account_type: string;
  avatar_url?: string | null;
  created_at: string;
}

interface UserStats {
  total_xp: number;
  current_level: number;
  monthly_xp: number;
  current_streak_days: number;
  longest_streak_days: number;
  badges_count: number;
  followers_count: number;
  following_count: number;
  leaderboard_rank_global?: number;
  leaderboard_rank_monthly?: number;
}

const GamifiedUserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const { getLevelName, getLevelIcon } = useGamification();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch user profile
        const profileResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/users/${userId}`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (!profileResponse.ok) {
          throw new Error('User not found');
        }

        const profileData = await profileResponse.json();
        setProfile(profileData.user);

        // Fetch user gamification stats
        const statsResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/api/gamification/user/${userId}/stats`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="gamified-profile">
        <div className="profile-loading">
          <div className="profile-loading-spinner" />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile || !stats) {
    return (
      <div className="gamified-profile">
        <div className="profile-error">
          <span className="profile-error-icon"><XCircle size={24} /></span>
          <p>{error || 'User not found'}</p>
        </div>
      </div>
    );
  }

  const levelIcon = getLevelIcon(stats.current_level);
  const levelName = getLevelName(stats.current_level);
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });

  return (
    <div className="gamified-profile">
      {/* Header Section */}
      <div className="profile-header">
        <div className="profile-header-left">
          <div className="profile-avatar">
            <UserAvatar
              user={{ pseudonym: profile.username, avatar_url: profile.avatar_url }}
              size="xl"
            />
            <div className="profile-level-icon-badge">{levelIcon}</div>
          </div>
          <div className="profile-info">
            <h1 className="profile-username">{profile.username}</h1>
            <div className="profile-level-badge">
              <span className="profile-level-icon">{levelIcon}</span>
              <span className="profile-level-text">Lv.{stats.current_level} {levelName}</span>
            </div>
            <div className="profile-member-since">
              <span><User size={14} /></span>
              <span>Member since {memberSince}</span>
            </div>
          </div>
        </div>

        {/* Follow Button (if not own profile) */}
        {!isOwnProfile && (
          <div className="profile-header-actions">
            <FollowButton
              targetUserId={userId!}
              targetUsername={profile.username}
              initialFollowerCount={stats.followers_count}
              showCount={true}
            />
          </div>
        )}
      </div>

      {/* XP Progress Bar */}
      <div className="profile-xp-section">
        <XPProgressBar showDetails={true} />
      </div>

      {/* Stats Grid */}
      <div className="profile-stats-grid scroll-reveal-stagger">
        <div className="profile-stat-card">
          <div className="profile-stat-icon"><Zap size={24} /></div>
          <div className="profile-stat-content">
            <div className="profile-stat-value">{stats.total_xp.toLocaleString()}</div>
            <div className="profile-stat-label">Total XP</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon"><Calendar size={24} /></div>
          <div className="profile-stat-content">
            <div className="profile-stat-value">{stats.monthly_xp.toLocaleString()}</div>
            <div className="profile-stat-label">Monthly XP</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon"><Flame size={24} /></div>
          <div className="profile-stat-content">
            <div className="profile-stat-value">{stats.current_streak_days}</div>
            <div className="profile-stat-label">Current Streak</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon"><Star size={24} /></div>
          <div className="profile-stat-content">
            <div className="profile-stat-value">{stats.longest_streak_days}</div>
            <div className="profile-stat-label">Longest Streak</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon"><Medal size={24} /></div>
          <div className="profile-stat-content">
            <div className="profile-stat-value">{stats.badges_count}</div>
            <div className="profile-stat-label">Badges Earned</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon"><Users size={24} /></div>
          <div className="profile-stat-content">
            <div className="profile-stat-value">{stats.followers_count}</div>
            <div className="profile-stat-label">Followers</div>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon"><Handshake size={24} /></div>
          <div className="profile-stat-content">
            <div className="profile-stat-value">{stats.following_count}</div>
            <div className="profile-stat-label">Following</div>
          </div>
        </div>

        {stats.leaderboard_rank_global && (
          <div className="profile-stat-card profile-stat-rank">
            <div className="profile-stat-icon"><Trophy size={24} /></div>
            <div className="profile-stat-content">
              <div className="profile-stat-value">#{stats.leaderboard_rank_global}</div>
              <div className="profile-stat-label">Global Rank</div>
            </div>
          </div>
        )}
      </div>

      {/* Badges Section */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h2><Medal size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />Badges ({stats.badges_count})</h2>
        </div>
        <BadgeShowcase compact={false} showProgress={false} />
      </div>
    </div>
  );
};

export default GamifiedUserProfile;
