"use strict";
/**
 * 🛡️ Production-Ready Centralized Logging System
 *
 * Features:
 * - Auto-sanitization of sensitive data (tokens, passwords, secrets)
 * - Environment-aware (dev vs production)
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR, CRITICAL)
 * - Structured logging with timestamps
 * - Request logging helper
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
exports.logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["CRITICAL"] = 4] = "CRITICAL";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.isDevelopment = process.env.NODE_ENV !== 'production';
        this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
    }
    /**
     * Sanitize sensitive data from logs
     * Removes tokens, passwords, secrets, etc.
     */
    sanitizeData(data) {
        if (typeof data !== 'object' || data === null)
            return data;
        const sensitiveKeys = [
            'password',
            'token',
            'secret',
            'csrftoken',
            'sessionid',
            'auth-token',
            'jwt',
            'authorization',
            'cookie',
            'api_key',
            'api_secret',
            'refresh_token',
            'access_token'
        ];
        const sanitized = Array.isArray(data) ? [...data] : { ...data };
        for (const key of Object.keys(sanitized)) {
            const lowerKey = key.toLowerCase();
            // Check if key contains sensitive words
            if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            }
            else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                // Recursively sanitize nested objects
                sanitized[key] = this.sanitizeData(sanitized[key]);
            }
        }
        return sanitized;
    }
    /**
     * Format log message with emoji, timestamp, and level
     */
    formatMessage(level, message, data, options) {
        const timestamp = new Date().toISOString();
        const emoji = {
            DEBUG: '🔍',
            INFO: 'ℹ️',
            WARN: '⚠️',
            ERROR: '❌',
            CRITICAL: '🚨'
        }[level] || '📝';
        let formattedData = data;
        // Auto-sanitize unless explicitly disabled
        if (options?.sanitize !== false) {
            formattedData = this.sanitizeData(data);
        }
        // Add context if provided
        if (options?.context) {
            formattedData = {
                ...formattedData,
                context: this.sanitizeData(options.context)
            };
        }
        return `${emoji} [${timestamp}] [${level}] ${message}${formattedData ? '\n' + JSON.stringify(formattedData, null, 2) : ''}`;
    }
    /**
     * Debug logs - only in development
     */
    debug(message, data, options) {
        if (this.isDevelopment && this.minLevel <= LogLevel.DEBUG) {
            console.log(this.formatMessage('DEBUG', message, data, options));
        }
    }
    /**
     * Info logs - development and production (if enabled)
     */
    info(message, data, options) {
        if (this.minLevel <= LogLevel.INFO) {
            console.log(this.formatMessage('INFO', message, data, options));
        }
    }
    /**
     * Warning logs - always logged
     */
    warn(message, data, options) {
        if (this.minLevel <= LogLevel.WARN) {
            console.warn(this.formatMessage('WARN', message, data, options));
        }
    }
    /**
     * Error logs - always logged
     */
    error(message, error, options) {
        if (this.minLevel <= LogLevel.ERROR) {
            const errorData = error instanceof Error ? {
                message: error.message,
                stack: this.isDevelopment ? error.stack : undefined,
                name: error.name
            } : error;
            console.error(this.formatMessage('ERROR', message, errorData, options));
            // Send to Sentry in production
            if (!this.isDevelopment) {
                try {
                    // Dynamic import to avoid circular dependencies
                    Promise.resolve().then(() => __importStar(require('../config/sentry'))).then(({ captureSentryException, captureSentryMessage }) => {
                        if (error instanceof Error) {
                            captureSentryException(error, { message, ...options?.context });
                        }
                        else {
                            captureSentryMessage(`${message}: ${JSON.stringify(error)}`, 'error');
                        }
                    }).catch(() => {
                        // Fail silently if Sentry is not available
                    });
                }
                catch (sentryError) {
                    // Fail silently
                }
            }
        }
    }
    /**
     * Critical logs - always logged with forced sanitization
     * Use for security incidents, data breaches, etc.
     */
    critical(message, error, options) {
        const errorData = error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : error;
        console.error(this.formatMessage('CRITICAL', message, errorData, {
            ...options,
            sanitize: true // Force sanitization for critical logs
        }));
        // Always send critical errors to Sentry (even in development)
        try {
            Promise.resolve().then(() => __importStar(require('../config/sentry'))).then(({ captureSentryException, captureSentryMessage }) => {
                if (error instanceof Error) {
                    captureSentryException(error, {
                        message,
                        level: 'critical',
                        ...options?.context
                    });
                }
                else {
                    captureSentryMessage(`CRITICAL: ${message}: ${JSON.stringify(error)}`, 'error');
                }
            }).catch(() => {
                // Fail silently if Sentry is not available
            });
        }
        catch (sentryError) {
            // Fail silently
        }
    }
    /**
     * Helper to log HTTP requests
     * Auto-sanitizes headers and body
     */
    logRequest(req, message, additionalData) {
        this.debug(message, {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            // Headers and body are auto-sanitized to remove tokens
            hasAuthHeader: !!req.headers['authorization'],
            hasCSRFHeader: !!req.headers['x-csrf-token'],
            hasCookie: !!req.headers['cookie'],
            bodyKeys: req.body ? Object.keys(req.body) : [],
            ...additionalData
        });
    }
    /**
     * Helper to log authentication events
     */
    logAuth(event, data) {
        this.info(`Auth: ${event}`, {
            timestamp: new Date().toISOString(),
            ...data
        });
    }
    /**
     * Helper to log security events
     */
    logSecurity(event, data) {
        this.warn(`Security: ${event}`, {
            timestamp: new Date().toISOString(),
            ...data
        });
    }
}
// Export singleton instance
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map