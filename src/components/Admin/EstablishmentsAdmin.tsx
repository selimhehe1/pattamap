import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Pencil,
  Trash2,
  Tag,
  User,
  Image as ImageIcon,
  Wallet,
  BarChart3,
  ShieldOff,
  FileEdit,
  Building2,
  Plus,
  List,
  Sparkles,
  Inbox,
  MapPin,
  Globe,
  Calendar
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { useAuth } from '../../contexts/AuthContext';
import { useSecureFetch } from '../../hooks/useSecureFetch';
import { useDialog } from '../../hooks/useDialog';
import AdminBreadcrumb from '../Common/AdminBreadcrumb';
import LoadingFallback from '../Common/LoadingFallback';
import { logger } from '../../utils/logger';
import LazyImage from '../Common/LazyImage';
import toast from '../../utils/toast';
import { Establishment } from '../../types';
import '../../styles/admin/establishments.css';
import '../../styles/admin/admin-components.css';

// Lazy load EstablishmentForm for better performance
const EstablishmentForm = lazy(() => import('../Forms/EstablishmentForm'));

// Force recompile

interface AdminEstablishment {
  id: string;
  name: string;
  address: string;
  zone: string;
  category_id: string;
  phone?: string;
  website?: string;
  logo_url?: string;
  services?: string[];
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  created_at: string;
  updated_at: string;
  pricing?: {
    consumables?: Array<{
      consumable_id: string;
      price: string;
    }>;
    ladydrink?: string;
    barfine?: string;
    rooms?: string;
  };
  user?: {
    id: string;
    pseudonym: string;
  };
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    created_at: string;
  };
}

/** Represents possible values in edit proposals */
type EditProposalValue = string | number | boolean | null | undefined | string[] | Record<string, unknown>;

/** Edit proposal changes - keys are field names, values are the proposed/current data */
type EditProposalChanges = Record<string, EditProposalValue>;

interface EditProposal {
  id: string;
  item_type: 'employee' | 'establishment';
  item_id: string;
  proposed_changes: EditProposalChanges;
  current_values: EditProposalChanges;
  proposed_by: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  proposed_by_user?: {
    id: string;
    pseudonym: string;
  };
}

interface EstablishmentsAdminProps {
  onTabChange: (tab: string) => void;
}

const EstablishmentsAdmin: React.FC<EstablishmentsAdminProps> = ({ onTabChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
  const dialog = useDialog();
  const [establishments, setEstablishments] = useState<AdminEstablishment[]>([]);
  const [editProposals, setEditProposals] = useState<EditProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'pending-edits'>('pending');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [editingEstablishment, setEditingEstablishment] = useState<AdminEstablishment | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<EditProposal | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Helper function to trigger refresh
  const refreshEstablishments = () => setRefreshCounter(c => c + 1);

  // Bulk selection handlers
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === establishments.length && establishments.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(establishments.map((e) => e.id)));
    }
  }, [establishments, selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Bulk approve selected establishments
  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsBulkProcessing(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    let successCount = 0;
    let failCount = 0;

    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        try {
          const response = await secureFetch(
            `${API_URL}/api/admin/establishments/${id}/approve`,
            { method: 'POST' }
          );
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      });

      await Promise.all(promises);

      if (successCount > 0) {
        toast.success(t('admin.bulkApproveSuccess', `${successCount} establishment(s) approved`));
      }
      if (failCount > 0) {
        toast.error(t('admin.bulkApproveFailed', `${failCount} establishment(s) failed to approve`));
      }

      clearSelection();
      refreshEstablishments();
    } finally {
      setIsBulkProcessing(false);
    }
  }, [selectedIds, secureFetch, t, clearSelection]);

  // Bulk reject selected establishments
  const handleBulkReject = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const reason = await dialog.prompt(
      t('admin.bulkRejectPrompt', `Reject ${selectedIds.size} establishment(s)?\n\nPlease provide a reason:`),
      {
        required: true,
        minLength: 10,
        variant: 'danger',
        placeholder: t('admin.enterRejectionReason', 'Enter rejection reason...'),
      }
    );

    if (!reason) return;

    setIsBulkProcessing(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    let successCount = 0;
    let failCount = 0;

    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        try {
          const response = await secureFetch(
            `${API_URL}/api/admin/establishments/${id}/reject`,
            {
              method: 'POST',
              body: JSON.stringify({ reason }),
            }
          );
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      });

      await Promise.all(promises);

      if (successCount > 0) {
        toast.success(t('admin.bulkRejectSuccess', `${successCount} establishment(s) rejected`));
      }
      if (failCount > 0) {
        toast.error(t('admin.bulkRejectFailed', `${failCount} establishment(s) failed to reject`));
      }

      clearSelection();
      refreshEstablishments();
    } finally {
      setIsBulkProcessing(false);
    }
  }, [selectedIds, dialog, t, secureFetch, clearSelection]);

  useEffect(() => {
    const loadEstablishments = async () => {
      setIsLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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

  const handleApprove = async (establishmentId: string) => {
    setProcessingIds(prev => new Set(prev).add(establishmentId));
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/admin/establishments/${establishmentId}/approve`, {
        method: 'POST'
      });

      if (response.ok) {
        refreshEstablishments(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to approve establishment:', error);
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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/admin/establishments/${establishmentId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        refreshEstablishments(); // Reload list
      }
    } catch (error) {
      logger.error('Failed to reject establishment:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(establishmentId);
        return newSet;
      });
    }
  };

  const handleDelete = async (establishmentId: string, establishmentName: string) => {
    // Confirmation dialog with useDialog
    const confirmed = await dialog.confirmDelete(establishmentName, {
      title: t('admin.confirmDeleteTitle', 'Confirm Deletion')
    });

    if (!confirmed) {
      return; // User cancelled
    }

    setProcessingIds(prev => new Set(prev).add(establishmentId));
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/admin/establishments/${establishmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        refreshEstablishments(); // Reload list
        logger.info('Establishment deleted successfully:', establishmentId);
        toast.success(t('admin.deleteEstablishmentSuccess', 'Establishment deleted successfully'));
      } else {
        throw new Error('Failed to delete establishment');
      }
    } catch (error) {
      logger.error('Failed to delete establishment:', error);
      toast.error(t('admin.deleteEstablishmentError', 'Failed to delete establishment. Please try again.'));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(establishmentId);
        return newSet;
      });
    }
  };

  const handleSaveEstablishment = async (establishmentData: Partial<Establishment>) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

      // Determine if we're adding or editing
      const isEditing = !!editingEstablishment;
      const url = isEditing
        ? `${API_URL}/api/admin/establishments/${editingEstablishment.id}`
        : `${API_URL}/api/admin/establishments`;
      const method = isEditing ? 'PUT' : 'POST';

      // DEBUG: Log the data being sent
      logger.debug('🏢 EstablishmentsAdmin - Saving establishment:', {
        method,
        url,
        establishmentData,
        logo_url: establishmentData.logo_url
      });

      const response = await secureFetch(url, {
        method,
        body: JSON.stringify(establishmentData)
      });

      if (response.ok) {
        refreshEstablishments();
        // Close the appropriate modal
        if (isEditing) {
          setEditingEstablishment(null);
        } else {
          setShowAddModal(false);
        }
      } else {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} establishment`);
      }
    } catch (error) {
      logger.error(`Failed to ${editingEstablishment ? 'save' : 'create'} establishment:`, error);
      throw error;
    }
  };

  const handleApproveProposal = async (proposalId: string) => {
    setProcessingIds(prev => new Set(prev).add(proposalId));
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/edit-proposals/${proposalId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ moderator_notes: 'Approved via Establishments tab' })
      });

      if (response.ok) {
        refreshEstablishments();
        setSelectedProposal(null);
      }
    } catch (error) {
      logger.error('Failed to approve proposal:', error);
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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
      const response = await secureFetch(`${API_URL}/api/edit-proposals/${proposalId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ moderator_notes: reason })
      });

      if (response.ok) {
        refreshEstablishments();
        setSelectedProposal(null);
      }
    } catch (error) {
      logger.error('Failed to reject proposal:', error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(proposalId);
        return newSet;
      });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFD700';
      case 'approved': return '#00FF7F';
      case 'rejected': return '#FF4757';
      default: return '#cccccc';
    }
  };

  const getStatusIcon = (status: string): React.ReactNode => {
    switch (status) {
      case 'pending': return <Clock size={14} style={{ color: 'var(--color-warning)' }} />;
      case 'approved': return <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />;
      case 'rejected': return <XCircle size={14} style={{ color: 'var(--color-error)' }} />;
      default: return <Clock size={14} />;
    }
  };

  // Format values for human-readable display in edit proposals
  const formatValueForDisplay = (value: EditProposalValue, fieldKey: string): string => {
    // Handle null/undefined - return N/A
    if (value === null || value === undefined || value === '') {
      return '<span style="color: #888; font-style: italic;">N/A</span>';
    }

    // Handle empty strings that aren't truly empty (whitespace)
    if (typeof value === 'string' && value.trim() === '') {
      return '<span style="color: #888; font-style: italic;">N/A</span>';
    }

    // Handle primitive types (string, number, boolean)
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      // Special formatting for logo_url - show as link
      if (fieldKey === 'logo_url' || fieldKey === 'logo url') {
        return `<a href="${value}" target="_blank" style="color: #00E5FF; text-decoration: underline;">[View Image]</a>`;
      }
      // Special formatting for website
      if (fieldKey === 'website') {
        return `<a href="${value}" target="_blank" style="color: #00E5FF; text-decoration: underline;">${value}</a>`;
      }
      // Special formatting for phone
      if (fieldKey === 'phone') {
        return `Tel: ${value}`;
      }
      // Special formatting for grid positions
      if (fieldKey === 'grid_col' || fieldKey === 'grid col') {
        return `Column: ${value}`;
      }
      if (fieldKey === 'grid_row' || fieldKey === 'grid row') {
        return `Row: ${value}`;
      }
      // Special formatting for category_id
      if (fieldKey === 'category_id' || fieldKey === 'category id') {
        return `Category ID: ${value}`;
      }
      return String(value);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '<span style="color: #888; font-style: italic;">Empty</span>';
      }

      // Special formatting for services (simple string array)
      if (fieldKey === 'services') {
        return value.map(item => `• ${item}`).join('<br>');
      }

      // Generic array formatting
      return value.map((item, index) => `${index + 1}. ${typeof item === 'object' ? JSON.stringify(item) : item}`).join('<br>');
    }

    // Handle objects
    if (typeof value === 'object') {
      // Special formatting for OPENING_HOURS object
      if (fieldKey === 'opening_hours' || fieldKey === 'opening hours') {
        const parts: string[] = [];
        if (value.open) parts.push(`<strong>Opens:</strong> ${value.open}`);
        if (value.close) parts.push(`<strong>Closes:</strong> ${value.close}`);
        if (value.days) parts.push(`<strong>Days:</strong> ${value.days}`);
        return parts.length > 0 ? parts.join('<br>') : '<span style="color: #888; font-style: italic;">No hours specified</span>';
      }

      // Special formatting for PRICING object
      if (fieldKey === 'pricing') {
        const parts: string[] = [];

        // Helper to safely extract price value from various formats
        const extractPrice = (field: unknown): string => {
          if (field === null || field === undefined) return 'N/A';
          if (typeof field === 'string' || typeof field === 'number') return String(field);
          if (typeof field === 'object') {
            const obj = field as Record<string, unknown>;
            // Try common price property names
            if (obj.price !== undefined && obj.price !== null) return String(obj.price);
            if (obj.value !== undefined && obj.value !== null) return String(obj.value);
            if (obj.amount !== undefined && obj.amount !== null) return String(obj.amount);
            // If object has 'available' property, might be status object
            if (obj.available === false) return 'N/A';
            // Last resort: check if it's an empty object
            return Object.keys(obj).length === 0 ? 'N/A' : 'Check data';
          }
          return 'N/A';
        };

        // Handle rooms field
        if (value.rooms !== null && value.rooms !== undefined) {
          parts.push(`<strong>Rooms:</strong> ${extractPrice(value.rooms)}฿`);
        }

        // Handle barfine field
        if (value.barfine !== null && value.barfine !== undefined) {
          parts.push(`<strong>Barfine:</strong> ${extractPrice(value.barfine)}฿`);
        }

        // Handle ladydrink field
        if (value.ladydrink !== null && value.ladydrink !== undefined) {
          parts.push(`<strong>Lady Drink:</strong> ${extractPrice(value.ladydrink)}฿`);
        }

        // Handle consumables array in pricing
        if (value.consumables && Array.isArray(value.consumables)) {
          if (value.consumables.length > 0) {
            parts.push(`<br><strong>Consumables:</strong>`);
            value.consumables.forEach((item: { name?: string; consumable_id?: string; price?: number | string }) => {
              // Try to get name, fallback to shortened ID
              const itemName = item.name || item.consumable_id || 'Unknown';
              const displayName = typeof itemName === 'string' && itemName.length > 36
                ? `<span style="color: #FFD700;">Consumable</span> (${itemName.substring(0, 8)}...)`
                : itemName;
              parts.push(`  • ${displayName}: ${item.price}฿`);
            });
          }
        }

        return parts.length > 0 ? parts.join('<br>') : '<span style="color: #888; font-style: italic;">No pricing data</span>';
      }

      // Check if empty object
      if (Object.keys(value).length === 0) {
        return '<span style="color: #888; font-style: italic;">Empty</span>';
      }

      // Generic object formatting (key-value pairs)
      return Object.entries(value)
        .map(([key, val]) => {
          if (typeof val === 'object' && val !== null) {
            return `<strong>${key}:</strong> ${JSON.stringify(val)}`;
          }
          return `<strong>${key}:</strong> ${val}`;
        })
        .join('<br>');
    }

    // Fallback to JSON.stringify for complex types
    return JSON.stringify(value, null, 2);
  };

  if (!user || !['admin', 'moderator'].includes(user.role)) {
    return (
      <div className="admin-access-denied-container-nightlife">
        <div className="admin-access-denied-card-nightlife">
          <h2 className="admin-access-denied-title-nightlife" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <ShieldOff size={24} /> {t('admin.accessDenied')}
          </h2>
          <p className="admin-access-denied-text-nightlife">
            {t('admin.accessDeniedArea')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-establishments-container-nightlife">
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb
        currentSection={t('admin.establishmentsManagement')}
        onBackToDashboard={() => onTabChange('overview')}
        icon={<Building2 size={18} />}
      />

      {/* Header */}
      <div className="admin-establishments-header-nightlife">
        <h1 className="admin-establishments-title-nightlife" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building2 size={28} /> {t('admin.establishmentsManagement')}
        </h1>
        <p className="admin-establishments-subtitle-nightlife">
          {t('admin.reviewApproveSubmissions')}
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="admin-establishments-tabs-nightlife">
        {[
          { key: 'pending', label: t('admin.filterNewPending'), icon: <Sparkles size={16} /> },
          { key: 'pending-edits', label: t('admin.filterPendingEdits'), icon: <Pencil size={16} /> },
          { key: 'approved', label: t('admin.filterApproved'), icon: <CheckCircle size={16} /> },
          { key: 'rejected', label: t('admin.filterRejected'), icon: <XCircle size={16} /> },
          { key: 'all', label: t('admin.filterAll'), icon: <List size={16} /> }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`admin-establishments-tab-nightlife ${filter === tab.key ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Add Establishment Button */}
      <div className="admin-add-establishment-center-nightlife">
        <button
          onClick={() => setShowAddModal(true)}
          className="admin-add-establishment-button-nightlife"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> <Building2 size={18} /> {t('admin.addNewEstablishment')}
        </button>
      </div>

      {/* Establishments List */}
      {isLoading ? (
        <LoadingFallback message={t('admin.loadingEstablishments')} variant="inline" />
      ) : filter === 'pending-edits' && editProposals.length === 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(193, 154, 107,0.1), rgba(0,0,0,0.3))',
          borderRadius: '20px',
          border: '2px solid rgba(193, 154, 107,0.3)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <h3 style={{
            color: 'var(--color-primary)',
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '0 0 10px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={20} style={{ color: 'var(--color-success)' }} /> {t('admin.noPendingEdits')}
          </h3>
          <p style={{
            color: '#cccccc',
            fontSize: '16px'
          }}>
            {t('admin.allEditsReviewed')}
          </p>
        </div>
      ) : filter === 'pending-edits' ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {editProposals.map((proposal) => (
            <div
              key={proposal.id}
              style={{
                background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(0,0,0,0.3))',
                borderRadius: '20px',
                border: '2px solid rgba(255,215,0,0.3)',
                padding: '25px',
                position: 'relative'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                padding: '8px 15px',
                borderRadius: '20px',
                background: 'rgba(255,215,0,0.2)',
                border: '2px solid #FFD700',
                color: '#FFD700',
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Pencil size={14} /> {t('admin.editProposal')}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ color: '#FFD700', fontSize: '18px', margin: '0 0 5px 0' }}>
                  {t('admin.editFor')} {String(proposal.current_values?.name || t('admin.establishments'))}
                </h3>
                <p style={{ color: '#cccccc', fontSize: '14px', margin: 0 }}>
                  {t('admin.proposedBy')} <strong style={{ color: '#00E5FF' }}>{proposal.proposed_by_user?.pseudonym || t('admin.unknown')}</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedProposal(selectedProposal?.id === proposal.id ? null : proposal)}
                style={{
                  padding: '10px 20px',
                  background: selectedProposal?.id === proposal.id
                    ? 'linear-gradient(45deg, #FFD700, #FFA500)'
                    : 'linear-gradient(45deg, rgba(255,215,0,0.2), rgba(255,165,0,0.2))',
                  color: selectedProposal?.id === proposal.id ? '#000' : '#FFD700',
                  border: '1px solid #FFD700',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {selectedProposal?.id === proposal.id ? `▲ ${t('admin.hideChanges')}` : `▼ ${t('admin.viewChanges')}`}
              </button>

              {selectedProposal?.id === proposal.id && (
                <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(0,0,0,0.4)', borderRadius: '15px' }}>
                  <h5 style={{ color: '#FFD700', fontSize: '16px', margin: '0 0 15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={16} /> {t('admin.proposedChanges')}
                  </h5>
                  {Object.keys(proposal.proposed_changes).map(key => {
                    const currentValue = proposal.current_values?.[key];
                    const proposedValue = proposal.proposed_changes[key];

                    if (JSON.stringify(currentValue) === JSON.stringify(proposedValue)) return null;

                    return (
                      <div key={key} style={{ marginBottom: '15px', padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px' }}>
                        <strong style={{ color: '#FFD700', fontSize: '14px', textTransform: 'uppercase' }}>
                          {key.replace(/_/g, ' ')}:
                        </strong>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                          <div style={{
                            flex: 1,
                            minWidth: '200px',
                            padding: '10px',
                            background: 'rgba(255,71,87,0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,71,87,0.3)'
                          }}>
                            <div style={{ color: '#FF4757', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <XCircle size={12} /> {t('admin.before')}
                            </div>
                            <div
                              style={{ color: '#ffffff', fontSize: '13px', wordBreak: 'break-word', lineHeight: '1.6' }}
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatValueForDisplay(currentValue, key)) }}
                            />
                          </div>
                          <div style={{
                            flex: 1,
                            minWidth: '200px',
                            padding: '10px',
                            background: 'rgba(0,255,127,0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(0,255,127,0.3)'
                          }}>
                            <div style={{ color: '#00FF7F', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={12} /> {t('admin.after')}
                            </div>
                            <div
                              style={{ color: '#ffffff', fontSize: '13px', wordBreak: 'break-word', lineHeight: '1.6' }}
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatValueForDisplay(proposedValue, key)) }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                    <button
                      onClick={() => handleApproveProposal(proposal.id)}
                      disabled={processingIds.has(proposal.id)}
                      style={{
                        flex: 1,
                        padding: '15px 25px',
                        background: processingIds.has(proposal.id) ? '#666' : 'linear-gradient(45deg, #00FF7F, #00D4AA)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: processingIds.has(proposal.id) ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {processingIds.has(proposal.id) ? <><Loader2 size={16} className="animate-spin" /> {t('admin.processing')}</> : <><CheckCircle size={16} /> {t('admin.approveAndApply')}</>}
                    </button>

                    <button
                      onClick={() => handleRejectProposal(proposal.id)}
                      disabled={processingIds.has(proposal.id)}
                      style={{
                        flex: 1,
                        padding: '15px 25px',
                        background: processingIds.has(proposal.id) ? '#666' : 'linear-gradient(45deg, #FF4757, #FF1744)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: processingIds.has(proposal.id) ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {processingIds.has(proposal.id) ? <><Loader2 size={16} className="animate-spin" /> {t('admin.processing')}</> : <><XCircle size={16} /> {t('admin.reject')}</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              marginBottom: '16px',
              background: 'rgba(193, 154, 107, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(193, 154, 107, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: '#C19A6B',
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.size === establishments.length && establishments.length > 0}
                  onChange={toggleSelectAll}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#C19A6B',
                    cursor: 'pointer',
                  }}
                />
                {t('admin.selectAll', 'Select All')}
              </label>
              {selectedIds.size > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
                  ({selectedIds.size} {t('admin.selected', 'selected')})
                </span>
              )}
            </div>

            {selectedIds.size > 0 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleBulkApprove}
                  disabled={isBulkProcessing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
                    opacity: isBulkProcessing ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isBulkProcessing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {t('admin.approveSelected', 'Approve')}
                </button>
                <button
                  onClick={handleBulkReject}
                  disabled={isBulkProcessing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
                    opacity: isBulkProcessing ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isBulkProcessing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <X size={16} />
                  )}
                  {t('admin.rejectSelected', 'Reject')}
                </button>
                <button
                  onClick={clearSelection}
                  disabled={isBulkProcessing}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px',
                    cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {t('admin.clearSelection', 'Clear')}
                </button>
              </div>
            )}
          </div>

          {/* Establishments Grid */}
          <div className="admin-establishments-grid-nightlife">
            {establishments.map((establishment) => (
              <div
                key={establishment.id}
                className="admin-establishment-card-nightlife"
              >
                {/* Selection Checkbox */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(establishment.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: selectedIds.has(establishment.id) ? '2px solid #C19A6B' : '2px solid rgba(255,255,255,0.3)',
                    background: selectedIds.has(establishment.id) ? '#C19A6B' : 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 15,
                    transition: 'all 0.2s ease',
                  }}
                  role="checkbox"
                  aria-checked={selectedIds.has(establishment.id)}
                  aria-label={t('admin.selectEstablishment', 'Select establishment')}
                >
                  {selectedIds.has(establishment.id) && (
                    <Check size={14} color="#fff" strokeWidth={3} />
                  )}
                </div>
              {/* Status Badge - Small Circular Icon Only */}
              <div
                className="admin-establishment-status-badge-nightlife"
                style={{
                  background: getStatusColor(establishment.status),
                  boxShadow: `0 0 12px ${getStatusColor(establishment.status)}80`
                }}
                title={establishment.status.toUpperCase()}
              >
                {getStatusIcon(establishment.status)}
              </div>

              {/* Content Area - Flex 1 to push buttons to bottom */}
              <div className="admin-establishment-content-nightlife">
                {/* Main Establishment Info - Horizontal Layout */}
                <div className="admin-establishment-main-info-nightlife">
                  {/* Logo with Status-Colored Border */}
                  <div className="admin-establishment-logo-container-nightlife">
                    {establishment.logo_url ? (
                      <LazyImage
                        src={establishment.logo_url}
                        alt={`${establishment.name} logo`}
                        cloudinaryPreset="establishmentLogo"
                        className="admin-establishment-logo-image-nightlife"
                        objectFit="contain"
                      />
                    ) : (
                      <div className="admin-establishment-logo-placeholder-nightlife">
                        {establishment.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
                  <div className="admin-establishment-info-nightlife">
                    <div>
                      <h3 className="admin-establishment-name-nightlife">
                        {establishment.name}
                      </h3>

                      <div className="admin-establishment-details-nightlife">
                        <div className="admin-establishment-detail-row-nightlife">
                          <span className="admin-establishment-detail-icon-nightlife"><MapPin size={12} /></span>
                          <span className="admin-establishment-detail-text-nightlife">{establishment.address}</span>
                        </div>

                        <div className="admin-establishment-detail-row-nightlife">
                          <span className="admin-establishment-detail-icon-nightlife"><Globe size={12} /></span>
                          <span className="admin-establishment-detail-text-nightlife">{establishment.zone}</span>
                        </div>

                        <div className="admin-establishment-detail-row-nightlife">
                          <span className="admin-establishment-detail-icon-nightlife"><Tag size={12} /></span>
                          <span className="admin-establishment-detail-text-nightlife">{establishment.category?.name || t('admin.unknown')}</span>
                        </div>

                        <div className="admin-establishment-detail-row-nightlife">
                          <span className="admin-establishment-detail-icon-nightlife"><User size={12} /></span>
                          <span className="admin-establishment-detail-text-nightlife">{establishment.user?.pseudonym || t('admin.unknown')}</span>
                        </div>
                      </div>

                      {/* Submission Info */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: '#888888',
                        marginTop: '8px',
                        alignItems: 'center'
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={11} /> {formatDate(establishment.created_at)}</span>
                        <span style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Tag size={11} /> {establishment.category?.name || t('admin.unknown')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="admin-establishment-timestamps-nightlife">
                  {t('admin.submitted')} {formatDate(establishment.created_at)}
                  {establishment.updated_at !== establishment.created_at && (
                    <span> • {t('admin.updated')} {formatDate(establishment.updated_at)}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`admin-establishment-actions-nightlife ${establishment.status === 'pending' ? 'admin-establishment-actions-pending-nightlife' : 'admin-establishment-actions-approved-nightlife'}`}>
                {/* Edit & Delete Buttons Row - Always available */}
                <div className="admin-establishment-edit-delete-row-nightlife">
                  <button
                    onClick={() => setEditingEstablishment(establishment)}
                    className="admin-establishment-edit-button-nightlife"
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Pencil size={14} /><span className="edit-text-desktop"> {t('common.edit')}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(establishment.id, establishment.name)}
                    disabled={processingIds.has(establishment.id)}
                    className="admin-establishment-delete-button-nightlife"
                    title={t('admin.deleteEstablishment') || 'Delete'}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {processingIds.has(establishment.id) ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}<span className="delete-text-desktop"> {t('admin.deleteEstablishment') || 'Delete'}</span>
                  </button>
                </div>

                {/* Approval Buttons - Only for pending */}
                {establishment.status === 'pending' && (
                  <div className="admin-establishment-approval-buttons-nightlife">
                    <button
                      onClick={() => handleApprove(establishment.id)}
                      disabled={processingIds.has(establishment.id)}
                      className="admin-establishment-approve-button-nightlife"
                    >
                      {processingIds.has(establishment.id) ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    </button>

                    <button
                      onClick={() => handleReject(establishment.id)}
                      disabled={processingIds.has(establishment.id)}
                      className="admin-establishment-reject-button-nightlife"
                    >
                      {processingIds.has(establishment.id) ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      {/* Establishment Modal (Add/Edit) */}
      {(showAddModal || editingEstablishment) && (
        <div className="admin-establishments-modal-overlay-nightlife">
          <Suspense fallback={<LoadingFallback />}>
            <EstablishmentForm
              initialData={editingEstablishment as unknown as Partial<Establishment> | undefined}
              onCancel={() => {
                setShowAddModal(false);
                setEditingEstablishment(null);
              }}
              onSubmit={handleSaveEstablishment}
            />
          </Suspense>
        </div>
      )}

    </div>
  );
};

export default EstablishmentsAdmin;