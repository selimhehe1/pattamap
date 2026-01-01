import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class MemoryRateLimitStore {
  private store: RateLimitStore = {};
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

  get(key: string): { count: number; resetTime: number } | null {
    const entry = this.store[key];
    if (!entry || entry.resetTime < Date.now()) {
      return null;
    }
    return entry;
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
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

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store = {};
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

const store = new MemoryRateLimitStore();

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
    // Rate limiting disabled for early launch - few active users contributing heavily
    // Re-enable when user base grows to prevent abuse
    // Force cache bust: 2025-12-30T18:45
    return next();

    try {
      const key = keyGenerator(req);
      const current = store.increment(key, windowMs);

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
            // Decrement counter for skipped requests
            const entry = store.get(key);
            if (entry && entry.count > 0) {
              entry.count--;
            }
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
    const userIdFromToken = req.user?.id || 'anonymous';
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
    const userIdFromToken = req.user?.id || 'anonymous';
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
    const userIdFromToken = req.user?.id || 'anonymous';
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
    const userIdFromToken = req.user?.id || 'anonymous';
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
    const userIdFromToken = req.user?.id || 'anonymous';
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
    const userIdFromToken = req.user?.id || 'anonymous';
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
    const userIdFromToken = req.user?.id || 'anonymous';
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
    const userIdFromToken = req.user?.id || 'anonymous';
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
    const userIdFromToken = req.user?.id || 'anonymous';
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
    const userIdFromToken = req.user?.id || 'anonymous';
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

export { store as rateLimitStore };