/**
 * @vitest-environment jsdom
 */
/**
 * useMediaQuery Hook Tests
 *
 * Tests for media query matching:
 * - Initial state (2 tests)
 * - Change events (2 tests)
 * - useIsPortrait helper (2 tests)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useIsPortrait } from '../useMediaQuery';

// Mock matchMedia
const createMockMediaQueryList = (matches: boolean) => {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  return {
    matches,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') listeners.push(listener);
    }),
    removeEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    }),
    dispatchEvent: vi.fn(),
    // Helper to trigger change
    _triggerChange: (newMatches: boolean) => {
      listeners.forEach(listener => {
        listener({ matches: newMatches } as MediaQueryListEvent);
      });
    },
    _listeners: listeners
  };
};

describe('useMediaQuery Hook', () => {
  let mockMatchMedia: ReturnType<typeof createMockMediaQueryList>;

  beforeEach(() => {
    mockMatchMedia = createMockMediaQueryList(false);
    window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should return false when media query does not match', () => {
      mockMatchMedia.matches = false;

      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

      expect(result.current).toBe(false);
    });

    it('should return true when media query matches', () => {
      mockMatchMedia.matches = true;

      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

      expect(result.current).toBe(true);
    });
  });

  describe('Change events', () => {
    it('should update when media query starts matching', () => {
      mockMatchMedia.matches = false;

      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

      expect(result.current).toBe(false);

      act(() => {
        mockMatchMedia._triggerChange(true);
      });

      expect(result.current).toBe(true);
    });

    it('should update when media query stops matching', () => {
      mockMatchMedia.matches = true;

      const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));

      expect(result.current).toBe(true);

      act(() => {
        mockMatchMedia._triggerChange(false);
      });

      expect(result.current).toBe(false);
    });
  });

  describe('useIsPortrait helper', () => {
    it('should return true when in portrait orientation', () => {
      mockMatchMedia.matches = true;

      const { result } = renderHook(() => useIsPortrait());

      expect(result.current).toBe(true);
      expect(window.matchMedia).toHaveBeenCalledWith('(orientation: portrait)');
    });

    it('should return false when in landscape orientation', () => {
      mockMatchMedia.matches = false;

      const { result } = renderHook(() => useIsPortrait());

      expect(result.current).toBe(false);
    });
  });
});
