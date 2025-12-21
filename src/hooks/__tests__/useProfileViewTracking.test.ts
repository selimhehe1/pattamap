/**
 * @vitest-environment jsdom
 */
/**
 * useProfileViewTracking Hook Tests
 *
 * Tests for profile view tracking:
 * - API call behavior (3 tests)
 * - Visibility control (2 tests)
 * - Error handling (1 test)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProfileViewTracking } from '../useProfileViewTracking';

describe('useProfileViewTracking Hook', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(mockFetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API call behavior', () => {
    it('should send POST request when employee ID is provided', async () => {
      renderHook(() => useProfileViewTracking('emp-123'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/employees/emp-123/view'),
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
          })
        );
      });
    });

    it('should not send request when employee ID is null', () => {
      renderHook(() => useProfileViewTracking(null));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should only track once per mount', async () => {
      const { rerender } = renderHook(() => useProfileViewTracking('emp-123'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Re-render the hook
      rerender();

      // Should still only have one call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visibility control', () => {
    it('should not track when isVisible is false', () => {
      renderHook(() => useProfileViewTracking('emp-123', false));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should track when isVisible becomes true', async () => {
      const { rerender } = renderHook(
        ({ id, visible }) => useProfileViewTracking(id, visible),
        { initialProps: { id: 'emp-123', visible: false } }
      );

      expect(mockFetch).not.toHaveBeenCalled();

      rerender({ id: 'emp-123', visible: true });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle fetch error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      expect(() => {
        renderHook(() => useProfileViewTracking('emp-123'));
      }).not.toThrow();

      // Wait for async effect
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    it('should handle non-ok response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      // Should not throw
      expect(() => {
        renderHook(() => useProfileViewTracking('emp-123'));
      }).not.toThrow();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });
  });
});
