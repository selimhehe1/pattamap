import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { User } from '../../types';
import { logger } from '../../utils/logger';
import { setSentryUser, clearSentryUser } from '../../config/sentry';

// Constants
const AUTH_CHECK_TIMEOUT_MS = 10000; // 10 second timeout for auth checks

export interface UserContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  refreshUser: () => Promise<void>;
  checkAuthStatus: (isPeriodicCheck?: boolean) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Use ref for user to prevent checkAuthStatus recreation on user change
  const userRef = useRef<User | null>(null);

  // Keep userRef in sync with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Wrapper to set user and update Sentry
  const setUser = useCallback((newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      setSentryUser({
        id: newUser.id,
        pseudonym: newUser.pseudonym,
        email: newUser.email,
        role: newUser.role,
      });
    } else {
      clearSentryUser();
    }
  }, []);

  // Auth check with timeout
  const checkAuthStatus = useCallback(async (isPeriodicCheck = false) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AUTH_CHECK_TIMEOUT_MS);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!isMountedRef.current) return;

      if (response.ok) {
        const data = await response.json();

        logger.debug('[UserContext] Profile fetched:', {
          hasUser: !!data.user,
          pseudonym: data.user?.pseudonym,
          account_type: data.user?.account_type,
        });

        setUser(data.user);
        setToken('authenticated');
      } else {
        // Not authenticated or token expired
        if (!isPeriodicCheck) {
          setUser(null);
          setToken(null);
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (!isMountedRef.current) return;

      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn(`[UserContext] Auth check timed out after ${AUTH_CHECK_TIMEOUT_MS}ms`);
      } else {
        logger.error('[UserContext] Auth check failed:', error);
      }

      if (!isPeriodicCheck) {
        setUser(null);
        setToken(null);
      }
    } finally {
      if (isMountedRef.current && !isPeriodicCheck) {
        setLoading(false);
      }
    }
  }, [setUser]);

  // Initial auth check on mount
  useEffect(() => {
    isMountedRef.current = true;
    checkAuthStatus(false);

    return () => {
      isMountedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshUser = useCallback(async () => {
    await checkAuthStatus(false);
  }, [checkAuthStatus]);

  const value: UserContextType = {
    user,
    loading,
    token,
    setUser,
    setToken,
    refreshUser,
    checkAuthStatus,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
