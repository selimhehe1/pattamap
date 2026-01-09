import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { logger } from '../../utils/logger';
import { useUser } from './UserContext';
import { useCSRF } from '../CSRFContext';
import { setSentryUser, clearSentryUser } from '../../config/sentry';
import notification from '../../utils/notification';

export interface AuthCoreContextType {
  login: (login: string, password: string) => Promise<void>;
  register: (
    pseudonym: string,
    email: string,
    password: string,
    accountType?: 'regular' | 'employee' | 'establishment_owner'
  ) => Promise<{ csrfToken: string | null; passwordBreached: boolean } | undefined>;
  logout: () => void;
}

const AuthCoreContext = createContext<AuthCoreContextType | undefined>(undefined);

interface AuthCoreProviderProps {
  children: ReactNode;
}

export const AuthCoreProvider: React.FC<AuthCoreProviderProps> = ({ children }) => {
  const { setUser, setToken } = useUser();
  const { csrfToken, refreshToken: refreshCSRFToken, setToken: setCSRFToken } = useCSRF();

  const login = useCallback(async (loginValue: string, password: string) => {
    try {
      // Ensure CSRF token is available before login
      let tokenToUse = csrfToken;
      if (!tokenToUse) {
        logger.debug('[AuthCore] CSRF token empty, refreshing before login...');
        const freshToken = await refreshCSRFToken();
        if (freshToken) {
          tokenToUse = freshToken;
        }
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse && { 'X-CSRF-Token': tokenToUse }),
        },
        body: JSON.stringify({ login: loginValue, password }),
      });

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (response.status === 401) {
            errorMessage = 'Invalid credentials';
          } else if (response.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      setUser(data.user);
      setToken('authenticated');

      if (data.user) {
        setSentryUser({
          id: data.user.id,
          pseudonym: data.user.pseudonym,
          email: data.user.email,
          role: data.user.role,
        });
      }

      // Use token directly from login response
      if (data.csrfToken) {
        logger.debug('[AuthCore] CSRF token received from login response');
        setCSRFToken(data.csrfToken);
      } else {
        await refreshCSRFToken();
      }
    } catch (error) {
      logger.error('[AuthCore] Login error:', error);
      throw error;
    }
  }, [csrfToken, refreshCSRFToken, setCSRFToken, setUser, setToken]);

  const register = useCallback(async (
    pseudonym: string,
    email: string,
    password: string,
    accountType?: 'regular' | 'employee' | 'establishment_owner'
  ) => {
    try {
      // Ensure CSRF token is available before register
      let tokenToUse = csrfToken;
      if (!tokenToUse) {
        logger.debug('[AuthCore] CSRF token empty, refreshing before register...');
        const freshToken = await refreshCSRFToken();
        if (freshToken) {
          tokenToUse = freshToken;
        }
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse && { 'X-CSRF-Token': tokenToUse }),
        },
        body: JSON.stringify({
          pseudonym,
          email,
          password,
          account_type: accountType || 'regular',
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Registration failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          if (response.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      setUser(data.user);
      setToken('authenticated');

      if (data.user) {
        setSentryUser({
          id: data.user.id,
          pseudonym: data.user.pseudonym,
          email: data.user.email,
          role: data.user.role,
        });
      }

      // Use token directly from register response
      const freshToken = data.csrfToken;
      if (freshToken) {
        logger.debug('[AuthCore] CSRF token received from register response');
        setCSRFToken(freshToken);
      }

      return {
        csrfToken: freshToken,
        passwordBreached: data.passwordBreached || false
      };
    } catch (error) {
      logger.error('[AuthCore] Registration error:', error);
      throw error;
    }
  }, [csrfToken, refreshCSRFToken, setCSRFToken, setUser, setToken]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
      });
    } catch (error) {
      logger.error('[AuthCore] Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      clearSentryUser();
      notification.success('Déconnexion réussie');
    }
  }, [csrfToken, setUser, setToken]);

  const value: AuthCoreContextType = {
    login,
    register,
    logout,
  };

  return (
    <AuthCoreContext.Provider value={value}>
      {children}
    </AuthCoreContext.Provider>
  );
};

export const useAuthCore = (): AuthCoreContextType => {
  const context = useContext(AuthCoreContext);
  if (context === undefined) {
    throw new Error('useAuthCore must be used within an AuthCoreProvider');
  }
  return context;
};

export default AuthCoreContext;
