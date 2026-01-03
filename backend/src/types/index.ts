export interface User {
  id: string;
  pseudonym: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  account_type?: 'regular' | 'employee' | 'establishment_owner'; // v10.0 - Employee Claim System
  avatar_url?: string | null; // v10.4 - Profile photo (Cloudinary URL)
  linked_employee_id?: string; // v10.0 - Link to employee profile
  created_at: string;
  updated_at: string;
}

export interface EstablishmentCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface Establishment {
  id: string;
  name: string;
  address: string;
  zone?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  category_id: string;
  category?: EstablishmentCategory;
  description?: string;
  phone?: string;
  website?: string;
  opening_hours?: Record<string, string | string[]>;
  // Social media links (v10.1)
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  status: 'pending' | 'approved' | 'rejected';
  is_vip?: boolean; // 🆕 v10.3 Phase 5 - VIP status
  vip_expires_at?: string | null; // 🆕 v10.3 Phase 5 - VIP expiration
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  name: string;
  nickname?: string;
  age?: number;
  sex: 'male' | 'female' | 'ladyboy'; // v10.x - Gender (required)
  nationality?: string[] | null; // Array for multiple nationalities (max 2 for "half/mixed")
  description?: string;
  photos: string[];
  social_media?: {
    instagram?: string;
    facebook?: string;
    line?: string;
    telegram?: string;
    whatsapp?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  self_removal_requested: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  current_employment?: EmploymentHistory[];
  employment_history?: EmploymentHistory[];
  independent_position?: IndependentPosition;
}

export interface EmploymentHistory {
  id: string;
  employee_id: string;
  establishment_id: string;
  establishment?: Establishment;
  position?: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  employee_id: string;
  user_id: string;
  user?: User;
  content: string;
  rating?: number;
  parent_comment_id?: string;
  replies?: Comment[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  comment_id: string;
  comment?: Comment;
  reported_by: string;
  reporter?: User;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  reviewed_by?: string;
  reviewer?: User;
  created_at: string;
  updated_at: string;
}

export interface ModerationItem {
  id: string;
  item_type: 'employee' | 'establishment' | 'comment';
  item_id: string;
  item_data?: Employee | Establishment | Comment;
  submitted_by: string;
  submitter?: User;
  status: 'pending' | 'approved' | 'rejected';
  moderator_id?: string;
  moderator?: User;
  moderator_notes?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface CreateEmployeeRequest {
  name: string;
  nickname?: string;
  age?: number;
  sex: 'male' | 'female' | 'ladyboy'; // v10.x - Gender (required)
  nationality?: string[] | null; // Array for multiple nationalities (max 2 for "half/mixed")
  description?: string;
  photos: string[];
  social_media?: {
    instagram?: string;
    facebook?: string;
    line?: string;
    telegram?: string;
    whatsapp?: string;
  };
  is_freelance?: boolean;
  // Request fields only - NOT stored in employees table
  // Used to create/update employment_history records (the source of truth)
  current_establishment_id?: string;
  current_establishment_ids?: string[];
  position?: string;
  start_date?: string;
  // freelance_position DEPRECATED in v10.3 - Freelances no longer have independent map positions
}

export interface CreateEstablishmentRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category_id: string;
  description?: string;
  phone?: string;
  website?: string;
  opening_hours?: Record<string, string | string[]>;
  // Social media links (v10.1)
  instagram?: string;
  twitter?: string;
  tiktok?: string;
}

export interface CreateCommentRequest {
  employee_id: string;
  content: string;
  rating?: number;
  parent_comment_id?: string;
  photo_urls?: string[]; // v10.4 - Photos in reviews (max 3)
}

// v10.4 - Comment photo interface
export interface CommentPhoto {
  id: string;
  comment_id: string;
  photo_url: string;
  cloudinary_public_id: string;
  display_order: number;
  created_at: string;
}

export interface IndependentPosition {
  id: string;
  employee_id: string;
  zone: string;
  grid_row: number;
  grid_col: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateIndependentPositionRequest {
  employee_id: string;
  zone: string;
  grid_row: number;
  grid_col: number;
}

export interface UpdateIndependentPositionRequest {
  zone?: string;
  grid_row?: number;
  grid_col?: number;
  is_active?: boolean;
}

export interface EstablishmentOwner {
  id: string;
  user_id: string;
  establishment_id: string;
  owner_role: 'owner' | 'manager';
  permissions: {
    can_edit_info: boolean;
    can_edit_pricing: boolean;
    can_edit_photos: boolean;
    can_edit_employees: boolean;
    can_view_analytics: boolean;
  };
  assigned_by?: string;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  // Populated fields
  user?: User;
  establishment?: Establishment;
  assigner?: User;
}

export interface CreateEstablishmentOwnerRequest {
  user_id: string;
  establishment_id: string;
  owner_role?: 'owner' | 'manager';
  permissions?: {
    can_edit_info?: boolean;
    can_edit_pricing?: boolean;
    can_edit_photos?: boolean;
    can_edit_employees?: boolean;
    can_view_analytics?: boolean;
  };
}

// v10.2 - Ownership Requests System
export interface EstablishmentOwnershipRequest {
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
  // Populated fields
  user?: User;
  establishment?: Establishment;
  reviewer?: User;
}

export interface CreateOwnershipRequestRequest {
  establishment_id?: string; // Optional if creating new establishment
  documents_urls: string[];
  verification_code?: string;
  request_message?: string;
  // New establishment data (if establishment doesn't exist yet)
  establishment_data?: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    category_id: string;
    zone?: string;
    description?: string;
    phone?: string;
    website?: string;
    opening_hours?: Record<string, string | string[]>;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
}

export interface ReviewOwnershipRequestRequest {
  admin_notes?: string;
  permissions?: {
    can_edit_info?: boolean;
    can_edit_pricing?: boolean;
    can_edit_photos?: boolean;
    can_edit_employees?: boolean;
    can_view_analytics?: boolean;
  };
  owner_role?: 'owner' | 'manager';
}

// v10.2 - Notifications System
export type NotificationType =
  // Ownership Requests (existing)
  | 'ownership_request_submitted'
  | 'ownership_request_approved'
  | 'ownership_request_rejected'
  | 'new_ownership_request'

  // Verification System (NEW v10.3)
  | 'new_verification_request'
  | 'verification_submitted'
  | 'verification_approved'
  | 'verification_rejected'
  | 'verification_revoked'

  // VIP System (NEW v10.3)
  | 'vip_purchase_confirmed'
  | 'vip_payment_verified'
  | 'vip_payment_rejected'
  | 'vip_subscription_cancelled'

  // Edit Proposals (NEW v10.3)
  | 'edit_proposal_submitted'
  | 'edit_proposal_approved'
  | 'edit_proposal_rejected'

  // Establishment Owners (NEW v10.3)
  | 'establishment_owner_assigned'
  | 'establishment_owner_removed'
  | 'establishment_owner_permissions_updated'

  // Moderation
  | 'content_pending_review' // NEW - notifies creator their content is pending
  | 'employee_approved'
  | 'employee_rejected'
  | 'establishment_approved'
  | 'establishment_rejected'
  | 'comment_approved'
  | 'comment_rejected'
  | 'comment_removed' // NEW v10.3

  // Social
  | 'comment_reply'
  | 'comment_mention'
  | 'new_favorite'
  | 'favorite_available'

  // Employee Updates
  | 'employee_profile_updated'
  | 'employee_photos_updated'
  | 'employee_position_changed'

  // Admin/Moderator
  | 'new_content_pending'
  | 'new_report'
  | 'moderation_action_required'

  // System
  | 'system'
  | 'other';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: {
    i18n_key?: string;
    i18n_params?: Record<string, unknown>;
    [key: string]: unknown; // Allow additional metadata fields
  };
}

export interface CreateNotificationRequest {
  user_id: string;
  type: NotificationType;
  // i18n support (v10.3 - NEW)
  i18n_key?: string; // e.g., 'notifications.verificationApproved'
  i18n_params?: Record<string, unknown>; // e.g., { employeeName: 'Lisa', establishmentName: 'Club XYZ' }
  // Backward compatibility (optional when i18n_key provided)
  title?: string;
  message?: string;
  // Common fields
  link?: string;
  related_entity_type?: string;
  related_entity_id?: string;
}