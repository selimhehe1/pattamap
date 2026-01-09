import React, { ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

/**
 * RouteErrorFallback - Compact error UI for route-level errors
 *
 * Unlike ErrorFallback which takes over the entire page, this component
 * displays a compact error message that fits within the page layout.
 * Used for isolating errors to specific routes without disrupting
 * the entire application.
 *
 * Features:
 * - Compact, non-intrusive design
 * - Retry, home, and back navigation options
 * - Development mode shows error details
 * - Consistent with nightlife theme
 */

interface RouteErrorFallbackProps {
  /** The error that was caught */
  error: Error;

  /** React error info (component stack) */
  errorInfo?: ErrorInfo | null;

  /** Function to reset the error boundary */
  resetError: () => void;

  /** Route name for context */
  routeName?: string;
}

const RouteErrorFallback: React.FC<RouteErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  routeName
}) => {
  const isDevelopment = import.meta.env.DEV;

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="route-error-container">
      <div className="route-error-content">
        {/* Icon and Title */}
        <div className="route-error-header">
          <AlertTriangle size={48} className="route-error-icon" />
          <div>
            <h2 className="route-error-title">Something went wrong</h2>
            {routeName && (
              <p className="route-error-location">Error in: {routeName}</p>
            )}
          </div>
        </div>

        {/* Message */}
        <p className="route-error-message">
          This section encountered an error. You can try again or navigate elsewhere.
        </p>

        {/* Actions */}
        <div className="route-error-actions">
          <button onClick={resetError} className="route-error-btn route-error-btn--primary">
            <RefreshCw size={16} /> Try Again
          </button>
          <button onClick={handleGoBack} className="route-error-btn route-error-btn--secondary">
            <ArrowLeft size={16} /> Go Back
          </button>
          <button onClick={handleGoHome} className="route-error-btn route-error-btn--ghost">
            <Home size={16} /> Home
          </button>
        </div>

        {/* Development details */}
        {isDevelopment && (
          <details className="route-error-details">
            <summary>Developer Details</summary>
            <div className="route-error-details-content">
              <p><strong>Error:</strong> {error.message}</p>
              {error.stack && (
                <pre className="route-error-stack">{error.stack.slice(0, 500)}...</pre>
              )}
              {errorInfo?.componentStack && (
                <pre className="route-error-stack">{errorInfo.componentStack.slice(0, 300)}...</pre>
              )}
            </div>
          </details>
        )}
      </div>

      <style>{`
        .route-error-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          padding: 40px 20px;
        }

        .route-error-content {
          max-width: 500px;
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(193, 154, 107, 0.3);
          border-radius: 16px;
          padding: 30px;
          text-align: center;
        }

        .route-error-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .route-error-icon {
          color: #f59e0b;
          flex-shrink: 0;
        }

        .route-error-title {
          font-size: 22px;
          font-weight: 700;
          color: #C19A6B;
          margin: 0;
        }

        .route-error-location {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          margin: 4px 0 0 0;
        }

        .route-error-message {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .route-error-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
        }

        .route-error-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .route-error-btn--primary {
          background: linear-gradient(135deg, #C19A6B, #8B6914);
          color: white;
        }

        .route-error-btn--primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(193, 154, 107, 0.4);
        }

        .route-error-btn--secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .route-error-btn--secondary:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .route-error-btn--ghost {
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
        }

        .route-error-btn--ghost:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .route-error-details {
          margin-top: 24px;
          text-align: left;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
          padding: 12px;
        }

        .route-error-details summary {
          cursor: pointer;
          font-weight: 600;
          color: #FFD700;
          font-size: 13px;
        }

        .route-error-details-content {
          margin-top: 12px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }

        .route-error-details-content p {
          margin: 0 0 8px 0;
        }

        .route-error-stack {
          background: rgba(0, 0, 0, 0.5);
          padding: 8px;
          border-radius: 4px;
          font-size: 11px;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
          color: #FFD700;
          margin: 8px 0;
        }

        @media (max-width: 480px) {
          .route-error-header {
            flex-direction: column;
            text-align: center;
          }

          .route-error-actions {
            flex-direction: column;
          }

          .route-error-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default RouteErrorFallback;
