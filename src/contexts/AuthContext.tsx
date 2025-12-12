import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, Employee } from '../types';
import { logger } from '../utils/logger';
import { setSentryUser, clearSentryUser } from '../config/sentry';
import { useCSRF } from './CSRFContext';

// Export AuthContext for testing purposes
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkedEmployeeProfile, setLinkedEmployeeProfile] = useState<Employee | null>(null); // 🆕 v10.0 - Linked employee profile

  // Get CSRF token from context (for non-register operations)
  const { csrfToken } = useCSRF();

  useEffect(() => {
    // Check if user is authenticated via backend /profile endpoint
    // Cookies are automatically sent with requests
    const checkAuthStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/profile`, {
          method: 'GET',
          credentials: 'include', // Include cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });

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
              data.user?.account_type === 'employee' && !!data.user?.linked_employee_id
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pseudonym,
          email,
          password,
          account_type: accountType || 'regular', // 🆕 v10.0
        }),
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

      // 🔧 CSRF FIX: Backend now returns CSRF token directly in response
      // This eliminates session ID mismatch issues (no separate /csrf-token call needed)
      const freshToken = data.csrfToken;

      if (freshToken) {
        logger.debug('✅ CSRF token received from register response', {
          hasFreshToken: true,
          freshTokenPreview: `${freshToken.substring(0, 8)}...`
        });
      } else {
        logger.warn('⚠️ No CSRF token in register response');
      }

      // 🆕 v10.0 - Linked employee profile is now fetched automatically via useEffect
      // when user state changes (see useEffect at bottom of component)

      return freshToken; // 🔧 Return fresh CSRF token for immediate use
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