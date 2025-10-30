import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import LoadingFallback from '../Common/LoadingFallback';
import { logger } from '../../utils/logger';

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
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'user' | 'moderator' | 'admin' | 'inactive'>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, [filter, searchTerm]);

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

  const handleRoleChange = async (userId: string, newRole: string) => {
    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      const response = await secureFetch(`${API_URL}/api/admin/users/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role: newRole })
      });
      
      if (response.ok) {
        await loadUsers(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to change user role:', error);
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
        await loadUsers(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to toggle user status:', error);
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
        await loadUsers(); // Reload list
        setEditingUser(null);
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      logger.error('Failed to save user:', error);
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#FF4757';
      case 'moderator': return '#FFD700';
      case 'user': return '#00E5FF';
      default: return '#cccccc';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return '👑';
      case 'moderator': return '🛡️';
      case 'user': return '👤';
      default: return '❓';
    }
  };

  const filteredUsers = users.filter(u => 
    u.pseudonym.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user || user.role !== 'admin') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '30px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
          borderRadius: '20px',
          border: '2px solid rgba(193, 154, 107,0.3)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <h2 style={{
            color: '#C19A6B',
            fontSize: '24px',
            fontWeight: 'bold',
            margin: '0 0 15px 0'
          }}>
            🚫 {t('admin.accessDenied')}
          </h2>
          <p style={{ color: '#cccccc', fontSize: '16px' }}>
            {t('admin.accessDeniedArea')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(26,0,51,0.95), rgba(13,0,25,0.95))',
      minHeight: '100vh',
      padding: '30px',
      color: 'white'
    }}>
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb
        currentSection={t('admin.usersManagement')}
        onBackToDashboard={() => onTabChange('overview')}
        icon="👤"
      />

      {/* Header */}
      <div style={{ marginBottom: '30px' }}>

        <h1 style={{
          fontSize: '32px',
          fontWeight: '900',
          margin: '0 0 10px 0',
          background: 'linear-gradient(45deg, #C19A6B, #FFD700)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 20px rgba(193, 154, 107,0.5)',
          fontFamily: '"Orbitron", monospace'
        }}>
          👤 {t('admin.usersManagement')}
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#cccccc',
          margin: 0
        }}>
          {t('admin.manageUserAccounts')}
        </p>
      </div>

      {/* Search and Filter */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '30px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Search Input */}
        <input
          type="text"
          placeholder={t('admin.searchUsers')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '300px',
            padding: '12px 20px',
            borderRadius: '12px',
            border: '2px solid rgba(193, 154, 107,0.3)',
            background: 'rgba(0,0,0,0.3)',
            color: '#ffffff',
            fontSize: '14px',
            transition: 'border-color 0.3s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#C19A6B';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(193, 154, 107,0.3)';
          }}
        />

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: t('admin.filterAll'), icon: '📋' },
            { key: 'admin', label: t('admin.filterAdmins'), icon: '👑' },
            { key: 'moderator', label: t('admin.filterModerators'), icon: '🛡️' },
            { key: 'user', label: t('admin.filterUsers'), icon: '👤' },
            { key: 'inactive', label: t('admin.filterInactive'), icon: '🚫' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: filter === tab.key ? '2px solid #C19A6B' : '2px solid rgba(193, 154, 107,0.3)',
                background: filter === tab.key 
                  ? 'linear-gradient(45deg, rgba(193, 154, 107,0.2), rgba(255,215,0,0.1))'
                  : 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
                color: filter === tab.key ? '#C19A6B' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '12px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <LoadingFallback message={t('admin.loadingUsers')} variant="inline" />
      ) : filteredUsers.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
          borderRadius: '20px',
          border: '2px solid rgba(193, 154, 107,0.3)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <h3 style={{
            color: '#C19A6B',
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '0 0 10px 0'
          }}>
            📭 {t('admin.noUsersFound')}
          </h3>
          <p style={{
            color: '#cccccc',
            fontSize: '16px'
          }}>
            {t('admin.noUsersMatch')}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px'
        }}>
          {filteredUsers.map((userData) => (
            <div
              key={userData.id}
              style={{
                background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
                borderRadius: '20px',
                border: userData.is_active 
                  ? '2px solid rgba(193, 154, 107,0.3)' 
                  : '2px solid rgba(255,71,87,0.5)',
                padding: '20px',
                position: 'relative',
                opacity: userData.is_active ? 1 : 0.7,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(193, 154, 107,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Role Badge */}
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                padding: '6px 12px',
                borderRadius: '15px',
                background: `${getRoleColor(userData.role)}20`,
                border: `2px solid ${getRoleColor(userData.role)}`,
                color: getRoleColor(userData.role),
                fontSize: '11px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {getRoleIcon(userData.role)} {userData.role.toUpperCase()}
              </div>

              {/* Status Badge */}
              {!userData.is_active && (
                <div style={{
                  position: 'absolute',
                  top: '50px',
                  right: '15px',
                  padding: '4px 8px',
                  borderRadius: '10px',
                  background: 'rgba(255,71,87,0.2)',
                  border: '1px solid #FF4757',
                  color: '#FF4757',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  INACTIVE
                </div>
              )}

              {/* User Avatar */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: `linear-gradient(45deg, ${getRoleColor(userData.role)}, #FFD700)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '24px',
                marginBottom: '15px'
              }}>
                {userData.pseudonym.charAt(0).toUpperCase()}
              </div>

              {/* User Info */}
              <div style={{ marginBottom: '15px', paddingRight: '80px' }}>
                <h3 style={{
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  margin: '0 0 5px 0'
                }}>
                  {userData.pseudonym}
                </h3>
                
                <div style={{
                  color: '#cccccc',
                  fontSize: '14px',
                  marginBottom: '10px'
                }}>
                  {userData.email}
                </div>

                <div style={{
                  fontSize: '12px',
                  color: '#888888',
                  marginBottom: '10px'
                }}>
                  {t('admin.joined')} {formatDate(userData.created_at)}
                  {userData.last_login && (
                    <div>{t('admin.lastLogin')} {formatDate(userData.last_login)}</div>
                  )}
                </div>

                {/* User Stats */}
                {userData.stats && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    marginTop: '12px'
                  }}>
                    <div style={{
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '8px',
                      padding: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        color: '#C19A6B',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        {userData.stats.establishments_submitted}
                      </div>
                      <div style={{
                        color: '#cccccc',
                        fontSize: '10px'
                      }}>
                        {t('admin.bars')}
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '8px',
                      padding: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        color: '#00E5FF',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        {userData.stats.employees_submitted}
                      </div>
                      <div style={{
                        color: '#cccccc',
                        fontSize: '10px'
                      }}>
                        {t('admin.profiles')}
                      </div>
                    </div>

                    <div style={{
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '8px',
                      padding: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        color: '#FFD700',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        {userData.stats.comments_made}
                      </div>
                      <div style={{
                        color: '#cccccc',
                        fontSize: '10px'
                      }}>
                        {t('admin.reviews')}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {userData.id !== user.id && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingTop: '15px',
                  borderTop: '1px solid rgba(193, 154, 107,0.3)'
                }}>
                  {/* Role Selection */}
                  <div style={{
                    display: 'flex',
                    gap: '6px'
                  }}>
                    {['user', 'moderator', 'admin'].map((role) => (
                      <button
                        key={role}
                        onClick={() => handleRoleChange(userData.id, role)}
                        disabled={processingIds.has(userData.id) || userData.role === role}
                        style={{
                          flex: 1,
                          padding: '8px',
                          background: userData.role === role
                            ? `${getRoleColor(role)}40`
                            : processingIds.has(userData.id)
                            ? 'linear-gradient(45deg, #666666, #888888)'
                            : 'rgba(0,0,0,0.3)',
                          color: userData.role === role ? getRoleColor(role) : '#ffffff',
                          border: userData.role === role ? `2px solid ${getRoleColor(role)}` : '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          cursor: (processingIds.has(userData.id) || userData.role === role) ? 'not-allowed' : 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          transition: 'all 0.3s ease',
                          opacity: (processingIds.has(userData.id) || userData.role === role) ? 0.5 : 1
                        }}
                      >
                        {getRoleIcon(role)} {role}
                      </button>
                    ))}
                  </div>

                  {/* Active Toggle */}
                  <button
                    onClick={() => handleToggleActive(userData.id, userData.is_active)}
                    disabled={processingIds.has(userData.id)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: processingIds.has(userData.id)
                        ? 'linear-gradient(45deg, #666666, #888888)'
                        : userData.is_active
                        ? 'linear-gradient(45deg, #FF4757, #FF3742)'
                        : 'linear-gradient(45deg, #00FF7F, #00CC65)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: processingIds.has(userData.id) ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      transition: 'all 0.3s ease',
                      opacity: processingIds.has(userData.id) ? 0.7 : 1
                    }}
                  >
                    {processingIds.has(userData.id)
                      ? `⏳ ${t('admin.processing')}`
                      : userData.is_active
                      ? `🚫 ${t('admin.deactivate')}`
                      : `✅ ${t('admin.activate')}`
                    }
                  </button>

                  {/* Edit and View Details */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => setEditingUser(userData)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      ✏️ {t('common.edit')}
                    </button>
                    <button
                      onClick={() => setSelectedUser(userData)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: 'linear-gradient(45deg, #00E5FF, #0080FF)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      👁️ {t('admin.view')}
                    </button>
                  </div>
                </div>
              )}

              {/* Current User Badge */}
              {userData.id === user.id && (
                <div style={{
                  paddingTop: '15px',
                  borderTop: '1px solid rgba(193, 154, 107,0.3)',
                  textAlign: 'center'
                }}>
                  <span style={{
                    color: '#FFD700',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    background: 'rgba(255,215,0,0.2)',
                    padding: '6px 12px',
                    borderRadius: '15px',
                    border: '1px solid #FFD700'
                  }}>
                    👤 {t('admin.thisIsYou')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }} role="dialog" aria-modal="true">
          <div style={{
            background: 'linear-gradient(135deg, rgba(26,0,51,0.95), rgba(13,0,25,0.95))',
            borderRadius: '25px',
            border: '2px solid #C19A6B',
            boxShadow: '0 20px 60px rgba(193, 154, 107,0.3)',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            padding: '30px'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedUser(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(193, 154, 107,0.2)',
                border: '2px solid #C19A6B',
                color: '#C19A6B',
                fontSize: '20px',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              ×
            </button>

            <h2 style={{
              color: '#C19A6B',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 0 20px 0'
            }}>
              {t('admin.userDetails')}
            </h2>

            <div style={{ color: 'white' }}>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>{t('admin.id')}</strong> {selectedUser.id}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>{t('admin.pseudonym')}</strong> {selectedUser.pseudonym}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>{t('admin.email')}</strong> {selectedUser.email}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>{t('admin.role')}</strong> {getRoleIcon(selectedUser.role)} {selectedUser.role}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>{t('admin.status')}</strong> {selectedUser.is_active ? `✅ ${t('admin.active')}` : `🚫 ${t('admin.inactive')}`}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong style={{ color: '#C19A6B' }}>{t('admin.memberSince')}</strong> {formatDate(selectedUser.created_at)}
              </div>
              {selectedUser.last_login && (
                <div style={{ marginBottom: '20px' }}>
                  <strong style={{ color: '#C19A6B' }}>{t('admin.lastLogin')}</strong> {formatDate(selectedUser.last_login)}
                </div>
              )}

              {selectedUser.stats && (
                <div style={{ marginTop: '20px' }}>
                  <strong style={{ color: '#C19A6B' }}>{t('admin.activityStatistics')}</strong>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '10px',
                    padding: '15px',
                    marginTop: '10px'
                  }}>
                    <div>🏢 {t('admin.establishmentsSubmitted')}: {selectedUser.stats.establishments_submitted}</div>
                    <div>👥 {t('admin.employeeProfilesSubmitted')} {selectedUser.stats.employees_submitted}</div>
                    <div>💬 {t('admin.reviews')}: {selectedUser.stats.comments_made}</div>
                  </div>
                </div>
              )}
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

      {/* Loading Animation CSS */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UsersAdmin;