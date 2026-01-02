/**
 * Types for EmployeesAdmin components
 * Extracted from the original EmployeesAdmin.tsx for better modularity
 */

export interface EmploymentHistoryEntry {
  id: string;
  employee_id: string;
  establishment_id: string;
  establishment_name: string;
  position?: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AdminEmployee {
  id: string;
  name: string;
  nickname?: string;
  age: number;
  sex: 'male' | 'female' | 'ladyboy'; // v10.x - Gender (required)
  nationality: string[] | null;
  description?: string;
  photos: string[];
  social_media?: SocialMedia;
  status: EmployeeStatus;
  self_removal_requested: boolean;
  is_verified?: boolean;
  verified_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    pseudonym: string;
  };
  employment_history?: EmploymentHistoryEntry[];
}

export interface SocialMedia {
  instagram?: string;
  line?: string;
  telegram?: string;
  whatsapp?: string;
  facebook?: string;
}

export type EmployeeStatus = 'pending' | 'approved' | 'rejected';

export type FilterType = 'all' | 'pending' | 'approved' | 'rejected' | 'pending-edits';

export interface EditProposal {
  id: string;
  item_type: 'employee' | 'establishment';
  item_id: string;
  proposed_changes: Record<string, unknown>;
  current_values: Record<string, unknown>;
  proposed_by: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  proposed_by_user?: {
    id: string;
    pseudonym: string;
  };
}

export interface EmployeesAdminState {
  employees: AdminEmployee[];
  editProposals: EditProposal[];
  isLoading: boolean;
  filter: FilterType;
  processingIds: Set<string>;
  selectedEmployee: AdminEmployee | null;
  editingEmployee: AdminEmployee | null;
  selectedProposal: EditProposal | null;
  establishmentNames: Record<string, string>;
  showEmployeeProfile: boolean;
  profileEmployee: AdminEmployee | null;
}

export interface FilterTab {
  key: FilterType;
  label: string;
  icon: string;
}
