"use strict";
/**
 * Sentry Configuration for Backend (Node.js/Express)
 *
 * Handles error monitoring and performance tracking
 * with proper security filters for the API
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sentry = exports.measurePerformance = exports.createChildSpan = exports.withSentrySpan = exports.sentryErrorMiddleware = exports.sentryRequestMiddleware = exports.captureSentryMessage = exports.captureSentryException = exports.addSentryBreadcrumb = exports.clearSentryUser = exports.setSentryUserFromRequest = exports.setSentryUser = exports.initSentry = void 0;
const Sentry = __importStar(require("@sentry/node"));
exports.Sentry = Sentry;
const profiling_node_1 = require("@sentry/profiling-node");
/**
 * Initialize Sentry for Node.js/Express application
 * Call this BEFORE loading any other modules
 */
const initSentry = () => {
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
    const integrations = [];
    // Add profiling integration if enabled
    if (enableProfiling) {
        integrations.push((0, profiling_node_1.nodeProfilingIntegration)());
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
                if (event.request.cookies)
                    event.request.cookies = {};
                if (event.request.headers) {
                    if (event.request.headers.authorization)
                        event.request.headers.authorization = '[REDACTED]';
                    if (event.request.headers.cookie)
                        event.request.headers.cookie = '[REDACTED]';
                    if (event.request.headers['x-csrf-token'])
                        event.request.headers['x-csrf-token'] = '[REDACTED]';
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
exports.initSentry = initSentry;
/**
 * Set user context for error tracking
 * Call this after user authentication
 */
const setSentryUser = (user) => {
    Sentry.setUser({
        id: user.id,
        username: user.pseudonym,
        email: user.email,
        role: user.role,
    });
};
exports.setSentryUser = setSentryUser;
/**
 * Set user context from Express request
 */
const setSentryUserFromRequest = (req) => {
    const user = req.user;
    if (user) {
        (0, exports.setSentryUser)({
            id: user.id,
            pseudonym: user.pseudonym,
            email: user.email,
            role: user.role,
        });
    }
};
exports.setSentryUserFromRequest = setSentryUserFromRequest;
/**
 * Clear user context
 */
const clearSentryUser = () => {
    Sentry.setUser(null);
};
exports.clearSentryUser = clearSentryUser;
/**
 * Add breadcrumb for tracking user actions
 */
const addSentryBreadcrumb = (message, category, data) => {
    Sentry.addBreadcrumb({
        message,
        category,
        level: 'info',
        data,
    });
};
exports.addSentryBreadcrumb = addSentryBreadcrumb;
/**
 * Manually capture an exception
 */
const captureSentryException = (error, context) => {
    Sentry.captureException(error, {
        extra: context,
    });
};
exports.captureSentryException = captureSentryException;
/**
 * Manually capture a message
 */
const captureSentryMessage = (message, level = 'info') => {
    Sentry.captureMessage(message, level);
};
exports.captureSentryMessage = captureSentryMessage;
/**
 * Custom middleware for capturing request context
 * Use this instead of Sentry.Handlers.requestHandler() which doesn't exist in v10
 */
const sentryRequestMiddleware = () => {
    return (req, _res, next) => {
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
exports.sentryRequestMiddleware = sentryRequestMiddleware;
/**
 * Error handler middleware for Sentry
 * Use this as your last error handler
 */
const sentryErrorMiddleware = () => {
    return (err, req, _res, next) => {
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
exports.sentryErrorMiddleware = sentryErrorMiddleware;
/**
 * Create a custom span for tracking performance of specific operations
 *
 * @example
 * await withSentrySpan('database.query', { query: 'SELECT * FROM users' }, async () => {
 *   return await db.query('SELECT * FROM users');
 * });
 */
const withSentrySpan = async (name, attributes = {}, callback) => {
    return await Sentry.startSpan({
        name,
        op: name.split('.')[0], // e.g., 'database' from 'database.query'
        attributes,
    }, callback);
};
exports.withSentrySpan = withSentrySpan;
/**
 * Create a child span within an existing transaction
 *
 * @example
 * const result = await createChildSpan('api.external_call', { service: 'supabase' }, async () => {
 *   return await supabase.from('users').select();
 * });
 */
const createChildSpan = async (operation, data = {}, callback) => {
    return await Sentry.startSpan({
        name: operation,
        op: operation.split('.')[0],
        attributes: data,
    }, callback);
};
exports.createChildSpan = createChildSpan;
/**
 * Measure execution time of a function and send to Sentry
 *
 * @example
 * const users = await measurePerformance('fetch_users', async () => {
 *   return await db.users.findMany();
 * });
 */
const measurePerformance = async (operationName, fn) => {
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
    }
    catch (error) {
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
exports.measurePerformance = measurePerformance;
//# sourceMappingURL=sentry.js.map