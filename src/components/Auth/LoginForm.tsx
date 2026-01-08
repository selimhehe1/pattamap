import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, User, Lock, AlertTriangle, LogIn, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useFormValidation, ValidationRules } from '../../hooks/useFormValidation';
import FormField from '../Common/FormField';
import notification from '../../utils/notification';
import '../../styles/components/modals.css';

interface LoginFormProps {
  onClose: () => void;
  onSwitchToRegister: () => void;
  /** Optional callback for successful login. If provided, called instead of onClose after login success */
  onLoginSuccess?: () => void;
  /** Optional callback to switch to forgot password form */
  onSwitchToForgotPassword?: () => void;
  /** When true, renders without its own overlay (for use inside Modal component) */
  embedded?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ onClose, onSwitchToRegister, onLoginSuccess, onSwitchToForgotPassword, embedded = false }) => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { theme } = useTheme();
  // Check both context and DOM for theme - fallback to DOM check for HMR reliability
  const isLightMode = theme === 'light' || (typeof document !== 'undefined' && document.body.getAttribute('data-theme') === 'light');
  const [formData, setFormData] = useState({
    login: '', // Can be pseudonym or email
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
        notification.success(t('auth.usernameRestored'));
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
      notification.error(t('auth.fixFormErrors'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(formData.login, formData.password);
      clearDraft(); // Clear on successful login
      notification.success(t('auth.loginSuccess'));
      // Use onLoginSuccess if provided, otherwise fall back to onClose
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        onClose();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('auth.loginFailed');
      setError(errorMessage);
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Light mode inline styles to override CSS gradient text effect
  const lightModeStyles = {
    overlay: isLightMode ? {
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)'
    } : {},
    container: isLightMode ? {
      background: '#FFFFFF',
      borderColor: 'rgba(15, 23, 42, 0.15)',
      boxShadow: '0 25px 50px rgba(15, 23, 42, 0.15)'
    } : {},
    title: isLightMode ? {
      color: '#B45309',
      WebkitTextFillColor: '#B45309',
      background: 'none',
      backgroundImage: 'none',
      WebkitBackgroundClip: 'unset',
      backgroundClip: 'unset',
      textShadow: 'none'
    } : {},
    subtitle: isLightMode ? {
      color: '#64748B'
    } : {},
    closeButton: isLightMode ? {
      color: '#334155',
      background: 'rgba(15, 23, 42, 0.05)',
      borderColor: 'rgba(15, 23, 42, 0.1)'
    } : {},
    primaryButton: isLightMode ? {
      background: 'linear-gradient(135deg, #B45309, #92400E)',
      color: '#FFFFFF',
      borderColor: '#B45309'
    } : {},
    authSwitchLabel: isLightMode ? {
      color: '#64748B'
    } : {},
    authSwitchButton: isLightMode ? {
      color: '#B45309'
    } : {}
  };

  // Form content (shared between embedded and standalone modes)
  const formContent = (
    <div className={embedded ? "auth-form-login-content" : "modal-content-unified modal--medium"} style={embedded ? {} : lightModeStyles.container}>
      {/* Close button only shown in standalone mode (not embedded) */}
      {!embedded && (
        <button
          onClick={handleClose}
          className="modal-close-btn"
          aria-label={t('common.close')}
          data-testid="close-login-modal"
          style={lightModeStyles.closeButton}
        >
          ×
        </button>
      )}

        <div className="modal-header">
          <h2 className="header-title-nightlife" style={lightModeStyles.title}>
            {t('auth.welcomeBack')}
          </h2>
          <p className="modal-subtitle" style={lightModeStyles.subtitle}>
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
              <FileText size={20} />
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
                notification.success(t('auth.usernameCleared'));
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
            label={<><User size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{t('auth.pseudonymOrEmail')}</>}
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

          <div style={{ position: 'relative' }}>
            <FormField
              label={<><Lock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />{t('auth.passwordLabel')}</>}
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              error={errors.password}
              status={fieldStatus.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              onBlur={(e) => handleInputBlur('password', e.target.value)}
              placeholder={t('auth.enterPassword')}
              required
              minLength={8}
              autoComplete="current-password"
              testId="password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '38px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              data-testid="toggle-password-visibility"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* 🔧 FIX A4: Forgot Password link */}
          {onSwitchToForgotPassword && (
            <div style={{ textAlign: 'right', marginTop: '-8px' }}>
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
              <AlertTriangle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`btn btn--primary ${isLoading ? 'btn--loading' : ''}`}
            data-testid="login-button"
            style={lightModeStyles.primaryButton}
          >
            {isLoading ? (
              <span className="loading-flex">
                <span className="loading-spinner-small-nightlife"></span>
                {t('auth.signingIn')}
              </span>
            ) : (
              <><LogIn size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {t('auth.signIn')}</>
            )}
          </button>

          <div className="auth-switch-text">
            <span className="auth-switch-label" style={lightModeStyles.authSwitchLabel}>
              {t('auth.dontHaveAccount')}{' '}
            </span>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="auth-switch-button"
              data-testid="register-link"
              style={lightModeStyles.authSwitchButton}
            >
              {t('auth.registerHere')}
            </button>
          </div>
        </form>
      </div>
  );

  // If embedded (used inside Modal component), return just the form content
  if (embedded) {
    return formContent;
  }

  // Standalone mode: wrap in overlay
  return (
    <div
      className="modal-overlay-unified"
      role="dialog"
      aria-modal="true"
      data-testid="login-modal"
      style={lightModeStyles.overlay}
    >
      {formContent}
    </div>
  );
};

export default LoginForm;