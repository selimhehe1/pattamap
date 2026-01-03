import React, { memo, useMemo } from 'react';
import { motion as _motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Employee } from '../../types';
import LazyImage from './LazyImage';
import { isFeatureEnabled, FEATURES } from '../../utils/featureFlags';
import { use3DTilt } from '../../hooks/use3DTilt';
import {
  Star,
  Check,
  ThumbsUp,
  Cake,
  Globe,
  Building2,
  Gem,
  Flame,
  Sparkles
} from 'lucide-react';
import '../../styles/components/employee-card.css';
import '../../styles/components/card-animations.css';

// Feature flag check
const VIP_ENABLED = isFeatureEnabled(FEATURES.VIP_SYSTEM);

interface EmployeeCardProps {
  employee: Employee;
  onClick?: (employee: Employee) => void;
  showEstablishment?: boolean;
  showRatingBadge?: boolean;
  className?: string;
}

/**
 * EmployeeCard - Tinder-style card with full image + overlay info
 *
 * Features:
 * - Full height image (aspect ratio 3/4)
 * - Gradient overlay at bottom with employee info
 * - Optional rating badge at top-right
 * - Optional establishment name
 * - Hover animations (scale + glow)
 * - Click handler for opening profile
 *
 * Used in: GirlsGallery, SearchResults, EmployeesGridView
 */
const EmployeeCard: React.FC<EmployeeCardProps> = memo(({
  employee,
  onClick,
  showEstablishment = false,
  showRatingBadge = true,
  className = ''
}) => {
  const { t } = useTranslation();

  // 3D Tilt effect hook
  const tiltRef = use3DTilt<HTMLDivElement>({
    maxTilt: 12,
    scale: 1.03,
    glowColor: 'rgba(232, 121, 249, 0.4)',
  });

  const mainPhoto = employee.photos && Array.isArray(employee.photos) && employee.photos.length > 0
    ? employee.photos[0]
    : null;

  const hasCurrentEmployment = employee.current_employment &&
    Array.isArray(employee.current_employment) &&
    employee.current_employment.length > 0;

  const currentEstablishment = hasCurrentEmployment && employee.current_employment?.[0]?.establishment
    ? employee.current_employment[0].establishment
    : null;

  const hasRating = employee.average_rating !== undefined && employee.average_rating > 0;

  // Check if employee is VIP (active subscription) - only if VIP feature is enabled
  const isVIP = VIP_ENABLED && employee.is_vip && employee.vip_expires_at && new Date(employee.vip_expires_at) > new Date();

  // Check if employee is "HOT" (popular - high vote count)
  const isHot = useMemo(() => {
    return (employee.vote_count ?? 0) >= 10;
  }, [employee.vote_count]);

  // Check if employee is NEW (created in last 7 days)
  const isNew = useMemo(() => {
    if (!employee.created_at) return false;
    const createdDate = new Date(employee.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdDate > sevenDaysAgo;
  }, [employee.created_at]);

  return (
    <div
      ref={tiltRef}
      className={`employee-card-tinder employee-card-container employee-card-premium card-3d-tilt ${isVIP ? 'employee-card-vip' : ''} ${isHot ? 'employee-card-hot' : ''} ${className}`}
      onClick={() => onClick?.(employee)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(employee);
        }
      }}
      aria-label={t('employeeCard.ariaViewProfile', { name: employee.name })}
      data-testid="employee-card-inner"
    >
      {/* NEW Ribbon */}
      {isNew && (
        <div className="ribbon-new">
          <Sparkles size={10} style={{ marginRight: 4 }} />
          NEW
        </div>
      )}
      {/* Full Height Image */}
      <div className="employee-card-image">
        {mainPhoto ? (
          <LazyImage
            src={mainPhoto}
            alt={t('employeeCard.altTextPhoto', {
              name: employee.name,
              age: employee.age,
              nationality: Array.isArray(employee.nationality) ? employee.nationality.join(' / ') : employee.nationality
            })}
            cloudinaryPreset="cardPreview"
            objectFit="cover"
            className="employee-card-img"
            placeholderSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='267' viewBox='0 0 200 267'%3E%3Crect width='200' height='267' fill='%23333'/%3E%3Ccircle cx='100' cy='90' r='40' fill='%23666'/%3E%3Cellipse cx='100' cy='200' rx='60' ry='50' fill='%23666'/%3E%3C/svg%3E"
            enableResponsive={true}
            responsiveType="employee"
          />
        ) : (
          <div className="employee-card-placeholder">
            <div className="employee-card-placeholder-initials">
              {employee.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
        )}
      </div>

      {/* Rating Badge - Top Right */}
      {showRatingBadge && hasRating && (
        <div className="employee-card-rating-badge">
          <Star size={14} fill="#FFD700" color="#FFD700" style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {(employee.average_rating ?? 0).toFixed(1)}
        </div>
      )}

      {/* Verified Badge - Simple (Top Left) - v10.3 */}
      {employee.is_verified && (
        <div
          className="employee-card-verified-corner"
          title={employee.verified_at ? `Verified on ${new Date(employee.verified_at).toLocaleDateString()}` : 'Verified Profile'}
          role="img"
          aria-label={t('employeeCard.verifiedProfile', 'Verified profile')}
        >
          <span className="verified-icon" aria-hidden="true"><Check size={12} /></span>
          <span>VERIFIED</span>
        </div>
      )}

      {/* Vote Badge - Top Left (below Verified if present) - v10.3 */}
      {employee.vote_count !== undefined && employee.vote_count > 0 && (
        <div
          className={`employee-card-vote-badge ${employee.is_verified ? 'employee-card-vote-badge-offset' : ''}`}
          title={`${employee.vote_count} ${employee.vote_count === 1 ? 'vote' : 'votes'} for existence confirmation`}
          role="img"
          aria-label={t('employeeCard.voteCount', { count: employee.vote_count })}
        >
          <span aria-hidden="true"><ThumbsUp size={14} /></span> {employee.vote_count}
        </div>
      )}

      {/* Gradient Overlay with Info - Glassmorphic Compact Card v2.0 */}
      <div className="employee-card-overlay">
        <div className={`employee-card-info ${!isVIP ? 'employee-card-info--no-vip' : ''}`}>
          {/* Row 1: Name + Nickname (inline) + Quick Info (Age/Nationality chips) */}
          <div className="employee-card-main-row">
            <div className="employee-card-name-row">
              <h3 className="employee-card-name">
                {employee.name}
              </h3>
              {employee.nickname && (
                <span className="employee-card-nickname-inline">"{employee.nickname}"</span>
              )}
            </div>
            <div className="employee-card-quick-info">
              {employee.age && (
                <span className="employee-card-quick-info-item">
                  <Cake size={10} className="employee-card-icon" />
                  <span>{employee.age}</span>
                </span>
              )}
              {employee.nationality && Array.isArray(employee.nationality) && employee.nationality.length > 0 && (
                <span className="employee-card-quick-info-item">
                  <Globe size={10} className="employee-card-icon" />
                  <span>{employee.nationality[0].substring(0, 3).toUpperCase()}</span>
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Tags (Type + Establishment) */}
          <div className="employee-card-tags-row">
            {(() => {
              const hasActiveFreelance = employee.independent_position?.is_active;
              const isSimpleFreelance = employee.is_freelance === true;
              const hasCurrentEmploymentCheck = employee.current_employment?.some((ce) => ce.is_current);

              const isFreelanceType = hasActiveFreelance || isSimpleFreelance;
              const isRegularType = hasCurrentEmploymentCheck;

              if (isFreelanceType) {
                return (
                  <span className="employee-card-tag employee-card-tag-freelance">
                    <Gem size={11} className="employee-card-tag-icon" />
                    <span>{t('search.freelances')}</span>
                  </span>
                );
              } else if (isRegularType) {
                return (
                  <span className="employee-card-tag employee-card-tag-employee">
                    <Building2 size={11} className="employee-card-tag-icon" />
                    <span>{t('search.regularEmployees')}</span>
                  </span>
                );
              }
              return null;
            })()}
            {showEstablishment && currentEstablishment && (
              <span className="employee-card-tag employee-card-tag-establishment">
                <Building2 size={11} className="employee-card-tag-icon" />
                <span>{currentEstablishment.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* VIP Badge - Bottom Right - Positioned outside info box */}
        {VIP_ENABLED && employee.is_vip && employee.vip_expires_at && new Date(employee.vip_expires_at) > new Date() && (
          <div
            className="employee-card-vip-badge"
            title={`VIP until ${new Date(employee.vip_expires_at).toLocaleDateString()}`}
          >
            VIP
          </div>
        )}

        {/* HOT Badge - For popular employees */}
        {isHot && !isVIP && (
          <div className="employee-card-hot-badge fire-glow">
            <Flame size={12} />
            <span>HOT</span>
          </div>
        )}
      </div>

      {/* Neon border glow */}
      <div className="employee-card-neon-border" />
    </div>
  );
});

EmployeeCard.displayName = 'EmployeeCard';

export default EmployeeCard;
