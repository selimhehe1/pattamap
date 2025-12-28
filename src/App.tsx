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
import ZoneGrid from './components/Home/ZoneGrid';
import Header from './components/Layout/Header';
import SkipToContent from './components/Layout/SkipToContent';
import LoadingFallback from './components/Common/LoadingFallback';
import ErrorBoundary from './components/Common/ErrorBoundary';
import XPToastNotifications from './components/Gamification/XPToastNotifications';
import OfflineBanner from './components/Common/OfflineBanner';
import { logger } from './utils/logger';
import { Toaster } from './utils/toast';
import { initGA, initWebVitals, trackPageView } from './utils/analytics';
import { ThemeProvider } from './contexts/ThemeContext';
import PageTransition from './components/Common/PageTransition';

/**
 * ============================================
 * CSS IMPORT ORDER - DO NOT CHANGE
 * ============================================
 */
import './styles/design-system.css';
import './styles/base/scrollbars.css';
import './styles/base/accessibility.css';
import './styles/components/modals.css';
import './styles/global/utilities.css';
import './styles/utilities/typography.css';
import './styles/utilities/layout-containers.css';
import './styles/components/buttons.css';
import './styles/components/autocomplete.css';
import './styles/components/auth.css';
import './styles/components/EmptyState.css';
import './styles/components/mobile-menu.css'; // Phase 3 - Mobile hamburger menu
import './styles/admin/admin-employee-card.css'; // Phase 1 - Admin employee card styles
import './styles/admin/admin-light-mode.css'; // Phase 2 - Admin light mode overrides
import './App.css';
// REMOVED: import './styles/nightlife-theme.css'; - Legacy 9,145 line file deprecated
import './styles/responsive/large-desktop.css';
import './styles/responsive/landscape.css';
import './styles/theme-overrides.css';
import './styles/css-pro-polish.css';
import './styles/header-ultra-visibility.css';
import './styles/animations/scroll-animations.css';
import './styles/animations/shared-animations.css'; // Phase 6 - Shared animation utilities
import './styles/css-consolidated-fixes.css';
import './styles/modern/index.css'; // Phase 5.2: Container queries & scroll-driven animations

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
  VisitHistoryPage,
  NotFoundPage
} from './routes/lazyComponents';

// LoginPage - lazy loaded for direct URL access
const LoginPage = React.lazy(() => import('./pages/LoginPage'));

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
        <ZoneGrid />
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

      {/* Skip to Content - Accessibility */}
      <SkipToContent />

      {/* Offline Banner - PWA v10.3 */}
      <OfflineBanner />

      {/* Header global présent sur toutes les pages */}
      {/* Phase 4.4: Header now uses useAppModals hook directly - no props drilling */}
      <Header />

      {/* XP Toast Notifications - Gamification v10.3 */}
      <XPToastNotifications />

      <ErrorBoundary boundaryName="MainRoutes">
        <Suspense fallback={<LoadingFallback message="Loading page..." variant="page" />}>
          <PageTransition>
            <Routes>
              {/* ========================================
                  PUBLIC ROUTES
                  ======================================== */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/bar/:zone/:slug" element={<BarDetailPage />} />
              <Route path="/bar/:id" element={<BarDetailPage />} />

              {/* ========================================
                  PROTECTED ROUTES - Require Authentication
                  ======================================== */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              } />

              <Route path="/my-establishments" element={
                <ProtectedRoute requiredAccountTypes={['establishment_owner']}>
                  <MyEstablishmentsPage />
                </ProtectedRoute>
              } />

              <Route path="/my-ownership-requests" element={
                <ProtectedRoute>
                  <MyOwnershipRequests />
                </ProtectedRoute>
              } />

              <Route path="/employee/dashboard" element={
                <ProtectedRoute requiredAccountTypes={['employee']}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              } />

              <Route path="/achievements" element={
                <ProtectedRoute>
                  <MyAchievementsPage />
                </ProtectedRoute>
              } />

              <Route path="/my-visits" element={
                <ProtectedRoute>
                  <VisitHistoryPage />
                </ProtectedRoute>
              } />

              {/* ========================================
                  ADMIN ROUTES - Require Admin/Moderator Role
                  ======================================== */}
              <Route path="/admin/*" element={
                <ProtectedRoute requiredRoles={['admin', 'moderator']}>
                  <AdminPanel />
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

      {/* 🎯 All modals rendered via ModalRenderer (using ModalContext) */}
      <ModalRenderer />

      {/* Toast Container - Accessible notifications */}
      <Toaster />
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
                        <AppContent />
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
