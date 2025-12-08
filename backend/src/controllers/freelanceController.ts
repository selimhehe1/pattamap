/**
 * Freelance Controller
 * Version: 10.3
 *
 * Handles freelance-specific endpoints:
 * - GET /api/freelances - List all freelances (VIP first)
 * - GET /api/freelances/:id - Get freelance detail with nightclub associations
 */

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

/**
 * GET /api/freelances
 * Fetch all freelance employees
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 * - search: string (name, nickname, description)
 * - nationality: string
 * - age_min, age_max: number
 * - has_nightclub: boolean (true = with nightclub, false = free freelance)
 * - sort_by: 'vip' (default), 'name', 'age', 'created_at'
 */
export const getFreelances = async (req: Request, res: Response) => {
  try {
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

    // Build query
    let query = supabase
      .from('employees')
      .select(`
        *,
        current_employment:employment_history!inner(
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

    // Filter by employment_history.is_current
    query = query.eq('employment_history.is_current', true);

    // Search filter
    if (search && typeof search === 'string') {
      query = query.or(`name.ilike.%${search}%,nickname.ilike.%${search}%,description.ilike.%${search}%`);
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
      return res.status(500).json({ error: 'Failed to fetch freelances' });
    }

    // Process employees: group nightclubs and filter based on has_nightclub
    const employees = (rawEmployees || []).map((emp: any) => {
      const nightclubs = (emp.current_employment || [])
        .filter((eh: any) => eh.establishment?.category?.name === 'Nightclub')
        .map((eh: any) => ({
          id: eh.establishment.id,
          name: eh.establishment.name,
          start_date: eh.start_date
        }));

      return {
        ...emp,
        nightclubs,
        current_employment: undefined // Remove raw employment data
      };
    });

    // Filter by has_nightclub if specified
    let filteredEmployees = employees;
    if (has_nightclub === 'true') {
      filteredEmployees = employees.filter((emp: any) => emp.nightclubs.length > 0);
    } else if (has_nightclub === 'false') {
      filteredEmployees = employees.filter((emp: any) => emp.nightclubs.length === 0);
    }

    // Sort employees - Verified priority first (VIP system disabled in UI)
    // Priority order: Verified+VIP > Verified > VIP > Others
    const sortedEmployees = filteredEmployees.sort((a: any, b: any) => {
      const aIsVip = a.is_vip && new Date(a.vip_expires_at) > new Date();
      const bIsVip = b.is_vip && new Date(b.vip_expires_at) > new Date();
      const aIsVerified = a.is_verified === true;
      const bIsVerified = b.is_verified === true;

      // Priority 1: Verified + VIP (both) come first
      const aIsPremium = aIsVerified && aIsVip;
      const bIsPremium = bIsVerified && bIsVip;
      if (aIsPremium && !bIsPremium) return -1;
      if (!aIsPremium && bIsPremium) return 1;

      // Priority 2: Verified alone (takes priority over VIP since VIP is hidden in UI)
      if (aIsVerified && !bIsVerified) return -1;
      if (!aIsVerified && bIsVerified) return 1;

      // Priority 3: VIP alone (lower priority since VIP UI is disabled)
      if (aIsVip && !bIsVip) return -1;
      if (!aIsVip && bIsVip) return 1;

      // Then sort by specified field
      if (sort_by === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sort_by === 'age') {
        return (a.age || 0) - (b.age || 0);
      } else if (sort_by === 'created_at') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      // Default: then by name
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
  } catch (error) {
    logger.error('Get freelances error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/freelances/:id
 * Get freelance detail with nightclub associations
 */
export const getFreelanceById = async (req: Request, res: Response) => {
  try {
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
      return res.status(404).json({ error: 'Freelance not found' });
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
      return res.status(500).json({ error: 'Failed to fetch freelance details' });
    }

    // Filter only nightclubs
    const nightclubs = (employmentHistory || [])
      .filter((eh: any) => eh.establishment?.category?.name === 'Nightclub')
      .map((eh: any) => ({
        id: eh.establishment.id,
        name: eh.establishment.name,
        address: eh.establishment.address,
        zone: eh.establishment.zone,
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
  } catch (error) {
    logger.error('Get freelance by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
