/**
 * BarDetailHeader - Premium Hero Section
 * Full-width hero with blurred background, stats bar, and neon effects
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Users, Star, MapPin, Clock } from 'lucide-react';
import { Establishment } from '../../../types';
import { getZoneLabel } from '../../../utils/constants';

interface BarDetailHeaderProps {
  bar: Establishment;
  isAdmin: boolean;
  hasUser: boolean;
  onEditClick: () => void;
  employeeCount?: number;
}

// Category icons/names mapping
const categoryInfo: Record<string | number, { icon: string; name: string }> = {
  1: { icon: '🍺', name: 'Bar' },
  2: { icon: '💃', name: 'GoGo' },
  3: { icon: '💆', name: 'Massage' },
  4: { icon: '🎵', name: 'Club' },
  5: { icon: '🎤', name: 'Karaoke' },
  6: { icon: '🍽️', name: 'Restaurant' },
  7: { icon: '🏨', name: 'Hotel' },
  bar: { icon: '🍺', name: 'Bar' },
  'go-go': { icon: '💃', name: 'GoGo' },
  agogo: { icon: '💃', name: 'GoGo' },
  massage: { icon: '💆', name: 'Massage' },
  club: { icon: '🎵', name: 'Club' },
  karaoke: { icon: '🎤', name: 'Karaoke' },
};

export const BarDetailHeader: React.FC<BarDetailHeaderProps> = ({
  bar,
  isAdmin,
  hasUser,
  onEditClick,
  employeeCount = 0,
}) => {
  const { t } = useTranslation();

  // Check if currently open (nightlife hours: 6pm - 4am)
  const isOpen = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 18 || hour < 4;
  }, []);

  // Get category info
  const category = categoryInfo[bar.category_id] ||
                   categoryInfo[bar.category?.name?.toLowerCase() || ''] ||
                   { icon: '🏢', name: 'Venue' };

  // Get zone display name
  const zoneName = bar.zone ? getZoneLabel(bar.zone) : '';

  return (
    <section className="establishment-hero-premium">
      {/* Background Layer with Blurred Image */}
      <div className="hero-bg-layer">
        {bar.logo_url && (
          <img
            src={bar.logo_url}
            alt=""
            className="hero-bg-image"
            aria-hidden="true"
          />
        )}
        <div className="hero-bg-overlay" />
        <div className="hero-bg-glow" />
      </div>

      {/* Edit Button - Floating */}
      {hasUser && (
        <button
          onClick={onEditClick}
          className="hero-edit-btn"
          aria-label={
            isAdmin
              ? t('barDetailPage.ariaEditBar', { name: bar.name })
              : t('barDetailPage.ariaSuggestEdit', { name: bar.name })
          }
          title={isAdmin ? t('barDetailPage.titleEdit') : t('barDetailPage.titleSuggestEdit')}
        >
          <Pencil size={18} />
        </button>
      )}

      {/* Hero Content - Netflix Style */}
      <div className="hero-content">
        {/* Info Section */}
        <div className="hero-info">
          {/* Category Badge */}
          <div className="hero-category-badge">
            <span className="category-icon">{category.icon}</span>
            <span className="category-name">{category.name}</span>
          </div>

          {/* Title */}
          <h1 className="hero-title">{bar.name}</h1>

          {/* Description */}
          {bar.description && (
            <p className="hero-description">{bar.description}</p>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="hero-stats-bar">
        <div className="hero-stat">
          <Users size={18} />
          <span className="stat-value">{employeeCount}</span>
          <span className="stat-label">Staff</span>
        </div>

        <div className="hero-stat">
          <Star size={18} />
          <span className="stat-value">4.5</span>
          <span className="stat-label">Rating</span>
        </div>

        {zoneName && (
          <div className="hero-stat">
            <MapPin size={18} />
            <span className="stat-value">{zoneName}</span>
            <span className="stat-label">Zone</span>
          </div>
        )}

        <div className={`hero-stat ${isOpen ? 'status-open' : 'status-closed'}`}>
          <Clock size={18} />
          <span className="stat-value">{isOpen ? 'Open' : 'Closed'}</span>
          <span className="stat-label">
            {bar.opening_hours?.open || '18:00'} - {bar.opening_hours?.close || '02:00'}
          </span>
        </div>
      </div>
    </section>
  );
};
