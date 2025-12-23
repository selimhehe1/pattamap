/**
 * useScrollAnimation hook
 * Uses IntersectionObserver for performant scroll-based animations
 *
 * Features:
 * - Lazy triggering of animations when elements enter viewport
 * - Respects prefers-reduced-motion
 * - Configurable threshold and root margin
 * - Memory efficient with proper cleanup
 *
 * @example
 * const { ref, isVisible } = useScrollAnimation();
 * return <div ref={ref} className={isVisible ? 'animate-in' : ''}>Content</div>;
 *
 * @example with options
 * const { ref, isVisible } = useScrollAnimation({
 *   threshold: 0.5,
 *   triggerOnce: true,
 *   rootMargin: '100px'
 * });
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseScrollAnimationOptions {
  /** Percentage of element visible to trigger (0-1). Default: 0.1 */
  threshold?: number;
  /** Only trigger animation once. Default: true */
  triggerOnce?: boolean;
  /** Margin around root. Default: '0px' */
  rootMargin?: string;
  /** Initial visibility state. Default: false */
  initialVisible?: boolean;
  /** Disable animation (e.g., for prefers-reduced-motion). Default: auto-detect */
  disabled?: boolean;
}

interface UseScrollAnimationReturn<T extends HTMLElement> {
  /** Ref to attach to the target element */
  ref: React.RefObject<T | null>;
  /** Whether the element is currently visible/has been triggered */
  isVisible: boolean;
  /** Manually set visibility (useful for programmatic control) */
  setVisible: (visible: boolean) => void;
}

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollAnimationOptions = {}
): UseScrollAnimationReturn<T> {
  const {
    threshold = 0.1,
    triggerOnce = true,
    rootMargin = '0px',
    initialVisible = false,
    disabled
  } = options;

  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(initialVisible);
  const hasTriggered = useRef(false);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    : false;

  const isDisabled = disabled ?? prefersReducedMotion;

  const setVisible = useCallback((visible: boolean) => {
    setIsVisible(visible);
  }, []);

  useEffect(() => {
    // If disabled or already triggered (for triggerOnce), skip
    if (isDisabled) {
      setIsVisible(true);
      return;
    }

    if (triggerOnce && hasTriggered.current) {
      return;
    }

    const element = ref.current;
    if (!element) return;

    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            hasTriggered.current = true;

            if (triggerOnce) {
              observer.unobserve(entry.target);
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, isDisabled]);

  return { ref, isVisible, setVisible };
}

/**
 * useScrollAnimations hook for multiple elements
 * Efficiently observes multiple elements with a single IntersectionObserver
 *
 * @example
 * const { refs, visibleItems, isAllVisible } = useScrollAnimations(items.length);
 * return items.map((item, i) => (
 *   <div key={item.id} ref={refs[i]} className={visibleItems[i] ? 'animate-in' : ''}>
 *     {item.content}
 *   </div>
 * ));
 */
export function useScrollAnimations(
  count: number,
  options: UseScrollAnimationOptions = {}
): {
  refs: React.RefObject<HTMLElement | null>[];
  visibleItems: boolean[];
  isAllVisible: boolean;
} {
  const {
    threshold = 0.1,
    triggerOnce = true,
    rootMargin = '0px'
  } = options;

  const refs = useRef<(HTMLElement | null)[]>(new Array(count).fill(null));
  const [visibleItems, setVisibleItems] = useState<boolean[]>(new Array(count).fill(false));

  // Create stable refs array
  const refArray = useRef<React.RefObject<HTMLElement | null>[]>(
    Array.from({ length: count }, () => ({ current: null }))
  );

  useEffect(() => {
    // Ensure refs array matches count
    if (refArray.current.length !== count) {
      refArray.current = Array.from({ length: count }, (_, i) =>
        refArray.current[i] || { current: null }
      );
    }
  }, [count]);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setVisibleItems(new Array(count).fill(true));
      return;
    }

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setVisibleItems(new Array(count).fill(true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleItems(prev => {
          const next = [...prev];
          entries.forEach(entry => {
            const index = refs.current.findIndex(el => el === entry.target);
            if (index !== -1) {
              if (entry.isIntersecting) {
                next[index] = true;
                if (triggerOnce) {
                  observer.unobserve(entry.target);
                }
              } else if (!triggerOnce) {
                next[index] = false;
              }
            }
          });
          return next;
        });
      },
      { threshold, rootMargin }
    );

    // Observe all elements
    refArray.current.forEach((ref) => {
      if (ref.current) {
        refs.current.push(ref.current);
        observer.observe(ref.current);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [count, threshold, rootMargin, triggerOnce]);

  const isAllVisible = visibleItems.every(Boolean);

  return { refs: refArray.current, visibleItems, isAllVisible };
}

export default useScrollAnimation;
