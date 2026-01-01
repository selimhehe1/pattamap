/**
 * Freelance Controller
 * Version: 10.3 (refactored with asyncHandler)
 *
 * Handles freelance-specific endpoints:
 * - GET /api/freelances - List all freelances (VIP first)
 * - GET /api/freelances/:id - Get freelance detail with nightclub associations
 */

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { escapeLikeWildcards } from '../utils/validation';
import { asyncHandler, NotFoundError, InternalServerError } from '../middleware/asyncHandler';

// =====================================================
// TYPES
// =====================================================

interface EmploymentWithEstablishment {
  id: string;
  employee_id: string;
  is_current: boolean;
  start_date: string;
  establishment: {
    id: string;
    name: string;
    address?: string;
    zone?: string;
    category: { name: string } | null;
  } | null;
}

interface RawFreelanceEmployee {
  id: string;
  name: string;
  nickname?: string;
  age?: number;
  nationality?: string[];
  description?: string;
  photos: string[];
  is_vip?: boolean;
  vip_expires_at?: string;
  is_verified?: boolean;
  status: string;
  created_at: string;
  current_employment?: EmploymentWithEstablishment[];
}

interface NightclubAssociation {
  id: string;
  name: string;
  address?: string;
  zone?: string;
  start_date: string;
}

interface ProcessedFreelance extends Omit<RawFreelanceEmployee, 'current_employment'> {
  nightclubs: NightclubAssociation[];
}

/**
 * GET /api/freelances
 * Fetch all freelance employees
 */
export const getFreelances = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    search,
    nationality,
    age_min,
    age_max,
    has_nightclub,
    sort_by = 'vip'
  } = req.query;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const offset = (pageNum - 1) * limitNum;

  // Build query - Use LEFT JOIN (no !inner) to include freelances without employment history
  let query = supabase
    .from('employees')
    .select(`
      *,
      current_employment:employment_history(
        *,
        establishment:establishments(
          id,
          name,
          category:establishment_categories(name)
        )
      )
    `, { count: 'exact' })
    .eq('is_freelance', true)
    .eq('status', 'approved');

  // Search filter
  if (search && typeof search === 'string') {
    const escapedSearch = escapeLikeWildcards(search);
    query = query.or(`name.ilike.%${escapedSearch}%,nickname.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
  }

  // Nationality filter
  if (nationality && typeof nationality === 'string') {
    query = query.eq('nationality', nationality);
  }

  // Age filters
  if (age_min) {
    query = query.gte('age', Number(age_min));
  }
  if (age_max) {
    query = query.lte('age', Number(age_max));
  }

  // Execute query
  const { data: rawEmployees, error, count } = await query
    .range(offset, offset + limitNum - 1);

  if (error) {
    logger.error('Error fetching freelances:', error);
    throw InternalServerError('Failed to fetch freelances');
  }

  // Process employees: group nightclubs and filter based on has_nightclub
  const employees = (rawEmployees as RawFreelanceEmployee[] || []).map((emp) => {
    const nightclubs = (emp.current_employment || [])
      .filter((eh) => eh.is_current === true && eh.establishment?.category?.name === 'Nightclub')
      .map((eh) => ({
        id: eh.establishment!.id,
        name: eh.establishment!.name,
        start_date: eh.start_date
      }));

    return {
      ...emp,
      nightclubs,
      current_employment: undefined
    };
  });

  // Filter by has_nightclub if specified
  let filteredEmployees = employees;
  if (has_nightclub === 'true') {
    filteredEmployees = employees.filter((emp) => emp.nightclubs.length > 0);
  } else if (has_nightclub === 'false') {
    filteredEmployees = employees.filter((emp) => emp.nightclubs.length === 0);
  }

  // Sort employees - Verified priority first
  const sortedEmployees = filteredEmployees.sort((a, b) => {
    const aIsVip = a.is_vip && a.vip_expires_at && new Date(a.vip_expires_at) > new Date();
    const bIsVip = b.is_vip && b.vip_expires_at && new Date(b.vip_expires_at) > new Date();
    const aIsVerified = a.is_verified === true;
    const bIsVerified = b.is_verified === true;

    const aIsPremium = aIsVerified && aIsVip;
    const bIsPremium = bIsVerified && bIsVip;
    if (aIsPremium && !bIsPremium) return -1;
    if (!aIsPremium && bIsPremium) return 1;

    if (aIsVerified && !bIsVerified) return -1;
    if (!aIsVerified && bIsVerified) return 1;

    if (aIsVip && !bIsVip) return -1;
    if (!aIsVip && bIsVip) return 1;

    if (sort_by === 'name') {
      return (a.name || '').localeCompare(b.name || '');
    } else if (sort_by === 'age') {
      return (a.age || 0) - (b.age || 0);
    } else if (sort_by === 'created_at') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    return (a.name || '').localeCompare(b.name || '');
  });

  res.json({
    freelances: sortedEmployees,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limitNum)
    }
  });
});

/**
 * GET /api/freelances/:id
 * Get freelance detail with nightclub associations
 */
export const getFreelanceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Fetch employee
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .eq('is_freelance', true)
    .eq('status', 'approved')
    .single();

  if (employeeError || !employee) {
    throw NotFoundError('Freelance not found');
  }

  // Fetch current nightclub associations
  const { data: employmentHistory, error: ehError } = await supabase
    .from('employment_history')
    .select(`
      *,
      establishment:establishments(
        id,
        name,
        address,
        zone,
        category:establishment_categories(name)
      )
    `)
    .eq('employee_id', id)
    .eq('is_current', true);

  if (ehError) {
    logger.error('Error fetching employment history:', ehError);
    throw InternalServerError('Failed to fetch freelance details');
  }

  // Filter only nightclubs
  const nightclubs = (employmentHistory as EmploymentWithEstablishment[] || [])
    .filter((eh) => eh.establishment?.category?.name === 'Nightclub')
    .map((eh) => ({
      id: eh.establishment!.id,
      name: eh.establishment!.name,
      address: eh.establishment!.address,
      zone: eh.establishment!.zone,
      start_date: eh.start_date
    }));

  // Fetch comments/ratings
  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('employee_id', id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  const ratings = comments?.filter(c => c.rating).map(c => c.rating) || [];
  const averageRating = ratings.length > 0
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : null;

  res.json({
    freelance: {
      ...employee,
      nightclubs,
      comments: comments || [],
      average_rating: averageRating,
      comment_count: comments?.length || 0
    }
  });
});
