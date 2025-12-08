/**
 * Animation Variants - Framer Motion Presets
 * Phase 3B - Framer Motion Animations
 *
 * Reusable animation variants for consistent motion design across the app.
 *
 * Usage:
 * ```tsx
 * import { fadeIn, slideUp } from './animations/variants';
 *
 * <motion.div variants={fadeIn} initial="hidden" animate="visible">
 *   Content
 * </motion.div>
 * ```
 */

import { Variants, Transition } from 'framer-motion';

// ============================================
// TRANSITIONS
// ============================================

/**
 * Spring transition (bouncy, natural)
 */
export const spring: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
};

/**
 * Smooth transition (easing)
 */
export const smooth: Transition = {
  type: 'tween',
  duration: 0.3,
  ease: [0.25, 0.1, 0.25, 1], // ease-in-out cubic
};

/**
 * Quick transition
 */
export const quick: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: 'easeOut',
};

/**
 * Slow transition (for dramatic effects)
 */
export const slow: Transition = {
  type: 'tween',
  duration: 0.5,
  ease: 'easeInOut',
};

// ============================================
// PAGE TRANSITIONS
// ============================================

/**
 * Fade in/out
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: smooth },
  exit: { opacity: 0, transition: quick },
};

/**
 * Slide up (from bottom)
 */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: smooth },
  exit: { opacity: 0, y: -20, transition: quick },
};

/**
 * Slide down (from top)
 */
export const slideDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: smooth },
  exit: { opacity: 0, y: 20, transition: quick },
};

/**
 * Slide right (from left)
 */
export const slideRight: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: smooth },
  exit: { opacity: 0, x: 20, transition: quick },
};

/**
 * Slide left (from right)
 */
export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: smooth },
  exit: { opacity: 0, x: -20, transition: quick },
};

// ============================================
// MODAL TRANSITIONS
// ============================================

/**
 * Modal scale + fade
 */
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: quick
  },
};

/**
 * Modal backdrop fade
 */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// ============================================
// BUTTON INTERACTIONS
// ============================================

/**
 * Button hover/tap animations
 */
export const buttonHover = {
  scale: 1.05,
  boxShadow: '0 0 20px rgba(193, 154, 107, 0.4)',
  transition: spring,
};

export const buttonTap = {
  scale: 0.95,
  transition: quick,
};

// ============================================
// CARD ANIMATIONS
// ============================================

/**
 * Card hover lift
 */
export const cardHover = {
  y: -5,
  boxShadow: '0 10px 30px rgba(193, 154, 107, 0.3)',
  transition: { type: 'spring' as const, stiffness: 300 },
};

/**
 * Card stagger children (for lists)
 */
export const cardContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const cardItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: smooth },
};

// ============================================
// FAVORITE/LIKE ANIMATIONS
// ============================================

/**
 * Heart bounce (add to favorites)
 */
export const heartBounce: Variants = {
  idle: { scale: 1 },
  active: {
    scale: [1, 1.3, 1],
    transition: {
      duration: 0.5,
      times: [0, 0.5, 1],
      type: 'tween',
      ease: 'easeInOut',
    }
  },
};

/**
 * Pulse animation (loading, waiting)
 */
export const pulse: Variants = {
  idle: { scale: 1, opacity: 1 },
  pulsing: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================
// LOADING ANIMATIONS
// ============================================

/**
 * Spinner rotation
 */
export const spin: Variants = {
  spinning: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Shimmer (skeleton loading)
 */
export const shimmer = {
  backgroundPosition: ['200% 0', '-200% 0'],
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: 'linear',
  },
};

// ============================================
// FORM ANIMATIONS
// ============================================

/**
 * Error shake
 */
export const shake: Variants = {
  error: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.5 },
  },
};

/**
 * Success checkmark
 */
export const checkmark: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// ============================================
// NOTIFICATION/TOAST ANIMATIONS
// ============================================

/**
 * Toast slide in from right
 */
export const toastSlideIn: Variants = {
  hidden: { x: 400, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 }
  },
  exit: {
    x: 400,
    opacity: 0,
    transition: quick
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get reduced motion safe variant
 * Respects prefers-reduced-motion
 */
export const getReducedMotionVariant = (variants: Variants): Variants => {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    // Return simplified variants (instant, no animation)
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0 } },
      exit: { opacity: 0, transition: { duration: 0 } },
    };
  }

  return variants;
};

/**
 * Create stagger container
 */
export const createStaggerContainer = (staggerDelay = 0.1): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

/**
 * Create delayed variant
 */
export const createDelayedVariant = (
  variant: Variants,
  delay: number
): Variants => {
  const newVariant = { ...variant };

  if (newVariant.visible && typeof newVariant.visible === 'object') {
    newVariant.visible = {
      ...newVariant.visible,
      transition: {
        ...(typeof newVariant.visible.transition === 'object'
          ? newVariant.visible.transition
          : {}),
        delay,
      },
    };
  }

  return newVariant;
};

const animationVariants = {
  // Transitions
  spring,
  smooth,
  quick,
  slow,

  // Page transitions
  fadeIn,
  slideUp,
  slideDown,
  slideRight,
  slideLeft,

  // Modals
  modalVariants,
  backdropVariants,

  // Buttons
  buttonHover,
  buttonTap,

  // Cards
  cardHover,
  cardContainer,
  cardItem,

  // Favorites
  heartBounce,
  pulse,

  // Loading
  spin,
  shimmer,

  // Forms
  shake,
  checkmark,

  // Toasts
  toastSlideIn,

  // Utilities
  getReducedMotionVariant,
  createStaggerContainer,
  createDelayedVariant,
};

export default animationVariants;
