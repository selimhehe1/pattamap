import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap, Check, Info, X } from 'lucide-react';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
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
            <motion.button
              className="modal-premium__close"
              onClick={handleCancel}
              aria-label={t('common.close', 'Close')}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={18} />
            </motion.button>

            {/* Header with icon */}
            <div className="modal-premium__header modal-premium__header--with-icon">
              <motion.div
                className={`modal-premium__icon modal-premium__icon--${variant}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              >
                {getIcon()}
              </motion.div>
              <motion.h2
                id="confirm-modal-title"
                className={`modal-premium__title modal-premium__title--${variant}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {title || getDefaultTitle()}
              </motion.h2>
            </div>

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
            <motion.div
              className="modal-premium__footer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <motion.button
                className="modal-premium__btn-secondary"
                onClick={handleCancel}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <X size={16} />
                {cancelText || t('dialog.cancel', 'Cancel')}
              </motion.button>
              <motion.button
                className={`modal-premium__btn-primary modal-premium__btn-${variant}`}
                onClick={handleConfirm}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Check size={16} />
                {confirmText || t('dialog.confirm', 'Confirm')}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use portal to render at body level
  return createPortal(modalContent, document.body);
};

export default ConfirmModal;
