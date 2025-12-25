import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Zap, Check, Info, X } from 'lucide-react';
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
  const getIcon = (): React.ReactNode => {
    const iconSize = 24;
    switch (variant) {
      case 'danger':
        return <AlertTriangle size={iconSize} className="text-error" />;
      case 'warning':
        return <Zap size={iconSize} className="text-warning" />;
      case 'success':
        return <Check size={iconSize} className="text-success" />;
      case 'info':
      default:
        return <Info size={iconSize} className="text-info" />;
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
    <div className="modal-overlay modal-overlay--dialog view-transition-modal-backdrop" onClick={handleOverlayClick}>
      <div className={`modal modal--dialog confirm-modal confirm-modal-${variant} view-transition-modal`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal__header">
          <span className="dialog-icon">{getIcon()}</span>
          <h2>{title || getDefaultTitle()}</h2>
          <button className="modal__close" onClick={handleCancel} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal__body">
          <p className="dialog-message">{message}</p>
        </div>

        {/* Footer */}
        <div className="modal__footer">
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
