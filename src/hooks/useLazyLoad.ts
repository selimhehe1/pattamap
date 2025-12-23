/**
 * useLazyLoad - Hook for lazy loading components/content
 *
 * Uses IntersectionObserver to defer rendering of heavy components
 * until they are about to enter the viewport.
 *
 * Benefits:
 * - Reduces initial bundle size perception
 * - Improves Time to Interactive (TTI)
 * - Saves resources for off-screen content
 *
 * @example Basic usage
 * const { ref, shouldLoad } = useLazyLoad();
 * return (
 *   <div ref={ref}>
 *     {shouldLoad ? <HeavyComponent /> : <Skeleton />}
 *   </div>
 * );
 *
 * @example With preload margin
 * const { ref, shouldLoad } = useLazyLoad({ rootMargin: '200px' });
 * // Component loads when within 200px of viewport
 *
 * @example With loading callback
 * const { ref, shouldLoad, hasLoaded } = useLazyLoad({
 *   onLoad: () => analytics.track('component_viewed')
 * });
 */

import { useCallback, useState } from 'react';
import { useIntersectionObserver, UseIntersectionObserverOptions } from './useIntersectionObserver';

export interface UseLazyLoadOptions extends Omit<UseIntersectionObserverOptions, 'freezeOnceVisible' | 'onChange'> {
  /**
   * Callback fired when content should load (first intersection).
   * Useful for analytics or triggering data fetches.
   */
  onLoad?: () => void;

  /**
   * If true, content stays loaded even when scrolled away.
   * If false, content unloads when not visible (use with caution).
   * @default true
   */
  keepLoaded?: boolean;

  /**
   * Delay in ms before triggering load (debounce fast scrolling).
   * @default 0
   */
  delay?: number;
}

export interface UseLazyLoadReturn<T extends Element> {
  /** Ref to attach to the container element */
  ref: React.RefObject<T | null>;
  /** Whether the content should be loaded/rendered */
  shouldLoad: boolean;
  /** Whether the content has ever been loaded (for tracking) */
  hasLoaded: boolean;
  /** Whether currently in viewport */
  isInViewport: boolean;
  /** Manually trigger load */
  triggerLoad: () => void;
  /** Reset to unloaded state (use with keepLoaded: false) */
  reset: () => void;
}

export function useLazyLoad<T extends Element = HTMLDivElement>(
  options: UseLazyLoadOptions = {}
): UseLazyLoadReturn<T> {
  const {
    rootMargin = '100px', // Preload when within 100px of viewport
    threshold = 0,
    onLoad,
    keepLoaded = true,
    delay = 0,
    ...observerOptions
  } = options;

  const [hasLoaded, setHasLoaded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  const handleIntersectionChange = useCallback(
    (isIntersecting: boolean) => {
      if (isIntersecting && !hasLoaded) {
        const doLoad = () => {
          setHasLoaded(true);
          setShouldLoad(true);
          onLoad?.();
        };

        if (delay > 0) {
          setTimeout(doLoad, delay);
        } else {
          doLoad();
        }
      } else if (!keepLoaded && !isIntersecting && hasLoaded) {
        // Unload when out of viewport (only if keepLoaded is false)
        setShouldLoad(false);
      }
    },
    [hasLoaded, keepLoaded, delay, onLoad]
  );

  const { ref, isIntersecting } = useIntersectionObserver<T>({
    rootMargin,
    threshold,
    freezeOnceVisible: keepLoaded,
    onChange: handleIntersectionChange,
    ...observerOptions
  });

  const triggerLoad = useCallback(() => {
    setHasLoaded(true);
    setShouldLoad(true);
    onLoad?.();
  }, [onLoad]);

  const reset = useCallback(() => {
    setHasLoaded(false);
    setShouldLoad(false);
  }, []);

  return {
    ref,
    shouldLoad: shouldLoad || isIntersecting,
    hasLoaded,
    isInViewport: isIntersecting,
    triggerLoad,
    reset
  };
}

/**
 * useLazyLoadMultiple - Efficiently lazy load multiple items
 *
 * Uses a single IntersectionObserver for all items (performance optimization).
 *
 * @example
 * const { refs, loadedItems } = useLazyLoadMultiple(items.length);
 * return items.map((item, i) => (
 *   <div key={item.id} ref={el => refs.current[i] = el}>
 *     {loadedItems[i] ? <Card data={item} /> : <Skeleton />}
 *   </div>
 * ));
 */
export function useLazyLoadMultiple<T extends Element = HTMLDivElement>(
  count: number,
  options: Omit<UseLazyLoadOptions, 'onLoad'> & {
    onItemLoad?: (index: number) => void;
  } = {}
): {
  refs: React.MutableRefObject<(T | null)[]>;
  loadedItems: boolean[];
  allLoaded: boolean;
  loadAll: () => void;
} {
  const {
    rootMargin = '100px',
    threshold = 0,
    keepLoaded = true,
    onItemLoad
  } = options;

  const refs = useState(() => ({ current: new Array<T | null>(count).fill(null) }))[0];
  const [loadedItems, setLoadedItems] = useState<boolean[]>(() => new Array(count).fill(false));

  // Single observer for all items
  useState(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setLoadedItems(new Array(count).fill(true));
      return null;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = refs.current.findIndex((el) => el === entry.target);
            if (index !== -1) {
              setLoadedItems((prev) => {
                if (prev[index]) return prev; // Already loaded
                const next = [...prev];
                next[index] = true;
                return next;
              });
              onItemLoad?.(index);

              if (keepLoaded) {
                observer.unobserve(entry.target);
              }
            }
          }
        });
      },
      { rootMargin, threshold }
    );

    // Observe when refs are set
    const checkAndObserve = () => {
      refs.current.forEach((el) => {
        if (el) observer.observe(el);
      });
    };

    // Use RAF to wait for refs to be populated
    requestAnimationFrame(checkAndObserve);

    return () => observer.disconnect();
  });

  const loadAll = useCallback(() => {
    setLoadedItems(new Array(count).fill(true));
  }, [count]);

  return {
    refs,
    loadedItems,
    allLoaded: loadedItems.every(Boolean),
    loadAll
  };
}

export default useLazyLoad;
