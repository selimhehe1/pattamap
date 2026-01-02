/**
 * useBulkSelection Hook
 *
 * Manages bulk selection and batch operations for establishments.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSecureFetch } from '../../../hooks/useSecureFetch';
import { useDialog } from '../../../hooks/useDialog';
import toast from '../../../utils/toast';
import type { AdminEstablishment } from './types';

interface UseBulkSelectionOptions {
  establishments: AdminEstablishment[];
  onSuccess: () => void;
}

export function useBulkSelection({ establishments, onSuccess }: UseBulkSelectionOptions) {
  const { t } = useTranslation();
  const { secureFetch } = useSecureFetch();
  const dialog = useDialog();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

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

  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsBulkProcessing(true);
    const API_URL = import.meta.env.VITE_API_URL || '';
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
      onSuccess();
    } finally {
      setIsBulkProcessing(false);
    }
  }, [selectedIds, secureFetch, t, clearSelection, onSuccess]);

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
    const API_URL = import.meta.env.VITE_API_URL || '';
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
      onSuccess();
    } finally {
      setIsBulkProcessing(false);
    }
  }, [selectedIds, dialog, t, secureFetch, clearSelection, onSuccess]);

  return {
    selectedIds,
    isBulkProcessing,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    handleBulkApprove,
    handleBulkReject
  };
}
