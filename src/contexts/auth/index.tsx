/**
 * Auth Module - Split Architecture
 *
 * This module provides authentication functionality split into focused contexts:
 * - SupabaseAuthContext: Supabase Auth integration (OAuth, email confirmation, etc.)
 * - UserContext: User state and profile management
 * - SessionContext: Session polling and validity checks
 * - EmployeeContext: Employee-specific functionality
 * - OwnershipContext: Establishment ownership requests
 * - AuthCoreContext: Login, register, logout operations
 *
 * For backward compatibility, useAuth() combines all contexts into a single interface.
 */

import React, { createContext, ReactNode, useCallback } from 'react';
import { SupabaseAuthProvider, useSupabaseAuth } from './SupabaseAuthContext';
import { UserProvider, useUser } from './UserContext';
import { SessionProvider, useSession } from './SessionContext';
import { EmployeeProvider, useEmployee } from './EmployeeContext';
import { OwnershipProvider, useOwnership } from './OwnershipContext';
import { AuthCoreProvider, useAuthCore } from './AuthCoreContext';
import { AuthContextType, User } from '../../types';

// Export AuthContext for testing purposes (allows direct Provider usage in tests)
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Re-export individual hooks for direct usage
export { useSupabaseAuth } from './SupabaseAuthContext';
export { useUser } from './UserContext';
export { useSession } from './SessionContext';
export { useEmployee } from './EmployeeContext';
export { useOwnership } from './OwnershipContext';
export { useAuthCore } from './AuthCoreContext';

// Re-export types
export type { SupabaseAuthContextType } from './SupabaseAuthContext';
export type { UserContextType } from './UserContext';
export type { SessionContextType } from './SessionContext';
export type { EmployeeContextType } from './EmployeeContext';
export type { OwnershipContextType } from './OwnershipContext';
export type { AuthCoreContextType } from './AuthCoreContext';

interface AuthProvidersProps {
  children: ReactNode;
}

/**
 * Inner providers that depend on UserContext
 * Separated to allow SupabaseAuthProvider to access setUser
 */
const InnerProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { setUser } = useUser();

  // Callback to sync Supabase user with our UserContext
  const handleUserSync = useCallback((user: User | null) => {
    setUser(user);
  }, [setUser]);

  return (
    <SupabaseAuthProvider onUserSync={handleUserSync}>
      <SessionProvider>
        <EmployeeProvider>
          <OwnershipProvider>
            <AuthCoreProvider>
              {children}
            </AuthCoreProvider>
          </OwnershipProvider>
        </EmployeeProvider>
      </SessionProvider>
    </SupabaseAuthProvider>
  );
};

/**
 * Combined AuthProviders - wraps all auth-related providers
 * Order matters: UserProvider must be outermost as others depend on it
 * SupabaseAuthProvider syncs with UserContext for seamless integration
 */
export const AuthProviders: React.FC<AuthProvidersProps> = ({ children }) => {
  return (
    <UserProvider>
      <InnerProviders>
        {children}
      </InnerProviders>
    </UserProvider>
  );
};

/**
 * Composite useAuth hook - provides backward compatibility
 * Combines all auth contexts into a single interface matching the original AuthContextType
 */
export const useAuth = (): AuthContextType => {
  const { user, loading, token } = useUser();
  const { linkedEmployeeProfile, refreshLinkedProfile, claimEmployeeProfile } = useEmployee();
  const { submitOwnershipRequest } = useOwnership();
  const { login, register, logout } = useAuthCore();

  // Consume session context to ensure it's initialized (side effects)
  useSession();

  return {
    user,
    token,
    loading,
    login,
    register,
    logout,
    linkedEmployeeProfile,
    refreshLinkedProfile,
    claimEmployeeProfile,
    submitOwnershipRequest,
  };
};

// Default export for convenience
export default AuthProviders;
