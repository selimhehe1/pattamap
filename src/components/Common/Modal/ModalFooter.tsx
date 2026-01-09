/**
 * ModalFooter - Reusable modal footer component
 *
 * Standardized footer with animated primary/secondary action buttons.
 * Used across premium modals for consistent look and feel.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Check, Send, Loader2 } from 'lucide-react';

export type ModalFooterVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ModalFooterAction {
  /** Button label */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Icon to show */
  icon?: React.ReactNode;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether button is in loading state */
  loading?: boolean;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  /** Button type for forms */
  type?: 'button' | 'submit';
}

export interface ModalFooterProps {
  /** Primary action button props */
  primaryAction?: ModalFooterAction;
  /** Secondary/cancel action button props */
  secondaryAction?: ModalFooterAction;
  /** Custom actions (overrides primary/secondary) */
  actions?: ModalFooterAction[];
  /** Animation delay offset */
  animationDelay?: number;
  /** Custom className */
  className?: string;
  /** Children for custom footer content */
  children?: React.ReactNode;
}

const ActionButton: React.FC<{
  action: ModalFooterAction;
  isPrimary?: boolean;
}> = ({ action, isPrimary = false }) => {
  const getButtonClass = () => {
    if (!isPrimary) return 'modal-premium__btn-secondary';

    switch (action.variant) {
      case 'danger':
        return 'modal-premium__btn-primary modal-premium__btn-danger';
      case 'warning':
        return 'modal-premium__btn-primary modal-premium__btn-warning';
      case 'success':
        return 'modal-premium__btn-primary modal-premium__btn-success';
      default:
        return 'modal-premium__btn-primary';
    }
  };

  const isDisabled = action.disabled || action.loading;

  return (
    <motion.button
      type={action.type || 'button'}
      className={getButtonClass()}
      onClick={action.onClick}
      disabled={isDisabled}
      style={isDisabled ? { opacity: 0.5 } : undefined}
      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
    >
      {action.loading ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={16} />
        </motion.span>
      ) : (
        action.icon
      )}
      {action.label}
    </motion.button>
  );
};

export const ModalFooter: React.FC<ModalFooterProps> = ({
  primaryAction,
  secondaryAction,
  actions,
  animationDelay = 0.25,
  className = '',
  children
}) => {
  const { t } = useTranslation();

  // If children provided, render custom content
  if (children) {
    return (
      <motion.div
        className={`modal-premium__footer ${className}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: animationDelay }}
      >
        {children}
      </motion.div>
    );
  }

  // Build action list
  const actionList: { action: ModalFooterAction; isPrimary: boolean }[] = [];

  if (actions) {
    // Use custom actions
    actions.forEach((action, index) => {
      actionList.push({ action, isPrimary: index === actions.length - 1 });
    });
  } else {
    // Use primary/secondary pattern
    if (secondaryAction) {
      actionList.push({
        action: {
          ...secondaryAction,
          icon: secondaryAction.icon || <X size={16} />,
          label: secondaryAction.label || t('dialog.cancel', 'Cancel')
        },
        isPrimary: false
      });
    }
    if (primaryAction) {
      actionList.push({
        action: {
          ...primaryAction,
          icon: primaryAction.icon || <Check size={16} />,
          label: primaryAction.label || t('dialog.confirm', 'Confirm')
        },
        isPrimary: true
      });
    }
  }

  if (actionList.length === 0) return null;

  return (
    <motion.div
      className={`modal-premium__footer ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
    >
      {actionList.map(({ action, isPrimary }, index) => (
        <ActionButton
          key={index}
          action={action}
          isPrimary={isPrimary}
        />
      ))}
    </motion.div>
  );
};

export default ModalFooter;
