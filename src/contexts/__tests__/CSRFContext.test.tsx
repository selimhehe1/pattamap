/**
 * Tests for CSRFContext
 * Covers: CSRF token fetching, getCSRFHeaders, refreshToken, error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { CSRFProvider, useCSRF } from '../CSRFContext';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:3001',
    },
  },
});

describe('CSRFContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the fetching flag
    document.body.dataset.csrfFetching = 'false';
    // Reset fetch mock
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('CSRFProvider', () => {
    it('should start with loading true', async () => {
      // Mock a slow response
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useCSRF(), {
        wrapper: CSRFProvider,
      });

      // Initially loading
      expect(result.current.loading).toBe(true);
    });

    it('should fetch CSRF token on mount', async () => {
      const mockToken = 'test-csrf-token-123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken }),
      });

      const { result } = renderHook(() => useCSRF(), {
        wrapper: CSRFProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.csrfToken).toBe(mockToken);
      expect(result.current.error).toBe('');
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useCSRF(), {
        wrapper: CSRFProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.csrfToken).toBe('');
      expect(result.current.error).toContain('Failed to fetch CSRF token');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useCSRF(), {
        wrapper: CSRFProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.csrfToken).toBe('');
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('getCSRFHeaders', () => {
    it('should return headers with CSRF token when token is available', async () => {
      const mockToken = 'test-csrf-token-123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: mockToken }),
      });

      const { result } = renderHook(() => useCSRF(), {
        wrapper: CSRFProvider,
      });

      await waitFor(() => {
        expect(result.current.csrfToken).toBe(mockToken);
      });

      const headers = result.current.getCSRFHeaders();
      expect(headers['X-CSRF-Token']).toBe(mockToken);
    });

    it('should return empty headers when token is not available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useCSRF(), {
        wrapper: CSRFProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const headers = result.current.getCSRFHeaders();
      expect(headers).toEqual({});
    });
  });

  describe('refreshToken', () => {
    it('should refresh token and return new token', async () => {
      const initialToken = 'initial-token';
      const refreshedToken = 'refreshed-token';

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: initialToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: refreshedToken }),
        });

      const { result } = renderHook(() => useCSRF(), {
        wrapper: CSRFProvider,
      });

      await waitFor(() => {
        expect(result.current.csrfToken).toBe(initialToken);
      });

      let newToken: string | null = null;
      await act(async () => {
        newToken = await result.current.refreshToken();
      });

      expect(newToken).toBe(refreshedToken);
      expect(result.current.csrfToken).toBe(refreshedToken);
    });

    it('should return current token if refresh fails', async () => {
      const initialToken = 'initial-token';

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ csrfToken: initialToken }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      const { result } = renderHook(() => useCSRF(), {
        wrapper: CSRFProvider,
      });

      await waitFor(() => {
        expect(result.current.csrfToken).toBe(initialToken);
      });

      let token: string | null = null;
      await act(async () => {
        token = await result.current.refreshToken();
      });

      // Should return current token on failure
      expect(token).toBe(initialToken);
    });
  });

  describe('useCSRF hook', () => {
    it('should throw error when used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useCSRF());
      }).toThrow('useCSRF must be used within a CSRFProvider');

      consoleSpy.mockRestore();
    });

    it('should return all required properties', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ csrfToken: 'test-token' }),
      });

      const { result } = renderHook(() => useCSRF(), {
        wrapper: CSRFProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty('csrfToken');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('getCSRFHeaders');
      expect(result.current).toHaveProperty('refreshToken');
      expect(typeof result.current.getCSRFHeaders).toBe('function');
      expect(typeof result.current.refreshToken).toBe('function');
    });
  });

  describe('Abort handling', () => {
    it('should handle AbortError gracefully', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const { result } = renderHook(() => useCSRF(), {
        wrapper: CSRFProvider,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not set error for AbortError
      expect(result.current.error).toBe('');
    });
  });
});
