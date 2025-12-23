/**
 * useIntersectionObserver - Low-level IntersectionObserver hook
 *
 * A generic, reusable hook for observing element visibility.
 * Use this as a building block for:
 * - Lazy loading components
 * - Infinite scrolling
 * - Analytics (view tracking)
 * - Scroll-based animations
 *
 * @example Basic usage
 * const { ref, entry, isIntersecting } = useIntersectionObserver();
 * return <div ref={ref}>{isIntersecting ? 'Visible!' : 'Hidden'}</div>;
 *
 * @example With options
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   threshold: 0.5,
 *   rootMargin: '100px',
 *   freezeOnceVisible: true
 * });
 *
 * @example Multiple thresholds (for progress tracking)
 * const { ref, entry } = useIntersectionObserver({
 *   threshold: [0, 0.25, 0.5, 0.75, 1]
 * });
 * const progress = entry?.intersectionRatio ?? 0;
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseIntersectionObserverOptions {
  /**
   * Element that is used as the viewport for checking visibility.
   * Defaults to the browser viewport if not specified.
   */
  root?: Element | Document | null;

  /**
   * Margin around the root. Can have values similar to CSS margin.
   * @default '0px'
   */
  rootMargin?: string;

  /**
   * Number or array of numbers between 0 and 1 indicating at what
   * percentage of the target's visibility the observer's callback should execute.
   * @default 0
   */
  threshold?: number | number[];

  /**
   * If true, stops observing after the element becomes visible once.
   * Useful for one-time lazy loading.
   * @default false
   */
  freezeOnceVisible?: boolean;

  /**
   * Initial value for isIntersecting before observation starts.
   * @default false
   */
  initialIsIntersecting?: boolean;

  /**
   * Callback fired when intersection changes.
   * Useful for tracking or analytics.
   */
  onChange?: (isIntersecting: boolean, entry: IntersectionObserverEntry) => void;

  /**
   * Disable the observer (e.g., for SSR or when not needed).
   * @default false
   */
  disabled?: boolean;
}

export interface UseIntersectionObserverReturn<T extends Element> {
  /** Ref to attach to the target element */
  ref: React.RefObject<T | null>;
  /** The full IntersectionObserverEntry (null before first observation) */
  entry: IntersectionObserverEntry | null;
  /** Whether the element is currently intersecting */
  isIntersecting: boolean;
  /** Intersection ratio (0-1) */
  intersectionRatio: number;
  /** Manually trigger re-observation */
  observe: () => void;
  /** Manually stop observation */
  unobserve: () => void;
}

export function useIntersectionObserver<T extends Element = HTMLDivElement>(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn<T> {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    freezeOnceVisible = false,
    initialIsIntersecting = false,
    onChange,
    disabled = false
  } = options;

  const ref = useRef<T | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const frozenRef = useRef(false);

  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(initialIsIntersecting);

  // Memoize callback to avoid recreating observer
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [observerEntry] = entries;

      // If frozen and already visible, don't update
      if (frozenRef.current && freezeOnceVisible) {
        return;
      }

      setEntry(observerEntry);
      setIsIntersecting(observerEntry.isIntersecting);

      // Call onChange callback if provided
      if (onChange) {
        onChange(observerEntry.isIntersecting, observerEntry);
      }

      // Freeze if visible and freezeOnceVisible is true
      if (observerEntry.isIntersecting && freezeOnceVisible) {
        frozenRef.current = true;
        observerRef.current?.unobserve(observerEntry.target);
      }
    },
    [freezeOnceVisible, onChange]
  );

  const observe = useCallback(() => {
    const element = ref.current;
    if (!element || disabled) return;

    // Reset frozen state
    frozenRef.current = false;

    // Create observer if needed
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(handleIntersect, {
        root,
        rootMargin,
        threshold
      });
    }

    observerRef.current.observe(element);
  }, [disabled, handleIntersect, root, rootMargin, threshold]);

  const unobserve = useCallback(() => {
    const element = ref.current;
    if (element && observerRef.current) {
      observerRef.current.unobserve(element);
    }
  }, []);

  useEffect(() => {
    // Check for IntersectionObserver support
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // Fallback: assume visible
      setIsIntersecting(true);
      return;
    }

    if (disabled) {
      return;
    }

    const element = ref.current;
    if (!element) return;

    // Create observer
    observerRef.current = new IntersectionObserver(handleIntersect, {
      root,
      rootMargin,
      threshold
    });

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [root, rootMargin, threshold, disabled, handleIntersect]);

  return {
    ref,
    entry,
    isIntersecting,
    intersectionRatio: entry?.intersectionRatio ?? 0,
    observe,
    unobserve
  };
}

export default useIntersectionObserver;
