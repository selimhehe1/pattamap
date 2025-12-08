/**
 * Test Utilities & Helpers for Frontend Tests
 *
 * Provides wrapper components with all necessary providers (Auth, Modal, Router, etc.)
 * and utility functions for testing React components.
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../contexts/AuthContext';
import { ModalProvider } from '../contexts/ModalContext';
import { MapControlsProvider } from '../contexts/MapControlsContext';
import { CSRFProvider } from '../contexts/CSRFContext';

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

/**
 * All Providers Wrapper
 *
 * Wraps components with all necessary context providers for testing.
 * Use this for components that need multiple contexts.
 */
interface AllProvidersProps {
  children: React.ReactNode;
  initialAuth?: {
    isAuthenticated: boolean;
    user: any;
    token: string | null;
  };
}

export function AllProviders({ children, initialAuth }: AllProvidersProps) {
  const queryClient = createTestQueryClient();

  // Default auth context value for tests
  const defaultAuthValue = {
    isAuthenticated: true,
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      username: 'testuser',
      role: 'user',
    },
    token: 'test-token',
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    updateUser: jest.fn(),
    refreshAuth: jest.fn(),
  };

  const authValue = initialAuth ? { ...defaultAuthValue, ...initialAuth } : defaultAuthValue;

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <CSRFProvider>
          <AuthContext.Provider value={authValue as any}>
            <ModalProvider>
              <MapControlsProvider>
                {children}
              </MapControlsProvider>
            </ModalProvider>
          </AuthContext.Provider>
        </CSRFProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Custom render function with all providers
 *
 * Usage:
 * ```typescript
 * renderWithProviders(<MyComponent />);
 * ```
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialAuth?: {
    isAuthenticated: boolean;
    user: any;
    token: string | null;
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { initialAuth, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders initialAuth={initialAuth}>
        {children}
      </AllProviders>
    ),
    ...renderOptions,
  });
}

/**
 * Mock implementations for common hooks
 */
export const mockHooks = {
  // Mock useAuth hook
  useAuth: (overrides = {}) => ({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    updateUser: jest.fn(),
    refreshAuth: jest.fn(),
    ...overrides,
  }),

  // Mock useModal hook
  useModal: (overrides = {}) => ({
    openModal: jest.fn(),
    closeModal: jest.fn(),
    isModalOpen: false,
    modalContent: null,
    ...overrides,
  }),

  // Mock useMapControls hook
  useMapControls: (overrides = {}) => ({
    viewMode: 'map' as const,
    setViewMode: jest.fn(),
    selectedZone: null,
    setSelectedZone: jest.fn(),
    ...overrides,
  }),
};

/**
 * Mock data factories
 */
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user',
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

/**
 * Wait utilities
 */
export const waitForLoadingToFinish = () =>
  new Promise(resolve => setTimeout(resolve, 100));

/**
 * Mock fetch responses
 */
export const mockFetchResponse = (data: any, ok = true) => {
  global.fetch = jest.fn(() =>
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
  global.fetch = jest.fn(() => Promise.reject(new Error(message)));
};

/**
 * Re-export everything from @testing-library/react
 * so tests only need one import
 */
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
