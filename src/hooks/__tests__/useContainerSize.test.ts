/**
 * @vitest-environment jsdom
 */
/**
 * useContainerSize Hook Tests
 *
 * Tests for container size tracking with ResizeObserver:
 * - Initial size (2 tests)
 * - Resize events (1 test)
 * - Cleanup (1 test)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContainerSize } from '../useContainerSize';
import { useRef, MutableRefObject } from 'react';

// Store callback for triggering resize
let resizeCallback: ResizeObserverCallback | null = null;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

// Mock ResizeObserver class
class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = vi.fn();
}

describe('useContainerSize Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    resizeCallback = null;
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Initial size', () => {
    it('should return initial size from getBoundingClientRect', () => {
      const mockElement = document.createElement('div');
      mockElement.getBoundingClientRect = () => ({
        width: 500,
        height: 300,
        top: 0,
        left: 0,
        right: 500,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(mockElement);
        return useContainerSize(ref);
      });

      expect(result.current.width).toBe(500);
      expect(result.current.height).toBe(300);
    });

    it('should return zero size when ref is null', () => {
      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null);
        return useContainerSize(ref);
      });

      expect(result.current.width).toBe(0);
      expect(result.current.height).toBe(0);
    });
  });

  describe('Resize events', () => {
    it('should update size when ResizeObserver triggers after debounce', () => {
      const mockElement = document.createElement('div');
      mockElement.getBoundingClientRect = () => ({
        width: 500,
        height: 300,
        top: 0,
        left: 0,
        right: 500,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(mockElement);
        return useContainerSize(ref, 100);
      });

      // Initial size from getBoundingClientRect
      expect(result.current.width).toBe(500);

      // Simulate resize via ResizeObserver callback
      act(() => {
        if (resizeCallback) {
          resizeCallback(
            [{ contentRect: { width: 800, height: 600 } } as ResizeObserverEntry],
            {} as ResizeObserver
          );
        }
        vi.advanceTimersByTime(100); // Wait for debounce
      });

      expect(result.current.width).toBe(800);
      expect(result.current.height).toBe(600);
    });
  });

  describe('Cleanup', () => {
    it('should disconnect ResizeObserver on unmount', () => {
      const mockElement = document.createElement('div');
      mockElement.getBoundingClientRect = () => ({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      const { unmount } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(mockElement);
        return useContainerSize(ref);
      });

      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});
