/**
 * Global mock for react-router-dom
 *
 * This mock provides all necessary exports including UNSAFE_NavigationContext
 * which is required by useNavigateWithTransition.ts
 */
import React, { createContext } from 'react';
import { vi } from 'vitest';

const mockNavigate = vi.fn();

// Create a mock navigation context that matches react-router-dom's interface
const mockNavigator = {
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  createHref: vi.fn(() => ''),
};

// Mock UNSAFE_NavigationContext to match react-router-dom's internal structure
export const UNSAFE_NavigationContext = createContext({
  navigator: mockNavigator,
  basename: '',
  static: false,
});

export const useNavigate = () => mockNavigate;
export const BrowserRouter = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const MemoryRouter = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const Link = ({ children, to, ...props }: { children: React.ReactNode; to: string; [key: string]: any }) => (
  <a href={to} {...props}>{children}</a>
);
export const NavLink = Link;
export const Route = () => null;
export const Routes = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const Navigate = () => null;
export const Outlet = () => null;
export const useLocation = () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' });
export const useParams = () => ({});
export const useSearchParams = () => [new URLSearchParams(), vi.fn()] as const;
export const useMatch = () => null;
export const useRoutes = () => null;
export const matchPath = vi.fn();
export const generatePath = vi.fn((path: string) => path);
export const resolvePath = vi.fn();

// Reset mock between tests
export const __resetMockNavigate = () => {
  mockNavigate.mockReset();
  mockNavigator.push.mockReset();
  mockNavigator.replace.mockReset();
  mockNavigator.go.mockReset();
};

// Export the mock navigate for assertions in tests
export const __mockNavigate = mockNavigate;
export const __mockNavigator = mockNavigator;
