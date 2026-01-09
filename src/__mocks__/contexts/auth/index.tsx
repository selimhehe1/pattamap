/**
 * Mock for contexts/auth module
 * Provides mocked authentication hooks for testing
 */
import React, { createContext } from 'react';
import { vi } from 'vitest';

// Default mock user
const mockUser = {
  id: 'test-user-id',
  pseudonym: 'testuser',
  email: 'test@example.com',
  role: 'user' as const,
  is_active: true,
};

// Export AuthContext for testing purposes
export const AuthContext = createContext<any>(undefined);

// Individual context hooks
export const useUser = vi.fn(() => ({
  user: mockUser,
  loading: false,
  token: 'test-token',
  setUser: vi.fn(),
  setToken: vi.fn(),
  refreshUser: vi.fn().mockResolvedValue(undefined),
  checkAuthStatus: vi.fn().mockResolvedValue(undefined),
}));

export const useSession = vi.fn(() => ({
  isCheckingSession: false,
}));

export const useEmployee = vi.fn(() => ({
  linkedEmployeeProfile: null,
  refreshLinkedProfile: vi.fn().mockResolvedValue(undefined),
  claimEmployeeProfile: vi.fn().mockResolvedValue(undefined),
}));

export const useOwnership = vi.fn(() => ({
  submitOwnershipRequest: vi.fn().mockResolvedValue(undefined),
}));

export const useAuthCore = vi.fn(() => ({
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue({ csrfToken: 'test-csrf', passwordBreached: false }),
  logout: vi.fn(),
}));

// Composite useAuth hook (matches real implementation)
export const useAuth = vi.fn(() => ({
  user: mockUser,
  token: 'test-token',
  loading: false,
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue({ csrfToken: 'test-csrf', passwordBreached: false }),
  logout: vi.fn(),
  linkedEmployeeProfile: null,
  refreshLinkedProfile: vi.fn().mockResolvedValue(undefined),
  claimEmployeeProfile: vi.fn().mockResolvedValue(undefined),
  submitOwnershipRequest: vi.fn().mockResolvedValue(undefined),
}));

// AuthProviders component mock
export const AuthProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Re-export types (empty for mock)
export type UserContextType = any;
export type SessionContextType = any;
export type EmployeeContextType = any;
export type OwnershipContextType = any;
export type AuthCoreContextType = any;

export default AuthProviders;
