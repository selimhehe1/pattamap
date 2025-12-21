/**
 * @vitest-environment jsdom
 */
/**
 * useSecureFetch Hook Tests
 *
 * Tests for secure API fetch with CSRF and auth handling:
 * - Basic fetch functionality (4 tests)
 * - CSRF token handling (5 tests)
 * - Authentication handling (3 tests)
 * - FormData handling (2 tests)
 * - createSecureApiCall helper (4 tests)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSecureFetch, createSecureApiCall } from '../useSecureFetch';

// Mock AuthContext
const mockLogout = vi.fn();
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    logout: mockLogout
  })
}));

// Mock CSRFContext
const mockGetCSRFHeaders = vi.fn();
const mockRefreshToken = vi.fn();
let mockCsrfLoading = false;

vi.mock('../../contexts/CSRFContext', () => ({
  useCSRF: () => ({
    getCSRFHeaders: mockGetCSRFHeaders,
    refreshToken: mockRefreshToken,
    loading: mockCsrfLoading
  })
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSecureFetch Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockGetCSRFHeaders.mockReturnValue({ 'X-CSRF-Token': 'test-csrf-token' });
    mockRefreshToken.mockResolvedValue(undefined);
    mockCsrfLoading = false;
  });

  describe('Basic fetch functionality', () => {
    it('should make GET request without CSRF headers', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useSecureFetch());

      await act(async () => {
        await result.current.secureFetch('/api/test');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      // GET requests should not have CSRF token
      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['X-CSRF-Token']).toBeUndefined();
    });

    it('should make POST request with CSRF headers', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useSecureFetch());

      await act(async () => {
        await result.current.secureFetch('/api/test', {
          method: 'POST',
          body: JSON.stringify({ data: 'test' })
        });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'test-csrf-token'
          })
        })
      );
    });

    it('should make PUT request with CSRF headers', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useSecureFetch());

      await act(async () => {
        await result.current.secureFetch('/api/test/123', {
          method: 'PUT',
          body: JSON.stringify({ data: 'updated' })
        });
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['X-CSRF-Token']).toBe('test-csrf-token');
    });

    it('should make DELETE request with CSRF headers', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useSecureFetch());

      await act(async () => {
        await result.current.secureFetch('/api/test/123', { method: 'DELETE' });
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['X-CSRF-Token']).toBe('test-csrf-token');
    });
  });

  describe('CSRF token handling', () => {
    it('should refresh token for critical operations (establishments POST)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useSecureFetch());

      await act(async () => {
        await result.current.secureFetch('/api/establishments', {
          method: 'POST',
          body: JSON.stringify({ name: 'New Place' })
        });
      });

      expect(mockRefreshToken).toHaveBeenCalled();
    });

    it('should refresh token for critical operations (establishments PUT)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useSecureFetch());

      await act(async () => {
        await result.current.secureFetch('/api/establishments/123', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated' })
        });
      });

      expect(mockRefreshToken).toHaveBeenCalled();
    });

    it('should skip CSRF for establishment-logo endpoint', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useSecureFetch());

      await act(async () => {
        await result.current.secureFetch('/api/establishment-logo', {
          method: 'POST',
          body: new FormData()
        });
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['X-CSRF-Token']).toBeUndefined();
    });

    it('should retry on 403 CSRF error and refresh token', async () => {
      // First call returns 403 CSRF error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        clone: () => ({
          json: () => Promise.resolve({ error: 'CSRF token mismatch' })
        })
      });
      // Retry succeeds
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useSecureFetch());

      await act(async () => {
        await result.current.secureFetch('/api/test', { method: 'POST' });
      });

      expect(mockRefreshToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should refresh token when getCSRFHeaders returns empty', async () => {
      mockGetCSRFHeaders.mockReturnValue({});
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const { result } = renderHook(() => useSecureFetch());

      await act(async () => {
        await result.current.secureFetch('/api/test', { method: 'POST' });
      });

      expect(mockRefreshToken).toHaveBeenCalled();
    });
  });

  describe('Authentication handling', () => {
    it('should logout on 401 when requireAuth is true (default)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const { result } = renderHook(() => useSecureFetch());

      await act(async () => {
        try {
          await result.current.secureFetch('/api/protected');
        } catch (e) {
          // Expected
        }
      });

      expect(mockLogout).toHaveBeenCalled();
    });

    it('should not logout on 401 when requireAuth is false', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const { result } = renderHook(() => useSecureFetch());

      await act(async () => {
        await result.current.secureFetch('/api/public', { requireAuth: false });
      });

      expect(mockLogout).not.toHaveBeenCalled();
    });

    it('should throw error on 401 with requireAuth', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const { result } = renderHook(() => useSecureFetch());

      await expect(
        act(async () => {
          await result.current.secureFetch('/api/protected');
        })
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('FormData handling', () => {
    it('should not set Content-Type for FormData requests', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const formData = new FormData();
      formData.append('file', new Blob(['test']), 'test.txt');

      const { result } = renderHook(() => useSecureFetch());

      await act(async () => {
        await result.current.secureFetch('/api/upload', {
          method: 'POST',
          body: formData
        });
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['Content-Type']).toBeUndefined();
    });

    it('should include CSRF token for FormData POST (except establishment-logo)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const formData = new FormData();

      const { result } = renderHook(() => useSecureFetch());

      await act(async () => {
        await result.current.secureFetch('/api/upload', {
          method: 'POST',
          body: formData
        });
      });

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['X-CSRF-Token']).toBe('test-csrf-token');
    });
  });

  describe('createSecureApiCall helper', () => {
    it('should create get method', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const api = createSecureApiCall('http://localhost:3000');

      await api.get('/users');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      );
    });

    it('should create post method with body', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const api = createSecureApiCall('http://localhost:3000');

      await api.post('/users', { name: 'John' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ name: 'John' })
        })
      );
    });

    it('should create put method with body', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const api = createSecureApiCall('http://localhost:3000');

      await api.put('/users/123', { name: 'Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users/123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated' })
        })
      );
    });

    it('should create delete method', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      const api = createSecureApiCall('http://localhost:3000');

      await api.delete('/users/123');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/users/123',
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include'
        })
      );
    });
  });
});
