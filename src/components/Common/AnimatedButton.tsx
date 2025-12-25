import React from 'react';
import { motion } from 'framer-motion';
import { buttonHover, buttonTap } from '../../animations/variants';
import { haptic } from '../../utils/haptics';

/**
 * AnimatedButton Component
 * Phase 3B - Framer Motion Animations
 *
 * Button with hover/tap animations and optional haptic feedback.
 *
 * Usage:
 * ```tsx
 * <AnimatedButton
 *   onClick={handleClick}
 *   enableHaptic
 *   className="btn btn--primary"
 * >
 *   Click me
 * </AnimatedButton>
 * ```
 */

export interface AnimatedButtonProps {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: () => void;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  ariaLabel?: string;
  tabIndex?: number;

  /** Enable haptic feedback on tap (mobile) */
  enableHaptic?: boolean;

  /** Haptic intensity */
  hapticLevel?: 'light' | 'medium' | 'heavy';

  /** Disable animations */
  disableAnimation?: boolean;
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(({
  children,
  enableHaptic = false,
  hapticLevel = 'light',
  disableAnimation = false,
  onClick,
  onMouseEnter,
  className = '',
  style,
  type = 'button',
  disabled = false,
  ariaLabel,
  tabIndex,
}, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Trigger haptic feedback if enabled
    if (enableHaptic) {
      haptic[hapticLevel]();
    }

    // Call original onClick
    onClick?.(e);
  };

  if (disableAnimation) {
    return (
      <button
        ref={ref}
        onClick={handleClick}
        onMouseEnter={onMouseEnter}
        className={className}
        style={style}
        type={type}
        disabled={disabled}
        aria-label={ariaLabel}
        tabIndex={tabIndex}
      >
        {children}
      </button>
    );
  }

  return (
    <motion.button
      ref={ref}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      whileHover={buttonHover}
      whileTap={buttonTap}
      className={className}
      style={style}
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
    >
      {children}
    </motion.button>
  );
});

AnimatedButton.displayName = 'AnimatedButton';

export default AnimatedButton;
