import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';

// Admin Components
import EstablishmentsAdmin from './EstablishmentsAdmin';
import EmployeesAdmin from './EmployeesAdmin';
import EmployeeClaimsAdmin from './EmployeeClaimsAdmin';
import EstablishmentOwnersAdmin from './EstablishmentOwnersAdmin';
import CommentsAdmin from './CommentsAdmin';
import UsersAdmin from './UsersAdmin';
import ConsumablesAdmin from './ConsumablesAdmin';
import VerificationsAdmin from './VerificationsAdmin';
import VIPVerificationAdmin from './VIPVerificationAdmin';

// Command Center Components
import AdminCommandSidebar from './AdminCommandSidebar';
import CommandHeader from './CommandHeader';
import AlertsTicker, { createAlertsFromStats } from './AlertsTicker';
import PremiumStatCard from './PremiumStatCard';

import { logger } from '../../utils/logger';
import { isFeatureEnabled, FEATURES } from '../../utils/featureFlags';

import {
  Building2,
  Users,
  Crown,
  BadgeCheck,
  MessageSquare,
  TrendingUp,
  Wallet,
  Mail,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  BarChart3,
  ShieldOff,
  Shield
} from 'lucide-react';

// Import styles
import '../../styles/admin/command-center.css';
import '../../styles/admin/command-sidebar.css';

const VIP_ENABLED = isFeatureEnabled(FEATURES.VIP_SYSTEM);

interface DashboardStats {
  totalEstablishments: number;
  pendingEstablishments: number;
  totalEmployees: number;
  pendingEmployees: number;
  pendingClaims: number;
  totalComments: number;
  pendingComments: number;
  reportedComments: number;
  totalUsers: number;
  totalOwners?: number;
  establishmentsWithOwners?: number;
  pendingVerifications?: number;
  totalVerified?: number;
  pendingVIPVerifications?: number;
}

interface AdminUser {
  id: string;
  pseudonym: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
  stats?: {
    establishments_submitted: number;
    employees_submitted: number;
    comments_made: number;
  };
}

interface AdminDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();

  // State
  const [stats, setStats] = useState<DashboardStats>({
    totalEstablishments: 0,
    pendingEstablishments: 0,
    totalEmployees: 0,
    pendingEmployees: 0,
    pendingClaims: 0,
    totalComments: 0,
    pendingComments: 0,
    reportedComments: 0,
    totalUsers: 0,
    totalOwners: 0,
    establishmentsWithOwners: 0,
    pendingVerifications: 0,
    totalVerified: 0,
    pendingVIPVerifications: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Load dashboard stats
  useEffect(() => {
    const loadDashboardStats = async () => {
      setIsLoading(true);
      try {
        logger.debug('📊 Loading dashboard stats...');
        const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/admin/dashboard-stats`);

        if (response.ok) {
          const data = await response.json();
          setStats(data.stats || data);
        }
      } catch (error) {
        logger.error('Failed to load dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboardStats();
  }, [secureFetch]);

  // View current user profile
  const viewCurrentUserProfile = async () => {
    if (!user) {
      logger.error('❌ No user in context');
      return;
    }

    logger.debug('👤 Current user context:', user);

    const adminUserData: AdminUser = {
      id: user.id,
      pseudonym: user.pseudonym,
      email: user.email,
      role: user.role,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.updated_at || new Date().toISOString(),
      last_login: undefined,
      is_active: true,
      stats: {
        establishments_submitted: 0,
        employees_submitted: 0,
        comments_made: 0
      }
    };

    logger.debug('✅ Using direct user context data:', adminUserData);
    setSelectedUser(adminUserData);

    try {
      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/admin/user-stats/${user.id}`);

      if (response.ok) {
        const { stats: userStats } = await response.json();
        logger.debug('📊 Real user stats retrieved:', userStats);

        setSelectedUser(prev => prev ? {
          ...prev,
          stats: userStats
        } : prev);
      }
    } catch (error) {
      logger.debug('ℹ️ User stats call failed, using default stats:', error);
    }
  };

  // Access check
  if (!user || !['admin', 'moderator'].includes(user.role)) {
    return (
      <div className="command-center">
        <div
          className="command-content-section"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            textAlign: 'center',
            margin: 'auto',
            maxWidth: '500px'
          }}
        >
          <div>
            <h2 style={{
              color: 'var(--color-primary)',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 0 15px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}>
              <ShieldOff size={24} /> {t('admin.accessDenied')}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '16px', lineHeight: '1.6' }}>
              {t('admin.accessDeniedMessage')}<br />
              {t('admin.accessDeniedRestricted')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Stat card configuration
  const STAT_COLORS = {
    primary: 'var(--color-primary)',
    accent: 'var(--color-accent)',
    success: 'var(--color-success)',
    secondary: 'var(--color-secondary)',
    gold: 'var(--color-gold)'
  };

  const statCards = [
    {
      title: t('admin.totalEstablishments'),
      value: stats.totalEstablishments,
      pending: stats.pendingEstablishments,
      icon: <Building2 />,
      color: STAT_COLORS.primary,
      onClick: () => onTabChange('establishments')
    },
    {
      title: t('admin.totalEmployees'),
      value: stats.totalEmployees,
      pending: stats.pendingEmployees,
      icon: <Users />,
      color: STAT_COLORS.accent,
      onClick: () => onTabChange('employees')
    },
    {
      title: t('admin.totalReviews'),
      value: stats.totalComments,
      pending: stats.pendingComments,
      icon: <MessageSquare />,
      color: STAT_COLORS.secondary,
      onClick: () => onTabChange('comments')
    },
    {
      title: t('admin.totalOwners'),
      value: stats.totalOwners || 0,
      pending: 0,
      icon: <Crown />,
      color: STAT_COLORS.gold,
      subtitle: t('admin.establishmentsOwned', { count: stats.establishmentsWithOwners || 0 }),
      onClick: () => onTabChange('establishment-owners')
    },
    {
      title: 'Verified Profiles',
      value: stats.totalVerified || 0,
      pending: stats.pendingVerifications || 0,
      icon: <BadgeCheck />,
      color: STAT_COLORS.success,
      subtitle: stats.totalVerified && stats.totalEmployees
        ? `${Math.round((stats.totalVerified / stats.totalEmployees) * 100)}% verification rate`
        : '0% verification rate',
      onClick: () => onTabChange('verifications')
    }
  ];

  // Create alerts for ticker
  const alerts = createAlertsFromStats(stats, onTabChange);

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div
      className={`command-center ${isSidebarCollapsed ? 'command-center--sidebar-collapsed' : ''}`}
      data-testid="admin-dashboard"
    >
      {/* Sidebar */}
      <AdminCommandSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        stats={stats}
        user={{ pseudonym: user.pseudonym, role: user.role }}
        onUserClick={viewCurrentUserProfile}
      />

      {/* Main Content Area */}
      <main className="command-center__main">
        {/* Header */}
        <CommandHeader
          user={{ pseudonym: user.pseudonym, role: user.role }}
          onUserClick={viewCurrentUserProfile}
          isCollapsed={isSidebarCollapsed}
        />

        {/* Alerts Ticker */}
        <AlertsTicker
          alerts={alerts}
          isCollapsed={isSidebarCollapsed}
        />

        {/* Content */}
        <div className="command-center__content">
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                {/* Stats Grid */}
                <div className="stats-grid">
                  {statCards.map((card, index) => (
                    <PremiumStatCard
                      key={card.title}
                      title={card.title}
                      value={isLoading ? 0 : card.value}
                      pending={card.pending}
                      icon={card.icon}
                      color={card.color}
                      subtitle={card.subtitle}
                      onClick={card.onClick}
                      delay={index * 0.1}
                    />
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="quick-actions-panel">
                  <h3 className="quick-actions-panel__title">
                    <TrendingUp size={20} />
                    {t('admin.quickActions')}
                  </h3>

                  <div className="quick-actions-panel__grid">
                    {stats.pendingEstablishments > 0 && (
                      <motion.button
                        className="quick-action-btn"
                        onClick={() => onTabChange('establishments')}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Building2 size={18} />
                        {t('admin.reviewEstablishment', { count: stats.pendingEstablishments })}
                      </motion.button>
                    )}

                    {stats.pendingEmployees > 0 && (
                      <motion.button
                        className="quick-action-btn quick-action-btn--warning"
                        onClick={() => onTabChange('employees')}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Users size={18} />
                        {t('admin.reviewEmployee', { count: stats.pendingEmployees })}
                      </motion.button>
                    )}

                    {(stats.pendingComments + stats.reportedComments) > 0 && (
                      <motion.button
                        className="quick-action-btn quick-action-btn--danger"
                        onClick={() => onTabChange('comments')}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <MessageSquare size={18} />
                        {t('admin.reviewComment', { count: stats.pendingComments + stats.reportedComments })}
                      </motion.button>
                    )}

                    {stats.pendingVerifications && stats.pendingVerifications > 0 && (
                      <motion.button
                        className="quick-action-btn quick-action-btn--success"
                        onClick={() => onTabChange('verifications')}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <BadgeCheck size={18} />
                        Review {stats.pendingVerifications} verification{stats.pendingVerifications > 1 ? 's' : ''}
                      </motion.button>
                    )}

                    {VIP_ENABLED && stats.pendingVIPVerifications && stats.pendingVIPVerifications > 0 && (
                      <motion.button
                        className="quick-action-btn"
                        onClick={() => onTabChange('vip-verifications')}
                        style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 165, 0, 0.05))', borderColor: 'rgba(255, 215, 0, 0.3)' }}
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Wallet size={18} />
                        Review {stats.pendingVIPVerifications} VIP payment{stats.pendingVIPVerifications > 1 ? 's' : ''}
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Other Tabs - Wrapped in content section */}
            {activeTab === 'establishments' && (
              <motion.div
                key="establishments"
                className="command-content-section"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <EstablishmentsAdmin onTabChange={onTabChange} />
              </motion.div>
            )}

            {activeTab === 'employees' && (
              <motion.div
                key="employees"
                className="command-content-section"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <EmployeesAdmin onTabChange={onTabChange} />
              </motion.div>
            )}

            {activeTab === 'employee-claims' && (
              <motion.div
                key="employee-claims"
                className="command-content-section"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <EmployeeClaimsAdmin onTabChange={onTabChange} />
              </motion.div>
            )}

            {activeTab === 'comments' && (
              <motion.div
                key="comments"
                className="command-content-section"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <CommentsAdmin onTabChange={onTabChange} />
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div
                key="users"
                className="command-content-section"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <UsersAdmin onTabChange={onTabChange} />
              </motion.div>
            )}

            {activeTab === 'consumables' && (
              <motion.div
                key="consumables"
                className="command-content-section"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <ConsumablesAdmin activeTab={activeTab} onTabChange={onTabChange} />
              </motion.div>
            )}

            {activeTab === 'verifications' && (
              <motion.div
                key="verifications"
                className="command-content-section"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <VerificationsAdmin onTabChange={onTabChange} />
              </motion.div>
            )}

            {activeTab === 'establishment-owners' && (
              <motion.div
                key="establishment-owners"
                className="command-content-section"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <EstablishmentOwnersAdmin onTabChange={onTabChange} />
              </motion.div>
            )}

            {VIP_ENABLED && activeTab === 'vip-verifications' && (
              <motion.div
                key="vip-verifications"
                className="command-content-section"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <VIPVerificationAdmin />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Admin Profile Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            className="admin-profile-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              className="admin-profile-modal-container"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header with Avatar */}
              <div className="admin-profile-header">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="admin-profile-close-btn"
                >
                  ×
                </button>

                <div className="admin-profile-avatar">
                  <Shield size={32} />
                </div>

                <h1 className="admin-profile-name">
                  {selectedUser.pseudonym || 'Administrator'}
                </h1>

                <div className={`admin-profile-role-badge ${
                  selectedUser.role === 'admin' ? 'admin-profile-role-admin' :
                  selectedUser.role === 'moderator' ? 'admin-profile-role-moderator' :
                  'admin-profile-role-user'
                }`}>
                  {selectedUser.role?.toUpperCase() || 'USER'}
                </div>
              </div>

              {/* Content Sections */}
              <div className="admin-profile-content">
                {/* Personal Information */}
                <div className="admin-profile-section">
                  <h3 className="admin-profile-section-title">
                    <Mail size={16} style={{ marginRight: '8px' }} /> {t('admin.personalInformation')}
                  </h3>
                  <div className="admin-profile-info-grid">
                    <div className="admin-profile-info-item">
                      <div className="admin-profile-info-label">{t('admin.emailAddress')}</div>
                      <div className="admin-profile-info-value">
                        {selectedUser.email || t('admin.notProvided')}
                      </div>
                    </div>
                    <div className="admin-profile-info-item">
                      <div className="admin-profile-info-label">{t('admin.memberSince')}</div>
                      <div className="admin-profile-info-value">
                        {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : t('admin.unknown')}
                      </div>
                    </div>
                    <div className="admin-profile-info-item">
                      <div className="admin-profile-info-label">{t('admin.accountStatus')}</div>
                      <div className={`admin-profile-info-value ${
                        selectedUser.is_active ? 'admin-profile-status-active' : 'admin-profile-status-inactive'
                      }`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {selectedUser.is_active ? (
                          <><CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> {t('admin.active')}</>
                        ) : (
                          <><XCircle size={14} style={{ color: 'var(--color-error)' }} /> {t('admin.inactive')}</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role & Permissions */}
                <div className="admin-profile-section">
                  <h3 className="admin-profile-section-title">
                    <Lock size={16} style={{ marginRight: '8px' }} /> {t('admin.rolePermissions')}
                  </h3>
                  <div className="admin-profile-info-grid">
                    <div className="admin-profile-info-item">
                      <div className="admin-profile-info-label">{t('admin.accessLevel')}</div>
                      <div className="admin-profile-info-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {selectedUser.role === 'admin' ? (
                          <><Unlock size={14} style={{ color: 'var(--color-success)' }} /> {t('admin.fullAccess')}</>
                        ) : selectedUser.role === 'moderator' ? (
                          <><Lock size={14} style={{ color: 'var(--color-primary)' }} /> {t('admin.moderationAccess')}</>
                        ) : (
                          <><Lock size={14} style={{ color: 'var(--color-accent)' }} /> {t('admin.userAccess')}</>
                        )}
                      </div>
                    </div>
                    <div className="admin-profile-info-item">
                      <div className="admin-profile-info-label">{t('admin.permissions')}</div>
                      <div className="admin-profile-info-value">
                        {selectedUser.role === 'admin' ? t('admin.allOperations') :
                         selectedUser.role === 'moderator' ? t('admin.contentModeration') :
                         t('admin.readOnly')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Statistics */}
                {selectedUser.stats && (
                  <div className="admin-profile-section">
                    <h3 className="admin-profile-section-title">
                      <BarChart3 size={16} style={{ marginRight: '8px' }} /> {t('admin.activityStatistics')}
                    </h3>
                    <div className="admin-profile-stats-grid">
                      <div className="admin-profile-stat-card">
                        <div className="admin-profile-stat-number">
                          {selectedUser.stats.establishments_submitted || 0}
                        </div>
                        <div className="admin-profile-stat-label">
                          {t('admin.establishmentsSubmitted')}
                        </div>
                      </div>
                      <div className="admin-profile-stat-card">
                        <div className="admin-profile-stat-number">
                          {selectedUser.stats.employees_submitted || 0}
                        </div>
                        <div className="admin-profile-stat-label">
                          {t('admin.employeesSubmitted')}
                        </div>
                      </div>
                      <div className="admin-profile-stat-card">
                        <div className="admin-profile-stat-number">
                          {selectedUser.stats.comments_made || 0}
                        </div>
                        <div className="admin-profile-stat-label">
                          {t('admin.commentsMade')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
