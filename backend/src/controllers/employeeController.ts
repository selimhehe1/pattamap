import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { CreateEmployeeRequest, Employee } from '../types';
import { logger } from '../utils/logger';

export const getEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const {
      status = 'approved',
      search,
      establishment_id,
      nationality,
      age_min,
      age_max,
      zone,
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build query based on parameters

    // Calculate offset for pagination
    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('employees')
      .select(`
        *,
        current_employment:employment_history!inner(
          *,
          establishment:establishments(
            *,
            category:establishment_categories(*)
          )
        )
      `, { count: 'exact' })
      .eq('employment_history.is_current', true);

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Advanced search functionality
    if (search) {
      query = query.or(`name.ilike.%${search}%,nickname.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Filter by establishment
    if (establishment_id) {
      query = query.eq('employment_history.establishment_id', establishment_id);
    }

    // Filter by nationality
    if (nationality) {
      query = query.ilike('nationality', `%${nationality}%`);
    }

    // Filter by age range
    if (age_min) {
      query = query.gte('age', Number(age_min));
    }
    if (age_max) {
      query = query.lte('age', Number(age_max));
    }

    // Filter by zone (via establishment)
    if (zone) {
      query = query.eq('employment_history.establishment.zone', zone);
    }

    // Sorting
    switch (sort_by) {
      case 'name':
        query = query.order('name', { ascending: sort_order === 'asc' });
        break;
      case 'age':
        query = query.order('age', {
          ascending: sort_order === 'asc',
          nullsFirst: false
        });
        break;
      case 'nationality':
        query = query.order('nationality', {
          ascending: sort_order === 'asc',
          nullsFirst: false
        });
        break;
      case 'created_at':
      default:
        query = query.order('created_at', { ascending: sort_order === 'asc' });
        break;
    }

    // Pagination
    query = query.range(offset, offset + Number(limit) - 1);

    const { data: employees, error, count } = await query;

    // Process query results

    if (error) {
      logger.error('❌ Supabase query error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Calculate rating averages for each employee
    const employeeIds = employees?.map(emp => emp.id) || [];

    let ratingsData: Array<{employee_id: string, rating: number}> = [];
    if (employeeIds.length > 0) {
      const { data: ratings } = await supabase
        .from('comments')
        .select('employee_id, rating')
        .in('employee_id', employeeIds)
        .eq('status', 'approved')
        .not('rating', 'is', null);

      ratingsData = ratings || [];
    }

    // Enrich employees with average ratings
    const enrichedEmployees = employees?.map(employee => {
      const employeeRatings = ratingsData
        .filter(r => r.employee_id === employee.id)
        .map(r => r.rating);

      const averageRating = employeeRatings.length > 0
        ? employeeRatings.reduce((sum, rating) => sum + rating, 0) / employeeRatings.length
        : null;

      return {
        ...employee,
        average_rating: averageRating,
        comment_count: employeeRatings.length
      };
    }) || [];

    // If sorting by popularity (rating), sort the enriched results
    if (sort_by === 'popularity') {
      enrichedEmployees.sort((a, b) => {
        const ratingA = a.average_rating || 0;
        const ratingB = b.average_rating || 0;
        return sort_order === 'asc' ? ratingA - ratingB : ratingB - ratingA;
      });
    }

    // Return enriched employees with ratings and employment data

    res.json({
      employees: enrichedEmployees,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit)),
        hasMore: offset + Number(limit) < (count || 0)
      }
    });
  } catch (error) {
    logger.error('Get employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get employee with current employment
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        *,
        created_by_user:users!employees_created_by_fkey(pseudonym)
      `)
      .eq('id', id)
      .single();

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get employment history
    const { data: employmentHistory, error: historyError } = await supabase
      .from('employment_history')
      .select(`
        *,
        establishment:establishments(
          *,
          category:establishment_categories(*)
        )
      `)
      .eq('employee_id', id)
      .order('start_date', { ascending: false });

    if (historyError) {
      logger.error('Employment history error:', historyError);
    }

    // Get comments and rating statistics
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select(`
        *,
        user:users(pseudonym)
      `)
      .eq('employee_id', id)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (commentsError) {
      logger.error('Comments error:', commentsError);
    }

    // Calculate average rating
    const ratings = comments?.filter(c => c.rating).map(c => c.rating) || [];
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : null;

    // Separate current and past employment
    const currentEmployment = employmentHistory?.filter(eh => eh.is_current) || [];
    const pastEmployment = employmentHistory?.filter(eh => !eh.is_current) || [];

    const enrichedEmployee = {
      ...employee,
      current_employment: currentEmployment,
      employment_history: pastEmployment,
      comments: comments || [],
      average_rating: averageRating,
      comment_count: comments?.length || 0
    };

    res.json({ employee: enrichedEmployee });
  } catch (error) {
    logger.error('Get employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      nickname,
      age,
      nationality,
      description,
      photos,
      social_media,
      current_establishment_id,
      position,
      start_date,
      freelance_position
    }: CreateEmployeeRequest = req.body;

    if (!name || !photos || photos.length === 0) {
      return res.status(400).json({ error: 'Name and at least one photo are required' });
    }

    if (photos.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 photos allowed' });
    }

    // Validate: Can't have both establishment AND freelance position
    if (current_establishment_id && freelance_position) {
      return res.status(400).json({ error: 'Employee cannot have both an establishment and a freelance position' });
    }

    // Create employee
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .insert({
        name,
        nickname,
        age,
        nationality,
        description,
        photos,
        social_media,
        status: 'pending', // All new employees need approval
        created_by: req.user!.id
      })
      .select()
      .single();

    if (employeeError) {
      return res.status(400).json({ error: employeeError.message });
    }

    // Add current employment if provided
    if (current_establishment_id) {
      const { error: employmentError } = await supabase
        .from('employment_history')
        .insert({
          employee_id: employee.id,
          establishment_id: current_establishment_id,
          position,
          start_date: start_date || new Date().toISOString().split('T')[0],
          is_current: true,
          created_by: req.user!.id
        });

      if (employmentError) {
        logger.error('Employment history error:', employmentError);
      }
    }

    // Add freelance position if provided
    if (freelance_position) {
      const { grid_row, grid_col } = freelance_position;

      // RESTRICTION: Freelances can only work in beachroad
      const zone = 'beachroad';

      // Check if this position is already taken
      const { data: existingPosition } = await supabase
        .from('independent_positions')
        .select('id')
        .eq('zone', zone)
        .eq('grid_row', grid_row)
        .eq('grid_col', grid_col)
        .eq('is_active', true)
        .single();

      if (existingPosition) {
        // Position is occupied, delete the employee and return error
        await supabase.from('employees').delete().eq('id', employee.id);
        return res.status(409).json({ error: `Position (${grid_row}, ${grid_col}) is already occupied on Beach Road` });
      }

      // Create independent position
      const { error: positionError } = await supabase
        .from('independent_positions')
        .insert({
          employee_id: employee.id,
          zone,
          grid_row,
          grid_col,
          is_active: true,
          created_by: req.user!.id
        });

      if (positionError) {
        logger.error('Independent position error:', positionError);
        // Don't fail the entire request, just log the error
      }
    }

    // Add to moderation queue
    await supabase
      .from('moderation_queue')
      .insert({
        item_type: 'employee',
        item_id: employee.id,
        submitted_by: req.user!.id,
        status: 'pending'
      });

    res.status(201).json({
      message: 'Employee profile submitted for approval',
      employee
    });
  } catch (error) {
    logger.error('Create employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check permissions
    const { data: employee } = await supabase
      .from('employees')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (employee.created_by !== req.user!.id && !['admin', 'moderator'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Not authorized to update this employee' });
    }

    // Validate photos limit
    if (updates.photos && updates.photos.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 photos allowed' });
    }

    // Non-admin updates go back to pending status
    if (req.user!.role !== 'admin') {
      updates.status = 'pending';
    }

    const { data: updatedEmployee, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });
  } catch (error) {
    logger.error('Update employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check permissions
    const { data: employee } = await supabase
      .from('employees')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    if (employee.created_by !== req.user!.id && !['admin', 'moderator'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Not authorized to delete this employee' });
    }

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    logger.error('Delete employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requestSelfRemoval = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { verification_info } = req.body;

    if (!verification_info) {
      return res.status(400).json({ error: 'Verification information required for self-removal' });
    }

    const { data: employee, error } = await supabase
      .from('employees')
      .update({ 
        self_removal_requested: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // TODO: Send notification to admins about self-removal request
    // This could be implemented with email notifications or admin dashboard alerts

    res.json({
      message: 'Self-removal request submitted. Administrators will review your request.',
      employee
    });
  } catch (error) {
    logger.error('Self removal request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addEmployment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { establishment_id, position, start_date, end_date } = req.body;

    if (!establishment_id || !start_date) {
      return res.status(400).json({ error: 'Establishment and start date are required' });
    }

    // If this is a current position, mark other positions as not current
    const is_current = !end_date;
    if (is_current) {
      await supabase
        .from('employment_history')
        .update({ is_current: false })
        .eq('employee_id', id)
        .eq('is_current', true);
    }

    const { data: employment, error } = await supabase
      .from('employment_history')
      .insert({
        employee_id: id,
        establishment_id,
        position,
        start_date,
        end_date,
        is_current,
        created_by: req.user!.id
      })
      .select(`
        *,
        establishment:establishments(
          *,
          category:establishment_categories(*)
        )
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Employment added successfully',
      employment
    });
  } catch (error) {
    logger.error('Add employment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// 🚀 Cache in-memory simple pour suggestions
interface CacheEntry {
  suggestions: string[];
  timestamp: number;
}

const suggestionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

export const getEmployeeNameSuggestions = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    logger.debug(`🔍 Autocomplete request: "${q}"`); // Debug log

    if (!q || typeof q !== 'string' || q.length < 1) {
      return res.json({ suggestions: [] });
    }

    const searchTerm = q.trim().toLowerCase();
    const cacheKey = searchTerm;

    // 🔍 Check cache first
    const cached = suggestionCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      logger.debug(`📦 Cache HIT for "${searchTerm}"`);
      return res.json({ suggestions: cached.suggestions });
    }

    logger.debug(`🔍 Cache MISS for "${searchTerm}" - Fetching from DB`);

    // 🚀 Méthode optimisée Supabase avec double requête parallèle
    const [namesQuery, nicknamesQuery] = await Promise.all([
      supabase
        .from('employees')
        .select('name')
        .eq('status', 'approved')
        .like('name', `%${searchTerm}%`)
        .not('name', 'is', null)
        .limit(8),
      supabase
        .from('employees')
        .select('nickname')
        .eq('status', 'approved')
        .like('nickname', `%${searchTerm}%`)
        .not('nickname', 'is', null)
        .limit(8)
    ]);

    if (namesQuery.error || nicknamesQuery.error) {
      logger.error('🔍 Query errors:', {
        namesError: namesQuery.error,
        nicknamesError: nicknamesQuery.error
      });
      return res.status(400).json({
        error: namesQuery.error?.message || nicknamesQuery.error?.message
      });
    }

    logger.debug(`🔍 Query results for "${searchTerm}":`, {
      namesData: namesQuery.data,
      nicknamesData: nicknamesQuery.data,
      namesCount: namesQuery.data?.length || 0,
      nicknamesCount: nicknamesQuery.data?.length || 0
    });

    // Collecte optimisée des suggestions uniques
    const suggestions = new Set<string>();

    // Ajouter noms
    namesQuery.data?.forEach(emp => {
      if (emp.name) suggestions.add(emp.name);
    });

    // Ajouter nicknames
    nicknamesQuery.data?.forEach(emp => {
      if (emp.nickname) suggestions.add(emp.nickname);
    });

    // Tri intelligent avec priorité aux matches exacts
    const sortedSuggestions: string[] = Array.from(suggestions)
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const aExact = aLower.startsWith(searchTerm);
        const bExact = bLower.startsWith(searchTerm);

        // Priorité 1: Match exact au début
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Priorité 2: Alphabétique
        return a.localeCompare(b);
      })
      .slice(0, 10);

    // 📦 Cache les résultats
    const finalSuggestions = sortedSuggestions;
    suggestionCache.set(cacheKey, {
      suggestions: finalSuggestions,
      timestamp: Date.now()
    });

    logger.debug(`✅ Returning ${finalSuggestions.length} suggestions for "${searchTerm}"`);
    res.json({ suggestions: finalSuggestions });

  } catch (error) {
    logger.error('❌ Get name suggestions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const searchEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const {
      q: searchQuery,
      nationality,
      age_min,
      age_max,
      zone,
      establishment_id,
      category_id,
      sort_by = 'relevance',
      sort_order = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Calculate offset for pagination
    const offset = (Number(page) - 1) * Number(limit);

    // If zone filter is provided, filter will be applied after query (to include freelances)
    let normalizedZoneFilter: string | null = null;
    if (zone) {
      // Normalize zone for search: remove spaces and lowercase
      normalizedZoneFilter = String(zone).toLowerCase().replace(/\s+/g, '');
    }

    // Query to get all employees (with establishments or freelance)
    let query = supabase
      .from('employees')
      .select(`
        *,
        current_employment:employment_history!left(
          *,
          establishment:establishments(
            *,
            category:establishment_categories(*)
          )
        ),
        independent_position:independent_positions!left(*)
      `)
      .eq('status', 'approved');

    // Text search with ranking
    if (searchQuery) {
      const searchTerm = String(searchQuery).trim();

      // Use full-text search for better relevance
      query = query.or(
        `name.ilike.%${searchTerm}%,nickname.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,nationality.ilike.%${searchTerm}%`
      );
    }

    // Nationality filter (supports partial matching)
    if (nationality) {
      query = query.ilike('nationality', `%${nationality}%`);
    }

    // Age range filter
    if (age_min) {
      query = query.gte('age', Number(age_min));
    }
    if (age_max) {
      query = query.lte('age', Number(age_max));
    }

    // Note: establishment_id, category_id, and zone filters are applied after query
    // to properly handle freelances (who don't have employment_history)

    // Base sorting (before popularity calculations)
    if (sort_by !== 'popularity' && sort_by !== 'relevance') {
      switch (sort_by) {
        case 'name':
          query = query.order('name', { ascending: sort_order === 'asc' });
          break;
        case 'age':
          query = query.order('age', {
            ascending: sort_order === 'asc',
            nullsFirst: false
          });
          break;
        case 'nationality':
          query = query.order('nationality', {
            ascending: sort_order === 'asc',
            nullsFirst: false
          });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
      }
    }

    // Execute query (without pagination yet - will filter and paginate manually)
    const { data: allEmployees, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Filter employees to only include those with current employment OR active freelance position
    let filteredEmployees = (allEmployees || []).filter(emp => {
      const hasCurrentEmployment = emp.current_employment?.some((ce: any) => ce.is_current === true);
      const hasActiveFreelance = emp.independent_position?.some((ip: any) => ip.is_active === true);

      // Must have at least one active position
      if (!hasCurrentEmployment && !hasActiveFreelance) {
        return false;
      }

      // If category filter is applied, exclude freelances (they don't have a category)
      if (category_id) {
        const currentEmp = emp.current_employment?.find((ce: any) => ce.is_current === true);
        const establishmentCategoryId = currentEmp?.establishment?.category_id;
        const categoryMatches = establishmentCategoryId === Number(category_id);

        if (!categoryMatches) {
          return false;
        }
      }

      // If establishment filter is applied, exclude freelances
      if (establishment_id) {
        const currentEmp = emp.current_employment?.find((ce: any) => ce.is_current === true);
        const establishmentMatches = currentEmp?.establishment_id === establishment_id;
        if (!establishmentMatches) {
          return false;
        }
      }

      // Apply zone filter if present
      if (normalizedZoneFilter) {
        const establishmentZone = emp.current_employment?.[0]?.establishment?.zone?.toLowerCase().replace(/\s+/g, '');
        const freelanceZone = emp.independent_position?.[0]?.zone?.toLowerCase().replace(/\s+/g, '');

        const matchesZone = establishmentZone === normalizedZoneFilter || freelanceZone === normalizedZoneFilter;
        if (!matchesZone) {
          return false;
        }
      }

      return true;
    });

    logger.debug(`📊 Filtered ${filteredEmployees.length} employees from ${allEmployees?.length || 0} total`);

    // Manual pagination
    const totalFiltered = filteredEmployees.length;
    const employees = filteredEmployees.slice(offset, offset + Number(limit));

    // Get ratings for popularity sorting and enrichment
    const employeeIds = employees?.map(emp => emp.id) || [];
    let ratingsData: Array<{employee_id: string, rating: number, created_at: string}> = [];

    if (employeeIds.length > 0) {
      const { data: ratings } = await supabase
        .from('comments')
        .select('employee_id, rating, created_at')
        .in('employee_id', employeeIds)
        .eq('status', 'approved')
        .not('rating', 'is', null);

      ratingsData = ratings || [];
    }

    // Enrich employees with ratings and calculate relevance score
    const enrichedEmployees = employees?.map(employee => {
      const employeeRatings = ratingsData
        .filter(r => r.employee_id === employee.id)
        .map(r => r.rating);

      const averageRating = employeeRatings.length > 0
        ? employeeRatings.reduce((sum, rating) => sum + rating, 0) / employeeRatings.length
        : 0;

      // Calculate relevance score for search
      let relevanceScore = 0;
      if (searchQuery) {
        const searchTerm = String(searchQuery).toLowerCase();
        const name = employee.name?.toLowerCase() || '';
        const nickname = employee.nickname?.toLowerCase() || '';
        const description = employee.description?.toLowerCase() || '';
        const nationality = employee.nationality?.toLowerCase() || '';

        // Exact name match gets highest score
        if (name === searchTerm) relevanceScore += 100;
        else if (name.includes(searchTerm)) relevanceScore += 50;

        // Nickname matches
        if (nickname === searchTerm) relevanceScore += 80;
        else if (nickname.includes(searchTerm)) relevanceScore += 40;

        // Description matches
        if (description.includes(searchTerm)) relevanceScore += 20;

        // Nationality matches
        if (nationality.includes(searchTerm)) relevanceScore += 30;

        // Boost score based on rating and number of reviews
        relevanceScore += (averageRating * 5) + (employeeRatings.length * 2);
      }

      return {
        ...employee,
        average_rating: averageRating,
        comment_count: employeeRatings.length,
        relevance_score: relevanceScore
      };
    }) || [];

    // Apply sorting for popularity and relevance
    if (sort_by === 'popularity') {
      enrichedEmployees.sort((a, b) => {
        const scoreA = (a.average_rating || 0) * 10 + (a.comment_count || 0);
        const scoreB = (b.average_rating || 0) * 10 + (b.comment_count || 0);
        return sort_order === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      });
    } else if (sort_by === 'relevance' && searchQuery) {
      enrichedEmployees.sort((a, b) => {
        return (b.relevance_score || 0) - (a.relevance_score || 0);
      });
    } else if (sort_by === 'name') {
      // Re-apply name sorting after enrichment to ensure proper order
      enrichedEmployees.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        if (sort_order === 'asc') {
          return nameA.localeCompare(nameB);
        } else {
          return nameB.localeCompare(nameA);
        }
      });
    } else if (sort_by === 'age') {
      // Re-apply age sorting after enrichment to ensure proper order
      enrichedEmployees.sort((a, b) => {
        const ageA = a.age || 0;
        const ageB = b.age || 0;
        return sort_order === 'asc' ? ageA - ageB : ageB - ageA;
      });
    } else if (sort_by === 'nationality') {
      // Re-apply nationality sorting after enrichment to ensure proper order
      enrichedEmployees.sort((a, b) => {
        const nationalityA = (a.nationality || '').toLowerCase();
        const nationalityB = (b.nationality || '').toLowerCase();
        if (sort_order === 'asc') {
          return nationalityA.localeCompare(nationalityB);
        } else {
          return nationalityB.localeCompare(nationalityA);
        }
      });
    } else if (sort_by === 'newest') {
      // Re-apply newest sorting after enrichment to ensure proper order
      enrichedEmployees.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // Newest first (descending)
      });
    } else if (sort_by === 'oldest') {
      // Re-apply oldest sorting after enrichment to ensure proper order
      enrichedEmployees.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateA - dateB; // Oldest first (ascending)
      });
    }

    // Get available filters for suggestions
    const { data: nationalitiesData } = await supabase
      .from('employees')
      .select('nationality')
      .eq('status', 'approved')
      .not('nationality', 'is', null);

    const availableNationalities = Array.from(new Set(
      nationalitiesData?.map(n => n.nationality).filter(Boolean) || []
    )).sort();

    // Get available zones
    const { data: zonesData } = await supabase
      .from('establishments')
      .select('zone')
      .not('zone', 'is', null);

    const availableZones = Array.from(new Set(
      zonesData?.map(z => z.zone?.toLowerCase().replace(/\s+/g, '')).filter(Boolean) || []
    )).sort();

    // Get available establishments with zone info
    const { data: establishmentsData } = await supabase
      .from('establishments')
      .select('id, name, zone')
      .eq('status', 'approved')
      .order('name');

    const availableEstablishments = establishmentsData || [];

    // Get available categories
    const { data: categoriesData } = await supabase
      .from('establishment_categories')
      .select('id, name, icon')
      .order('name');

    const availableCategories = categoriesData || [];

    // 🔧 Fix: Structure de réponse compatible avec frontend PaginatedResponse
    res.json({
      data: enrichedEmployees,  // ← Frontend attend 'data', pas 'employees'
      total: totalFiltered,
      page: Number(page),
      limit: Number(limit),
      hasMore: offset + Number(limit) < totalFiltered,
      filters: {
        availableNationalities,
        availableZones,
        availableEstablishments,
        availableCategories,
        searchQuery: searchQuery || null,
        appliedFilters: {
          nationality,
          age_min: age_min ? Number(age_min) : null,
          age_max: age_max ? Number(age_max) : null,
          zone,
          establishment_id,
          category_id
        }
      },
      sorting: {
        sort_by,
        sort_order,
        availableSorts: [
          { value: 'relevance', label: 'Most Relevant' },
          { value: 'popularity', label: 'Most Popular' },
          { value: 'newest', label: 'Newest' },
          { value: 'oldest', label: 'Oldest' },
          { value: 'name', label: 'Name A-Z' },
          { value: 'age', label: 'Age' },
          { value: 'nationality', label: 'Nationality' }
        ]
      }
    });
  } catch (error) {
    logger.error('Search employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};