import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { fadeIn, getReducedMotionVariant } from '../../animations/variants';

/**
 * LoadingFallback - Skeleton screen for lazy-loaded components
 * Phase 3B - Enhanced with Framer Motion
 *
 * Displays a branded loading animation while React.lazy() components load.
 * Uses nightlife theme colors and provides visual feedback during code splitting.
 *
 * Performance: Lightweight component to minimize initial bundle size
 */

interface LoadingFallbackProps {
  message?: string;
  variant?: 'page' | 'modal' | 'inline';
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message,
  variant = 'page'
}) => {
  const { t } = useTranslation();
  const defaultMessage = message || t('common.loading');
  const fadeVariants = getReducedMotionVariant(fadeIn);
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: variant === 'page' ? '100vh' : variant === 'modal' ? '400px' : '200px',
    background: variant === 'page'
      ? 'linear-gradient(135deg, #0a0a2e, #16213e, #240046)'
      : 'transparent',
    color: '#ffffff',
    padding: '40px 20px',
  };

  const spinnerContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '80px',
    height: '80px',
    marginBottom: '24px',
  };

  const spinnerStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    border: '4px solid rgba(255, 255, 255, 0.1)',
    borderTop: '4px solid #C19A6B',
    borderRadius: '50%',
  };

  const pulseStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    border: '4px solid rgba(0, 229, 255, 0.3)',
    borderRadius: '50%',
  };

  const textStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '500',
    background: 'linear-gradient(45deg, #C19A6B, #00E5FF, #FFD700)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '12px',
  };

  const subtextStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: '8px',
  };

  return (
    <motion.div
      style={containerStyle}
      variants={fadeVariants}
      initial="hidden"
      animate="visible"
      role="status"
      aria-live="polite"
      aria-label={defaultMessage}
    >
      <div style={spinnerContainerStyle}>
        <motion.div
          style={spinnerStyle}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <motion.div
          style={pulseStyle}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <motion.div
        style={textStyle}
        animate={{
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {defaultMessage}
      </motion.div>

      {variant === 'page' && (
        <motion.div
          style={subtextStyle}
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
        >
          {t('common.preparingExperience')}
        </motion.div>
      )}
    </motion.div>
  );
};

export default LoadingFallback;
