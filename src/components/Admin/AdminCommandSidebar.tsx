import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Users,
  Link2,
  Crown,
  BadgeCheck,
  Gem,
  MessageSquare,
  User,
  Beer,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  Menu
} from 'lucide-react';
import { isFeatureEnabled, FEATURES } from '../../utils/featureFlags';
import '../../styles/admin/command-sidebar.css';

const VIP_ENABLED = isFeatureEnabled(FEATURES.VIP_SYSTEM);

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | null;
  href?: string;
}

interface AdminCommandSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  stats: {
    pendingEstablishments: number;
    pendingEmployees: number;
    pendingClaims: number;
    pendingComments: number;
    reportedComments: number;
    pendingVerifications?: number;
    pendingVIPVerifications?: number;
  };
  user: {
    pseudonym: string;
    role: string;
  };
  onUserClick: () => void;
}

const AdminCommandSidebar: React.FC<AdminCommandSidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose,
  stats,
  user,
  onUserClick
}) => {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      id: 'overview',
      label: t('admin.overviewTab'),
      icon: <LayoutDashboard size={22} />,
      badge: null
    },
    {
      id: 'establishments',
      label: t('admin.establishmentsTab'),
      icon: <Building2 size={22} />,
      badge: stats.pendingEstablishments > 0 ? stats.pendingEstablishments : null
    },
    {
      id: 'employees',
      label: t('admin.employeesTab'),
      icon: <Users size={22} />,
      badge: stats.pendingEmployees > 0 ? stats.pendingEmployees : null
    },
    {
      id: 'employee-claims',
      label: t('admin.profileClaimsTab'),
      icon: <Link2 size={22} />,
      badge: stats.pendingClaims > 0 ? stats.pendingClaims : null
    },
    {
      id: 'establishment-owners',
      label: t('admin.establishmentOwnersTab'),
      icon: <Crown size={22} />,
      badge: null
    },
    {
      id: 'verifications',
      label: 'Verifications',
      icon: <BadgeCheck size={22} />,
      badge: stats.pendingVerifications && stats.pendingVerifications > 0 ? stats.pendingVerifications : null
    },
    ...(VIP_ENABLED ? [{
      id: 'vip-verifications',
      label: 'VIP Verification',
      icon: <Gem size={22} />,
      badge: stats.pendingVIPVerifications && stats.pendingVIPVerifications > 0 ? stats.pendingVIPVerifications : null,
      href: '/admin/vip-verification'
    }] : []),
    {
      id: 'comments',
      label: t('admin.reviewsTab'),
      icon: <MessageSquare size={22} />,
      badge: (stats.pendingComments + stats.reportedComments) > 0 ? (stats.pendingComments + stats.reportedComments) : null
    },
    {
      id: 'users',
      label: t('admin.usersTab'),
      icon: <User size={22} />,
      badge: null
    },
    {
      id: 'consumables',
      label: t('admin.consumablesTab'),
      icon: <Beer size={22} />,
      badge: null
    },
  ];

  const handleNavClick = (item: NavItem) => {
    onTabChange(item.id);
    if (window.innerWidth < 768) {
      onMobileClose();
    }
  };

  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 72 }
  };

  const mobileVariants = {
    closed: { x: '-100%' },
    open: { x: 0 }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            className="command-sidebar__overlay command-sidebar__overlay--visible"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      {/* Mobile Toggle Button */}
      <button
        className="command-sidebar__mobile-toggle"
        onClick={() => onTabChange(activeTab)}
        aria-label="Open navigation menu"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <motion.aside
        className={`command-sidebar ${isCollapsed ? 'command-sidebar--collapsed' : ''} ${isMobileOpen ? 'command-sidebar--mobile-open' : ''}`}
        variants={window.innerWidth >= 768 ? sidebarVariants : mobileVariants}
        animate={window.innerWidth >= 768 ? (isCollapsed ? 'collapsed' : 'expanded') : (isMobileOpen ? 'open' : 'closed')}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {/* Mobile Close Button */}
        <button
          className="command-sidebar__mobile-close"
          onClick={onMobileClose}
          aria-label="Close navigation menu"
        >
          <X size={20} />
        </button>

        {/* Logo Section - Clickable link to home */}
        <Link to="/" className="command-sidebar__logo command-sidebar__logo--link">
          <div className="command-sidebar__logo-icon">
            <Shield size={28} />
          </div>
          <div className="command-sidebar__logo-text">
            <span className="command-sidebar__logo-title">PATTAMAP</span>
            <span className="command-sidebar__logo-subtitle">Command Center</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="command-sidebar__nav">
          <div className="command-sidebar__nav-group">
            <span className="command-sidebar__nav-label">Navigation</span>

            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const isVipItem = item.id === 'vip-verifications';

              const buttonContent = (
                <>
                  <span className="command-sidebar__nav-icon">
                    {item.icon}
                  </span>
                  <span className="command-sidebar__nav-text">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className={`command-sidebar__badge ${isVipItem ? 'command-sidebar__badge--vip' : ''}`}>
                      {item.badge}
                    </span>
                  )}
                </>
              );

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    onClick={() => handleNavClick(item)}
                    className={`command-sidebar__nav-item ${isActive ? 'command-sidebar__nav-item--active' : ''}`}
                    data-tooltip={item.label}
                  >
                    {buttonContent}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`command-sidebar__nav-item ${isActive ? 'command-sidebar__nav-item--active' : ''}`}
                  data-tooltip={item.label}
                >
                  {buttonContent}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Collapse Toggle (Desktop only) */}
        <button
          className="command-sidebar__toggle"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="command-sidebar__toggle-icon">
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </span>
        </button>
      </motion.aside>
    </>
  );
};

export default AdminCommandSidebar;
