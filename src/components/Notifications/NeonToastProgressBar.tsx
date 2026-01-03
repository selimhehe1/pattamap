/**
 * NeonToastProgressBar - Animated progress bar with neon glow
 *
 * Shows remaining time before auto-dismiss.
 * Features:
 * - Gradient fill matching toast type
 * - Glow effect
 * - Pause on hover support
 */

import { memo, useEffect, useRef } from 'react';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';
import { NotificationType } from '../../stores/notificationStore';

// ============================================
// TYPES
// ============================================

interface NeonToastProgressBarProps {
  duration: number;
  isPaused: boolean;
  type: NotificationType;
  createdAt: number;
}

// ============================================
// COMPONENT
// ============================================

const NeonToastProgressBar = memo(({
  duration,
  isPaused,
  type,
  createdAt,
}: NeonToastProgressBarProps) => {
  const controls = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const startTimeRef = useRef(createdAt);
  const elapsedRef = useRef(0);

  // Don't render for infinite duration (loading toasts)
  if (duration === Infinity) {
    return null;
  }

  useEffect(() => {
    if (prefersReducedMotion) {
      // No animation for reduced motion
      return;
    }

    if (isPaused) {
      // Pause: calculate elapsed time and stop
      elapsedRef.current = Date.now() - startTimeRef.current;
      controls.stop();
    } else {
      // Resume: calculate remaining time and animate
      const elapsed = elapsedRef.current;
      const remaining = Math.max(0, duration - elapsed);
      const progress = elapsed / duration;

      startTimeRef.current = Date.now() - elapsed;

      controls.start({
        scaleX: 0,
        transition: {
          duration: remaining / 1000,
          ease: 'linear',
        },
      });
    }
  }, [isPaused, duration, controls, prefersReducedMotion]);

  // Initial animation on mount
  useEffect(() => {
    if (!prefersReducedMotion) {
      controls.start({
        scaleX: 0,
        transition: {
          duration: duration / 1000,
          ease: 'linear',
        },
      });
    }
  }, [duration, controls, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className="neon-toast__progress">
      <motion.div
        className={`neon-toast__progress-bar neon-toast__progress-bar--${type}`}
        initial={{ scaleX: 1 }}
        animate={controls}
        style={{
          transformOrigin: 'left',
        }}
      />
    </div>
  );
});

NeonToastProgressBar.displayName = 'NeonToastProgressBar';

export default NeonToastProgressBar;
