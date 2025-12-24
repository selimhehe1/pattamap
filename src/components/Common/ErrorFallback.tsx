import React, { ErrorInfo } from 'react';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';

/**
 * ErrorFallback - User-friendly error UI
 *
 * Displayed when an Error Boundary catches an error.
 * Provides options to retry or navigate away.
 *
 * Features:
 * - User-friendly error message
 * - Retry button (resets error boundary)
 * - Navigation options (home, back)
 * - Error details in development mode
 * - Consistent with nightlife theme
 */

interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;

  /** React error info (component stack) */
  errorInfo: ErrorInfo | null;

  /** Function to reset the error boundary */
  resetError: () => void;

  /** Optional boundary name for context */
  boundaryName?: string;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  boundaryName
}) => {
  const navigate = useNavigateWithTransition();
  const isDevelopment = process.env.NODE_ENV === 'development';

  const handleGoHome = () => {
    resetError();
    navigate('/');
  };

  const handleGoBack = () => {
    resetError();
    navigate.back();
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="error-fallback-container">
      <div className="error-fallback-content">
        {/* Icon */}
        <div className="error-icon" role="img" aria-label="Error icon">
          ⚠️
        </div>

        {/* Title */}
        <h1 className="error-title">Oops! Something went wrong</h1>

        {/* User-friendly message */}
        <p className="error-message">
          We encountered an unexpected error. Don't worry, your data is safe.
        </p>

        {/* Error name in production */}
        {!isDevelopment && error.name && (
          <p className="error-type">
            Error type: <code>{error.name}</code>
          </p>
        )}

        {/* Actions */}
        <div className="error-actions">
          <button
            onClick={resetError}
            className="btn-primary-nightlife"
            aria-label="Try again"
          >
            🔄 Try Again
          </button>

          <button
            onClick={handleGoHome}
            className="btn-secondary-nightlife"
            aria-label="Go to home page"
          >
            🏠 Go Home
          </button>

          <button
            onClick={handleGoBack}
            className="btn-outline-nightlife"
            aria-label="Go back to previous page"
          >
            ← Go Back
          </button>
        </div>

        {/* Development mode details */}
        {isDevelopment && (
          <details className="error-details" open>
            <summary className="error-details-summary">
              🛠️ Developer Details (dev mode only)
            </summary>

            <div className="error-details-content">
              {/* Boundary name */}
              {boundaryName && (
                <div className="error-detail-section">
                  <strong>Boundary:</strong> {boundaryName}
                </div>
              )}

              {/* Error message */}
              <div className="error-detail-section">
                <strong>Error Message:</strong>
                <pre className="error-pre">{error.message}</pre>
              </div>

              {/* Stack trace */}
              {error.stack && (
                <div className="error-detail-section">
                  <strong>Stack Trace:</strong>
                  <pre className="error-pre">{error.stack}</pre>
                </div>
              )}

              {/* Component stack */}
              {errorInfo?.componentStack && (
                <div className="error-detail-section">
                  <strong>Component Stack:</strong>
                  <pre className="error-pre">{errorInfo.componentStack}</pre>
                </div>
              )}

              {/* Reload button */}
              <button
                onClick={handleReload}
                className="btn-outline-nightlife"
                style={{ marginTop: '15px' }}
              >
                🔃 Full Page Reload
              </button>
            </div>
          </details>
        )}

        {/* Contact support message */}
        <p className="error-support">
          If the problem persists, please{' '}
          <a href="mailto:support@pattamap.com" className="error-link">
            contact support
          </a>
          .
        </p>
      </div>

      <style>{`
        /* Error Fallback Container */
        .error-fallback-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: linear-gradient(135deg, #0a0a2e, #16213e, #240046);
          color: #ffffff;
        }

        .error-fallback-content {
          max-width: 600px;
          width: 100%;
          text-align: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(193, 154, 107, 0.3);
          border-radius: 16px;
          padding: 40px 30px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        /* Icon */
        .error-icon {
          font-size: 80px;
          margin-bottom: 20px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        /* Title */
        .error-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 15px;
          color: #C19A6B;
          text-shadow: 0 2px 10px rgba(193, 154, 107, 0.3);
        }

        /* Message */
        .error-message {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 20px;
          color: rgba(255, 255, 255, 0.9);
        }

        .error-type {
          font-size: 14px;
          margin-bottom: 25px;
          color: rgba(255, 255, 255, 0.7);
        }

        .error-type code {
          background: rgba(193, 154, 107, 0.2);
          padding: 4px 8px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          color: #C19A6B;
        }

        /* Actions */
        .error-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          justify-content: center;
          margin-bottom: 30px;
        }

        .error-actions button {
          min-width: 140px;
          padding: 12px 24px;
          font-size: 16px;
          border-radius: 25px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          font-weight: 600;
        }

        .btn-primary-nightlife {
          background: linear-gradient(135deg, #C19A6B, #FF6B9D);
          color: white;
        }

        .btn-primary-nightlife:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(193, 154, 107, 0.4);
        }

        .btn-secondary-nightlife {
          background: rgba(0, 255, 255, 0.2);
          color: #00FFFF;
          border: 1px solid #00FFFF;
        }

        .btn-secondary-nightlife:hover {
          background: rgba(0, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .btn-outline-nightlife {
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .btn-outline-nightlife:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.5);
        }

        /* Support message */
        .error-support {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 20px;
        }

        .error-link {
          color: #00E5FF;
          text-decoration: none;
          font-weight: 600;
        }

        .error-link:hover {
          text-decoration: underline;
        }

        /* Developer Details */
        .error-details {
          margin-top: 30px;
          text-align: left;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 15px;
        }

        .error-details-summary {
          cursor: pointer;
          font-weight: 600;
          color: #FFD700;
          margin-bottom: 15px;
          user-select: none;
        }

        .error-details-summary:hover {
          color: #FFF;
        }

        .error-details-content {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
        }

        .error-detail-section {
          margin-bottom: 15px;
        }

        .error-detail-section strong {
          color: #C19A6B;
          display: block;
          margin-bottom: 5px;
        }

        .error-pre {
          background: rgba(0, 0, 0, 0.5);
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 12px;
          line-height: 1.4;
          color: #FFD700;
          font-family: 'Courier New', monospace;
          white-space: pre-wrap;
          word-break: break-all;
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .error-fallback-content {
            padding: 30px 20px;
          }

          .error-title {
            font-size: 24px;
          }

          .error-icon {
            font-size: 60px;
          }

          .error-actions {
            flex-direction: column;
          }

          .error-actions button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default ErrorFallback;
