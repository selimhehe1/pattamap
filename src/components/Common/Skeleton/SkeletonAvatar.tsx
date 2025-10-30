import React from 'react';
import SkeletonBase from './SkeletonBase';

/**
 * SkeletonAvatar - Skeleton for circular profile images
 *
 * Used in employee cards, favorite lists, etc.
 */

interface SkeletonAvatarProps {
  /** Size of the avatar in pixels */
  size?: number;

  /** Additional CSS class names */
  className?: string;
}

const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 60,
  className = '',
}) => {
  return (
    <SkeletonBase
      width={size}
      height={size}
      circle
      className={`skeleton-avatar ${className}`}
    />
  );
};

export default SkeletonAvatar;
