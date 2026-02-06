import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, User, Lock, AlertTriangle, LogIn, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabaseAuth } from '../../contexts/auth/SupabaseAuthContext';
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
  const { signInWithGoogle, signInWithFacebook } = useSupabaseAuth();
  const { theme } = useTheme();
  // Check both context and DOM for theme - fallback to DOM check for HMR reliability
  const isLightMode = theme === 'light' || (typeof document !== 'undefined' && document.body.getAttribute('data-theme') === 'light');
  const [formData, setFormData] = useState({
    login: '', // Can be pseudonym or email
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError('');

    try {
      // Store redirect path for after OAuth callback
      // Don't store /login itself as redirect target - it would cause a loop
      const from = sessionStorage.getItem('auth_redirect');
      if (!from && window.location.pathname !== '/login') {
        sessionStorage.setItem('auth_redirect', window.location.pathname);
      }

      await signInWithGoogle();
      // User will be redirected to Google, then back to /auth/callback
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('auth.googleSignInFailed');
      setError(errorMessage);
      notification.error(errorMessage);
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setIsFacebookLoading(true);
    setError('');

    try {
      const from = sessionStorage.getItem('auth_redirect');
      if (!from && window.location.pathname !== '/login') {
        sessionStorage.setItem('auth_redirect', window.location.pathname);
      }

      await signInWithFacebook();
      // User will be redirected to Facebook, then back to /auth/callback
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('auth.facebookSignInFailed');
      setError(errorMessage);
      notification.error(errorMessage);
      setIsFacebookLoading(false);
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

          {error && (
            <div className="error-message-nightlife error-shake" data-testid="login-error">
              <AlertTriangle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> {error}
            </div>
          )}

          {/* Sign In button + Forgot Password on same line */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <button
              type="submit"
              disabled={isLoading}
              className={`btn btn--primary ${isLoading ? 'btn--loading' : ''}`}
              data-testid="login-button"
              style={{ ...lightModeStyles.primaryButton, flex: 'none' }}
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

            {onSwitchToForgotPassword && (
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="auth-switch-button"
                style={{ fontSize: '0.875rem' }}
                data-testid="forgot-password-link"
              >
                {t('auth.forgotPassword')}
              </button>
            )}
          </div>

          {/* OAuth Divider */}
          <div className="auth-divider">
            <span className="auth-divider__line"></span>
            <span className="auth-divider__text">{t('auth.or', 'ou')}</span>
            <span className="auth-divider__line"></span>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isFacebookLoading || isLoading}
            className={`btn btn--google ${isGoogleLoading ? 'btn--loading' : ''}`}
            data-testid="google-signin-button"
          >
            {isGoogleLoading ? (
              <span className="loading-flex">
                <span className="loading-spinner-small-nightlife"></span>
                {t('auth.signingIn')}
              </span>
            ) : (
              <>
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('auth.continueWithGoogle', 'Continuer avec Google')}
              </>
            )}
          </button>

          {/* Facebook Sign In Button */}
          <button
            type="button"
            onClick={handleFacebookSignIn}
            disabled={isFacebookLoading || isGoogleLoading || isLoading}
            className={`btn btn--facebook ${isFacebookLoading ? 'btn--loading' : ''}`}
            data-testid="facebook-signin-button"
          >
            {isFacebookLoading ? (
              <span className="loading-flex">
                <span className="loading-spinner-small-nightlife"></span>
                {t('auth.signingIn')}
              </span>
            ) : (
              <>
                <svg className="facebook-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                {t('auth.continueWithFacebook', 'Continuer avec Facebook')}
              </>
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