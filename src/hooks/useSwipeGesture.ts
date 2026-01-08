import { useState, useCallback, useRef } from 'react';

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
}

export interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  velocityThreshold?: number;
  disabled?: boolean;
}

export interface UseSwipeGestureReturn {
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  isSwiping: boolean;
}

/**
 * useSwipeGesture - Hook for detecting horizontal swipe gestures
 *
 * @param options Configuration options
 * @param options.onSwipeLeft Callback when user swipes left
 * @param options.onSwipeRight Callback when user swipes right
 * @param options.threshold Minimum distance in px to trigger swipe (default: 50)
 * @param options.velocityThreshold Minimum velocity to trigger swipe (default: 0.3)
 * @param options.disabled Disable swipe detection (useful when zoomed)
 *
 * @example
 * const { handlers } = useSwipeGesture({
 *   onSwipeLeft: () => goToNext(),
 *   onSwipeRight: () => goToPrevious(),
 * });
 *
 * return <div {...handlers}>Content</div>;
 */
export function useSwipeGesture(options: UseSwipeGestureOptions): UseSwipeGestureReturn {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    velocityThreshold = 0.3,
    disabled = false,
  } = options;

  const [isSwiping, setIsSwiping] = useState(false);
  const swipeRef = useRef<SwipeState | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only track single finger touches
    if (disabled || e.touches.length !== 1) return;

    const touch = e.touches[0];
    swipeRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      startTime: Date.now(),
    };
    setIsSwiping(true);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || !swipeRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    swipeRef.current.currentX = touch.clientX;
    swipeRef.current.currentY = touch.clientY;

    // Calculate if movement is more horizontal than vertical
    const deltaX = Math.abs(touch.clientX - swipeRef.current.startX);
    const deltaY = Math.abs(touch.clientY - swipeRef.current.startY);

    // If horizontal movement is predominant, prevent default scroll
    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault();
    }
  }, [disabled]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (disabled || !swipeRef.current) {
      setIsSwiping(false);
      return;
    }

    const { startX, currentX, startY, currentY, startTime } = swipeRef.current;
    const deltaX = currentX - startX;
    const deltaY = Math.abs(currentY - startY);
    const deltaTime = Date.now() - startTime;
    const velocity = Math.abs(deltaX) / deltaTime;

    // Only trigger if horizontal movement > vertical movement
    const isHorizontal = Math.abs(deltaX) > deltaY;

    // Swipe is valid if: distance is sufficient OR velocity is sufficient
    // AND movement is predominantly horizontal
    if (isHorizontal && (Math.abs(deltaX) > threshold || velocity > velocityThreshold)) {
      if (deltaX < 0) {
        // Swiped left -> go to next
        onSwipeLeft?.();
      } else {
        // Swiped right -> go to previous
        onSwipeRight?.();
      }
    }

    swipeRef.current = null;
    setIsSwiping(false);
  }, [disabled, threshold, velocityThreshold, onSwipeLeft, onSwipeRight]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    isSwiping,
  };
}

export default useSwipeGesture;
