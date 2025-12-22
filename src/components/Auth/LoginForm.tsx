import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useFormValidation, ValidationRules } from '../../hooks/useFormValidation';
import FormField from '../Common/FormField';
import toast from '../../utils/toast';
import '../../styles/components/modal-forms.css';

interface LoginFormProps {
  onClose: () => void;
  onSwitchToRegister: () => void;
  /** Optional callback for successful login. If provided, called instead of onClose after login success */
  onLoginSuccess?: () => void;
  /** Optional callback to switch to forgot password form */
  onSwitchToForgotPassword?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onClose, onSwitchToRegister, onLoginSuccess, onSwitchToForgotPassword }) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    login: '', // Can be pseudonym or email
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Validation rules
  const validationRules: ValidationRules<typeof formData> = {
    login: {
      required: true,
      message: t('auth.pseudonymRequired')
    },
    password: {
      required: true,
      minLength: 8, // 🔧 FIX P1: Changed from 12 to 8 (user request)
      message: (field, rule) => {
        if (rule === 'required') return t('auth.passwordRequired');
        if (rule === 'minLength') return t('auth.passwordMinLength', { min: 8 });
        return t('auth.invalidPassword');
      }
    }
  };

  const {
    errors,
    fieldStatus,
    handleFieldChange,
    handleFieldBlur,
    validateForm
  } = useFormValidation(formData, validationRules, {
    validateOnChange: true,
    validateOnBlur: true,
    debounceDelay: 500
  });

  // Auto-save only login field (not password for security)
  const { isDraft, clearDraft, restoreDraft, lastSaved } = useAutoSave({
    key: 'login-form-draft',
    data: { login: formData.login }, // Only save username
    debounceMs: 2000,
    enabled: true
  });

  // Restore draft on mount
  useEffect(() => {
    if (isDraft) {
      const draft = restoreDraft();
      if (draft && draft.login) {
        setFormData(prev => ({ ...prev, login: draft.login }));
        setShowDraftBanner(true);
        toast.success(t('auth.usernameRestored'));
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    handleFieldChange(fieldName as keyof typeof formData, value);
    setError('');
  };

  const handleInputBlur = (fieldName: string, value: string) => {
    handleFieldBlur(fieldName as keyof typeof formData, value);
  };

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(t('auth.fixFormErrors'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(formData.login, formData.password);
      clearDraft(); // Clear on successful login
      toast.success(t('auth.loginSuccess'));
      // Use onLoginSuccess if provided, otherwise fall back to onClose
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        onClose();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('auth.loginFailed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay-nightlife" data-testid="login-modal">
      <div className="modal-form-container">
        <button
          onClick={handleClose}
          className="modal-close-button"
          aria-label={t('common.close')}
          data-testid="close-login-modal"
        >
          ×
        </button>

        <div className="modal-header">
          <h2 className="header-title-nightlife">
            {t('auth.welcomeBack')}
          </h2>
          <p className="modal-subtitle">
            {t('auth.signInSubtitle')}
          </p>
        </div>

        {/* Draft restoration banner */}
        {showDraftBanner && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,229,255,0.1), rgba(0,229,255,0.2))',
            border: '2px solid #00E5FF',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>📝</span>
              <div>
                <div style={{ color: '#00E5FF', fontSize: '14px', fontWeight: 'bold' }}>
                  {t('auth.usernameRestored')}
                </div>
                <div style={{ color: '#cccccc', fontSize: '12px' }}>
                  {lastSaved && t('auth.savedAt', { time: new Date(lastSaved).toLocaleTimeString() })}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                clearDraft();
                setFormData({ login: '', password: '' });
                setShowDraftBanner(false);
                toast.success(t('auth.usernameCleared'));
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#C19A6B';
                e.currentTarget.style.color = '#C19A6B';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.color = '#ffffff';
              }}
            >
              {t('auth.clear')}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-layout" noValidate data-testid="login-form">
          <FormField
            label={`👤 ${t('auth.pseudonymOrEmail')}`}
            name="login"
            type="text"
            value={formData.login}
            error={errors.login}
            status={fieldStatus.login}
            onChange={(e) => handleInputChange('login', e.target.value)}
            onBlur={(e) => handleInputBlur('login', e.target.value)}
            placeholder={t('auth.enterPseudonymOrEmail')}
            required
            autoComplete="username"
            testId="login-input"
          />

          <FormField
            label={`🔒 ${t('auth.passwordLabel')}`}
            name="password"
            type="password"
            value={formData.password}
            error={errors.password}
            status={fieldStatus.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            onBlur={(e) => handleInputBlur('password', e.target.value)}
            placeholder={t('auth.enterPassword')}
            required
            minLength={12}
            autoComplete="current-password"
            testId="password-input"
          />

          {/* 🔧 FIX A4: Forgot Password link */}
          {onSwitchToForgotPassword && (
            <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="auth-switch-button"
                style={{ fontSize: '0.875rem' }}
                data-testid="forgot-password-link"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>
          )}

          {error && (
            <div className="error-message-nightlife error-shake" data-testid="login-error">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`btn-nightlife-base btn-primary-nightlife ${isLoading ? 'btn-loading' : ''}`}
            data-testid="login-button"
          >
            {isLoading ? (
              <span className="loading-flex">
                <span className="loading-spinner-small-nightlife"></span>
                {t('auth.signingIn')}
              </span>
            ) : (
              `🚀 ${t('auth.signIn')}`
            )}
          </button>

          <div className="auth-switch-text">
            <span className="auth-switch-label">
              {t('auth.dontHaveAccount')}{' '}
            </span>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="auth-switch-button"
              data-testid="register-link"
            >
              {t('auth.registerHere')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;