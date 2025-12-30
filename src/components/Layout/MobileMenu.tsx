import React, { useEffect, useRef, useCallback } from 'react';
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
  MapPin,
  X,
  Users
} from 'lucide-react';
import { useNavigateWithTransition } from '../../hooks/useNavigateWithTransition';
import { useAuth } from '../../contexts/AuthContext';
import { useGamification } from '../../contexts/GamificationContext';
import { useAppModals } from '../../hooks/useAppModals';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import ThemeToggle from '../Common/ThemeToggle';
import LanguageSelector from '../Common/LanguageSelector';
import LazyImage from '../Common/LazyImage';
import '../../styles/components/mobile-menu.css';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MobileMenu Component
 * Phase 3 Modernisation - Hamburger Menu
 *
 * Full-screen sliding menu for mobile devices.
 * Updated: Fixed overlay click interception bug
 */
const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigateWithTransition();
  const { user, logout, linkedEmployeeProfile } = useAuth();
  const { userProgress } = useGamification();
  const { openEmployeeForm, openEstablishmentForm, handleEditMyProfile, openUserInfoModal } = useAppModals();

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap for accessibility - returns ref to attach to panel
  const panelRef = useFocusTrap<HTMLDivElement>(isOpen);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Focus close button when menu opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleNavigate = useCallback((path: string) => {
    onClose();
    navigate(path);
  }, [navigate, onClose]);

  const handleAvatarClick = useCallback(() => {
    onClose();
    if (user?.account_type === 'employee') {
      handleEditMyProfile();
    } else {
      openUserInfoModal();
    }
  }, [user?.account_type, handleEditMyProfile, openUserInfoModal, onClose]);

  const handleAddEmployee = useCallback(() => {
    onClose();
    openEmployeeForm();
  }, [openEmployeeForm, onClose]);

  const handleAddEstablishment = useCallback(() => {
    onClose();
    openEstablishmentForm();
  }, [openEstablishmentForm, onClose]);

  const handleLogout = useCallback(() => {
    onClose();
    logout();
    navigate('/');
  }, [logout, navigate, onClose]);

  const handleLogin = useCallback(() => {
    onClose();
    navigate('/login');
  }, [navigate, onClose]);

  return (
    <>
      {/* Clickable backdrop - only rendered when menu is open */}
      {/* Positioned to only cover the left side (non-panel area) to not interfere with panel clicks */}
      {isOpen && (
        <div
          className="mobile-menu-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Menu panel */}
      <div
        ref={panelRef}
        className={`mobile-menu-panel ${isOpen ? 'active' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('header.menu', 'Menu')}
      >
        {/* Header */}
        <div className="mobile-menu-header">
          <h2 className="mobile-menu-title">{t('header.title', 'PattaMap')}</h2>
          <button
            ref={closeButtonRef}
            className="mobile-menu-close"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* User info (logged in) */}
        {user && (
          <div className="mobile-menu-user">
            <button
              className="mobile-menu-avatar"
              onClick={handleAvatarClick}
              aria-label={user.account_type === 'employee' ? t('header.editMyProfile') : t('header.viewProfile')}
            >
              {user.account_type === 'employee' && linkedEmployeeProfile?.photos?.[0] ? (
                <LazyImage
                  src={linkedEmployeeProfile.photos[0]}
                  alt={linkedEmployeeProfile.name}
                  objectFit="cover"
                />
              ) : (
                <div className="mobile-menu-avatar-placeholder">
                  <User size={24} />
                </div>
              )}
            </button>
            <div className="mobile-menu-user-info">
              <span className="mobile-menu-user-name">{user.pseudonym}</span>
              <span className="mobile-menu-user-badge">
                {user.role === 'admin' ? (
                  <><Crown size={10} /> ADMIN</>
                ) : user.role === 'moderator' ? (
                  <><Zap size={10} /> MOD</>
                ) : (
                  <><User size={10} /> USER</>
                )}
              </span>
            </div>
            {userProgress && (
              <button
                className="mobile-menu-xp"
                onClick={() => handleNavigate('/achievements')}
                aria-label={`Level ${userProgress.current_level}`}
              >
                <span>Lvl {userProgress.current_level}</span>
              </button>
            )}
          </div>
        )}

        {/* Scrollable content */}
        <div className="mobile-menu-content">
          {/* Navigation Section */}
          <div className="mobile-menu-section">
            <div className="mobile-menu-section-label">{t('menu.navigation', 'Navigation')}</div>

            <button className="mobile-menu-item" onClick={() => handleNavigate('/search')}>
              <span className="mobile-menu-item-icon"><Search size={20} /></span>
              <span className="mobile-menu-item-text">{t('header.search', 'Search')}</span>
              <span className="mobile-menu-item-arrow">›</span>
            </button>

            <button className="mobile-menu-item" onClick={() => handleNavigate('/search?zone=freelance')}>
              <span className="mobile-menu-item-icon"><Users size={20} /></span>
              <span className="mobile-menu-item-text">{t('header.freelances', 'Freelances')}</span>
              <span className="mobile-menu-item-arrow">›</span>
            </button>

            {user && (
              <>
                <button className="mobile-menu-item" onClick={() => handleNavigate('/dashboard')}>
                  <span className="mobile-menu-item-icon"><Star size={20} /></span>
                  <span className="mobile-menu-item-text">{t('header.favorites', 'Favorites')}</span>
                  <span className="mobile-menu-item-arrow">›</span>
                </button>

                <button className="mobile-menu-item" onClick={() => handleNavigate('/achievements')}>
                  <span className="mobile-menu-item-icon"><Trophy size={20} /></span>
                  <span className="mobile-menu-item-text">{t('header.achievements', 'Achievements')}</span>
                  <span className="mobile-menu-item-arrow">›</span>
                </button>

                <button className="mobile-menu-item" onClick={() => handleNavigate('/my-visits')}>
                  <span className="mobile-menu-item-icon"><MapPin size={20} /></span>
                  <span className="mobile-menu-item-text">{t('header.myVisits', 'My Visits')}</span>
                  <span className="mobile-menu-item-arrow">›</span>
                </button>
              </>
            )}
          </div>

          {/* Actions Section (logged in) */}
          {user && (
            <div className="mobile-menu-section">
              <div className="mobile-menu-section-label">{t('menu.actions', 'Actions')}</div>

              <button className="mobile-menu-item" onClick={handleAddEmployee}>
                <span className="mobile-menu-item-icon"><Sparkles size={20} /></span>
                <span className="mobile-menu-item-text">{t('header.addEmployee', 'Add Employee')}</span>
                <span className="mobile-menu-item-arrow">›</span>
              </button>

              <button className="mobile-menu-item" onClick={handleAddEstablishment}>
                <span className="mobile-menu-item-icon"><Building2 size={20} /></span>
                <span className="mobile-menu-item-text">{t('header.addEstablishment', 'Add Establishment')}</span>
                <span className="mobile-menu-item-arrow">›</span>
              </button>
            </div>
          )}

          {/* Management Section */}
          {user && (user.role === 'admin' || user.role === 'moderator' || user.account_type === 'establishment_owner' || user.account_type === 'employee') && (
            <div className="mobile-menu-section">
              <div className="mobile-menu-section-label">
                {user.role === 'admin' || user.role === 'moderator' ? 'ADMIN' : t('menu.management', 'Management')}
              </div>

              {(user.role === 'admin' || user.role === 'moderator') && (
                <button className="mobile-menu-item" onClick={() => handleNavigate('/admin')}>
                  <span className="mobile-menu-item-icon"><Settings size={20} /></span>
                  <span className="mobile-menu-item-text">{t('header.admin', 'Admin Panel')}</span>
                  <span className="mobile-menu-item-arrow">›</span>
                </button>
              )}

              {user.account_type === 'establishment_owner' && (
                <>
                  <button className="mobile-menu-item" onClick={() => handleNavigate('/my-establishments')}>
                    <span className="mobile-menu-item-icon"><Building size={20} /></span>
                    <span className="mobile-menu-item-text">{t('header.myEstablishments', 'My Establishments')}</span>
                    <span className="mobile-menu-item-arrow">›</span>
                  </button>

                  <button className="mobile-menu-item" onClick={() => handleNavigate('/my-ownership-requests')}>
                    <span className="mobile-menu-item-icon"><ClipboardList size={20} /></span>
                    <span className="mobile-menu-item-text">{t('header.myOwnershipRequests', 'Ownership Requests')}</span>
                    <span className="mobile-menu-item-arrow">›</span>
                  </button>
                </>
              )}

              {user.account_type === 'employee' && (
                <>
                  <button className="mobile-menu-item" onClick={() => handleNavigate('/employee/dashboard')}>
                    <span className="mobile-menu-item-icon"><BarChart3 size={20} /></span>
                    <span className="mobile-menu-item-text">{t('header.employeeDashboard', 'My Dashboard')}</span>
                    <span className="mobile-menu-item-arrow">›</span>
                  </button>

                  {linkedEmployeeProfile && (
                    <button className="mobile-menu-item" onClick={handleAvatarClick}>
                      <span className="mobile-menu-item-icon"><FileEdit size={20} /></span>
                      <span className="mobile-menu-item-text">{t('header.editMyProfile', 'Edit My Profile')}</span>
                      <span className="mobile-menu-item-arrow">›</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Login/Logout Section */}
          <div className="mobile-menu-section">
            {user ? (
              <button className="mobile-menu-item mobile-menu-item--logout" onClick={handleLogout}>
                <span className="mobile-menu-item-icon"><LogOut size={20} /></span>
                <span className="mobile-menu-item-text">{t('header.logout', 'Logout')}</span>
              </button>
            ) : (
              <button className="mobile-menu-item mobile-menu-item--login" onClick={handleLogin}>
                <span className="mobile-menu-item-icon"><Rocket size={20} /></span>
                <span className="mobile-menu-item-text">{t('header.login', 'Login')} / {t('header.register', 'Register')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer - Settings */}
        <div className="mobile-menu-footer">
          <div className="mobile-menu-settings-row">
            <ThemeToggle variant="icon" />
            <div className="mobile-menu-settings-divider" />
            <LanguageSelector variant="dropdown" />
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
