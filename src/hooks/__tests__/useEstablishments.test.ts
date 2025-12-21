/**
 * @vitest-environment jsdom
 */
/**
 * useEstablishments Hook Tests
 *
 * Tests for React Query establishment hooks:
 * - establishmentKeys factory (3 tests)
 * - useEstablishments hook (3 tests)
 * - useEstablishment hook (3 tests)
 * - useCreateEstablishment mutation (3 tests)
 * - useUpdateEstablishment mutation (3 tests)
 * - useDeleteEstablishment mutation (3 tests)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useEstablishments,
  useEstablishment,
  useCreateEstablishment,
  useUpdateEstablishment,
  useDeleteEstablishment,
  establishmentKeys
} from '../useEstablishments';

// Mock useSecureFetch
vi.mock('../useSecureFetch', () => ({
  useSecureFetch: () => ({
    secureFetch: (url: string, options?: RequestInit) => global.fetch(url, options)
  })
}));

// Mock toast
vi.mock('../../utils/toast', () => ({
  default: { success: vi.fn(), error: vi.fn() }
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Sample establishment data
const mockEstablishment = {
  id: 'est-1',
  name: 'Test Establishment',
  zone: 'walking-street',
  category_id: 1,
  status: 'active'
};

// Create wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false }
    }
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useEstablishments Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('establishmentKeys', () => {
    it('should generate correct base keys', () => {
      expect(establishmentKeys.all).toEqual(['establishments']);
      expect(establishmentKeys.lists()).toEqual(['establishments', 'list']);
      expect(establishmentKeys.details()).toEqual(['establishments', 'detail']);
    });

    it('should generate detail key with id', () => {
      expect(establishmentKeys.detail('est-123')).toEqual(['establishments', 'detail', 'est-123']);
    });

    it('should generate list key with filters', () => {
      const filters = { zone: 'walking-street', status: 'active' };
      expect(establishmentKeys.list(filters)).toEqual(['establishments', 'list', { filters }]);
      expect(establishmentKeys.list()).toEqual(['establishments', 'list', { filters: undefined }]);
    });
  });

  describe('useEstablishments', () => {
    it('should fetch all establishments successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ establishments: [mockEstablishment] })
      });

      const { result } = renderHook(() => useEstablishments(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].name).toBe('Test Establishment');
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const { result } = renderHook(() => useEstablishments(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Failed to fetch establishments');
    });

    it('should be in loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useEstablishments(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useEstablishment', () => {
    it('should fetch single establishment by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ establishment: mockEstablishment })
      });

      const { result } = renderHook(() => useEstablishment('est-1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe('Test Establishment');
    });

    it('should not fetch when id is null', () => {
      const { result } = renderHook(() => useEstablishment(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle establishment not found', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const { result } = renderHook(() => useEstablishment('non-existent'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useCreateEstablishment', () => {
    it('should create establishment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'est-new', name: 'New Establishment' })
      });

      const { result } = renderHook(() => useCreateEstablishment(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ name: 'New Establishment' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe('est-new');
    });

    it('should handle create error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Validation failed' })
      });

      const { result } = renderHook(() => useCreateEstablishment(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ name: '' });
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Validation failed');
    });

    it('should send POST request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'est-new' })
      });

      const { result } = renderHook(() => useCreateEstablishment(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ name: 'Test' });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/establishments'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('useUpdateEstablishment', () => {
    it('should update establishment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'est-123', name: 'Updated Name' })
      });

      const { result } = renderHook(() => useUpdateEstablishment(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: 'est-123', data: { name: 'Updated Name' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe('Updated Name');
    });

    it('should handle update error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Not found' })
      });

      const { result } = renderHook(() => useUpdateEstablishment(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'est-123', data: {} });
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should send PUT request to correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'est-456' })
      });

      const { result } = renderHook(() => useUpdateEstablishment(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: 'est-456', data: { name: 'Test' } });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/establishments/est-456'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('useDeleteEstablishment', () => {
    it('should delete establishment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const { result } = renderHook(() => useDeleteEstablishment(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('est-123');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle delete error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Cannot delete' })
      });

      const { result } = renderHook(() => useDeleteEstablishment(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync('est-123');
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should send DELETE request to correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const { result } = renderHook(() => useDeleteEstablishment(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('est-789');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/establishments/est-789'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
