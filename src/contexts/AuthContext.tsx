import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { User, AuthContextType, Employee } from '../types';
import { logger } from '../utils/logger';
import { setSentryUser, clearSentryUser } from '../config/sentry';
import { useCSRF } from './CSRFContext';
import notification from '../utils/notification';

// Export AuthContext for testing purposes
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 🔧 FIX A3: Constants for session management
const AUTH_CHECK_TIMEOUT_MS = 10000; // 10 second timeout for auth checks
const SESSION_VALIDITY_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check session every 5 minutes

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkedEmployeeProfile, setLinkedEmployeeProfile] = useState<Employee | null>(null); // 🆕 v10.0 - Linked employee profile

  // Get CSRF token from context (for non-register operations)
  const { csrfToken, refreshToken: refreshCSRFToken, setToken: setCSRFToken } = useCSRF();

  // 🔧 FIX A3: Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🔧 FIX: Use ref for user to prevent checkAuthStatus recreation on user change
  const userRef = useRef<User | null>(null);

  // 🔧 FIX: Prevent multiple "session expired" notifications
  const sessionExpiredNotifiedRef = useRef(false);

  // Keep userRef in sync with user state
  useEffect(() => {
    userRef.current = user;
    // Reset notification flag when user logs in
    if (user) {
      sessionExpiredNotifiedRef.current = false;
    }
  }, [user]);

  // 🔧 FIX A3: Auth check with timeout
  const checkAuthStatus = useCallback(async (isPeriodicCheck = false) => {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AUTH_CHECK_TIMEOUT_MS);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
        method: 'GET',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!isMountedRef.current) return;

      if (response.ok) {
        const data = await response.json();

        // DEBUG: Log exactly what /api/auth/profile returns
        logger.debug('[AuthContext] /api/auth/profile response:', {
          hasUser: !!data.user,
          pseudonym: data.user?.pseudonym,
          account_type: data.user?.account_type,
          linked_employee_id: data.user?.linked_employee_id,
          accountTypeIsEmployee: data.user?.account_type === 'employee',
          hasLinkedId: !!data.user?.linked_employee_id,
          willCallGetMyLinkedProfile:
            data.user?.account_type === 'employee' && !!data.user?.linked_employee_id,
          isPeriodicCheck
        });

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

        // 🆕 v10.0 - Linked employee profile is now fetched automatically via useEffect
        // when user state changes (see useEffect at bottom of component)
        logger.debug('[AuthContext] User loaded, profile will be fetched via useEffect if needed');
      } else {
        // Not authenticated or token expired
        // 🔧 FIX: Use ref to check user state and prevent multiple notifications
        if (isPeriodicCheck && userRef.current && !sessionExpiredNotifiedRef.current) {
          logger.warn('[AuthContext] Session expired - user will be logged out');
          sessionExpiredNotifiedRef.current = true; // Prevent multiple notifications
          notification.warning('Votre session a expiré. Veuillez vous reconnecter.');
        }
        setUser(null);
        setToken(null);
        setLinkedEmployeeProfile(null);
        clearSentryUser();
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (!isMountedRef.current) return;

      // 🔧 FIX A3: Handle timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        logger.warn(`[AuthContext] Auth check timed out after ${AUTH_CHECK_TIMEOUT_MS}ms`);
      } else {
        logger.error('Auth check failed:', error);
      }

      // Only clear user state on initial load, not on periodic network failures
      if (!isPeriodicCheck) {
        setUser(null);
        setToken(null);
      }
    } finally {
      if (isMountedRef.current && !isPeriodicCheck) {
        setLoading(false);
      }
    }
  }, []); // 🔧 FIX: Removed 'user' dependency - now uses userRef to prevent recreation

  // 🔧 FIX A3: Initial auth check on mount
  useEffect(() => {
    isMountedRef.current = true;
    checkAuthStatus(false);

    return () => {
      isMountedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔧 FIX A3: Periodic session validity check
  useEffect(() => {
    // Only start periodic checks when user is authenticated
    if (!user) {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
      return;
    }

    // Start periodic session validity check
    sessionCheckIntervalRef.current = setInterval(() => {
      logger.debug('[AuthContext] Performing periodic session check');
      checkAuthStatus(true);
    }, SESSION_VALIDITY_CHECK_INTERVAL_MS);

    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    };
  }, [user, checkAuthStatus]);

  // 🔧 FIX A3: Re-check session when window gains focus (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        logger.debug('[AuthContext] Tab became visible - checking session validity');
        checkAuthStatus(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, checkAuthStatus]);

  const login = async (login: string, password: string) => {
    try {
      // 🔧 FIX: Ensure CSRF token is available before login
      // If token is empty, try to refresh it first
      let tokenToUse = csrfToken;
      if (!tokenToUse) {
        logger.debug('[AuthContext] CSRF token empty, refreshing before login...');
        const freshToken = await refreshCSRFToken();
        if (freshToken) {
          tokenToUse = freshToken;
          logger.debug('[AuthContext] Got fresh CSRF token for login');
        } else {
          logger.warn('[AuthContext] Could not get CSRF token for login');
        }
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse && { 'X-CSRF-Token': tokenToUse }), // 🛡️ CSRF protection
        },
        body: JSON.stringify({ login, password }),
      });

      // 🔧 FIX L1: Check response.ok BEFORE parsing JSON to prevent "Unexpected end of JSON input"
      // Server may return empty body on certain errors (500, network issues)
      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // JSON parsing failed - use status-based message
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

      // 🔧 CSRF FIX: Use token directly from login response (NOT refreshCSRFToken!)
      // refreshCSRFToken() fetches a NEW session, causing token mismatch
      if (data.csrfToken) {
        logger.debug('✅ CSRF token received from login response', {
          hasFreshToken: true,
          freshTokenPreview: `${data.csrfToken.substring(0, 8)}...`
        });
        // Set the token directly (avoid fetch which creates new session)
        setCSRFToken(data.csrfToken);
      } else {
        logger.warn('⚠️ No CSRF token in login response, refreshing manually');
        await refreshCSRFToken();
      }

      // 🆕 v10.0 - Linked employee profile is now fetched automatically via useEffect
      // when user state changes (see useEffect at bottom of component)
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  };

  const register = async (
    pseudonym: string,
    email: string,
    password: string,
    accountType?: 'regular' | 'employee' | 'establishment_owner'
  ) => {
    try {
      // 🔧 FIX: Ensure CSRF token is available before register
      let tokenToUse = csrfToken;
      if (!tokenToUse) {
        logger.debug('[AuthContext] CSRF token empty, refreshing before register...');
        const freshToken = await refreshCSRFToken();
        if (freshToken) {
          tokenToUse = freshToken;
          logger.debug('[AuthContext] Got fresh CSRF token for register');
        } else {
          logger.warn('[AuthContext] Could not get CSRF token for register');
        }
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse && { 'X-CSRF-Token': tokenToUse }), // 🛡️ CSRF protection
        },
        body: JSON.stringify({
          pseudonym,
          email,
          password,
          account_type: accountType || 'regular', // 🆕 v10.0
        }),
      });

      // 🔧 FIX L1: Check response.ok BEFORE parsing JSON (same pattern as login)
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

      // 🔧 CSRF FIX: Use token directly from register response (same fix as login)
      const freshToken = data.csrfToken;

      if (freshToken) {
        logger.debug('✅ CSRF token received from register response', {
          hasFreshToken: true,
          freshTokenPreview: `${freshToken.substring(0, 8)}...`
        });
        // Set the token directly (avoid fetch which creates new session)
        setCSRFToken(freshToken);
      } else {
        logger.warn('⚠️ No CSRF token in register response');
      }

      // 🆕 v10.0 - Linked employee profile is now fetched automatically via useEffect
      // when user state changes (see useEffect at bottom of component)

      // ⚠️ Return object with token and password breach warning flag
      return {
        csrfToken: freshToken,
        passwordBreached: data.passwordBreached || false
      };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call backend logout to clear httpOnly cookie
      await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }), // 🛡️ CSRF protection
        },
      });
    } catch (error) {
      logger.error('Logout error:', error);
      // Continue with local logout even if backend call fails
    } finally {
      // Clear local state
      setUser(null);
      setToken(null);
      setLinkedEmployeeProfile(null); // 🆕 v10.0 - Clear linked profile

      // Clear Sentry user context
      clearSentryUser();

      // Show success notification
      notification.success('Déconnexion réussie');
    }
  };

  // ==========================================
  // 🆕 GET LINKED EMPLOYEE PROFILE (v10.0)
  // ==========================================

  /**
   * Fetch the employee profile linked to the current user account
   * Only for users with account_type === 'employee' and a linked_employee_id
   *
   * @param skipCheck - Skip the user state check (used when called immediately after login/register with fresh data)
   */
  const getMyLinkedProfile = async (skipCheck: boolean = false) => {
    logger.debug('[AuthContext] getMyLinkedProfile() called', {
      hasUser: !!user,
      account_type: user?.account_type,
      linked_employee_id: user?.linked_employee_id,
      skipCheck
    });

    // Only fetch if user is an employee and has a linked profile
    // Skip check when called immediately after login (state might not be updated yet due to async)
    if (!skipCheck && (!user || user.account_type !== 'employee' || !user.linked_employee_id)) {
      logger.debug('[AuthContext] getMyLinkedProfile() aborted - conditions not met', {
        hasUser: !!user,
        isEmployee: user?.account_type === 'employee',
        hasLinkedId: !!user?.linked_employee_id
      });
      setLinkedEmployeeProfile(null);
      return;
    }

    logger.debug('[AuthContext] Fetching /api/employees/my-linked-profile...');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/employees/my-linked-profile`,
        {
          method: 'GET',
          credentials: 'include', // Include cookies for auth
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      logger.debug('[AuthContext] /api/employees/my-linked-profile response:', {
        status: response.status,
        ok: response.ok
      });

      if (response.ok) {
        const data = await response.json();
        logger.debug('[AuthContext] Linked employee profile fetched:', {
          employee_id: data.id,
          name: data.name,
          status: data.status
        });
        setLinkedEmployeeProfile(data);
        logger.info('Linked employee profile fetched', { employee_id: data.id });
      } else {
        // Profile not found or not accessible
        const errorData = await response.json();
        logger.debug('[AuthContext] Failed to fetch linked profile:', {
          status: response.status,
          error: errorData
        });
        setLinkedEmployeeProfile(null);
        logger.warn('❌ Failed to fetch linked employee profile');
      }
    } catch (error) {
      logger.error('[AuthContext] Get linked profile error:', error);
      setLinkedEmployeeProfile(null);
    }
  };

  // ==========================================
  // 🆕 EMPLOYEE CLAIM SYSTEM (v10.0)
  // ==========================================

  /**
   * Claim an existing employee profile
   * User submits a request to link their account to an employee profile
   * Requires admin approval
   */
  const claimEmployeeProfile = async (
    employeeId: string,
    message: string,
    verificationProof?: string[],
    explicitToken?: string // 🔧 Accept explicit token to bypass context state delay
  ) => {
    try {
      // Use explicit token if provided, otherwise fall back to context token
      const tokenToUse = explicitToken || csrfToken;

      // 🔍 Debug log to verify CSRF token is present
      logger.debug('🔐 Claiming employee profile', {
        employeeId,
        usingExplicitToken: !!explicitToken,
        hasCsrfToken: !!tokenToUse,
        csrfTokenPreview: tokenToUse ? `${tokenToUse.substring(0, 8)}...` : 'EMPTY'
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/employees/claim/${employeeId}`,
        {
          method: 'POST',
          credentials: 'include', // Include cookies
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': tokenToUse, // Use the explicit or context token
          },
          body: JSON.stringify({
            message,
            verification_proof: verificationProof || [],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit claim request');
      }

      logger.info('Claim request submitted successfully', { claim_id: data.claim_id });
    } catch (error) {
      logger.error('Claim employee profile error:', error);
      throw error;
    }
  };

  // ==========================================
  // 🆕 OWNERSHIP REQUEST SYSTEM (v10.x)
  // ==========================================

  /**
   * Submit an ownership request for an establishment during registration
   * Similar to employee claim but for establishment owners
   */
  const submitOwnershipRequest = async (
    establishmentId: string,
    documentUrls: string[],
    requestMessage?: string,
    contactMe?: boolean,
    explicitToken?: string
  ) => {
    try {
      // Use explicit token if provided, otherwise fall back to context token
      const tokenToUse = explicitToken || csrfToken;

      logger.debug('🔐 Submitting ownership request', {
        establishmentId,
        documentCount: documentUrls.length,
        hasMessage: !!requestMessage,
        contactMe,
        usingExplicitToken: !!explicitToken,
        hasCsrfToken: !!tokenToUse,
        csrfTokenPreview: tokenToUse ? `${tokenToUse.substring(0, 8)}...` : 'EMPTY'
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ownership-requests`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': tokenToUse,
          },
          body: JSON.stringify({
            establishment_id: establishmentId,
            documents_urls: documentUrls,
            request_message: contactMe
              ? `[CONTACT ME] ${requestMessage || 'Please contact me by email - I don\'t have documents yet'}`
              : requestMessage,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit ownership request');
      }

      logger.info('Ownership request submitted successfully', { request_id: data.id });
    } catch (error) {
      logger.error('Submit ownership request error:', error);
      throw error;
    }
  };

  // ==========================================
  // 🔧 FIX: useEffect to fetch linked profile when user changes
  // ==========================================
  // This replaces the fragile setTimeout pattern with a proper React effect
  // that triggers when user state actually changes
  useEffect(() => {
    if (user?.account_type === 'employee' && user?.linked_employee_id && !linkedEmployeeProfile) {
      logger.debug('[AuthContext] useEffect triggered - fetching linked profile for employee user');
      getMyLinkedProfile(true); // skipCheck=true since we already verified conditions
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally excluding getMyLinkedProfile and linkedEmployeeProfile to prevent infinite loops
  }, [user?.account_type, user?.linked_employee_id]); // Only re-run when these specific properties change

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    claimEmployeeProfile, // 🆕 v10.0
    linkedEmployeeProfile, // 🆕 v10.0
    refreshLinkedProfile: getMyLinkedProfile, // 🆕 v10.0
    submitOwnershipRequest, // 🆕 v10.x - Owner claim during registration
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