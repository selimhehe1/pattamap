/**
 * NeonToast - Main toast notification component
 *
 * Neo-Nightlife 2025 glassmorphism design with:
 * - Gradient backgrounds per type
 * - Glow effects and animated borders
 * - Sparkle animations
 * - Progress bar
 * - Pause on hover
 * - WCAG 2.1 AA accessible
 */

import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Notification, notificationStore } from '../../stores/notificationStore';
import { neonToastVariants, closeButtonVariants, messageVariants, descriptionVariants, actionButtonVariants } from '../../animations/toastVariants';
import NeonToastIcon from './NeonToastIcon';
import NeonToastProgressBar from './NeonToastProgressBar';

// ============================================
// TYPES
// ============================================

interface NeonToastProps {
  notification: Notification;
}

// ============================================
// ARIA HELPERS
// ============================================

const getAriaProps = (type: Notification['type']) => {
  if (type === 'error') {
    return {
      role: 'alert' as const,
      'aria-live': 'assertive' as const,
    };
  }
  return {
    role: 'status' as const,
    'aria-live': 'polite' as const,
  };
};

// ============================================
// COMPONENT
// ============================================

const NeonToast = memo(({ notification }: NeonToastProps) => {
  const {
    id,
    type,
    message,
    description,
    duration,
    createdAt,
    icon,
    action,
    dismissible,
    pauseOnHover,
  } = notification;

  const [isPaused, setIsPaused] = useState(false);

  const handleMouseEnter = useCallback(() => {
    if (pauseOnHover && duration !== Infinity) {
      setIsPaused(true);
      notificationStore.pause(id);
    }
  }, [id, pauseOnHover, duration]);

  const handleMouseLeave = useCallback(() => {
    if (pauseOnHover && duration !== Infinity) {
      setIsPaused(false);
      notificationStore.resume(id);
    }
  }, [id, pauseOnHover, duration]);

  const handleDismiss = useCallback(() => {
    notificationStore.remove(id);
  }, [id]);

  const handleAction = useCallback(() => {
    action?.onClick();
    notificationStore.remove(id);
  }, [id, action]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && dismissible) {
      handleDismiss();
    }
  }, [dismissible, handleDismiss]);

  return (
    <motion.div
      layout
      className={`neon-toast neon-toast--${type}`}
      variants={neonToastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      data-toast-id={id}
      tabIndex={-1}
      {...getAriaProps(type)}
      aria-atomic="true"
    >
      {/* Animated border glow overlay */}
      <div className="neon-toast__glow-border" aria-hidden="true" />

      {/* Icon */}
      <NeonToastIcon
        type={type}
        customIcon={icon}
        showSparkles={type === 'success' || type === 'warning'}
      />

      {/* Content */}
      <div className="neon-toast__content">
        <motion.p
          className="neon-toast__message"
          variants={messageVariants}
          initial="hidden"
          animate="visible"
        >
          {message}
        </motion.p>

        {description && (
          <motion.p
            className="neon-toast__description"
            variants={descriptionVariants}
            initial="hidden"
            animate="visible"
          >
            {description}
          </motion.p>
        )}

        {action && (
          <motion.button
            className="neon-toast__action"
            variants={actionButtonVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            whileTap="tap"
            onClick={handleAction}
            type="button"
          >
            {action.label}
          </motion.button>
        )}
      </div>

      {/* Close button */}
      {dismissible && (
        <motion.button
          className="neon-toast__close"
          variants={closeButtonVariants}
          initial="hidden"
          animate="visible"
          whileHover="hover"
          whileTap="tap"
          onClick={handleDismiss}
          type="button"
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </motion.button>
      )}

      {/* Progress bar */}
      <NeonToastProgressBar
        duration={duration}
        isPaused={isPaused}
        type={type}
        createdAt={createdAt}
      />
    </motion.div>
  );
});

NeonToast.displayName = 'NeonToast';

export default NeonToast;
