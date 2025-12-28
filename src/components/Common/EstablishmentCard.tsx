import React, { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Users } from 'lucide-react';
import { use3DTilt } from '../../hooks/use3DTilt';
import LazyImage from './LazyImage';
import { Establishment } from '../../types';
import '../../styles/components/establishment-card.css';

interface EstablishmentCardProps {
  establishment: Establishment;
  onClick?: (establishment: Establishment) => void;
  showEmployeeCount?: boolean;
  showOpenStatus?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'featured';
}

// Zone display names
const zoneNames: Record<string, string> = {
  soi6: 'Soi 6',
  walkingstreet: 'Walking Street',
  lkmetro: 'LK Metro',
  beachroad: 'Beach Road',
  thirdroad: 'Third Road',
  treetown: 'Tree Town',
  soi7: 'Soi 7',
  soibuakhao: 'Soi Buakhao',
};

// Category icons/emojis
const categoryIcons: Record<string, string> = {
  bar: '🍺',
  'go-go': '💃',
  agogo: '💃',
  club: '🎵',
  massage: '💆',
  restaurant: '🍽️',
  hotel: '🏨',
  karaoke: '🎤',
  beer_bar: '🍻',
  gentleman_club: '🎩',
};

/**
 * Premium Establishment Card Component
 * Features: Glassmorphism, 3D Tilt, Neon Glow, Employee Count, Open Status
 */
export const EstablishmentCard = memo<EstablishmentCardProps>(
  ({
    establishment,
    onClick,
    showEmployeeCount = true,
    showOpenStatus = true,
    className = '',
    variant = 'default',
  }) => {
    const navigate = useNavigate();
    const tiltRef = use3DTilt<HTMLDivElement>({
      maxTilt: 12,
      scale: 1.02,
      glowColor: 'rgba(232, 121, 249, 0.4)',
    });

    // Determine if establishment is open (simplified logic based on time)
    const isOpen = useMemo(() => {
      // Nightlife establishments typically open at night (6pm - 4am)
      const hour = new Date().getHours();
      return hour >= 18 || hour < 4;
    }, []);

    // Get category display
    const categoryName = establishment.category?.name || 'Establishment';
    const categoryIcon =
      establishment.category?.icon ||
      categoryIcons[categoryName.toLowerCase()] ||
      categoryIcons[establishment.category_id?.toString() || ''] ||
      '🏢';

    // Get zone display name
    const zoneName = establishment.zone
      ? zoneNames[establishment.zone] || establishment.zone
      : '';

    // Handle click
    const handleClick = () => {
      if (onClick) {
        onClick(establishment);
      } else {
        navigate(`/establishment/${establishment.id}`);
      }
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <div
        ref={tiltRef}
        className={`establishment-card-premium ${variant} ${className}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`${establishment.name}, ${categoryName} in ${zoneName}`}
        data-testid="establishment-card"
      >
        {/* Full-bleed image */}
        <div className="ec-image">
          {establishment.logo_url ? (
            <LazyImage
              src={establishment.logo_url}
              alt={establishment.name}
              className="ec-image-inner"
              objectFit="cover"
            />
          ) : (
            <div className="ec-image-placeholder">
              <Building2 size={48} />
            </div>
          )}
        </div>

        {/* Gradient overlay */}
        <div className="ec-gradient-overlay" />

        {/* Info box at bottom */}
        <div className="ec-info-box">
          <h3 className="ec-name">{establishment.name}</h3>

          <div className="ec-meta">
            {zoneName && (
              <span className="ec-zone">
                <MapPin size={12} />
                {zoneName}
              </span>
            )}
            <span className="ec-category">
              <span className="ec-category-icon">{categoryIcon}</span>
              {categoryName}
            </span>
          </div>

          {/* Description preview */}
          {establishment.description && variant !== 'compact' && (
            <p className="ec-description">{establishment.description}</p>
          )}
        </div>

        {/* Footer stats - positioned absolutely at bottom of card */}
        <div className="ec-footer">
          {showEmployeeCount && (
            <div className="ec-stat ec-employees">
              <Users size={14} />
              <span>
                {establishment.employee_count ?? 0}{' '}
                {(establishment.employee_count ?? 0) === 1 ? 'employee' : 'employees'}
              </span>
            </div>
          )}

          {showOpenStatus && (
            <div className={`ec-status ${isOpen ? 'open' : 'closed'}`}>
              <span className="ec-status-dot" />
              <span className="ec-status-text">
                {isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
          )}
        </div>

        {/* Neon border effect */}
        <div className="ec-neon-border" />
      </div>
    );
  }
);

EstablishmentCard.displayName = 'EstablishmentCard';

export default EstablishmentCard;
