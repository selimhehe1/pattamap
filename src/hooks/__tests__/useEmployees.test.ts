/**
 * @vitest-environment jsdom
 */
/**
 * useEmployees Hook Tests
 *
 * Tests for React Query employee hooks:
 * - employeeKeys factory (3 tests)
 * - useEmployees hook (3 tests)
 * - useEmployee hook (3 tests)
 * - useEmployeeSearch hook (3 tests)
 * - useCreateEmployee mutation (3 tests)
 * - useUpdateEmployee mutation (3 tests)
 * - useDeleteEmployee mutation (3 tests)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useEmployees,
  useEmployee,
  useEmployeeSearch,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  employeeKeys,
  EmployeeSearchParams
} from '../useEmployees';

// Mock useSecureFetch - must use the same mockFetch reference
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

describe('useEmployees Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('employeeKeys', () => {
    it('should generate correct base keys', () => {
      expect(employeeKeys.all).toEqual(['employees']);
      expect(employeeKeys.lists()).toEqual(['employees', 'list']);
      expect(employeeKeys.details()).toEqual(['employees', 'detail']);
    });

    it('should generate detail key with id', () => {
      expect(employeeKeys.detail('emp-123')).toEqual(['employees', 'detail', 'emp-123']);
    });

    it('should normalize search params removing empty values', () => {
      const params: EmployeeSearchParams = { q: '', zone: 'soi-buakhao', type: undefined };
      const key = employeeKeys.search(params);
      expect(key[2]).toEqual({ zone: 'soi-buakhao' });
    });
  });

  describe('useEmployees', () => {
    it('should fetch all employees successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ id: 'emp-1', name: 'Test Employee' }])
      });

      const { result } = renderHook(() => useEmployees(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data?.[0].name).toBe('Test Employee');
    });

    it('should handle fetch error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const { result } = renderHook(() => useEmployees(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error?.message).toBe('Failed to fetch employees');
    });

    it('should be in loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useEmployees(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useEmployee', () => {
    it('should fetch single employee by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'emp-123', name: 'John Doe' })
      });

      const { result } = renderHook(() => useEmployee('emp-123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe('John Doe');
    });

    it('should not fetch when id is null', () => {
      const { result } = renderHook(() => useEmployee(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle employee not found', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const { result } = renderHook(() => useEmployee('non-existent'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useEmployeeSearch', () => {
    it('should search employees with filters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          employees: [{ id: 'emp-1', zone: 'walking-street' }],
          total: 1,
          page: 1,
          limit: 20,
          hasMore: false
        })
      });

      const { result } = renderHook(
        () => useEmployeeSearch({ zone: 'walking-street' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.employees).toHaveLength(1);
      expect(result.current.data?.total).toBe(1);
    });

    it('should handle search error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const { result } = renderHook(
        () => useEmployeeSearch({ zone: 'invalid' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should build query params correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ employees: [], total: 0 })
      });

      renderHook(
        () => useEmployeeSearch({ q: 'test', zone: 'soi-buakhao' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
        const url = mockFetch.mock.calls[0][0];
        expect(url).toContain('q=test');
        expect(url).toContain('zone=soi-buakhao');
      });
    });
  });

  describe('useCreateEmployee', () => {
    it('should create employee successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'emp-new', name: 'New Employee' })
      });

      const { result } = renderHook(() => useCreateEmployee(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ name: 'New Employee' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe('emp-new');
    });

    it('should handle create error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Validation failed' })
      });

      const { result } = renderHook(() => useCreateEmployee(), { wrapper: createWrapper() });

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
        json: () => Promise.resolve({ id: 'emp-new' })
      });

      const { result } = renderHook(() => useCreateEmployee(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ name: 'Test' });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/employees'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('useUpdateEmployee', () => {
    it('should update employee successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'emp-123', name: 'Updated Name' })
      });

      const { result } = renderHook(() => useUpdateEmployee(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: 'emp-123', data: { name: 'Updated Name' } });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.name).toBe('Updated Name');
    });

    it('should handle update error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Not found' })
      });

      const { result } = renderHook(() => useUpdateEmployee(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'emp-123', data: {} });
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('should send PUT request to correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'emp-456' })
      });

      const { result } = renderHook(() => useUpdateEmployee(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: 'emp-456', data: { name: 'Test' } });
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/employees/emp-456'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('useDeleteEmployee', () => {
    it('should delete employee successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const { result } = renderHook(() => useDeleteEmployee(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('emp-123');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should handle delete error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Cannot delete' })
      });

      const { result } = renderHook(() => useDeleteEmployee(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync('emp-123');
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

      const { result } = renderHook(() => useDeleteEmployee(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('emp-789');
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/employees/emp-789'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });
});
