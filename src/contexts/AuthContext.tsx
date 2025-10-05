import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { logger } from '../utils/logger';
import { setSentryUser, clearSentryUser } from '../config/sentry';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated via backend /profile endpoint
    // Cookies are automatically sent with requests
    const checkAuthStatus = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/profile`, {
          method: 'GET',
          credentials: 'include', // Include cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setToken('authenticated'); // Cookie-based, so we just mark as authenticated

          // Set Sentry user context for error tracking
          if (data.user) {
            setSentryUser({
              id: data.user.id,
              pseudonym: data.user.pseudonym,
              email: data.user.email,
              role: data.user.role,
            });
          }
        } else {
          // Not authenticated or token expired
          setUser(null);
          setToken(null);
          clearSentryUser();
        }
      } catch (error) {
        logger.error('Auth check failed:', error);
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (login: string, password: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      setToken('authenticated'); // Cookie-based authentication

      // Set Sentry user context
      if (data.user) {
        setSentryUser({
          id: data.user.id,
          pseudonym: data.user.pseudonym,
          email: data.user.email,
          role: data.user.role,
        });
      }
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  };

  const register = async (pseudonym: string, email: string, password: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pseudonym, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setUser(data.user);
      setToken('authenticated'); // Cookie-based authentication

      // Set Sentry user context
      if (data.user) {
        setSentryUser({
          id: data.user.id,
          pseudonym: data.user.pseudonym,
          email: data.user.email,
          role: data.user.role,
        });
      }
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call backend logout to clear httpOnly cookie
      await fetch(`${process.env.REACT_APP_API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      logger.error('Logout error:', error);
      // Continue with local logout even if backend call fails
    } finally {
      // Clear local state
      setUser(null);
      setToken(null);

      // Clear Sentry user context
      clearSentryUser();
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};