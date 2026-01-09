import { useCallback, useRef, CSSProperties } from 'react';
import { useSwipeGesture } from './useSwipeGesture';
import { usePinchZoom, UsePinchZoomOptions } from './usePinchZoom';

export interface UseGalleryGesturesOptions {
  onNext: () => void;
  onPrevious: () => void;
  swipeThreshold?: number;
  pinchOptions?: UsePinchZoomOptions;
}

export interface UseGalleryGesturesReturn {
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  imageStyle: CSSProperties;
  isZoomed: boolean;
  resetZoom: () => void;
}

/**
 * useGalleryGestures - Composite hook combining swipe and pinch-to-zoom for photo galleries
 *
 * Handles the conflict between swipe (1 finger) and pinch (2 fingers):
 * - When not zoomed: swipe navigates between photos
 * - When zoomed: single finger pans the image, swipe is disabled
 * - Pinch always works for zooming
 *
 * @param options Configuration options
 * @param options.onNext Callback to go to next photo (triggered by swipe left)
 * @param options.onPrevious Callback to go to previous photo (triggered by swipe right)
 * @param options.swipeThreshold Minimum swipe distance in px (default: 50)
 * @param options.pinchOptions Options for pinch zoom behavior
 *
 * @example
 * const { handlers, imageStyle, isZoomed, resetZoom } = useGalleryGestures({
 *   onNext: () => setCurrentIndex(i => i + 1),
 *   onPrevious: () => setCurrentIndex(i => i - 1),
 * });
 *
 * // Reset zoom when photo changes
 * useEffect(() => { resetZoom(); }, [currentIndex, resetZoom]);
 *
 * return (
 *   <div {...handlers}>
 *     <img style={imageStyle} src={photos[currentIndex]} />
 *   </div>
 * );
 */
export function useGalleryGestures(options: UseGalleryGesturesOptions): UseGalleryGesturesReturn {
  const { onNext, onPrevious, swipeThreshold = 50, pinchOptions } = options;

  const touchCountRef = useRef(0);
  const gestureStartedWithTwoFingersRef = useRef(false);

  // Pinch zoom hook
  const pinch = usePinchZoom(pinchOptions);

  // Swipe hook - disabled when zoomed to allow panning
  const swipe = useSwipeGesture({
    onSwipeLeft: onNext,
    onSwipeRight: onPrevious,
    threshold: swipeThreshold,
    disabled: pinch.isZoomed,
  });

  // Combined touch start handler
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchCountRef.current = e.touches.length;
    gestureStartedWithTwoFingersRef.current = e.touches.length >= 2;

    if (e.touches.length >= 2) {
      // Pinch takes priority with 2 fingers
      pinch.handlers.onTouchStart(e);
    } else if (!pinch.isZoomed) {
      // Swipe only when not zoomed (single finger)
      swipe.handlers.onTouchStart(e);
      // Also track for double-tap zoom
      pinch.handlers.onTouchStart(e);
    } else {
      // Pan when zoomed (single finger)
      pinch.handlers.onTouchStart(e);
    }
  }, [pinch, swipe]);

  // Combined touch move handler
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // If gesture started with 2 fingers or currently has 2 fingers, use pinch
    if (e.touches.length >= 2 || gestureStartedWithTwoFingersRef.current || pinch.isZoomed) {
      pinch.handlers.onTouchMove(e);
    } else {
      // Single finger, not zoomed -> swipe
      swipe.handlers.onTouchMove(e);
    }
  }, [pinch, swipe]);

  // Combined touch end handler
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    pinch.handlers.onTouchEnd(e);
    swipe.handlers.onTouchEnd(e);

    touchCountRef.current = e.touches.length;

    // Reset two-finger flag when all fingers lifted
    if (e.touches.length === 0) {
      gestureStartedWithTwoFingersRef.current = false;
    }
  }, [pinch, swipe]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    imageStyle: pinch.style,
    isZoomed: pinch.isZoomed,
    resetZoom: pinch.resetZoom,
  };
}

export default useGalleryGestures;
