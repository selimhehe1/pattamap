import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { getRedisClient, isRedisConnected } from '../config/redis';
import Redis from 'ioredis';

// Helper to safely access user from request (type augmentation workaround for ts-node)
const getUserId = (req: Request): string => {
  return (req as any).user?.id || 'anonymous';
};

// ==========================================
// 🛡️ Rate Limit Store Interface
// ==========================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface IRateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>;
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;
  decrement(key: string): Promise<void>;
}

// ==========================================
// 🗄️ Memory-based Rate Limit Store (Fallback)
// ==========================================

class MemoryRateLimitStore implements IRateLimitStore {
  private store: { [key: string]: RateLimitEntry } = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    }
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    const entry = this.store[key];
    if (!entry || entry.resetTime < Date.now()) {
      return null;
    }
    return entry;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const resetTime = now + windowMs;

    const existing = this.store[key];
    if (!existing || existing.resetTime < now) {
      this.store[key] = { count: 1, resetTime };
      return this.store[key];
    }

    existing.count++;
    return existing;
  }

  async decrement(key: string): Promise<void> {
    const entry = this.store[key];
    if (entry && entry.count > 0) {
      entry.count--;
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store = {};
  }
}

// ==========================================
// 🔴 Redis-based Rate Limit Store (Persistent)
// ==========================================

const RATE_LIMIT_PREFIX = 'ratelimit:';

class RedisRateLimitStore implements IRateLimitStore {
  async get(key: string): Promise<RateLimitEntry | null> {
    try {
      const client = getRedisClient();
      if (!(client instanceof Redis)) {
        return null;
      }

      const data = await client.get(`${RATE_LIMIT_PREFIX}${key}`);
      if (!data) return null;

      const entry = JSON.parse(data) as RateLimitEntry;
      if (entry.resetTime < Date.now()) {
        return null;
      }
      return entry;
    } catch (error) {
      logger.error('Redis rate limit get error:', error);
      return null;
    }
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    try {
      const client = getRedisClient();
      if (!(client instanceof Redis)) {
        throw new Error('Redis not available');
      }

      const fullKey = `${RATE_LIMIT_PREFIX}${key}`;
      const now = Date.now();

      // Get existing entry
      const existing = await this.get(key);

      let entry: RateLimitEntry;
      if (!existing || existing.resetTime < now) {
        // Create new entry
        entry = { count: 1, resetTime: now + windowMs };
      } else {
        // Increment existing
        entry = { count: existing.count + 1, resetTime: existing.resetTime };
      }

      // Store with TTL (convert windowMs to seconds, add buffer)
      const ttlSeconds = Math.ceil(windowMs / 1000) + 60; // Add 60s buffer
      await client.setex(fullKey, ttlSeconds, JSON.stringify(entry));

      return entry;
    } catch (error) {
      logger.error('Redis rate limit increment error:', error);
      // Return a default to not block the request
      return { count: 1, resetTime: Date.now() + windowMs };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      if (!(client instanceof Redis)) {
        return;
      }

      const fullKey = `${RATE_LIMIT_PREFIX}${key}`;
      const entry = await this.get(key);

      if (entry && entry.count > 0) {
        entry.count--;
        const ttlSeconds = Math.ceil((entry.resetTime - Date.now()) / 1000) + 60;
        if (ttlSeconds > 0) {
          await client.setex(fullKey, ttlSeconds, JSON.stringify(entry));
        }
      }
    } catch (error) {
      logger.error('Redis rate limit decrement error:', error);
    }
  }
}

// ==========================================
// 🔄 Hybrid Store (Redis with Memory Fallback)
// ==========================================

class HybridRateLimitStore implements IRateLimitStore {
  private memoryStore: MemoryRateLimitStore;
  private redisStore: RedisRateLimitStore;

  constructor() {
    this.memoryStore = new MemoryRateLimitStore();
    this.redisStore = new RedisRateLimitStore();
  }

  private useRedis(): boolean {
    return isRedisConnected();
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    if (this.useRedis()) {
      return this.redisStore.get(key);
    }
    return this.memoryStore.get(key);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    if (this.useRedis()) {
      return this.redisStore.increment(key, windowMs);
    }
    return this.memoryStore.increment(key, windowMs);
  }

  async decrement(key: string): Promise<void> {
    if (this.useRedis()) {
      return this.redisStore.decrement(key);
    }
    return this.memoryStore.decrement(key);
  }

  destroy(): void {
    this.memoryStore.destroy();
  }
}

interface RateLimitOptions {
  windowMs: number;        // Time window in milliseconds
  maxRequests: number;     // Maximum requests per window
  message?: string;        // Error message
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

// 🛡️ Use hybrid store: Redis when available, memory as fallback
const store = new HybridRateLimitStore();

// Generate rate limit key from request
// Uses X-Forwarded-For for proxied requests (Railway, Vercel, etc.)
const defaultKeyGenerator = (req: Request): string => {
  const forwardedFor = req.get('X-Forwarded-For');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.ip || req.connection.remoteAddress || 'unknown');
  const userAgent = req.get('User-Agent') || 'unknown';
  return `${ip}:${userAgent.substring(0, 100)}`;
};

export const createRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);
      const current = await store.increment(key, windowMs);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - current.count).toString(),
        'X-RateLimit-Reset': new Date(current.resetTime).toISOString()
      });

      if (current.count > maxRequests) {
        return res.status(429).json({
          error: message,
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: current.resetTime
        });
      }

      // Handle skip options
      if (skipSuccessfulRequests || skipFailedRequests) {
        const originalSend = res.json;
        const originalStatus = res.status;
        let statusCode = 200;

        res.status = function(code: number) {
          statusCode = code;
          return originalStatus.call(this, code);
        };

        res.json = function<T>(body: T) {
          const shouldSkip =
            (skipSuccessfulRequests && statusCode >= 200 && statusCode < 400) ||
            (skipFailedRequests && statusCode >= 400);

          if (shouldSkip) {
            // Decrement counter for skipped requests (async, fire-and-forget)
            store.decrement(key).catch(err => {
              logger.error('Failed to decrement rate limit counter:', err);
            });
          }

          return originalSend.call(this, body);
        };
      }

      next();

    } catch (error) {
      logger.error('Rate limit error:', error);
      next(); // Don't block requests on rate limit errors
    }
  };
};

// Pre-configured rate limiters for common scenarios

// General API rate limit
export const apiRateLimit = createRateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many API requests'
});

// Strict rate limit for authentication endpoints
// Note: Uses X-Forwarded-For for real IP behind proxy (Railway/Vercel)
// 🛡️ SECURITY FIX: Reduced from 100 to 5 attempts to prevent brute-force attacks
export const authRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 10, // 10 attempts per 10 minutes (balanced security/UX)
  message: 'Too many authentication attempts. Please wait 10 minutes before trying again.',
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req: Request) => {
    // Use real client IP from X-Forwarded-For header (Railway/Vercel proxy)
    const forwardedFor = req.get('X-Forwarded-For');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.ip || req.connection.remoteAddress || 'unknown');
    return `auth:${ip}`;
  }
});

// Upload rate limit - increased to handle multi-photo uploads (e.g., 5 employee photos + retries)
export const uploadRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  message: 'Too many upload requests'
});

// Admin actions rate limit
export const adminRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 50,
  message: 'Too many admin actions'
});

// Strict rate limit for sensitive admin operations
export const adminCriticalRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 10, // Very restrictive
  message: 'Too many critical admin operations, please wait',
  keyGenerator: (req: Request) => {
    // Include user ID if available for more precise limiting
    const userIdFromToken = getUserId(req);
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `critical:${userIdFromToken}:${ip}`;
  }
});

// Rate limit specifically for user management operations
export const userManagementRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20,
  message: 'Too many user management operations',
  keyGenerator: (req: Request) => {
    const userIdFromToken = getUserId(req);
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `usermgmt:${userIdFromToken}:${ip}`;
  }
});

// Rate limit for data export/bulk operations
export const bulkOperationRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // Very limited
  message: 'Too many bulk operations, please wait',
  keyGenerator: (req: Request) => {
    const userIdFromToken = getUserId(req);
    return `bulk:${userIdFromToken}`;
  }
});

// Comment/review rate limit
export const commentRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // Increased for dev testing (was 3)
  message: 'Too many comments, please wait before posting again'
});

// Establishment employees rate limit (v10.3 Phase 0)
export const establishmentEmployeesRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // Max 30 requests per minute
  message: 'Too many requests to view employees',
  keyGenerator: (req: Request) => {
    const userIdFromToken = getUserId(req);
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `est-employees:${userIdFromToken}:${ip}`;
  }
});

// VIP purchase rate limit (v10.3 Phase 1)
export const vipPurchaseRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // Max 5 VIP purchases per hour (prevent spam)
  message: 'Too many VIP purchase attempts, please try again later',
  keyGenerator: (req: Request) => {
    const userIdFromToken = getUserId(req);
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `vip-purchase:${userIdFromToken}:${ip}`;
  }
});

// VIP status check rate limit (v10.3 Phase 1)
export const vipStatusCheckRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // Max 60 requests per minute (frequent checks allowed)
  message: 'Too many VIP status check requests',
  keyGenerator: (req: Request) => {
    const userIdFromToken = getUserId(req);
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `vip-status:${userIdFromToken}:${ip}`;
  }
});

// Health check rate limit (Day 2 Sprint - Security)
// Prevents health endpoint from being used as DDoS vector
export const healthCheckRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // Max 100 requests per minute per IP
  message: 'Too many health check requests. Please try again later.',
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `health:${ip}`;
  }
});

// 🔧 FIX S4: Search suggestions rate limit
// Autocomplete can be hammered on each keystroke, limit to prevent abuse
export const searchSuggestionsRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // Max 60 requests per minute (1 per second avg)
  message: 'Too many search requests. Please slow down.',
  keyGenerator: (req: Request) => {
    const userIdFromToken = getUserId(req);
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `search-suggestions:${userIdFromToken}:${ip}`;
  }
});

// 🔧 FIX S4: Employee search rate limit
export const employeeSearchRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // Max 30 searches per minute
  message: 'Too many search requests. Please wait before searching again.',
  keyGenerator: (req: Request) => {
    const userIdFromToken = getUserId(req);
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `employee-search:${userIdFromToken}:${ip}`;
  }
});

// 🔧 FIX N3: Notification endpoints rate limit
// Unread-count is polled frequently, limit to prevent abuse
export const notificationRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // Max 30 requests per minute (1 per 2 seconds avg)
  message: 'Too many notification requests. Please wait.',
  keyGenerator: (req: Request) => {
    const userIdFromToken = getUserId(req);
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `notifications:${userIdFromToken}:${ip}`;
  }
});

// 🔧 FIX N3: Stricter rate limit for notification mutations (mark read, delete)
export const notificationMutationRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // Max 60 mutations per minute
  message: 'Too many notification actions. Please slow down.',
  keyGenerator: (req: Request) => {
    const userIdFromToken = getUserId(req);
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `notification-mutations:${userIdFromToken}:${ip}`;
  }
});

// 🔧 Phase 9: Availability check rate limit (pseudonym/email during registration)
// More permissive than auth endpoints since it's used during typing
export const availabilityCheckRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // Max 60 requests per minute (1 per second avg with debounce)
  message: 'Too many availability checks. Please slow down.',
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `availability:${ip}`;
  }
});

// Global rate limit for anonymous users (anti-bot protection)
// Generous limit to allow normal browsing, blocks scrapers
export const globalRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 300, // 300 requests per 15 minutes for anonymous
  message: 'Too many requests. Please try again later.',
  keyGenerator: (req: Request) => {
    const forwardedFor = req.get('X-Forwarded-For');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.ip || req.connection.remoteAddress || 'unknown');
    return `global:anon:${ip}`;
  }
});

// Global rate limit for authenticated users (very generous for power users)
export const globalAuthenticatedRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes for authenticated users
  message: 'Too many requests. Please try again later.',
  keyGenerator: (req: Request) => {
    const userId = getUserId(req) !== 'anonymous' ? getUserId(req) : 'unknown';
    const forwardedFor = req.get('X-Forwarded-For');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.ip || req.connection.remoteAddress || 'unknown');
    return `global:auth:${userId}:${ip}`;
  }
});

export { store as rateLimitStore };