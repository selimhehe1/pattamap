/**
 * AdminDashboard Types
 *
 * Shared types for AdminDashboard components.
 */

export interface DashboardStats {
  totalEstablishments: number;
  pendingEstablishments: number;
  totalEmployees: number;
  pendingEmployees: number;
  pendingClaims: number;
  totalComments: number;
  pendingComments: number;
  reportedComments: number;
  totalUsers: number;
  totalOwners?: number;
  establishmentsWithOwners?: number;
  pendingVerifications?: number;
  totalVerified?: number;
  pendingVIPVerifications?: number;
}

export interface AdminUser {
  id: string;
  pseudonym: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
  stats?: {
    establishments_submitted: number;
    employees_submitted: number;
    comments_made: number;
  };
}

export interface AdminDashboardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export interface AdminProfileModalProps {
  selectedUser: AdminUser;
  onClose: () => void;
}
