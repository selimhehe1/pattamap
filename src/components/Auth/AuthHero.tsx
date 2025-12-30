import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Users, MessageSquare, MapPin } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { usePublicStats } from '../../hooks/usePublicStats';
import '../../styles/components/auth-hero.css';

interface AuthHeroProps {
  mode: 'login' | 'register';
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  loading: boolean;
}

/**
 * Animated counter component
 * Animates from 0 to target value with easing
 */
const CountUp: React.FC<{ target: number; duration?: number }> = ({
  target,
  duration = 1500,
}) => {
  const [count, setCount] = useState(0);
  const countRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      countRef.current = Math.round(easedProgress * target);
      setCount(countRef.current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = null;
    requestAnimationFrame(animate);
  }, [target, duration]);

  return <>{count}</>;
};

/**
 * Skeleton loader for stats
 */
const StatSkeleton: React.FC = () => (
  <div className="auth-hero__stat-skeleton">
    <div className="auth-hero__stat-skeleton-value" />
    <div className="auth-hero__stat-skeleton-label" />
  </div>
);

/**
 * Individual stat card component
 */
const StatCard: React.FC<StatCardProps> = ({ icon, value, label, loading }) => (
  <div className="auth-hero__stat-card">
    <div className="auth-hero__stat-icon">{icon}</div>
    {loading ? (
      <StatSkeleton />
    ) : (
      <>
        <span className="auth-hero__stat-value">
          <CountUp target={value} />
        </span>
        <span className="auth-hero__stat-label">{label}</span>
      </>
    )}
  </div>
);

/**
 * AuthHero Component
 *
 * Hero section for the split-screen authentication layout.
 * Displays branding, tagline, and real platform statistics.
 *
 * Features:
 * - Animated gradient background with floating orbs
 * - Logo with glow effect
 * - 4 stat cards with real database counts
 * - CountUp animation for numbers
 * - Skeleton loader during fetch
 * - Light/dark mode support
 *
 * @param mode - Current auth mode ('login' or 'register')
 */
const AuthHero: React.FC<AuthHeroProps> = ({ mode }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { stats, loading } = usePublicStats();
  const isLightMode = theme === 'light';

  const statCards = [
    {
      icon: <Building2 size={24} />,
      value: stats?.establishments || 0,
      labelKey: 'auth.hero.statVenues',
      defaultLabel: 'Venues',
    },
    {
      icon: <Users size={24} />,
      value: stats?.employees || 0,
      labelKey: 'auth.hero.statProfiles',
      defaultLabel: 'Profiles',
    },
    {
      icon: <MessageSquare size={24} />,
      value: stats?.reviews || 0,
      labelKey: 'auth.hero.statReviews',
      defaultLabel: 'Reviews',
    },
    {
      icon: <MapPin size={24} />,
      value: stats?.zones || 0,
      labelKey: 'auth.hero.statZones',
      defaultLabel: 'Zones',
    },
  ];

  return (
    <div className="auth-hero">
      {/* Animated Background */}
      <div className="auth-hero__background">
        <div className="auth-hero__orb auth-hero__orb--pink" />
        <div className="auth-hero__orb auth-hero__orb--cyan" />
        <div className="auth-hero__orb auth-hero__orb--gold" />
      </div>

      {/* Content */}
      <div className="auth-hero__content">
        {/* Logo */}
        <img
          src={isLightMode ? '/logo-light.svg' : '/logo.svg'}
          alt="PattaMap"
          className="auth-hero__logo"
        />

        {/* Tagline */}
        <h1 className="auth-hero__tagline">
          {t('auth.hero.tagline', 'Bienvenue sur PattaMap')}
        </h1>
        <p className="auth-hero__subtitle">
          {mode === 'login'
            ? t('auth.hero.subtitleLogin', 'Connectez-vous pour continuer')
            : t('auth.hero.subtitleRegister', 'Créez votre compte gratuitement')}
        </p>

        {/* Stats Grid */}
        <div className="auth-hero__stats">
          {statCards.map((stat, index) => (
            <StatCard
              key={index}
              icon={stat.icon}
              value={stat.value}
              label={t(stat.labelKey, stat.defaultLabel)}
              loading={loading}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthHero;
