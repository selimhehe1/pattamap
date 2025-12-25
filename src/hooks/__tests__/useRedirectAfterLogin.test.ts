/**
 * @vitest-environment jsdom
 */
/**
 * useRedirectAfterLogin Hook Tests
 *
 * Tests for post-login redirect logic:
 * - getDefaultRedirect (4 tests)
 * - getIntendedDestination (2 tests)
 * - redirectAfterLogin (2 tests)
 * - hasIntendedDestination (2 tests)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRedirectAfterLogin, useAutoRedirectIfAuthenticated } from '../useRedirectAfterLogin';

// Mock navigate function with the same interface as useNavigateWithTransition
const mockNavigate = vi.fn() as ReturnType<typeof vi.fn> & {
  back: ReturnType<typeof vi.fn>;
  forward: ReturnType<typeof vi.fn>;
  go: ReturnType<typeof vi.fn>;
};
mockNavigate.back = vi.fn();
mockNavigate.forward = vi.fn();
mockNavigate.go = vi.fn();

const mockLocation = { state: null as { from?: string } | null, pathname: '/', search: '', hash: '', key: 'default' };

// Mock useNavigateWithTransition
vi.mock('../useNavigateWithTransition', () => ({
  useNavigateWithTransition: () => mockNavigate,
}));

// Mock react-router-dom's useLocation
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useLocation: () => mockLocation,
  };
});

// Variable to hold mock user
let mockUser: { role?: string; account_type?: string } | null = null;
let mockLoading = false;

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: mockLoading,
  }),
}));

describe('useRedirectAfterLogin Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockLoading = false;
    mockLocation.state = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDefaultRedirect', () => {
    it('should return "/" when no user', () => {
      mockUser = null;

      const { result } = renderHook(() => useRedirectAfterLogin());

      expect(result.current.getDefaultRedirect()).toBe('/');
    });

    it('should return "/admin" for admin users', () => {
      mockUser = { role: 'admin' };

      const { result } = renderHook(() => useRedirectAfterLogin());

      expect(result.current.getDefaultRedirect()).toBe('/admin');
    });

    it('should return "/my-establishments" for establishment owners', () => {
      mockUser = { account_type: 'establishment_owner' };

      const { result } = renderHook(() => useRedirectAfterLogin());

      expect(result.current.getDefaultRedirect()).toBe('/my-establishments');
    });

    it('should return "/employee/dashboard" for employees', () => {
      mockUser = { account_type: 'employee' };

      const { result } = renderHook(() => useRedirectAfterLogin());

      expect(result.current.getDefaultRedirect()).toBe('/employee/dashboard');
    });

    it('should return "/dashboard" for regular users', () => {
      mockUser = { account_type: 'user' };

      const { result } = renderHook(() => useRedirectAfterLogin());

      expect(result.current.getDefaultRedirect()).toBe('/dashboard');
    });
  });

  describe('getIntendedDestination', () => {
    it('should return null when no state', () => {
      mockLocation.state = null;

      const { result } = renderHook(() => useRedirectAfterLogin());

      expect(result.current.getIntendedDestination()).toBeNull();
    });

    it('should return from path from state', () => {
      mockLocation.state = { from: '/protected-page' };

      const { result } = renderHook(() => useRedirectAfterLogin());

      expect(result.current.getIntendedDestination()).toBe('/protected-page');
    });
  });

  describe('hasIntendedDestination', () => {
    it('should return false when no intended destination', () => {
      mockLocation.state = null;

      const { result } = renderHook(() => useRedirectAfterLogin());

      expect(result.current.hasIntendedDestination).toBe(false);
    });

    it('should return true when intended destination exists', () => {
      mockLocation.state = { from: '/some-page' };

      const { result } = renderHook(() => useRedirectAfterLogin());

      expect(result.current.hasIntendedDestination).toBe(true);
    });
  });

  describe('redirectAfterLogin', () => {
    it('should navigate to intended destination when available', () => {
      mockUser = { role: 'user' };
      mockLocation.state = { from: '/intended-page' };

      const { result } = renderHook(() => useRedirectAfterLogin());

      act(() => {
        result.current.redirectAfterLogin();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/intended-page', { replace: true });
    });

    it('should navigate to default redirect when no intended destination', () => {
      mockUser = { role: 'admin' };
      mockLocation.state = null;

      const { result } = renderHook(() => useRedirectAfterLogin());

      act(() => {
        result.current.redirectAfterLogin();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });
});

describe('useAutoRedirectIfAuthenticated Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockLoading = false;
    mockLocation.state = null;
  });

  it('should not redirect when loading', () => {
    mockLoading = true;
    mockUser = { role: 'user' };

    renderHook(() => useAutoRedirectIfAuthenticated());

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should not redirect when no user', () => {
    mockLoading = false;
    mockUser = null;

    renderHook(() => useAutoRedirectIfAuthenticated());

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should redirect when user is authenticated', () => {
    mockLoading = false;
    mockUser = { role: 'user' };

    renderHook(() => useAutoRedirectIfAuthenticated());

    expect(mockNavigate).toHaveBeenCalled();
  });
});
