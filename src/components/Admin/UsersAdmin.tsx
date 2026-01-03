import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import LoadingFallback from '../Common/LoadingFallback';
import UserAdminCard from './UserAdminCard';
import { logger } from '../../utils/logger';
import notification from '../../utils/notification';
import {
  Crown,
  Shield,
  User,
  Ban,
  ClipboardList,
  MailX,
  Building2,
  Users,
  MessageSquare,
  Search,
  CheckCircle,
  Pencil
} from 'lucide-react';

// Lazy load EditUserModal for better performance
const EditUserModal = lazy(() => import('./EditUserModal'));

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

interface UsersAdminProps {
  onTabChange: (tab: string) => void;
}

const UsersAdmin: React.FC<UsersAdminProps> = ({ onTabChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
  const API_URL = import.meta.env.VITE_API_URL || '';
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'user' | 'moderator' | 'admin' | 'inactive'>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Helper function to trigger refresh
  const refreshUsers = () => setRefreshCounter(c => c + 1);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filter !== 'all') {
          if (filter === 'inactive') {
            params.append('active', 'false');
          } else {
            params.append('role', filter);
          }
        }
        if (searchTerm) {
          params.append('search', searchTerm);
        }

        const response = await secureFetch(`${API_URL}/api/admin/users?${params.toString()}`);

        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        logger.error('Failed to load users:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, [filter, searchTerm, secureFetch, API_URL, refreshCounter]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      const response = await secureFetch(`${API_URL}/api/admin/users/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        refreshUsers();
        notification.success(t('admin.userRoleUpdated', 'User role updated'));
      } else {
        notification.error(t('admin.userRoleFailed', 'Failed to change role'));
      }
    } catch (error) {
      logger.error('Failed to change user role:', error);
      notification.error(t('admin.userRoleFailed', 'Failed to change role'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      const response = await secureFetch(`${API_URL}/api/admin/users/${userId}/toggle-active`, {
        method: 'POST',
        body: JSON.stringify({ is_active: !isActive })
      });

      if (response.ok) {
        refreshUsers();
        notification.success(
          isActive
            ? t('admin.userDeactivated', 'User deactivated')
            : t('admin.userActivated', 'User activated')
        );
      } else {
        notification.error(t('admin.userToggleFailed', 'Failed to change user status'));
      }
    } catch (error) {
      logger.error('Failed to toggle user status:', error);
      notification.error(t('admin.userToggleFailed', 'Failed to change user status'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleSaveUser = async (updatedData: Partial<AdminUser>) => {
    if (!editingUser) return;

    try {
      const response = await secureFetch(`${API_URL}/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        refreshUsers();
        setEditingUser(null);
        notification.success(t('admin.userSaved', 'User saved'));
      } else {
        notification.error(t('admin.userSaveFailed', 'Failed to save user'));
        throw new Error('Failed to update user');
      }
    } catch (error) {
      logger.error('Failed to save user:', error);
      notification.error(t('admin.userSaveFailed', 'Failed to save user'));
      throw error;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to get role icon
  const getRoleIcon = (role: string, size: number = 14) => {
    switch (role) {
      case 'admin': return <Crown size={size} />;
      case 'moderator': return <Shield size={size} />;
      case 'user': return <User size={size} />;
      default: return <User size={size} />;
    }
  };

  // Helper to get role badge class
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'uac-role-badge--admin';
      case 'moderator': return 'uac-role-badge--moderator';
      case 'user': return 'uac-role-badge--user';
      default: return '';
    }
  };

  const filteredUsers = users.filter(u =>
    u.pseudonym.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Access denied view
  if (!user || user.role !== 'admin') {
    return (
      <div className="command-content-section">
        <div className="cmd-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <Ban size={48} className="cmd-card__icon" style={{ marginBottom: '20px', opacity: 0.5 }} />
          <h2 className="cmd-card__title">{t('admin.accessDenied')}</h2>
          <p className="cmd-card__subtitle">{t('admin.accessDeniedArea')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="command-content-section">
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb
        currentSection={t('admin.usersManagement')}
        onBackToDashboard={() => onTabChange('overview')}
        icon={<User size={16} />}
      />

      {/* Header */}
      <div className="cmd-section-header">
        <h1 className="cmd-section-title">
          <User size={28} />
          {t('admin.usersManagement')}
        </h1>
        <p className="cmd-section-subtitle">{t('admin.manageUserAccounts')}</p>
      </div>

      {/* Search and Filters */}
      <div className="cmd-filters">
        {/* Search Input */}
        <div className="cmd-search">
          <Search size={18} className="cmd-search__icon" />
          <input
            type="text"
            className="cmd-search__input"
            placeholder={t('admin.searchUsers')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div className="cmd-filter-pills">
          {[
            { key: 'all', label: t('admin.filterAll'), icon: <ClipboardList size={14} /> },
            { key: 'admin', label: t('admin.filterAdmins'), icon: <Crown size={14} /> },
            { key: 'moderator', label: t('admin.filterModerators'), icon: <Shield size={14} /> },
            { key: 'user', label: t('admin.filterUsers'), icon: <User size={14} /> },
            { key: 'inactive', label: t('admin.filterInactive'), icon: <Ban size={14} /> }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as typeof filter)}
              className={`cmd-filter ${filter === tab.key ? 'cmd-filter--active' : ''}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid */}
      {isLoading ? (
        <LoadingFallback message={t('admin.loadingUsers')} variant="inline" />
      ) : filteredUsers.length === 0 ? (
        <div className="cmd-table__empty">
          <MailX size={48} />
          <h3>{t('admin.noUsersFound')}</h3>
          <p>{t('admin.noUsersMatch')}</p>
        </div>
      ) : (
        <div className="aec-grid">
          {filteredUsers.map((userData) => (
            <UserAdminCard
              key={userData.id}
              user={userData}
              isCurrentUser={userData.id === user.id}
              isProcessing={processingIds.has(userData.id)}
              onViewDetails={() => setSelectedUser(userData)}
              onEdit={() => setEditingUser(userData)}
              onChangeRole={(role) => handleRoleChange(userData.id, role)}
              onToggleActive={() => handleToggleActive(userData.id, userData.is_active)}
            />
          ))}
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="cmd-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div
            className="cmd-modal cmd-modal--md"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="cmd-modal__header">
              <h2 className="cmd-modal__title">
                <User size={20} /> {t('admin.userDetails')}
              </h2>
              <button
                className="cmd-modal__close"
                onClick={() => setSelectedUser(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="cmd-modal__body">
              <div className="cmd-modal__info-grid">
                <div className="cmd-modal__info-row">
                  <span className="cmd-modal__info-label">{t('admin.id')}</span>
                  <span className="cmd-modal__info-value cmd-modal__info-value--mono">{selectedUser.id}</span>
                </div>
                <div className="cmd-modal__info-row">
                  <span className="cmd-modal__info-label">{t('admin.pseudonym')}</span>
                  <span className="cmd-modal__info-value">{selectedUser.pseudonym}</span>
                </div>
                <div className="cmd-modal__info-row">
                  <span className="cmd-modal__info-label">{t('admin.email')}</span>
                  <span className="cmd-modal__info-value">{selectedUser.email}</span>
                </div>
                <div className="cmd-modal__info-row">
                  <span className="cmd-modal__info-label">{t('admin.role')}</span>
                  <span className="cmd-modal__info-value">
                    <span className={`uac-role-badge ${getRoleBadgeClass(selectedUser.role)}`} style={{ position: 'static', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '12px' }}>
                      {getRoleIcon(selectedUser.role, 12)} {selectedUser.role.toUpperCase()}
                    </span>
                  </span>
                </div>
                <div className="cmd-modal__info-row">
                  <span className="cmd-modal__info-label">{t('admin.status')}</span>
                  <span className="cmd-modal__info-value">
                    {selectedUser.is_active ? (
                      <span className="cmd-modal__status cmd-modal__status--success">
                        <CheckCircle size={14} /> {t('admin.active')}
                      </span>
                    ) : (
                      <span className="cmd-modal__status cmd-modal__status--error">
                        <Ban size={14} /> {t('admin.inactive')}
                      </span>
                    )}
                  </span>
                </div>
                <div className="cmd-modal__info-row">
                  <span className="cmd-modal__info-label">{t('admin.memberSince')}</span>
                  <span className="cmd-modal__info-value">{formatDate(selectedUser.created_at)}</span>
                </div>
                {selectedUser.last_login && (
                  <div className="cmd-modal__info-row">
                    <span className="cmd-modal__info-label">{t('admin.lastLogin')}</span>
                    <span className="cmd-modal__info-value">{formatDate(selectedUser.last_login)}</span>
                  </div>
                )}
              </div>

              {selectedUser.stats && (
                <div className="cmd-modal__section">
                  <h3 className="cmd-modal__section-title">{t('admin.activityStatistics')}</h3>
                  <div className="cmd-modal__stats-grid">
                    <div className="cmd-modal__stat">
                      <Building2 size={20} />
                      <span className="cmd-modal__stat-value">{selectedUser.stats.establishments_submitted}</span>
                      <span className="cmd-modal__stat-label">{t('admin.establishmentsSubmitted')}</span>
                    </div>
                    <div className="cmd-modal__stat">
                      <Users size={20} />
                      <span className="cmd-modal__stat-value">{selectedUser.stats.employees_submitted}</span>
                      <span className="cmd-modal__stat-label">{t('admin.employeeProfilesSubmitted')}</span>
                    </div>
                    <div className="cmd-modal__stat">
                      <MessageSquare size={20} />
                      <span className="cmd-modal__stat-value">{selectedUser.stats.comments_made}</span>
                      <span className="cmd-modal__stat-label">{t('admin.reviews')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="cmd-modal__footer">
              <button
                className="cmd-modal-btn cmd-modal-btn--secondary"
                onClick={() => setSelectedUser(null)}
              >
                {t('common.close')}
              </button>
              <button
                className="cmd-modal-btn cmd-modal-btn--primary"
                onClick={() => {
                  setEditingUser(selectedUser);
                  setSelectedUser(null);
                }}
              >
                <Pencil size={14} /> {t('common.edit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <Suspense fallback={<LoadingFallback />}>
          <EditUserModal
            user={editingUser}
            isOpen={!!editingUser}
            onClose={() => setEditingUser(null)}
            onSave={handleSaveUser}
          />
        </Suspense>
      )}
    </div>
  );
};

export default UsersAdmin;
