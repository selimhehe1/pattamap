import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from '@dr.pogodin/react-helmet';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import { CSRFProvider } from './contexts/CSRFContext';
import { QueryProvider } from './providers/QueryProvider';
import { GamificationProvider } from './contexts/GamificationContext';
import { useEstablishments } from './hooks/useEstablishments';
import { useFreelances } from './hooks/useFreelances';
import { useAppModals } from './hooks/useAppModals';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import { MapControlsProvider } from './contexts/MapControlsContext';
import ModalRenderer from './components/Common/ModalRenderer';
import PattayaMap from './components/Map/PattayaMap';
import Header from './components/Layout/Header';
import SkipToContent from './components/Layout/SkipToContent';
import LoadingFallback from './components/Common/LoadingFallback';
import ErrorBoundary from './components/Common/ErrorBoundary';
import XPToastNotifications from './components/Gamification/XPToastNotifications';
import OfflineBanner from './components/Common/OfflineBanner';
import { Establishment } from './types';
import { logger } from './utils/logger';
import { Toaster } from './utils/toast';
import { generateEstablishmentUrl } from './utils/slugify';
import { initGA, trackPageView } from './utils/analytics';
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
import './styles/base/modal-base.css';
import './styles/global/utilities.css';
import './styles/utilities/typography.css';
import './styles/utilities/layout-containers.css';
import './styles/components/buttons.css';
import './styles/components/autocomplete.css';
import './styles/components/auth.css';
import './styles/components/EmptyState.css';
import './styles/components/mobile-menu.css'; // Phase 3 - Mobile hamburger menu
import './App.css';
// REMOVED: import './styles/nightlife-theme.css'; - Legacy 9,145 line file deprecated
import './styles/responsive/large-desktop.css';
import './styles/responsive/landscape.css';
import './styles/theme-overrides.css';
import './styles/css-pro-polish.css';
import './styles/header-ultra-visibility.css';
import './styles/animations/scroll-animations.css';
import './styles/css-consolidated-fixes.css';
import './styles/modern/index.css'; // Phase 5.2: Container queries & scroll-driven animations

// Lazy load main route components for code splitting
import {
  AdminPanel,
  SearchPage,
  FreelancesPage,
  BarDetailPage,
  UserDashboard,
  MyEstablishmentsPage,
  EmployeeDashboard,
  MyOwnershipRequests,
  MyAchievementsPage,
  VisitHistoryPage,
  NotFoundPage
} from './routes/lazyComponents';

import ProtectedRoute from './components/Auth/ProtectedRoute';
import SEOHead from './components/Common/SEOHead';
import StructuredData, { createOrganizationSchema, createWebSiteSchema } from './components/Common/StructuredData';

const HomePage: React.FC = () => {
  logger.debug('HomePage rendering');
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useSidebar();

  // React Query hooks
  const { data: establishments = [], isLoading: establishmentsLoading, isError: establishmentsError, refetch: refetchEstablishments } = useEstablishments();
  const { data: freelances = [], isLoading: freelancesLoading } = useFreelances();

  // Local states for filtering and selection
  const [filteredEstablishments, setFilteredEstablishments] = useState<Establishment[]>([]);
  const [selectedCategories] = useState<string[]>(['cat-001', 'cat-002', 'cat-003', 'cat-004', 'cat-005', 'cat-006']);
  const [searchTerm] = useState('');
  const [selectedEstablishment, setSelectedEstablishment] = useState<string | null>(null);

  logger.debug('HomePage state from React Query', {
    establishmentsCount: establishments.length,
    freelancesCount: freelances.length,
    filteredCount: filteredEstablishments.length,
    isLoading: establishmentsLoading || freelancesLoading
  });

  // Filter establishments based on search and categories
  useEffect(() => {
    if (establishments.length > 0) {
      logger.debug('Filtering establishments', { selectedCategories });
      const filtered = establishments.filter(est => {
        const isIncluded = selectedCategories.includes(`cat-${String(est.category_id).padStart(3, '0')}`);
        return isIncluded &&
          (est.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           est.address.toLowerCase().includes(searchTerm.toLowerCase()));
      });
      logger.debug('Establishments filtered', {
        total: filtered.length,
        soi6Count: filtered.filter(e => e.zone === 'soi6').length
      });
      setFilteredEstablishments(filtered);
    }
  }, [establishments, selectedCategories, searchTerm]);

  // Handlers
  const handleEstablishmentClick = (establishment: Establishment) => {
    setSelectedEstablishment(establishment.id);
    const seoUrl = generateEstablishmentUrl(establishment.id, establishment.name, establishment.zone || 'other');
    navigate(seoUrl);
  };

  return (
    <div className="App" style={{
      minHeight: '100vh',
      color: '#ffffff'
    }}>
      {/* SEO Meta Tags */}
      <SEOHead
        title="Home"
        description="Discover the best nightlife entertainment in Pattaya. Interactive maps, reviews, employee profiles, and real-time information for bars, clubs, and entertainment venues."
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
        style={{ overflow: 'hidden' }}
      >
        <PattayaMap
          establishments={filteredEstablishments}
          freelances={freelances}
          onEstablishmentClick={handleEstablishmentClick}
          selectedEstablishment={selectedEstablishment || undefined}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
          isError={establishmentsError}
          onRetry={() => refetchEstablishments()}
          onEstablishmentUpdate={async () => {
            logger.debug('✅ Establishment updated - refetching data');
            await refetchEstablishments();
          }}
        />
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
              <Route path="/search" element={<SearchPage />} />
              <Route path="/freelances" element={<FreelancesPage />} />
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
  // Initialize GA4 on app mount
  useEffect(() => {
    initGA();
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
                      <MapControlsProvider>
                        <AppContent />
                      </MapControlsProvider>
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
