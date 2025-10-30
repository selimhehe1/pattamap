import React from 'react';
import SkeletonCard from './SkeletonCard';

/**
 * SkeletonGallery - Grid of skeleton cards
 *
 * Used while loading galleries of employees or establishments.
 * Adapts to mobile/desktop layouts.
 */

interface SkeletonGalleryProps {
  /** Number of skeleton cards to show */
  count?: number;

  /** Card variant */
  variant?: 'employee' | 'establishment';

  /** Additional CSS class names */
  className?: string;
}

const SkeletonGallery: React.FC<SkeletonGalleryProps> = ({
  count = 6,
  variant = 'employee',
  className = '',
}) => {
  return (
    <div
      className={`skeleton-gallery ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
        width: '100%',
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard
          key={index}
          variant={variant}
          showAvatar={variant === 'employee'}
          showImage={variant === 'establishment'}
        />
      ))}
    </div>
  );
};

export default SkeletonGallery;
