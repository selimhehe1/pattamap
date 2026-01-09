/**
 * EstablishmentOwnersAdmin Component (Refactored)
 *
 * Admin panel for managing establishment owners:
 * - View and filter establishments by owner status
 * - Review and process ownership requests
 * - Assign/remove owners with role-based permissions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useDialog } from '../../hooks/useDialog';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import { SkeletonTable } from '../Common/Skeleton';
import { logger } from '../../utils/logger';
import notification from '../../utils/notification';
import {
  Ban,
  ClipboardList,
  Users,
  MailX,
  Building2,
  CheckCircle
} from 'lucide-react';

// Import extracted types
import type {
  EstablishmentOwner,
  AdminEstablishment,
  AdminUser,
  OwnershipRequest,
  OwnerPermissions,
  ViewMode,
  FilterMode,
  OwnerRole
} from './types/ownershipTypes';

// Import extracted components
import EstablishmentOwnerCard from './EstablishmentOwnerCard';
import {
  OwnershipRequestCard,
  OwnerManagementModal,
  getDefaultPermissions
} from './EstablishmentOwnersAdmin/index';

// Import debounce utility
import { debounce } from './utils/adminUtils';

interface EstablishmentOwnersAdminProps {
  onTabChange: (tab: string) => void;
}

const EstablishmentOwnersAdmin: React.FC<EstablishmentOwnersAdminProps> = ({ onTabChange }) => {
  const { t } = useTranslation();
  const dialog = useDialog();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
  const API_URL = import.meta.env.VITE_API_URL || '';

  // State Management
  const [viewMode, setViewMode] = useState<ViewMode>('owners');
  const [establishments, setEstablishments] = useState<AdminEstablishment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedEstablishment, setSelectedEstablishment] = useState<AdminEstablishment | null>(null);

  // Ownership Requests State
  const [ownershipRequests, setOwnershipRequests] = useState<OwnershipRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<OwnershipRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [establishmentOwners, setEstablishmentOwners] = useState<EstablishmentOwner[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchUserTerm, setSearchUserTerm] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [ownerRole, setOwnerRole] = useState<OwnerRole>('owner');
  const [customPermissions, setCustomPermissions] = useState<OwnerPermissions>({
    can_edit_info: true,
    can_edit_pricing: true,
    can_edit_photos: true,
    can_edit_employees: false,
    can_view_analytics: true
  });
  const [editingOwner, setEditingOwner] = useState<EstablishmentOwner | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Helper functions to trigger refresh
  const refreshEstablishments = () => setRefreshCounter(c => c + 1);

  // ============================================
  // Data Loading
  // ============================================

  useEffect(() => {
    const loadEstablishments = async () => {
      setIsLoading(true);
      try {
        let url = `${API_URL}/api/admin/establishments?status=approved`;

        if (filter === 'with_owners') {
          url += '&has_owners=true';
        } else if (filter === 'without_owners') {
          url += '&has_owners=false';
        }

        const response = await secureFetch(url);
        if (response.ok) {
          const data = await response.json();
          setEstablishments(data.establishments || []);
        }
      } catch (error) {
        logger.error('Failed to load establishments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const loadOwnershipRequests = async () => {
      setIsLoading(true);
      try {
        const response = await secureFetch(`${API_URL}/api/ownership-requests/admin/all?status=pending`);
        if (response.ok) {
          const data = await response.json();
          setOwnershipRequests(data.requests || []);
        }
      } catch (error) {
        logger.error('Failed to load ownership requests:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (viewMode === 'owners') {
      loadEstablishments();
    } else {
      loadOwnershipRequests();
    }
  }, [viewMode, filter, secureFetch, API_URL, refreshCounter]);

  // Load establishment owners when modal opens
  const loadEstablishmentOwners = async (establishmentId: string) => {
    try {
      const response = await secureFetch(`${API_URL}/api/admin/establishments/${establishmentId}/owners`);
      if (response.ok) {
        const data = await response.json();
        setEstablishmentOwners(data.owners || []);
      }
    } catch (error) {
      logger.error('Failed to load establishment owners:', error);
    }
  };

  // ============================================
  // User Search (Debounced)
  // ============================================

  const searchUsers = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSearchedUsers([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await secureFetch(
        `${API_URL}/api/admin/users/search?q=${encodeURIComponent(term)}&account_type=establishment_owner`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchedUsers(data.users || []);
      }
    } catch (error) {
      logger.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  }, [secureFetch, API_URL]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearchUsers = useCallback(
    debounce((term: string) => searchUsers(term), 300),
    [searchUsers]
  );

  const handleSearchChange = (term: string) => {
    setSearchUserTerm(term);
    if (term.length >= 2) {
      setIsSearching(true);
      debouncedSearchUsers(term);
    } else {
      setSearchedUsers([]);
      setIsSearching(false);
    }
  };

  // ============================================
  // Role & Permissions
  // ============================================

  const handleRoleChange = (role: OwnerRole) => {
    setOwnerRole(role);
    setCustomPermissions(getDefaultPermissions(role));
  };

  // ============================================
  // Owner Management Handlers
  // ============================================

  const handleAssignOwner = async () => {
    if (!selectedUser || !selectedEstablishment) return;

    setProcessingIds(prev => new Set(prev).add(selectedEstablishment.id));
    try {
      const response = await secureFetch(
        `${API_URL}/api/admin/establishments/${selectedEstablishment.id}/owners`,
        {
          method: 'POST',
          body: JSON.stringify({
            user_id: selectedUser.id,
            owner_role: ownerRole,
            permissions: customPermissions
          })
        }
      );

      if (response.ok) {
        // Reset form
        setShowAssignModal(false);
        setSelectedUser(null);
        setSearchUserTerm('');
        setSearchedUsers([]);
        // Reload establishments list to update counts
        refreshEstablishments();
        notification.success(t('admin.ownerAssignedSuccess', 'Owner assigned successfully'));
      } else {
        const errorData = await response.json();
        notification.error(errorData.error || t('admin.ownerAssignError', 'Failed to assign owner'));
      }
    } catch (error) {
      logger.error('Failed to assign owner:', error);
      notification.error(t('admin.ownerAssignError', 'Failed to assign owner'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedEstablishment.id);
        return newSet;
      });
    }
  };

  const handleRemoveOwner = async (establishmentId: string, userId: string) => {
    const confirmed = await dialog.confirm(
      t('admin.ownerConfirmRemove', 'Are you sure you want to remove this owner? They will lose access to manage this establishment.'),
      {
        variant: 'danger',
        confirmText: t('dialog.confirm', 'Confirm'),
        cancelText: t('dialog.cancel', 'Cancel')
      }
    );
    if (!confirmed) {
      return;
    }

    setProcessingIds(prev => new Set(prev).add(establishmentId));
    try {
      const response = await secureFetch(`${API_URL}/api/admin/establishments/${establishmentId}/owners/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Reload establishment owners
        await loadEstablishmentOwners(establishmentId);
        // Reload establishments list to update counts
        refreshEstablishments();
        notification.success(t('admin.ownerRemovedSuccess', 'Owner removed successfully'));
      } else {
        const errorData = await response.json();
        notification.error(errorData.error || t('admin.ownerRemoveError', 'Failed to remove owner'));
      }
    } catch (error) {
      logger.error('Failed to remove owner:', error);
      notification.error(t('admin.ownerRemoveError', 'Failed to remove owner'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(establishmentId);
        return newSet;
      });
    }
  };

  const handleUpdateOwnerPermissions = async () => {
    if (!editingOwner || !selectedEstablishment) return;

    setProcessingIds(prev => new Set(prev).add(selectedEstablishment.id));
    try {
      const response = await secureFetch(
        `${API_URL}/api/admin/establishments/${selectedEstablishment.id}/owners/${editingOwner.user_id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            owner_role: editingOwner.owner_role,
            permissions: editingOwner.permissions
          })
        }
      );

      if (response.ok) {
        // Reload establishment owners
        await loadEstablishmentOwners(selectedEstablishment.id);
        setEditingOwner(null);
        notification.success(t('admin.ownerPermissionsUpdated', 'Permissions updated successfully'));
      } else {
        const errorData = await response.json();
        notification.error(errorData.error || t('admin.ownerPermissionsUpdateError', 'Failed to update permissions'));
      }
    } catch (error) {
      logger.error('Failed to update permissions:', error);
      notification.error(t('admin.ownerPermissionsUpdateError', 'Failed to update permissions'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedEstablishment.id);
        return newSet;
      });
    }
  };

  const openEstablishmentModal = async (establishment: AdminEstablishment) => {
    setSelectedEstablishment(establishment);
    await loadEstablishmentOwners(establishment.id);
  };

  // ============================================
  // Ownership Request Handlers
  // ============================================

  const handleApproveRequest = async (requestId: string) => {
    if (!adminNotes.trim()) {
      notification.error(t('admin.adminNotesRequired', 'Admin notes are required'));
      return;
    }

    setProcessingIds(prev => new Set(prev).add(requestId));
    try {
      const response = await secureFetch(`${API_URL}/api/ownership-requests/${requestId}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_notes: adminNotes })
      });

      if (response.ok) {
        refreshEstablishments();
        setSelectedRequest(null);
        setAdminNotes('');
        notification.success(t('admin.requestApproved', 'Ownership request approved'));
      } else {
        const errorData = await response.json();
        notification.error(errorData.error || t('admin.requestApproveError', 'Failed to approve request'));
      }
    } catch (error) {
      logger.error('Failed to approve request:', error);
      notification.error(t('admin.requestApproveError', 'Failed to approve request'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!adminNotes.trim()) {
      notification.error(t('admin.adminNotesRequired', 'Admin notes are required'));
      return;
    }

    setProcessingIds(prev => new Set(prev).add(requestId));
    try {
      const response = await secureFetch(`${API_URL}/api/ownership-requests/${requestId}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_notes: adminNotes })
      });

      if (response.ok) {
        refreshEstablishments();
        setSelectedRequest(null);
        setAdminNotes('');
        notification.success(t('admin.requestRejected', 'Ownership request rejected'));
      } else {
        const errorData = await response.json();
        notification.error(errorData.error || t('admin.requestRejectError', 'Failed to reject request'));
      }
    } catch (error) {
      logger.error('Failed to reject request:', error);
      notification.error(t('admin.requestRejectError', 'Failed to reject request'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // ============================================
  // Access Control
  // ============================================

  if (!user || user.role !== 'admin') {
    return (
      <div className="command-content-section" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="cmd-card cmd-card--alert" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 className="cmd-card__title" style={{ color: 'var(--color-gold)' }}>
            <Ban size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {t('admin.accessDenied')}
          </h2>
          <p className="cmd-card__description">
            {t('admin.accessDeniedArea')}
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="command-content-section">
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb
        currentSection="Establishment Owners"
        onBackToDashboard={() => onTabChange('overview')}
        icon={<Building2 size={16} />}
      />

      {/* Header */}
      <div className="cmd-section-header">
        <h1 className="cmd-section-title">
          <Building2 size={28} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Establishment Owners Management
        </h1>
        <p className="cmd-section-subtitle">
          {viewMode === 'owners'
            ? 'Assign and manage establishment owners to give them control over their listings'
            : 'Review pending ownership requests from establishment owners'}
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="cmd-filters cmd-filters--toggle" style={{ marginBottom: '24px' }}>
        <div className="cmd-filter-pills" style={{ display: 'flex', gap: '12px', flex: 1 }}>
          <button
            onClick={() => setViewMode('owners')}
            className={`cmd-filter cmd-filter--lg ${viewMode === 'owners' ? 'cmd-filter--active' : ''}`}
            style={{ flex: 1 }}
          >
            <Users size={16} />
            <span>Manage Owners</span>
          </button>
          <button
            onClick={() => setViewMode('requests')}
            className={`cmd-filter cmd-filter--lg ${viewMode === 'requests' ? 'cmd-filter--active cmd-filter--gold' : ''}`}
            style={{ flex: 1, position: 'relative' }}
          >
            <ClipboardList size={16} />
            <span>Pending Requests</span>
            {ownershipRequests.length > 0 && viewMode !== 'requests' && (
              <span className="cmd-filter__badge">{ownershipRequests.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Tabs - Only shown in owners mode */}
      {viewMode === 'owners' && (
        <div className="cmd-filters" style={{ marginBottom: '24px' }}>
          <div className="cmd-filter-pills">
            {([
              { key: 'all', label: 'All Establishments', icon: <ClipboardList size={14} /> },
              { key: 'with_owners', label: 'With Owners', icon: <Users size={14} /> },
              { key: 'without_owners', label: 'Without Owners', icon: <MailX size={14} /> }
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`cmd-filter ${filter === tab.key ? 'cmd-filter--active' : ''}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Establishments List (Owners Mode) */}
      {viewMode === 'owners' && (
        <>
          {isLoading ? (
            <SkeletonTable variant="card-grid" rows={6} showHeader={false} />
          ) : establishments.length === 0 ? (
            <div className="cmd-card cmd-card--empty" style={{ textAlign: 'center', padding: '40px' }}>
              <h3 className="cmd-card__title" style={{ color: 'var(--color-gold)', marginBottom: '10px' }}>
                <MailX size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                No establishments found
              </h3>
              <p className="cmd-card__description">
                {filter === 'with_owners' && 'No establishments have assigned owners yet.'}
                {filter === 'without_owners' && 'All establishments have assigned owners!'}
                {filter === 'all' && 'No approved establishments found in the database.'}
              </p>
            </div>
          ) : (
            <div className="aec-grid">
              {establishments.map((establishment) => (
                <EstablishmentOwnerCard
                  key={establishment.id}
                  establishment={establishment}
                  onClick={() => openEstablishmentModal(establishment)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Pending Requests List (Requests Mode) */}
      {viewMode === 'requests' && (
        <>
          {isLoading ? (
            <SkeletonTable variant="list" rows={4} showHeader={false} />
          ) : ownershipRequests.length === 0 ? (
            <div className="cmd-card cmd-card--empty" style={{ textAlign: 'center', padding: '40px' }}>
              <h3 className="cmd-card__title" style={{ color: 'var(--color-gold)', marginBottom: '10px' }}>
                <CheckCircle size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                No Pending Ownership Requests
              </h3>
              <p className="cmd-card__description">
                All ownership requests have been reviewed. Check back later for new submissions.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              {ownershipRequests.map((request) => (
                <OwnershipRequestCard
                  key={request.id}
                  request={request}
                  isProcessing={processingIds.has(request.id)}
                  isSelected={selectedRequest?.id === request.id}
                  adminNotes={adminNotes}
                  onApprove={handleApproveRequest}
                  onReject={handleRejectRequest}
                  onSelect={setSelectedRequest}
                  onAdminNotesChange={setAdminNotes}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Establishment Owners Detail Modal */}
      {selectedEstablishment && (
        <OwnerManagementModal
          establishment={selectedEstablishment}
          owners={establishmentOwners}
          processingIds={processingIds}
          onClose={() => {
            setSelectedEstablishment(null);
            setEstablishmentOwners([]);
          }}
          showAssignModal={showAssignModal}
          onShowAssignModal={setShowAssignModal}
          searchUserTerm={searchUserTerm}
          onSearchUserTermChange={handleSearchChange}
          isSearching={isSearching}
          searchedUsers={searchedUsers}
          selectedUser={selectedUser}
          onSelectUser={(user) => {
            setSelectedUser(user);
            if (user) setSearchedUsers([]);
          }}
          ownerRole={ownerRole}
          onOwnerRoleChange={handleRoleChange}
          customPermissions={customPermissions}
          onCustomPermissionsChange={setCustomPermissions}
          onAssignOwner={handleAssignOwner}
          editingOwner={editingOwner}
          onEditingOwnerChange={setEditingOwner}
          onUpdateOwnerPermissions={handleUpdateOwnerPermissions}
          onRemoveOwner={handleRemoveOwner}
        />
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EstablishmentOwnersAdmin;
