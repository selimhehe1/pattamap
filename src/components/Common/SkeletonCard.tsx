import React from 'react';

/**
 * SkeletonCard - Loading placeholder for cards and lists
 *
 * Provides better perceived performance than spinners by showing
 * the structure of content while it loads.
 *
 * Benefits:
 * - Reduces perceived loading time
 * - Shows content structure
 * - Smooth pulsing animation
 * - Customizable variants
 *
 * @example
 * // Employee card skeleton
 * {isLoading ? (
 *   <SkeletonCard variant="employee" count={3} />
 * ) : (
 *   employees.map(emp => <EmployeeCard {...emp} />)
 * )}
 */

export type SkeletonVariant =
  | 'employee'      // Employee profile card
  | 'establishment' // Establishment card
  | 'list-item'     // Simple list item
  | 'profile'       // Large profile view
  | 'comment'       // Review/comment
  | 'custom';       // Custom skeleton

interface SkeletonCardProps {
  /** Skeleton variant */
  variant?: SkeletonVariant;
  /** Number of skeletons to render */
  count?: number;
  /** Custom className */
  className?: string;
  /** Animation speed (ms) */
  animationDuration?: number;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({
  variant = 'employee',
  count = 1,
  className = '',
  animationDuration = 1500
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'employee':
        return (
          <div className="skeleton-employee">
            <div className="skeleton-avatar skeleton-shimmer"></div>
            <div className="skeleton-content">
              <div className="skeleton-title skeleton-shimmer"></div>
              <div className="skeleton-subtitle skeleton-shimmer"></div>
              <div className="skeleton-tags">
                <div className="skeleton-tag skeleton-shimmer"></div>
                <div className="skeleton-tag skeleton-shimmer"></div>
              </div>
            </div>
          </div>
        );

      case 'establishment':
        return (
          <div className="skeleton-establishment">
            <div className="skeleton-image skeleton-shimmer"></div>
            <div className="skeleton-content">
              <div className="skeleton-title skeleton-shimmer"></div>
              <div className="skeleton-text skeleton-shimmer"></div>
              <div className="skeleton-text-short skeleton-shimmer"></div>
              <div className="skeleton-footer">
                <div className="skeleton-badge skeleton-shimmer"></div>
                <div className="skeleton-badge skeleton-shimmer"></div>
              </div>
            </div>
          </div>
        );

      case 'list-item':
        return (
          <div className="skeleton-list-item">
            <div className="skeleton-avatar-small skeleton-shimmer"></div>
            <div className="skeleton-list-content">
              <div className="skeleton-line skeleton-shimmer"></div>
              <div className="skeleton-line-short skeleton-shimmer"></div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="skeleton-profile">
            <div className="skeleton-profile-header">
              <div className="skeleton-avatar-large skeleton-shimmer"></div>
              <div className="skeleton-profile-info">
                <div className="skeleton-title-large skeleton-shimmer"></div>
                <div className="skeleton-subtitle skeleton-shimmer"></div>
              </div>
            </div>
            <div className="skeleton-profile-body">
              <div className="skeleton-text skeleton-shimmer"></div>
              <div className="skeleton-text skeleton-shimmer"></div>
              <div className="skeleton-text-short skeleton-shimmer"></div>
            </div>
          </div>
        );

      case 'comment':
        return (
          <div className="skeleton-comment">
            <div className="skeleton-comment-header">
              <div className="skeleton-avatar-small skeleton-shimmer"></div>
              <div className="skeleton-comment-meta">
                <div className="skeleton-line-short skeleton-shimmer"></div>
                <div className="skeleton-line-tiny skeleton-shimmer"></div>
              </div>
            </div>
            <div className="skeleton-comment-body">
              <div className="skeleton-text skeleton-shimmer"></div>
              <div className="skeleton-text skeleton-shimmer"></div>
            </div>
          </div>
        );

      default:
        return (
          <div className="skeleton-custom">
            <div className="skeleton-block skeleton-shimmer"></div>
          </div>
        );
    }
  };

  return (
    <div className={`skeleton-container ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-wrapper">
          {renderSkeleton()}
        </div>
      ))}

      <style>{`
        /* Base Skeleton Styles */
        .skeleton-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }

        .skeleton-wrapper {
          animation: fadeIn 0.3s ease-in;
        }

        /* Shimmer Animation */
        .skeleton-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.05) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0.05) 100%
          );
          background-size: 200% 100%;
          animation: shimmer ${animationDuration}ms ease-in-out infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Employee Card Skeleton */
        .skeleton-employee {
          display: flex;
          gap: 15px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(193, 154, 107, 0.2);
          border-radius: 12px;
        }

        .skeleton-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .skeleton-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .skeleton-title {
          height: 20px;
          width: 60%;
          border-radius: 4px;
        }

        .skeleton-subtitle {
          height: 16px;
          width: 40%;
          border-radius: 4px;
        }

        .skeleton-tags {
          display: flex;
          gap: 8px;
        }

        .skeleton-tag {
          height: 24px;
          width: 80px;
          border-radius: 12px;
        }

        /* Establishment Card Skeleton */
        .skeleton-establishment {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(193, 154, 107, 0.2);
          border-radius: 12px;
          overflow: hidden;
        }

        .skeleton-image {
          height: 200px;
          width: 100%;
        }

        .skeleton-establishment .skeleton-content {
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skeleton-text {
          height: 14px;
          width: 100%;
          border-radius: 4px;
        }

        .skeleton-text-short {
          height: 14px;
          width: 70%;
          border-radius: 4px;
        }

        .skeleton-footer {
          display: flex;
          gap: 10px;
          margin-top: 5px;
        }

        .skeleton-badge {
          height: 20px;
          width: 60px;
          border-radius: 10px;
        }

        /* List Item Skeleton */
        .skeleton-list-item {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(193, 154, 107, 0.2);
          border-radius: 8px;
        }

        .skeleton-avatar-small {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .skeleton-list-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .skeleton-line {
          height: 16px;
          width: 80%;
          border-radius: 4px;
        }

        .skeleton-line-short {
          height: 14px;
          width: 50%;
          border-radius: 4px;
        }

        .skeleton-line-tiny {
          height: 12px;
          width: 30%;
          border-radius: 4px;
        }

        /* Profile Skeleton */
        .skeleton-profile {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(193, 154, 107, 0.2);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .skeleton-profile-header {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .skeleton-avatar-large {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .skeleton-profile-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skeleton-title-large {
          height: 28px;
          width: 60%;
          border-radius: 4px;
        }

        .skeleton-profile-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* Comment Skeleton */
        .skeleton-comment {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(193, 154, 107, 0.2);
          border-radius: 8px;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .skeleton-comment-header {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .skeleton-comment-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .skeleton-comment-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* Custom Skeleton */
        .skeleton-custom {
          padding: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(193, 154, 107, 0.2);
          border-radius: 12px;
        }

        .skeleton-block {
          height: 100px;
          width: 100%;
          border-radius: 8px;
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .skeleton-avatar {
            width: 60px;
            height: 60px;
          }

          .skeleton-avatar-large {
            width: 80px;
            height: 80px;
          }

          .skeleton-image {
            height: 150px;
          }

          .skeleton-profile-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .skeleton-title-large,
          .skeleton-title {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default SkeletonCard;
