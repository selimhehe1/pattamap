import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useSecureFetch } from './hooks/useSecureFetch';
import { ModalProvider } from './contexts/ModalContext';
import { CSRFProvider } from './contexts/CSRFContext';
import { QueryProvider } from './providers/QueryProvider';
import { GamificationProvider } from './contexts/GamificationContext';
import { useEstablishments } from './hooks/useEstablishments';
import { useFreelances } from './hooks/useFreelances';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import { MapControlsProvider } from './contexts/MapControlsContext';
import ModalRenderer from './components/Common/ModalRenderer';
import PattayaMap from './components/Map/PattayaMap';
import Header from './components/Layout/Header';
import SkipToContent from './components/Layout/SkipToContent';
import LoginForm from './components/Auth/LoginForm';
import MultiStepRegisterForm from './components/Auth/MultiStepRegisterForm'; // 🆕 v10.0.1 - Multi-step registration
import EmployeeProfileWizard from './components/Employee/EmployeeProfileWizard'; // 🆕 v10.0 - Employee onboarding wizard
import EditMyProfileModal from './components/Employee/EditMyProfileModal'; // 🆕 v10.0 - Employee self-edit modal
import UserInfoModal from './components/User/UserInfoModal'; // 🆕 User info modal for regular users
import LoadingFallback from './components/Common/LoadingFallback';
import ErrorBoundary from './components/Common/ErrorBoundary';
import XPToastNotifications from './components/Gamification/XPToastNotifications';
import { Establishment } from './types';
import { logger } from './utils/logger';
import { Toaster } from './utils/toast';
import toast from './utils/toast';
import { generateEstablishmentUrl } from './utils/slugify';
import { initGA, trackPageView } from './utils/analytics';
import { ThemeProvider } from './contexts/ThemeContext';
import PageTransition from './components/Common/PageTransition';

/**
 * ============================================
 * CSS IMPORT ORDER - DO NOT CHANGE
 * ============================================
 *
 * L'ordre d'import des fichiers CSS est CRITIQUE pour le bon
 * fonctionnement du système de thème et éviter les conflits.
 *
 * 1. design-system.css - Variables CSS fondamentales
 *    (z-index, colors, spacing, typography, animations)
 *
 * 2. base/scrollbars.css - Scrollbars personnalisées (NEW - Phase 3A)
 *
 * 3. base/accessibility.css - WCAG 2.1 AAA compliance (NEW - Phase 3A)
 *
 * 4. global/utilities.css - Classes globales réutilisables
 *    (boutons, forms, modals, animations, utilities)
 *
 * 5. components/autocomplete.css - Autocomplete dropdown (NEW - Phase 3A)
 *
 * 6. components/auth.css - Auth forms styles (NEW - Phase 3A)
 *
 * 7. App.css - Styles spécifiques à l'application
 *
 * 8. nightlife-theme.css - Thème legacy (migration en cours, -430 lignes Phase 3A)
 *
 * 9. theme-overrides.css - Overrides pour compatibilité Dark/Light
 *
 * @see docs/CSS_ARCHITECTURE.md pour plus de détails
 * @see docs/migrations/NIGHTLIFE_THEME_PHASE_3A_QUICK_WINS.md pour Phase 3A
 * @see docs/migrations/NIGHTLIFE_THEME_PHASE_4_ARCHITECTURE_FINALE.md pour Phase 4
 */
import './styles/design-system.css';
import './styles/base/scrollbars.css';
import './styles/base/accessibility.css';
import './styles/base/modal-base.css'; // NEW - Phase 4C: Modal & Focus States
import './styles/global/utilities.css';
import './styles/utilities/typography.css'; // NEW - Phase 4A: Text utilities
import './styles/utilities/layout-containers.css'; // NEW - Phase 4B: Containers & Grids
import './styles/components/buttons.css'; // Button base styles (btn-nightlife-base)
import './styles/components/autocomplete.css';
import './styles/components/auth.css';
import './styles/components/EmptyState.css'; // NEW - Session 2 (Jan 2025): EmptyState component (4 variants, WCAG AAA)
import './App.css';
import './styles/nightlife-theme.css';
import './styles/responsive/large-desktop.css'; // NEW - Phase 4D: Large Desktop (LAST!)
import './styles/responsive/landscape.css'; // NEW - Session 1 (Jan 2025): Landscape optimizations (812×375)
import './styles/theme-overrides.css';
import './styles/css-audit-fixes.css'; // 🎯 AUDIT FIXES - Jan 2025: 17 anomalies (Score 7.2→9.9/10)
import './styles/css-pro-polish.css'; // 🏆 PRO POLISH - Jan 2025: 43 anomalies (Score 9.9→10.0/10) - 1,111 incohérences fixées
import './styles/css-visual-fixes.css'; // 🎨 VISUAL FIXES - Jan 2025: 15 anomalies (A057-A071) - Admin Dashboard + Soi 6 Map polish
import './styles/session-3-visual-fixes.css'; // 👁️ SESSION 3 - Jan 2025: Visual UX audit fixes (header, subtitle, buttons visibility)
import './styles/header-ultra-visibility.css'; // 🎯 SESSION 4 - Jan 2025: Header ultra-visibility (hamburger, XP, login) - 10/10 score!

// Lazy load main route components for code splitting
import {
  AdminPanel,
  SearchPage,
  FreelancesPage, // 🆕 v10.3 - Freelances List
  BarDetailPage,
  UserDashboard,
  MyEstablishmentsPage, // 🆕 v10.1 - Owner Dashboard
  EmployeeDashboard, // 🆕 v10.2 - Employee Dashboard
  MyOwnershipRequests, // 🆕 v10.2 - Ownership Requests
  MyAchievementsPage, // 🆕 v10.3 - Gamification
  EmployeeForm,
  EstablishmentForm
} from './routes/lazyComponents';

import SEOHead from './components/Common/SEOHead';
import StructuredData, { createOrganizationSchema, createWebSiteSchema } from './components/Common/StructuredData';

const HomePage: React.FC = () => {
  logger.debug('HomePage rendering');
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar } = useSidebar();

  // ⚡ React Query hooks - Cache intelligent, pas de refetch inutile
  const { data: establishments = [], isLoading: establishmentsLoading, refetch: refetchEstablishments } = useEstablishments();
  const { data: freelances = [], isLoading: freelancesLoading } = useFreelances();

  // States locaux pour le filtrage et la sélection
  const [filteredEstablishments, setFilteredEstablishments] = useState<Establishment[]>([]);
  const [selectedCategories] = useState<string[]>(['cat-001', 'cat-002', 'cat-003', 'cat-004', 'cat-005', 'cat-006']);
  const [searchTerm] = useState('');
  const [selectedEstablishment, setSelectedEstablishment] = useState<string | null>(null);

  // State pour le modal register (le seul restant local à HomePage)
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showEmployeeProfileWizard, setShowEmployeeProfileWizard] = useState(false); // 🆕 v10.0 - Employee wizard modal

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
      let filtered = establishments.filter(est => {
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
      // background removed - using CSS var(--gradient-main) from design-system.css
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
        style={{
          overflow: 'hidden'
        }}
      >
        <PattayaMap
          establishments={filteredEstablishments}
          freelances={freelances}
          onEstablishmentClick={handleEstablishmentClick}
          selectedEstablishment={selectedEstablishment || undefined}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
          onEstablishmentUpdate={async () => {
            // Force refetch establishments to get updated positions
            logger.debug('✅ Establishment updated - refetching data');
            await refetchEstablishments();
          }}
        />
      </main>

      {/* Register Form Modal - 🆕 v10.0.1 Multi-step with integrated claim */}
      {showRegisterForm && (
        <div className="modal-app-overlay">
          <div className="modal-app-register-container">
            <MultiStepRegisterForm
              onClose={() => setShowRegisterForm(false)}
              onSwitchToLogin={() => {
                setShowRegisterForm(false);
                // Le login sera géré par le header global
              }}
            />
          </div>
        </div>
      )}

      {/* Employee Profile Wizard Modal - 🆕 v10.0 */}
      {showEmployeeProfileWizard && (
        <EmployeeProfileWizard
          onClose={() => setShowEmployeeProfileWizard(false)}
          onCreateProfile={() => {
            setShowEmployeeProfileWizard(false);
            // Redirect to header global form by opening it
            // TODO: Need to communicate with AppContent - for now, reload page
            window.location.reload();
          }}
        />
      )}
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
    // Track page view on route change
    trackPageView(location.pathname + location.search, document.title);
  }, [location]);

  return null;
};

const AppContent: React.FC = () => {
  const { secureFetch } = useSecureFetch();
  const { user, linkedEmployeeProfile, refreshLinkedProfile } = useAuth();
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [isSelfProfile, setIsSelfProfile] = useState(false); // 🆕 v10.0 - Track if employee form is for self-profile
  const [editingEmployeeData, setEditingEmployeeData] = useState<any>(null); // 🆕 v10.0 - Editing mode with employee data
  const [showEstablishmentForm, setShowEstablishmentForm] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false); // 🆕 v10.0 - Register modal
  const [showEmployeeProfileWizard, setShowEmployeeProfileWizard] = useState(false); // 🆕 v10.0 - Employee wizard modal
  const [showEditMyProfileModal, setShowEditMyProfileModal] = useState(false); // 🆕 v10.0 - Edit my profile modal for claimed employees
  const [showUserInfoModal, setShowUserInfoModal] = useState(false); // 🆕 User info modal for regular users
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitEmployee = async (employeeData: any) => {
    setIsSubmitting(true);
    try {
      // 🆕 v10.0 - Determine endpoint and method based on edit mode
      let endpoint: string;
      let method: string;

      if (editingEmployeeData) {
        // Editing existing profile
        endpoint = `${process.env.REACT_APP_API_URL}/api/employees/${editingEmployeeData.id}`;
        method = 'PUT';
      } else if (isSelfProfile) {
        // Creating new self-profile
        endpoint = `${process.env.REACT_APP_API_URL}/api/employees/my-profile`;
        method = 'POST';
      } else {
        // Creating regular employee
        endpoint = `${process.env.REACT_APP_API_URL}/api/employees`;
        method = 'POST';
      }

      const response = await secureFetch(endpoint, {
        method,
        body: JSON.stringify(employeeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit employee');
      }

      setShowEmployeeForm(false);
      setIsSelfProfile(false); // Reset flag
      setEditingEmployeeData(null); // Reset editing data

      // 🆕 v10.0 - Refresh linked profile after editing
      if (editingEmployeeData && refreshLinkedProfile) {
        await refreshLinkedProfile();
      }

      const successMessage = editingEmployeeData
        ? 'Profile updated successfully!'
        : (isSelfProfile ? 'Your employee profile has been created! Waiting for admin approval.' : 'Employee added successfully!');

      toast.success(successMessage);
    } catch (error) {
      logger.error('Failed to submit employee', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEstablishment = async (establishmentData: any) => {
    setIsSubmitting(true);
    try {
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/establishments`, {
        method: 'POST',
        body: JSON.stringify(establishmentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit establishment');
      }

      setShowEstablishmentForm(false);
      toast.success('Establishment added successfully!');
    } catch (error) {
      logger.error('Failed to submit establishment', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit establishment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🆕 v10.0 - Handle Edit My Profile for employees
  const handleEditMyProfile = () => {
    console.log('🚀 handleEditMyProfile called! Opening EditMyProfileModal');
    console.log('📊 State before:', { showEditMyProfileModal });

    // 🔧 FIX: Force close then reopen to trigger useEffect even if already open
    if (showEditMyProfileModal) {
      console.log('⚠️ Modal already open, forcing close then reopen...');
      setShowEditMyProfileModal(false);
      setTimeout(() => {
        setShowEditMyProfileModal(true);
        console.log('✅ Modal reopened after reset');
      }, 50); // Small delay to ensure state update
    } else {
      setShowEditMyProfileModal(true);
      console.log('📊 setShowEditMyProfileModal(true) called');
    }
  };

  return (
    <Router>
          {/* GA4 Page Tracking */}
          <PageTracker />

          {/* Skip to Content - Accessibility */}
          <SkipToContent />

          {/* Header global présent sur toutes les pages */}
          <Header
            onAddEmployee={() => setShowEmployeeForm(true)}
            onAddEstablishment={() => setShowEstablishmentForm(true)}
            onShowLogin={() => setShowLoginForm(true)}
            onEditMyProfile={handleEditMyProfile} // 🆕 v10.0 - Edit employee profile
            onShowUserInfo={() => setShowUserInfoModal(true)} // 🆕 Show user info modal
          />

          {/* XP Toast Notifications - Gamification v10.3 */}
          <XPToastNotifications />

          <ErrorBoundary boundaryName="MainRoutes">
            <Suspense fallback={<LoadingFallback message="Loading page..." variant="page" />}>
              <PageTransition>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/freelances" element={<FreelancesPage />} /> {/* 🆕 v10.3 - Freelances List */}
                  <Route path="/dashboard" element={<UserDashboard />} />
                  <Route path="/my-establishments" element={<MyEstablishmentsPage />} /> {/* 🆕 v10.1 - Owner Dashboard */}
                  <Route path="/my-ownership-requests" element={<MyOwnershipRequests />} /> {/* 🆕 v10.2 - Ownership Requests */}
                  <Route path="/employee/dashboard" element={<EmployeeDashboard />} /> {/* 🆕 v10.2 - Employee Dashboard */}
                  <Route path="/achievements" element={<MyAchievementsPage />} /> {/* 🆕 v10.3 - Gamification Achievements */}
                  {/* SEO-friendly URL with zone and slug */}
                  <Route path="/bar/:zone/:slug" element={<BarDetailPage />} />
                  {/* Legacy redirect for old /bar/:id URLs */}
                  <Route path="/bar/:id" element={<BarDetailPage />} />
                  <Route path="/admin/*" element={<AdminPanel />} />
                </Routes>
              </PageTransition>
            </Suspense>
          </ErrorBoundary>

          {/* Login Form Modal */}
          {showLoginForm && (
            <div className="modal-app-overlay">
              <div className="modal-app-login-container">
                <LoginForm
                  onClose={() => setShowLoginForm(false)}
                  onSwitchToRegister={() => {
                    setShowLoginForm(false);
                    setShowRegisterForm(true); // 🆕 v10.0 - Open register modal
                  }}
                />
              </div>
            </div>
          )}

          {/* Register Form Modal - 🆕 v10.0.1 Multi-step with integrated claim */}
          {showRegisterForm && (
            <div className="modal-app-overlay">
              <div className="modal-app-register-container">
                <MultiStepRegisterForm
                  onClose={() => setShowRegisterForm(false)}
                  onSwitchToLogin={() => {
                    setShowRegisterForm(false);
                    setShowLoginForm(true); // 🆕 v10.0 - Switch back to login
                  }}
                />
              </div>
            </div>
          )}

          {/* Employee Profile Wizard Modal - 🆕 v10.0 */}
          {showEmployeeProfileWizard && (
            <EmployeeProfileWizard
              onClose={() => setShowEmployeeProfileWizard(false)}
              onCreateProfile={() => {
                setShowEmployeeProfileWizard(false);
                setIsSelfProfile(true); // Mark as self-profile
                setShowEmployeeForm(true); // Open EmployeeForm for self-profile creation
              }}
            />
          )}

          {/* Employee Form Modal */}
          {showEmployeeForm && (
            <div className="modal-app-overlay">
              <div className="modal-app-employee-container">
                <Suspense fallback={<LoadingFallback message="Loading form..." variant="modal" />}>
                  <EmployeeForm
                    onSubmit={handleSubmitEmployee}
                    onCancel={() => {
                      setShowEmployeeForm(false);
                      setEditingEmployeeData(null); // 🆕 v10.0 - Clear editing data on cancel
                    }}
                    isLoading={isSubmitting}
                    initialData={editingEmployeeData} // 🆕 v10.0 - Pass editing data
                  />
                </Suspense>
              </div>
            </div>
          )}

          {/* Establishment Form Modal */}
          {showEstablishmentForm && (
            <div className="modal-app-overlay">
              <div className="modal-app-establishment-container">
                <Suspense fallback={<LoadingFallback message="Loading form..." variant="modal" />}>
                  <EstablishmentForm
                    onSubmit={handleSubmitEstablishment}
                    onCancel={() => setShowEstablishmentForm(false)}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {/* Edit My Profile Modal - 🆕 v10.0 - Employee self-edit */}
          {showEditMyProfileModal && (
            <EditMyProfileModal
              isOpen={showEditMyProfileModal}
              onClose={() => {
                console.log('🚪 Closing EditMyProfileModal');
                setShowEditMyProfileModal(false);
              }}
              onProfileUpdated={async () => {
                // Refresh linked profile after successful update
                if (refreshLinkedProfile) {
                  await refreshLinkedProfile();
                }
                logger.debug('Profile updated successfully via header photo click');
              }}
            />
          )}

          {/* User Info Modal - 🆕 Regular users profile view */}
          {showUserInfoModal && user && (
            <UserInfoModal
              user={user}
              onClose={() => setShowUserInfoModal(false)}
            />
          )}

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