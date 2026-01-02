import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, User, Mail, Lock, KeyRound } from 'lucide-react';
import FormField from '../../Common/FormField';
import type { CredentialsData, CredentialsErrors, CredentialsFieldStatus } from './types';

// Re-export types for consumers
export type { CredentialsData, CredentialsErrors, CredentialsFieldStatus };

interface CredentialsStepProps {
  credentials: CredentialsData;
  errors: CredentialsErrors;
  fieldStatus: CredentialsFieldStatus;
  onFieldChange: (fieldName: keyof CredentialsData, value: string) => void;
  onFieldBlur: (fieldName: keyof CredentialsData, value: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  /** Whether this is the final step (shows Submit instead of Next) */
  isFinalStep?: boolean;
  /** Whether form is currently submitting */
  isLoading?: boolean;
  /** Custom button labels */
  nextLabel?: React.ReactNode;
  submitLabel?: React.ReactNode;
}

/**
 * CredentialsStep Component
 *
 * Reusable step for collecting user credentials:
 * - Pseudonym (username)
 * - Email
 * - Password with show/hide toggle
 * - Confirm Password with show/hide toggle
 *
 * Used in:
 * - Owner registration flow (Step 2)
 * - Employee registration flow (Step 3)
 * - Regular user registration flow (Step 2/3)
 */
const CredentialsStep: React.FC<CredentialsStepProps> = ({
  credentials,
  errors,
  fieldStatus,
  onFieldChange,
  onFieldBlur,
  onPrevious,
  onNext,
  isFinalStep = false,
  isLoading = false,
  nextLabel,
  submitLabel
}) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isFormValid = credentials.pseudonym.trim() &&
    credentials.email.trim() &&
    credentials.password &&
    credentials.confirmPassword;

  return (
    <>
      <FormField
        label={<><User size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.pseudonymLabel')}</>}
        name="pseudonym"
        value={credentials.pseudonym}
        error={errors.pseudonym}
        status={fieldStatus.pseudonym}
        onChange={(e) => onFieldChange('pseudonym', e.target.value)}
        onBlur={(e) => onFieldBlur('pseudonym', e.target.value)}
        placeholder={t('register.pseudonymPlaceholder')}
        required
        maxLength={50}
        showCounter
      />

      <FormField
        label={<><Mail size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.emailLabel')}</>}
        name="email"
        type="email"
        value={credentials.email}
        error={errors.email}
        status={fieldStatus.email}
        onChange={(e) => onFieldChange('email', e.target.value)}
        onBlur={(e) => onFieldBlur('email', e.target.value)}
        placeholder={t('register.emailPlaceholder')}
        required
      />

      <FormField
        label={<><Lock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.passwordLabel')}</>}
        name="password"
        type={showPassword ? 'text' : 'password'}
        value={credentials.password}
        error={errors.password}
        status={fieldStatus.password}
        onChange={(e) => onFieldChange('password', e.target.value)}
        onBlur={(e) => onFieldBlur('password', e.target.value)}
        placeholder={t('register.passwordPlaceholder')}
        required
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{ background: 'transparent', border: 'none', color: '#C19A6B', cursor: 'pointer' }}
            aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />

      <FormField
        label={<><KeyRound size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('register.confirmPasswordLabel')}</>}
        name="confirmPassword"
        type={showConfirmPassword ? 'text' : 'password'}
        value={credentials.confirmPassword}
        error={errors.confirmPassword}
        status={fieldStatus.confirmPassword}
        onChange={(e) => onFieldChange('confirmPassword', e.target.value)}
        onBlur={(e) => onFieldBlur('confirmPassword', e.target.value)}
        placeholder={t('register.confirmPasswordPlaceholder')}
        required
        rightIcon={
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            style={{ background: 'transparent', border: 'none', color: '#C19A6B', cursor: 'pointer' }}
            aria-label={showConfirmPassword ? t('register.hidePassword') : t('register.showPassword')}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
        <button
          type="button"
          onClick={onPrevious}
          className="btn btn--secondary"
          style={{ flex: 1 }}
        >
          {t('register.previousButton')}
        </button>

        {isFinalStep ? (
          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className="btn btn--success"
            style={{ flex: 2 }}
          >
            {submitLabel || t('register.registerButton')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!isFormValid}
            className="btn btn--success"
            style={{ flex: 2 }}
          >
            {nextLabel || <>{t('register.nextButton')} →</>}
          </button>
        )}
      </div>
    </>
  );
};

export default CredentialsStep;
