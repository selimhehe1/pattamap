/**
 * Toast Animation Variants - Neon Glass Toast System
 *
 * Framer Motion variants for the Neo-Nightlife 2025 notification system.
 * Uses spring physics for natural, bouncy animations.
 */

import { Variants, Transition } from 'framer-motion';

// ============================================
// SPRING TRANSITIONS
// ============================================

/**
 * Toast entry spring - bouncy but controlled
 */
export const toastSpring: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 25,
};

/**
 * Quick exit transition
 */
export const toastExit: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: 'easeIn',
};

/**
 * Smooth transition for internal elements
 */
export const toastSmooth: Transition = {
  type: 'tween',
  duration: 0.3,
  ease: [0.25, 0.1, 0.25, 1],
};

// ============================================
// TOAST CONTAINER VARIANTS
// ============================================

/**
 * Main toast slide-in animation (from right with scale and blur)
 */
export const neonToastVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 100,
    scale: 0.85,
    filter: 'blur(8px)',
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: toastSpring,
  },
  exit: {
    opacity: 0,
    x: 100,
    scale: 0.9,
    filter: 'blur(4px)',
    transition: toastExit,
  },
};

/**
 * Stack repositioning animation
 */
export const toastStackVariants: Variants = {
  initial: { y: 0 },
  animate: {
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
};

// ============================================
// ICON ANIMATIONS
// ============================================

/**
 * Icon container with glow pulse
 */
export const iconContainerVariants: Variants = {
  hidden: {
    scale: 0,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20,
      delay: 0.1,
    },
  },
};

/**
 * Icon glow pulse animation (using CSS custom properties)
 */
export const iconGlowVariants: Variants = {
  idle: {
    boxShadow: '0 0 20px var(--toast-glow-color, rgba(232, 121, 249, 0.3))',
  },
  pulse: {
    boxShadow: [
      '0 0 20px var(--toast-glow-color, rgba(232, 121, 249, 0.3))',
      '0 0 40px var(--toast-glow-color, rgba(232, 121, 249, 0.6))',
      '0 0 20px var(--toast-glow-color, rgba(232, 121, 249, 0.3))',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Success checkmark draw animation
 */
export const checkmarkVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.4, ease: 'easeOut', delay: 0.2 },
      opacity: { duration: 0.1 },
    },
  },
};

/**
 * Error X draw animation
 */
export const xMarkVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.3, ease: 'easeOut', delay: 0.15 },
      opacity: { duration: 0.1 },
    },
  },
};

/**
 * Loading spinner rotation
 */
export const spinnerVariants: Variants = {
  spinning: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ============================================
// SPARKLE ANIMATIONS
// ============================================

/**
 * Individual sparkle animation
 */
export const sparkleVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
  },
  visible: (i: number) => ({
    opacity: [0, 1, 0],
    scale: [0, 1.2, 0],
    y: [-5, -25 - i * 8],
    x: [-15 + i * 12, 15 - i * 12],
    rotate: [0, 180],
    transition: {
      duration: 0.8,
      delay: 0.2 + i * 0.08,
      ease: 'easeOut',
    },
  }),
};

/**
 * Sparkle container stagger
 */
export const sparkleContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

// ============================================
// PROGRESS BAR
// ============================================

/**
 * Progress bar shrink animation
 */
export const progressBarVariants: Variants = {
  initial: {
    scaleX: 1,
    transformOrigin: 'left',
  },
  animate: (duration: number) => ({
    scaleX: 0,
    transition: {
      duration: duration / 1000,
      ease: 'linear',
    },
  }),
  paused: {
    // Freeze at current scaleX (handled by parent)
  },
};

/**
 * Progress bar glow animation
 */
export const progressGlowVariants: Variants = {
  idle: {
    boxShadow: '0 0 8px var(--toast-glow-color, rgba(232, 121, 249, 0.4))',
  },
  active: {
    boxShadow: [
      '0 0 8px var(--toast-glow-color, rgba(232, 121, 249, 0.4))',
      '0 0 16px var(--toast-glow-color, rgba(232, 121, 249, 0.6))',
      '0 0 8px var(--toast-glow-color, rgba(232, 121, 249, 0.4))',
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================
// CONTENT ANIMATIONS
// ============================================

/**
 * Message text fade in
 */
export const messageVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 5,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      delay: 0.15,
      ease: 'easeOut',
    },
  },
};

/**
 * Description text fade in (staggered after message)
 */
export const descriptionVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 5,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      delay: 0.25,
      ease: 'easeOut',
    },
  },
};

/**
 * Close button fade in
 */
export const closeButtonVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      delay: 0.3,
    },
  },
  hover: {
    scale: 1.1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transition: { duration: 0.15 },
  },
  tap: {
    scale: 0.95,
  },
};

/**
 * Action button animation
 */
export const actionButtonVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -10,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      delay: 0.35,
      ease: 'easeOut',
    },
  },
  hover: {
    scale: 1.02,
    boxShadow: '0 0 20px var(--toast-glow-color, rgba(232, 121, 249, 0.4))',
  },
  tap: {
    scale: 0.98,
  },
};

// ============================================
// BORDER GLOW ANIMATION
// ============================================

/**
 * Animated border glow for entire toast
 */
export const borderGlowVariants: Variants = {
  idle: {
    borderColor: 'rgba(var(--toast-glow-rgb, 232, 121, 249), 0.3)',
  },
  glowing: {
    borderColor: [
      'rgba(var(--toast-glow-rgb, 232, 121, 249), 0.3)',
      'rgba(var(--toast-glow-rgb, 232, 121, 249), 0.6)',
      'rgba(var(--toast-glow-rgb, 232, 121, 249), 0.3)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================
// REDUCED MOTION
// ============================================

/**
 * Get reduced motion safe variant
 */
export const getReducedMotionToastVariants = (): Variants => {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.01 } },
      exit: { opacity: 0, transition: { duration: 0.01 } },
    };
  }

  return neonToastVariants;
};

// ============================================
// EXPORTS
// ============================================

const toastVariants = {
  // Transitions
  toastSpring,
  toastExit,
  toastSmooth,

  // Toast
  neonToastVariants,
  toastStackVariants,

  // Icon
  iconContainerVariants,
  iconGlowVariants,
  checkmarkVariants,
  xMarkVariants,
  spinnerVariants,

  // Sparkles
  sparkleVariants,
  sparkleContainerVariants,

  // Progress
  progressBarVariants,
  progressGlowVariants,

  // Content
  messageVariants,
  descriptionVariants,
  closeButtonVariants,
  actionButtonVariants,

  // Border
  borderGlowVariants,

  // Utilities
  getReducedMotionToastVariants,
};

export default toastVariants;
