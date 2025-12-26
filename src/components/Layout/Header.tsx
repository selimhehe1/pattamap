import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Star,
  Trophy,
  Sparkles,
  Building2,
  Settings,
  LogOut,
  Rocket,
  User,
  Crown,
  Zap,
  BarChart3,
  FileEdit,
  ClipboardList,
  Building,
  MapPin, // 🆕 v10.3 - Visit History icon
  List,
  Map,
  Users
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGamification } from '../../contexts/GamificationContext';
import { useLocation } from 'react-router-dom';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { createPreloadHandler } from '../../utils/routePreloader';
import {
  importSearchPage,
  importUserDashboard,
  importAdminPanel,
  importMyEstablishmentsPage, // 🆕 v10.1 - Owner Dashboard preload
  importMyOwnershipRequests, // 🆕 v10.2 - Ownership Requests preload
  importEmployeeDashboard, // 🆕 v10.2 - Employee Dashboard preload
  importMyAchievementsPage, // 🆕 v10.3 - Gamification preload
  importVisitHistoryPage, // 🆕 v10.3 - Visit History preload
  importFreelancesPage // 🆕 Freelances page preload
} from '../../routes/lazyComponents';
import ThemeToggle from '../Common/ThemeToggle';
import AnimatedButton from '../Common/AnimatedButton';
import LanguageSelector from '../Common/LanguageSelector';
import LazyImage from '../Common/LazyImage';
import NotificationBell from '../Common/NotificationBell'; // 🆕 v10.2 - Notifications (using RPC functions)
import SyncIndicator from '../Common/SyncIndicator'; // 🆕 v10.4 - Offline sync queue indicator
import MobileMenu from './MobileMenu'; // Phase 3 - Mobile hamburger menu
import { useMapControls } from '../../contexts/MapControlsContext';
import { useAppModals } from '../../hooks/useAppModals'; // 🆕 Phase 4.4 - Direct modal access
import { useMediaQuery } from '../../hooks/useMediaQuery'; // Phase 3 - Responsive detection
import '../../styles/layout/header.css';

/**
 * Header Component
 *
 * Phase 4.4 Refactor: Removed props drilling for modal callbacks.
 * Now uses useAppModals hook directly for all modal operations.
 */
const Header: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout, linkedEmployeeProfile } = useAuth();
  const { userProgress } = useGamification();
  const navigate = useNavigateWithTransition();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // 🆕 Phase 4.4: Direct modal access via hook (replaces props drilling)
  const {
    openLoginForm,
    openEmployeeForm,
    openEstablishmentForm,
    handleEditMyProfile,
    openUserInfoModal
  } = useAppModals();

  // Detect if we're on the home page
  const isHomePage = location.pathname === '/';

  // Phase 3: Detect mobile for hamburger menu
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Map controls from context (only used on homepage)
  const { viewMode, setViewMode } = useMapControls();

  // Memoized navigation handlers to prevent unnecessary re-renders
  const handleNavigate = useCallback((path: string) => {
    setShowUserMenu(false);
    navigate(path);
  }, [navigate]);

  const handleAvatarClick = useCallback(() => {
    setShowUserMenu(false);
    if (user?.account_type === 'employee') {
      handleEditMyProfile();
    } else {
      openUserInfoModal();
    }
  }, [user?.account_type, handleEditMyProfile, openUserInfoModal]);

  const handleAddEmployee = useCallback(() => {
    setShowUserMenu(false);
    openEmployeeForm();
  }, [openEmployeeForm]);

  const handleAddEstablishment = useCallback(() => {
    setShowUserMenu(false);
    openEstablishmentForm();
  }, [openEstablishmentForm]);

  const handleLogout = useCallback(() => {
    setShowUserMenu(false);
    logout();
    navigate('/');
  }, [logout, navigate]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <>
      <header
        role="banner"
        aria-label="Main navigation"
        className="header-modern view-transition-header"
        data-testid="header">
        {/* Section gauche avec bouton retour et titre */}
        <div className="header-logo-section">
          {/* Bouton retour - masqué sur la page d'accueil */}
          {!isHomePage && (
            <AnimatedButton
              onClick={() => navigate('/')}
              ariaLabel="Return to map page"
              tabIndex={0}
              enableHaptic
              hapticLevel="light"
              className="header-back-btn"
              data-testid="back-button"
            >
              <span className="header-back-icon">←</span>
            </AnimatedButton>
          )}

          <div className="header-branding" data-testid="logo">
            <h1 className="header-title">
              {t('header.title')}
              {process.env.NODE_ENV === 'development' && (
                <span className="header-dev-badge">DEV</span>
              )}
            </h1>
            <p className="header-subtitle">
              {t('header.subtitle')}
            </p>
          </div>
        </div>

        {/* Navigation moderne et épurée - Phase 3 Redesign */}
        <nav role="navigation" aria-label="Main actions" className="header-nav">
          {/* Quick Actions Group - Desktop only */}
          <div className="header-quick-actions">
            {/* Search Quick Access */}
            <AnimatedButton
              onClick={() => navigate('/search')}
              onMouseEnter={createPreloadHandler(importSearchPage, 'SearchPage')}
              ariaLabel={t('header.search')}
              tabIndex={0}
              enableHaptic
              hapticLevel="light"
              className="header-quick-btn"
              data-testid="quick-search"
            >
              <Search size={18} />
            </AnimatedButton>

            {/* Favorites Quick Access */}
            {user && (
              <AnimatedButton
                onClick={() => navigate('/dashboard')}
                onMouseEnter={createPreloadHandler(importUserDashboard, 'UserDashboard')}
                ariaLabel={t('header.favorites')}
                tabIndex={0}
                enableHaptic
                hapticLevel="light"
                className="header-quick-btn"
                data-testid="quick-favorites"
              >
                <Star size={18} />
              </AnimatedButton>
            )}
          </div>

          {/* Map Controls - Icon-only on desktop, hidden on mobile */}
          {isHomePage && (
            <div className="header-map-controls">
              <button
                onClick={() => setViewMode('list')}
                className={`header-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                aria-label={t('map.viewList')}
                title={t('map.viewList')}
                aria-current={viewMode === 'list' ? 'page' : undefined}
              >
                <List size={16} />
              </button>

              <button
                onClick={() => setViewMode('map')}
                className={`header-view-btn header-view-btn--primary ${viewMode === 'map' ? 'active' : ''}`}
                aria-label={t('map.viewMap')}
                title={t('map.viewMap')}
                aria-current={viewMode === 'map' ? 'page' : undefined}
              >
                <Map size={18} />
              </button>

              <button
                onClick={() => setViewMode('employees')}
                className={`header-view-btn ${viewMode === 'employees' ? 'active' : ''}`}
                aria-label={t('map.lineup')}
                title={t('map.lineup')}
                aria-current={viewMode === 'employees' ? 'page' : undefined}
              >
                <Users size={16} />
              </button>
            </div>
          )}

          {/* Notification Bell - visible seulement pour utilisateurs connectés */}
          {user && <NotificationBell />}

          {/* Sync Indicator - shows pending offline actions */}
          <SyncIndicator compact />

          {/* XP Badge - Compact level indicator */}
          {user && userProgress && (
            <button
              className="header-xp-badge"
              title={`Level ${userProgress.current_level} - ${userProgress.total_xp.toLocaleString()} XP\nClick to view achievements`}
              onClick={() => navigate('/achievements')}
              aria-label={`Level ${userProgress.current_level}, ${userProgress.total_xp.toLocaleString()} XP`}
              data-testid="xp"
            >
              <Trophy size={14} className="header-xp-icon" />
              <span className="header-xp-level">{userProgress.current_level}</span>
            </button>
          )}

          {/* Menu Button/Avatar */}
          <AnimatedButton
            ref={menuButtonRef}
            onClick={() => setShowUserMenu(!showUserMenu)}
            ariaLabel={user ? `User menu for ${user.pseudonym}. ${showUserMenu ? 'Close' : 'Open'} menu` : showUserMenu ? 'Close menu' : 'Open menu'}
            tabIndex={0}
            enableHaptic
            hapticLevel="light"
            className="header-menu-btn"
            data-testid="mobile-menu"
          >
            <span className="header-menu-icon">{showUserMenu ? '✕' : '☰'}</span>
          </AnimatedButton>

          {/* Desktop Dropdown - Hidden on mobile (MobileMenu used instead) */}
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            {showUserMenu && user && !isMobile && (
                    <div className="user-menu-dropdown-modern" data-testid="user-menu" role="menu">
                      {/* User Info - Compact */}
                      <div className="user-menu-header">
                        <button
                          className="user-menu-avatar-small"
                          onClick={handleAvatarClick}
                          aria-label={
                            user.account_type === 'employee'
                              ? 'Click to edit your profile'
                              : 'Click to view your profile'
                          }
                        >
                          {user.account_type === 'employee' && user.linked_employee_id && linkedEmployeeProfile?.photos?.[0] ? (
                            <LazyImage
                              src={linkedEmployeeProfile.photos[0]}
                              alt={linkedEmployeeProfile.name}
                              className="user-menu-avatar-image"
                              objectFit="cover"
                            />
                          ) : (
                            <div className="user-menu-avatar-icon"><User size={20} /></div>
                          )}
                        </button>
                        <div className="user-menu-info">
                          <span className="user-menu-name">{user.pseudonym}</span>
                          <span className="user-menu-badge">
                            {user.role === 'admin' ? (
                              <><Crown size={12} /> ADMIN</>
                            ) : user.role === 'moderator' ? (
                              <><Zap size={12} /> MOD</>
                            ) : (
                              <><User size={12} /> USER</>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Navigation Section */}
                      <div className="menu-section">
                        <div className="menu-section-label">NAVIGATION</div>
                        <AnimatedButton
                          ariaLabel="Search employees"
                          tabIndex={0}
                          enableHaptic
                          hapticLevel="light"
                          className="menu-item-modern"
                          onMouseEnter={createPreloadHandler(importSearchPage, 'SearchPage')}
                          onClick={() => handleNavigate('/search')}
                        >
                          <span className="menu-item-icon"><Search size={18} /></span>
                          <span className="menu-item-text">{t('header.search')}</span>
                        </AnimatedButton>

                        <AnimatedButton
                          ariaLabel="Browse freelances"
                          tabIndex={0}
                          enableHaptic
                          hapticLevel="light"
                          className="menu-item-modern"
                          onMouseEnter={createPreloadHandler(importFreelancesPage, 'FreelancesPage')}
                          onClick={() => handleNavigate('/freelances')}
                        >
                          <span className="menu-item-icon"><Users size={18} /></span>
                          <span className="menu-item-text">{t('header.freelances', 'Freelances')}</span>
                        </AnimatedButton>

                        <AnimatedButton
                          ariaLabel="My favorites"
                          tabIndex={0}
                          enableHaptic
                          hapticLevel="light"
                          className="menu-item-modern"
                          onMouseEnter={createPreloadHandler(importUserDashboard, 'UserDashboard')}
                          onClick={() => handleNavigate('/dashboard')}
                        >
                          <span className="menu-item-icon"><Star size={18} /></span>
                          <span className="menu-item-text">{t('header.favorites')}</span>
                        </AnimatedButton>

                        <AnimatedButton
                          ariaLabel="View my achievements and progress"
                          tabIndex={0}
                          enableHaptic
                          hapticLevel="light"
                          className="menu-item-modern"
                          onMouseEnter={createPreloadHandler(importMyAchievementsPage, 'MyAchievementsPage')}
                          onClick={() => handleNavigate('/achievements')}
                        >
                          <span className="menu-item-icon"><Trophy size={18} /></span>
                          <span className="menu-item-text">{t('header.achievements')}</span>
                        </AnimatedButton>

                        <AnimatedButton
                          ariaLabel="View my visit history"
                          tabIndex={0}
                          enableHaptic
                          hapticLevel="light"
                          className="menu-item-modern"
                          onMouseEnter={createPreloadHandler(importVisitHistoryPage, 'VisitHistoryPage')}
                          onClick={() => handleNavigate('/my-visits')}
                        >
                          <span className="menu-item-icon"><MapPin size={18} /></span>
                          <span className="menu-item-text">{t('header.myVisits')}</span>
                        </AnimatedButton>
                      </div>

                      {/* Actions Section */}
                      <div className="menu-section">
                        <div className="menu-section-label">ACTIONS</div>
                        <AnimatedButton
                          ariaLabel="Add new employee to the directory"
                          tabIndex={0}
                          enableHaptic
                          hapticLevel="light"
                          className="menu-item-modern"
                          onClick={handleAddEmployee}
                        >
                          <span className="menu-item-icon"><Sparkles size={18} /></span>
                          <span className="menu-item-text">{t('header.addEmployee')}</span>
                        </AnimatedButton>

                        <AnimatedButton
                          ariaLabel="Add new establishment to the directory"
                          tabIndex={0}
                          enableHaptic
                          hapticLevel="light"
                          className="menu-item-modern"
                          onClick={handleAddEstablishment}
                        >
                          <span className="menu-item-icon"><Building2 size={18} /></span>
                          <span className="menu-item-text">{t('header.addEstablishment')}</span>
                        </AnimatedButton>
                      </div>

                      {/* Admin Section */}
                      {(user.role === 'admin' || user.role === 'moderator' || user.account_type === 'establishment_owner' || user.account_type === 'employee') && (
                        <div className="menu-section">
                          <div className="menu-section-label">
                            {user.role === 'admin' || user.role === 'moderator' ? 'ADMIN' : 'MANAGEMENT'}
                          </div>

                          {(user.role === 'admin' || user.role === 'moderator') && (
                            <AnimatedButton
                              ariaLabel="Navigate to admin dashboard"
                              tabIndex={0}
                              enableHaptic
                              hapticLevel="light"
                              className="menu-item-modern"
                              onMouseEnter={createPreloadHandler(importAdminPanel, 'AdminPanel')}
                              onClick={() => handleNavigate('/admin')}
                            >
                              <span className="menu-item-icon"><Settings size={18} /></span>
                              <span className="menu-item-text">{t('header.admin')}</span>
                            </AnimatedButton>
                          )}

                          {user.account_type === 'establishment_owner' && (
                            <>
                              <AnimatedButton
                                ariaLabel="Manage my establishments"
                                tabIndex={0}
                                enableHaptic
                                hapticLevel="light"
                                className="menu-item-modern"
                                onMouseEnter={createPreloadHandler(importMyEstablishmentsPage, 'MyEstablishmentsPage')}
                                onClick={() => handleNavigate('/my-establishments')}
                              >
                                <span className="menu-item-icon"><Building size={18} /></span>
                                <span className="menu-item-text">{t('header.myEstablishments', 'My Establishments')}</span>
                              </AnimatedButton>

                              <AnimatedButton
                                ariaLabel="View my ownership requests"
                                tabIndex={0}
                                enableHaptic
                                hapticLevel="light"
                                className="menu-item-modern"
                                onMouseEnter={createPreloadHandler(importMyOwnershipRequests, 'MyOwnershipRequests')}
                                onClick={() => handleNavigate('/my-ownership-requests')}
                              >
                                <span className="menu-item-icon"><ClipboardList size={18} /></span>
                                <span className="menu-item-text">{t('header.myOwnershipRequests', 'My Ownership Requests')}</span>
                              </AnimatedButton>
                            </>
                          )}

                          {user.account_type === 'employee' && (
                            <>
                              <AnimatedButton
                                ariaLabel="My employee dashboard"
                                tabIndex={0}
                                enableHaptic
                                hapticLevel="light"
                                className="menu-item-modern"
                                onMouseEnter={createPreloadHandler(importEmployeeDashboard, 'EmployeeDashboard')}
                                onClick={() => handleNavigate('/employee/dashboard')}
                              >
                                <span className="menu-item-icon"><BarChart3 size={18} /></span>
                                <span className="menu-item-text">{t('header.employeeDashboard', 'My Dashboard')}</span>
                              </AnimatedButton>

                              {linkedEmployeeProfile && (
                                <AnimatedButton
                                  ariaLabel="Edit my employee profile"
                                  tabIndex={0}
                                  enableHaptic
                                  hapticLevel="light"
                                  className="menu-item-modern"
                                  onClick={handleAvatarClick}
                                >
                                  <span className="menu-item-icon"><FileEdit size={18} /></span>
                                  <span className="menu-item-text">{t('header.editMyProfile', 'Edit My Profile')}</span>
                                </AnimatedButton>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Settings Section */}
                      <div className="menu-section">
                        <div className="menu-section-label">SETTINGS</div>

                        {/* Dark Mode Toggle as Menu Item */}
                        <div className="menu-item-wrapper">
                          <ThemeToggle variant="menu-item" />
                        </div>

                        {/* Language Selector as Menu Item */}
                        <div className="menu-item-wrapper">
                          <LanguageSelector variant="menu-item" />
                        </div>
                      </div>

                      {/* Logout Section */}
                      <div className="menu-section menu-section-footer">
                        <AnimatedButton
                          ariaLabel="Logout from your account"
                          tabIndex={0}
                          enableHaptic
                          hapticLevel="light"
                          className="menu-item-modern menu-item-logout"
                          onClick={handleLogout}
                        >
                          <span className="menu-item-icon"><LogOut size={18} /></span>
                          <span className="menu-item-text">{t('header.logout')}</span>
                        </AnimatedButton>
                      </div>
                    </div>
                  )}

            {/* Non-logged users dropdown - Desktop only */}
            {showUserMenu && !user && !isMobile && (
              <div className="user-menu-dropdown-modern" data-testid="guest-menu" role="menu">
                {/* Navigation Section */}
                <div className="menu-section">
                  <div className="menu-section-label">NAVIGATION</div>
                  <AnimatedButton
                    ariaLabel="Search employees"
                    tabIndex={0}
                    enableHaptic
                    hapticLevel="light"
                    className="menu-item-modern"
                    onMouseEnter={createPreloadHandler(importSearchPage, 'SearchPage')}
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/search');
                    }}
                  >
                    <span className="menu-item-icon"><Search size={18} /></span>
                    <span className="menu-item-text">{t('header.search')}</span>
                  </AnimatedButton>

                  <AnimatedButton
                    ariaLabel="Browse freelances"
                    tabIndex={0}
                    enableHaptic
                    hapticLevel="light"
                    className="menu-item-modern"
                    onMouseEnter={createPreloadHandler(importFreelancesPage, 'FreelancesPage')}
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/freelances');
                    }}
                  >
                    <span className="menu-item-icon"><Users size={18} /></span>
                    <span className="menu-item-text">{t('header.freelances', 'Freelances')}</span>
                  </AnimatedButton>
                </div>

                {/* Settings Section */}
                <div className="menu-section">
                  <div className="menu-section-label">SETTINGS</div>

                  {/* Dark Mode Toggle as Menu Item */}
                  <div className="menu-item-wrapper">
                    <ThemeToggle variant="menu-item" />
                  </div>

                  {/* Language Selector as Menu Item */}
                  <div className="menu-item-wrapper">
                    <LanguageSelector variant="menu-item" />
                  </div>
                </div>

                {/* Login Section */}
                <div className="menu-section menu-section-footer">
                  <AnimatedButton
                    onClick={() => {
                      setShowUserMenu(false);
                      openLoginForm();
                    }}
                    ariaLabel="Login to your account"
                    tabIndex={0}
                    enableHaptic
                    hapticLevel="medium"
                    className="menu-item-modern menu-item-login"
                    data-testid="login-button"
                  >
                    <span className="menu-item-icon"><Rocket size={18} /></span>
                    <span className="menu-item-text">{t('header.login')} / {t('header.register')}</span>
                  </AnimatedButton>
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Phase 3: Mobile Menu - Full screen sliding panel */}
      {isMobile && (
        <MobileMenu
          isOpen={showUserMenu}
          onClose={() => setShowUserMenu(false)}
        />
      )}
    </>
  );
};

export default Header;