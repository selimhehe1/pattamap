import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import EstablishmentsAdmin from './EstablishmentsAdmin';
import EmployeesAdmin from './EmployeesAdmin';
import EmployeeClaimsAdmin from './EmployeeClaimsAdmin';
import CommentsAdmin from './CommentsAdmin';
import UsersAdmin from './UsersAdmin';
import ConsumablesAdmin from './ConsumablesAdmin';
import VerificationsAdmin from './VerificationsAdmin';
import { logger } from '../../utils/logger';
import { isFeatureEnabled, FEATURES } from '../../utils/featureFlags';
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
  Trophy,
  TrendingUp,
  Wallet,
  Mail,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  BarChart3,
  ShieldOff
} from 'lucide-react';
import '../../styles/admin/dashboard.css';
// admin-profile-modal.css removed - now using unified modals.css from App.tsx

// Feature flag check
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
  totalOwners?: number; // 🆕 v10.1
  establishmentsWithOwners?: number; // 🆕 v10.1
  pendingVerifications?: number; // 🆕 v10.2
  totalVerified?: number; // 🆕 v10.3
  pendingVIPVerifications?: number; // 🆕 v10.3 Phase 2 - VIP payment verifications
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

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  badge: number | null;
  href?: string;
  testId?: string;
}

interface StatCard {
  title: string;
  value: number;
  pending: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

interface AdminDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
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
    totalOwners: 0, // 🆕 v10.1
    establishmentsWithOwners: 0, // 🆕 v10.1
    pendingVerifications: 0, // 🆕 v10.2
    totalVerified: 0, // 🆕 v10.3
    pendingVIPVerifications: 0 // 🆕 v10.3 Phase 2 - VIP payment verifications
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

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

  const viewCurrentUserProfile = async () => {
    if (!user) {
      logger.error('❌ No user in context');
      return;
    }

    logger.debug('👤 Current user context:', user);

    // Utiliser directement les données du contexte user
    const adminUserData: AdminUser = {
      id: user.id,
      pseudonym: user.pseudonym,
      email: user.email,
      role: user.role,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.updated_at || new Date().toISOString(),
      last_login: undefined, // Sera récupéré via API si disponible
      is_active: true, // Assumons que l'utilisateur connecté est actif
      stats: {
        establishments_submitted: 0,
        employees_submitted: 0,
        comments_made: 0
      }
    };

    logger.debug('✅ Using direct user context data:', adminUserData);
    setSelectedUser(adminUserData);

    // Récupérer les vraies statistiques de l'utilisateur
    try {
      const response = await secureFetch(`${import.meta.env.VITE_API_URL}/api/admin/user-stats/${user.id}`);

      if (response.ok) {
        const { stats } = await response.json();
        logger.debug('📊 Real user stats retrieved:', stats);

        // Mettre à jour les stats avec les vraies données
        setSelectedUser(prev => prev ? {
          ...prev,
          stats: stats
        } : prev);
      } else {
        logger.debug('⚠️ User stats API failed, keeping default stats');
      }
    } catch (error) {
      logger.debug('ℹ️ User stats call failed, using default stats:', error);
    }
  };

  if (!user || !['admin', 'moderator'].includes(user.role)) {
    return (
      <div className="bg-nightlife-glass-card"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          textAlign: 'center'
        }}>
        <div>
          <h2 style={{
            color: 'var(--color-primary)',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 0 15px 0',
            textShadow: '0 0 10px rgba(193, 154, 107,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <ShieldOff size={24} /> {t('admin.accessDenied')}
          </h2>
          <p style={{
            color: '#cccccc',
            fontSize: '16px',
            lineHeight: '1.6'
          }}>
            {t('admin.accessDeniedMessage')}<br />
            {t('admin.accessDeniedRestricted')}
          </p>
        </div>
      </div>
    );
  }

  const tabItems: TabItem[] = [
    {
      id: 'overview',
      label: t('admin.overviewTab'),
      icon: <LayoutDashboard size={18} />,
      description: t('admin.overviewDesc'),
      badge: null
    },
    {
      id: 'establishments',
      label: t('admin.establishmentsTab'),
      icon: <Building2 size={18} />,
      description: t('admin.establishmentsDesc'),
      badge: stats.pendingEstablishments > 0 ? stats.pendingEstablishments : null
    },
    {
      id: 'employees',
      label: t('admin.employeesTab'),
      icon: <Users size={18} />,
      description: t('admin.employeesDesc'),
      badge: stats.pendingEmployees > 0 ? stats.pendingEmployees : null
    },
    {
      id: 'employee-claims',
      label: t('admin.profileClaimsTab'),
      icon: <Link2 size={18} />,
      description: t('admin.profileClaimsDesc'),
      badge: stats.pendingClaims > 0 ? stats.pendingClaims : null
    },
    {
      id: 'establishment-owners',
      label: t('admin.establishmentOwnersTab'),
      icon: <Crown size={18} />,
      description: t('admin.establishmentOwnersDesc'),
      badge: null
    },
    {
      id: 'verifications',
      label: 'Verifications',
      icon: <BadgeCheck size={18} />,
      description: 'Manage employee verification requests',
      badge: stats.pendingVerifications && stats.pendingVerifications > 0 ? stats.pendingVerifications : null
    },
    ...(VIP_ENABLED ? [{
      id: 'vip-verifications',
      label: 'VIP Verification',
      icon: <Gem size={18} />,
      description: 'Verify VIP cash payments',
      badge: null,
      href: '/admin/vip-verification',
      testId: 'vip-verification-link'
    }] : []),
    {
      id: 'comments',
      label: t('admin.reviewsTab'),
      icon: <MessageSquare size={18} />,
      description: t('admin.reviewsDesc'),
      badge: (stats.pendingComments + stats.reportedComments) > 0 ? (stats.pendingComments + stats.reportedComments) : null
    },
    {
      id: 'users',
      label: t('admin.usersTab'),
      icon: <User size={18} />,
      description: t('admin.usersDesc'),
      badge: null
    },
    {
      id: 'consumables',
      label: t('admin.consumablesTab'),
      icon: <Beer size={18} />,
      description: t('admin.consumablesDesc'),
      badge: null
    },
  ];

  // Unified colors from design system
  const STAT_COLORS = {
    primary: 'var(--color-primary)',      // #C19A6B - Gold/Primary
    accent: 'var(--color-accent)',        // #E879F9 - Fuchsia
    success: 'var(--color-success)',      // #10B981 - Emerald
  };

  const statCards: StatCard[] = [
    {
      title: t('admin.totalEstablishments'),
      value: stats.totalEstablishments,
      pending: stats.pendingEstablishments,
      icon: <Building2 size={28} />,
      color: STAT_COLORS.primary
    },
    {
      title: t('admin.totalEmployees'),
      value: stats.totalEmployees,
      pending: stats.pendingEmployees,
      icon: <Users size={28} />,
      color: STAT_COLORS.accent
    },
    {
      title: t('admin.totalReviews'),
      value: stats.totalComments,
      pending: stats.pendingComments,
      icon: <MessageSquare size={28} />,
      color: STAT_COLORS.primary
    },
    {
      title: t('admin.totalOwners'),
      value: stats.totalOwners || 0,
      pending: 0,
      icon: <Crown size={28} />,
      color: STAT_COLORS.accent,
      subtitle: t('admin.establishmentsOwned', { count: stats.establishmentsWithOwners || 0 })
    },
    {
      title: 'Verified Profiles',
      value: stats.totalVerified || 0,
      pending: stats.pendingVerifications || 0,
      icon: <BadgeCheck size={28} />,
      color: STAT_COLORS.success,
      subtitle: stats.totalVerified && stats.totalEmployees
        ? `${Math.round((stats.totalVerified / stats.totalEmployees) * 100)}% verification rate`
        : '0% verification rate'
    }
  ];

  return (
    <div className="admin-dashboard-container" data-testid="admin-dashboard">
      {/* Modern Admin Header */}
      <div className="admin-header-modern-nightlife">
        <div className="admin-header-top-row">
          <div className="admin-header-left">
            <div className="admin-control-center">
              <span className="admin-shield-icon"><Shield size={24} /></span>
              <h1 className="admin-control-title">{t('admin.controlCenter')}</h1>
            </div>
          </div>

          <div className="admin-header-right">
            <button
              className="admin-user-badge"
              onClick={viewCurrentUserProfile}
              style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
              title={t('admin.viewYourProfile')}
            >
              <div className="admin-user-avatar">
                <span className="admin-user-avatar-fallback">
                  {user.pseudonym.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="admin-user-info">
                <span className="admin-user-name">{user.pseudonym}</span>
                <span className="admin-user-role-badge"><Trophy size={14} /> {user.role}</span>
              </div>
            </button>

          </div>
        </div>

      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs-container">
        {tabItems.map((tab) => {
          const tabContent = (
            <>
              <div className="admin-tab-label">
                <span className="admin-tab-icon">{tab.icon}</span>
                {tab.label}
              </div>
              <div className="admin-tab-description">
                {tab.description}
              </div>

              {/* Badge for pending items */}
              {tab.badge && (
                <div className="admin-tab-badge">
                  {tab.badge}
                </div>
              )}
            </>
          );

          // Use Link for tabs with href
          if (tab.href) {
            return (
              <Link
                key={tab.id}
                to={tab.href}
                onClick={() => onTabChange(tab.id)}
                className={`admin-tab-button ${activeTab === tab.id ? 'active' : ''}`}
                data-testid={tab.testId}
              >
                {tabContent}
              </Link>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`admin-tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tabContent}
            </button>
          );
        })}
      </div>

      {/* Overview Content */}
      {activeTab === 'overview' && (
        <div>
          {/* Statistics Cards */}
          <div className="admin-stats-grid scroll-reveal-stagger">
            {statCards.map((card) => (
              <div
                key={card.title}
                className="admin-stat-card"
                style={{ borderColor: `${card.color}40` }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 15px 35px ${card.color}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-glow-subtle)';
                }}
              >
                <div className="admin-stat-bg-icon">
                  {card.icon}
                </div>

                <div className="admin-stat-icon" style={{ color: card.color }}>
                  {card.icon}
                </div>

                <div className="admin-stat-title" style={{ color: card.color }}>
                  {card.title}
                </div>

                <div className="admin-stat-value" style={{ fontFamily: '"Orbitron", monospace' }}>
                  {isLoading ? '...' : (card.value || 0).toLocaleString()}
                </div>

                {/* 🆕 v10.1 - Optional subtitle for additional info */}
                {card.subtitle && (
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.6)',
                    marginTop: '5px',
                    textAlign: 'center'
                  }}>
                    {card.subtitle}
                  </div>
                )}

                {card.pending > 0 && (
                  <div className="admin-pending-badge">
                    <span className="admin-pending-dot" />
                    <span className="admin-pending-text">
                      {card.pending} {t('admin.pendingApproval')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="admin-quick-actions">
            <h3 className="admin-quick-actions-title">
              <TrendingUp size={18} style={{ marginRight: '8px' }} />
              {t('admin.quickActions')}
            </h3>

            <div className="admin-quick-actions-grid scroll-reveal-stagger">
              {stats.pendingEstablishments > 0 && (
                <button
                  onClick={() => onTabChange('establishments')}
                  className="admin-action-button"
                  style={{ textAlign: 'left' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <Building2 size={16} style={{ marginRight: '6px' }} />
                  {t('admin.reviewEstablishment', { count: stats.pendingEstablishments })}
                </button>
              )}

              {stats.pendingEmployees > 0 && (
                <button
                  onClick={() => onTabChange('employees')}
                  className="admin-action-button"
                  style={{ background: 'linear-gradient(45deg, var(--color-accent), var(--color-accent-button))', textAlign: 'left' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <Users size={16} style={{ marginRight: '6px' }} />
                  {t('admin.reviewEmployee', { count: stats.pendingEmployees })}
                </button>
              )}

              {(stats.pendingComments + stats.reportedComments) > 0 && (
                <button
                  onClick={() => onTabChange('comments')}
                  className="admin-action-button secondary"
                  style={{ textAlign: 'left' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <MessageSquare size={16} style={{ marginRight: '6px' }} />
                  {t('admin.reviewComment', { count: stats.pendingComments + stats.reportedComments })}
                </button>
              )}

              {stats.pendingVerifications && stats.pendingVerifications > 0 && (
                <button
                  onClick={() => onTabChange('verifications')}
                  className="admin-action-button"
                  style={{ background: 'linear-gradient(45deg, var(--color-success), var(--color-success-button))', textAlign: 'left' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <BadgeCheck size={16} style={{ marginRight: '6px' }} />
                  Review {stats.pendingVerifications} verification{stats.pendingVerifications > 1 ? 's' : ''}
                </button>
              )}

              {/* VIP Payment Quick Action - only shown if VIP feature enabled */}
              {VIP_ENABLED && stats.pendingVIPVerifications && stats.pendingVIPVerifications > 0 && (
                <button
                  onClick={() => onTabChange('vip-verifications')}
                  className="admin-action-button"
                  style={{ background: 'linear-gradient(45deg, var(--color-primary), var(--color-primary-button))', textAlign: 'left' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <Wallet size={16} style={{ marginRight: '6px' }} />
                  Review {stats.pendingVIPVerifications} VIP payment{stats.pendingVIPVerifications > 1 ? 's' : ''}
                </button>
              )}

              <button
                onClick={() => onTabChange('users')}
                className="admin-action-button"
                style={{ background: 'linear-gradient(45deg, var(--color-error), var(--color-error-button))', textAlign: 'left' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <User size={16} style={{ marginRight: '6px' }} />
                {t('admin.manageUsers', { count: stats.totalUsers })}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Admin Components Routing */}
      {activeTab === 'establishments' && (
        <EstablishmentsAdmin onTabChange={onTabChange} />
      )}

      {activeTab === 'employees' && (
        <EmployeesAdmin onTabChange={onTabChange} />
      )}

      {activeTab === 'employee-claims' && (
        <EmployeeClaimsAdmin onTabChange={onTabChange} />
      )}

      {activeTab === 'comments' && (
        <CommentsAdmin onTabChange={onTabChange} />
      )}

      {activeTab === 'users' && (
        <UsersAdmin onTabChange={onTabChange} />
      )}

      {activeTab === 'consumables' && (
        <ConsumablesAdmin activeTab={activeTab} onTabChange={onTabChange} />
      )}

      {activeTab === 'verifications' && (
        <VerificationsAdmin onTabChange={onTabChange} />
      )}

      {/* Modern Admin Profile Modal */}
      {selectedUser && (
        <div className="admin-profile-modal-overlay">
          <div className="admin-profile-modal-container">
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
                  {selectedUser.last_login && (
                    <div className="admin-profile-info-item">
                      <div className="admin-profile-info-label">{t('admin.lastLogin')}</div>
                      <div className="admin-profile-info-value">
                        {new Date(selectedUser.last_login).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}
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
                        <><User size={14} style={{ color: 'var(--color-accent)' }} /> {t('admin.userAccess')}</>
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
          </div>
        </div>
      )}

      {/* Animations CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;