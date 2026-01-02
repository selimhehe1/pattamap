/**
 * EstablishmentsAdmin Types
 *
 * Shared types for EstablishmentsAdmin components.
 */

import { Establishment } from '../../../types';

export interface AdminEstablishment {
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
export type EditProposalValue = string | number | boolean | null | undefined | string[] | Record<string, unknown>;

/** Edit proposal changes - keys are field names, values are the proposed/current data */
export type EditProposalChanges = Record<string, EditProposalValue>;

export interface EditProposal {
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

export interface EstablishmentsAdminProps {
  onTabChange: (tab: string) => void;
}

// Component Props

export interface EditProposalsSectionProps {
  editProposals: EditProposal[];
  selectedProposal: EditProposal | null;
  processingIds: Set<string>;
  onSelectProposal: (proposal: EditProposal | null) => void;
  onApproveProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
}

export interface BulkActionBarProps {
  selectedIds: Set<string>;
  totalCount: number;
  isBulkProcessing: boolean;
  onToggleSelectAll: () => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onClearSelection: () => void;
}

// Hook return types

export interface UseBulkSelectionReturn {
  selectedIds: Set<string>;
  isBulkProcessing: boolean;
  toggleSelection: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  handleBulkApprove: () => Promise<void>;
  handleBulkReject: () => Promise<void>;
}

// Re-export Establishment for convenience
export type { Establishment };
