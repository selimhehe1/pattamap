import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { slideUp, getReducedMotionVariant } from '../../animations/variants';

/**
 * PageTransition Component
 * Phase 3B - Framer Motion Animations
 *
 * Wraps page content with smooth enter/exit animations.
 * Automatically animates on route changes.
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
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();

  // Get reduced motion safe variants
  const variants = getReducedMotionVariant(slideUp);

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
