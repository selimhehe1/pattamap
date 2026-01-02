/**
 * Admin Route Utilities
 *
 * Shared helper functions and types for admin routes.
 */

import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { User, EstablishmentCategory } from '../types';

// Type-safe error message extraction
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
};

// Database record types
export interface DbEstablishment {
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
  latitude?: number;
  longitude?: number;
  category?: EstablishmentCategory;
  user?: User;
}

export interface DbEmploymentHistory {
  id: string;
  employee_id: string;
  establishment_id: string;
  is_current: boolean;
  start_date?: string;
  end_date?: string;
  position?: string;
  establishment?: DbEstablishment;
}

export interface DbEmployee {
  id: string;
  name: string;
  nickname?: string;
  age?: number;
  nationality?: string[];
  photos?: string[];
  description?: string;
  social_media?: Record<string, string>;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  is_verified?: boolean;
  verified_at?: string;
  is_vip?: boolean;
  vip_expires_at?: string;
  vote_count?: number;
  average_rating?: number;
  is_freelance?: boolean;
  current_employment?: DbEmploymentHistory[];
  employment_history?: DbEmploymentHistory[];
}

// Dashboard stats fallback helper
export async function getDashboardStatsFallback() {
  const [
    { count: totalEstablishments },
    { count: pendingEstablishments },
    { count: totalEmployees },
    { count: pendingEmployees },
    { count: totalUsers },
    { count: totalComments },
    { count: pendingComments },
    { count: reportedComments }
  ] = await Promise.all([
    supabase.from('establishments').select('id', { count: 'exact', head: true }),
    supabase.from('establishments').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('employees').select('*', { count: 'exact', head: true }),
    supabase.from('employees').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending')
  ]);

  return {
    totalEstablishments: totalEstablishments || 0,
    pendingEstablishments: pendingEstablishments || 0,
    totalEmployees: totalEmployees || 0,
    pendingEmployees: pendingEmployees || 0,
    totalUsers: totalUsers || 0,
    totalComments: totalComments || 0,
    pendingComments: pendingComments || 0,
    reportedComments: reportedComments || 0
  };
}

// Utility function to convert UUID to consistent number
export const uuidToNumber = (uuid: string): number => {
  if (!uuid) return 0;
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// Function to find UUID by its numeric hash
export const findUuidByNumber = async (table: string, numericId: string): Promise<string | null> => {
  try {
    logger.debug(`findUuidByNumber: Looking for ${numericId} in table ${table}`);

    // First check if it's already a valid UUID
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (uuidRegex.test(numericId)) {
      return numericId;
    }

    const targetNumber = parseInt(numericId);

    const { data, error } = await supabase
      .from(table)
      .select('id, name');

    if (error || !data) {
      logger.error(`Error fetching ${table} data:`, error);
      return null;
    }

    for (const row of data) {
      const hashedNumber = uuidToNumber(row.id);
      if (hashedNumber === targetNumber) {
        return row.id;
      }
    }

    logger.error(`No UUID found for numeric ID: ${numericId}`);
    return null;
  } catch (error: unknown) {
    logger.error('Error in findUuidByNumber:', getErrorMessage(error));
    return null;
  }
};

// Transform establishment data for admin interface
export const transformEstablishment = (est: DbEstablishment) => ({
  ...est,
  id: est.id,
  category_id: est.category_id || 1,
  created_by: est.created_by || null,
  category: est.category ? { ...est.category, id: est.category.id } : null,
  user: est.user ? { ...est.user, id: est.user.id } : null
});

// Transform employee data for admin interface
export const transformEmployee = (emp: DbEmployee) => ({
  ...emp,
  id: emp.id,
  created_by: emp.created_by || null,
  current_employment: emp.current_employment?.map((job: DbEmploymentHistory) => ({
    ...job,
    id: job.id,
    employee_id: job.employee_id,
    establishment_id: job.establishment_id,
    establishment: job.establishment ? { ...job.establishment, id: job.establishment.id } : null
  })) || []
});
