import React from 'react';
import SkeletonBase from './SkeletonBase';
import SkeletonText from './SkeletonText';
import SkeletonGallery from './SkeletonGallery';

/**
 * SkeletonDetailPage - Skeleton for detail page loading states
 *
 * Replaces icon-based loading with a proper skeleton that shows
 * the structure of the page being loaded.
 * Used in BarDetailPage, EmployeeDetailPage, etc.
 */

interface SkeletonDetailPageProps {
  /** Page variant */
  variant?: 'establishment' | 'employee';

  /** Show sidebar skeleton (desktop layout) */
  showSidebar?: boolean;

  /** Number of cards in gallery skeleton */
  galleryCount?: number;

  /** Additional CSS class names */
  className?: string;
}

const SkeletonDetailPage: React.FC<SkeletonDetailPageProps> = ({
  variant = 'establishment',
  showSidebar = true,
  galleryCount = 6,
  className = '',
}) => {
  return (
    <div
      className={`skeleton-detail-page ${className}`}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a2e, #16213e, #240046)',
        padding: '80px 20px 40px',
      }}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading page content..."
    >
      {/* Header Section */}
      <div
        className="skeleton-detail-header"
        style={{
          maxWidth: '1400px',
          margin: '0 auto 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* Logo/Avatar */}
        <SkeletonBase
          width={120}
          height={120}
          circle
        />

        {/* Title */}
        <SkeletonBase
          width={300}
          height={32}
        />

        {/* Subtitle/Status */}
        <SkeletonBase
          width={200}
          height={20}
        />

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginTop: '8px',
          }}
        >
          <SkeletonBase width={100} height={36} borderRadius="18px" />
          <SkeletonBase width={100} height={36} borderRadius="18px" />
        </div>
      </div>

      {/* Content Section */}
      <div
        className="skeleton-detail-content"
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: showSidebar ? '1fr 320px' : '1fr',
          gap: '24px',
        }}
      >
        {/* Main Content - Gallery */}
        <div className="skeleton-detail-main">
          {variant === 'establishment' ? (
            <SkeletonGallery count={galleryCount} variant="employee" />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* Employee profile content skeleton */}
              <SkeletonBase height={300} borderRadius="16px" />
              <SkeletonText lines={4} lineHeight={18} gap={10} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div
            className="skeleton-detail-sidebar"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(193, 154, 107, 0.2)',
              borderRadius: '16px',
              padding: '20px',
              height: 'fit-content',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Sidebar title */}
            <SkeletonBase height={24} width="70%" />

            {/* Info rows */}
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <SkeletonBase width={24} height={24} circle />
                <SkeletonBase height={16} width="80%" />
              </div>
            ))}

            {/* Divider */}
            <SkeletonBase height={1} width="100%" />

            {/* Description */}
            <SkeletonText lines={3} lineHeight={14} gap={8} />

            {/* Button */}
            <SkeletonBase height={44} borderRadius="22px" />
          </div>
        )}
      </div>

      {/* Mobile responsive styles */}
      <style>
        {`
          @media (max-width: 768px) {
            .skeleton-detail-content {
              grid-template-columns: 1fr !important;
            }
            .skeleton-detail-sidebar {
              order: -1;
            }
          }
        `}
      </style>
    </div>
  );
};

export default SkeletonDetailPage;
