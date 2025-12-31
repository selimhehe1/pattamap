import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useDialog } from '../../hooks/useDialog';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import LoadingFallback from '../Common/LoadingFallback';
import { logger } from '../../utils/logger';
import toast from '../../utils/toast';
import {
  Crown,
  Key,
  CheckCircle,
  XCircle,
  Ban,
  ClipboardList,
  Users,
  MailX,
  Building2,
  MapPin,
  Eye,
  Plus,
  User,
  Check,
  X,
  Loader2,
  Pencil,
  Trash2,
  MessageSquare,
  Paperclip,
  FileText,
  AlertTriangle,
  Info,
  FileEdit,
  DollarSign,
  Camera,
  BarChart3
} from 'lucide-react';

// Import extracted types and utilities
import {
  EstablishmentOwner,
  AdminEstablishment,
  AdminUser,
  OwnershipRequest,
  OwnerPermissions,
  ViewMode,
  FilterMode,
  OwnerRole
} from './types/ownershipTypes';
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
  const refreshOwnershipRequests = () => setRefreshCounter(c => c + 1);

  // Load data based on view mode
  useEffect(() => {
    const loadEstablishments = async () => {
      setIsLoading(true);
      try {
        const response = await secureFetch(`${API_URL}/api/admin/establishments?status=approved`);

        if (response.ok) {
          const data = await response.json();
          const estabs = data.establishments || [];

          // Load owners count for each establishment
          let estabsWithCounts = await Promise.all(
            estabs.map(async (est: AdminEstablishment) => {
              try {
                const ownersResponse = await secureFetch(`${API_URL}/api/admin/establishments/${est.id}/owners`);
                if (ownersResponse.ok) {
                  const ownersData = await ownersResponse.json();
                  return {
                    ...est,
                    ownersCount: ownersData.owners?.length || 0
                  };
                }
              } catch (error) {
                logger.error(`Failed to load owners for establishment ${est.id}:`, error);
              }
              return { ...est, ownersCount: 0 };
            })
          );

          // Apply filter
          if (filter === 'with_owners') {
            estabsWithCounts = estabsWithCounts.filter((e: AdminEstablishment) => (e.ownersCount || 0) > 0);
          } else if (filter === 'without_owners') {
            estabsWithCounts = estabsWithCounts.filter((e: AdminEstablishment) => (e.ownersCount || 0) === 0);
          }

          setEstablishments(estabsWithCounts);
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

  // Approve ownership request
  const handleApproveRequest = async (requestId: string) => {
    if (!adminNotes.trim()) {
      toast.warning(t('admin.ownershipPleaseProvideNotes', 'Please provide admin notes for approval'));
      return;
    }

    setProcessingIds(prev => new Set(prev).add(requestId));
    try {
      const response = await secureFetch(
        `${API_URL}/api/ownership-requests/${requestId}/approve`,
        {
          method: 'PATCH',
          body: JSON.stringify({ admin_notes: adminNotes })
        }
      );

      if (response.ok) {
        toast.success(t('admin.ownershipApprovedSuccess', 'Ownership request approved successfully!'));
        setSelectedRequest(null);
        setAdminNotes('');
        refreshOwnershipRequests();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t('admin.ownershipApprovedError', 'Failed to approve request'));
      }
    } catch (error) {
      logger.error('Failed to approve request:', error);
      toast.error(t('admin.ownershipApprovedError', 'Failed to approve request'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Reject ownership request
  const handleRejectRequest = async (requestId: string) => {
    if (!adminNotes.trim()) {
      toast.warning(t('admin.ownershipProvideRejectionReason', 'Please provide a reason for rejection in the admin notes'));
      return;
    }

    const confirmed = await dialog.confirm(
      t('admin.ownershipConfirmReject', 'Are you sure you want to reject this ownership request?'),
      {
        variant: 'danger',
        confirmText: t('dialog.confirm', 'Confirm'),
        cancelText: t('dialog.cancel', 'Cancel')
      }
    );
    if (!confirmed) {
      return;
    }

    setProcessingIds(prev => new Set(prev).add(requestId));
    try {
      const response = await secureFetch(
        `${API_URL}/api/ownership-requests/${requestId}/reject`,
        {
          method: 'PATCH',
          body: JSON.stringify({ admin_notes: adminNotes })
        }
      );

      if (response.ok) {
        toast.success(t('admin.ownershipRejected', 'Ownership request rejected'));
        setSelectedRequest(null);
        setAdminNotes('');
        refreshOwnershipRequests();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t('admin.ownershipRejectError', 'Failed to reject request'));
      }
    } catch (error) {
      logger.error('Failed to reject request:', error);
      toast.error(t('admin.ownershipRejectError', 'Failed to reject request'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // 🆕 Debounced search function with loading state
  const performSearch = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSearchedUsers([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await secureFetch(`${API_URL}/api/admin/users?search=${term}`);

      if (response.ok) {
        const data = await response.json();
        // Filter only establishment_owner accounts
        const ownerUsers = (data.users || []).filter((u: AdminUser) => u.account_type === 'establishment_owner');
        setSearchedUsers(ownerUsers);
      }
    } catch (error) {
      logger.error('Failed to search users:', error);
      setSearchedUsers([]);
    } finally {
      setIsSearching(false);
    }
  }, [secureFetch, API_URL]);

  // Create debounced version of search (500ms delay)
  const debouncedSearch = useMemo(
    () => debounce(performSearch, 500),
    [performSearch]
  );

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchUserTerm(value);
    if (value.length >= 2) {
      setIsSearching(true); // Show loading immediately
    }
    debouncedSearch(value);
  }, [debouncedSearch]);

  // 🆕 Handle role change with automatic permission presets
  const handleRoleChange = useCallback((newRole: 'owner' | 'manager') => {
    setOwnerRole(newRole);

    if (newRole === 'owner') {
      // Owner preset: all enabled except employees (needs extra vetting)
      setCustomPermissions({
        can_edit_info: true,
        can_edit_pricing: true,
        can_edit_photos: true,
        can_edit_employees: false,
        can_view_analytics: true
      });
    } else {
      // Manager preset: limited (no pricing, no employees)
      setCustomPermissions({
        can_edit_info: true,
        can_edit_pricing: false,
        can_edit_photos: true,
        can_edit_employees: false,
        can_view_analytics: true
      });
    }
  }, []);

  const handleAssignOwner = async () => {
    if (!selectedEstablishment || !selectedUser) return;

    setProcessingIds(prev => new Set(prev).add(selectedEstablishment.id));
    try {
      const response = await secureFetch(`${API_URL}/api/admin/establishments/${selectedEstablishment.id}/owners`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: selectedUser.id,
          owner_role: ownerRole,
          permissions: customPermissions
        })
      });

      if (response.ok) {
        // Reload establishment owners
        await loadEstablishmentOwners(selectedEstablishment.id);
        // Reset form
        setShowAssignModal(false);
        setSelectedUser(null);
        setSearchUserTerm('');
        setSearchedUsers([]);
        // Reload establishments list to update counts
        refreshEstablishments();
        toast.success(t('admin.ownerAssignedSuccess', 'Owner assigned successfully'));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t('admin.ownerAssignError', 'Failed to assign owner'));
      }
    } catch (error) {
      logger.error('Failed to assign owner:', error);
      toast.error(t('admin.ownerAssignError', 'Failed to assign owner'));
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
        toast.success(t('admin.ownerRemovedSuccess', 'Owner removed successfully'));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t('admin.ownerRemoveError', 'Failed to remove owner'));
      }
    } catch (error) {
      logger.error('Failed to remove owner:', error);
      toast.error(t('admin.ownerRemoveError', 'Failed to remove owner'));
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
        toast.success(t('admin.ownerPermissionsUpdated', 'Permissions updated successfully'));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t('admin.ownerPermissionsUpdateError', 'Failed to update permissions'));
      }
    } catch (error) {
      logger.error('Failed to update permissions:', error);
      toast.error(t('admin.ownerPermissionsUpdateError', 'Failed to update permissions'));
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

  // Utility functions
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
    return role === 'owner' ? '#FFD700' : '#00E5FF';
  };

  const getRoleIcon = (role: string) => {
    return role === 'owner' ? <Crown size={12} style={{ verticalAlign: 'middle' }} /> : <Key size={12} style={{ verticalAlign: 'middle' }} />;
  };

  const getPermissionIcon = (perm: boolean) => {
    return perm ? <CheckCircle size={12} style={{ verticalAlign: 'middle' }} /> : <XCircle size={12} style={{ verticalAlign: 'middle' }} />;
  };

  // 🆕 Permission descriptions for tooltips
  const permissionDescriptions: Record<string, string> = {
    can_edit_info: 'Name, address, description, opening hours, social media links',
    can_edit_pricing: 'Ladydrink, barfine, room prices (sensitive data)',
    can_edit_photos: 'Upload and manage logo & venue photos via Cloudinary',
    can_edit_employees: 'Employee roster management (requires extra admin vetting)',
    can_view_analytics: 'View performance metrics and statistics (read-only access)'
  };

  const getPermissionLabel = (key: string): React.ReactNode => {
    const labels: Record<string, React.ReactNode> = {
      can_edit_info: <><FileEdit size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Can Edit Info</>,
      can_edit_pricing: <><DollarSign size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Can Edit Pricing</>,
      can_edit_photos: <><Camera size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Can Edit Photos</>,
      can_edit_employees: <><Users size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Can Edit Employees</>,
      can_view_analytics: <><BarChart3 size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Can View Analytics</>
    };
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Permission check
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
            {[
              { key: 'all', label: 'All Establishments', icon: <ClipboardList size={14} /> },
              { key: 'with_owners', label: 'With Owners', icon: <Users size={14} /> },
              { key: 'without_owners', label: 'Without Owners', icon: <MailX size={14} /> }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`cmd-filter ${filter === tab.key ? 'cmd-filter--active' : ''}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Establishments List */}
      {viewMode === 'owners' && (
        <>
          {isLoading ? (
            <LoadingFallback message="Loading establishments..." variant="inline" />
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px'
        }}>
          {establishments.map((establishment) => (
            <div
              key={establishment.id}
              style={{
                background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
                borderRadius: '20px',
                border: '2px solid rgba(193, 154, 107,0.3)',
                padding: '20px',
                position: 'relative',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onClick={() => openEstablishmentModal(establishment)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(193, 154, 107,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Owners Count Badge */}
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                padding: '6px 12px',
                borderRadius: '15px',
                background: (establishment.ownersCount || 0) > 0 ? 'rgba(0,255,127,0.2)' : 'rgba(255,71,87,0.2)',
                border: (establishment.ownersCount || 0) > 0 ? '2px solid #00FF7F' : '2px solid #FF4757',
                color: (establishment.ownersCount || 0) > 0 ? '#00FF7F' : '#FF4757',
                fontSize: '11px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Users size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                {establishment.ownersCount || 0} Owner{(establishment.ownersCount || 0) !== 1 ? 's' : ''}
              </div>

              {/* Establishment Icon */}
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'linear-gradient(45deg, #C19A6B, #FFD700)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '24px',
                marginBottom: '15px'
              }}>
                <Building2 size={24} />
              </div>

              {/* Establishment Info */}
              <div style={{ marginBottom: '15px', paddingRight: '80px' }}>
                <h3 style={{
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  margin: '0 0 5px 0'
                }}>
                  {establishment.name}
                </h3>

                <div style={{
                  color: '#cccccc',
                  fontSize: '14px',
                  marginBottom: '10px'
                }}>
                  {establishment.address}
                </div>

                {establishment.zone && (
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    background: 'rgba(0,229,255,0.2)',
                    border: '1px solid #00E5FF',
                    color: '#00E5FF',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    <MapPin size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    {establishment.zone}
                  </div>
                )}
              </div>

              {/* View Details Button */}
              <div style={{
                paddingTop: '15px',
                borderTop: '1px solid rgba(193, 154, 107,0.3)',
                textAlign: 'center'
              }}>
                <span style={{
                  color: '#C19A6B',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  <Eye size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Click to manage owners
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* Pending Requests List */}
      {viewMode === 'requests' && (
        <>
          {isLoading ? (
            <LoadingFallback message="Loading ownership requests..." variant="inline" />
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
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '25px'
            }}>
              {ownershipRequests.map((request) => (
                <div
                  key={request.id}
                  style={{
                    background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
                    borderRadius: '20px',
                    border: '2px solid rgba(255,215,0,0.3)',
                    padding: '25px',
                    position: 'relative'
                  }}
                >
                  {/* Request Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '20px',
                    gap: '20px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        color: '#FFD700',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        margin: '0 0 10px 0'
                      }}>
                        <Building2 size={24} /> {request.establishment.name}
                      </h3>
                      <p style={{
                        color: '#cccccc',
                        fontSize: '14px',
                        margin: '0 0 10px 0'
                      }}>
                        {request.establishment.address}
                      </p>
                      {request.establishment.zone && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '10px',
                          background: 'rgba(0,229,255,0.2)',
                          border: '1px solid #00E5FF',
                          color: '#00E5FF',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          <MapPin size={12} /> {request.establishment.zone}
                        </span>
                      )}
                    </div>

                    {request.establishment.logo_url && (
                      <img
                        src={request.establishment.logo_url}
                        alt={request.establishment.name}
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '12px',
                          objectFit: 'cover',
                          border: '2px solid rgba(255,215,0,0.3)'
                        }}
                      />
                    )}
                  </div>

                  {/* User Info */}
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    padding: '15px',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{
                      color: '#C19A6B',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      margin: '0 0 10px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      <User size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Requester Information
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '15px'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255,255,255,0.5)',
                          textTransform: 'uppercase',
                          fontWeight: 'bold',
                          marginBottom: '5px'
                        }}>
                          Name
                        </div>
                        <div style={{ color: '#ffffff', fontWeight: 'bold' }}>
                          {request.user.pseudonym}
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255,255,255,0.5)',
                          textTransform: 'uppercase',
                          fontWeight: 'bold',
                          marginBottom: '5px'
                        }}>
                          Email
                        </div>
                        <div style={{ color: '#ffffff' }}>
                          {request.user.email}
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: '12px',
                          color: 'rgba(255,255,255,0.5)',
                          textTransform: 'uppercase',
                          fontWeight: 'bold',
                          marginBottom: '5px'
                        }}>
                          Submitted
                        </div>
                        <div style={{ color: '#ffffff' }}>
                          {formatDate(request.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Request Message */}
                  {request.request_message && (
                    <div style={{
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '12px',
                      padding: '15px',
                      marginBottom: '20px',
                      borderLeft: '3px solid rgba(0,229,255,0.6)'
                    }}>
                      <h4 style={{
                        color: '#00E5FF',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        margin: '0 0 10px 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        <MessageSquare size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        Request Message
                      </h4>
                      <p style={{
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '14px',
                        margin: 0,
                        lineHeight: 1.6
                      }}>
                        {request.request_message}
                      </p>
                    </div>
                  )}

                  {/* Verification Code */}
                  {request.verification_code && (
                    <div style={{
                      background: 'rgba(255,215,0,0.1)',
                      borderRadius: '12px',
                      padding: '15px',
                      marginBottom: '20px',
                      border: '2px solid rgba(255,215,0,0.3)'
                    }}>
                      <h4 style={{
                        color: '#FFD700',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        margin: '0 0 10px 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        <Key size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        Verification Code
                      </h4>
                      <div style={{
                        color: '#FFD700',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        fontFamily: 'monospace'
                      }}>
                        {request.verification_code}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  {request.documents_urls && request.documents_urls.length > 0 && (
                    <div style={{
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '12px',
                      padding: '15px',
                      marginBottom: '20px'
                    }}>
                      <h4 style={{
                        color: '#C19A6B',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        margin: '0 0 15px 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        <Paperclip size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        Submitted Documents ({request.documents_urls.length})
                      </h4>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                        gap: '15px'
                      }}>
                        {request.documents_urls.map((url, index) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '12px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '2px solid rgba(193, 154, 107,0.2)',
                              borderRadius: '10px',
                              textDecoration: 'none',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(193, 154, 107,0.1)';
                              e.currentTarget.style.borderColor = '#C19A6B';
                              e.currentTarget.style.transform = 'translateY(-3px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                              e.currentTarget.style.borderColor = 'rgba(193, 154, 107,0.2)';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            <div style={{
                              width: '100%',
                              height: '100px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(255,255,255,0.05)',
                              borderRadius: '8px',
                              overflow: 'hidden'
                            }}>
                              {url.toLowerCase().endsWith('.pdf') ? (
                                <FileText size={32} />
                              ) : (
                                <img src={url} alt={`Document ${index + 1}`} style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }} />
                              )}
                            </div>
                            <span style={{
                              fontSize: '12px',
                              color: 'rgba(255,255,255,0.7)',
                              fontWeight: 'bold',
                              textAlign: 'center'
                            }}>
                              Document {index + 1}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Review Form */}
                  <div style={{
                    background: 'rgba(0,0,0,0.5)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '2px solid rgba(255,215,0,0.3)'
                  }}>
                    <h4 style={{
                      color: '#FFD700',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      margin: '0 0 15px 0'
                    }}>
                      <Pencil size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      Admin Review
                    </h4>

                    <textarea
                      placeholder="Enter admin notes (reason for approval/rejection)..."
                      value={selectedRequest?.id === request.id ? adminNotes : ''}
                      onChange={(e) => {
                        setSelectedRequest(request);
                        setAdminNotes(e.target.value);
                      }}
                      onFocus={() => setSelectedRequest(request)}
                      style={{
                        width: '100%',
                        minHeight: '100px',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '2px solid rgba(255,215,0,0.3)',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        marginBottom: '15px'
                      }}
                    />

                    <div style={{
                      display: 'flex',
                      gap: '12px'
                    }}>
                      <button
                        onClick={() => handleApproveRequest(request.id)}
                        disabled={processingIds.has(request.id) || (selectedRequest?.id === request.id && !adminNotes.trim())}
                        style={{
                          flex: 1,
                          padding: '12px',
                          background: (processingIds.has(request.id) || (selectedRequest?.id === request.id && !adminNotes.trim()))
                            ? 'linear-gradient(45deg, #666666, #888888)'
                            : 'linear-gradient(45deg, #00FF7F, #00CC65)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          cursor: (processingIds.has(request.id) || (selectedRequest?.id === request.id && !adminNotes.trim())) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.3s ease',
                          opacity: (processingIds.has(request.id) || (selectedRequest?.id === request.id && !adminNotes.trim())) ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!processingIds.has(request.id) && !(selectedRequest?.id === request.id && !adminNotes.trim())) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,255,127,0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {processingIds.has(request.id) ? <><Loader2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Approving...</> : <><CheckCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Approve & Assign Ownership</>}
                      </button>

                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={processingIds.has(request.id) || (selectedRequest?.id === request.id && !adminNotes.trim())}
                        style={{
                          flex: 1,
                          padding: '12px',
                          background: (processingIds.has(request.id) || (selectedRequest?.id === request.id && !adminNotes.trim()))
                            ? 'linear-gradient(45deg, #666666, #888888)'
                            : 'linear-gradient(45deg, #FF4757, #FF3742)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          cursor: (processingIds.has(request.id) || (selectedRequest?.id === request.id && !adminNotes.trim())) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.3s ease',
                          opacity: (processingIds.has(request.id) || (selectedRequest?.id === request.id && !adminNotes.trim())) ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!processingIds.has(request.id) && !(selectedRequest?.id === request.id && !adminNotes.trim())) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 5px 15px rgba(255,71,87,0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {processingIds.has(request.id) ? <><Loader2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Rejecting...</> : <><XCircle size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Reject Request</>}
                      </button>
                    </div>

                    <p style={{
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.5)',
                      marginTop: '12px',
                      marginBottom: 0,
                      textAlign: 'center'
                    }}>
                      <AlertTriangle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      Admin notes are required before approving or rejecting
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Establishment Owners Detail Modal */}
      {selectedEstablishment && (
        <div className="cmd-modal-overlay" role="dialog" aria-modal="true">
          <div className="cmd-modal cmd-modal--gold" style={{ maxWidth: '800px' }}>
            {/* Close Button */}
            <button
              onClick={() => {
                setSelectedEstablishment(null);
                setEstablishmentOwners([]);
                setShowAssignModal(false);
                setEditingOwner(null);
              }}
              className="cmd-modal__close"
            >
              ×
            </button>

            <h2 className="cmd-modal__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={24} /> {selectedEstablishment.name}
            </h2>
            <p className="cmd-modal__description" style={{ marginBottom: '24px' }}>
              Manage owners who can control this establishment
            </p>

            {/* Assign New Owner Button */}
            {!showAssignModal && !editingOwner && (
              <button
                onClick={() => setShowAssignModal(true)}
                style={{
                  width: '100%',
                  padding: '15px',
                  background: 'linear-gradient(45deg, #00FF7F, #00CC65)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '20px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,255,127,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Plus size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Assign New Owner
              </button>
            )}

            {/* Assign Owner Form */}
            {showAssignModal && !editingOwner && (
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '15px',
                border: '2px solid rgba(193, 154, 107,0.3)',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  color: '#FFD700',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  margin: '0 0 15px 0'
                }}>
                  <User size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Assign New Owner
                </h3>

                {/* Search User */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    color: '#cccccc',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'block',
                    marginBottom: '5px'
                  }}>
                    Search User (must have account_type="establishment_owner")
                  </label>
                  <input
                    type="text"
                    placeholder="Search by pseudonym or email... (min 2 chars)"
                    value={searchUserTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: '2px solid rgba(193, 154, 107,0.3)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#ffffff',
                      fontSize: '14px'
                    }}
                  />

                  {/* Loading Indicator */}
                  {isSearching && (
                    <div style={{
                      marginTop: '10px',
                      padding: '20px',
                      textAlign: 'center',
                      background: 'rgba(0,0,0,0.5)',
                      borderRadius: '10px',
                      border: '1px solid rgba(0,229,255,0.3)'
                    }}>
                      <div style={{
                        display: 'inline-block',
                        width: '20px',
                        height: '20px',
                        border: '3px solid rgba(0,229,255,0.3)',
                        borderTop: '3px solid #00E5FF',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#00E5FF' }}>
                        Searching establishment owners...
                      </div>
                    </div>
                  )}

                  {/* No Results Message */}
                  {!isSearching && searchUserTerm.length >= 2 && searchedUsers.length === 0 && (
                    <div style={{
                      marginTop: '10px',
                      padding: '20px',
                      textAlign: 'center',
                      background: 'rgba(0,0,0,0.5)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,71,87,0.3)'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}><MailX size={24} /></div>
                      <div style={{ fontSize: '12px', color: '#888888' }}>
                        No establishment owners found matching "<span style={{ color: '#C19A6B' }}>{searchUserTerm}</span>"
                      </div>
                    </div>
                  )}

                  {/* Minimum Characters Message */}
                  {searchUserTerm.length > 0 && searchUserTerm.length < 2 && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px',
                      textAlign: 'center',
                      background: 'rgba(255,215,0,0.1)',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,215,0,0.3)',
                      fontSize: '11px',
                      color: '#FFD700'
                    }}>
                      <Info size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      Type at least 2 characters to search
                    </div>
                  )}

                  {/* Search Results */}
                  {!isSearching && searchedUsers.length > 0 && (
                    <div style={{
                      marginTop: '10px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      background: 'rgba(0,0,0,0.5)',
                      borderRadius: '10px',
                      border: '1px solid rgba(193, 154, 107,0.3)'
                    }}>
                      {searchedUsers.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => {
                            setSelectedUser(u);
                            setSearchedUsers([]);
                          }}
                          style={{
                            padding: '10px',
                            borderBottom: '1px solid rgba(193, 154, 107,0.1)',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(193, 154, 107,0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ color: '#ffffff', fontWeight: 'bold' }}>{u.pseudonym}</div>
                          <div style={{ color: '#cccccc', fontSize: '12px' }}>{u.email}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selected User */}
                  {selectedUser && (
                    <div style={{
                      marginTop: '10px',
                      padding: '10px',
                      borderRadius: '10px',
                      background: 'rgba(255,215,0,0.1)',
                      border: '2px solid #FFD700'
                    }}>
                      <div style={{ color: '#FFD700', fontWeight: 'bold' }}><Check size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Selected: {selectedUser.pseudonym}</div>
                      <div style={{ color: '#cccccc', fontSize: '12px' }}>{selectedUser.email}</div>
                    </div>
                  )}
                </div>

                {/* Role Selection */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    color: '#cccccc',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'block',
                    marginBottom: '5px'
                  }}>
                    Owner Role
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleRoleChange('owner')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: ownerRole === 'owner' ? 'rgba(255,215,0,0.3)' : 'rgba(0,0,0,0.3)',
                        color: ownerRole === 'owner' ? '#FFD700' : '#ffffff',
                        border: ownerRole === 'owner' ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      <Crown size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Owner (Full Control)
                    </button>
                    <button
                      onClick={() => handleRoleChange('manager')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: ownerRole === 'manager' ? 'rgba(0,229,255,0.3)' : 'rgba(0,0,0,0.3)',
                        color: ownerRole === 'manager' ? '#00E5FF' : '#ffffff',
                        border: ownerRole === 'manager' ? '2px solid #00E5FF' : '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      <Key size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Manager (Limited)
                    </button>
                  </div>

                  {/* 🆕 Role Explanation Info Box */}
                  <div style={{
                    background: 'rgba(0,229,255,0.1)',
                    border: '1px solid rgba(0,229,255,0.3)',
                    borderRadius: '10px',
                    padding: '12px',
                    marginTop: '10px',
                    fontSize: '11px',
                    color: '#cccccc'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#00E5FF', fontSize: '12px' }}>
                      <Info size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Role Differences:
                    </div>
                    <div style={{ marginBottom: '6px', paddingLeft: '4px' }}>
                      <span style={{ color: '#FFD700', fontWeight: 'bold' }}><Crown size={12} style={{ marginRight: '2px', verticalAlign: 'middle' }} />Owner:</span>
                      <span style={{ color: '#aaaaaa' }}> Full control - Info, Pricing, Photos, Analytics</span>
                    </div>
                    <div style={{ paddingLeft: '4px' }}>
                      <span style={{ color: '#00E5FF', fontWeight: 'bold' }}><Key size={12} style={{ marginRight: '2px', verticalAlign: 'middle' }} />Manager:</span>
                      <span style={{ color: '#aaaaaa' }}> Limited - Info, Photos, Analytics only (no pricing)</span>
                    </div>
                    <div style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(0,229,255,0.2)',
                      fontSize: '10px',
                      color: '#888888'
                    }}>
                      Tip: Permissions below are auto-adjusted based on role. You can customize them after.
                    </div>
                  </div>
                </div>

                {/* Permissions Checkboxes */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    color: '#cccccc',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'block',
                    marginBottom: '10px'
                  }}>
                    Permissions (hover <Info size={12} style={{ verticalAlign: 'middle' }} /> for details)
                  </label>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {Object.entries(customPermissions).map(([key, value]) => (
                      <label
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          background: 'rgba(0,0,0,0.3)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setCustomPermissions(prev => ({ ...prev, [key]: e.target.checked }))}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ color: '#ffffff', fontSize: '13px', flex: 1 }}>
                          {getPermissionLabel(key)}
                        </span>
                        <span
                          style={{
                            marginLeft: '4px',
                            cursor: 'help',
                            color: '#00E5FF',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                          title={permissionDescriptions[key]}
                        >
                          <Info size={12} />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Form Actions */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedUser(null);
                      setSearchUserTerm('');
                      setSearchedUsers([]);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'linear-gradient(45deg, #666666, #888888)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    <X size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Cancel
                  </button>
                  <button
                    onClick={handleAssignOwner}
                    disabled={!selectedUser || processingIds.has(selectedEstablishment.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: (!selectedUser || processingIds.has(selectedEstablishment.id))
                        ? 'linear-gradient(45deg, #666666, #888888)'
                        : 'linear-gradient(45deg, #00FF7F, #00CC65)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: (!selectedUser || processingIds.has(selectedEstablishment.id)) ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      opacity: (!selectedUser || processingIds.has(selectedEstablishment.id)) ? 0.5 : 1
                    }}
                  >
                    {processingIds.has(selectedEstablishment.id) ? <><Loader2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Assigning...</> : <><Check size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Assign Owner</>}
                  </button>
                </div>
              </div>
            )}

            {/* Edit Permissions Form */}
            {editingOwner && (
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '15px',
                border: '2px solid rgba(255,215,0,0.3)',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  color: '#FFD700',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  margin: '0 0 15px 0'
                }}>
                  <Pencil size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Edit Permissions: {editingOwner.user?.pseudonym}
                </h3>

                {/* Role Selection */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    color: '#cccccc',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'block',
                    marginBottom: '5px'
                  }}>
                    Owner Role
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setEditingOwner(prev => prev ? { ...prev, owner_role: 'owner' } : null)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: editingOwner.owner_role === 'owner' ? 'rgba(255,215,0,0.3)' : 'rgba(0,0,0,0.3)',
                        color: editingOwner.owner_role === 'owner' ? '#FFD700' : '#ffffff',
                        border: editingOwner.owner_role === 'owner' ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      <Crown size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Owner
                    </button>
                    <button
                      onClick={() => setEditingOwner(prev => prev ? { ...prev, owner_role: 'manager' } : null)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: editingOwner.owner_role === 'manager' ? 'rgba(0,229,255,0.3)' : 'rgba(0,0,0,0.3)',
                        color: editingOwner.owner_role === 'manager' ? '#00E5FF' : '#ffffff',
                        border: editingOwner.owner_role === 'manager' ? '2px solid #00E5FF' : '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                      <Key size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Manager
                    </button>
                  </div>
                </div>

                {/* Permissions Checkboxes */}
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    color: '#cccccc',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'block',
                    marginBottom: '10px'
                  }}>
                    Permissions (hover <Info size={12} style={{ verticalAlign: 'middle' }} /> for details)
                  </label>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {Object.entries(editingOwner.permissions).map(([key, value]) => (
                      <label
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          background: 'rgba(0,0,0,0.3)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setEditingOwner(prev =>
                            prev ? {
                              ...prev,
                              permissions: { ...prev.permissions, [key]: e.target.checked }
                            } : null
                          )}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ color: '#ffffff', fontSize: '13px', flex: 1 }}>
                          {getPermissionLabel(key)}
                        </span>
                        <span
                          style={{
                            marginLeft: '4px',
                            cursor: 'help',
                            color: '#00E5FF',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                          title={permissionDescriptions[key]}
                        >
                          <Info size={12} />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Form Actions */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setEditingOwner(null)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'linear-gradient(45deg, #666666, #888888)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    <X size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Cancel
                  </button>
                  <button
                    onClick={handleUpdateOwnerPermissions}
                    disabled={processingIds.has(selectedEstablishment.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: processingIds.has(selectedEstablishment.id)
                        ? 'linear-gradient(45deg, #666666, #888888)'
                        : 'linear-gradient(45deg, #FFD700, #FFA500)',
                      color: processingIds.has(selectedEstablishment.id) ? 'white' : '#000',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: processingIds.has(selectedEstablishment.id) ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      opacity: processingIds.has(selectedEstablishment.id) ? 0.5 : 1
                    }}
                  >
                    {processingIds.has(selectedEstablishment.id) ? <><Loader2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Updating...</> : <><Check size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Save Changes</>}
                  </button>
                </div>
              </div>
            )}

            {/* Current Owners List */}
            <div>
              <h3 style={{
                color: '#00E5FF',
                fontSize: '18px',
                fontWeight: 'bold',
                margin: '0 0 15px 0'
              }}>
                <Users size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Current Owners ({establishmentOwners.length})
              </h3>

              {establishmentOwners.length === 0 ? (
                <div style={{
                  padding: '30px',
                  textAlign: 'center',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '15px',
                  border: '2px dashed rgba(193, 154, 107,0.3)'
                }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}><MailX size={40} /></div>
                  <div style={{ color: '#cccccc', fontSize: '14px' }}>
                    No owners assigned yet. Click "Assign New Owner" to add one.
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px'
                }}>
                  {establishmentOwners.map((owner) => (
                    <div
                      key={owner.id}
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '15px',
                        border: '2px solid rgba(193, 154, 107,0.3)',
                        padding: '15px',
                        position: 'relative'
                      }}
                    >
                      {/* Role Badge */}
                      <div style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        padding: '6px 12px',
                        borderRadius: '15px',
                        background: `${getRoleColor(owner.owner_role)}20`,
                        border: `2px solid ${getRoleColor(owner.owner_role)}`,
                        color: getRoleColor(owner.owner_role),
                        fontSize: '11px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {getRoleIcon(owner.owner_role)} {owner.owner_role.toUpperCase()}
                      </div>

                      {/* Owner Info */}
                      <div style={{ marginBottom: '15px', paddingRight: '120px' }}>
                        <div style={{
                          color: '#ffffff',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          marginBottom: '5px'
                        }}>
                          {owner.user?.pseudonym || 'Unknown User'}
                        </div>
                        <div style={{
                          color: '#cccccc',
                          fontSize: '14px',
                          marginBottom: '10px'
                        }}>
                          {owner.user?.email}
                        </div>
                        <div style={{
                          color: '#888888',
                          fontSize: '12px',
                          marginBottom: '10px'
                        }}>
                          Assigned {formatDate(owner.assigned_at)}
                          {owner.assigner && ` by ${owner.assigner.pseudonym}`}
                        </div>

                        {/* Permissions Badges */}
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          marginTop: '10px'
                        }}>
                          {Object.entries(owner.permissions).map(([key, value]) => (
                            <div
                              key={key}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '8px',
                                background: value ? 'rgba(0,255,127,0.1)' : 'rgba(255,71,87,0.1)',
                                border: `1px solid ${value ? '#00FF7F' : '#FF4757'}`,
                                color: value ? '#00FF7F' : '#FF4757',
                                fontSize: '10px',
                                fontWeight: 'bold'
                              }}
                            >
                              {getPermissionIcon(value)} {key.replace(/_/g, ' ').replace(/can /g, '')}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        paddingTop: '15px',
                        borderTop: '1px solid rgba(193, 154, 107,0.3)'
                      }}>
                        <button
                          onClick={() => setEditingOwner(owner)}
                          disabled={showAssignModal || editingOwner !== null}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: (showAssignModal || editingOwner !== null)
                              ? 'linear-gradient(45deg, #666666, #888888)'
                              : 'linear-gradient(45deg, #FFD700, #FFA500)',
                            color: (showAssignModal || editingOwner !== null) ? 'white' : '#000',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: (showAssignModal || editingOwner !== null) ? 'not-allowed' : 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            opacity: (showAssignModal || editingOwner !== null) ? 0.5 : 1
                          }}
                        >
                          <Pencil size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Edit Permissions
                        </button>
                        <button
                          onClick={() => handleRemoveOwner(owner.establishment_id, owner.user_id)}
                          disabled={processingIds.has(owner.establishment_id) || showAssignModal || editingOwner !== null}
                          style={{
                            flex: 1,
                            padding: '8px',
                            background: (processingIds.has(owner.establishment_id) || showAssignModal || editingOwner !== null)
                              ? 'linear-gradient(45deg, #666666, #888888)'
                              : 'linear-gradient(45deg, #FF4757, #FF3742)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: (processingIds.has(owner.establishment_id) || showAssignModal || editingOwner !== null) ? 'not-allowed' : 'pointer',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            opacity: (processingIds.has(owner.establishment_id) || showAssignModal || editingOwner !== null) ? 0.5 : 1
                          }}
                        >
                          {processingIds.has(owner.establishment_id) ? <><Loader2 size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Removing...</> : <><Trash2 size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />Remove</>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
