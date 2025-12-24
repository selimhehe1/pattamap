/**
 * @vitest-environment jsdom
 */
/**
 * useFormSubmissions Hook Tests
 *
 * Tests for form submission handling:
 * - Employee submission (3 tests)
 * - Establishment submission (3 tests)
 * - Submitting state (2 tests)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormSubmissions } from '../useFormSubmissions';

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token-123',
  }),
}));

// Mock fetch
const mockFetch = vi.fn();

describe('useFormSubmissions Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should start with isSubmitting false', () => {
      const { result } = renderHook(() => useFormSubmissions());

      expect(result.current.isSubmitting).toBe(false);
    });

    it('should expose submit functions', () => {
      const { result } = renderHook(() => useFormSubmissions());

      expect(typeof result.current.submitEmployee).toBe('function');
      expect(typeof result.current.submitEstablishment).toBe('function');
    });
  });

  describe('Employee submission', () => {
    const mockEmployeeData = {
      name: 'Test Employee',
      age: 25,
      nationality: 'Thai',
      establishment_id: 'est-123',
    };

    it('should submit employee successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'emp-123' }),
      });

      const { result } = renderHook(() => useFormSubmissions());

      let response;
      await act(async () => {
        response = await result.current.submitEmployee(mockEmployeeData as any);
      });

      expect(response).toEqual({
        success: true,
        message: 'Employee submitted successfully! It will be reviewed by administrators.',
      });
    });

    it('should call correct endpoint with auth header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'emp-123' }),
      });

      const { result } = renderHook(() => useFormSubmissions());

      await act(async () => {
        await result.current.submitEmployee(mockEmployeeData as any);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/employees'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation failed' }),
      });

      const { result } = renderHook(() => useFormSubmissions());

      await expect(
        act(async () => {
          await result.current.submitEmployee(mockEmployeeData as any);
        })
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('Establishment submission', () => {
    const mockEstablishmentData = {
      name: 'Test Bar',
      address: 'Walking Street 123',
      category_id: 'cat-001',
    };

    it('should submit establishment successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'est-123' }),
      });

      const { result } = renderHook(() => useFormSubmissions());

      let response;
      await act(async () => {
        response = await result.current.submitEstablishment(mockEstablishmentData as any);
      });

      expect(response).toEqual({
        success: true,
        message: 'Establishment submitted successfully! It will be reviewed by administrators.',
      });
    });

    it('should call correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'est-123' }),
      });

      const { result } = renderHook(() => useFormSubmissions());

      await act(async () => {
        await result.current.submitEstablishment(mockEstablishmentData as any);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/establishments'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should throw on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid data' }),
      });

      const { result } = renderHook(() => useFormSubmissions());

      await expect(
        act(async () => {
          await result.current.submitEstablishment(mockEstablishmentData as any);
        })
      ).rejects.toThrow('Invalid data');
    });
  });

  describe('Submitting state', () => {
    it('should return isSubmitting as false after successful submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'emp-123' }),
      });

      const { result } = renderHook(() => useFormSubmissions());

      expect(result.current.isSubmitting).toBe(false);

      await act(async () => {
        await result.current.submitEmployee({ name: 'Test' } as any);
      });

      // After submission completes, isSubmitting should be false
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should reset isSubmitting after error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Error' }),
      });

      const { result } = renderHook(() => useFormSubmissions());

      try {
        await act(async () => {
          await result.current.submitEmployee({ name: 'Test' } as any);
        });
      } catch {
        // Expected error
      }

      expect(result.current.isSubmitting).toBe(false);
    });
  });
});
