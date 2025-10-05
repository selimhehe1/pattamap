/**
 * Sentry Configuration for Frontend
 *
 * Handles error monitoring and performance tracking
 * with proper security filters
 */

import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for React application
 * Call this BEFORE ReactDOM.render()
 */
export const initSentry = () => {
  const dsn = process.env.REACT_APP_SENTRY_DSN;
  const environment = process.env.REACT_APP_SENTRY_ENVIRONMENT || 'development';
  const enableTracing = process.env.REACT_APP_SENTRY_ENABLE_TRACING === 'true';

  // Don't initialize if no DSN provided (development without Sentry)
  if (!dsn || dsn.includes('your-sentry-dsn')) {
    console.log('ℹ️ Sentry not configured (no valid DSN)');
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mask all text and input content for privacy
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Performance sampling
    tracesSampleRate: enableTracing ? 0.1 : 0, // 10% of transactions for performance

    // Session replay for debugging
    replaysSessionSampleRate: 0.1, // 10% of normal sessions
    replaysOnErrorSampleRate: 1.0, // 100% of error sessions

    // Release tracking (optional, set via build process)
    release: process.env.REACT_APP_VERSION,

    // Security: Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            const sanitized = { ...breadcrumb.data };

            // Remove sensitive keys
            const sensitiveKeys = ['password', 'token', 'auth', 'cookie', 'csrf', 'jwt', 'secret'];
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
        // @ts-ignore - Sentry types might not be perfectly aligned
        if (event.request.cookies) event.request.cookies = {};
        if (event.request.headers) {
          if (event.request.headers.Authorization) event.request.headers.Authorization = '[REDACTED]';
          if (event.request.headers.Cookie) event.request.headers.Cookie = '[REDACTED]';
        }
      }

      // Remove sensitive data from extra context
      if (event.extra) {
        const sanitized = { ...event.extra };
        const sensitiveKeys = ['password', 'token', 'auth', 'cookie', 'csrf', 'jwt', 'secret'];
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
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // Network errors (user offline, etc)
      'NetworkError',
      'Failed to fetch',
      // ResizeObserver errors (harmless)
      'ResizeObserver loop limit exceeded',
    ],

    // Don't send errors from localhost in development
    beforeSendTransaction(event) {
      if (environment === 'development' && window.location.hostname === 'localhost') {
        return null; // Don't send
      }
      return event;
    },
  });

  console.log(`✅ Sentry initialized (${environment})`);
};

/**
 * Set user context for error tracking
 * Call this after user login
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
 * Clear user context on logout
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add breadcrumb for user actions
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
