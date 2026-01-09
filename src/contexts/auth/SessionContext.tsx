import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { logger } from '../../utils/logger';
import notification from '../../utils/notification';
import { useUser } from './UserContext';

// Constants
const SESSION_VALIDITY_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check session every 5 minutes

export interface SessionContextType {
  // Session is managed internally, consumers just need to know if it's being checked
  isCheckingSession: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
  const { user, checkAuthStatus, setUser, setToken } = useUser();

  // Session check interval ref
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent multiple "session expired" notifications
  const sessionExpiredNotifiedRef = useRef(false);

  // User ref to check state without triggering re-renders
  const userRef = useRef(user);

  // Keep userRef in sync
  useEffect(() => {
    userRef.current = user;
    // Reset notification flag when user logs in
    if (user) {
      sessionExpiredNotifiedRef.current = false;
    }
  }, [user]);

  // Custom session check that handles expiration notification
  const checkSessionWithNotification = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok && userRef.current && !sessionExpiredNotifiedRef.current) {
        logger.warn('[SessionContext] Session expired - user will be logged out');
        sessionExpiredNotifiedRef.current = true;
        notification.warning('Votre session a expiré. Veuillez vous reconnecter.');
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      logger.error('[SessionContext] Session check failed:', error);
    }
  };

  // Periodic session validity check
  useEffect(() => {
    if (!user) {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
      return;
    }

    // Start periodic session validity check
    sessionCheckIntervalRef.current = setInterval(() => {
      logger.debug('[SessionContext] Performing periodic session check');
      checkSessionWithNotification();
    }, SESSION_VALIDITY_CHECK_INTERVAL_MS);

    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-check session when window gains focus (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userRef.current) {
        logger.debug('[SessionContext] Tab became visible - checking session validity');
        checkAuthStatus(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkAuthStatus]);

  const value: SessionContextType = {
    isCheckingSession: false, // Could be enhanced to track checking state
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export default SessionContext;
