import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Zap, Pencil, X } from 'lucide-react';
import '../../styles/components/dialog-modals.css';

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
  onClose
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
    const iconSize = 24;
    switch (variant) {
      case 'danger':
        return <AlertTriangle size={iconSize} className="text-error" />;
      case 'warning':
        return <Zap size={iconSize} className="text-warning" />;
      case 'info':
      default:
        return <Pencil size={iconSize} className="text-primary" />;
    }
  };

  return (
    <div className="modal-overlay modal-overlay--dialog view-transition-modal-backdrop" onClick={handleOverlayClick}>
      <div className={`modal modal--dialog prompt-modal prompt-modal-${variant} view-transition-modal`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal__header">
          <span className="dialog-icon">{getIcon()}</span>
          <h2>{title || t('dialog.promptTitle', 'Input Required')}</h2>
          <button className="modal__close" onClick={handleCancel} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal__body">
          {message && <p className="dialog-message">{message}</p>}

          <div className="prompt-input-container">
            <textarea
              ref={textareaRef}
              className={`prompt-textarea ${error ? 'error' : ''}`}
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

            <div className="prompt-meta">
              <span className="char-count">
                {value.length}/{maxLength}
              </span>
              {minLength > 0 && (
                <span className="min-length-hint">
                  {t('dialog.minLengthHint', `Min: ${minLength} chars`, { minLength })}
                </span>
              )}
            </div>

            {error && (
              <div className="prompt-error" id="prompt-error" role="alert">
                {error}
              </div>
            )}
          </div>

          <div className="prompt-hint">
            {t('dialog.promptHint', 'Tip: Press Ctrl+Enter to submit')}
          </div>
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
            className={`btn-dialog btn-submit btn-submit-${variant}`}
            onClick={handleSubmit}
            disabled={required && value.trim().length === 0}
          >
            {submitText || t('dialog.submit', 'Submit')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptModal;
