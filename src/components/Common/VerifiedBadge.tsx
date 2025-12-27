import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../styles/components/verified-badge.css';

interface VerifiedBadgeProps {
  isVerified: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

/**
 * VerifiedBadge Component (v10.3 - Simple Admin Verification)
 *
 * Displays a verified checkmark badge for trusted employee profiles
 * Simple system: admin manually verifies profiles
 *
 * Features:
 * - Gold checkmark badge (✓)
 * - 3 size variants (small, medium, large)
 * - Accessible with aria-label
 * - Multilingual (6 languages via i18n)
 * - Lightweight (no API calls, pure display component)
 *
 * Usage:
 * ```tsx
 * <VerifiedBadge isVerified={employee.is_verified} size="medium" />
 * ```
 */
const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  isVerified,
  size = 'medium',
  className = ''
}) => {
  const { t } = useTranslation();

  if (!isVerified) {
    return null;
  }

  const sizeClasses = {
    small: 'verified-badge-small',
    medium: 'verified-badge-medium',
    large: 'verified-badge-large'
  };

  return (
    <span
      className={`verified-badge ${sizeClasses[size]} ${className}`}
      aria-label={t('verification.verifiedProfile')}
      title={t('verification.verifiedTooltip')}
      role="img"
    >
      ✓
    </span>
  );
};

export default VerifiedBadge;
