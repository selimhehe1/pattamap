/**
 * @vitest-environment jsdom
 */
/**
 * useFavorites Hook Tests
 *
 * Tests for React Query favorites hooks:
 * - favoriteKeys factory (2 tests)
 * - useFavorites hook (3 tests)
 * - useIsFavorite hook (2 tests)
 * - useAddFavorite mutation (7 tests)
 * - useRemoveFavorite mutation (7 tests)
 * - useToggleFavorite hook (4 tests)
 *
 * Total: 25 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useFavorites,
  useIsFavorite,
  useAddFavorite,
  useRemoveFavorite,
  useToggleFavorite,
  favoriteKeys,
  Favorite
} from '../useFavorites';
import toast from '../../utils/toast';

// Mock useSecureFetch
vi.mock('../useSecureFetch', () => ({
  useSecureFetch: () => ({
    secureFetch: (url: string, options?: RequestInit) => global.fetch(url, options)
  })
}));

// Mock useOnline
vi.mock('../useOnline', () => ({
  useOnline: () => ({ isOnline: true })
}));

// Mock offlineQueue
vi.mock('../../utils/offlineQueue', () => ({
  addToQueue: vi.fn(),
  isOfflineQueueSupported: () => false
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

// Sample favorite data
const mockFavorite: Favorite = {
  id: 'fav-1',
  user_id: 'user-123',
  employee_id: 'emp-456',
  created_at: '2024-01-01T00:00:00Z',
  employee_name: 'Test Employee',
  employee_photos: ['photo1.jpg'],
  employee_age: 25,
  employee_nationality: 'Thai'
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

describe('useFavorites Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('favoriteKeys', () => {
    it('should generate correct base keys', () => {
      expect(favoriteKeys.all).toEqual(['favorites']);
      expect(favoriteKeys.lists()).toEqual(['favorites', 'list']);
    });

    it('should generate list key with userId', () => {
      expect(favoriteKeys.list('user-123')).toEqual(['favorites', 'list', { userId: 'user-123' }]);
      expect(favoriteKeys.list()).toEqual(['favorites', 'list', { userId: undefined }]);
    });
  });

  describe('useFavorites', () => {
    it('should fetch all favorites successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ favorites: [mockFavorite] })
      });

      const { result } = renderHook(() => useFavorites(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].employee_name).toBe('Test Employee');
    });

    it('should handle fetch error', async () => {
      // Mock all retries to fail
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      const { result } = renderHook(() => useFavorites(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
      expect(result.current.error?.message).toBe('Failed to fetch favorites');
    });

    it('should return empty array when no favorites', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ favorites: [] })
      });

      const { result } = renderHook(() => useFavorites(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([]);
    });
  });

  describe('useIsFavorite', () => {
    it('should return true if employee is in favorites', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ favorites: [mockFavorite] })
      });

      const { result } = renderHook(() => useIsFavorite('emp-456'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current).toBe(true));
    });

    it('should return false if employee is not in favorites', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ favorites: [mockFavorite] })
      });

      const { result } = renderHook(() => useIsFavorite('emp-999'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current).toBe(false));
    });
  });

  describe('useAddFavorite', () => {
    it('should add favorite successfully', async () => {
      // First call for useFavorites, second for mutation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ favorites: [] })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFavorite)
      });

      const { result } = renderHook(() => useAddFavorite(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('emp-456');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle add error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Already in favorites' })
      });

      const { result } = renderHook(() => useAddFavorite(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync('emp-456');
        } catch {
          // Expected
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Already in favorites');
    });

    it('should send POST request with employee_id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFavorite)
      });

      const { result } = renderHook(() => useAddFavorite(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('emp-789');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/favorites'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ employee_id: 'emp-789' })
        })
      );
    });

    it('should perform optimistic update', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
      });

      // Pre-populate favorites cache
      queryClient.setQueryData(favoriteKeys.lists(), [mockFavorite]);

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useAddFavorite(), { wrapper });

      act(() => {
        result.current.mutate('emp-new');
      });

      // Check that optimistic update was applied
      await waitFor(() => {
        const favorites = queryClient.getQueryData<Favorite[]>(favoriteKeys.lists());
        expect(favorites).toHaveLength(2);
        expect(favorites?.[1].employee_id).toBe('emp-new');
      });
    });

    it('should show success toast on add', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFavorite)
      });

      const { result } = renderHook(() => useAddFavorite(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('emp-456');
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('⭐ Added to favorites!');
      });
    });

    it('should show error toast on add failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Already exists' })
      });

      const { result } = renderHook(() => useAddFavorite(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync('emp-456');
        } catch {
          // Expected
        }
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('❌ Failed to add to favorites: Already exists');
      });
    });

    it('should rollback on error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
      });

      // Pre-populate favorites cache
      queryClient.setQueryData(favoriteKeys.lists(), [mockFavorite]);

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Server error' })
      });

      const { result } = renderHook(() => useAddFavorite(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync('emp-new');
        } catch {
          // Expected
        }
      });

      // Check that rollback was applied (back to original 1 item)
      await waitFor(() => {
        const favorites = queryClient.getQueryData<Favorite[]>(favoriteKeys.lists());
        expect(favorites).toHaveLength(1);
        expect(favorites?.[0].employee_id).toBe('emp-456');
      });
    });
  });

  describe('useRemoveFavorite', () => {
    it('should remove favorite successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const { result } = renderHook(() => useRemoveFavorite(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('emp-456');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle remove error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Favorite not found' })
      });

      const { result } = renderHook(() => useRemoveFavorite(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync('emp-456');
        } catch {
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

      const { result } = renderHook(() => useRemoveFavorite(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('emp-789');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/favorites/emp-789'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should perform optimistic update on remove', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
      });

      // Pre-populate favorites cache with 2 items
      queryClient.setQueryData(favoriteKeys.lists(), [
        mockFavorite,
        { ...mockFavorite, id: 'fav-2', employee_id: 'emp-other' }
      ]);

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useRemoveFavorite(), { wrapper });

      act(() => {
        result.current.mutate('emp-456');
      });

      // Check that optimistic update was applied
      await waitFor(() => {
        const favorites = queryClient.getQueryData<Favorite[]>(favoriteKeys.lists());
        expect(favorites).toHaveLength(1);
        expect(favorites?.[0].employee_id).toBe('emp-other');
      });
    });

    it('should show success toast on remove', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const { result } = renderHook(() => useRemoveFavorite(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('emp-456');
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('❌ Removed from favorites');
      });
    });

    it('should show error toast on remove failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Not found' })
      });

      const { result } = renderHook(() => useRemoveFavorite(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync('emp-456');
        } catch {
          // Expected
        }
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('❌ Failed to remove from favorites: Not found');
      });
    });

    it('should rollback on remove error', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
      });

      // Pre-populate favorites cache with 2 items
      queryClient.setQueryData(favoriteKeys.lists(), [
        mockFavorite,
        { ...mockFavorite, id: 'fav-2', employee_id: 'emp-other' }
      ]);

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Server error' })
      });

      const { result } = renderHook(() => useRemoveFavorite(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync('emp-456');
        } catch {
          // Expected
        }
      });

      // Check that rollback was applied (back to original 2 items)
      await waitFor(() => {
        const favorites = queryClient.getQueryData<Favorite[]>(favoriteKeys.lists());
        expect(favorites).toHaveLength(2);
      });
    });
  });

  describe('useToggleFavorite', () => {
    it('should return isFavorite status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ favorites: [mockFavorite] })
      });

      const { result } = renderHook(() => useToggleFavorite('emp-456'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isFavorite).toBe(true));
    });

    it('should call removeFavorite when toggling a favorite', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
      });

      // Pre-populate with the employee as favorite
      queryClient.setQueryData(favoriteKeys.lists(), [mockFavorite]);

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const { result } = renderHook(() => useToggleFavorite('emp-456'), { wrapper });

      expect(result.current.isFavorite).toBe(true);

      act(() => {
        result.current.toggle();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/favorites/emp-456'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });

    it('should call addFavorite when toggling a non-favorite', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
      });

      // Pre-populate with empty favorites
      queryClient.setQueryData(favoriteKeys.lists(), []);

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFavorite)
      });

      const { result } = renderHook(() => useToggleFavorite('emp-456'), { wrapper });

      expect(result.current.isFavorite).toBe(false);

      act(() => {
        result.current.toggle();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/favorites'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should expose isLoading state during mutation', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
      });

      // Pre-populate with empty favorites
      queryClient.setQueryData(favoriteKeys.lists(), []);

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children);

      // Never resolves to keep isLoading true
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useToggleFavorite('emp-456'), { wrapper });

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.toggle();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });
    });
  });
});
