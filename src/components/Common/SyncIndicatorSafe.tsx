/**
 * SyncIndicatorSafe - Error-boundary wrapped SyncIndicator
 *
 * Wraps SyncIndicator with error handling to prevent app crashes
 * if there are module resolution issues (e.g., Vite cache corruption).
 *
 * @component
 */

import React, { Suspense, Component, type ReactNode } from 'react';

// Lazy load SyncIndicator to isolate potential module issues
const SyncIndicator = React.lazy(() => import('./SyncIndicator'));

interface Props {
  showWhenEmpty?: boolean;
  compact?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error boundary specifically for SyncIndicator
 * Fails silently - just hides the indicator if there's an error
 */
class SyncIndicatorErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log but don't crash - SyncIndicator is non-essential UI
    console.warn('[SyncIndicatorSafe] Error loading SyncIndicator:', error.message);
    console.debug('[SyncIndicatorSafe] Error info:', errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Return nothing - fail silently for this non-essential feature
      return null;
    }

    return this.props.children;
  }
}

/**
 * Safe wrapper for SyncIndicator
 * - Uses lazy loading to isolate module resolution
 * - Wrapped in error boundary to catch runtime errors
 * - Fails silently (returns null) on any error
 */
const SyncIndicatorSafe: React.FC<Props> = ({ showWhenEmpty = false, compact = false }) => {
  return (
    <SyncIndicatorErrorBoundary>
      <Suspense fallback={null}>
        <SyncIndicator showWhenEmpty={showWhenEmpty} compact={compact} />
      </Suspense>
    </SyncIndicatorErrorBoundary>
  );
};

export default SyncIndicatorSafe;
