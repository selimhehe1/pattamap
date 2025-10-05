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
import { logger } from '../utils/logger';

// In-memory fallback cache for development/when Redis is unavailable
class MemoryCache {
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiresAt });
  }

  async del(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    keys.forEach(k => this.cache.delete(k));
  }

  async flushall(): Promise<void> {
    this.cache.clear();
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Redis client instance
let redisClient: Redis | MemoryCache;
let isRedisAvailable = false;

/**
 * Initialize Redis connection
 * Falls back to in-memory cache if Redis unavailable
 */
export const initRedis = async (): Promise<void> => {
  const redisUrl = process.env.REDIS_URL;
  const useRedis = process.env.USE_REDIS === 'true';

  // If Redis is disabled or no URL provided, use memory cache
  if (!useRedis || !redisUrl) {
    logger.info('ℹ️  Redis disabled, using in-memory cache fallback');
    redisClient = new MemoryCache();
    isRedisAvailable = false;
    return;
  }

  try {
    // Initialize Redis client
    const redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        logger.error('Redis reconnection error:', err);
        return true;
      },
    });

    // Test connection
    await redis.ping();

    redisClient = redis;
    isRedisAvailable = true;

    logger.info('✅ Redis connected successfully');

    // Handle connection errors
    redis.on('error', (err) => {
      logger.error('Redis error:', err);

      // Fall back to memory cache on persistent errors
      if (!isRedisAvailable) {
        logger.warn('⚠️  Falling back to in-memory cache');
        redisClient = new MemoryCache();
      }
    });

    redis.on('ready', () => {
      isRedisAvailable = true;
      logger.info('✅ Redis ready');
    });

    redis.on('close', () => {
      isRedisAvailable = false;
      logger.warn('⚠️  Redis connection closed');
    });

  } catch (error) {
    logger.error('Failed to connect to Redis, using in-memory cache:', error);
    redisClient = new MemoryCache();
    isRedisAvailable = false;
  }
};

/**
 * Get Redis client instance
 */
export const getRedisClient = (): Redis | MemoryCache => {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initRedis() first');
  }
  return redisClient;
};

/**
 * Check if Redis is available
 */
export const isRedisConnected = (): boolean => {
  return isRedisAvailable;
};

/**
 * Cache key prefixes for different data types
 */
export const CACHE_KEYS = {
  CATEGORIES: 'categories',
  DASHBOARD_STATS: 'dashboard:stats',
  ESTABLISHMENTS_LIST: (status: string, page: number, limit: number) =>
    `establishments:${status}:p${page}:l${limit}`,
  ESTABLISHMENT: (id: string) => `establishment:${id}`,
  EMPLOYEES_LIST: (status: string, page: number, limit: number) =>
    `employees:${status}:p${page}:l${limit}`,
  EMPLOYEE: (id: string) => `employee:${id}`,
  USER_RATING: (employeeId: string, userId: string) =>
    `rating:${employeeId}:${userId}`,
};

/**
 * Cache TTL (Time-To-Live) in seconds
 */
export const CACHE_TTL = {
  CATEGORIES: 60 * 60,        // 1 hour
  DASHBOARD_STATS: 5 * 60,    // 5 minutes
  LISTINGS: 15 * 60,          // 15 minutes
  DETAIL: 10 * 60,            // 10 minutes
  USER_DATA: 5 * 60,          // 5 minutes
};

/**
 * Get value from cache
 */
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const cached = await redisClient.get(key);
    if (!cached) return null;

    return JSON.parse(cached) as T;
  } catch (error) {
    logger.error(`Cache get error for key ${key}:`, error);
    return null;
  }
};

/**
 * Set value in cache with TTL
 */
export const cacheSet = async <T>(
  key: string,
  value: T,
  ttl: number = CACHE_TTL.LISTINGS
): Promise<void> => {
  try {
    const serialized = JSON.stringify(value);

    if (isRedisAvailable && redisClient instanceof Redis) {
      await redisClient.setex(key, ttl, serialized);
    } else {
      // MemoryCache uses async set with (key, value, ttlSeconds)
      await (redisClient as MemoryCache).set(key, serialized, ttl);
    }
  } catch (error) {
    logger.error(`Cache set error for key ${key}:`, error);
  }
};

/**
 * Delete value(s) from cache
 */
export const cacheDel = async (key: string | string[]): Promise<void> => {
  try {
    const keys = Array.isArray(key) ? key : [key];

    if (isRedisAvailable && redisClient instanceof Redis) {
      // Redis.del() expects rest parameters: del(...keys)
      await redisClient.del(...keys);
    } else {
      // MemoryCache.del() accepts string | string[]
      await (redisClient as MemoryCache).del(keys);
    }
  } catch (error) {
    logger.error(`Cache delete error for key ${key}:`, error);
  }
};

/**
 * Invalidate cache by pattern
 * WARNING: Only works with real Redis, not MemoryCache
 */
export const cacheInvalidatePattern = async (pattern: string): Promise<void> => {
  if (!isRedisAvailable || !(redisClient instanceof Redis)) {
    logger.warn('Pattern invalidation only works with Redis, skipping');
    return;
  }

  try {
    const stream = redisClient.scanStream({
      match: pattern,
      count: 100,
    });

    const keys: string[] = [];
    stream.on('data', (resultKeys: string[]) => {
      keys.push(...resultKeys);
    });

    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });

    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.info(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error(`Cache pattern invalidation error for pattern ${pattern}:`, error);
  }
};

/**
 * Clear all cache (use with caution!)
 */
export const cacheClear = async (): Promise<void> => {
  try {
    await redisClient.flushall();
    logger.info('✅ Cache cleared');
  } catch (error) {
    logger.error('Cache clear error:', error);
  }
};

/**
 * Gracefully close Redis connection
 */
export const closeRedis = async (): Promise<void> => {
  if (redisClient instanceof Redis) {
    await redisClient.quit();
    logger.info('✅ Redis connection closed');
  } else if (redisClient instanceof MemoryCache) {
    redisClient.destroy();
    logger.info('✅ Memory cache cleared');
  }
};
