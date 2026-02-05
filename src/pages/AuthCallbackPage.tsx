import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import '../styles/pages/auth-pages.css';

/**
 * AuthCallbackPage Component
 *
 * Handles OAuth callback and email confirmation links from Supabase.
 * This page is shown briefly while the auth state is being processed.
 *
 * Scenarios handled:
 * - OAuth callback (Google sign in)
 * - Email confirmation after signup
 * - Password reset redirect
 * - Error handling for failed auth
 */

type CallbackStatus = 'loading' | 'success' | 'error';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL params (from Supabase redirect)
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          logger.error('[AuthCallback] Error in URL:', { error, errorDescription });
          setStatus('error');
          setErrorMessage(errorDescription || 'Une erreur est survenue lors de l\'authentification');
          return;
        }

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error('[AuthCallback] Session error:', sessionError);
          setStatus('error');
          setErrorMessage(sessionError.message);
          return;
        }

        if (session) {
          logger.debug('[AuthCallback] Session found, checking if user exists...');

          // Check if user already exists in our database
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/sync-user`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                supabaseUserId: session.user.id,
                email: session.user.email,
                checkOnly: true
              })
            });

            const data = await response.json();

            if (data.isNew) {
              // New user: store Google data and redirect to registration
              logger.debug('[AuthCallback] New user detected, redirecting to register');
              const googleData = {
                email: session.user.email,
                name: session.user.user_metadata?.full_name ||
                      session.user.user_metadata?.name || '',
                avatar_url: session.user.user_metadata?.avatar_url ||
                            session.user.user_metadata?.picture || ''
              };
              sessionStorage.setItem('google_user_data', JSON.stringify(googleData));

              setStatus('success');
              setTimeout(() => {
                navigate('/register?from=google', { replace: true });
              }, 1000);
            } else {
              // Existing user: normal login flow
              logger.debug('[AuthCallback] Existing user, redirecting to dashboard');
              setStatus('success');
              setTimeout(() => {
                const redirectTo = sessionStorage.getItem('auth_redirect') || '/';
                sessionStorage.removeItem('auth_redirect');
                navigate(redirectTo, { replace: true });
              }, 1000);
            }
          } catch (syncError) {
            logger.error('[AuthCallback] Sync check failed:', syncError);
            // Fallback to normal redirect on error
            setStatus('success');
            setTimeout(() => {
              const redirectTo = sessionStorage.getItem('auth_redirect') || '/';
              sessionStorage.removeItem('auth_redirect');
              navigate(redirectTo, { replace: true });
            }, 1000);
          }
        } else {
          // No session - might be email confirmation
          // Check if this is a recovery (password reset) link
          const type = searchParams.get('type');

          if (type === 'recovery') {
            // Password reset flow - redirect to reset password page
            navigate('/reset-password', { replace: true });
            return;
          }

          // For signup confirmation, the session should be created automatically
          // If not, show an error
          logger.warn('[AuthCallback] No session found');
          setStatus('error');
          setErrorMessage('Session non trouvee. Veuillez vous reconnecter.');
        }
      } catch (err) {
        logger.error('[AuthCallback] Unexpected error:', err);
        setStatus('error');
        setErrorMessage('Une erreur inattendue est survenue');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  const handleRetryLogin = () => {
    navigate('/login', { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Authentification - PattaMap</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="auth-callback-page">
        <div className="auth-callback-card">
          {status === 'loading' && (
            <>
              <Loader2 className="auth-callback-spinner" size={48} />
              <h2 className="auth-callback-title">Connexion en cours...</h2>
              <p className="auth-callback-message">
                Veuillez patienter pendant que nous verifions vos informations.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="auth-callback-icon auth-callback-icon--success" size={48} />
              <h2 className="auth-callback-title">Connexion reussie !</h2>
              <p className="auth-callback-message">
                Vous allez etre redirige automatiquement...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="auth-callback-icon auth-callback-icon--error" size={48} />
              <h2 className="auth-callback-title">Erreur d'authentification</h2>
              <p className="auth-callback-message">
                {errorMessage}
              </p>
              <button
                onClick={handleRetryLogin}
                className="btn btn--primary auth-callback-btn"
              >
                Retourner a la connexion
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AuthCallbackPage;
