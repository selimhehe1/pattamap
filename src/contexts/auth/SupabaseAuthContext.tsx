import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { supabase } from '../../config/supabase';
import { User } from '../../types';
import { logger } from '../../utils/logger';
import i18n from '../../utils/i18n';

export interface SupabaseAuthContextType {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateUserLanguage: (language: string) => Promise<void>;
  syncUserWithBackend: (session: Session) => Promise<User | null>;
}

interface SignUpMetadata {
  pseudonym: string;
  account_type?: 'regular' | 'employee' | 'establishment_owner';
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

interface SupabaseAuthProviderProps {
  children: ReactNode;
  onUserSync?: (user: User | null) => void;
}

export const SupabaseAuthProvider: React.FC<SupabaseAuthProviderProps> = ({ children, onUserSync }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync Supabase user with our backend users table
  const syncUserWithBackend = useCallback(async (currentSession: Session): Promise<User | null> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/sync-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({
          supabaseUserId: currentSession.user.id,
          email: currentSession.user.email,
          pseudonym: currentSession.user.user_metadata?.pseudonym ||
                     currentSession.user.email?.split('@')[0] ||
                     'user_' + currentSession.user.id.slice(0, 8),
          account_type: currentSession.user.user_metadata?.account_type || 'regular'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('[SupabaseAuth] Sync failed:', errorData);
        return null;
      }

      const data = await response.json();
      logger.debug('[SupabaseAuth] User synced:', { userId: data.user?.id });

      if (onUserSync) {
        onUserSync(data.user);
      }

      return data.user;
    } catch (error) {
      logger.error('[SupabaseAuth] Sync error:', error);
      return null;
    }
  }, [onUserSync]);

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setSupabaseUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        syncUserWithBackend(initialSession).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        logger.debug('[SupabaseAuth] Auth state changed:', { event, userId: currentSession?.user?.id });

        setSession(currentSession);
        setSupabaseUser(currentSession?.user ?? null);

        if (event === 'SIGNED_IN' && currentSession) {
          await syncUserWithBackend(currentSession);
        } else if (event === 'SIGNED_OUT') {
          if (onUserSync) {
            onUserSync(null);
          }
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          logger.debug('[SupabaseAuth] Token refreshed');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [syncUserWithBackend, onUserSync]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      logger.error('[SupabaseAuth] Email sign in failed:', error);
      throw mapAuthError(error);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      logger.error('[SupabaseAuth] Google sign in failed:', error);
      throw mapAuthError(error);
    }
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata: SignUpMetadata
  ): Promise<{ needsEmailConfirmation: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          pseudonym: metadata.pseudonym,
          account_type: metadata.account_type || 'regular',
          language: i18n.language // Store user's preferred language for emails
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      logger.error('[SupabaseAuth] Sign up failed:', error);
      throw mapAuthError(error);
    }

    // Check if email confirmation is required
    // If user.identities is empty, it means email confirmation is pending
    const needsEmailConfirmation = data.user?.identities?.length === 0 ||
                                    data.session === null;

    logger.debug('[SupabaseAuth] Sign up result:', {
      needsEmailConfirmation,
      hasSession: !!data.session
    });

    return { needsEmailConfirmation };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('[SupabaseAuth] Sign out failed:', error);
      throw mapAuthError(error);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
      logger.error('[SupabaseAuth] Password reset failed:', error);
      throw mapAuthError(error);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      logger.error('[SupabaseAuth] Password update failed:', error);
      throw mapAuthError(error);
    }
  }, []);

  const updateUserLanguage = useCallback(async (language: string) => {
    // Only update if user is logged in
    if (!session) {
      logger.debug('[SupabaseAuth] No session, skipping language update');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: { language }
    });

    if (error) {
      logger.error('[SupabaseAuth] Language update failed:', error);
      // Don't throw - this is a non-critical operation
    } else {
      logger.debug('[SupabaseAuth] Language updated to:', language);
    }
  }, [session]);

  const value: SupabaseAuthContextType = {
    session,
    supabaseUser,
    loading,
    signInWithEmail,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateUserLanguage,
    syncUserWithBackend
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = (): SupabaseAuthContextType => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};

// Map Supabase auth errors to user-friendly messages
function mapAuthError(error: AuthError): Error {
  const errorMap: Record<string, string> = {
    'Invalid login credentials': 'Email ou mot de passe incorrect',
    'Email not confirmed': 'Veuillez confirmer votre email avant de vous connecter',
    'User already registered': 'Un compte existe deja avec cet email',
    'Password should be at least 6 characters': 'Le mot de passe doit contenir au moins 6 caracteres',
    'Signup requires a valid password': 'Le mot de passe est invalide',
    'Unable to validate email address: invalid format': 'Format d\'email invalide',
    'Email rate limit exceeded': 'Trop de tentatives, veuillez reessayer plus tard',
    'For security purposes, you can only request this once every 60 seconds':
      'Veuillez attendre 60 secondes avant de reessayer'
  };

  const friendlyMessage = errorMap[error.message] || error.message;
  return new Error(friendlyMessage);
}

export default SupabaseAuthContext;
