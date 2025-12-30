import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useNavigateWithTransition } from '../hooks/useNavigateWithTransition';
import { Helmet } from '@dr.pogodin/react-helmet';
import { ArrowLeft } from 'lucide-react';
import LoginForm from '../components/Auth/LoginForm';
import MultiStepRegisterForm from '../components/Auth/MultiStepRegisterForm';
import AuthHero from '../components/Auth/AuthHero';
import { useAuth } from '../contexts/AuthContext';
import '../styles/pages/auth-pages.css';
import '../styles/components/auth-hero.css';

/**
 * LoginPage Component
 *
 * Modern split-screen authentication page with:
 * - Desktop: Hero section (left) + Form (right)
 * - Tablet: Stacked layout (hero on top, form below)
 * - Mobile: Full-screen immersive form with compact branding
 *
 * Features:
 * - Animated hero with branding and feature highlights
 * - Smooth transitions between login and register forms
 * - Responsive design with mobile-first approach
 * - Light/dark mode support
 * - Accessibility compliant (WCAG 2.1 AA)
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
  const from = (location.state as { from?: string })?.from || null;

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
    // Navigate back to home when user explicitly closes the form
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

  const currentMode = showRegister ? 'register' : 'login';

  return (
    <>
      <Helmet>
        <title>{showRegister ? 'Register' : 'Login'} - PattaMap</title>
        <meta
          name="description"
          content={showRegister
            ? 'Create your PattaMap account to discover the best Pattaya nightlife venues'
            : 'Login to access your PattaMap account'
          }
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className={`auth-layout auth-layout--${currentMode}`}>
        {/* Back to Home Link */}
        <Link to="/" className="auth-back-link">
          <ArrowLeft size={16} />
          <span>Home</span>
        </Link>

        {/* Hero Section (Desktop & Tablet only) */}
        <div className="auth-layout__hero">
          <AuthHero mode={currentMode} />
        </div>

        {/* Form Section */}
        <div className="auth-layout__form">
          {/* Mobile Header (visible only on mobile) */}
          <div className="auth-mobile-header">
            <img
              src="/logo.svg"
              alt="PattaMap"
              className="auth-mobile-header__logo"
            />
            <span className="auth-mobile-header__title">PattaMap</span>
          </div>

          {/* Form Container */}
          <div className="auth-form-container">
            {!showRegister ? (
              <LoginForm
                embedded
                onClose={handleClose}
                onSwitchToRegister={handleSwitchToRegister}
                onLoginSuccess={handleLoginSuccess}
              />
            ) : (
              <MultiStepRegisterForm
                embedded
                onClose={handleClose}
                onSwitchToLogin={handleSwitchToLogin}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
