/** @vitest-environment jsdom */
/**
 * useSecureFetch Hook Tests
 *
 * Tests for the secure API request hook:
 * - Fetch with credentials: 'include' (1 test)
 * - GET requests: Content-Type yes, CSRF no (1 test)
 * - POST requests: includes CSRF token (1 test)
 * - Content-Type for JSON bodies (1 test)
 * - No Content-Type for FormData bodies (1 test)
 * - Returns response on success (1 test)
 * - isQueuedResponse detects X-Offline-Queued header (1 test)
 * - PUT request includes CSRF token (1 test)
 * - DELETE request includes CSRF token (1 test)
 *
 * Total: 9 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSecureFetch } from '../useSecureFetch';

// Mock dependencies
const mockLogout = vi.fn();
const mockGetCSRFHeaders = vi.fn(() => ({ 'X-CSRF-Token': 'test-token' }));
const mockRefreshToken = vi.fn().mockResolvedValue('new-token');

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    logout: mockLogout,
    user: { id: 'test-user' },
  })),
}));

vi.mock('../../contexts/CSRFContext', () => ({
  useCSRF: vi.fn(() => ({
    getCSRFHeaders: mockGetCSRFHeaders,
    refreshToken: mockRefreshToken,
    loading: false,
  })),
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../utils/offlineQueue', () => ({
  addToQueue: vi.fn(),
  isOfflineQueueSupported: vi.fn(() => false),
}));

describe('useSecureFetch', () => {
  let mockResponse: Response;

  beforeEach(() => {
    mockResponse = new Response(JSON.stringify({ data: 'test' }), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
    });

    vi.mocked(global.fetch).mockResolvedValue(mockResponse);
    mockGetCSRFHeaders.mockReturnValue({ 'X-CSRF-Token': 'test-token' });
  });

  it('secureFetch makes a fetch call with credentials: include', async () => {
    const { result } = renderHook(() => useSecureFetch());

    await act(async () => {
      await result.current.secureFetch('/api/test');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        credentials: 'include',
      })
    );
  });

  it('GET requests include Content-Type but no CSRF header', async () => {
    const { result } = renderHook(() => useSecureFetch());

    await act(async () => {
      await result.current.secureFetch('/api/data', { method: 'GET' });
    });

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const options = fetchCall[1] as RequestInit;
    const headers = options.headers as Record<string, string>;

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-CSRF-Token']).toBeUndefined();
  });

  it('POST requests include CSRF token header', async () => {
    const { result } = renderHook(() => useSecureFetch());

    await act(async () => {
      await result.current.secureFetch('/api/data', {
        method: 'POST',
        body: JSON.stringify({ name: 'test' }),
      });
    });

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const options = fetchCall[1] as RequestInit;
    const headers = options.headers as Record<string, string>;

    expect(headers['X-CSRF-Token']).toBe('test-token');
  });

  it('includes Content-Type: application/json for non-FormData bodies', async () => {
    const { result } = renderHook(() => useSecureFetch());

    await act(async () => {
      await result.current.secureFetch('/api/data', {
        method: 'POST',
        body: JSON.stringify({ key: 'value' }),
      });
    });

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const options = fetchCall[1] as RequestInit;
    const headers = options.headers as Record<string, string>;

    expect(headers['Content-Type']).toBe('application/json');
  });

  it('omits Content-Type header for FormData bodies', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['content']), 'test.txt');

    const { result } = renderHook(() => useSecureFetch());

    await act(async () => {
      await result.current.secureFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
    });

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const options = fetchCall[1] as RequestInit;
    const headers = options.headers as Record<string, string>;

    // Content-Type should NOT be set for FormData (browser sets it with boundary)
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('returns the response on successful fetch', async () => {
    const { result } = renderHook(() => useSecureFetch());

    let response: Response;
    await act(async () => {
      response = await result.current.secureFetch('/api/data');
    });

    expect(response!).toBe(mockResponse);
    expect(response!.status).toBe(200);
  });

  it('isQueuedResponse detects X-Offline-Queued header', () => {
    const { result } = renderHook(() => useSecureFetch());

    // Response with the queued header
    const queuedResponse = new Response('{}', {
      status: 202,
      headers: { 'X-Offline-Queued': 'true' },
    });

    expect(result.current.isQueuedResponse(queuedResponse)).toBe(true);

    // Normal response without the header
    const normalResponse = new Response('{}', { status: 200 });

    expect(result.current.isQueuedResponse(normalResponse)).toBe(false);
  });

  it('PUT requests include CSRF token header', async () => {
    const { result } = renderHook(() => useSecureFetch());

    await act(async () => {
      await result.current.secureFetch('/api/data/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'updated' }),
      });
    });

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const options = fetchCall[1] as RequestInit;
    const headers = options.headers as Record<string, string>;

    expect(headers['X-CSRF-Token']).toBe('test-token');
  });

  it('DELETE requests include CSRF token header', async () => {
    const { result } = renderHook(() => useSecureFetch());

    await act(async () => {
      await result.current.secureFetch('/api/data/1', {
        method: 'DELETE',
      });
    });

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const options = fetchCall[1] as RequestInit;
    const headers = options.headers as Record<string, string>;

    expect(headers['X-CSRF-Token']).toBe('test-token');
  });
});
