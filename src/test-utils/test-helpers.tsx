/**
 * Test Utilities & Helpers for Frontend Tests
 *
 * Provides wrapper components with all necessary providers (Auth, Modal, Router, etc.)
 * and utility functions for testing React components.
 */

import React, { ReactElement, createContext, useContext } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModalProvider } from '../contexts/ModalContext';

/**
 * Create a test query client with disabled retries
 * for faster test execution
 */
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0, // React Query v5: cacheTime renamed to gcTime
    },
    mutations: {
      retry: false,
    },
  },
});

// ============================================
// MOCK CONTEXT TYPES
// ============================================

interface MockUserContextType {
  user: any;
  loading: boolean;
  token: string | null;
  setUser: ReturnType<typeof vi.fn>;
  setToken: ReturnType<typeof vi.fn>;
  refreshUser: ReturnType<typeof vi.fn>;
  checkAuthStatus: ReturnType<typeof vi.fn>;
}

interface MockSessionContextType {
  isCheckingSession: boolean;
}

interface MockEmployeeContextType {
  linkedEmployeeProfile: any;
  refreshLinkedProfile: ReturnType<typeof vi.fn>;
  claimEmployeeProfile: ReturnType<typeof vi.fn>;
}

interface MockOwnershipContextType {
  submitOwnershipRequest: ReturnType<typeof vi.fn>;
}

interface MockAuthCoreContextType {
  login: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
}

interface MockCSRFContextType {
  csrfToken: string | null;
  refreshToken: ReturnType<typeof vi.fn>;
  setToken: ReturnType<typeof vi.fn>;
}

// ============================================
// MOCK CONTEXTS
// ============================================

const MockUserContext = createContext<MockUserContextType | undefined>(undefined);
const MockSessionContext = createContext<MockSessionContextType | undefined>(undefined);
const MockEmployeeContext = createContext<MockEmployeeContextType | undefined>(undefined);
const MockOwnershipContext = createContext<MockOwnershipContextType | undefined>(undefined);
const MockAuthCoreContext = createContext<MockAuthCoreContextType | undefined>(undefined);
const MockCSRFContext = createContext<MockCSRFContextType | undefined>(undefined);

// ============================================
// MOCK HOOKS (matching real hook signatures)
// ============================================

export const useUser = () => {
  const context = useContext(MockUserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const useSession = () => {
  const context = useContext(MockSessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export const useEmployee = () => {
  const context = useContext(MockEmployeeContext);
  if (!context) {
    throw new Error('useEmployee must be used within an EmployeeProvider');
  }
  return context;
};

export const useOwnership = () => {
  const context = useContext(MockOwnershipContext);
  if (!context) {
    throw new Error('useOwnership must be used within an OwnershipProvider');
  }
  return context;
};

export const useAuthCore = () => {
  const context = useContext(MockAuthCoreContext);
  if (!context) {
    throw new Error('useAuthCore must be used within an AuthCoreProvider');
  }
  return context;
};

export const useCSRF = () => {
  const context = useContext(MockCSRFContext);
  if (!context) {
    throw new Error('useCSRF must be used within a CSRFProvider');
  }
  return context;
};

// Composite useAuth hook (matching real implementation)
export const useAuth = () => {
  const { user, loading, token } = useUser();
  const { linkedEmployeeProfile, refreshLinkedProfile, claimEmployeeProfile } = useEmployee();
  const { submitOwnershipRequest } = useOwnership();
  const { login, register, logout } = useAuthCore();

  // Consume session context to match real implementation
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

// ============================================
// DEFAULT MOCK VALUES
// ============================================

const createDefaultUserContext = (overrides: Partial<MockUserContextType> = {}): MockUserContextType => ({
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    pseudonym: 'testuser',
    role: 'user',
    is_active: true,
  },
  loading: false,
  token: 'test-token',
  setUser: vi.fn(),
  setToken: vi.fn(),
  refreshUser: vi.fn().mockResolvedValue(undefined),
  checkAuthStatus: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createDefaultSessionContext = (overrides: Partial<MockSessionContextType> = {}): MockSessionContextType => ({
  isCheckingSession: false,
  ...overrides,
});

const createDefaultEmployeeContext = (overrides: Partial<MockEmployeeContextType> = {}): MockEmployeeContextType => ({
  linkedEmployeeProfile: null,
  refreshLinkedProfile: vi.fn().mockResolvedValue(undefined),
  claimEmployeeProfile: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createDefaultOwnershipContext = (overrides: Partial<MockOwnershipContextType> = {}): MockOwnershipContextType => ({
  submitOwnershipRequest: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createDefaultAuthCoreContext = (overrides: Partial<MockAuthCoreContextType> = {}): MockAuthCoreContextType => ({
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn().mockResolvedValue({ csrfToken: 'test-csrf', passwordBreached: false }),
  logout: vi.fn(),
  ...overrides,
});

const createDefaultCSRFContext = (overrides: Partial<MockCSRFContextType> = {}): MockCSRFContextType => ({
  csrfToken: 'test-csrf-token',
  refreshToken: vi.fn().mockResolvedValue('test-csrf-token'),
  setToken: vi.fn(),
  ...overrides,
});

// ============================================
// ALL PROVIDERS WRAPPER
// ============================================

interface AllProvidersProps {
  children: React.ReactNode;
  initialAuth?: {
    isAuthenticated?: boolean;
    user?: any;
    token?: string | null;
    loading?: boolean;
  };
  mockOverrides?: {
    user?: Partial<MockUserContextType>;
    session?: Partial<MockSessionContextType>;
    employee?: Partial<MockEmployeeContextType>;
    ownership?: Partial<MockOwnershipContextType>;
    authCore?: Partial<MockAuthCoreContextType>;
    csrf?: Partial<MockCSRFContextType>;
  };
}

export function AllProviders({ children, initialAuth, mockOverrides = {} }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  // Build user context from initialAuth for backward compatibility
  const userOverrides: Partial<MockUserContextType> = {};
  if (initialAuth) {
    if (initialAuth.user !== undefined) userOverrides.user = initialAuth.user;
    if (initialAuth.token !== undefined) userOverrides.token = initialAuth.token;
    if (initialAuth.loading !== undefined) userOverrides.loading = initialAuth.loading;
    if (initialAuth.isAuthenticated === false) {
      userOverrides.user = null;
      userOverrides.token = null;
    }
  }

  const userContext = createDefaultUserContext({ ...userOverrides, ...mockOverrides.user });
  const sessionContext = createDefaultSessionContext(mockOverrides.session);
  const employeeContext = createDefaultEmployeeContext(mockOverrides.employee);
  const ownershipContext = createDefaultOwnershipContext(mockOverrides.ownership);
  const authCoreContext = createDefaultAuthCoreContext(mockOverrides.authCore);
  const csrfContext = createDefaultCSRFContext(mockOverrides.csrf);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MockCSRFContext.Provider value={csrfContext}>
          <MockUserContext.Provider value={userContext}>
            <MockSessionContext.Provider value={sessionContext}>
              <MockEmployeeContext.Provider value={employeeContext}>
                <MockOwnershipContext.Provider value={ownershipContext}>
                  <MockAuthCoreContext.Provider value={authCoreContext}>
                    <ModalProvider>
                      {children}
                    </ModalProvider>
                  </MockAuthCoreContext.Provider>
                </MockOwnershipContext.Provider>
              </MockEmployeeContext.Provider>
            </MockSessionContext.Provider>
          </MockUserContext.Provider>
        </MockCSRFContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// ============================================
// CUSTOM RENDER FUNCTION
// ============================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialAuth?: {
    isAuthenticated?: boolean;
    user?: any;
    token?: string | null;
    loading?: boolean;
  };
  mockOverrides?: AllProvidersProps['mockOverrides'];
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { initialAuth, mockOverrides, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialAuth={initialAuth} mockOverrides={mockOverrides}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
}

// ============================================
// MOCK IMPLEMENTATIONS FOR COMMON HOOKS
// ============================================

export const mockHooks = {
  // Mock useAuth hook
  useAuth: (overrides = {}) => ({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    linkedEmployeeProfile: null,
    refreshLinkedProfile: vi.fn(),
    claimEmployeeProfile: vi.fn(),
    submitOwnershipRequest: vi.fn(),
    ...overrides,
  }),

  // Mock useModal hook
  useModal: (overrides = {}) => ({
    openModal: vi.fn(),
    closeModal: vi.fn(),
    isModalOpen: false,
    modalContent: null,
    ...overrides,
  }),
};

// ============================================
// MOCK DATA FACTORIES
// ============================================

export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  pseudonym: 'testuser',
  role: 'user',
  is_active: true,
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockEstablishment = (overrides = {}) => ({
  id: 'est-123',
  name: 'Test Establishment',
  name_en: 'Test Establishment',
  slug: 'test-establishment',
  zone: 'walking-street',
  category: 'bar',
  google_maps_url: 'https://maps.google.com/test',
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockEmployee = (overrides = {}) => ({
  id: 'emp-123',
  name: 'Test Employee',
  nickname: 'Testy',
  establishment_id: 'est-123',
  age: 25,
  nationality: 'Thai',
  languages_spoken: ['Thai', 'English'],
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockVIPTransaction = (overrides = {}) => ({
  id: 'tx-123',
  subscription_type: 'employee' as const,
  subscription_id: 'sub-123',
  user_id: 'user-123',
  amount: 3600,
  currency: 'THB',
  payment_method: 'cash' as const,
  payment_status: 'pending' as const,
  created_at: new Date().toISOString(),
  ...overrides,
});

// ============================================
// WAIT UTILITIES
// ============================================

export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 100));

// ============================================
// MOCK FETCH RESPONSES
// ============================================

export const mockFetchResponse = (data: any, ok = true) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      json: async () => data,
      text: async () => JSON.stringify(data),
      status: ok ? 200 : 400,
      statusText: ok ? 'OK' : 'Bad Request',
    } as Response)
  );
};

export const mockFetchError = (message = 'Network error') => {
  global.fetch = vi.fn(() => Promise.reject(new Error(message)));
};

// ============================================
// RE-EXPORTS
// ============================================

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
