"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedis = exports.cacheClear = exports.cacheInvalidatePattern = exports.cacheDel = exports.cacheSet = exports.cacheGet = exports.CACHE_TTL = exports.CACHE_KEYS = exports.isRedisConnected = exports.getRedisClient = exports.initRedis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
// In-memory fallback cache for development/when Redis is unavailable
class MemoryCache {
    constructor() {
        this.cache = new Map();
        // Clean up expired entries every minute
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60 * 1000);
    }
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt < now) {
                this.cache.delete(key);
            }
        }
    }
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    async set(key, value, ttlSeconds) {
        const expiresAt = Date.now() + (ttlSeconds * 1000);
        this.cache.set(key, { value, expiresAt });
    }
    async del(key) {
        const keys = Array.isArray(key) ? key : [key];
        keys.forEach(k => this.cache.delete(k));
    }
    async flushall() {
        this.cache.clear();
    }
    destroy() {
        clearInterval(this.cleanupInterval);
        this.cache.clear();
    }
}
// Redis client instance
let redisClient;
let isRedisAvailable = false;
/**
 * Initialize Redis connection
 * Falls back to in-memory cache if Redis unavailable
 */
const initRedis = async () => {
    const redisUrl = process.env.REDIS_URL;
    const useRedis = process.env.USE_REDIS === 'true';
    // If Redis is disabled or no URL provided, use memory cache
    if (!useRedis || !redisUrl) {
        logger_1.logger.info('ℹ️  Redis disabled, using in-memory cache fallback');
        redisClient = new MemoryCache();
        isRedisAvailable = false;
        return;
    }
    try {
        // Initialize Redis client
        const redis = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            reconnectOnError(err) {
                logger_1.logger.error('Redis reconnection error:', err);
                return true;
            },
        });
        // Test connection
        await redis.ping();
        redisClient = redis;
        isRedisAvailable = true;
        logger_1.logger.info('✅ Redis connected successfully');
        // Handle connection errors
        redis.on('error', (err) => {
            logger_1.logger.error('Redis error:', err);
            // Fall back to memory cache on persistent errors
            if (!isRedisAvailable) {
                logger_1.logger.warn('⚠️  Falling back to in-memory cache');
                redisClient = new MemoryCache();
            }
        });
        redis.on('ready', () => {
            isRedisAvailable = true;
            logger_1.logger.info('✅ Redis ready');
        });
        redis.on('close', () => {
            isRedisAvailable = false;
            logger_1.logger.warn('⚠️  Redis connection closed');
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to connect to Redis, using in-memory cache:', error);
        redisClient = new MemoryCache();
        isRedisAvailable = false;
    }
};
exports.initRedis = initRedis;
/**
 * Get Redis client instance
 */
const getRedisClient = () => {
    if (!redisClient) {
        throw new Error('Redis not initialized. Call initRedis() first');
    }
    return redisClient;
};
exports.getRedisClient = getRedisClient;
/**
 * Check if Redis is available
 */
const isRedisConnected = () => {
    return isRedisAvailable;
};
exports.isRedisConnected = isRedisConnected;
/**
 * Cache key prefixes for different data types
 */
exports.CACHE_KEYS = {
    CATEGORIES: 'categories',
    DASHBOARD_STATS: 'dashboard:stats',
    ESTABLISHMENTS_LIST: (status, page, limit) => `establishments:${status}:p${page}:l${limit}`,
    ESTABLISHMENT: (id) => `establishment:${id}`,
    EMPLOYEES_LIST: (status, page, limit) => `employees:${status}:p${page}:l${limit}`,
    EMPLOYEE: (id) => `employee:${id}`,
    USER_RATING: (employeeId, userId) => `rating:${employeeId}:${userId}`,
};
/**
 * Cache TTL (Time-To-Live) in seconds
 */
exports.CACHE_TTL = {
    CATEGORIES: 60 * 60, // 1 hour
    DASHBOARD_STATS: 5 * 60, // 5 minutes
    LISTINGS: 15 * 60, // 15 minutes
    DETAIL: 10 * 60, // 10 minutes
    USER_DATA: 5 * 60, // 5 minutes
};
/**
 * Get value from cache
 */
const cacheGet = async (key) => {
    try {
        // Safety check: return null if Redis not initialized
        if (!redisClient) {
            logger_1.logger.warn('Redis client not initialized, cache GET skipped');
            return null;
        }
        const cached = await redisClient.get(key);
        if (!cached)
            return null;
        return JSON.parse(cached);
    }
    catch (error) {
        logger_1.logger.error(`Cache get error for key ${key}:`, error);
        return null;
    }
};
exports.cacheGet = cacheGet;
/**
 * Set value in cache with TTL
 */
const cacheSet = async (key, value, ttl = exports.CACHE_TTL.LISTINGS) => {
    try {
        // Safety check: skip if Redis not initialized
        if (!redisClient) {
            logger_1.logger.warn('Redis client not initialized, cache SET skipped');
            return;
        }
        const serialized = JSON.stringify(value);
        if (isRedisAvailable && redisClient instanceof ioredis_1.default) {
            await redisClient.setex(key, ttl, serialized);
        }
        else {
            // MemoryCache uses async set with (key, value, ttlSeconds)
            await redisClient.set(key, serialized, ttl);
        }
    }
    catch (error) {
        logger_1.logger.error(`Cache set error for key ${key}:`, error);
    }
};
exports.cacheSet = cacheSet;
/**
 * Delete value(s) from cache
 */
const cacheDel = async (key) => {
    try {
        const keys = Array.isArray(key) ? key : [key];
        if (isRedisAvailable && redisClient instanceof ioredis_1.default) {
            // Redis.del() expects rest parameters: del(...keys)
            await redisClient.del(...keys);
        }
        else {
            // MemoryCache.del() accepts string | string[]
            await redisClient.del(keys);
        }
    }
    catch (error) {
        logger_1.logger.error(`Cache delete error for key ${key}:`, error);
    }
};
exports.cacheDel = cacheDel;
/**
 * Invalidate cache by pattern
 * WARNING: Only works with real Redis, not MemoryCache
 */
const cacheInvalidatePattern = async (pattern) => {
    if (!isRedisAvailable || !(redisClient instanceof ioredis_1.default)) {
        logger_1.logger.warn('Pattern invalidation only works with Redis, skipping');
        return;
    }
    try {
        const stream = redisClient.scanStream({
            match: pattern,
            count: 100,
        });
        const keys = [];
        stream.on('data', (resultKeys) => {
            keys.push(...resultKeys);
        });
        await new Promise((resolve, reject) => {
            stream.on('end', resolve);
            stream.on('error', reject);
        });
        if (keys.length > 0) {
            await redisClient.del(...keys);
            logger_1.logger.info(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
        }
    }
    catch (error) {
        logger_1.logger.error(`Cache pattern invalidation error for pattern ${pattern}:`, error);
    }
};
exports.cacheInvalidatePattern = cacheInvalidatePattern;
/**
 * Clear all cache (use with caution!)
 */
const cacheClear = async () => {
    try {
        await redisClient.flushall();
        logger_1.logger.info('✅ Cache cleared');
    }
    catch (error) {
        logger_1.logger.error('Cache clear error:', error);
    }
};
exports.cacheClear = cacheClear;
/**
 * Gracefully close Redis connection
 */
const closeRedis = async () => {
    if (redisClient instanceof ioredis_1.default) {
        await redisClient.quit();
        logger_1.logger.info('✅ Redis connection closed');
    }
    else if (redisClient instanceof MemoryCache) {
        redisClient.destroy();
        logger_1.logger.info('✅ Memory cache cleared');
    }
};
exports.closeRedis = closeRedis;
//# sourceMappingURL=redis.js.map