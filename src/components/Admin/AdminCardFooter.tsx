/**
 * AdminCardFooter - Reusable footer component for admin cards
 *
 * Eliminates duplicate approve/reject button patterns across admin cards.
 * Handles loading states, stopPropagation, and consistent styling.
 *
 * Usage:
 * <AdminCardFooter
 *   itemId={item.id}
 *   onApprove={handleApprove}
 *   onReject={handleReject}
 *   isProcessing={isProcessing}
 * />
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Loader2, FileEdit, Trash2, Edit } from 'lucide-react';

export type AdminActionType = 'approve' | 'reject' | 'dismiss' | 'delete' | 'edit';

export interface AdminCardAction {
  /** Action type determines icon and styling */
  type: AdminActionType;
  /** Callback when button clicked (receives itemId) */
  onClick: (id: string) => void;
  /** Custom label (optional, defaults to translation) */
  label?: string;
  /** Whether this specific action is processing */
  isProcessing?: boolean;
}

export interface AdminCardFooterProps {
  /** ID of the item this footer belongs to */
  itemId: string;
  /** Whether any action is processing (disables all buttons) */
  isProcessing?: boolean;
  /** Quick approve action */
  onApprove?: (id: string) => void;
  /** Quick reject action */
  onReject?: (id: string) => void;
  /** Optional dismiss action (for reported items) */
  onDismiss?: (id: string) => void;
  /** Custom actions (overrides onApprove/onReject if provided) */
  actions?: AdminCardAction[];
  /** Additional className for the footer */
  className?: string;
}

const ACTION_CONFIG: Record<AdminActionType, {
  icon: React.ElementType;
  translationKey: string;
  className: string;
}> = {
  approve: {
    icon: CheckCircle,
    translationKey: 'admin.approve',
    className: 'aec-footer-btn--approve'
  },
  reject: {
    icon: XCircle,
    translationKey: 'admin.reject',
    className: 'aec-footer-btn--reject'
  },
  dismiss: {
    icon: FileEdit,
    translationKey: 'admin.dismiss',
    className: 'aec-footer-btn--dismiss'
  },
  delete: {
    icon: Trash2,
    translationKey: 'admin.delete',
    className: 'aec-footer-btn--reject'
  },
  edit: {
    icon: Edit,
    translationKey: 'admin.edit',
    className: 'aec-footer-btn--edit'
  }
};

/**
 * Single action button with consistent styling
 */
const ActionButton: React.FC<{
  action: AdminCardAction;
  itemId: string;
  globalProcessing: boolean;
}> = ({ action, itemId, globalProcessing }) => {
  const { t } = useTranslation();
  const config = ACTION_CONFIG[action.type];
  const Icon = config.icon;
  const isLoading = action.isProcessing || globalProcessing;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoading) {
      action.onClick(itemId);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`aec-footer-btn ${config.className}`}
    >
      {isLoading ? (
        <Loader2 size={14} className="aec-icon--spin" />
      ) : (
        <>
          <Icon size={14} />
          {action.label || t(config.translationKey)}
        </>
      )}
    </button>
  );
};

/**
 * Admin card footer with approve/reject actions
 */
export const AdminCardFooter: React.FC<AdminCardFooterProps> = ({
  itemId,
  isProcessing = false,
  onApprove,
  onReject,
  onDismiss,
  actions: customActions,
  className = ''
}) => {
  // Build actions list
  const actions: AdminCardAction[] = customActions || [
    ...(onApprove ? [{ type: 'approve' as const, onClick: onApprove }] : []),
    ...(onReject ? [{ type: 'reject' as const, onClick: onReject }] : []),
    ...(onDismiss ? [{ type: 'dismiss' as const, onClick: onDismiss }] : [])
  ];

  if (actions.length === 0) return null;

  return (
    <div className={`aec-footer ${className}`}>
      {actions.map((action, index) => (
        <ActionButton
          key={`${action.type}-${index}`}
          action={action}
          itemId={itemId}
          globalProcessing={isProcessing}
        />
      ))}
    </div>
  );
};

export default AdminCardFooter;
