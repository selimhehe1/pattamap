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
  MapPin // 🆕 v10.3 - Visit History icon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGamification } from '../../contexts/GamificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPreloadHandler } from '../../utils/routePreloader';
import {
  importSearchPage,
  importUserDashboard,
  importAdminPanel,
  importMyEstablishmentsPage, // 🆕 v10.1 - Owner Dashboard preload
  importMyOwnershipRequests, // 🆕 v10.2 - Ownership Requests preload
  importEmployeeDashboard, // 🆕 v10.2 - Employee Dashboard preload
  importMyAchievementsPage, // 🆕 v10.3 - Gamification preload
  importVisitHistoryPage // 🆕 v10.3 - Visit History preload
} from '../../routes/lazyComponents';
import ThemeToggle from '../Common/ThemeToggle';
import AnimatedButton from '../Common/AnimatedButton';
import LanguageSelector from '../Common/LanguageSelector';
import LazyImage from '../Common/LazyImage';
import NotificationBell from '../Common/NotificationBell'; // 🆕 v10.2 - Notifications (using RPC functions)
import { useMapControls } from '../../contexts/MapControlsContext';
import '../../styles/layout/header.css';

interface HeaderProps {
  onAddEmployee: () => void;
  onAddEstablishment: () => void;
  onShowLogin: () => void;
  onEditMyProfile?: () => void; // 🆕 v10.0 - Edit employee profile
  onShowUserInfo?: () => void; // 🆕 Show user info modal (for regular users)
}

const Header: React.FC<HeaderProps> = ({
  onAddEmployee,
  onAddEstablishment,
  onShowLogin,
  onEditMyProfile,
  onShowUserInfo
}) => {
  const { t } = useTranslation();
  const { user, logout, linkedEmployeeProfile } = useAuth();
  const { userProgress } = useGamification();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Detect if we're on the home page
  const isHomePage = location.pathname === '/';

  // Map controls from context (only used on homepage)
  const { viewMode, setViewMode } = useMapControls();

  // Memoized navigation handlers to prevent unnecessary re-renders
  const handleNavigate = useCallback((path: string) => {
    setShowUserMenu(false);
    navigate(path);
  }, [navigate]);

  const handleAvatarClick = useCallback(() => {
    setShowUserMenu(false);
    if (user?.account_type === 'employee' && onEditMyProfile) {
      onEditMyProfile();
    } else if (onShowUserInfo) {
      onShowUserInfo();
    }
  }, [user?.account_type, onEditMyProfile, onShowUserInfo]);

  const handleAddEmployee = useCallback(() => {
    setShowUserMenu(false);
    onAddEmployee();
  }, [onAddEmployee]);

  const handleAddEstablishment = useCallback(() => {
    setShowUserMenu(false);
    onAddEstablishment();
  }, [onAddEstablishment]);

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
        className="header-modern">
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
            >
              <span className="header-back-icon">←</span>
            </AnimatedButton>
          )}

          <div className="header-branding">
            <h1 className="header-title">
              {t('header.title')}
              {process.env.NODE_ENV === 'development' && (
                <span style={{ marginLeft: '8px', fontSize: '12px', background: '#ff6b35', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>DEV</span>
              )}
            </h1>
            <p className="header-subtitle">
              {t('header.subtitle')}
            </p>
          </div>
        </div>

        {/* Navigation moderne et épurée */}
        <nav role="navigation" aria-label="Main actions" className="header-nav">
          {/* Notification Bell - visible seulement pour utilisateurs connectés */}
          {user && <NotificationBell />}

          {/* Map Controls - visible seulement sur homepage + desktop */}
          {isHomePage && (
            <div className="header-map-controls">
                <button
                  onClick={() => setViewMode('list')}
                  className={`header-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  aria-label={t('map.viewList')}
                  title={t('map.viewList')}
                  aria-current={viewMode === 'list' ? 'page' : undefined}
                >
                  <span className="header-view-icon" role="img" aria-hidden="true">📋</span>
                  <span className="header-view-label">{t('map.viewList')}</span>
                </button>

                <button
                  onClick={() => setViewMode('map')}
                  className={`header-view-btn header-view-btn--primary ${viewMode === 'map' ? 'active' : ''}`}
                  aria-label={t('map.viewMap')}
                  title={t('map.viewMap')}
                  aria-current={viewMode === 'map' ? 'page' : undefined}
                >
                  <span className="header-view-icon header-view-icon--large" role="img" aria-hidden="true">🗺️</span>
                  <span className="header-view-label">{t('map.viewMap')}</span>
                </button>

              <button
                onClick={() => setViewMode('employees')}
                className={`header-view-btn ${viewMode === 'employees' ? 'active' : ''}`}
                aria-label={t('map.lineup')}
                title={t('map.lineup')}
                aria-current={viewMode === 'employees' ? 'page' : undefined}
              >
                <span className="header-view-icon" role="img" aria-hidden="true">👥</span>
                <span className="header-view-label">{t('map.lineup')}</span>
              </button>
            </div>
          )}

          {/* XP Indicator - visible seulement sur desktop */}
          {user && userProgress && (
            <button
              className="header-xp-pill"
              title={`Level ${userProgress.current_level} - ${userProgress.total_xp.toLocaleString()} XP`}
              onClick={() => navigate('/achievements')}
              aria-label={`Experience Level ${userProgress.current_level}, ${userProgress.total_xp.toLocaleString()} XP total`}
            >
              <span className="header-xp-level">Lvl {userProgress.current_level}</span>
              <span className="header-xp-value">{userProgress.total_xp.toLocaleString()} XP</span>
              <div className="header-xp-progress">
                <div
                  className="header-xp-progress-fill"
                  style={{
                    width: `${Math.min(
                      ((userProgress.total_xp - (userProgress.current_level - 1) * 100) /
                        (userProgress.current_level * 100)) * 100,
                      100
                    )}%`
                  }}
                />
              </div>
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
          >
            <span className="header-menu-icon">{showUserMenu ? '✕' : '☰'}</span>
          </AnimatedButton>

          {/* Shared Dropdown - Accessible from hamburger button */}
          <div style={{ position: 'relative' }} ref={userMenuRef}>
            {showUserMenu && user && (
                    <div className="user-menu-dropdown-modern">
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
                            <div className="user-menu-avatar-icon">👤</div>
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

                              {linkedEmployeeProfile && onEditMyProfile && (
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

            {/* Non-logged users dropdown */}
            {showUserMenu && !user && (
              <div className="user-menu-dropdown-modern">
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
                      onShowLogin();
                    }}
                    ariaLabel="Login to your account"
                    tabIndex={0}
                    enableHaptic
                    hapticLevel="medium"
                    className="menu-item-modern menu-item-login"
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
    </>
  );
};

export default Header;