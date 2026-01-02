/**
 * BulkActionBar Component
 *
 * Toolbar for bulk selection and batch operations on establishments.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Loader2 } from 'lucide-react';
import type { BulkActionBarProps } from './types';

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedIds,
  totalCount,
  isBulkProcessing,
  onToggleSelectAll,
  onBulkApprove,
  onBulkReject,
  onClearSelection
}) => {
  const { t } = useTranslation();
  const hasSelection = selectedIds.size > 0;
  const allSelected = selectedIds.size === totalCount && totalCount > 0;

  return (
    <div className={`cmd-table__bulk-bar ${hasSelection ? 'cmd-table__bulk-bar--visible' : ''}`}>
      <div className="cmd-table__bulk-left">
        <label className="cmd-table__checkbox-label">
          <input
            type="checkbox"
            className="cmd-table__checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
          />
          {t('admin.selectAll', 'Select All')}
        </label>
        {hasSelection && (
          <span className="cmd-table__bulk-count">
            ({selectedIds.size} {t('admin.selected', 'selected')})
          </span>
        )}
      </div>

      {hasSelection && (
        <div className="cmd-table__bulk-actions">
          <button
            onClick={onBulkApprove}
            disabled={isBulkProcessing}
            className="cmd-modal-btn cmd-modal-btn--success cmd-modal-btn--sm"
          >
            {isBulkProcessing ? (
              <Loader2 size={16} className="cmd-spin" />
            ) : (
              <Check size={16} />
            )}
            {t('admin.approveSelected', 'Approve')}
          </button>
          <button
            onClick={onBulkReject}
            disabled={isBulkProcessing}
            className="cmd-modal-btn cmd-modal-btn--danger cmd-modal-btn--sm"
          >
            {isBulkProcessing ? (
              <Loader2 size={16} className="cmd-spin" />
            ) : (
              <X size={16} />
            )}
            {t('admin.rejectSelected', 'Reject')}
          </button>
          <button
            onClick={onClearSelection}
            disabled={isBulkProcessing}
            className="cmd-modal-btn cmd-modal-btn--ghost cmd-modal-btn--sm"
          >
            {t('admin.clearSelection', 'Clear')}
          </button>
        </div>
      )}
    </div>
  );
};

export default BulkActionBar;
