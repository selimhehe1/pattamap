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
interface CacheOptions {
    ttl?: number;
    keyGenerator?: (req: Request) => string;
    skipCache?: (req: Request) => boolean;
}
/**
 * Cache middleware factory
 *
 * @example
 * router.get('/categories', cacheMiddleware({ ttl: 3600 }), getCategories);
 *
 * @param options - Cache configuration
 * @returns Express middleware
 */
export declare const cacheMiddleware: (options?: CacheOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Skip cache for admin users (always serve fresh data)
 */
export declare const skipCacheForAdmin: (req: Request) => boolean;
/**
 * Categories cache middleware (1 hour TTL)
 */
export declare const categoriesCache: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Dashboard stats cache middleware (5 minutes TTL)
 * Admins always get fresh data
 */
export declare const dashboardStatsCache: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Listings cache middleware (15 minutes TTL)
 * Cache key includes status, page, limit, and filters
 */
export declare const listingsCache: (ttl?: number) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Detail page cache middleware (10 minutes TTL)
 * Cache key is the resource ID
 */
export declare const detailCache: (resourceType: string, ttl?: number) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * User-specific cache middleware (5 minutes TTL)
 * Cache key includes user ID
 */
export declare const userCache: (ttl?: number) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Conditional cache middleware
 * Only caches if condition is met
 */
export declare const conditionalCache: (condition: (req: Request) => boolean, options?: CacheOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export {};
//# sourceMappingURL=cache.d.ts.map