import { useState, useCallback, useRef, CSSProperties } from 'react';

interface PinchState {
  initialDistance: number;
  initialScale: number;
}

interface Position {
  x: number;
  y: number;
}

interface PanState {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
}

export interface UsePinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  doubleTapScale?: number;
  doubleTapDelay?: number;
}

export interface UsePinchZoomReturn {
  scale: number;
  position: Position;
  isZoomed: boolean;
  resetZoom: () => void;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  style: CSSProperties;
}

/**
 * Calculate distance between two touch points
 */
function getDistance(touch1: React.Touch, touch2: React.Touch): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * usePinchZoom - Hook for pinch-to-zoom and double-tap zoom gestures
 *
 * @param options Configuration options
 * @param options.minScale Minimum zoom level (default: 1)
 * @param options.maxScale Maximum zoom level (default: 3)
 * @param options.doubleTapScale Zoom level on double-tap (default: 2)
 * @param options.doubleTapDelay Max delay between taps in ms (default: 300)
 *
 * @example
 * const { handlers, style, isZoomed, resetZoom } = usePinchZoom();
 *
 * return (
 *   <div {...handlers}>
 *     <img style={style} src="..." />
 *   </div>
 * );
 */
export function usePinchZoom(options: UsePinchZoomOptions = {}): UsePinchZoomReturn {
  const {
    minScale = 1,
    maxScale = 3,
    doubleTapScale = 2,
    doubleTapDelay = 300,
  } = options;

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });

  const pinchRef = useRef<PinchState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const lastTapRef = useRef<number>(0);
  const isPinchingRef = useRef(false);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Double-tap detection (single finger)
    if (e.touches.length === 1) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;

      if (timeSinceLastTap < doubleTapDelay && timeSinceLastTap > 50) {
        // Double tap detected
        e.preventDefault();
        if (scale > 1) {
          // Already zoomed -> reset
          resetZoom();
        } else {
          // Not zoomed -> zoom in
          setScale(doubleTapScale);
          setPosition({ x: 0, y: 0 });
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      // Start pan if zoomed
      if (scale > 1) {
        const touch = e.touches[0];
        panRef.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          lastX: position.x,
          lastY: position.y,
        };
      }
    }

    // Pinch start (two fingers)
    if (e.touches.length === 2) {
      e.preventDefault();
      isPinchingRef.current = true;
      const distance = getDistance(e.touches[0], e.touches[1]);

      pinchRef.current = {
        initialDistance: distance,
        initialScale: scale,
      };
    }
  }, [scale, position, doubleTapDelay, doubleTapScale, resetZoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Pinch zoom (two fingers)
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();

      const distance = getDistance(e.touches[0], e.touches[1]);
      const scaleChange = distance / pinchRef.current.initialDistance;
      let newScale = pinchRef.current.initialScale * scaleChange;

      // Clamp scale between min and max
      newScale = Math.min(Math.max(newScale, minScale), maxScale);
      setScale(newScale);

      // Reset position when zooming out to prevent image going off screen
      if (newScale <= 1.05) {
        setPosition({ x: 0, y: 0 });
      }
    }

    // Pan while zoomed (single finger)
    if (e.touches.length === 1 && panRef.current && scale > 1 && !isPinchingRef.current) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - panRef.current.startX;
      const deltaY = touch.clientY - panRef.current.startY;

      // Calculate new position
      let newX = panRef.current.lastX + deltaX;
      let newY = panRef.current.lastY + deltaY;

      // Limit pan to prevent image going too far off screen
      // Allow panning up to half the zoomed content
      const maxPan = 150 * (scale - 1);
      newX = Math.min(Math.max(newX, -maxPan), maxPan);
      newY = Math.min(Math.max(newY, -maxPan), maxPan);

      setPosition({ x: newX, y: newY });
    }
  }, [scale, minScale, maxScale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // If we had 2 fingers and now have less, end pinch
    if (e.touches.length < 2) {
      pinchRef.current = null;
      isPinchingRef.current = false;
    }

    // End pan
    if (e.touches.length === 0) {
      panRef.current = null;

      // Snap to 1 if close to unzoomed state
      if (scale < 1.1) {
        resetZoom();
      }
    }
  }, [scale, resetZoom]);

  // Generate transform style
  const style: CSSProperties = {
    transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
    transformOrigin: 'center center',
    transition: pinchRef.current || panRef.current ? 'none' : 'transform 0.2s ease-out',
    touchAction: scale > 1 ? 'none' : 'pan-y',
    willChange: 'transform',
  };

  return {
    scale,
    position,
    isZoomed: scale > 1,
    resetZoom,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    style,
  };
}

export default usePinchZoom;
