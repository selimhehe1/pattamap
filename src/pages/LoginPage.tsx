import React, { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useNavigateWithTransition } from '../hooks/useNavigateWithTransition';
import { Helmet } from '@dr.pogodin/react-helmet';
import { ArrowLeft } from 'lucide-react';
import LoginForm from '../components/Auth/LoginForm';
import MultiStepRegisterForm from '../components/Auth/MultiStepRegisterForm';
import ForgotPasswordForm from '../components/Auth/ForgotPasswordForm';
import AuthHero from '../components/Auth/AuthHero';
import LanguageSelector from '../components/Common/LanguageSelector';
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
type AuthMode = 'login' | 'register' | 'forgot-password';

const LoginPage: React.FC = () => {
  const navigate = useNavigateWithTransition();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);

  // Get the redirect path from location state or default to appropriate page
  const from = (location.state as { from?: string })?.from || null;

  // Redirect if already logged in OR after successful login
  // BUT not during Google registration flow (let the registration form show)
  const isGoogleRegistration = searchParams.get('from') === 'google' && searchParams.get('mode') === 'register';

  React.useEffect(() => {
    if (user && !isGoogleRegistration) {
      // Determine redirect based on user role
      const redirectPath = from || (
        user.role === 'admin' ? '/admin' :
        user.account_type === 'establishment_owner' ? '/my-establishments' :
        user.account_type === 'employee' ? '/employee/dashboard' :
        '/dashboard'
      );

      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, from, isGoogleRegistration]);

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
    setAuthMode('register');
  };

  const handleSwitchToLogin = () => {
    setAuthMode('login');
  };

  const handleSwitchToForgotPassword = () => {
    setAuthMode('forgot-password');
  };

  const currentMode = authMode === 'register' ? 'register' : 'login';

  return (
    <>
      <Helmet>
        <title>{authMode === 'register' ? 'Register' : authMode === 'forgot-password' ? 'Forgot Password' : 'Login'} - PattaMap</title>
        <meta
          name="description"
          content={authMode === 'register'
            ? 'Create your PattaMap account to discover the best Pattaya nightlife venues'
            : authMode === 'forgot-password'
            ? 'Reset your PattaMap password'
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

        {/* Language Selector - Top Right */}
        <div className="auth-language-selector">
          <LanguageSelector variant="dropdown" />
        </div>

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
            {authMode === 'login' && (
              <LoginForm
                embedded
                onClose={handleClose}
                onSwitchToRegister={handleSwitchToRegister}
                onSwitchToForgotPassword={handleSwitchToForgotPassword}
                onLoginSuccess={handleLoginSuccess}
              />
            )}
            {authMode === 'register' && (
              <MultiStepRegisterForm
                embedded
                onClose={handleClose}
                onSwitchToLogin={handleSwitchToLogin}
              />
            )}
            {authMode === 'forgot-password' && (
              <ForgotPasswordForm
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
