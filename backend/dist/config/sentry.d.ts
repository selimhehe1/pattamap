/**
 * Sentry Configuration for Backend (Node.js/Express)
 *
 * Handles error monitoring and performance tracking
 * with proper security filters for the API
 */
import * as Sentry from '@sentry/node';
import { Request } from 'express';
/**
 * Initialize Sentry for Node.js/Express application
 * Call this BEFORE loading any other modules
 */
export declare const initSentry: () => void;
/**
 * Set user context for error tracking
 * Call this after user authentication
 */
export declare const setSentryUser: (user: {
    id: string;
    pseudonym?: string;
    email?: string;
    role?: string;
}) => void;
/**
 * Set user context from Express request
 */
export declare const setSentryUserFromRequest: (req: Request) => void;
/**
 * Clear user context
 */
export declare const clearSentryUser: () => void;
/**
 * Add breadcrumb for tracking user actions
 */
export declare const addSentryBreadcrumb: (message: string, category: string, data?: Record<string, any>) => void;
/**
 * Manually capture an exception
 */
export declare const captureSentryException: (error: Error, context?: Record<string, any>) => void;
/**
 * Manually capture a message
 */
export declare const captureSentryMessage: (message: string, level?: "info" | "warning" | "error") => void;
/**
 * Custom middleware for capturing request context
 * Use this instead of Sentry.Handlers.requestHandler() which doesn't exist in v10
 */
export declare const sentryRequestMiddleware: () => (req: Request, _res: any, next: any) => void;
/**
 * Error handler middleware for Sentry
 * Use this as your last error handler
 */
export declare const sentryErrorMiddleware: () => (err: Error, req: Request, _res: any, next: any) => void;
/**
 * Create a custom span for tracking performance of specific operations
 *
 * @example
 * await withSentrySpan('database.query', { query: 'SELECT * FROM users' }, async () => {
 *   return await db.query('SELECT * FROM users');
 * });
 */
export declare const withSentrySpan: <T>(name: string, attributes: Record<string, any> | undefined, callback: () => Promise<T>) => Promise<T>;
/**
 * Create a child span within an existing transaction
 *
 * @example
 * const result = await createChildSpan('api.external_call', { service: 'supabase' }, async () => {
 *   return await supabase.from('users').select();
 * });
 */
export declare const createChildSpan: <T>(operation: string, data: Record<string, any> | undefined, callback: () => Promise<T>) => Promise<T>;
/**
 * Measure execution time of a function and send to Sentry
 *
 * @example
 * const users = await measurePerformance('fetch_users', async () => {
 *   return await db.users.findMany();
 * });
 */
export declare const measurePerformance: <T>(operationName: string, fn: () => Promise<T>) => Promise<T>;
export { Sentry };
//# sourceMappingURL=sentry.d.ts.map