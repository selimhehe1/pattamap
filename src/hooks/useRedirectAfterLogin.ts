import { useLocation } from 'react-router-dom';
import { useNavigateWithTransition } from './useNavigateWithTransition';
import { useAuth } from '../contexts/AuthContext';
import { useCallback, useEffect } from 'react';

/**
 * useRedirectAfterLogin Hook
 *
 * Manages redirect logic after successful authentication.
 * Retrieves the intended destination from location state and redirects appropriately.
 *
 * Features:
 * - Preserves intended destination before login
 * - Role-based default redirects
 * - Automatic redirect on user state change
 *
 * @example
 * // In LoginForm component
 * const { redirectAfterLogin, getDefaultRedirect } = useRedirectAfterLogin();
 *
 * const handleLoginSuccess = () => {
 *   redirectAfterLogin();
 * };
 */

interface UseRedirectAfterLoginReturn {
  /** Execute redirect to intended destination or default */
  redirectAfterLogin: () => void;

  /** Get the intended destination from location state */
  getIntendedDestination: () => string | null;

  /** Get the default redirect path based on user role */
  getDefaultRedirect: () => string;

  /** Check if there's a stored intended destination */
  hasIntendedDestination: boolean;
}

export const useRedirectAfterLogin = (): UseRedirectAfterLoginReturn => {
  const navigate = useNavigateWithTransition();
  const location = useLocation();
  const { user } = useAuth();

  // Get the intended destination from location state
  const getIntendedDestination = useCallback((): string | null => {
    const state = location.state as { from?: string } | null;
    return state?.from || null;
  }, [location.state]);

  // Get the default redirect path based on user role/account type
  const getDefaultRedirect = useCallback((): string => {
    if (!user) return '/';

    // Admin users go to admin panel
    if (user.role === 'admin') {
      return '/admin';
    }

    // Establishment owners go to their establishments
    if (user.account_type === 'establishment_owner') {
      return '/my-establishments';
    }

    // Employees go to their dashboard
    if (user.account_type === 'employee') {
      return '/employee/dashboard';
    }

    // Regular users go to their dashboard
    return '/dashboard';
  }, [user]);

  // Execute redirect to intended destination or default
  const redirectAfterLogin = useCallback(() => {
    const intendedDestination = getIntendedDestination();
    const defaultRedirect = getDefaultRedirect();

    const destination = intendedDestination || defaultRedirect;

    navigate(destination, { replace: true });
  }, [navigate, getIntendedDestination, getDefaultRedirect]);

  // Check if there's a stored intended destination
  const hasIntendedDestination = getIntendedDestination() !== null;

  return {
    redirectAfterLogin,
    getIntendedDestination,
    getDefaultRedirect,
    hasIntendedDestination,
  };
};

/**
 * useAutoRedirectIfAuthenticated Hook
 *
 * Automatically redirects authenticated users away from auth pages.
 * Use on login/register pages to prevent authenticated users from seeing them.
 *
 * @example
 * // In LoginPage component
 * useAutoRedirectIfAuthenticated();
 */
export const useAutoRedirectIfAuthenticated = (): void => {
  const { user, loading } = useAuth();
  const { redirectAfterLogin } = useRedirectAfterLogin();

  useEffect(() => {
    // Wait for auth check to complete
    if (loading) return;

    // Redirect if user is already authenticated
    if (user) {
      redirectAfterLogin();
    }
  }, [user, loading, redirectAfterLogin]);
};

export default useRedirectAfterLogin;
