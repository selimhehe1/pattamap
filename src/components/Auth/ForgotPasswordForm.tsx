/**
 * 🔧 FIX A4: Forgot Password Form Component
 *
 * Allows users to request a password reset link
 * Currently logs token for manual intervention until email service is configured
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { useCSRF } from '../../contexts/CSRFContext';
import notification from '../../utils/notification';
import '../../styles/components/modals.css';

interface ForgotPasswordFormProps {
  onClose: () => void;
  onSwitchToLogin: () => void;
  /** When true, renders without its own overlay (for use inside page layouts) */
  embedded?: boolean;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onClose,
  onSwitchToLogin,
  embedded = false
}) => {
  const { t } = useTranslation();
  const { csrfToken } = useCSRF();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError(t('auth.emailRequired'));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('auth.invalidEmail'));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/forgot-password`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('auth.resetRequestFailed'));
      }

      // Success - show confirmation (same message regardless of email existence for security)
      setIsSubmitted(true);
      notification.success(t('auth.resetEmailSent'));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.resetRequestFailed');
      setError(errorMessage);
      notification.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state content
  const successContent = (
    <div className={embedded ? "auth-form-login-content" : "modal-content-unified modal--medium"}>
      {!embedded && (
        <button
          onClick={onClose}
          className="modal-close-btn"
          aria-label={t('common.close')}
        >
          ×
        </button>
      )}

      <div className="modal-header">
        <div style={{ marginBottom: '16px' }}><Mail size={48} /></div>
        <h2 className="header-title-nightlife">
          {t('auth.checkYourEmail')}
        </h2>
        <p className="modal-subtitle" style={{ marginTop: '12px' }}>
          {t('auth.resetInstructions')}
        </p>
      </div>

      <div style={{
        background: 'rgba(0, 229, 255, 0.1)',
        border: '1px solid rgba(0, 229, 255, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginTop: '24px'
      }}>
        <p style={{ color: '#cccccc', fontSize: '14px', lineHeight: '1.6' }}>
          {t('auth.resetNote')}
        </p>
      </div>

      <button
        onClick={onSwitchToLogin}
        className="btn btn--secondary"
        style={{ marginTop: '24px', width: '100%' }}
      >
        {t('auth.backToLogin')}
      </button>
    </div>
  );

  // Form content
  const formContent = (
    <div className={embedded ? "auth-form-login-content" : "modal-content-unified modal--medium"}>
      {!embedded && (
        <button
          onClick={onClose}
          className="modal-close-btn"
          aria-label={t('common.close')}
        >
          ×
        </button>
      )}

      <div className="modal-header">
        <h2 className="header-title-nightlife">
          {t('auth.forgotPassword')}
        </h2>
        <p className="modal-subtitle">
          {t('auth.forgotPasswordSubtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="form-layout" noValidate>
        <div className="form-group-nightlife">
          <label className="form-label-nightlife">
            <Mail size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('auth.email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder={t('auth.enterEmail')}
            className="input-nightlife"
            disabled={isLoading}
            autoComplete="email"
            autoFocus
          />
        </div>

        {error && (
          <div className="error-message-nightlife error-shake">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`btn btn--primary ${isLoading ? 'btn--loading' : ''}`}
        >
          {isLoading ? (
            <span className="loading-flex">
              <span className="loading-spinner-small-nightlife"></span>
              {t('common.sending')}
            </span>
          ) : (
            <><Mail size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />{t('auth.sendResetLink')}</>
          )}
        </button>

        <div className="auth-switch-text">
          <span className="auth-switch-label">
            {t('auth.rememberPassword')}{' '}
          </span>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="auth-switch-button"
          >
            {t('auth.backToLogin')}
          </button>
        </div>
      </form>
    </div>
  );

  const content = isSubmitted ? successContent : formContent;

  // If embedded, return just the content
  if (embedded) {
    return content;
  }

  // Standalone mode: wrap in overlay
  return (
    <div className="modal-overlay-unified" role="dialog" aria-modal="true" data-testid="forgot-password-modal">
      {content}
    </div>
  );
};

export default ForgotPasswordForm;
