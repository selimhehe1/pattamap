/**
 * Route Preloader Utility
 *
 * Preloads lazy-loaded route components on hover to improve perceived performance.
 * When users hover over navigation links, the corresponding component chunk is fetched
 * in the background, making navigation feel instant when clicked.
 */

import { logger } from './logger';

// Cache for preloaded components to avoid duplicate fetches
const preloadedRoutes = new Set<string>();

/**
 * Preload a lazy-loaded component by triggering its dynamic import
 *
 * @param importFn - The lazy import function (e.g., () => import('./Component'))
 * @param routeName - Human-readable route name for logging
 */
export const preloadRoute = async (
  importFn: () => Promise<any>,
  routeName: string
): Promise<void> => {
  // Avoid duplicate preloads
  if (preloadedRoutes.has(routeName)) {
    logger.debug(`⚡ Route already preloaded: ${routeName}`);
    return;
  }

  try {
    logger.debug(`🔄 Preloading route: ${routeName}`);
    await importFn();
    preloadedRoutes.add(routeName);
    logger.debug(`✅ Route preloaded successfully: ${routeName}`);
  } catch (error) {
    logger.error(`❌ Failed to preload route: ${routeName}`, error);
  }
};

/**
 * Create a hover handler that preloads a route
 *
 * @param importFn - The lazy import function
 * @param routeName - Human-readable route name
 * @returns onMouseEnter handler function
 */
export const createPreloadHandler = (
  importFn: () => Promise<any>,
  routeName: string
) => {
  return () => preloadRoute(importFn, routeName);
};
