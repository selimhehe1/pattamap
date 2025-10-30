import React from 'react';
import SkeletonBase from './SkeletonBase';

/**
 * SkeletonText - Skeleton for text lines and paragraphs
 *
 * Useful for titles, descriptions, and body text.
 */

interface SkeletonTextProps {
  /** Number of lines to display */
  lines?: number;

  /** Width of the last line (for realistic look) */
  lastLineWidth?: string;

  /** Height of each line */
  lineHeight?: number;

  /** Gap between lines */
  gap?: number;

  /** Additional CSS class names */
  className?: string;
}

const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lastLineWidth = '70%',
  lineHeight = 16,
  gap = 8,
  className = '',
}) => {
  return (
    <div className={`skeleton-text ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBase
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  );
};

export default SkeletonText;
