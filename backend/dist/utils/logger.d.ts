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
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    CRITICAL = 4
}
interface LogOptions {
    sanitize?: boolean;
    context?: Record<string, any>;
}
declare class Logger {
    private isDevelopment;
    private minLevel;
    /**
     * Sanitize sensitive data from logs
     * Removes tokens, passwords, secrets, etc.
     */
    private sanitizeData;
    /**
     * Format log message with emoji, timestamp, and level
     */
    private formatMessage;
    /**
     * Debug logs - only in development
     */
    debug(message: string, data?: any, options?: LogOptions): void;
    /**
     * Info logs - development and production (if enabled)
     */
    info(message: string, data?: any, options?: LogOptions): void;
    /**
     * Warning logs - always logged
     */
    warn(message: string, data?: any, options?: LogOptions): void;
    /**
     * Error logs - always logged
     */
    error(message: string, error?: Error | any, options?: LogOptions): void;
    /**
     * Critical logs - always logged with forced sanitization
     * Use for security incidents, data breaches, etc.
     */
    critical(message: string, error?: Error | any, options?: LogOptions): void;
    /**
     * Helper to log HTTP requests
     * Auto-sanitizes headers and body
     */
    logRequest(req: Request, message: string, additionalData?: any): void;
    /**
     * Helper to log authentication events
     */
    logAuth(event: string, data?: any): void;
    /**
     * Helper to log security events
     */
    logSecurity(event: string, data?: any): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map