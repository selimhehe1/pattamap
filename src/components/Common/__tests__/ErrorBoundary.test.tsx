/**
 * @vitest-environment jsdom
 */
/**
 * ErrorBoundary Component Tests
 *
 * Tests for the ErrorBoundary class component:
 * - Renders children when no error
 * - Shows fallback when child throws
 * - Calls Sentry.captureException on error
 * - Calls logger.error on error
 * - Calls onError callback when provided
 * - Shows custom fallback when provided
 * - resetErrorBoundary recovers to children
 * - withErrorBoundary HOC wraps component
 *
 * Total: 8 tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock Sentry
const mockCaptureException = vi.fn();
vi.mock('@sentry/react', () => ({
  captureException: (...args: any[]) => mockCaptureException(...args),
}));

// Mock logger
const mockLoggerError = vi.fn();
const mockLoggerWarn = vi.fn();
vi.mock('../../../utils/logger', () => ({
  logger: {
    error: (...args: any[]) => mockLoggerError(...args),
    warn: (...args: any[]) => mockLoggerWarn(...args),
  },
}));

// Mock ErrorFallback
vi.mock('../ErrorFallback', () => ({
  default: ({ error, resetError }: any) => (
    <div data-testid="error-fallback">
      <span data-testid="error-message">{error.message}</span>
      <button onClick={resetError}>Reset</button>
    </div>
  ),
}));

import ErrorBoundary, { withErrorBoundary } from '../ErrorBoundary';

// Component that conditionally throws based on a prop
const ThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) throw new Error('Test error');
  return <div data-testid="no-error">No error</div>;
};

// Suppress React error boundary console.error noise during tests
const originalConsoleError = console.error;
beforeEach(() => {
  vi.clearAllMocks();
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Error: Uncaught') ||
        args[0].includes('The above error occurred') ||
        args[0].includes('Error: Test error'))
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});

describe('ErrorBoundary Component', () => {
  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should show default ErrorFallback when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('error-message')).toHaveTextContent('Test error');
  });

  it('should call Sentry.captureException when an error is caught', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        contexts: expect.objectContaining({
          react: expect.objectContaining({
            boundaryName: 'Unknown',
          }),
        }),
      })
    );
  });

  it('should call logger.error when an error is caught', () => {
    render(
      <ErrorBoundary boundaryName="TestBoundary">
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(
      'Error caught by TestBoundary',
      expect.objectContaining({
        errorMessage: 'Test error',
        boundaryName: 'TestBoundary',
      })
    );
  });

  it('should call onError callback when provided', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should show custom fallback when provided instead of default', () => {
    const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
  });

  it('should recover to children after resetErrorBoundary is called', () => {
    // Use a ref to control whether the component throws
    let shouldThrow = true;
    const ControlledComponent = () => {
      if (shouldThrow) throw new Error('Test error');
      return <div data-testid="recovered">Recovered content</div>;
    };

    render(
      <ErrorBoundary>
        <ControlledComponent />
      </ErrorBoundary>
    );

    // Error fallback should be displayed
    expect(screen.getByTestId('error-fallback')).toBeInTheDocument();

    // Stop throwing before resetting
    shouldThrow = false;

    // Click the Reset button (from mocked ErrorFallback)
    fireEvent.click(screen.getByText('Reset'));

    // After reset, component should render successfully
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
    expect(screen.getByText('Recovered content')).toBeInTheDocument();
    expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument();
  });

  it('should wrap component with withErrorBoundary HOC', () => {
    const SimpleComponent = () => <div data-testid="wrapped">Wrapped content</div>;
    const WrappedComponent = withErrorBoundary(SimpleComponent, {
      boundaryName: 'HOCBoundary',
    });

    render(<WrappedComponent />);

    expect(screen.getByTestId('wrapped')).toBeInTheDocument();
    expect(screen.getByText('Wrapped content')).toBeInTheDocument();
  });
});
