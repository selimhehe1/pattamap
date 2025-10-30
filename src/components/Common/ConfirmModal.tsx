import React from 'react';
import { useTranslation } from 'react-i18next';
import '../../styles/components/dialog-modals.css';

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
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  variant = 'info',
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  onClose
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
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return '⚠️';
      case 'warning':
        return '⚡';
      case 'success':
        return '✅';
      case 'info':
      default:
        return 'ℹ️';
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

  return (
    <div className="dialog-modal-overlay" onClick={handleOverlayClick}>
      <div className={`dialog-modal confirm-modal confirm-modal-${variant}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-modal-header">
          <span className="dialog-icon">{getIcon()}</span>
          <h2>{title || getDefaultTitle()}</h2>
          <button className="close-button" onClick={handleCancel} aria-label="Close">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="dialog-modal-body">
          <p className="dialog-message">{message}</p>
        </div>

        {/* Footer */}
        <div className="dialog-modal-footer">
          <button
            className="btn-dialog btn-cancel"
            onClick={handleCancel}
          >
            {cancelText || t('dialog.cancel', 'Cancel')}
          </button>
          <button
            className={`btn-dialog btn-confirm btn-confirm-${variant}`}
            onClick={handleConfirm}
          >
            {confirmText || t('dialog.confirm', 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
