/**
 * @vitest-environment jsdom
 */
/**
 * useFocusTrap Hook Tests
 *
 * Tests for focus trap accessibility:
 * - Activation (1 test)
 * - Focus restoration (1 test)
 * - Empty container handling (1 test)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFocusTrap } from '../useFocusTrap';

describe('useFocusTrap Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any elements added to body
    document.body.textContent = '';
  });

  describe('Activation', () => {
    it('should return a ref object', () => {
      const { result } = renderHook(() => useFocusTrap<HTMLDivElement>(false));

      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('current');
    });

    it('should not throw when inactive', () => {
      expect(() => {
        renderHook(() => useFocusTrap<HTMLDivElement>(false));
      }).not.toThrow();
    });
  });

  describe('Focus behavior', () => {
    it('should handle activation without container', () => {
      // When there's no container attached, it should not throw
      expect(() => {
        renderHook(() => useFocusTrap<HTMLDivElement>(true));
      }).not.toThrow();
    });

    it('should not modify focus when inactive', () => {
      const outsideButton = document.createElement('button');
      outsideButton.id = 'outside';
      document.body.appendChild(outsideButton);
      outsideButton.focus();

      expect(document.activeElement?.id).toBe('outside');

      renderHook(() => useFocusTrap<HTMLDivElement>(false));

      // Focus should remain on the outside button
      expect(document.activeElement?.id).toBe('outside');
    });
  });

  describe('Cleanup', () => {
    it('should handle unmount gracefully', () => {
      const { unmount } = renderHook(() => useFocusTrap<HTMLDivElement>(true));

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle isActive change', () => {
      const { rerender } = renderHook(
        ({ isActive }) => useFocusTrap<HTMLDivElement>(isActive),
        { initialProps: { isActive: true } }
      );

      expect(() => {
        rerender({ isActive: false });
      }).not.toThrow();
    });
  });
});
