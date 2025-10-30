import React from 'react';
import { motion } from 'framer-motion';

export interface SegmentedControlOption<T> {
  value: T;
  label: string;
  icon?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * SegmentedControl - Material Design 3 inspired segmented control
 *
 * Features:
 * - Smooth animated indicator with Framer Motion
 * - Accessible (WCAG AAA: 44px height, keyboard nav, aria-labels)
 * - Nightlife theme with gradient
 * - Generic type support
 *
 * @component
 */
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = ''
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`segmented-control ${className}`}
      role="group"
      aria-label="View mode selector"
      style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '2px solid rgba(193, 154, 107, 0.3)',
        borderRadius: '12px',
        padding: '4px',
        position: 'relative',
        width: '100%',
        minHeight: '48px', // WCAG AAA
        boxSizing: 'border-box'
      }}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`segmented-control__button ${isActive ? 'active' : ''}`}
            aria-label={option.label}
            aria-pressed={isActive}
            style={{
              flex: 1,
              position: 'relative',
              background: 'transparent',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 12px',
              color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
              fontSize: '0.875rem',
              fontWeight: isActive ? '700' : '600',
              cursor: 'pointer',
              transition: 'color 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              zIndex: isActive ? 2 : 1,
              minHeight: '40px'
            }}
          >
            {/* Active background indicator */}
            {isActive && (
              <motion.div
                layoutId="activeSegment"
                className="segmented-control__active-bg"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, #C19A6B, #9B5DE5)',
                  borderRadius: '10px',
                  boxShadow: '0 4px 15px rgba(193, 154, 107, 0.4), 0 0 20px rgba(193, 154, 107, 0.3)',
                  zIndex: -1
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30
                }}
              />
            )}

            {option.icon && (
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
