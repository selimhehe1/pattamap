/**
 * @vitest-environment jsdom
 */
/**
 * useMapHeight Hook Tests
 *
 * Tests for responsive map height:
 * - Initial state (2 tests)
 * - Resize events (2 tests)
 * - Orientation change (1 test)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMapHeight } from '../useMapHeight';

describe('useMapHeight Hook', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, writable: true });
  });

  describe('Initial state', () => {
    it('should detect mobile when width < 768', () => {
      Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

      const { result } = renderHook(() => useMapHeight());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.screenHeight).toBe(800);
    });

    it('should detect desktop when width >= 768', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

      const { result } = renderHook(() => useMapHeight());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.screenHeight).toBe(768);
    });
  });

  describe('Resize events', () => {
    it('should update isMobile when resizing to mobile', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });

      const { result } = renderHook(() => useMapHeight());

      expect(result.current.isMobile).toBe(false);

      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.isMobile).toBe(true);
    });

    it('should update screenHeight on resize', () => {
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

      const { result } = renderHook(() => useMapHeight());

      expect(result.current.screenHeight).toBe(800);

      act(() => {
        Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
        window.dispatchEvent(new Event('resize'));
      });

      expect(result.current.screenHeight).toBe(600);
    });
  });

  describe('Orientation change', () => {
    it('should update screenHeight on orientation change', () => {
      Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });

      const { result } = renderHook(() => useMapHeight());

      expect(result.current.screenHeight).toBe(800);

      act(() => {
        Object.defineProperty(window, 'innerHeight', { value: 500, writable: true });
        window.dispatchEvent(new Event('orientationchange'));
      });

      expect(result.current.screenHeight).toBe(500);
    });
  });
});
