import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { logger } from '../../utils/logger';
import ErrorFallback from './ErrorFallback';

/**
 * ErrorBoundary - React Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing
 * the entire application.
 *
 * Features:
 * - Catches errors in child components
 * - Logs errors to Sentry for monitoring
 * - Displays user-friendly error UI
 * - Allows recovery (reset error state)
 * - Development mode shows error details
 *
 * Usage:
 * <ErrorBoundary fallback={<CustomFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 *
 * Note: Error Boundaries do NOT catch errors in:
 * - Event handlers (use try-catch)
 * - Asynchronous code (setTimeout, promises)
 * - Server-side rendering
 * - Errors thrown in the error boundary itself
 */

interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;

  /** Optional custom fallback UI */
  fallback?: ReactNode;

  /** Optional callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;

  /** Optional name for this boundary (for logging) */
  boundaryName?: string;
}

interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;

  /** The error object */
  error: Error | null;

  /** React error info (component stack) */
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, boundaryName } = this.props;

    // Log error details
    logger.error(
      `Error caught by ${boundaryName || 'ErrorBoundary'}`,
      {
        error: error.toString(),
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack,
        boundaryName
      }
    );

    // Send to Sentry
    try {
      Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
            boundaryName: boundaryName || 'Unknown'
          }
        },
        tags: {
          errorBoundary: boundaryName || 'default',
          errorType: error.name
        }
      });
    } catch (sentryError) {
      logger.warn('Failed to send error to Sentry', sentryError);
    }

    // Update state with error info
    this.setState({
      errorInfo
    });

    // Call optional error callback
    if (onError) {
      onError(error, errorInfo);
    }
  }

  /**
   * Reset error boundary state
   * Allows user to retry after an error
   */
  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, boundaryName } = this.props;

    if (hasError && error) {
      // If custom fallback provided, use it
      if (fallback) {
        return fallback;
      }

      // Otherwise, use default ErrorFallback component
      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetErrorBoundary}
          boundaryName={boundaryName}
        />
      );
    }

    // No error, render children normally
    return children;
  }
}

export default ErrorBoundary;

/**
 * Hook-based wrapper for functional components
 * (Uses Sentry's built-in error boundary)
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    boundaryName?: string;
  }
): React.FC<P> => {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
};
