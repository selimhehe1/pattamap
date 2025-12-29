import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Zap, Pencil, X, Send } from 'lucide-react';
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';
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
                className={`modal-premium__icon modal-premium__icon--${variant === 'info' ? 'info' : variant}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
              >
                {getIcon()}
              </motion.div>
              <motion.h2
                id="prompt-modal-title"
                className={`modal-premium__title modal-premium__title--${variant === 'info' ? 'info' : variant}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {title || t('dialog.promptTitle', 'Input Required')}
              </motion.h2>
              {message && (
                <motion.p
                  className="modal-premium__subtitle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {message}
                </motion.p>
              )}
            </div>

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
                className={`modal-premium__btn-primary ${variant === 'danger' ? 'modal-premium__btn-danger' : variant === 'warning' ? 'modal-premium__btn-warning' : ''}`}
                onClick={handleSubmit}
                disabled={required && value.trim().length === 0}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Send size={16} />
                {submitText || t('dialog.submit', 'Submit')}
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

export default PromptModal;
