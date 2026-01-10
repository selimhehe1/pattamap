/**
 * Employee Helper Types
 *
 * Type definitions and interfaces for employee-related operations
 */

export interface CurrentEmploymentRecord {
  is_current: boolean;
  establishment_id?: string;
  establishment?: {
    zone?: string;
    category_id?: number;
  };
}

export interface IndependentPositionRecord {
  id: string;
  employee_id: string;
  is_active: boolean;
  zone?: string;
  grid_row?: number;
  grid_col?: number;
}

export interface RatingData {
  employee_id: string;
  rating: number;
  created_at?: string;
}

export interface VoteData {
  employee_id: string;
}

export interface SearchFilterOptions {
  type?: string;
  category_id?: string | number;
  establishment_id?: string;
  normalizedZoneFilter?: string | null;
  languages?: string;
  has_photos?: string;
  social_media?: string;
}

// Base employee interface for generic functions
export interface BaseEmployee {
  id: string;
}

// Employee with rating fields
export interface EmployeeWithRatings extends BaseEmployee {
  average_rating?: number | null;
  comment_count?: number;
  is_vip?: boolean;
  vip_expires_at?: string;
}

// Employee with sorting fields
export interface EmployeeWithSortFields extends EmployeeWithRatings {
  name?: string;
  age?: number;
  nationality?: string[];
  created_at?: string;
  relevance_score?: number;
}

// Employee with search fields
export interface EmployeeWithSearchFields extends BaseEmployee {
  name?: string;
  nickname?: string;
  description?: string;
  nationality?: string[];
  is_vip?: boolean;
  vip_expires_at?: string;
  is_verified?: boolean;
}

// Employee with filter fields
export interface EmployeeWithFilterFields {
  current_employment?: CurrentEmploymentRecord[];
  independent_position?: IndependentPositionRecord[];
  is_freelance?: boolean;
  freelance_zone?: string;
  languages_spoken?: string[];
  photos?: string[];
  social_media?: Record<string, string>;
}
