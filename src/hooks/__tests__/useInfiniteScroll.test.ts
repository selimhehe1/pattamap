/** @vitest-environment jsdom */
/**
 * useInfiniteScroll Hook Tests
 *
 * Tests for the infinite scroll pagination hook:
 * - Initial state (1 test)
 * - loadMore calls onLoadMore (1 test)
 * - loadMore skips when hasMore is false (1 test)
 * - loadMore skips when already loading (1 test)
 * - loadMore skips when disabled (1 test)
 * - Error state after onLoadMore rejects (1 test)
 * - Retry resets error and calls loadMore (1 test)
 *
 * Total: 7 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInfiniteScroll } from '../useInfiniteScroll';

// Mock useIntersectionObserver to avoid real IntersectionObserver usage
vi.mock('../useIntersectionObserver', () => ({
  useIntersectionObserver: vi.fn(() => ({
    ref: { current: null },
    entry: null,
    isIntersecting: false,
    intersectionRatio: 0,
    observe: vi.fn(),
    unobserve: vi.fn(),
  })),
}));

describe('useInfiniteScroll', () => {
  let onLoadMore: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onLoadMore = vi.fn().mockResolvedValue(undefined);
  });

  it('returns isLoading false initially', () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({
        onLoadMore,
        hasMore: true,
      })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loadMore calls onLoadMore when conditions are met', async () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({
        onLoadMore,
        hasMore: true,
        debounce: 0,
      })
    );

    await act(async () => {
      await result.current.loadMore();
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('loadMore does not call onLoadMore when hasMore is false', async () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({
        onLoadMore,
        hasMore: false,
        debounce: 0,
      })
    );

    await act(async () => {
      await result.current.loadMore();
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('loadMore does not call onLoadMore when isLoading is true (external)', async () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({
        onLoadMore,
        hasMore: true,
        isLoading: true,
        debounce: 0,
      })
    );

    await act(async () => {
      await result.current.loadMore();
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('loadMore does not call onLoadMore when enabled is false', async () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({
        onLoadMore,
        hasMore: true,
        enabled: false,
        debounce: 0,
      })
    );

    await act(async () => {
      await result.current.loadMore();
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('sets error state when onLoadMore rejects', async () => {
    const loadError = new Error('Load failed');
    const failingLoadMore = vi.fn().mockRejectedValue(loadError);
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useInfiniteScroll({
        onLoadMore: failingLoadMore,
        hasMore: true,
        debounce: 0,
        onError,
      })
    );

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.error).toBe(loadError);
    expect(onError).toHaveBeenCalledWith(loadError);
  });

  it('retry resets error state and calls loadMore again', async () => {
    const loadError = new Error('Load failed');
    let callCount = 0;
    const sometimesFailingLoadMore = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(loadError);
      }
      return Promise.resolve();
    });

    const { result } = renderHook(() =>
      useInfiniteScroll({
        onLoadMore: sometimesFailingLoadMore,
        hasMore: true,
        debounce: 0,
      })
    );

    // First call fails
    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.hasError).toBe(true);

    // Retry should clear error and succeed
    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.hasError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(sometimesFailingLoadMore).toHaveBeenCalledTimes(2);
  });
});
