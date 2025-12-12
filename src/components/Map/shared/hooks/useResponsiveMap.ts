import { useState, useEffect, useCallback } from 'react';
import { logger } from '../../../../utils/logger';

/**
 * Breakpoints for responsive map behavior
 */
export const MAP_BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

/**
 * Orientation types
 */
export type Orientation = 'portrait' | 'landscape';

/**
 * Return type for useResponsiveMap hook
 */
export interface UseResponsiveMapReturn {
  /** Whether the viewport is mobile-sized */
  isMobile: boolean;

  /** Whether the viewport is tablet-sized */
  isTablet: boolean;

  /** Whether the viewport is desktop-sized */
  isDesktop: boolean;

  /** Current screen orientation */
  orientation: Orientation;

  /** Current viewport width */
  viewportWidth: number;

  /** Current viewport height */
  viewportHeight: number;

  /** Force a manual update of dimensions */
  updateDimensions: () => void;
}

/**
 * useResponsiveMap - Hook for responsive map behavior
 *
 * Handles:
 * - Mobile/tablet/desktop detection
 * - Screen orientation changes
 * - Viewport dimension tracking
 * - Debounced resize events
 *
 * Previously duplicated ~40 lines across 9 map components.
 *
 * @example
 * const { isMobile, orientation, viewportWidth } = useResponsiveMap();
 *
 * // Use for conditional rendering
 * if (isMobile && orientation === 'portrait') {
 *   // Show vertical layout
 * }
 */
export const useResponsiveMap = (): UseResponsiveMapReturn => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 800
  );

  // Update all dimension-based states
  const updateDimensions = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    setViewportWidth(width);
    setViewportHeight(height);
    setIsMobile(width < MAP_BREAKPOINTS.mobile);
    setIsTablet(width >= MAP_BREAKPOINTS.mobile && width < MAP_BREAKPOINTS.tablet);
    setIsDesktop(width >= MAP_BREAKPOINTS.tablet);

    // Determine orientation
    const newOrientation: Orientation = height > width ? 'portrait' : 'landscape';
    setOrientation(newOrientation);

    logger.debug('[useResponsiveMap] Dimensions updated', {
      width,
      height,
      isMobile: width < MAP_BREAKPOINTS.mobile,
      orientation: newOrientation,
    });
  }, []);

  // Initialize and handle resize events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial calculation
    updateDimensions();

    // Debounced resize handler
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateDimensions, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [updateDimensions]);

  // Handle orientation change via matchMedia (more reliable than resize)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(orientation: portrait)');

    const handleOrientationChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const newOrientation: Orientation = e.matches ? 'portrait' : 'landscape';
      setOrientation(newOrientation);

      logger.debug('[useResponsiveMap] Orientation changed', {
        orientation: newOrientation,
        matches: e.matches,
      });

      // Also update dimensions on orientation change
      updateDimensions();
    };

    // Initial check
    handleOrientationChange(mediaQuery);

    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleOrientationChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleOrientationChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleOrientationChange);
      } else {
        mediaQuery.removeListener(handleOrientationChange);
      }
    };
  }, [updateDimensions]);

  return {
    isMobile,
    isTablet,
    isDesktop,
    orientation,
    viewportWidth,
    viewportHeight,
    updateDimensions,
  };
};

export default useResponsiveMap;
