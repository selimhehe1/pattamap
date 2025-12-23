/**
 * Tests for useIntersectionObserver hook
 *
 * Note: IntersectionObserver is mocked globally in setupTests.ts
 * These tests verify the hook's API and basic behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIntersectionObserver } from '../useIntersectionObserver';

describe('useIntersectionObserver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API shape', () => {
    it('should return expected properties', () => {
      const { result } = renderHook(() => useIntersectionObserver());

      expect(result.current).toHaveProperty('ref');
      expect(result.current).toHaveProperty('entry');
      expect(result.current).toHaveProperty('isIntersecting');
      expect(result.current).toHaveProperty('intersectionRatio');
      expect(result.current).toHaveProperty('observe');
      expect(result.current).toHaveProperty('unobserve');
    });

    it('should have correct types for functions', () => {
      const { result } = renderHook(() => useIntersectionObserver());

      expect(typeof result.current.observe).toBe('function');
      expect(typeof result.current.unobserve).toBe('function');
    });

    it('should have ref object', () => {
      const { result } = renderHook(() => useIntersectionObserver());

      expect(result.current.ref).toBeDefined();
      expect(result.current.ref).toHaveProperty('current');
    });
  });

  describe('initial state', () => {
    it('should return isIntersecting as false by default', () => {
      const { result } = renderHook(() => useIntersectionObserver());

      expect(result.current.isIntersecting).toBe(false);
    });

    it('should return entry as null initially', () => {
      const { result } = renderHook(() => useIntersectionObserver());

      expect(result.current.entry).toBeNull();
    });

    it('should return intersectionRatio as 0 initially', () => {
      const { result } = renderHook(() => useIntersectionObserver());

      expect(result.current.intersectionRatio).toBe(0);
    });

    it('should respect initialIsIntersecting option', () => {
      const { result } = renderHook(() =>
        useIntersectionObserver({ initialIsIntersecting: true })
      );

      expect(result.current.isIntersecting).toBe(true);
    });
  });

  describe('options', () => {
    it('should accept threshold option', () => {
      const { result } = renderHook(() =>
        useIntersectionObserver({ threshold: 0.5 })
      );

      expect(result.current.ref).toBeDefined();
    });

    it('should accept threshold array', () => {
      const { result } = renderHook(() =>
        useIntersectionObserver({ threshold: [0, 0.25, 0.5, 0.75, 1] })
      );

      expect(result.current.ref).toBeDefined();
    });

    it('should accept rootMargin option', () => {
      const { result } = renderHook(() =>
        useIntersectionObserver({ rootMargin: '100px' })
      );

      expect(result.current.ref).toBeDefined();
    });

    it('should accept freezeOnceVisible option', () => {
      const { result } = renderHook(() =>
        useIntersectionObserver({ freezeOnceVisible: true })
      );

      expect(result.current.ref).toBeDefined();
    });

    it('should accept disabled option', () => {
      const { result } = renderHook(() =>
        useIntersectionObserver({ disabled: true })
      );

      // When disabled, hook should still return valid API
      expect(result.current.ref).toBeDefined();
      expect(typeof result.current.observe).toBe('function');
    });

    it('should accept onChange callback', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useIntersectionObserver({ onChange })
      );

      expect(result.current.ref).toBeDefined();
    });
  });

  describe('stability', () => {
    it('should maintain stable ref across rerenders', () => {
      const { result, rerender } = renderHook(() => useIntersectionObserver());

      const firstRef = result.current.ref;
      rerender();
      const secondRef = result.current.ref;

      expect(firstRef).toBe(secondRef);
    });

    it('should maintain stable functions across rerenders', () => {
      const { result, rerender } = renderHook(() => useIntersectionObserver());

      const firstObserve = result.current.observe;
      const firstUnobserve = result.current.unobserve;

      rerender();

      expect(result.current.observe).toBe(firstObserve);
      expect(result.current.unobserve).toBe(firstUnobserve);
    });
  });
});
