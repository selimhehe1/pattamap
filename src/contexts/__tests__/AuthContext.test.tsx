/**
 * Tests for AuthContext
 * Covers: login, register, logout, auth state management, employee profile linking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock CSRFContext
vi.mock('../CSRFContext', () => ({
  CSRFProvider: ({ children }: { children: React.ReactNode }) => children,
  useCSRF: vi.fn(() => ({ csrfToken: 'mock-csrf-token' })),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock Sentry
vi.mock('../../config/sentry', () => ({
  setSentryUser: vi.fn(),
  clearSentryUser: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test wrapper that provides CSRFProvider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();

    // Default: no auth (profile returns 401)
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/auth/profile')) {
        return Promise.resolve({
          ok: false,
          status: 401,
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('AuthProvider', () => {
    it('should start with loading true', () => {
      // Make fetch hang to test initial state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBe(null);
      expect(result.current.token).toBe(null);
    });

    it('should check auth status on mount', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/profile'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });

    it('should set user when profile is found', async () => {
      const mockUser = {
        id: 'user-123',
        pseudonym: 'testuser',
        email: 'test@example.com',
        role: 'user',
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/auth/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: mockUser }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('authenticated');
    });

    it('should set user to null when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.token).toBe(null);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        pseudonym: 'testuser',
        email: 'test@example.com',
        role: 'user',
      };

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/auth/profile')) {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url.includes('/auth/login') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: mockUser }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('authenticated');
    });

    it('should throw error on invalid credentials', async () => {
      mockFetch.mockImplementation((url: string, _options?: RequestInit) => {
        if (url.includes('/auth/profile')) {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url.includes('/auth/login')) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ error: 'Invalid credentials' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('wronguser', 'wrongpassword');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.user).toBe(null);
    });

    it('should send login request with correct body', async () => {
      mockFetch.mockImplementation((url: string, _options?: RequestInit) => {
        if (url.includes('/auth/profile')) {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url.includes('/auth/login')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { id: '1' } }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.login('mylogin', 'mypassword');
      });

      const loginCall = mockFetch.mock.calls.find((call) =>
        call[0].includes('/auth/login')
      );
      expect(loginCall).toBeDefined();
      expect(JSON.parse(loginCall[1].body)).toEqual({
        login: 'mylogin',
        password: 'mypassword',
      });
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const mockUser = {
        id: 'new-user-123',
        pseudonym: 'newuser',
        email: 'new@example.com',
        role: 'user',
      };

      mockFetch.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/auth/profile')) {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url.includes('/auth/register') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: mockUser, csrfToken: 'new-csrf' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let returnedResult: { csrfToken?: string; passwordBreached?: boolean } | undefined;
      await act(async () => {
        returnedResult = await result.current.register(
          'newuser',
          'new@example.com',
          'SecurePassword123!'
        );
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('authenticated');
      expect(returnedResult?.csrfToken).toBe('new-csrf');
    });

    it('should register with account type', async () => {
      mockFetch.mockImplementation((url: string, _options?: RequestInit) => {
        if (url.includes('/auth/profile')) {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url.includes('/auth/register')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: { id: '1' } }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.register(
          'employee',
          'emp@example.com',
          'SecurePassword123!',
          'employee'
        );
      });

      const registerCall = mockFetch.mock.calls.find((call) =>
        call[0].includes('/auth/register')
      );
      expect(registerCall).toBeDefined();
      expect(JSON.parse(registerCall[1].body)).toEqual({
        pseudonym: 'employee',
        email: 'emp@example.com',
        password: 'SecurePassword123!',
        account_type: 'employee',
      });
    });

    it('should throw error on registration failure', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/auth/profile')) {
          return Promise.resolve({ ok: false, status: 401 });
        }
        if (url.includes('/auth/register')) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'Email already exists' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.register('user', 'exists@example.com', 'pass');
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockUser = {
        id: 'user-123',
        pseudonym: 'testuser',
        email: 'test@example.com',
        role: 'user',
      };

      mockFetch.mockImplementation((url: string, _options?: RequestInit) => {
        if (url.includes('/auth/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: mockUser }),
          });
        }
        if (url.includes('/auth/logout')) {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBe(null);
      expect(result.current.token).toBe(null);
    });

    it('should clear user even if logout API fails', async () => {
      const mockUser = {
        id: 'user-123',
        pseudonym: 'testuser',
        email: 'test@example.com',
        role: 'user',
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/auth/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: mockUser }),
          });
        }
        if (url.includes('/auth/logout')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.logout();
      });

      // Should still clear local state
      expect(result.current.user).toBe(null);
      expect(result.current.token).toBe(null);
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should return all required properties and functions', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Properties
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('token');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('linkedEmployeeProfile');

      // Functions
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.register).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.claimEmployeeProfile).toBe('function');
      expect(typeof result.current.refreshLinkedProfile).toBe('function');
    });
  });

  describe('Employee Profile Linking', () => {
    it('should fetch linked employee profile for employee accounts', async () => {
      const mockUser = {
        id: 'user-123',
        pseudonym: 'employee',
        email: 'emp@example.com',
        role: 'user',
        account_type: 'employee',
        linked_employee_id: 'emp-456',
      };

      const mockEmployeeProfile = {
        id: 'emp-456',
        name: 'John Doe',
        status: 'approved',
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/auth/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: mockUser }),
          });
        }
        if (url.includes('/employees/my-linked-profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEmployeeProfile),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.linkedEmployeeProfile).not.toBe(null);
      });

      expect(result.current.linkedEmployeeProfile?.id).toBe('emp-456');
    });

    it('should not fetch linked profile for regular accounts', async () => {
      const mockUser = {
        id: 'user-123',
        pseudonym: 'regular',
        email: 'reg@example.com',
        role: 'user',
        account_type: 'regular',
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/auth/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ user: mockUser }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Wait a bit to ensure no fetch for linked profile
      await new Promise((resolve) => setTimeout(resolve, 100));

      const linkedProfileCall = mockFetch.mock.calls.find((call) =>
        call[0].includes('/employees/my-linked-profile')
      );
      expect(linkedProfileCall).toBeUndefined();
    });
  });
});
