import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import notification from '../utils/notification';
import FormField from '../components/Common/FormField';
import AuthHero from '../components/Auth/AuthHero';
import LanguageSelector from '../components/Common/LanguageSelector';
import '../styles/pages/auth-pages.css';

/**
 * ResetPasswordPage Component
 *
 * Allows users to set a new password after clicking the reset link in their email.
 * The page receives the reset token via URL hash from Supabase.
 *
 * Flow:
 * 1. User clicks reset link in email
 * 2. Supabase redirects here with token in URL
 * 3. User enters new password
 * 4. Password is updated via Supabase API
 * 5. User is redirected to login
 */

type ResetStatus = 'ready' | 'submitting' | 'success' | 'error';

const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<ResetStatus>('ready');
  const [error, setError] = useState('');
  const [hasSession, setHasSession] = useState(false);

  // Check if we have a valid session (from the reset link)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setHasSession(true);
        logger.debug('[ResetPassword] Session found from reset link');
      } else {
        logger.warn('[ResetPassword] No session found');
        setError('Lien de reinitialisation invalide ou expire. Veuillez demander un nouveau lien.');
        setStatus('error');
      }
    };

    checkSession();
  }, []);

  const validatePassword = (): boolean => {
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres');
      return false;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Le mot de passe doit contenir au moins une majuscule');
      return false;
    }

    if (!/[a-z]/.test(password)) {
      setError('Le mot de passe doit contenir au moins une minuscule');
      return false;
    }

    if (!/\d/.test(password)) {
      setError('Le mot de passe doit contenir au moins un chiffre');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validatePassword()) {
      return;
    }

    setStatus('submitting');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        logger.error('[ResetPassword] Update failed:', updateError);
        setError(updateError.message);
        setStatus('error');
        return;
      }

      logger.debug('[ResetPassword] Password updated successfully');
      setStatus('success');
      notification.success('Mot de passe mis a jour avec succes !');

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      logger.error('[ResetPassword] Unexpected error:', err);
      setError('Une erreur inattendue est survenue');
      setStatus('error');
    }
  };

  const handleRequestNewLink = () => {
    navigate('/login');
  };

  return (
    <>
      <Helmet>
        <title>Reinitialiser le mot de passe - PattaMap</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="auth-layout auth-layout--login">
        {/* Back to Home Link */}
        <Link to="/" className="auth-back-link">
          <ArrowLeft size={16} />
          <span>Home</span>
        </Link>

        {/* Language Selector */}
        <div className="auth-language-selector">
          <LanguageSelector variant="dropdown" />
        </div>

        {/* Hero Section */}
        <div className="auth-layout__hero">
          <AuthHero mode="login" />
        </div>

        {/* Form Section */}
        <div className="auth-layout__form">
          <div className="auth-mobile-header">
            <img src="/logo.svg" alt="PattaMap" className="auth-mobile-header__logo" />
            <span className="auth-mobile-header__title">PattaMap</span>
          </div>

          <div className="auth-form-container">
            <div className="auth-form-login-content">
              <div className="modal-header">
                <h2 className="header-title-nightlife">
                  Nouveau mot de passe
                </h2>
                <p className="modal-subtitle">
                  Choisissez un mot de passe securise pour votre compte
                </p>
              </div>

              {status === 'success' ? (
                <div className="reset-password-success">
                  <CheckCircle size={48} className="reset-password-success-icon" />
                  <h3>Mot de passe mis a jour !</h3>
                  <p>Vous allez etre redirige vers la page de connexion...</p>
                </div>
              ) : status === 'error' && !hasSession ? (
                <div className="reset-password-error">
                  <AlertTriangle size={48} className="reset-password-error-icon" />
                  <h3>Lien expire</h3>
                  <p>{error}</p>
                  <button
                    onClick={handleRequestNewLink}
                    className="btn btn--primary"
                    style={{ marginTop: '20px' }}
                  >
                    Demander un nouveau lien
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="form-layout" noValidate>
                  <div style={{ position: 'relative' }}>
                    <FormField
                      label={
                        <>
                          <Lock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                          Nouveau mot de passe
                        </>
                      }
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="Entrez votre nouveau mot de passe"
                      required
                      minLength={8}
                      autoComplete="new-password"
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
                        padding: '4px'
                      }}
                      aria-label={showPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <FormField
                      label={
                        <>
                          <Lock size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                          Confirmer le mot de passe
                        </>
                      }
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      placeholder="Confirmez votre nouveau mot de passe"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '38px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      aria-label={showConfirmPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {/* Password requirements hint */}
                  <div className="password-requirements">
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      Le mot de passe doit contenir au moins 8 caracteres, une majuscule, une minuscule et un chiffre.
                    </p>
                  </div>

                  {error && (
                    <div className="error-message-nightlife error-shake">
                      <AlertTriangle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className={`btn btn--primary ${status === 'submitting' ? 'btn--loading' : ''}`}
                    style={{ width: '100%', marginTop: '16px' }}
                  >
                    {status === 'submitting' ? (
                      <span className="loading-flex">
                        <span className="loading-spinner-small-nightlife"></span>
                        Mise a jour...
                      </span>
                    ) : (
                      'Mettre a jour le mot de passe'
                    )}
                  </button>

                  <div className="auth-switch-text" style={{ marginTop: '24px' }}>
                    <Link to="/login" className="auth-switch-button">
                      Retour a la connexion
                    </Link>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPasswordPage;
