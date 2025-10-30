import React from 'react';
import { motion } from 'framer-motion';
import { fadeIn, getReducedMotionVariant } from '../../../animations/variants';

/**
 * SkeletonBase - Base skeleton component with shimmer animation
 * Phase 3B - Enhanced with Framer Motion
 *
 * Used as foundation for all skeleton components.
 * Provides consistent shimmer effect (CSS) with smooth fade-in (Framer Motion).
 */

interface SkeletonBaseProps {
  /** Width in CSS units (px, %, rem, etc.) */
  width?: string | number;

  /** Height in CSS units (px, %, rem, etc.) */
  height?: string | number;

  /** Border radius for rounded corners */
  borderRadius?: string | number;

  /** Additional CSS class names */
  className?: string;

  /** Variant: shimmer (default) or pulse */
  variant?: 'shimmer' | 'pulse';

  /** Whether to display as circle (for avatars) */
  circle?: boolean;

  /** Disable entry animation */
  disableAnimation?: boolean;
}

const SkeletonBase: React.FC<SkeletonBaseProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
  className = '',
  variant = 'shimmer',
  circle = false,
  disableAnimation = false,
}) => {
  const formatSize = (size: string | number) => {
    return typeof size === 'number' ? `${size}px` : size;
  };

  const style: React.CSSProperties = {
    width: formatSize(width),
    height: formatSize(height),
    borderRadius: circle ? '50%' : formatSize(borderRadius),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  };

  const variants = getReducedMotionVariant(fadeIn);

  if (disableAnimation) {
    return (
      <div
        className={`skeleton-base skeleton-${variant} ${className}`}
        style={style}
        aria-busy="true"
        aria-live="polite"
        aria-label="Loading..."
      >
        <div className="skeleton-shimmer" />
      </div>
    );
  }

  return (
    <motion.div
      className={`skeleton-base skeleton-${variant} ${className}`}
      style={style}
      variants={variants}
      initial="hidden"
      animate="visible"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading..."
    >
      <div className="skeleton-shimmer" />
    </motion.div>
  );
};

export default SkeletonBase;
