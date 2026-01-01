/**
 * Cache Middleware
 *
 * Provides caching functionality for Express routes
 * Supports:
 * - Automatic cache key generation from request URL + query params
 * - Configurable TTL per route
 * - Cache invalidation
 * - Cache bypass for authenticated admin users
 */

import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet, CACHE_TTL } from '../config/redis';
import { logger } from '../utils/logger';
import { AuthRequest } from './auth';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
}

/**
 * Generate cache key from request
 */
const defaultKeyGenerator = (req: Request): string => {
  const { path, query } = req;

  // Sort query params for consistent cache keys
  const sortedQuery = Object.keys(query)
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');

  return sortedQuery ? `${path}?${sortedQuery}` : path;
};

/**
 * Cache middleware factory
 *
 * @example
 * router.get('/categories', cacheMiddleware({ ttl: 3600 }), getCategories);
 *
 * @param options - Cache configuration
 * @returns Express middleware
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const {
    ttl = CACHE_TTL.LISTINGS,
    keyGenerator = defaultKeyGenerator,
    skipCache = () => false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip cache if requested
    if (skipCache(req)) {
      return next();
    }

    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator(req);

      // Try to get from cache
      const cached = await cacheGet<unknown>(cacheKey);

      if (cached) {
        logger.debug(`✅ Cache HIT for key: ${cacheKey}`);

        // Add cache header
        res.set('X-Cache', 'HIT');

        return res.json(cached);
      }

      logger.debug(`❌ Cache MISS for key: ${cacheKey}`);

      // Add cache header
      res.set('X-Cache', 'MISS');

      // Intercept res.json to cache the response
      const originalJson = res.json.bind(res);

      res.json = function<T> (body: T) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache asynchronously (don't block response)
          cacheSet(cacheKey, body, ttl).catch(err => {
            logger.error('Failed to cache response:', err);
          });
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      // Don't block request on cache errors
      next();
    }
  };
};

/**
 * Skip cache for admin users (always serve fresh data)
 */
export const skipCacheForAdmin = (req: Request): boolean => {
  const authReq = req as AuthRequest;
  return authReq.user?.role === 'admin' || authReq.user?.role === 'moderator';
};

/**
 * Categories cache middleware (1 hour TTL)
 */
export const categoriesCache = cacheMiddleware({
  ttl: CACHE_TTL.CATEGORIES,
  keyGenerator: () => 'categories:all',
});

/**
 * Dashboard stats cache middleware (5 minutes TTL)
 * Admins always get fresh data
 */
export const dashboardStatsCache = cacheMiddleware({
  ttl: CACHE_TTL.DASHBOARD_STATS,
  keyGenerator: () => 'dashboard:stats',
  skipCache: skipCacheForAdmin,
});

/**
 * Listings cache middleware (15 minutes TTL)
 * Cache key includes status, page, limit, and filters
 */
export const listingsCache = (ttl: number = CACHE_TTL.LISTINGS) =>
  cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const { path, query } = req;
      const { status, page, limit, category_id, zone, search } = query;

      // Build deterministic cache key
      const keyParts = [path];
      if (status) keyParts.push(`s=${status}`);
      if (page) keyParts.push(`p=${page}`);
      if (limit) keyParts.push(`l=${limit}`);
      if (category_id) keyParts.push(`c=${category_id}`);
      if (zone) keyParts.push(`z=${zone}`);
      if (search) keyParts.push(`q=${search}`);

      return keyParts.join(':');
    },
  });

/**
 * Detail page cache middleware (10 minutes TTL)
 * Cache key is the resource ID
 */
export const detailCache = (resourceType: string, ttl: number = CACHE_TTL.DETAIL) =>
  cacheMiddleware({
    ttl,
    keyGenerator: (req) => `${resourceType}:${req.params.id}`,
  });

/**
 * User-specific cache middleware (5 minutes TTL)
 * Cache key includes user ID
 */
export const userCache = (ttl: number = CACHE_TTL.USER_DATA) =>
  cacheMiddleware({
    ttl,
    keyGenerator: (req) => {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id || 'anonymous';
      return `${req.path}:user:${userId}`;
    },
  });

/**
 * Conditional cache middleware
 * Only caches if condition is met
 */
export const conditionalCache = (
  condition: (req: Request) => boolean,
  options: CacheOptions = {}
) =>
  cacheMiddleware({
    ...options,
    skipCache: (req) => !condition(req),
  });
