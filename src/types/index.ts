export interface User {
  id: string;
  pseudonym: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
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
  services?: string[];
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
  created_by: string;
  created_at: string;
  updated_at: string;
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
  nationality?: string;
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
  average_rating?: number;
  comment_count?: number;
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

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (login: string, password: string) => Promise<void>;
  register: (pseudonym: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
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
  nationality?: string;
  description?: string;
  photos: string[];
  social_media?: {
    instagram?: string;
    facebook?: string;
    line?: string;
    telegram?: string;
    whatsapp?: string;
  };
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
  services?: string[];
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
  employee_nationality?: string;
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