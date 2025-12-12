import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingFallback from '../Common/LoadingFallback';
import AccessDenied from '../Common/AccessDenied';

/**
 * ProtectedRoute Component
 *
 * Higher-order component for protecting routes that require authentication
 * and/or specific user roles.
 *
 * Features:
 * - Authentication check
 * - Role-based access control
 * - Loading state handling
 * - Redirect preservation (stores intended destination)
 * - AccessDenied UI for unauthorized users
 *
 * @example
 * // Basic authentication required
 * <ProtectedRoute>
 *   <UserDashboard />
 * </ProtectedRoute>
 *
 * @example
 * // Role-based protection
 * <ProtectedRoute requiredRoles={['admin', 'moderator']}>
 *   <AdminPanel />
 * </ProtectedRoute>
 *
 * @example
 * // Account type protection
 * <ProtectedRoute requiredAccountTypes={['establishment_owner']}>
 *   <MyEstablishmentsPage />
 * </ProtectedRoute>
 */

export type UserRole = 'user' | 'moderator' | 'admin';
export type AccountType = 'regular' | 'employee' | 'establishment_owner';

export interface ProtectedRouteProps {
  /** Child components to render if authorized */
  children: React.ReactNode;

  /** Required user roles (any match grants access) */
  requiredRoles?: UserRole[];

  /** Required account types (any match grants access) */
  requiredAccountTypes?: AccountType[];

  /** Custom redirect path for unauthenticated users (default: /login) */
  redirectTo?: string;

  /** Show AccessDenied component instead of redirecting for role mismatch */
  showAccessDenied?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = [],
  requiredAccountTypes = [],
  redirectTo = '/login',
  showAccessDenied = true,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <LoadingFallback
        message="Checking authentication..."
        variant="page"
      />
    );
  }

  // Not authenticated - redirect to login with return path
  if (!user) {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Check role requirements
  const hasRequiredRole = requiredRoles.length === 0 ||
    requiredRoles.includes(user.role as UserRole);

  // Check account type requirements
  const hasRequiredAccountType = requiredAccountTypes.length === 0 ||
    requiredAccountTypes.includes(user.account_type as AccountType);

  // Admin always has access (superuser privilege)
  const isAdmin = user.role === 'admin';

  // Access granted if:
  // - User is admin (superuser)
  // - User has required role AND account type
  const hasAccess = isAdmin || (hasRequiredRole && hasRequiredAccountType);

  // Not authorized - show AccessDenied or redirect
  if (!hasAccess) {
    if (showAccessDenied) {
      // Determine the required role for the AccessDenied message
      const requiredRole = requiredRoles.length > 0
        ? requiredRoles[0]
        : requiredAccountTypes.length > 0
          ? requiredAccountTypes[0] as 'employee' | 'owner'
          : undefined;

      return (
        <AccessDenied
          requiredRole={requiredRole as 'employee' | 'owner' | 'admin' | 'moderator'}
          showLoginButton={false}
        />
      );
    }

    // Redirect to home if AccessDenied is disabled
    return <Navigate to="/" replace />;
  }

  // Authorized - render children
  return <>{children}</>;
};

export default ProtectedRoute;
