/**
 * AuthContext - Backward Compatibility Re-export
 *
 * This file maintains backward compatibility with existing imports.
 * The actual implementation has been split into focused contexts:
 *
 * - UserContext: User state and profile management
 * - SessionContext: Session polling and validity checks
 * - EmployeeContext: Employee-specific functionality
 * - OwnershipContext: Establishment ownership requests
 * - AuthCoreContext: Login, register, logout operations
 *
 * For new code, prefer importing from './auth' directly:
 * - import { useAuth } from './contexts/auth';
 * - import { useUser, useEmployee, etc. } from './contexts/auth';
 */

// Re-export everything from the new auth module
export {
  AuthProviders,
  AuthContext,
  useAuth,
  useUser,
  useSession,
  useEmployee,
  useOwnership,
  useAuthCore,
} from './auth';

// Re-export types
export type {
  UserContextType,
  SessionContextType,
  EmployeeContextType,
  OwnershipContextType,
  AuthCoreContextType,
} from './auth';

// Legacy alias for backward compatibility with existing App.tsx imports
export { AuthProviders as AuthProvider } from './auth';

// Default export for convenience
export { AuthProviders as default } from './auth';
