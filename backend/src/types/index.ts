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

export interface Establishment {
  id: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  category_id: string;
  category?: EstablishmentCategory;
  description?: string;
  phone?: string;
  website?: string;
  opening_hours?: any;
  services?: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  created_at: string;
  updated_at: string;
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
  current_establishment_id?: string;
  position?: string;
  start_date?: string;
  freelance_position?: {
    grid_row: number;
    grid_col: number;
  };
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
  opening_hours?: any;
  services?: string[];
}

export interface CreateCommentRequest {
  employee_id: string;
  content: string;
  rating?: number;
  parent_comment_id?: string;
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