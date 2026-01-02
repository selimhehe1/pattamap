import React, { useState, useEffect } from 'react';
import { Link as _Link } from 'react-router-dom';
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
  Shield,
  Zap,
  User as UserIcon,
  X
} from 'lucide-react';

// Animation variants for premium modal
import { premiumModalVariants, premiumBackdropVariants } from '../../animations/variants';

// Import styles
import '../../styles/admin/command-center.css';
import '../../styles/admin/command-sidebar.css';
import '../../styles/components/modal-premium-base.css';

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

      {/* Admin Profile Modal - Premium Design */}
      <AnimatePresence mode="wait">
        {selectedUser && (() => {
          // Role-based colors
          const getRoleColor = (role: string) => {
            switch (role) {
              case 'admin': return '#FFD700';
              case 'moderator': return '#00E5FF';
              default: return '#E879F9';
            }
          };
          const getRoleIcon = (role: string, size = 32) => {
            switch (role) {
              case 'admin': return <Crown size={size} />;
              case 'moderator': return <Zap size={size} />;
              default: return <UserIcon size={size} />;
            }
          };
          const roleColor = getRoleColor(selectedUser.role);

          return (
            <motion.div
              className="modal-premium-overlay"
              variants={premiumBackdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setSelectedUser(null)}
            >
              <motion.div
                className="modal-premium modal-premium--small"
                variants={premiumModalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-profile-modal-title"
              >
                {/* Close Button */}
                <motion.button
                  className="modal-premium__close"
                  onClick={() => setSelectedUser(null)}
                  aria-label={t('common.close')}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X size={18} />
                </motion.button>

                {/* Header with Icon - Inline style */}
                <div className="modal-premium__header modal-premium__header--form">
                  <motion.div
                    className="modal-premium__icon modal-premium__icon--admin"
                    style={{
                      background: `rgba(255, 215, 0, 0.15)`,
                      border: `2px solid ${roleColor}`,
                      color: roleColor,
                      boxShadow: `0 0 20px ${roleColor}30`
                    }}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <Shield size={24} />
                  </motion.div>
                  <motion.h2
                    id="admin-profile-modal-title"
                    className="modal-premium__title"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    {t('admin.adminProfile')}
                  </motion.h2>
                </div>

                {/* Content */}
                <motion.div
                  className="modal-premium__content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {/* Avatar Section */}
                  <motion.div
                    className="modal-premium__avatar-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <motion.div
                      className="modal-premium__avatar"
                      style={{
                        borderColor: roleColor,
                        boxShadow: `0 0 30px ${roleColor}40, 0 0 60px ${roleColor}20`
                      }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {getRoleIcon(selectedUser.role, 48)}
                    </motion.div>
                    <h3 className="modal-premium__user-name">{selectedUser.pseudonym || 'Administrator'}</h3>
                    <p className="modal-premium__user-email">{selectedUser.email}</p>
                    <motion.span
                      className="modal-premium__role-badge"
                      style={{
                        borderColor: roleColor,
                        color: roleColor,
                        background: `linear-gradient(135deg, ${roleColor}20, ${roleColor}10)`,
                        boxShadow: `0 0 15px ${roleColor}40`
                      }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {getRoleIcon(selectedUser.role, 16)} {selectedUser.role?.toUpperCase() || 'USER'}
                    </motion.span>
                  </motion.div>

                  {/* Separator */}
                  <div className="modal-premium__separator" />

                  {/* Personal Information */}
                  <motion.div
                    className="modal-premium__section"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h4 className="modal-premium__section-title">
                      <Mail size={18} />
                      {t('admin.personalInformation')}
                    </h4>
                    <div className="modal-premium__info-grid">
                      <div className="modal-premium__info-item">
                        <span className="modal-premium__info-label">{t('admin.memberSince')}:</span>
                        <span className="modal-premium__info-value">
                          {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : t('admin.unknown')}
                        </span>
                      </div>
                      <div className="modal-premium__info-item">
                        <span className="modal-premium__info-label">{t('admin.accountStatus')}:</span>
                        <span className="modal-premium__info-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {selectedUser.is_active ? (
                            <><CheckCircle size={14} style={{ color: '#10B981' }} /> {t('admin.active')}</>
                          ) : (
                            <><XCircle size={14} style={{ color: '#F87171' }} /> {t('admin.inactive')}</>
                          )}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Separator */}
                  <div className="modal-premium__separator" />

                  {/* Role & Permissions */}
                  <motion.div
                    className="modal-premium__section"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <h4 className="modal-premium__section-title">
                      <Lock size={18} />
                      {t('admin.rolePermissions')}
                    </h4>
                    <div className="modal-premium__info-grid">
                      <div className="modal-premium__info-item">
                        <span className="modal-premium__info-label">{t('admin.accessLevel')}:</span>
                        <span className="modal-premium__info-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {selectedUser.role === 'admin' ? (
                            <><Unlock size={14} style={{ color: '#10B981' }} /> {t('admin.fullAccess')}</>
                          ) : selectedUser.role === 'moderator' ? (
                            <><Lock size={14} style={{ color: '#00E5FF' }} /> {t('admin.moderationAccess')}</>
                          ) : (
                            <><Lock size={14} style={{ color: '#E879F9' }} /> {t('admin.userAccess')}</>
                          )}
                        </span>
                      </div>
                      <div className="modal-premium__info-item">
                        <span className="modal-premium__info-label">{t('admin.permissions')}:</span>
                        <span className="modal-premium__info-value">
                          {selectedUser.role === 'admin' ? t('admin.allOperations') :
                           selectedUser.role === 'moderator' ? t('admin.contentModeration') :
                           t('admin.readOnly')}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Separator */}
                  <div className="modal-premium__separator" />

                  {/* Activity Statistics */}
                  {selectedUser.stats && (
                    <motion.div
                      className="modal-premium__section"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h4 className="modal-premium__section-title">
                        <BarChart3 size={18} />
                        {t('admin.activityStatistics')}
                      </h4>
                      <div className="modal-premium__stats-grid">
                        <motion.div
                          className="modal-premium__stat-card"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.45 }}
                          whileHover={{ scale: 1.05, y: -4 }}
                          style={{ borderColor: '#E879F930' }}
                        >
                          <div className="modal-premium__stat-icon" style={{ color: '#E879F9' }}>
                            <Building2 size={24} />
                          </div>
                          <div className="modal-premium__stat-value" style={{ color: '#E879F9' }}>
                            {selectedUser.stats.establishments_submitted || 0}
                          </div>
                          <div className="modal-premium__stat-label">{t('admin.establishments')}</div>
                        </motion.div>
                        <motion.div
                          className="modal-premium__stat-card"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 }}
                          whileHover={{ scale: 1.05, y: -4 }}
                          style={{ borderColor: '#00E5FF30' }}
                        >
                          <div className="modal-premium__stat-icon" style={{ color: '#00E5FF' }}>
                            <Users size={24} />
                          </div>
                          <div className="modal-premium__stat-value" style={{ color: '#00E5FF' }}>
                            {selectedUser.stats.employees_submitted || 0}
                          </div>
                          <div className="modal-premium__stat-label">{t('admin.employees')}</div>
                        </motion.div>
                        <motion.div
                          className="modal-premium__stat-card"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.55 }}
                          whileHover={{ scale: 1.05, y: -4 }}
                          style={{ borderColor: '#FFD70030' }}
                        >
                          <div className="modal-premium__stat-icon" style={{ color: '#FFD700' }}>
                            <MessageSquare size={24} />
                          </div>
                          <div className="modal-premium__stat-value" style={{ color: '#FFD700' }}>
                            {selectedUser.stats.comments_made || 0}
                          </div>
                          <div className="modal-premium__stat-label">{t('admin.comments')}</div>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Footer */}
                <motion.div
                  className="modal-premium__footer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  style={{ justifyContent: 'center' }}
                >
                  <motion.button
                    className="modal-premium__btn-primary"
                    onClick={() => setSelectedUser(null)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ width: '100%', maxWidth: '200px' }}
                  >
                    {t('common.close')}
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
