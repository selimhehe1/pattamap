import React, { useState } from 'react';

/**
 * ErrorTester - Component for testing Error Boundaries
 *
 * DEVELOPMENT ONLY - Do not use in production!
 *
 * This component intentionally throws errors to test
 * that Error Boundaries are working correctly.
 *
 * Usage (in development only):
 * import ErrorTester from './components/Common/ErrorTester';
 *
 * // Add to a route or component
 * {process.env.NODE_ENV === 'development' && <ErrorTester />}
 */

const ErrorTester: React.FC = () => {
  const [throwError, setThrowError] = useState(false);

  if (throwError) {
    // This will be caught by the nearest Error Boundary
    throw new Error('Test error thrown by ErrorTester component');
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        background: 'rgba(255, 68, 68, 0.9)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
        border: '2px solid rgba(255, 255, 255, 0.3)'
      }}
     role="dialog" aria-modal="true">
      <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
        🛠️ Error Boundary Tester
      </div>
      <button
        onClick={() => setThrowError(true)}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid white',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: '600'
        }}
      >
        Throw Test Error
      </button>
      <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.8 }}>
        DEV MODE ONLY
      </div>
    </div>
  );
};

export default ErrorTester;
