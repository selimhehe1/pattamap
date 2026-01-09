import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap, Pencil, X, Send } from 'lucide-react';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
import { ModalCloseButton, ModalHeader, ModalFooter } from './Modal/index';
import '../../styles/components/modal-premium-base.css';

export interface PromptModalProps {
  title?: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  variant?: 'info' | 'warning' | 'danger';
  submitText?: string;
  cancelText?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  onClose?: () => void;
  isOpen?: boolean;
}

const PromptModal: React.FC<PromptModalProps> = ({
  title,
  message,
  placeholder,
  defaultValue = '',
  minLength = 0,
  maxLength = 500,
  required = true,
  variant = 'info',
  submitText,
  cancelText,
  onSubmit,
  onCancel,
  onClose,
  isOpen = true
}) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount and position cursor at end
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, []);

  const validate = (val: string): boolean => {
    // Required validation
    if (required && val.trim().length === 0) {
      setError(t('dialog.errorRequired', 'This field is required'));
      return false;
    }

    // Min length validation
    if (minLength > 0 && val.trim().length < minLength) {
      setError(t('dialog.errorMinLength', `Minimum ${minLength} characters required`, { minLength }));
      return false;
    }

    // Max length validation
    if (maxLength > 0 && val.trim().length > maxLength) {
      setError(t('dialog.errorMaxLength', `Maximum ${maxLength} characters allowed`, { maxLength }));
      return false;
    }

    setError(null);
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    // Clear error when user types
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = () => {
    if (validate(value)) {
      onSubmit(value.trim());
      onClose?.();
    }
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
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
      case 'info':
      default:
        return <Pencil size={iconSize} />;
    }
  };

  // Get character counter class
  const getCharCounterClass = () => {
    const ratio = value.length / maxLength;
    if (ratio >= 1) return 'modal-premium__char-counter--error';
    if (ratio >= 0.9) return 'modal-premium__char-counter--warning';
    return '';
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
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-modal-title"
          >
            {/* Close button */}
            <ModalCloseButton onClick={handleCancel} />

            {/* Header with icon */}
            <ModalHeader
              title={title || t('dialog.promptTitle', 'Input Required')}
              titleId="prompt-modal-title"
              subtitle={message}
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
              <div className="modal-premium__field">
                <textarea
                  ref={textareaRef}
                  className={`modal-premium__textarea ${error ? 'modal-premium__textarea--error' : ''}`}
                  value={value}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder || t('dialog.promptPlaceholder', 'Enter your text here...')}
                  rows={4}
                  maxLength={maxLength}
                  aria-label={title || t('dialog.promptTitle', 'Input Required')}
                  aria-invalid={!!error}
                  aria-describedby={error ? 'prompt-error' : undefined}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span className={`modal-premium__char-counter ${getCharCounterClass()}`}>
                    {value.length}/{maxLength}
                  </span>
                  {minLength > 0 && (
                    <span className="modal-premium__char-counter">
                      {t('dialog.minLengthHint', `Min: ${minLength}`, { minLength })}
                    </span>
                  )}
                </div>

                {error && (
                  <motion.div
                    className="modal-premium__error-text"
                    id="prompt-error"
                    role="alert"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <AlertTriangle size={14} />
                    {error}
                  </motion.div>
                )}
              </div>

              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '12px' }}>
                {t('dialog.promptHint', 'Tip: Press Ctrl+Enter to submit')}
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
                label: submitText || t('dialog.submit', 'Submit'),
                onClick: handleSubmit,
                icon: <Send size={16} />,
                disabled: required && value.trim().length === 0,
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

export default PromptModal;
