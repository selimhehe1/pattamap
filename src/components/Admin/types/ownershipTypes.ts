/**
 * Types for Establishment Owners Admin
 * Extracted from EstablishmentOwnersAdmin.tsx for better maintainability
 */

export interface EstablishmentOwner {
  id: string;
  user_id: string;
  establishment_id: string;
  owner_role: 'owner' | 'manager';
  permissions: OwnerPermissions;
  assigned_by?: string;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    pseudonym: string;
    email: string;
    account_type?: string;
  };
  establishment?: {
    id: string;
    name: string;
    zone?: string;
    category_id?: string;
  };
  assigner?: {
    id: string;
    pseudonym: string;
  };
}

export interface OwnerPermissions {
  can_edit_info: boolean;
  can_edit_pricing: boolean;
  can_edit_photos: boolean;
  can_edit_employees: boolean;
  can_view_analytics: boolean;
}

export interface AdminEstablishment {
  id: string;
  name: string;
  address: string;
  zone?: string;
  category_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  ownersCount?: number;
}

export interface AdminUser {
  id: string;
  pseudonym: string;
  email: string;
  account_type?: 'regular' | 'employee' | 'establishment_owner';
  role: 'user' | 'moderator' | 'admin';
}

export interface OwnershipRequest {
  id: string;
  user_id: string;
  establishment_id: string;
  status: 'pending' | 'approved' | 'rejected';
  documents_urls: string[];
  verification_code?: string;
  request_message?: string;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    pseudonym: string;
    email: string;
    account_type?: string;
  };
  establishment: {
    id: string;
    name: string;
    address: string;
    zone?: string;
    logo_url?: string;
  };
  reviewer?: {
    id: string;
    pseudonym: string;
  };
}

export type ViewMode = 'owners' | 'requests';
export type FilterMode = 'all' | 'with_owners' | 'without_owners';
export type OwnerRole = 'owner' | 'manager';
