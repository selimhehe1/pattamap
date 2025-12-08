import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Employee } from '../../types';
import LazyImage from './LazyImage';
import { isFeatureEnabled, FEATURES } from '../../utils/featureFlags';
import '../../styles/components/employee-card.css';

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
const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  onClick,
  showEstablishment = false,
  showRatingBadge = true,
  className = ''
}) => {
  const { t } = useTranslation();
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

  return (
    <motion.div
      className={`employee-card-tinder ${isVIP ? 'employee-card-vip' : ''} ${className}`}
      onClick={() => onClick?.(employee)}
      whileHover={{
        scale: 1.05,
        boxShadow: '0 20px 40px rgba(193, 154, 107,0.4)',
        transition: { type: 'spring', stiffness: 300 }
      }}
      whileTap={{ scale: 0.98 }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(employee);
        }
      }}
      aria-label={t('employeeCard.ariaViewProfile', { name: employee.name })}
    >
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
            placeholderSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='267'%3E%3Crect width='200' height='267' fill='%23333'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='60'%3E👤%3C/text%3E%3C/svg%3E"
            enableResponsive={true}
            responsiveType="employee"
          />
        ) : (
          <div className="employee-card-placeholder">
            <span className="employee-card-placeholder-icon">👤</span>
          </div>
        )}
      </div>

      {/* Rating Badge - Top Right */}
      {showRatingBadge && hasRating && (
        <div className="employee-card-rating-badge">
          ⭐ {(employee.average_rating ?? 0).toFixed(1)}
        </div>
      )}

      {/* Verified Badge - Simple (Top Left) - v10.3 */}
      {employee.is_verified && (
        <div className="employee-card-verified-corner" title={employee.verified_at ? `Verified on ${new Date(employee.verified_at).toLocaleDateString()}` : 'Verified Profile'}>
          <span className="verified-icon">✓</span>
          <span>VERIFIED</span>
        </div>
      )}

      {/* Vote Badge - Top Left (below Verified if present) - v10.3 */}
      {employee.vote_count !== undefined && employee.vote_count > 0 && (
        <div
          className={`employee-card-vote-badge ${employee.is_verified ? 'employee-card-vote-badge-offset' : ''}`}
          title={`${employee.vote_count} ${employee.vote_count === 1 ? 'vote' : 'votes'} for existence confirmation`}
        >
          👍 {employee.vote_count}
        </div>
      )}

      {/* Gradient Overlay with Info */}
      <div className="employee-card-overlay">
        <div className={`employee-card-info ${!isVIP ? 'employee-card-info--no-vip' : ''}`}>
          {/* Two-column layout */}
          <div className="employee-card-info-columns">
            {/* Left column: Name + Nickname */}
            <div className="employee-card-info-left">
              <h3 className="employee-card-name">
                {employee.name}
              </h3>
              {employee.nickname && (
                <p className="employee-card-nickname">"{employee.nickname}"</p>
              )}
            </div>

            {/* Right column: Age, Nationality, Establishment */}
            <div className="employee-card-info-right">
              {employee.age && (
                <span className="employee-card-detail">
                  <span className="employee-card-icon">🎂</span>
                  <span>{employee.age}</span>
                </span>
              )}
              {employee.nationality && Array.isArray(employee.nationality) && employee.nationality.length > 0 && (
                <span className="employee-card-detail">
                  <span className="employee-card-icon">🌍</span>
                  <span>{employee.nationality.join(' / ')}</span>
                </span>
              )}
              {showEstablishment && currentEstablishment && (
                <div className="employee-card-establishment">
                  <span className="employee-card-icon">🏢</span>
                  <span className="employee-card-establishment-name">
                    {currentEstablishment.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Employee Type Badge (Freelance or Regular) - v10.3 */}
          {(() => {
            const hasActiveFreelance = employee.independent_position?.is_active;
            const isSimpleFreelance = employee.is_freelance === true;
            const hasCurrentEmployment = employee.current_employment?.some((ce) => ce.is_current);

            const isFreelance = hasActiveFreelance || isSimpleFreelance;
            const isRegular = hasCurrentEmployment;

            if (isFreelance) {
              return (
                <div className="employee-card-type employee-card-type-freelance">
                  <span className="employee-card-type-icon">💎</span>
                  <span className="employee-card-type-label">{t('search.freelances')}</span>
                </div>
              );
            } else if (isRegular) {
              return (
                <div className="employee-card-type employee-card-type-regular">
                  <span className="employee-card-type-icon">🏢</span>
                  <span className="employee-card-type-label">{t('search.regularEmployees')}</span>
                </div>
              );
            }
            return null;
          })()}

          {/* VIP Badge - Bottom Right - v10.3 Phase 4 - Crown via CSS ::before (only if VIP feature enabled) */}
          {VIP_ENABLED && employee.is_vip && employee.vip_expires_at && new Date(employee.vip_expires_at) > new Date() && (
            <div
              className="employee-card-vip-badge"
              title={`VIP until ${new Date(employee.vip_expires_at).toLocaleDateString()}`}
            >
              VIP
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default EmployeeCard;
