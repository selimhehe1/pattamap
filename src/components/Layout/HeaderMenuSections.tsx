import React from 'react';
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
  Building
} from 'lucide-react';
import { createPreloadHandler } from '../../utils/routePreloader';
import {
  importSearchPage,
  importUserDashboard,
  importAdminPanel,
  importMyEstablishmentsPage,
  importMyOwnershipRequests,
  importEmployeeDashboard,
  importMyAchievementsPage
} from '../../routes/lazyComponents';
import AnimatedButton from '../Common/AnimatedButton';
import ThemeToggle from '../Common/ThemeToggle';
import LanguageSelector from '../Common/LanguageSelector';
import LazyImage from '../Common/LazyImage';
import { User as UserType, Employee } from '../../types';

// =============================================
// MENU ITEM COMPONENT
// =============================================

interface MenuItemProps {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
  onMouseEnter?: () => void;
  ariaLabel: string;
  className?: string;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  text,
  onClick,
  onMouseEnter,
  ariaLabel,
  className = 'menu-item-modern'
}) => (
  <AnimatedButton
    ariaLabel={ariaLabel}
    tabIndex={0}
    enableHaptic
    hapticLevel="light"
    className={className}
    onMouseEnter={onMouseEnter}
    onClick={onClick}
  >
    <span className="menu-item-icon">{icon}</span>
    <span className="menu-item-text">{text}</span>
  </AnimatedButton>
);

// =============================================
// USER MENU HEADER
// =============================================

interface UserMenuHeaderProps {
  user: UserType;
  linkedEmployeeProfile: Employee | null;
  onAvatarClick: () => void;
}

export const UserMenuHeader: React.FC<UserMenuHeaderProps> = ({
  user,
  linkedEmployeeProfile,
  onAvatarClick
}) => (
  <div className="user-menu-header">
    <button
      className="user-menu-avatar-small"
      onClick={onAvatarClick}
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
);

// =============================================
// NAVIGATION SECTION
// =============================================

interface NavigationSectionProps {
  onNavigate: (path: string) => void;
  showFullMenu?: boolean;
}

export const NavigationSection: React.FC<NavigationSectionProps> = ({
  onNavigate,
  showFullMenu = true
}) => {
  const { t } = useTranslation();

  return (
    <div className="menu-section">
      <div className="menu-section-label">NAVIGATION</div>

      <MenuItem
        icon={<Search size={18} />}
        text={t('header.search')}
        ariaLabel="Search employees"
        onMouseEnter={createPreloadHandler(importSearchPage, 'SearchPage')}
        onClick={() => onNavigate('/search')}
      />

      {showFullMenu && (
        <>
          <MenuItem
            icon={<Star size={18} />}
            text={t('header.favorites')}
            ariaLabel="My favorites"
            onMouseEnter={createPreloadHandler(importUserDashboard, 'UserDashboard')}
            onClick={() => onNavigate('/dashboard')}
          />

          <MenuItem
            icon={<Trophy size={18} />}
            text={t('header.achievements')}
            ariaLabel="View my achievements and progress"
            onMouseEnter={createPreloadHandler(importMyAchievementsPage, 'MyAchievementsPage')}
            onClick={() => onNavigate('/achievements')}
          />
        </>
      )}
    </div>
  );
};

// =============================================
// ACTIONS SECTION
// =============================================

interface ActionsSectionProps {
  onAddEmployee: () => void;
  onAddEstablishment: () => void;
}

export const ActionsSection: React.FC<ActionsSectionProps> = ({
  onAddEmployee,
  onAddEstablishment
}) => {
  const { t } = useTranslation();

  return (
    <div className="menu-section">
      <div className="menu-section-label">ACTIONS</div>

      <MenuItem
        icon={<Sparkles size={18} />}
        text={t('header.addEmployee')}
        ariaLabel="Add new employee to the directory"
        onClick={onAddEmployee}
      />

      <MenuItem
        icon={<Building2 size={18} />}
        text={t('header.addEstablishment')}
        ariaLabel="Add new establishment to the directory"
        onClick={onAddEstablishment}
      />
    </div>
  );
};

// =============================================
// ADMIN/MANAGEMENT SECTION
// =============================================

interface AdminSectionProps {
  user: UserType;
  linkedEmployeeProfile: Employee | null;
  onNavigate: (path: string) => void;
  onEditProfile?: () => void;
}

export const AdminSection: React.FC<AdminSectionProps> = ({
  user,
  linkedEmployeeProfile,
  onNavigate,
  onEditProfile
}) => {
  const { t } = useTranslation();
  const isAdmin = user.role === 'admin' || user.role === 'moderator';
  const isOwner = user.account_type === 'establishment_owner';
  const isEmployee = user.account_type === 'employee';

  if (!isAdmin && !isOwner && !isEmployee) return null;

  return (
    <div className="menu-section">
      <div className="menu-section-label">
        {isAdmin ? 'ADMIN' : 'MANAGEMENT'}
      </div>

      {isAdmin && (
        <MenuItem
          icon={<Settings size={18} />}
          text={t('header.admin')}
          ariaLabel="Navigate to admin dashboard"
          onMouseEnter={createPreloadHandler(importAdminPanel, 'AdminPanel')}
          onClick={() => onNavigate('/admin')}
        />
      )}

      {isOwner && (
        <>
          <MenuItem
            icon={<Building size={18} />}
            text={t('header.myEstablishments', 'My Establishments')}
            ariaLabel="Manage my establishments"
            onMouseEnter={createPreloadHandler(importMyEstablishmentsPage, 'MyEstablishmentsPage')}
            onClick={() => onNavigate('/my-establishments')}
          />

          <MenuItem
            icon={<ClipboardList size={18} />}
            text={t('header.myOwnershipRequests', 'My Ownership Requests')}
            ariaLabel="View my ownership requests"
            onMouseEnter={createPreloadHandler(importMyOwnershipRequests, 'MyOwnershipRequests')}
            onClick={() => onNavigate('/my-ownership-requests')}
          />
        </>
      )}

      {isEmployee && (
        <>
          <MenuItem
            icon={<BarChart3 size={18} />}
            text={t('header.employeeDashboard', 'My Dashboard')}
            ariaLabel="My employee dashboard"
            onMouseEnter={createPreloadHandler(importEmployeeDashboard, 'EmployeeDashboard')}
            onClick={() => onNavigate('/employee/dashboard')}
          />

          {linkedEmployeeProfile && onEditProfile && (
            <MenuItem
              icon={<FileEdit size={18} />}
              text={t('header.editMyProfile', 'Edit My Profile')}
              ariaLabel="Edit my employee profile"
              onClick={onEditProfile}
            />
          )}
        </>
      )}
    </div>
  );
};

// =============================================
// SETTINGS SECTION
// =============================================

export const SettingsSection: React.FC = () => (
  <div className="menu-section">
    <div className="menu-section-label">SETTINGS</div>
    <div className="menu-item-wrapper">
      <ThemeToggle variant="menu-item" />
    </div>
    <div className="menu-item-wrapper">
      <LanguageSelector variant="menu-item" />
    </div>
  </div>
);

// =============================================
// LOGOUT SECTION
// =============================================

interface LogoutSectionProps {
  onLogout: () => void;
}

export const LogoutSection: React.FC<LogoutSectionProps> = ({ onLogout }) => {
  const { t } = useTranslation();

  return (
    <div className="menu-section menu-section-footer">
      <MenuItem
        icon={<LogOut size={18} />}
        text={t('header.logout')}
        ariaLabel="Logout from your account"
        className="menu-item-modern menu-item-logout"
        onClick={onLogout}
      />
    </div>
  );
};

// =============================================
// LOGIN SECTION (for non-logged users)
// =============================================

interface LoginSectionProps {
  onLogin: () => void;
}

export const LoginSection: React.FC<LoginSectionProps> = ({ onLogin }) => {
  const { t } = useTranslation();

  return (
    <div className="menu-section menu-section-footer">
      <AnimatedButton
        onClick={onLogin}
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
  );
};
