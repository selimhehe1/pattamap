export interface User {
  id: string;
  pseudonym: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  account_type?: 'regular' | 'employee' | 'establishment_owner'; // 🆕 v10.0
  linked_employee_id?: string | null; // 🆕 v10.0
  linkedEmployee?: {
    id: string;
    name: string;
    nickname?: string;
    photos: string[];
    status: 'pending' | 'approved' | 'rejected';
  } | null; // 🆕 v10.0 - Populated from backend
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

export interface ConsumableTemplate {
  id: string;
  name: string;
  category: 'beer' | 'shot' | 'cocktail' | 'spirit' | 'wine' | 'soft';
  icon: string;
  default_price?: number;
  status: 'active' | 'inactive';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Establishment {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  zone?: string; // Zone personnalisée (soi6, walkingstreet, beachroad, lkmetro)
  // Grid system for zone layouts (15x2 grid)
  grid_row?: number; // 1-2 (top/bottom row)
  grid_col?: number; // 1-15 (column position)
  category_id: number | string; // Integer from Supabase (number) or legacy format (string)
  category?: EstablishmentCategory;
  logo_url?: string; // Cloudinary URL for establishment logo
  description?: string;
  phone?: string;
  website?: string;
  opening_hours?: OpeningHours;
  services?: string[]; // Deprecated: replaced by social media fields (instagram, twitter, tiktok)
  // Social media links (v10.1)
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  // Colonnes de prix individuelles (remplace l'objet pricing)
  ladydrink?: string;
  barfine?: string;
  rooms?: string;
  // Deprecated: pricing object - utiliser les colonnes directes ci-dessus
  pricing?: {
    consumables: Array<{
      consumable_id: string;
      price: string;
    }>;
    ladydrink: string;
    barfine: string;
    rooms: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  is_vip?: boolean; // 🆕 v10.3 Phase 5 - VIP status
  vip_expires_at?: string | null; // 🆕 v10.3 Phase 5 - VIP expiration
  has_owner?: boolean; // 🆕 v10.3 - True if establishment has verified owner
  created_by: string;
  created_at: string;
  updated_at: string;
  employee_count?: number; // Nombre d'employées actuellement dans cet établissement
  approved_employee_count?: number; // Nombre d'employées approuvées (status='approved') dans cet établissement
}

// Grid system types
export interface GridPosition {
  row: 1 | 2; // 2 rows max
  col: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15; // 15 columns max
}

export interface VisualPosition {
  x: number; // Percentage position (0-100)
  y: number; // Percentage position (0-100)
}

// Types pour les cartes personnalisées
export interface CustomBar {
  id: string;
  name: string;
  type: 'gogo' | 'beer' | 'pub' | 'nightclub' | 'massage';
  // Support both grid and visual positions for backward compatibility
  gridPosition?: GridPosition;
  position: VisualPosition; // Required - always provided by establishmentToVisualBar
  color: string;
  description?: string;
  category?: EstablishmentCategory;
  icon?: string;
}

export interface Employee {
  id: string;
  name: string;
  nickname?: string;
  age?: number;
  nationality?: string[] | null; // v10.4: Array for multiple nationalities (max 2 for "half/mixed")
  languages_spoken?: string[] | null; // v10.5: Languages spoken (Thai, English, Chinese, Russian, etc.)
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
  user_id?: string | null; // 🆕 v10.0 - Link to user account
  is_self_profile?: boolean; // 🆕 v10.0 - Self-managed profile flag
  is_freelance?: boolean; // 🆕 v10.x - Simple freelance mode (no map position required)
  freelance_zone?: string | null; // 🆕 v10.x - Zone where freelance works (e.g., 'beachroad')
  is_verified?: boolean; // 🆕 v10.2 - Profile verification status
  verified_at?: string | null; // 🆕 v10.2 - Verification timestamp
  is_vip?: boolean; // 🆕 v10.3 Phase 0 - VIP status
  vip_expires_at?: string | null; // 🆕 v10.3 Phase 0 - VIP expiration
  created_by: string;
  created_at: string;
  updated_at: string;
  current_employment?: EmploymentHistory[];
  employment_history?: EmploymentHistory[];
  average_rating?: number;
  comment_count?: number;
  vote_count?: number; // 🆕 Number of existence votes
  total_views?: number; // Analytics: total profile views
  total_favorites?: number; // Analytics: total times favorited
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
  /** Used when creating a reply (request body) */
  parent_comment_id?: string;
  /** Used in API response for replies */
  parent_id?: string | null;
  replies?: Comment[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

/** Comment with guaranteed replies array for threaded display */
export interface ThreadedComment extends Comment {
  replies: ThreadedComment[];
}

/** Data sent when submitting a review */
export interface ReviewSubmitData {
  employee_id: string;
  content: string;
  rating?: number;
  parent_comment_id?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (login: string, password: string) => Promise<void>;
  register: (pseudonym: string, email: string, password: string, accountType?: 'regular' | 'employee' | 'establishment_owner') => Promise<{ csrfToken: string | null; passwordBreached: boolean } | undefined>; // 🔧 Returns fresh CSRF token + breach warning flag - v10.1 added establishment_owner
  logout: () => void;
  loading: boolean;
  claimEmployeeProfile?: (employeeId: string, message: string, verificationProof?: string[], explicitToken?: string) => Promise<void>; // 🔧 Accepts explicit token
  linkedEmployeeProfile?: Employee | null; // 🆕 v10.0 - Full employee profile for linked accounts
  refreshLinkedProfile?: (skipCheck?: boolean) => Promise<void>; // 🆕 v10.0 - Refresh linked profile data (skipCheck bypasses user state check)
  submitOwnershipRequest?: (establishmentId: string, documentUrls: string[], requestMessage?: string, contactMe?: boolean, explicitToken?: string) => Promise<void>; // 🆕 v10.x - Submit ownership request during registration
}

// 🚀 PHASE 2: Interfaces strictes pour éliminer tous les types 'any'

export interface OpeningHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
  [key: string]: string | undefined;
}

export interface EmployeeFormData {
  name: string;
  nickname?: string;
  age?: number;
  nationality?: string[] | null; // v10.4: Array for multiple nationalities (max 2 for "half/mixed")
  languages_spoken?: string[] | null; // v10.5: Languages spoken (Thai, English, Chinese, Russian, etc.)
  description?: string;
  photos: string[];
  social_media?: {
    instagram?: string;
    facebook?: string;
    line?: string;
    telegram?: string;
    whatsapp?: string;
  };
  current_establishment_id?: string | null; // v10.6: Current establishment (null = clear)
  is_freelance?: boolean; // v10.6: Freelance mode
}

export interface EstablishmentFormData {
  name: string;
  address: string;
  zone?: string;
  category_id: number | string; // Integer from Supabase (number) or legacy format (string)
  logo_url?: string; // Cloudinary URL for establishment logo
  description?: string;
  phone?: string;
  website?: string;
  opening_hours?: OpeningHours;
  services?: string[]; // Deprecated: replaced by social media fields (instagram, twitter, tiktok)
  // Social media links (v10.1)
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  // Colonnes de prix individuelles
  ladydrink?: string;
  barfine?: string;
  rooms?: string;
  // Deprecated: pricing object - utiliser les colonnes directes ci-dessus
  pricing?: {
    consumables: Array<{
      consumable_id: string;
      price: string;
    }>;
    ladydrink: string;
    barfine: string;
    rooms: string;
  };
}

export interface ReviewFormData {
  employee_id: string;
  content: string;
  rating: number;
  parent_comment_id?: string;
}

export interface CloudinaryUploadResponse {
  images: Array<{
    url: string;
    public_id: string;
  }>;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AdminStats {
  totalEstablishments: number;
  pendingEstablishments: number;
  totalEmployees: number;
  pendingEmployees: number;
  totalUsers: number;
  totalComments: number;
  pendingComments: number;
  reportedComments: number;
}

export interface ModuleHandlers {
  establishments: (establishment: Establishment) => void;
  employees: (employee: Employee) => void;
  submitEmployee: (employeeData: EmployeeFormData) => Promise<void>;
  submitEstablishment: (establishmentData: EstablishmentFormData) => Promise<void>;
}

export interface Favorite {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_nickname?: string;
  employee_photos: string[];
  employee_age?: number;
  employee_nationality?: string[] | null; // v10.4: Array for multiple nationalities
  employee_description?: string;
  employee_social_media?: {
    instagram?: string;
    facebook?: string;
    line?: string;
    telegram?: string;
    whatsapp?: string;
  };
  employee_rating: number;
  employee_comment_count: number;
  current_establishment?: {
    id: string;
    name: string;
    zone: string;
    address: string;
  } | null;
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

/** Freelance position with embedded employee data for map rendering */
export interface FreelanceWithEmployee extends IndependentPosition {
  employee?: Employee;
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

// ==========================================
// 🆕 EMPLOYEE CLAIM SYSTEM TYPES (v10.0)
// ==========================================

export interface EmployeeClaimRequest {
  id: string;
  item_type: 'employee_claim';
  item_id: string; // employee_id
  submitted_by: string; // user_id
  status: 'pending' | 'approved' | 'rejected';
  moderator_id?: string | null;
  moderator_notes?: string | null;
  request_metadata?: {
    message: string;
    employee_id: string;
    user_id: string;
    claimed_at: string;
  };
  verification_proof?: string[] | null;
  created_at: string;
  reviewed_at?: string | null;
  // Populated by backend joins
  submitted_by_user?: {
    id: string;
    pseudonym: string;
    email: string;
  };
  moderator_user?: {
    id: string;
    pseudonym: string;
  };
  employee?: {
    id: string;
    name: string;
    nickname?: string;
    photos: string[];
  };
}

// ==========================================
// 🆕 ESTABLISHMENT OWNERS SYSTEM (v10.1)
// ==========================================

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

// =====================================================
// 🆕 v10.3 Phase 1 - VIP SUBSCRIPTIONS (SIMPLIFIED)
// =====================================================
// IMPORTANT: No more "basic"/"premium" tiers
// - Employee VIP: tier = 'employee'
// - Establishment VIP: tier = 'establishment'

export type VIPTier = 'employee' | 'establishment'; // Simplified from 'basic' | 'premium'
export type VIPDuration = 7 | 30 | 90 | 365;
export type VIPSubscriptionType = 'employee' | 'establishment';
export type PaymentMethod = 'promptpay' | 'cash' | 'admin_grant';
export type VIPStatus = 'active' | 'expired' | 'cancelled' | 'pending_payment';

export interface VIPPrice {
  duration: VIPDuration;
  price: number; // THB
  discount: number; // percentage (0-100)
  originalPrice?: number; // THB (before discount)
  popular?: boolean; // highlight this option
}

export interface VIPTypeConfig {
  name: string;
  description: string;
  features: string[];
  prices: VIPPrice[];
}

// Keep legacy name for backward compatibility
export type VIPTierConfig = VIPTypeConfig;

export interface VIPSubscription {
  id: string;
  employee_id?: string;
  establishment_id?: string;
  status: VIPStatus;
  tier: VIPTier;
  duration: VIPDuration;
  starts_at: string;
  expires_at: string;
  cancelled_at?: string | null;
  payment_method: PaymentMethod;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  price_paid: number;
  transaction_id?: string;
  admin_verified_by?: string | null;
  admin_verified_at?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseVIPRequest {
  subscription_type: VIPSubscriptionType;
  entity_id: string; // employee_id or establishment_id
  tier?: VIPTier; // Optional - auto-assigned based on subscription_type
  duration: VIPDuration;
  payment_method: PaymentMethod;
}

export interface VIPPurchaseResponse {
  success: boolean;
  message: string;
  subscription: {
    id: string;
    type: VIPSubscriptionType;
    entity_id: string;
    tier: VIPTier;
    duration: VIPDuration;
    status: VIPStatus;
    starts_at: string;
    expires_at: string;
    price_paid: number;
  };
  transaction: {
    id: string;
    amount: number;
    currency: string;
    payment_method: PaymentMethod;
    payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  };
}