/**
 * Custom hook for EmployeesAdmin state management and API operations
 * Extracted from the original EmployeesAdmin.tsx for better modularity
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSecureFetch } from '../../../../hooks/useSecureFetch';
import { useDialog } from '../../../../hooks/useDialog';
import { logger } from '../../../../utils/logger';
import notification from '../../../../utils/notification';
import { getApiUrl } from '../utils';
import type {
  AdminEmployee,
  EditProposal,
  FilterType,
  EmployeesAdminState,
} from '../types';

interface UseEmployeesAdminReturn extends EmployeesAdminState {
  // State setters
  setFilter: (filter: FilterType) => void;
  setSelectedEmployee: (employee: AdminEmployee | null) => void;
  setEditingEmployee: (employee: AdminEmployee | null) => void;
  setSelectedProposal: (proposal: EditProposal | null) => void;
  setShowEmployeeProfile: (show: boolean) => void;
  setProfileEmployee: (employee: AdminEmployee | null) => void;

  // Actions
  loadEmployees: () => Promise<void>;
  handleApprove: (employeeId: string) => Promise<void>;
  handleReject: (employeeId: string, reason?: string) => Promise<void>;
  handleApproveProposal: (proposalId: string) => Promise<void>;
  handleRejectProposal: (proposalId: string) => Promise<void>;
  handleSaveEmployee: (employeeData: Partial<AdminEmployee>) => Promise<void>;
  handleVerifyEmployee: (employeeId: string, employeeName: string) => Promise<void>;
  handleRevokeVerification: (employeeId: string, employeeName: string) => Promise<void>;
  handleDeleteEmployee: (employeeId: string, employeeName: string) => Promise<void>;

  // Bulk actions
  selectedIds: Set<string>;
  isBulkProcessing: boolean;
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  handleBulkApprove: () => Promise<void>;
  handleBulkReject: () => Promise<void>;

  // Computed
  isProcessing: (id: string) => boolean;
  hasAccess: boolean;
}

export const useEmployeesAdmin = (): UseEmployeesAdminReturn => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { secureFetch } = useSecureFetch();
  const dialog = useDialog();

  // State
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [editProposals, setEditProposals] = useState<EditProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedEmployee, setSelectedEmployee] = useState<AdminEmployee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<AdminEmployee | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<EditProposal | null>(null);
  const [establishmentNames, setEstablishmentNames] = useState<Record<string, string>>({});
  const [showEmployeeProfile, setShowEmployeeProfile] = useState(false);
  const [profileEmployee, setProfileEmployee] = useState<AdminEmployee | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Access control
  const hasAccess = Boolean(user && ['admin', 'moderator'].includes(user.role));

  // Helper to manage processing state
  const addProcessingId = useCallback((id: string) => {
    setProcessingIds((prev) => new Set(prev).add(id));
  }, []);

  const removeProcessingId = useCallback((id: string) => {
    setProcessingIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const isProcessing = useCallback(
    (id: string) => processingIds.has(id),
    [processingIds]
  );

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
    if (selectedIds.size === employees.length && employees.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map((e) => e.id)));
    }
  }, [employees, selectedIds.size]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Load employees based on filter
  const loadEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const API_URL = getApiUrl();

      if (filter === 'pending-edits') {
        const response = await secureFetch(
          `${API_URL}/api/edit-proposals?status=pending&item_type=employee`
        );

        if (response.ok) {
          const data = await response.json();
          setEditProposals(data.proposals || []);
          setEmployees([]);

          // Load establishment names for proposals
          const establishmentIds = new Set<string>();
          data.proposals?.forEach((p: EditProposal) => {
            if (p.proposed_changes?.current_establishment_id) {
              establishmentIds.add(p.proposed_changes.current_establishment_id as string);
            }
            if (p.current_values?.current_establishment_id) {
              establishmentIds.add(p.current_values.current_establishment_id as string);
            }
          });

          if (establishmentIds.size > 0) {
            const estResponse = await secureFetch(
              `${API_URL}/api/establishments?ids=${Array.from(establishmentIds).join(',')}`
            );
            if (estResponse.ok) {
              const estData = await estResponse.json();
              const names: Record<string, string> = {};
              estData.establishments?.forEach((est: { id: string; name: string }) => {
                names[est.id] = est.name;
              });
              setEstablishmentNames(names);
            }
          }
        }
      } else {
        const response = await secureFetch(
          `${API_URL}/api/admin/employees?status=${filter === 'all' ? '' : filter}`
        );

        if (response.ok) {
          const data = await response.json();
          setEmployees(data.employees || []);
          setEditProposals([]);
        }
      }
    } catch (error) {
      logger.error('Failed to load employees:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, secureFetch]);

  // Approve employee
  const handleApprove = useCallback(
    async (employeeId: string) => {
      logger.debug('🔄 handleApprove called for:', employeeId);
      addProcessingId(employeeId);
      try {
        const API_URL = getApiUrl();
        logger.debug('🔄 Making approve request to:', `${API_URL}/api/admin/employees/${employeeId}/approve`);
        const response = await secureFetch(
          `${API_URL}/api/admin/employees/${employeeId}/approve`,
          { method: 'POST' }
        );

        logger.debug('🔄 Approve response:', { status: response.status, ok: response.ok });

        if (response.ok) {
          notification.success(t('admin.employeeApproved', 'Employee approved successfully'));
          await loadEmployees();
        } else {
          const errorData = await response.json().catch(() => ({}));
          logger.error('🔄 Approve failed:', { status: response.status, error: errorData });
          notification.error(errorData.error || t('admin.approveError', 'Failed to approve employee'));
        }
      } catch (error) {
        logger.error('Failed to approve employee:', error);
        notification.error(t('admin.approveError', 'Failed to approve employee'));
      } finally {
        removeProcessingId(employeeId);
      }
    },
    [secureFetch, loadEmployees, addProcessingId, removeProcessingId, t]
  );

  // Reject employee
  const handleReject = useCallback(
    async (employeeId: string, reason?: string) => {
      addProcessingId(employeeId);
      try {
        const API_URL = getApiUrl();
        const response = await secureFetch(
          `${API_URL}/api/admin/employees/${employeeId}/reject`,
          {
            method: 'POST',
            body: JSON.stringify({ reason }),
          }
        );

        if (response.ok) {
          await loadEmployees();
        }
      } catch (error) {
        logger.error('Failed to reject employee:', error);
      } finally {
        removeProcessingId(employeeId);
      }
    },
    [secureFetch, loadEmployees, addProcessingId, removeProcessingId]
  );

  // Approve edit proposal
  const handleApproveProposal = useCallback(
    async (proposalId: string) => {
      addProcessingId(proposalId);
      try {
        const API_URL = getApiUrl();
        const response = await secureFetch(
          `${API_URL}/api/edit-proposals/${proposalId}/approve`,
          {
            method: 'POST',
            body: JSON.stringify({ moderator_notes: 'Approved via Employees tab' }),
          }
        );

        if (response.ok) {
          await loadEmployees();
          setSelectedProposal(null);
        }
      } catch (error) {
        logger.error('Failed to approve proposal:', error);
      } finally {
        removeProcessingId(proposalId);
      }
    },
    [secureFetch, loadEmployees, addProcessingId, removeProcessingId]
  );

  // Reject edit proposal
  const handleRejectProposal = useCallback(
    async (proposalId: string) => {
      addProcessingId(proposalId);
      try {
        const API_URL = getApiUrl();
        const response = await secureFetch(
          `${API_URL}/api/edit-proposals/${proposalId}/reject`,
          {
            method: 'POST',
            body: JSON.stringify({ moderator_notes: 'Rejected via Employees tab' }),
          }
        );

        if (response.ok) {
          await loadEmployees();
          setSelectedProposal(null);
        }
      } catch (error) {
        logger.error('Failed to reject proposal:', error);
      } finally {
        removeProcessingId(proposalId);
      }
    },
    [secureFetch, loadEmployees, addProcessingId, removeProcessingId]
  );

  // Save employee edits
  const handleSaveEmployee = useCallback(
    async (employeeData: Partial<AdminEmployee>) => {
      if (!editingEmployee) return;

      // DEBUG: Log what we're sending to API
      console.log('🏢 handleSaveEmployee received:', JSON.stringify({
        current_establishment_id: (employeeData as Record<string, unknown>).current_establishment_id,
        keys: Object.keys(employeeData)
      }));

      try {
        const API_URL = getApiUrl();
        const response = await secureFetch(
          `${API_URL}/api/admin/employees/${editingEmployee.id}`,
          {
            method: 'PUT',
            body: JSON.stringify(employeeData),
          }
        );

        if (response.ok) {
          await loadEmployees();
          setEditingEmployee(null);
        } else {
          throw new Error('Failed to update employee');
        }
      } catch (error) {
        logger.error('Failed to save employee:', error);
        notification.error('Failed to update employee');
      }
    },
    [editingEmployee, secureFetch, loadEmployees]
  );

  // Verify employee profile
  const handleVerifyEmployee = useCallback(
    async (employeeId: string, employeeName: string) => {
      const confirmed = window.confirm(
        `Verify profile for ${employeeName}?\n\nThis will add a verified badge to their profile.`
      );

      if (!confirmed) return;

      addProcessingId(employeeId);
      try {
        const API_URL = getApiUrl();
        const response = await secureFetch(
          `${API_URL}/api/verifications/${employeeId}/verify`,
          {
            method: 'POST',
            body: JSON.stringify({
              selfie_url: '',
              admin_approved: true,
            }),
          }
        );

        if (response.ok) {
          notification.success(`Profile verified for ${employeeName}`);
          await loadEmployees();
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to verify profile');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to verify profile';
        logger.error('Failed to verify profile:', error);
        notification.error(errorMessage);
      } finally {
        removeProcessingId(employeeId);
      }
    },
    [secureFetch, loadEmployees, addProcessingId, removeProcessingId]
  );

  // Revoke verification
  const handleRevokeVerification = useCallback(
    async (employeeId: string, employeeName: string) => {
      const reason = await dialog.prompt(
        t('admin.revokeVerificationPrompt', `Revoke verification for ${employeeName}?\n\nPlease provide a reason:`),
        {
          required: true,
          minLength: 10,
          variant: 'danger',
          placeholder: t('admin.enterRevocationReason', 'Enter revocation reason...'),
        }
      );

      if (!reason) return;

      addProcessingId(employeeId);
      try {
        const API_URL = getApiUrl();
        const response = await secureFetch(
          `${API_URL}/api/verifications/employees/${employeeId}/verification`,
          {
            method: 'DELETE',
            body: JSON.stringify({ reason }),
          }
        );

        if (response.ok) {
          notification.success(`Verification revoked for ${employeeName}`);
          await loadEmployees();
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to revoke verification');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to revoke verification';
        logger.error('Failed to revoke verification:', error);
        notification.error(errorMessage);
      } finally {
        removeProcessingId(employeeId);
      }
    },
    [t, dialog, secureFetch, loadEmployees, addProcessingId, removeProcessingId]
  );

  // Delete employee permanently
  const handleDeleteEmployee = useCallback(
    async (employeeId: string, employeeName: string) => {
      const confirmed = window.confirm(
        `DELETE "${employeeName}" permanently?\n\nThis action cannot be undone. All related data (employment history, reviews, favorites, etc.) will also be deleted.`
      );

      if (!confirmed) return;

      addProcessingId(employeeId);
      try {
        const API_URL = getApiUrl();
        const response = await secureFetch(
          `${API_URL}/api/employees/${employeeId}`,
          { method: 'DELETE' }
        );

        if (response.ok) {
          notification.success(`Employee "${employeeName}" deleted successfully`);
          await loadEmployees();
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete employee');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete employee';
        logger.error('Failed to delete employee:', error);
        notification.error(errorMessage);
      } finally {
        removeProcessingId(employeeId);
      }
    },
    [secureFetch, loadEmployees, addProcessingId, removeProcessingId]
  );

  // Bulk approve selected employees
  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsBulkProcessing(true);
    const API_URL = getApiUrl();
    let successCount = 0;
    let failCount = 0;

    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        try {
          const response = await secureFetch(
            `${API_URL}/api/admin/employees/${id}/approve`,
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
        notification.success(t('admin.bulkApproveSuccess', `${successCount} employee(s) approved`));
      }
      if (failCount > 0) {
        notification.error(t('admin.bulkApproveFailed', `${failCount} employee(s) failed to approve`));
      }

      clearSelection();
      await loadEmployees();
    } finally {
      setIsBulkProcessing(false);
    }
  }, [selectedIds, secureFetch, t, clearSelection, loadEmployees]);

  // Bulk reject selected employees
  const handleBulkReject = useCallback(async () => {
    if (selectedIds.size === 0) return;

    const reason = await dialog.prompt(
      t('admin.bulkRejectPrompt', `Reject ${selectedIds.size} employee(s)?\n\nPlease provide a reason:`),
      {
        required: true,
        minLength: 10,
        variant: 'danger',
        placeholder: t('admin.enterRejectionReason', 'Enter rejection reason...'),
      }
    );

    if (!reason) return;

    setIsBulkProcessing(true);
    const API_URL = getApiUrl();
    let successCount = 0;
    let failCount = 0;

    try {
      const promises = Array.from(selectedIds).map(async (id) => {
        try {
          const response = await secureFetch(
            `${API_URL}/api/admin/employees/${id}/reject`,
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
        notification.success(t('admin.bulkRejectSuccess', `${successCount} employee(s) rejected`));
      }
      if (failCount > 0) {
        notification.error(t('admin.bulkRejectFailed', `${failCount} employee(s) failed to reject`));
      }

      clearSelection();
      await loadEmployees();
    } finally {
      setIsBulkProcessing(false);
    }
  }, [selectedIds, dialog, t, secureFetch, clearSelection, loadEmployees]);

  // Load employees when filter changes
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Manage body scroll when profile modal is open
  useEffect(() => {
    if (showEmployeeProfile) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showEmployeeProfile]);

  return {
    // State
    employees,
    editProposals,
    isLoading,
    filter,
    processingIds,
    selectedEmployee,
    editingEmployee,
    selectedProposal,
    establishmentNames,
    showEmployeeProfile,
    profileEmployee,

    // State setters
    setFilter,
    setSelectedEmployee,
    setEditingEmployee,
    setSelectedProposal,
    setShowEmployeeProfile,
    setProfileEmployee,

    // Actions
    loadEmployees,
    handleApprove,
    handleReject,
    handleApproveProposal,
    handleRejectProposal,
    handleSaveEmployee,
    handleVerifyEmployee,
    handleRevokeVerification,
    handleDeleteEmployee,

    // Bulk actions
    selectedIds,
    isBulkProcessing,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    handleBulkApprove,
    handleBulkReject,

    // Computed
    isProcessing,
    hasAccess,
  };
};
