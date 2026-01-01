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

import { Request } from 'express';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

interface LogOptions {
  sanitize?: boolean; // Auto-sanitize tokens/secrets (default: true)
  context?: Record<string, unknown>; // Additional context
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;

  /**
   * Sanitize sensitive data from logs
   * Removes tokens, passwords, secrets, etc.
   */
  private sanitizeData(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) return data;

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

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const dataObj = data as Record<string, unknown>;
    const sanitized: Record<string, unknown> = { ...dataObj };

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();

      // Check if key contains sensitive words
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Format log message with emoji, timestamp, and level
   */
  private formatMessage(level: string, message: string, data?: unknown, options?: LogOptions): string {
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
      const contextData = this.sanitizeData(options.context);
      if (formattedData && typeof formattedData === 'object' && !Array.isArray(formattedData)) {
        formattedData = {
          ...(formattedData as Record<string, unknown>),
          context: contextData
        };
      } else {
        formattedData = { data: formattedData, context: contextData };
      }
    }

    return `${emoji} [${timestamp}] [${level}] ${message}${
      formattedData ? '\n' + JSON.stringify(formattedData, null, 2) : ''
    }`;
  }

  /**
   * Debug logs - only in development
   */
  debug(message: string, data?: unknown, options?: LogOptions) {
    if (this.isDevelopment && this.minLevel <= LogLevel.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, data, options));
    }
  }

  /**
   * Info logs - development and production (if enabled)
   */
  info(message: string, data?: unknown, options?: LogOptions) {
    if (this.minLevel <= LogLevel.INFO) {
      console.log(this.formatMessage('INFO', message, data, options));
    }
  }

  /**
   * Warning logs - always logged
   */
  warn(message: string, data?: unknown, options?: LogOptions) {
    if (this.minLevel <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, data, options));
    }
  }

  /**
   * Error logs - always logged
   */
  error(message: string, error?: Error | unknown, options?: LogOptions) {
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
          import('../config/sentry').then(({ captureSentryException, captureSentryMessage }) => {
            if (error instanceof Error) {
              captureSentryException(error, { message, ...options?.context });
            } else {
              captureSentryMessage(`${message}: ${JSON.stringify(error)}`, 'error');
            }
          }).catch(() => {
            // Fail silently if Sentry is not available
          });
        } catch (sentryError) {
          // Fail silently
        }
      }
    }
  }

  /**
   * Critical logs - always logged with forced sanitization
   * Use for security incidents, data breaches, etc.
   */
  critical(message: string, error?: Error | unknown, options?: LogOptions) {
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
      import('../config/sentry').then(({ captureSentryException, captureSentryMessage }) => {
        if (error instanceof Error) {
          captureSentryException(error, {
            message,
            level: 'critical',
            ...options?.context
          });
        } else {
          captureSentryMessage(`CRITICAL: ${message}: ${JSON.stringify(error)}`, 'error');
        }
      }).catch(() => {
        // Fail silently if Sentry is not available
      });
    } catch (sentryError) {
      // Fail silently
    }
  }

  /**
   * Helper to log HTTP requests
   * Auto-sanitizes headers and body
   */
  logRequest(req: Request, message: string, additionalData?: Record<string, unknown>) {
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
  logAuth(event: string, data?: Record<string, unknown>) {
    this.info(`Auth: ${event}`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  /**
   * Helper to log security events
   */
  logSecurity(event: string, data?: Record<string, unknown>) {
    this.warn(`Security: ${event}`, {
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

// Export singleton instance
export const logger = new Logger();
