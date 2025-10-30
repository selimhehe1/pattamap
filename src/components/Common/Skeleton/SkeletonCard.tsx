import React from 'react';
import SkeletonBase from './SkeletonBase';
import SkeletonAvatar from './SkeletonAvatar';
import SkeletonText from './SkeletonText';

/**
 * SkeletonCard - Skeleton for employee/establishment cards
 *
 * Mimics the structure of GirlCard and similar components.
 * Used in galleries, search results, favorites lists.
 */

interface SkeletonCardProps {
  /** Show avatar (for employee cards) */
  showAvatar?: boolean;

  /** Show large image (for establishment cards) */
  showImage?: boolean;

  /** Number of text lines */
  textLines?: number;

  /** Card variant */
  variant?: 'employee' | 'establishment';

  /** Additional CSS class names */
  className?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showAvatar = true,
  showImage = false,
  textLines = 3,
  variant = 'employee',
  className = '',
}) => {
  return (
    <div
      className={`skeleton-card skeleton-card-${variant} ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(193, 154, 107, 0.2)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Image/Avatar */}
      {showImage && (
        <SkeletonBase
          height={200}
          borderRadius="12px"
        />
      )}

      {showAvatar && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SkeletonAvatar size={80} />
        </div>
      )}

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <SkeletonBase height={24} width="60%" />
      </div>

      {/* Description lines */}
      <SkeletonText lines={textLines} lineHeight={14} gap={6} />

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <SkeletonBase height={36} borderRadius="18px" />
        <SkeletonBase height={36} width={60} borderRadius="18px" />
      </div>
    </div>
  );
};

export default SkeletonCard;
