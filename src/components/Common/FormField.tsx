import React from 'react';
import { Loader2, Check, X, AlertTriangle } from 'lucide-react';

/**
 * FormField - Enhanced form input with real-time validation feedback
 *
 * Features:
 * - Visual indicators (check valid, X invalid, spinner validating)
 * - Contextual error messages
 * - Character counter
 * - WCAG AA compliant (min-height 44px on mobile)
 *
 * @example
 * <FormField
 *   label="Employee Name"
 *   name="name"
 *   value={formData.name}
 *   error={errors.name}
 *   status={fieldStatus.name}
 *   onChange={(e) => handleChange('name', e.target.value)}
 *   onBlur={() => handleBlur('name', formData.name)}
 *   required
 *   maxLength={100}
 * />
 */

type FieldStatus = 'valid' | 'invalid' | 'validating' | 'untouched';

interface FormFieldProps {
  /** Field label */
  label: React.ReactNode;
  /** Field name */
  name: string;
  /** Field type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select';
  /** Current value */
  value: string | number;
  /** Validation error message */
  error?: string;
  /** Validation status */
  status?: FieldStatus;
  /** Change handler */
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  /** Blur handler */
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Is field required */
  required?: boolean;
  /** Is field disabled */
  disabled?: boolean;
  /** Minimum length (for character counter) */
  minLength?: number;
  /** Maximum length (for character counter) */
  maxLength?: number;
  /** Show character counter */
  showCounter?: boolean;
  /** Select options (if type="select") */
  options?: Array<{ value: string | number; label: string }>;
  /** Custom CSS class */
  className?: string;
  /** Help text below field */
  helpText?: string;
  /** Autocomplete attribute for browser */
  autoComplete?: string;
  /** Test ID for E2E testing */
  testId?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  error,
  status = 'untouched',
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  minLength,
  maxLength,
  showCounter = false,
  options = [],
  className = '',
  helpText,
  autoComplete,
  testId
}) => {
  const hasError = !!error;
  const isValid = status === 'valid' && !hasError;
  const isValidating = status === 'validating';
  const isTouched = status !== 'untouched';

  const currentLength = String(value).length;
  const showCharCounter = showCounter && maxLength;

  const getStatusIcon = () => {
    if (isValidating) return <span className="field-icon-validating"><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /></span>;
    if (isValid) return <span className="field-icon-valid"><Check size={18} /></span>;
    if (hasError && isTouched) return <span className="field-icon-invalid"><X size={18} /></span>;
    return null;
  };

  const renderInput = () => {
    const commonProps = {
      id: name,
      name,
      value,
      onChange,
      onBlur,
      placeholder,
      required,
      disabled,
      maxLength,
      autoComplete,
      className: `input-nightlife ${hasError ? 'input-error' : ''} ${isValid ? 'input-valid' : ''}`,
      'aria-invalid': hasError,
      'aria-describedby': hasError ? `${name}-error` : helpText ? `${name}-help` : undefined,
      'aria-required': required,
      'data-testid': testId
    };

    if (type === 'textarea') {
      return (
        <textarea
          {...commonProps}
          rows={4}
        />
      );
    }

    if (type === 'select') {
      return (
        <select {...commonProps} className="select-nightlife">
          <option value="">Select...</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        {...commonProps}
        type={type}
        min={minLength}
      />
    );
  };

  return (
    <div className={`form-field-container ${className}`}>
      <div className="form-field-label-row">
        <label htmlFor={name} className="form-field-label">
          {label}
          {required && <span className="field-required" aria-label="required">*</span>}
        </label>

        {showCharCounter && (
          <span
            className={`form-field-counter ${currentLength > maxLength ? 'counter-exceeded' : ''}`}
            aria-live="polite"
          >
            {currentLength}/{maxLength}
          </span>
        )}
      </div>

      <div className="form-field-input-wrapper">
        {renderInput()}
        <div className="form-field-status-icon">
          {getStatusIcon()}
        </div>
      </div>

      {helpText && !error && (
        <p id={`${name}-help`} className="form-field-help">
          {helpText}
        </p>
      )}

      {error && isTouched && (
        <p
          id={`${name}-error`}
          className="form-field-error"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          {error}
        </p>
      )}

      <style>{`
        /* FormField Container */
        .form-field-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }

        /* Label Row */
        .form-field-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .form-field-label {
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .field-required {
          color: #C19A6B;
          font-size: 16px;
        }

        /* Character Counter */
        .form-field-counter {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          font-family: monospace;
        }

        .counter-exceeded {
          color: #FF4444;
          font-weight: bold;
        }

        /* Input Wrapper (for status icon positioning) */
        .form-field-input-wrapper {
          position: relative;
        }

        /* Status Icons */
        .form-field-status-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          font-size: 18px;
          line-height: 1;
        }

        .field-icon-valid {
          color: #06FFA5;
          animation: fadeIn 0.3s ease-in;
        }

        .field-icon-invalid {
          color: #FF4444;
          animation: shake 0.4s ease-in-out;
        }

        .field-icon-validating {
          color: #FFD700;
          animation: spin 1s linear infinite;
        }

        /* Input States */
        .input-error,
        .select-nightlife.input-error {
          border-color: #FF4444 !important;
          background: rgba(255, 68, 68, 0.1) !important;
        }

        .input-error:focus {
          box-shadow: 0 0 0 3px rgba(255, 68, 68, 0.3) !important;
        }

        .input-valid,
        .select-nightlife.input-valid {
          border-color: #06FFA5 !important;
          background: rgba(6, 255, 165, 0.05) !important;
        }

        .input-valid:focus {
          box-shadow: 0 0 0 3px rgba(6, 255, 165, 0.2) !important;
        }

        /* Help Text */
        .form-field-help {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
          line-height: 1.4;
        }

        /* Error Message */
        .form-field-error {
          font-size: 13px;
          color: #FF4444;
          margin: 0;
          line-height: 1.4;
          display: flex;
          align-items: flex-start;
          gap: 6px;
          animation: slideDown 0.3s ease-out;
        }

        /* Icon now rendered via JSX AlertTriangle component */

        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Mobile Responsive */
        @media (max-width: 640px) {
          .form-field-label {
            font-size: 13px;
          }

          .form-field-counter {
            font-size: 11px;
          }

          .form-field-error,
          .form-field-help {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default FormField;
