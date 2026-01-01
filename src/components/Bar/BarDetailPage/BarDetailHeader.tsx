/**
 * BarDetailHeader - Premium Hero Section
 * Full-width hero with blurred background, stats bar, and neon effects
 */
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Users, Star, MapPin, Clock, Beer, Sparkles, Heart, Music, Mic, UtensilsCrossed, Hotel, Building2 } from 'lucide-react';
import { Establishment } from '../../../types';
import { getZoneLabel } from '../../../utils/constants';

interface BarDetailHeaderProps {
  bar: Establishment;
  isAdmin: boolean;
  hasUser: boolean;
  onEditClick: () => void;
  employeeCount?: number;
}

// Category icons/names mapping - using Lucide components
const getCategoryInfo = (categoryId: number | string | undefined, categoryName: string | undefined): { icon: React.ReactNode; name: string } => {
  const id = categoryId?.toString() || '';
  const name = categoryName?.toLowerCase() || '';

  const infoById: Record<string, { icon: React.ReactNode; name: string }> = {
    '1': { icon: <Beer size={18} />, name: 'Bar' },
    '2': { icon: <Sparkles size={18} />, name: 'GoGo' },
    '3': { icon: <Heart size={18} />, name: 'Massage' },
    '4': { icon: <Music size={18} />, name: 'Club' },
    '5': { icon: <Mic size={18} />, name: 'Karaoke' },
    '6': { icon: <UtensilsCrossed size={18} />, name: 'Restaurant' },
    '7': { icon: <Hotel size={18} />, name: 'Hotel' },
  };

  const infoByName: Record<string, { icon: React.ReactNode; name: string }> = {
    'bar': { icon: <Beer size={18} />, name: 'Bar' },
    'go-go': { icon: <Sparkles size={18} />, name: 'GoGo' },
    'agogo': { icon: <Sparkles size={18} />, name: 'GoGo' },
    'gogo': { icon: <Sparkles size={18} />, name: 'GoGo' },
    'massage': { icon: <Heart size={18} />, name: 'Massage' },
    'club': { icon: <Music size={18} />, name: 'Club' },
    'karaoke': { icon: <Mic size={18} />, name: 'Karaoke' },
  };

  return infoById[id] || infoByName[name] || { icon: <Building2 size={18} />, name: 'Venue' };
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
  const category = getCategoryInfo(bar.category_id, bar.category?.name);

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
