import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import EstablishmentsAdmin from './EstablishmentsAdmin';
import EmployeesAdmin from './EmployeesAdmin';
import CommentsAdmin from './CommentsAdmin';
import UsersAdmin from './UsersAdmin';
import ConsumablesAdmin from './ConsumablesAdmin';
import { logger } from '../../utils/logger';

interface DashboardStats {
  totalEstablishments: number;
  pendingEstablishments: number;
  totalEmployees: number;
  pendingEmployees: number;
  totalComments: number;
  pendingComments: number;
  reportedComments: number;
  totalUsers: number;
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
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
  const [stats, setStats] = useState<DashboardStats>({
    totalEstablishments: 0,
    pendingEstablishments: 0,
    totalEmployees: 0,
    pendingEmployees: 0,
    totalComments: 0,
    pendingComments: 0,
    reportedComments: 0,
    totalUsers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    setIsLoading(true);
    try {
      logger.debug('📊 Loading dashboard stats...');
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/admin/dashboard-stats`);

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
      const response = await secureFetch(`${process.env.REACT_APP_API_URL}/api/admin/user-stats/${user.id}`);

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
            color: '#FF1B8D',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 0 15px 0',
            textShadow: '0 0 10px rgba(255,27,141,0.5)'
          }}>
            🚫 Access Denied
          </h2>
          <p style={{
            color: '#cccccc',
            fontSize: '16px',
            lineHeight: '1.6'
          }}>
            You don't have permission to access the admin dashboard.<br />
            This area is restricted to administrators and moderators only.
          </p>
        </div>
      </div>
    );
  }

  const tabItems = [
    { 
      id: 'overview', 
      label: '📊 Overview', 
      description: 'Dashboard statistics',
      badge: null
    },
    { 
      id: 'establishments', 
      label: '🏢 Establishments', 
      description: 'Manage bars and venues',
      badge: stats.pendingEstablishments > 0 ? stats.pendingEstablishments : null
    },
    { 
      id: 'employees', 
      label: '👥 Employees', 
      description: 'Manage employee profiles',
      badge: stats.pendingEmployees > 0 ? stats.pendingEmployees : null
    },
    { 
      id: 'comments', 
      label: '💬 Reviews', 
      description: 'Moderate comments and reviews',
      badge: (stats.pendingComments + stats.reportedComments) > 0 ? (stats.pendingComments + stats.reportedComments) : null
    },
    { 
      id: 'users', 
      label: '👤 Users', 
      description: 'Manage user accounts',
      badge: null
    },
    {
      id: 'consumables',
      label: '🍺 Consommables',
      description: 'Manage drinks and consumables',
      badge: null
    },
  ];

  const statCards = [
    {
      title: 'Total Establishments',
      value: stats.totalEstablishments,
      pending: stats.pendingEstablishments,
      icon: '🏢',
      color: '#FF1B8D'
    },
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      pending: stats.pendingEmployees,
      icon: '👥',
      color: '#00FFFF'
    },
    {
      title: 'Total Reviews',
      value: stats.totalComments,
      pending: stats.pendingComments,
      icon: '💬',
      color: '#FFD700'
    }
  ];

  return (
    <div className="admin-dashboard-container">
      {/* Modern Admin Header */}
      <div className="admin-header-modern-nightlife">
        <div className="admin-header-top-row">
          <div className="admin-header-left">
            <div className="admin-control-center">
              <span className="admin-shield-icon">🛡️</span>
              <h1 className="admin-control-title">Admin Control Center</h1>
            </div>
          </div>

          <div className="admin-header-right">
            <button
              className="admin-user-badge"
              onClick={viewCurrentUserProfile}
              style={{ cursor: 'pointer', border: 'none', background: 'transparent' }}
              title="View your profile"
            >
              <span className="admin-user-avatar">👤</span>
              <div className="admin-user-info">
                <span className="admin-user-name">{user.pseudonym}</span>
                <span className="admin-user-role">{user.role.toUpperCase()}</span>
              </div>
            </button>

          </div>
        </div>

      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs-container">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`admin-tab-button ${activeTab === tab.id ? 'active' : ''}`}
          >
            <div className="admin-tab-label">
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
          </button>
        ))}
      </div>

      {/* Overview Content */}
      {activeTab === 'overview' && (
        <div>
          {/* Statistics Cards */}
          <div className="admin-stats-grid">
            {statCards.map((card, index) => (
              <div
                key={index}
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

                {card.pending > 0 && (
                  <div className="admin-pending-badge">
                    <span className="admin-pending-dot" />
                    <span className="admin-pending-text">
                      {card.pending} pending approval
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="admin-quick-actions">
            <h3 className="admin-quick-actions-title">
              📈 Quick Actions
            </h3>

            <div className="admin-quick-actions-grid">
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
                  🏢 Review {stats.pendingEstablishments} establishment{stats.pendingEstablishments > 1 ? 's' : ''}
                </button>
              )}

              {stats.pendingEmployees > 0 && (
                <button
                  onClick={() => onTabChange('employees')}
                  className="admin-action-button"
                  style={{ background: 'linear-gradient(45deg, #00FFFF, #0080FF)', textAlign: 'left' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  👥 Review {stats.pendingEmployees} employee{stats.pendingEmployees > 1 ? 's' : ''}
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
                  💬 Review {stats.pendingComments + stats.reportedComments} comment{(stats.pendingComments + stats.reportedComments) > 1 ? 's' : ''}
                </button>
              )}

              <button
                onClick={() => onTabChange('users')}
                className="admin-action-button"
                style={{ background: 'linear-gradient(45deg, #FF6B6B, #FF4757)', textAlign: 'left' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                👤 Manage Users ({stats.totalUsers})
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

      {activeTab === 'comments' && (
        <CommentsAdmin onTabChange={onTabChange} />
      )}

      {activeTab === 'users' && (
        <UsersAdmin onTabChange={onTabChange} />
      )}

      {activeTab === 'consumables' && (
        <ConsumablesAdmin activeTab={activeTab} onTabChange={onTabChange} />
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
                🛡️
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
                  📧 Personal Information
                </h3>
                <div className="admin-profile-info-grid">
                  <div className="admin-profile-info-item">
                    <div className="admin-profile-info-label">Email Address</div>
                    <div className="admin-profile-info-value">
                      {selectedUser.email || 'Not provided'}
                    </div>
                  </div>
                  <div className="admin-profile-info-item">
                    <div className="admin-profile-info-label">Member Since</div>
                    <div className="admin-profile-info-value">
                      {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'Unknown'}
                    </div>
                  </div>
                  <div className="admin-profile-info-item">
                    <div className="admin-profile-info-label">Account Status</div>
                    <div className={`admin-profile-info-value ${
                      selectedUser.is_active ? 'admin-profile-status-active' : 'admin-profile-status-inactive'
                    }`}>
                      {selectedUser.is_active ? '✅ Active' : '❌ Inactive'}
                    </div>
                  </div>
                  {selectedUser.last_login && (
                    <div className="admin-profile-info-item">
                      <div className="admin-profile-info-label">Last Login</div>
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
                  🔐 Role & Permissions
                </h3>
                <div className="admin-profile-info-grid">
                  <div className="admin-profile-info-item">
                    <div className="admin-profile-info-label">Access Level</div>
                    <div className="admin-profile-info-value">
                      {selectedUser.role === 'admin' ? '🔓 Full Access' :
                       selectedUser.role === 'moderator' ? '🔒 Moderation Access' :
                       '👤 User Access'}
                    </div>
                  </div>
                  <div className="admin-profile-info-item">
                    <div className="admin-profile-info-label">Permissions</div>
                    <div className="admin-profile-info-value">
                      {selectedUser.role === 'admin' ? 'All Operations' :
                       selectedUser.role === 'moderator' ? 'Content Moderation' :
                       'Read Only'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Statistics */}
              {selectedUser.stats && (
                <div className="admin-profile-section">
                  <h3 className="admin-profile-section-title">
                    📊 Activity Statistics
                  </h3>
                  <div className="admin-profile-stats-grid">
                    <div className="admin-profile-stat-card">
                      <div className="admin-profile-stat-number">
                        {selectedUser.stats.establishments_submitted || 0}
                      </div>
                      <div className="admin-profile-stat-label">
                        Establishments
                      </div>
                    </div>
                    <div className="admin-profile-stat-card">
                      <div className="admin-profile-stat-number">
                        {selectedUser.stats.employees_submitted || 0}
                      </div>
                      <div className="admin-profile-stat-label">
                        Employees
                      </div>
                    </div>
                    <div className="admin-profile-stat-card">
                      <div className="admin-profile-stat-number">
                        {selectedUser.stats.comments_made || 0}
                      </div>
                      <div className="admin-profile-stat-label">
                        Comments
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Animation CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;