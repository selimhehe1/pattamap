/**
 * 🛡️ Frontend Centralized Logging System
 *
 * Features:
 * - Auto-sanitization of sensitive data (tokens, passwords)
 * - Environment-aware (dev vs production)
 * - Multiple log levels (DEBUG, INFO, WARN, ERROR)
 * - Browser-optimized formatting
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogOptions {
  sanitize?: boolean; // Auto-sanitize sensitive data (default: true)
  context?: Record<string, any>; // Additional context
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  /**
   * Sanitize sensitive data from logs
   * Removes tokens, passwords, etc.
   */
  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) return data;

    const sensitiveKeys = [
      'password',
      'token',
      'csrftoken',
      'authorization',
      'cookie',
      'sessionid',
      'jwt',
      'secret',
      'api_key'
    ];

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

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
   * Format log message with emoji and timestamp
   */
  private formatMessage(emoji: string, level: string, message: string): string {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS only
    return `${emoji} [${timestamp}] [${level}] ${message}`;
  }

  /**
   * Prepare data for logging
   */
  private prepareData(data: any, options?: LogOptions) {
    // Auto-sanitize unless explicitly disabled
    if (options?.sanitize !== false) {
      data = this.sanitizeData(data);
    }

    // Add context if provided
    if (options?.context) {
      data = {
        ...data,
        context: this.sanitizeData(options.context)
      };
    }

    return data;
  }

  /**
   * Debug logs - only in development
   */
  debug(message: string, data?: any, options?: LogOptions) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('🔍', 'DEBUG', message);
      if (data) {
        console.log(formattedMessage, this.prepareData(data, options));
      } else {
        console.log(formattedMessage);
      }
    }
  }

  /**
   * Info logs - development only
   */
  info(message: string, data?: any, options?: LogOptions) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('ℹ️', 'INFO', message);
      if (data) {
        console.info(formattedMessage, this.prepareData(data, options));
      } else {
        console.info(formattedMessage);
      }
    }
  }

  /**
   * Warning logs - always logged
   */
  warn(message: string, data?: any, options?: LogOptions) {
    const formattedMessage = this.formatMessage('⚠️', 'WARN', message);
    if (data) {
      console.warn(formattedMessage, this.prepareData(data, options));
    } else {
      console.warn(formattedMessage);
    }
  }

  /**
   * Error logs - always logged
   */
  error(message: string, error?: Error | any, options?: LogOptions) {
    const formattedMessage = this.formatMessage('❌', 'ERROR', message);

    const errorData = error instanceof Error ? {
      message: error.message,
      stack: this.isDevelopment ? error.stack : undefined,
      name: error.name
    } : error;

    if (errorData) {
      console.error(formattedMessage, this.prepareData(errorData, options));
    } else {
      console.error(formattedMessage);
    }

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
        });
      } catch (sentryError) {
        // Fail silently if Sentry is not available
        console.warn('Failed to send error to Sentry', sentryError);
      }
    }
  }

  /**
   * Helper to log API calls
   */
  logAPI(method: string, url: string, status?: number, data?: any) {
    if (status && status >= 400) {
      this.error(`API ${method} ${url} failed`, {
        status,
        url,
        method,
        ...data
      });
    } else {
      this.debug(`API ${method} ${url}`, {
        status,
        ...data
      });
    }
  }

  /**
   * Helper to log user actions
   */
  logAction(action: string, data?: any) {
    this.debug(`User action: ${action}`, data);
  }
}

// Export singleton instance
export const logger = new Logger();
