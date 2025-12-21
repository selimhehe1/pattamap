/**
 * @vitest-environment jsdom
 */
/**
 * useFreelances Hook Tests
 *
 * Tests for freelance positions React Query hook:
 * - Query behavior (3 tests)
 * - Data fetching (2 tests)
 * - Error handling (1 test)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useFreelances, freelanceKeys, IndependentPosition } from '../useFreelances';

// Mock fetch
const mockFetch = vi.fn();

// Create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockPositions: IndependentPosition[] = [
  {
    id: 'pos-1',
    employee_id: 'emp-1',
    zone: 'walking-street',
    visual_x: 100,
    visual_y: 200,
    employee_name: 'Test Employee',
  },
  {
    id: 'pos-2',
    employee_id: 'emp-2',
    zone: 'soi-6',
    visual_x: 150,
    visual_y: 250,
  },
];

describe('useFreelances Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Query keys', () => {
    it('should have correct query key structure', () => {
      expect(freelanceKeys.all).toEqual(['freelances']);
      expect(freelanceKeys.map()).toEqual(['freelances', 'map']);
    });
  });

  describe('Data fetching', () => {
    it('should fetch freelance positions successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPositions }),
      });

      const { result } = renderHook(() => useFreelances(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].employee_name).toBe('Test Employee');
    });

    it('should call correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      renderHook(() => useFreelances(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/independent-positions/map')
      );
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const { result } = renderHook(() => useFreelances(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { result } = renderHook(() => useFreelances(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('Query configuration', () => {
    it('should return query state properties', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPositions }),
      });

      const { result } = renderHook(() => useFreelances(), {
        wrapper: createWrapper(),
      });

      // Check that all expected properties exist
      expect(result.current).toHaveProperty('data');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isError');
      expect(result.current).toHaveProperty('isSuccess');
      expect(result.current).toHaveProperty('refetch');
    });
  });
});
