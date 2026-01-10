/**
 * Establishment Helper Types
 *
 * Type definitions, interfaces, and constants for establishment operations
 */

// Database types for establishment queries
export interface DbEstablishmentWithLocation {
  id: string;
  name: string;
  address: string;
  zone: string;
  grid_row?: number;
  grid_col?: number;
  category_id: number;
  description?: string;
  phone?: string;
  website?: string;
  location?: string;
  opening_hours?: Record<string, unknown>;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  logo_url?: string;
  is_vip?: boolean;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  category?: { id: number; name: string }[];
}

export interface EmploymentRecord {
  establishment_id: string;
  employees?: { status: string }[];
}

// Consumable input type for create/update
export interface ConsumableInput {
  consumable_id: string;
  price: number;
}

// Consumable with joined template data
export interface EstablishmentConsumableWithTemplate {
  id: string;
  consumable_id: string;
  price: number;
  consumable?: {
    id: string;
    name: string;
    category: string;
    icon: string;
    default_price: number;
  }[];
}

// Employee data returned from Supabase relationship queries
export interface EmployeeFromQuery {
  id: string;
  name: string;
  age?: number;
  nationality?: string[];
  photos?: string[];
  status: string;
  average_rating?: number;
  comment_count?: number;
  is_freelance?: boolean;
}

// Pattaya region bounds
export const PATTAYA_BOUNDS = {
  lat: { min: 12.8, max: 13.1 },
  lng: { min: 100.8, max: 101.0 }
};

// Default zone coordinates
export const ZONE_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'Soi 6': { latitude: 12.9342, longitude: 100.8779 },
  'Walking Street': { latitude: 12.9278, longitude: 100.8701 },
  'LK Metro': { latitude: 12.9389, longitude: 100.8744 },
  'Treetown': { latitude: 12.9456, longitude: 100.8822 }
};

export const DEFAULT_COORDINATES = { latitude: 12.9342, longitude: 100.8779 }; // Soi 6
