import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigateWithTransition } from '../hooks/useNavigateWithTransition';
import { Helmet } from 'react-helmet-async';
import LoginForm from '../components/Auth/LoginForm';
import MultiStepRegisterForm from '../components/Auth/MultiStepRegisterForm';
import { useAuth } from '../contexts/AuthContext';
import '../styles/pages/auth-pages.css';

/**
 * LoginPage Component
 *
 * Dedicated login page for direct navigation and E2E testing.
 * Provides a full-page login experience with:
 * - LoginForm modal embedded in page
 * - Switch to register functionality
 * - Redirect after successful login
 * - Responsive design
 *
 * @example
 * // Route configuration
 * <Route path="/login" element={<LoginPage />} />
 *
 * // Direct navigation
 * navigate('/login', { state: { from: '/dashboard' } });
 */
const LoginPage: React.FC = () => {
  const navigate = useNavigateWithTransition();
  const location = useLocation();
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  // Get the redirect path from location state or default to appropriate page
  const from = (location.state as any)?.from || null;

  // Redirect if already logged in OR after successful login
  React.useEffect(() => {
    if (user) {
      // Determine redirect based on user role
      const redirectPath = from || (
        user.role === 'admin' ? '/admin' :
        user.account_type === 'establishment_owner' ? '/my-establishments' :
        user.account_type === 'employee' ? '/employee/dashboard' :
        '/dashboard'
      );

      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, from]);

  const handleClose = () => {
    // Navigate back to previous page (or home) when user explicitly closes the form
    // Note: After successful login, useEffect will redirect before this takes effect
    navigate('/');
  };

  // Special handler for LoginForm that does nothing on success
  // The useEffect above will handle the redirect when user state updates
  const handleLoginSuccess = () => {
    // Do nothing - let useEffect handle the redirect
  };

  const handleSwitchToRegister = () => {
    setShowRegister(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegister(false);
  };

  return (
    <>
      <Helmet>
        <title>Login - PattaMap</title>
        <meta name="description" content="Login to access your PattaMap account" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="auth-page">
        <div className="auth-page-background">
          <div className="auth-page-overlay" />
        </div>

        <div className="auth-page-content">
          {!showRegister ? (
            <div className="auth-page-form-wrapper">
              <LoginForm
                onClose={handleClose}
                onSwitchToRegister={handleSwitchToRegister}
                onLoginSuccess={handleLoginSuccess}
              />
            </div>
          ) : (
            <div className="auth-page-form-wrapper">
              <MultiStepRegisterForm
                onClose={handleClose}
                onSwitchToLogin={handleSwitchToLogin}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LoginPage;
