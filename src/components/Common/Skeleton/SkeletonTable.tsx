import React from 'react';
import SkeletonBase from './SkeletonBase';
import SkeletonCard from './SkeletonCard';

/**
 * SkeletonTable - Skeleton for admin tables and grids
 *
 * Used in admin panels for loading states.
 * Supports card-grid (establishments, employees) and list (users, comments) variants.
 */

interface SkeletonTableProps {
  /** Number of rows/items to show */
  rows?: number;

  /** Layout variant */
  variant?: 'card-grid' | 'list';

  /** Show header skeleton */
  showHeader?: boolean;

  /** Additional CSS class names */
  className?: string;
}

const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 6,
  variant = 'card-grid',
  showHeader = true,
  className = '',
}) => {
  return (
    <div
      className={`skeleton-table skeleton-table-${variant} ${className}`}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading content..."
    >
      {/* Header skeleton */}
      {showHeader && (
        <div
          className="skeleton-table-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          {/* Title */}
          <SkeletonBase width={200} height={28} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <SkeletonBase width={120} height={36} borderRadius="8px" />
            <SkeletonBase width={80} height={36} borderRadius="8px" />
          </div>
        </div>
      )}

      {/* Content */}
      {variant === 'card-grid' ? (
        <div
          className="skeleton-table-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}
        >
          {Array.from({ length: rows }).map((_, index) => (
            <SkeletonCard
              key={index}
              variant="establishment"
              showImage
              showAvatar={false}
              textLines={2}
            />
          ))}
        </div>
      ) : (
        <div
          className="skeleton-table-list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              className="skeleton-list-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(193, 154, 107, 0.2)',
                borderRadius: '12px',
              }}
            >
              {/* Avatar */}
              <SkeletonBase width={48} height={48} circle />

              {/* Content */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <SkeletonBase height={18} width="60%" />
                <SkeletonBase height={14} width="40%" />
              </div>

              {/* Status badge */}
              <SkeletonBase width={80} height={24} borderRadius="12px" />

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <SkeletonBase width={32} height={32} borderRadius="8px" />
                <SkeletonBase width={32} height={32} borderRadius="8px" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SkeletonTable;
