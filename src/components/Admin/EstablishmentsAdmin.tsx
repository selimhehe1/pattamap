import React, { useState, useEffect, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  XCircle,
  Pencil,
  ShieldOff,
  Building2,
  Plus,
  List,
  Sparkles,
  Inbox
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useDialog } from '../../hooks/useDialog';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import LoadingFallback from '../Common/LoadingFallback';
import { SkeletonTable } from '../Common/Skeleton';
import AdminEstablishmentCard from './AdminEstablishmentCard';
import { logger } from '../../utils/logger';
import notification from '../../utils/notification';
import { Establishment } from '../../types';
import '../../styles/admin/establishments.css';
import '../../styles/admin/admin-components.css';
import '../../styles/admin/admin-employee-card.css';

// Sub-components
import {
  EditProposalsSection,
  BulkActionBar,
  useBulkSelection
} from './EstablishmentsAdmin/index';
import type {
  AdminEstablishment,
  EditProposal,
  EstablishmentsAdminProps
} from './EstablishmentsAdmin/types';

// Lazy load EstablishmentForm for better performance
const EstablishmentForm = lazy(() => import('../Forms/EstablishmentForm'));

/**
 * EstablishmentsAdmin Component (Refactored)
 *
 * Admin panel for managing establishments:
 * - View pending/approved/rejected establishments
 * - Approve or reject new submissions
 * - Review and process edit proposals
 * - Bulk operations for batch processing
 */
const EstablishmentsAdmin: React.FC<EstablishmentsAdminProps> = ({ onTabChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
  const { openModal, closeModal } = useModal();
  const dialog = useDialog();

  // Data state
  const [establishments, setEstablishments] = useState<AdminEstablishment[]>([]);
  const [editProposals, setEditProposals] = useState<EditProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'pending-edits'>('pending');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedProposal, setSelectedProposal] = useState<EditProposal | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Helper function to trigger refresh
  const refreshEstablishments = () => setRefreshCounter(c => c + 1);

  // Bulk selection hook
  const {
    selectedIds,
    isBulkProcessing,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    handleBulkApprove,
    handleBulkReject
  } = useBulkSelection({
    establishments,
    onSuccess: refreshEstablishments
  });

  // Load establishments or edit proposals based on filter
  useEffect(() => {
    const loadEstablishments = async () => {
      setIsLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';

        if (filter === 'pending-edits') {
          const response = await secureFetch(`${API_URL}/api/edit-proposals?status=pending&item_type=establishment`);
          if (response.ok) {
            const data = await response.json();
            setEditProposals(data.proposals || []);
            setEstablishments([]);
          }
        } else {
          const response = await secureFetch(`${API_URL}/api/admin/establishments?status=${filter === 'all' ? '' : filter}`);
          if (response.ok) {
            const data = await response.json();
            setEstablishments(data.establishments || []);
            setEditProposals([]);
          }
        }
      } catch (error) {
        logger.error('Failed to load establishments:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadEstablishments();
  }, [filter, secureFetch, refreshCounter]);

  // ============================================
  // Individual establishment handlers
  // ============================================

  const handleApprove = async (establishmentId: string) => {
    setProcessingIds(prev => new Set(prev).add(establishmentId));
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/admin/establishments/${establishmentId}/approve`, {
        method: 'POST'
      });
      if (response.ok) {
        refreshEstablishments();
        notification.success(t('admin.establishmentApproved', 'Establishment approved'));
      } else {
        notification.error(t('admin.approveEstablishmentError', 'Failed to approve establishment'));
      }
    } catch (error) {
      logger.error('Failed to approve establishment:', error);
      notification.error(t('admin.approveEstablishmentError', 'Failed to approve establishment'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(establishmentId);
        return newSet;
      });
    }
  };

  const handleReject = async (establishmentId: string, reason?: string) => {
    setProcessingIds(prev => new Set(prev).add(establishmentId));
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/admin/establishments/${establishmentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      if (response.ok) {
        refreshEstablishments();
        notification.success(t('admin.establishmentRejected', 'Establishment rejected'));
      } else {
        notification.error(t('admin.rejectEstablishmentError', 'Failed to reject establishment'));
      }
    } catch (error) {
      logger.error('Failed to reject establishment:', error);
      notification.error(t('admin.rejectEstablishmentError', 'Failed to reject establishment'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(establishmentId);
        return newSet;
      });
    }
  };

  const handleDelete = async (establishmentId: string, establishmentName: string) => {
    const confirmed = await dialog.confirmDelete(establishmentName, {
      title: t('admin.confirmDeleteTitle', 'Confirm Deletion')
    });

    if (!confirmed) return;

    setProcessingIds(prev => new Set(prev).add(establishmentId));
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/admin/establishments/${establishmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        refreshEstablishments();
        logger.info('Establishment deleted successfully:', establishmentId);
        notification.success(t('admin.deleteEstablishmentSuccess', 'Establishment deleted successfully'));
      } else {
        throw new Error('Failed to delete establishment');
      }
    } catch (error) {
      logger.error('Failed to delete establishment:', error);
      notification.error(t('admin.deleteEstablishmentError', 'Failed to delete establishment. Please try again.'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(establishmentId);
        return newSet;
      });
    }
  };

  // ============================================
  // Modal handlers
  // ============================================

  const handleCreateEstablishment = async (establishmentData: Partial<Establishment>) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/admin/establishments`, {
        method: 'POST',
        body: JSON.stringify(establishmentData)
      });

      if (response.ok) {
        refreshEstablishments();
        closeModal('establishment-add');
        notification.success(t('admin.establishmentCreated', 'Establishment created successfully'));
      } else {
        throw new Error('Failed to create establishment');
      }
    } catch (error) {
      logger.error('Failed to create establishment:', error);
      throw error;
    }
  };

  const handleUpdateEstablishment = async (establishmentId: string, establishmentData: Partial<Establishment>) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/admin/establishments/${establishmentId}`, {
        method: 'PUT',
        body: JSON.stringify(establishmentData)
      });

      if (response.ok) {
        refreshEstablishments();
        closeModal('establishment-edit');
        notification.success(t('admin.establishmentUpdated', 'Establishment updated successfully'));
      } else {
        throw new Error('Failed to update establishment');
      }
    } catch (error) {
      logger.error('Failed to update establishment:', error);
      throw error;
    }
  };

  const handleOpenAddModal = () => {
    openModal('establishment-add', EstablishmentForm, {
      onSubmit: handleCreateEstablishment,
      onCancel: () => closeModal('establishment-add')
    }, { size: 'large' });
  };

  const handleOpenEditModal = (establishment: AdminEstablishment) => {
    openModal('establishment-edit', EstablishmentForm, {
      initialData: establishment as unknown as Partial<Establishment>,
      onSubmit: (data: Partial<Establishment>) => handleUpdateEstablishment(establishment.id, data),
      onCancel: () => closeModal('establishment-edit')
    }, { size: 'large' });
  };

  // ============================================
  // Edit proposal handlers
  // ============================================

  const handleApproveProposal = async (proposalId: string) => {
    setProcessingIds(prev => new Set(prev).add(proposalId));
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/edit-proposals/${proposalId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ moderator_notes: 'Approved via Establishments tab' })
      });

      if (response.ok) {
        refreshEstablishments();
        setSelectedProposal(null);
        notification.success(t('admin.proposalApproved', 'Edit proposal approved'));
      } else {
        notification.error(t('admin.approveProposalError', 'Failed to approve proposal'));
      }
    } catch (error) {
      logger.error('Failed to approve proposal:', error);
      notification.error(t('admin.approveProposalError', 'Failed to approve proposal'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(proposalId);
        return newSet;
      });
    }
  };

  const handleRejectProposal = async (proposalId: string) => {
    const reason = await dialog.prompt(
      t('admin.rejectProposalPrompt', 'Reason for rejection:'),
      {
        required: true,
        minLength: 10,
        variant: 'warning',
        placeholder: t('admin.enterRejectionReason', 'Enter rejection reason...')
      }
    );
    if (!reason) return;

    setProcessingIds(prev => new Set(prev).add(proposalId));
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await secureFetch(`${API_URL}/api/edit-proposals/${proposalId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ moderator_notes: reason })
      });

      if (response.ok) {
        refreshEstablishments();
        setSelectedProposal(null);
        notification.success(t('admin.proposalRejected', 'Edit proposal rejected'));
      } else {
        notification.error(t('admin.rejectProposalError', 'Failed to reject proposal'));
      }
    } catch (error) {
      logger.error('Failed to reject proposal:', error);
      notification.error(t('admin.rejectProposalError', 'Failed to reject proposal'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(proposalId);
        return newSet;
      });
    }
  };

  // ============================================
  // Access control
  // ============================================

  if (!user || !['admin', 'moderator'].includes(user.role)) {
    return (
      <div className="command-content-section">
        <div className="cmd-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <ShieldOff size={48} style={{ marginBottom: '20px', opacity: 0.5, color: 'var(--color-error)' }} />
          <h2 className="cmd-card__title">{t('admin.accessDenied')}</h2>
          <p className="cmd-card__subtitle">{t('admin.accessDeniedArea')}</p>
        </div>
      </div>
    );
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="command-content-section admin-establishments-container-nightlife">
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb
        currentSection={t('admin.establishmentsManagement')}
        onBackToDashboard={() => onTabChange('overview')}
        icon={<Building2 size={18} />}
      />

      {/* Header */}
      <div className="cmd-section-header cmd-section-header--with-action">
        <div>
          <h1 className="cmd-section-title">
            <Building2 size={28} /> {t('admin.establishmentsManagement')}
          </h1>
          <p className="cmd-section-subtitle">{t('admin.reviewApproveSubmissions')}</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="cmd-modal-btn cmd-modal-btn--success"
        >
          <Plus size={18} /> <Building2 size={18} /> {t('admin.addNewEstablishment')}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="cmd-filters" style={{ marginBottom: '24px' }}>
        <div className="cmd-filter-pills">
          {[
            { key: 'pending', label: t('admin.filterNewPending'), icon: <Sparkles size={14} /> },
            { key: 'pending-edits', label: t('admin.filterPendingEdits'), icon: <Pencil size={14} /> },
            { key: 'approved', label: t('admin.filterApproved'), icon: <CheckCircle size={14} /> },
            { key: 'rejected', label: t('admin.filterRejected'), icon: <XCircle size={14} /> },
            { key: 'all', label: t('admin.filterAll'), icon: <List size={14} /> }
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

      {/* Content */}
      {isLoading ? (
        <SkeletonTable variant="card-grid" rows={6} showHeader={false} />
      ) : filter === 'pending-edits' ? (
        <EditProposalsSection
          editProposals={editProposals}
          selectedProposal={selectedProposal}
          processingIds={processingIds}
          onSelectProposal={setSelectedProposal}
          onApproveProposal={handleApproveProposal}
          onRejectProposal={handleRejectProposal}
        />
      ) : establishments.length === 0 ? (
        <div className="admin-establishments-empty-nightlife">
          <h3 className="admin-establishments-empty-title-nightlife" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Inbox size={24} /> {t('admin.noEstablishmentsFound')}
          </h3>
          <p className="admin-establishments-empty-text-nightlife">
            {t('admin.noEstablishmentsMatch')}
          </p>
        </div>
      ) : (
        <>
          {/* Bulk Action Bar */}
          <BulkActionBar
            selectedIds={selectedIds}
            totalCount={establishments.length}
            isBulkProcessing={isBulkProcessing}
            onToggleSelectAll={toggleSelectAll}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
            onClearSelection={clearSelection}
          />

          {/* Establishments Grid */}
          <div className="admin-establishments-grid-nightlife">
            {establishments.map((establishment) => (
              <AdminEstablishmentCard
                key={establishment.id}
                establishment={establishment}
                isProcessing={processingIds.has(establishment.id)}
                isSelected={selectedIds.has(establishment.id)}
                onToggleSelection={toggleSelection}
                onEdit={handleOpenEditModal}
                onApprove={handleApprove}
                onReject={(id) => handleReject(id)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default EstablishmentsAdmin;
