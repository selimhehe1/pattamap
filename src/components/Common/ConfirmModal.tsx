import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap, Check, Info, X } from 'lucide-react';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
import { ModalCloseButton, ModalHeader, ModalFooter } from './Modal/index';
import '../../styles/components/modal-premium-base.css';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmModalProps {
  title?: string;
  message: string;
  variant?: ConfirmVariant;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  onClose?: () => void;
  isOpen?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  variant = 'info',
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  onClose,
  isOpen = true
}) => {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    onClose?.();
  };

  const handleCancel = () => {
    onCancel();
    onClose?.();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  // Icon based on variant
  const getIcon = (): React.ReactNode => {
    const iconSize = 32;
    switch (variant) {
      case 'danger':
        return <AlertTriangle size={iconSize} />;
      case 'warning':
        return <Zap size={iconSize} />;
      case 'success':
        return <Check size={iconSize} />;
      case 'info':
      default:
        return <Info size={iconSize} />;
    }
  };

  // Default title based on variant
  const getDefaultTitle = () => {
    switch (variant) {
      case 'danger':
        return t('dialog.confirmDanger', 'Confirm Deletion');
      case 'warning':
        return t('dialog.confirmWarning', 'Confirm Action');
      case 'success':
        return t('dialog.confirmSuccess', 'Confirm');
      case 'info':
      default:
        return t('dialog.confirmTitle', 'Confirmation');
    }
  };

  const modalContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="modal-premium-overlay"
          variants={premiumBackdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={handleOverlayClick}
        >
          <motion.div
            className={`modal-premium modal-premium--small modal-premium--${variant}`}
            variants={premiumModalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-message"
          >
            {/* Close button */}
            <ModalCloseButton onClick={handleCancel} />

            {/* Header with icon */}
            <ModalHeader
              title={title || getDefaultTitle()}
              titleId="confirm-modal-title"
              icon={getIcon()}
              variant={variant}
            />

            {/* Content */}
            <motion.div
              className="modal-premium__content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p id="confirm-modal-message" className="modal-premium__message">
                {message}
              </p>
            </motion.div>

            {/* Footer */}
            <ModalFooter
              secondaryAction={{
                label: cancelText || t('dialog.cancel', 'Cancel'),
                onClick: handleCancel,
                icon: <X size={16} />
              }}
              primaryAction={{
                label: confirmText || t('dialog.confirm', 'Confirm'),
                onClick: handleConfirm,
                icon: <Check size={16} />,
                variant: variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary'
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use portal to render at body level
  return createPortal(modalContent, document.body);
};

export default ConfirmModal;
