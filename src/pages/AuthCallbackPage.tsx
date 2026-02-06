import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { useUser } from '../contexts/auth/UserContext';
import { logger } from '../utils/logger';
import '../styles/pages/auth-pages.css';

/**
 * AuthCallbackPage Component
 *
 * Handles OAuth callback and email confirmation links from Supabase.
 * This page is shown briefly while the auth state is being processed.
 *
 * Uses both getSession() and onAuthStateChange as fallback to handle
 * the PKCE code exchange timing reliably.
 */

type CallbackStatus = 'loading' | 'success' | 'error';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { setUser, setToken } = useUser();
  const processedRef = useRef(false);

  useEffect(() => {
    // Check for error in URL params first (from Supabase redirect)
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      logger.error('[AuthCallback] Error in URL:', { error, errorDescription });
      setStatus('error');
      setErrorMessage(errorDescription || 'Une erreur est survenue lors de l\'authentification');
      return;
    }

    // Check for password reset flow
    const type = searchParams.get('type');
    if (type === 'recovery') {
      navigate('/reset-password', { replace: true });
      return;
    }

    /**
     * Process the Supabase session once available.
     * Called by either getSession() or onAuthStateChange - whichever resolves first.
     */
    const processSession = async (session: Session) => {
      // Guard: only process once
      if (processedRef.current) return;
      processedRef.current = true;

      logger.debug('[AuthCallback] Processing session...', { userId: session.user.id });

      try {
        // Check if user already exists in our database
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/sync-user`, {
          method: 'POST',
          credentials: 'include',
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

        if (!response.ok) {
          logger.error('[AuthCallback] Sync-user failed', {
            status: response.status,
            code: data.code
          });
          setStatus('error');
          setErrorMessage(data.error || 'Erreur lors de la synchronisation du compte');
          return;
        }

        if (data.isNew) {
          // New user: store OAuth data and redirect to registration
          logger.debug('[AuthCallback] New user detected, redirecting to register');
          const oauthData = {
            email: session.user.email,
            name: session.user.user_metadata?.full_name ||
                  session.user.user_metadata?.name || '',
            avatar_url: session.user.user_metadata?.avatar_url ||
                        session.user.user_metadata?.picture || '',
            birthday: session.user.user_metadata?.birthday || null,
            gender: session.user.user_metadata?.gender || null
          };
          sessionStorage.setItem('oauth_user_data', JSON.stringify(oauthData));

          setStatus('success');
          setTimeout(() => {
            navigate('/login?mode=register&from=oauth', { replace: true });
          }, 1000);
        } else {
          // Existing user: update UserContext with the returned user data
          // The backend already set the auth-token cookie in this response
          logger.debug('[AuthCallback] Existing user, updating context and redirecting');

          if (data.user) {
            setUser(data.user);
            setToken('authenticated');
          }

          setStatus('success');
          setTimeout(() => {
            const redirectTo = sessionStorage.getItem('auth_redirect') || '/';
            sessionStorage.removeItem('auth_redirect');
            navigate(redirectTo, { replace: true });
          }, 1000);
        }
      } catch (syncError) {
        logger.error('[AuthCallback] Sync check failed:', syncError);
        setStatus('error');
        setErrorMessage('Impossible de synchroniser votre compte. Veuillez reessayer.');
      }
    };

    // Strategy: try getSession() first, use onAuthStateChange as fallback.
    // This handles the case where the PKCE code exchange may still be in progress
    // when getSession() is called.

    let timeoutId: ReturnType<typeof setTimeout>;

    // Listen for auth state changes (fires when PKCE exchange completes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.debug('[AuthCallback] Auth state change:', { event, hasSession: !!session });
        if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          processSession(session);
        }
      }
    );

    // Also try getSession() immediately (works if exchange already completed)
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        logger.error('[AuthCallback] Session error:', sessionError);
        if (!processedRef.current) {
          processedRef.current = true;
          setStatus('error');
          setErrorMessage(sessionError.message);
        }
        return;
      }

      if (session) {
        processSession(session);
      } else {
        logger.debug('[AuthCallback] No session from getSession(), waiting for auth state change...');
      }
    });

    // Timeout: if no session after 15 seconds, show error
    timeoutId = setTimeout(() => {
      if (!processedRef.current) {
        processedRef.current = true;
        logger.error('[AuthCallback] Session timeout - no session after 15s');
        setStatus('error');
        setErrorMessage('Session non trouvee. Veuillez vous reconnecter.');
      }
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [navigate, searchParams, setUser, setToken]);

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
