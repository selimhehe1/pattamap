/**
 * Redis Configuration for Caching
 *
 * Provides caching layer for frequently accessed data:
 * - Categories (TTL: 1 hour)
 * - Dashboard stats (TTL: 5 minutes)
 * - Popular listings (TTL: 15 minutes)
 *
 * Uses ioredis with fallback to in-memory cache if Redis unavailable
 */
import Redis from 'ioredis';
declare class MemoryCache {
    private cache;
    private cleanupInterval;
    constructor();
    private cleanup;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
    del(key: string | string[]): Promise<void>;
    flushall(): Promise<void>;
    destroy(): void;
}
/**
 * Initialize Redis connection
 * Falls back to in-memory cache if Redis unavailable
 */
export declare const initRedis: () => Promise<void>;
/**
 * Get Redis client instance
 */
export declare const getRedisClient: () => Redis | MemoryCache;
/**
 * Check if Redis is available
 */
export declare const isRedisConnected: () => boolean;
/**
 * Cache key prefixes for different data types
 */
export declare const CACHE_KEYS: {
    CATEGORIES: string;
    DASHBOARD_STATS: string;
    ESTABLISHMENTS_LIST: (status: string, page: number, limit: number) => string;
    ESTABLISHMENT: (id: string) => string;
    EMPLOYEES_LIST: (status: string, page: number, limit: number) => string;
    EMPLOYEE: (id: string) => string;
    USER_RATING: (employeeId: string, userId: string) => string;
};
/**
 * Cache TTL (Time-To-Live) in seconds
 */
export declare const CACHE_TTL: {
    CATEGORIES: number;
    DASHBOARD_STATS: number;
    LISTINGS: number;
    DETAIL: number;
    USER_DATA: number;
};
/**
 * Get value from cache
 */
export declare const cacheGet: <T>(key: string) => Promise<T | null>;
/**
 * Set value in cache with TTL
 */
export declare const cacheSet: <T>(key: string, value: T, ttl?: number) => Promise<void>;
/**
 * Delete value(s) from cache
 */
export declare const cacheDel: (key: string | string[]) => Promise<void>;
/**
 * Invalidate cache by pattern
 * WARNING: Only works with real Redis, not MemoryCache
 */
export declare const cacheInvalidatePattern: (pattern: string) => Promise<void>;
/**
 * Clear all cache (use with caution!)
 */
export declare const cacheClear: () => Promise<void>;
/**
 * Gracefully close Redis connection
 */
export declare const closeRedis: () => Promise<void>;
export {};
//# sourceMappingURL=redis.d.ts.map