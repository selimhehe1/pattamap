"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.conditionalCache = exports.userCache = exports.detailCache = exports.listingsCache = exports.dashboardStatsCache = exports.categoriesCache = exports.skipCacheForAdmin = exports.cacheMiddleware = void 0;
const redis_1 = require("../config/redis");
const logger_1 = require("../utils/logger");
/**
 * Generate cache key from request
 */
const defaultKeyGenerator = (req) => {
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
const cacheMiddleware = (options = {}) => {
    const { ttl = redis_1.CACHE_TTL.LISTINGS, keyGenerator = defaultKeyGenerator, skipCache = () => false, } = options;
    return async (req, res, next) => {
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
            const cached = await (0, redis_1.cacheGet)(cacheKey);
            if (cached) {
                logger_1.logger.debug(`✅ Cache HIT for key: ${cacheKey}`);
                // Add cache header
                res.set('X-Cache', 'HIT');
                return res.json(cached);
            }
            logger_1.logger.debug(`❌ Cache MISS for key: ${cacheKey}`);
            // Add cache header
            res.set('X-Cache', 'MISS');
            // Intercept res.json to cache the response
            const originalJson = res.json.bind(res);
            res.json = function (body) {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    // Cache asynchronously (don't block response)
                    (0, redis_1.cacheSet)(cacheKey, body, ttl).catch(err => {
                        logger_1.logger.error('Failed to cache response:', err);
                    });
                }
                return originalJson(body);
            };
            next();
        }
        catch (error) {
            logger_1.logger.error('Cache middleware error:', error);
            // Don't block request on cache errors
            next();
        }
    };
};
exports.cacheMiddleware = cacheMiddleware;
/**
 * Skip cache for admin users (always serve fresh data)
 */
const skipCacheForAdmin = (req) => {
    const authReq = req;
    return authReq.user?.role === 'admin' || authReq.user?.role === 'moderator';
};
exports.skipCacheForAdmin = skipCacheForAdmin;
/**
 * Categories cache middleware (1 hour TTL)
 */
exports.categoriesCache = (0, exports.cacheMiddleware)({
    ttl: redis_1.CACHE_TTL.CATEGORIES,
    keyGenerator: () => 'categories:all',
});
/**
 * Dashboard stats cache middleware (5 minutes TTL)
 * Admins always get fresh data
 */
exports.dashboardStatsCache = (0, exports.cacheMiddleware)({
    ttl: redis_1.CACHE_TTL.DASHBOARD_STATS,
    keyGenerator: () => 'dashboard:stats',
    skipCache: exports.skipCacheForAdmin,
});
/**
 * Listings cache middleware (15 minutes TTL)
 * Cache key includes status, page, limit, and filters
 */
const listingsCache = (ttl = redis_1.CACHE_TTL.LISTINGS) => (0, exports.cacheMiddleware)({
    ttl,
    keyGenerator: (req) => {
        const { path, query } = req;
        const { status, page, limit, category_id, zone, search } = query;
        // Build deterministic cache key
        const keyParts = [path];
        if (status)
            keyParts.push(`s=${status}`);
        if (page)
            keyParts.push(`p=${page}`);
        if (limit)
            keyParts.push(`l=${limit}`);
        if (category_id)
            keyParts.push(`c=${category_id}`);
        if (zone)
            keyParts.push(`z=${zone}`);
        if (search)
            keyParts.push(`q=${search}`);
        return keyParts.join(':');
    },
});
exports.listingsCache = listingsCache;
/**
 * Detail page cache middleware (10 minutes TTL)
 * Cache key is the resource ID
 */
const detailCache = (resourceType, ttl = redis_1.CACHE_TTL.DETAIL) => (0, exports.cacheMiddleware)({
    ttl,
    keyGenerator: (req) => `${resourceType}:${req.params.id}`,
});
exports.detailCache = detailCache;
/**
 * User-specific cache middleware (5 minutes TTL)
 * Cache key includes user ID
 */
const userCache = (ttl = redis_1.CACHE_TTL.USER_DATA) => (0, exports.cacheMiddleware)({
    ttl,
    keyGenerator: (req) => {
        const authReq = req;
        const userId = authReq.user?.id || 'anonymous';
        return `${req.path}:user:${userId}`;
    },
});
exports.userCache = userCache;
/**
 * Conditional cache middleware
 * Only caches if condition is met
 */
const conditionalCache = (condition, options = {}) => (0, exports.cacheMiddleware)({
    ...options,
    skipCache: (req) => !condition(req),
});
exports.conditionalCache = conditionalCache;
//# sourceMappingURL=cache.js.map