/**
 * Sentry Configuration for Backend (Node.js/Express)
 *
 * Handles error monitoring and performance tracking
 * with proper security filters for the API
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Request } from 'express';

/**
 * Initialize Sentry for Node.js/Express application
 * Call this BEFORE loading any other modules
 */
export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.SENTRY_ENVIRONMENT || 'development';
  const enableProfiling = process.env.SENTRY_ENABLE_PROFILING === 'true';
  // 🎯 Default 50% sample rate for good production visibility without excessive quota usage
  const tracesSampleRate = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.5');
  const profilesSampleRate = parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1');

  // Don't initialize if no DSN provided
  if (!dsn || dsn.includes('your-sentry-dsn')) {
    console.log('ℹ️ Sentry not configured (no valid DSN)');
    return;
  }

  const integrations: any[] = [];

  // Add profiling integration if enabled
  if (enableProfiling) {
    integrations.push(nodeProfilingIntegration());
  }

  Sentry.init({
    dsn,
    environment,
    integrations,

    // Performance monitoring
    tracesSampleRate,

    // Profiling (when enabled)
    profilesSampleRate: enableProfiling ? profilesSampleRate : undefined,

    // Release tracking (optional, set via build process)
    release: process.env.npm_package_version,

    // Security: Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            const sanitized = { ...breadcrumb.data };

            // Remove sensitive keys
            const sensitiveKeys = ['password', 'token', 'auth', 'cookie', 'csrf', 'jwt', 'secret', 'api_key'];
            Object.keys(sanitized).forEach(key => {
              if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
              }
            });

            breadcrumb.data = sanitized;
          }
          return breadcrumb;
        });
      }

      // Remove sensitive data from request
      if (event.request) {
        if (event.request.cookies) event.request.cookies = {};
        if (event.request.headers) {
          if (event.request.headers.authorization) event.request.headers.authorization = '[REDACTED]';
          if (event.request.headers.cookie) event.request.headers.cookie = '[REDACTED]';
          if (event.request.headers['x-csrf-token']) event.request.headers['x-csrf-token'] = '[REDACTED]';
        }
      }

      // Remove sensitive data from extra context
      if (event.extra) {
        const sanitized = { ...event.extra };
        const sensitiveKeys = ['password', 'token', 'auth', 'cookie', 'csrf', 'jwt', 'secret', 'api_key'];
        Object.keys(sanitized).forEach(key => {
          if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
            sanitized[key] = '[REDACTED]';
          }
        });
        event.extra = sanitized;
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // JWT errors (expected validation failures)
      'JsonWebTokenError',
      'TokenExpiredError',
      // Network errors
      'ECONNREFUSED',
      'ENOTFOUND',
      // Rate limiting (expected)
      'Too many requests',
    ],

    // Advanced sampling configuration
    tracesSampler: (samplingContext) => {
      // Guard against undefined contexts
      const url = samplingContext.request?.url || samplingContext.name || '';
      const op = samplingContext.transactionContext?.op || '';

      // Sample all error transactions
      if (op === 'http.server' && url.includes('/error')) {
        return 1.0;
      }

      // Sample admin routes more frequently
      if (url.includes('/api/admin')) {
        return 0.5; // 50% sampling for admin routes
      }

      // Lower sampling for health checks and static assets
      if (url.match(/\/(health|api-docs|favicon\.ico)/)) {
        return 0.01; // 1% sampling for health/docs
      }

      // Default rate
      return tracesSampleRate;
    },
  });

  console.log(`✅ Sentry initialized (${environment}) - Tracing: ${tracesSampleRate * 100}%${enableProfiling ? ` - Profiling: ${profilesSampleRate * 100}%` : ''}`);
};

/**
 * Set user context for error tracking
 * Call this after user authentication
 */
export const setSentryUser = (user: { id: string; pseudonym?: string; email?: string; role?: string }) => {
  Sentry.setUser({
    id: user.id,
    username: user.pseudonym,
    email: user.email,
    role: user.role,
  });
};

/**
 * Set user context from Express request
 */
export const setSentryUserFromRequest = (req: Request) => {
  const user = (req as any).user;
  if (user) {
    setSentryUser({
      id: user.id,
      pseudonym: user.pseudonym,
      email: user.email,
      role: user.role,
    });
  }
};

/**
 * Clear user context
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for tracking user actions
 */
export const addSentryBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  });
};

/**
 * Manually capture an exception
 */
export const captureSentryException = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Manually capture a message
 */
export const captureSentryMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  Sentry.captureMessage(message, level);
};

/**
 * Custom middleware for capturing request context
 * Use this instead of Sentry.Handlers.requestHandler() which doesn't exist in v10
 */
export const sentryRequestMiddleware = () => {
  return (req: Request, _res: any, next: any) => {
    // Set request context
    Sentry.setContext('request', {
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    next();
  };
};

/**
 * Error handler middleware for Sentry
 * Use this as your last error handler
 */
export const sentryErrorMiddleware = () => {
  return (err: Error, req: Request, _res: any, next: any) => {
    // Capture the error
    Sentry.captureException(err, {
      extra: {
        method: req.method,
        url: req.originalUrl,
        query: req.query,
        body: req.body, // Will be sanitized by beforeSend
      },
    });

    // Pass to next error handler
    next(err);
  };
};

/**
 * Create a custom span for tracking performance of specific operations
 *
 * @example
 * await withSentrySpan('database.query', { query: 'SELECT * FROM users' }, async () => {
 *   return await db.query('SELECT * FROM users');
 * });
 */
export const withSentrySpan = async <T>(
  name: string,
  attributes: Record<string, any> = {},
  callback: () => Promise<T>
): Promise<T> => {
  return await Sentry.startSpan(
    {
      name,
      op: name.split('.')[0], // e.g., 'database' from 'database.query'
      attributes,
    },
    callback
  );
};

/**
 * Create a child span within an existing transaction
 *
 * @example
 * const result = await createChildSpan('api.external_call', { service: 'supabase' }, async () => {
 *   return await supabase.from('users').select();
 * });
 */
export const createChildSpan = async <T>(
  operation: string,
  data: Record<string, any> = {},
  callback: () => Promise<T>
): Promise<T> => {
  return await Sentry.startSpan(
    {
      name: operation,
      op: operation.split('.')[0],
      attributes: data,
    },
    callback
  );
};

/**
 * Measure execution time of a function and send to Sentry
 *
 * @example
 * const users = await measurePerformance('fetch_users', async () => {
 *   return await db.users.findMany();
 * });
 */
export const measurePerformance = async <T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    // Add breadcrumb for successful operation
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${operationName} completed`,
      level: 'info',
      data: {
        duration,
        operation: operationName,
      },
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    // Add breadcrumb for failed operation
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${operationName} failed`,
      level: 'error',
      data: {
        duration,
        operation: operationName,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    throw error;
  }
};

// Export Sentry instance for direct use
export { Sentry };
