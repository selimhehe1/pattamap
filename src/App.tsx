import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from '@dr.pogodin/react-helmet';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import { CSRFProvider } from './contexts/CSRFContext';
import { QueryProvider } from './providers/QueryProvider';
import { GamificationProvider } from './contexts/GamificationContext';
import { useAppModals } from './hooks/useAppModals';
import { SidebarProvider } from './contexts/SidebarContext';
import ModalRenderer from './components/Common/ModalRenderer';
import SkipToContent from './components/Layout/SkipToContent';
import LoadingFallback from './components/Common/LoadingFallback';
import ErrorBoundary from './components/Common/ErrorBoundary';
import RouteErrorFallback from './components/Common/RouteErrorFallback';
import OfflineBanner from './components/Common/OfflineBanner';

// Lazy load heavy components for bundle optimization
const ZoneGrid = React.lazy(() => import('./components/Home/ZoneGrid'));
const Header = React.lazy(() => import('./components/Layout/Header'));
const XPToastNotifications = React.lazy(() => import('./components/Gamification/XPToastNotifications'));
import { logger } from './utils/logger';
import { NotificationProvider } from './components/Notifications';
import { initGA, initWebVitals, trackPageView } from './utils/analytics';
import { ThemeProvider } from './contexts/ThemeContext';
import PageTransition from './components/Common/PageTransition';

/**
 * ============================================
 * CSS IMPORT ORDER - CONSOLIDATED BUNDLES
 * ============================================
 * Refactored 2026-01-10: 25+ imports → 12 bundles
 * See src/styles/bundles/index.css for documentation
 */

// 1. Design System (CSS variables - MUST BE FIRST)
import './styles/design-system.css';

// 2. Base styles (scrollbars, accessibility)
import './styles/bundles/base.css';

// 3. Utilities (typography, layout helpers)
import './styles/bundles/utilities.css';

// 4. Layout (page layout, header)
import './styles/bundles/layout.css';

// 5. Core components (buttons, modals, forms, auth)
import './styles/bundles/components-core.css';

// 6. UI components (cards, navigation, media)
import './styles/bundles/components-ui.css';

// 7. Feature components (employee, establishment)
import './styles/bundles/components-features.css';

// 8. App-specific styles
import './App.css';

// 9. Animations
import './styles/bundles/animations.css';

// 10. Responsive styles
import './styles/bundles/responsive.css';

// 11. Notifications
import './styles/bundles/notifications.css';

// 12. Modern CSS features
import './styles/bundles/modern.css';

// 13. Polish & fixes (MUST BE LAST for specificity)
import './styles/bundles/polish.css';

// Lazy load main route components for code splitting
import {
  AdminPanel,
  SearchPage,
  BarDetailPage,
  UserDashboard,
  MyEstablishmentsPage,
  EmployeeDashboard,
  MyOwnershipRequests,
  MyAchievementsPage,
  GamifiedUserProfile,
  NotFoundPage,
  EstablishmentsPage
} from './routes/lazyComponents';

// Auth pages - lazy loaded for direct URL access
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const AuthCallbackPage = React.lazy(() => import('./pages/AuthCallbackPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));

import ProtectedRoute from './components/Auth/ProtectedRoute';
import SEOHead from './components/Common/SEOHead';
import StructuredData, { createOrganizationSchema, createWebSiteSchema } from './components/Common/StructuredData';

const HomePage: React.FC = () => {
  logger.debug('HomePage rendering');

  return (
    <div className="App" style={{
      minHeight: '100vh',
      color: '#ffffff'
    }}>
      {/* SEO Meta Tags */}
      <SEOHead
        title="Home"
        description="Discover the best nightlife entertainment in Pattaya. Browse zones, find bars, clubs, and entertainment venues in Soi 6, Walking Street, LK Metro, and more."
        keywords={['Pattaya nightlife', 'Pattaya bars', 'Pattaya clubs', 'entertainment directory', 'nightlife guide']}
      />

      {/* Structured Data for Rich Snippets */}
      <StructuredData data={createOrganizationSchema()} />
      <StructuredData data={createWebSiteSchema()} />

      <main
        id="main-content"
        role="main"
        aria-label="Main content"
        className="page-content-with-header-nightlife"
        tabIndex={-1}
      >
        <Suspense fallback={<LoadingFallback message="Loading zones..." variant="page" />}>
          <ZoneGrid />
        </Suspense>
      </main>
    </div>
  );
};

/**
 * Page Tracker Component
 * Must be inside Router to access useLocation
 */
const PageTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search, document.title);
  }, [location]);

  return null;
};

/**
 * AppContent - Main application content with routing
 *
 * REFACTORED: Modal management moved to useAppModals hook
 * Modals are now rendered via ModalRenderer automatically
 */
/**
 * AppLayout - Inner component that handles conditional header rendering
 * Must be inside Router to use useLocation
 */
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  // Hide header on full-page auth routes (login/register have their own layout)
  const isAuthPage = location.pathname === '/login' ||
                     location.pathname === '/auth/callback' ||
                     location.pathname === '/reset-password';
  // Hide header on admin routes (admin has its own CommandHeader)
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <>
      {/* Skip to Content - Accessibility */}
      <SkipToContent />

      {/* Offline Banner - PWA v10.3 */}
      <OfflineBanner />

      {/* Header global - Hidden on auth pages and admin pages which have their own layout */}
      {!isAuthPage && !isAdminPage && (
        <Suspense fallback={null}>
          <Header />
        </Suspense>
      )}

      {/* XP Toast Notifications - Gamification v10.3 */}
      <Suspense fallback={null}>
        <XPToastNotifications />
      </Suspense>

      {children}
    </>
  );
};

const AppContent: React.FC = () => {
  const { user: _user } = useAuth();

  // 🎯 All modal logic centralized in useAppModals
  // These are extracted for potential direct use, but primarily used via ModalRenderer
  const {
    openEmployeeForm: _openEmployeeForm,
    openEstablishmentForm: _openEstablishmentForm,
    openLoginForm: _openLoginForm,
    handleEditMyProfile: _handleEditMyProfile,
    openUserInfoModal: _openUserInfoModal,
    handleSubmitEmployee: _handleSubmitEmployee,
    handleSubmitEstablishment: _handleSubmitEstablishment,
    isSubmitting: _isSubmitting
  } = useAppModals();

  return (
    <Router>
      {/* GA4 Page Tracking */}
      <PageTracker />

      <AppLayout>

      <ErrorBoundary boundaryName="MainRoutes">
        <Suspense fallback={<LoadingFallback message="Loading page..." variant="page" />}>
          <PageTransition>
            <Routes>
              {/* ========================================
                  PUBLIC ROUTES
                  ======================================== */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/establishments" element={<EstablishmentsPage />} />
              <Route path="/bar/:zone/:slug" element={
                <ErrorBoundary
                  boundaryName="BarDetail"
                  fallback={<RouteErrorFallback error={new Error('Failed to load bar details')} resetError={() => window.location.reload()} routeName="Bar Details" />}
                >
                  <BarDetailPage />
                </ErrorBoundary>
              } />
              <Route path="/bar/:id" element={
                <ErrorBoundary
                  boundaryName="BarDetail"
                  fallback={<RouteErrorFallback error={new Error('Failed to load bar details')} resetError={() => window.location.reload()} routeName="Bar Details" />}
                >
                  <BarDetailPage />
                </ErrorBoundary>
              } />

              {/* ========================================
                  PROTECTED ROUTES - Require Authentication
                  ======================================== */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <ErrorBoundary
                    boundaryName="UserDashboard"
                    fallback={<RouteErrorFallback error={new Error('Failed to load dashboard')} resetError={() => window.location.reload()} routeName="Dashboard" />}
                  >
                    <UserDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="/my-establishments" element={
                <ProtectedRoute requiredAccountTypes={['establishment_owner']}>
                  <ErrorBoundary
                    boundaryName="MyEstablishments"
                    fallback={<RouteErrorFallback error={new Error('Failed to load establishments')} resetError={() => window.location.reload()} routeName="My Establishments" />}
                  >
                    <MyEstablishmentsPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="/my-ownership-requests" element={
                <ProtectedRoute>
                  <ErrorBoundary
                    boundaryName="OwnershipRequests"
                    fallback={<RouteErrorFallback error={new Error('Failed to load requests')} resetError={() => window.location.reload()} routeName="Ownership Requests" />}
                  >
                    <MyOwnershipRequests />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="/employee/dashboard" element={
                <ProtectedRoute requiredAccountTypes={['employee']}>
                  <ErrorBoundary
                    boundaryName="EmployeeDashboard"
                    fallback={<RouteErrorFallback error={new Error('Failed to load employee dashboard')} resetError={() => window.location.reload()} routeName="Employee Dashboard" />}
                  >
                    <EmployeeDashboard />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="/achievements" element={
                <ProtectedRoute>
                  <ErrorBoundary
                    boundaryName="Achievements"
                    fallback={<RouteErrorFallback error={new Error('Failed to load achievements')} resetError={() => window.location.reload()} routeName="Achievements" />}
                  >
                    <MyAchievementsPage />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              <Route path="/user/:userId" element={
                <ProtectedRoute>
                  <ErrorBoundary
                    boundaryName="UserProfile"
                    fallback={<RouteErrorFallback error={new Error('Failed to load profile')} resetError={() => window.location.reload()} routeName="User Profile" />}
                  >
                    <GamifiedUserProfile />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              {/* ========================================
                  ADMIN ROUTES - Require Admin/Moderator Role
                  ======================================== */}
              <Route path="/admin/*" element={
                <ProtectedRoute requiredRoles={['admin', 'moderator']}>
                  <ErrorBoundary
                    boundaryName="AdminPanel"
                    fallback={<RouteErrorFallback error={new Error('Failed to load admin panel')} resetError={() => window.location.reload()} routeName="Admin Panel" />}
                  >
                    <AdminPanel />
                  </ErrorBoundary>
                </ProtectedRoute>
              } />

              {/* ========================================
                  404 CATCH-ALL - Must be last
                  ======================================== */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </PageTransition>
        </Suspense>
      </ErrorBoundary>
      </AppLayout>

      {/* 🎯 All modals rendered via ModalRenderer (using ModalContext) */}
      <ModalRenderer />
    </Router>
  );
};

const App: React.FC = () => {
  // Initialize GA4 and Web Vitals on app mount
  useEffect(() => {
    initGA();
    initWebVitals(); // Track Core Web Vitals (LCP, INP, CLS)
  }, []);

  return (
    <ErrorBoundary boundaryName="App">
      <HelmetProvider>
        <ThemeProvider>
          <QueryProvider>
            <CSRFProvider>
              <AuthProvider>
                <GamificationProvider>
                  <ModalProvider>
                    <SidebarProvider>
                      <NotificationProvider>
                        <AppContent />
                      </NotificationProvider>
                    </SidebarProvider>
                  </ModalProvider>
                </GamificationProvider>
              </AuthProvider>
            </CSRFProvider>
          </QueryProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
