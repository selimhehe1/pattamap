/**
 * ModalHeader - Reusable modal header component
 *
 * Standardized header with animated icon, title, and optional subtitle.
 * Used across premium modals for consistent look and feel.
 */

import React from 'react';
import { motion } from 'framer-motion';

export type ModalVariant = 'info' | 'success' | 'warning' | 'danger';
export type ModalLayout = 'centered' | 'form';

export interface ModalHeaderProps {
  /** Modal title */
  title: string;
  /** Title element ID for aria-labelledby */
  titleId?: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Variant affects icon/title colors */
  variant?: ModalVariant;
  /** Layout style: centered (default) or form (left-aligned) */
  layout?: ModalLayout;
  /** Whether to show icon with animations */
  withIcon?: boolean;
  /** Custom className */
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  titleId,
  subtitle,
  icon,
  variant = 'info',
  layout = 'centered',
  withIcon = true,
  className = ''
}) => {
  const isFormLayout = layout === 'form';

  const headerClass = isFormLayout
    ? 'modal-premium__header modal-premium__header--form'
    : withIcon && icon
      ? 'modal-premium__header modal-premium__header--with-icon'
      : 'modal-premium__header';

  // Animation direction based on layout
  const titleAnimation = isFormLayout
    ? { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className={`${headerClass} ${className}`}>
      {withIcon && icon && (
        <motion.div
          className={`modal-premium__icon modal-premium__icon--${variant}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
        >
          {icon}
        </motion.div>
      )}

      <motion.h2
        id={titleId}
        className={`modal-premium__title modal-premium__title--${variant}`}
        initial={titleAnimation.initial}
        animate={titleAnimation.animate}
        transition={{ delay: 0.15 }}
      >
        {title}
      </motion.h2>

      {subtitle && (
        <motion.p
          className="modal-premium__subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
};

export default ModalHeader;
