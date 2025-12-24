import React, { ReactNode, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigationType } from 'react-router-dom';
import { slideUp, getReducedMotionVariant } from '../../animations/variants';
import { useViewTransition } from '../../hooks/useViewTransition';

/**
 * PageTransition Component
 * Phase 3B - Framer Motion Animations + View Transitions API
 *
 * Wraps page content with smooth enter/exit animations.
 * Automatically animates on route changes.
 *
 * Features:
 * - Uses native View Transitions API when available (Chrome 111+, Safari 18+)
 * - Falls back to Framer Motion for older browsers
 * - Respects prefers-reduced-motion
 * - Adds view-transition-name for cross-page animations
 *
 * Usage:
 * ```tsx
 * <PageTransition>
 *   <Routes>
 *     <Route path="/" element={<HomePage />} />
 *   </Routes>
 * </PageTransition>
 * ```
 */

export interface PageTransitionProps {
  children: ReactNode;
  /** Use View Transitions API when available (default: true) */
  useNativeTransitions?: boolean;
}

const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  useNativeTransitions = true
}) => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { isSupported: viewTransitionsSupported, prefersReducedMotion } = useViewTransition();
  const previousPathRef = useRef(location.pathname);

  // Determine if we should use native View Transitions
  const useNative = useNativeTransitions && viewTransitionsSupported && !prefersReducedMotion;

  // Get reduced motion safe variants for Framer Motion fallback
  const variants = getReducedMotionVariant(slideUp);

  // Track path changes for View Transitions
  useEffect(() => {
    previousPathRef.current = location.pathname;
  }, [location.pathname]);

  // If using View Transitions API, render without Framer Motion wrapper
  // The CSS in view-transitions.css handles the animations
  if (useNative) {
    return (
      <div
        className="view-transition-page"
        style={{ width: '100%', minHeight: '100vh' }}
      >
        {children}
      </div>
    );
  }

  // Fallback to Framer Motion for browsers without View Transitions API
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{ width: '100%', minHeight: '100vh' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
