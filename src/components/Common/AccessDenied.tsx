import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './AccessDenied.css';

/**
 * ============================================
 * ACCESS DENIED COMPONENT
 * ============================================
 *
 * Professional access denied component to replace basic red text.
 * Provides clear messaging and CTAs for unauthorized access attempts.
 *
 * Audit Fix: A003 - Score 14.5 (Sévérité: 5, Impact: 5, Effort: 2)
 *
 * @see AUDIT_CSS_MASTER_REPORT.md
 */

export interface AccessDeniedProps {
  /** Required user role for accessing this resource */
  requiredRole?: 'employee' | 'owner' | 'admin' | 'moderator';

  /** Custom error message (optional) */
  message?: string;

  /** Custom title (optional) */
  title?: string;

  /** Show login CTA button (default: true) */
  showLoginButton?: boolean;

  /** Show back button (default: true) */
  showBackButton?: boolean;

  /** Custom className for styling */
  className?: string;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({
  requiredRole,
  message,
  title,
  showLoginButton = true,
  showBackButton = true,
  className = '',
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Default messages based on required role
  const getDefaultMessage = () => {
    if (message) return message;

    if (requiredRole === 'employee') {
      return t('accessDenied.employee', 'This page is only accessible to employee accounts. Please create an employee profile or login with an employee account.');
    } else if (requiredRole === 'owner') {
      return t('accessDenied.owner', 'This page is only accessible to establishment owners. Please request ownership or login with an owner account.');
    } else if (requiredRole === 'admin') {
      return t('accessDenied.admin', 'This page is only accessible to administrators. Please contact support if you believe this is an error.');
    } else if (requiredRole === 'moderator') {
      return t('accessDenied.moderator', 'This page is only accessible to moderators and administrators.');
    }

    return t('accessDenied.default', 'You do not have permission to access this page.');
  };

  return (
    <div className={`access-denied-container ${className}`}>
      <div className="access-denied-content">
        {/* Icon */}
        <div className="access-denied-icon" role="img" aria-label="Access Denied">
          🔒
        </div>

        {/* Title */}
        <h1 className="access-denied-title">
          {title || t('accessDenied.title', 'Access Denied')}
        </h1>

        {/* Message */}
        <p className="access-denied-message">
          {getDefaultMessage()}
        </p>

        {/* Actions */}
        <div className="access-denied-actions">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="btn-nightlife-base btn-secondary-nightlife access-denied-btn-back"
              aria-label="Go back to previous page"
            >
              ← {t('accessDenied.goBack', 'Go Back')}
            </button>
          )}

          {showLoginButton && (
            <button
              onClick={() => navigate('/login')}
              className="btn-nightlife-base btn-primary-nightlife access-denied-btn-login"
              aria-label={`Login as ${requiredRole || 'user'}`}
            >
              🔑 {t('accessDenied.login', 'Login')}
              {requiredRole && ` (${requiredRole})`}
            </button>
          )}
        </div>

        {/* Help Text */}
        {requiredRole && (
          <p className="access-denied-help">
            {t('accessDenied.help', 'Need help? Contact support at')}{' '}
            <a href="mailto:support@pattaya.guide" className="access-denied-link">
              support@pattaya.guide
            </a>
          </p>
        )}
      </div>
    </div>
  );
};

export default AccessDenied;
