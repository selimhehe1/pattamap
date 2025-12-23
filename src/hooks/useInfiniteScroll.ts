/**
 * useInfiniteScroll - Hook for infinite scrolling pagination
 *
 * Uses IntersectionObserver to detect when user scrolls near the end
 * of a list and triggers loading more content.
 *
 * Features:
 * - Automatic load more when sentinel is visible
 * - Loading state management
 * - Error handling with retry
 * - Debounced to prevent rapid firing
 *
 * @example Basic usage
 * const { sentinelRef, isLoading } = useInfiniteScroll({
 *   onLoadMore: async () => {
 *     const newItems = await fetchMoreItems(page);
 *     setItems(prev => [...prev, ...newItems]);
 *     setPage(p => p + 1);
 *   },
 *   hasMore: page < totalPages
 * });
 *
 * return (
 *   <>
 *     {items.map(item => <Card key={item.id} {...item} />)}
 *     <div ref={sentinelRef}>
 *       {isLoading && <Spinner />}
 *     </div>
 *   </>
 * );
 *
 * @example With React Query
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(...);
 * const { sentinelRef } = useInfiniteScroll({
 *   onLoadMore: fetchNextPage,
 *   hasMore: hasNextPage,
 *   isLoading: isFetchingNextPage
 * });
 */

import { useCallback, useRef, useState } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';

export interface UseInfiniteScrollOptions {
  /**
   * Callback to load more content.
   * Can be async - loading state will be managed automatically.
   */
  onLoadMore: () => void | Promise<void>;

  /**
   * Whether there is more content to load.
   * When false, the sentinel won't trigger onLoadMore.
   */
  hasMore: boolean;

  /**
   * External loading state (e.g., from React Query).
   * If provided, internal loading state is ignored.
   */
  isLoading?: boolean;

  /**
   * Distance from viewport to trigger loading (CSS margin format).
   * @default '200px'
   */
  rootMargin?: string;

  /**
   * Minimum time between load triggers (ms).
   * Prevents rapid firing during fast scrolling.
   * @default 100
   */
  debounce?: number;

  /**
   * Whether infinite scroll is enabled.
   * @default true
   */
  enabled?: boolean;

  /**
   * Callback when loading fails.
   */
  onError?: (error: Error) => void;
}

export interface UseInfiniteScrollReturn<T extends Element> {
  /** Ref to attach to the sentinel element (place at end of list) */
  sentinelRef: React.RefObject<T | null>;
  /** Whether currently loading more content */
  isLoading: boolean;
  /** Whether an error occurred during loading */
  hasError: boolean;
  /** Error message if any */
  error: Error | null;
  /** Manually trigger load more */
  loadMore: () => Promise<void>;
  /** Reset error state and retry */
  retry: () => Promise<void>;
}

export function useInfiniteScroll<T extends Element = HTMLDivElement>(
  options: UseInfiniteScrollOptions
): UseInfiniteScrollReturn<T> {
  const {
    onLoadMore,
    hasMore,
    isLoading: externalLoading,
    rootMargin = '200px',
    debounce = 100,
    enabled = true,
    onError
  } = options;

  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastLoadTime = useRef(0);

  const isLoading = externalLoading ?? internalLoading;

  const loadMore = useCallback(async () => {
    // Debounce check
    const now = Date.now();
    if (now - lastLoadTime.current < debounce) {
      return;
    }
    lastLoadTime.current = now;

    // Don't load if already loading, no more content, or disabled
    if (isLoading || !hasMore || !enabled) {
      return;
    }

    setError(null);

    // Only manage internal loading if external isn't provided
    if (externalLoading === undefined) {
      setInternalLoading(true);
    }

    try {
      await onLoadMore();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load more');
      setError(error);
      onError?.(error);
    } finally {
      if (externalLoading === undefined) {
        setInternalLoading(false);
      }
    }
  }, [onLoadMore, hasMore, isLoading, enabled, debounce, externalLoading, onError]);

  const handleIntersectionChange = useCallback(
    (isIntersecting: boolean) => {
      if (isIntersecting && hasMore && !isLoading && enabled) {
        loadMore();
      }
    },
    [hasMore, isLoading, enabled, loadMore]
  );

  const { ref: sentinelRef } = useIntersectionObserver<T>({
    rootMargin,
    threshold: 0,
    onChange: handleIntersectionChange,
    disabled: !enabled || !hasMore
  });

  const retry = useCallback(async () => {
    setError(null);
    await loadMore();
  }, [loadMore]);

  return {
    sentinelRef,
    isLoading,
    hasError: error !== null,
    error,
    loadMore,
    retry
  };
}

/**
 * useInfiniteScrollWithReset - Infinite scroll with page reset capability
 *
 * Extends useInfiniteScroll with ability to reset pagination
 * (e.g., when filters change).
 *
 * @example
 * const { sentinelRef, reset } = useInfiniteScrollWithReset({
 *   onLoadMore: () => fetchPage(page),
 *   hasMore: hasNextPage,
 *   onReset: () => {
 *     setPage(1);
 *     setItems([]);
 *   }
 * });
 *
 * // When filter changes:
 * useEffect(() => { reset(); }, [filter]);
 */
export function useInfiniteScrollWithReset<T extends Element = HTMLDivElement>(
  options: UseInfiniteScrollOptions & {
    /** Callback when reset is triggered */
    onReset?: () => void;
  }
): UseInfiniteScrollReturn<T> & {
  /** Reset pagination to initial state */
  reset: () => void;
} {
  const { onReset, ...scrollOptions } = options;
  const scrollReturn = useInfiniteScroll<T>(scrollOptions);

  const reset = useCallback(() => {
    onReset?.();
  }, [onReset]);

  return {
    ...scrollReturn,
    reset
  };
}

export default useInfiniteScroll;
