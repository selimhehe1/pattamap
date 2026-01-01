import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { notifyNewFavorite } from '../utils/notificationHelper';
import { asyncHandler, UnauthorizedError, BadRequestError, ConflictError , InternalServerError } from '../middleware/asyncHandler';

export const getFavorites = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throw UnauthorizedError();
  }

    // Step 1: Get favorites (just IDs)
    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select('id, employee_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching favorites:', error);
      throw InternalServerError('Failed to fetch favorites');
    }

    interface FavoriteRecord {
      id: string;
      employee_id: string;
      created_at: string;
    }

    const employeeIds = (favorites || []).map((fav: FavoriteRecord) => fav.employee_id);

    // Step 2: Fetch employees individually using Promise.all (more reliable than .in())
    interface EmployeeData {
      id: string;
      name: string;
      nickname?: string;
      age?: number;
      nationality?: string[];
      photos?: string[];
      description?: string;
      social_media?: Record<string, string>;
    }

    // Fetch each employee individually - this approach works reliably
    const employeePromises = employeeIds.map(async (empId: string) => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, nickname, age, nationality, photos, description, social_media')
        .eq('id', empId)
        .single();

      if (error) {
        logger.warn(`Failed to fetch employee ${empId}:`, error.message);
        return null;
      }
      return data as EmployeeData;
    });

    const employeeResults = await Promise.all(employeePromises);
    const validEmployees = employeeResults.filter((emp): emp is EmployeeData => emp !== null);

    // Create employee lookup map
    const employeeMap = new Map<string, EmployeeData>();
    validEmployees.forEach((emp) => {
      employeeMap.set(emp.id, emp);
    });

    // Batch fetch employment history for all employees
    const { data: allEmployment } = await supabase
      .from('employment_history')
      .select(`
        employee_id,
        establishment_id,
        establishments:establishment_id (
          id,
          name,
          zone,
          address
        )
      `)
      .in('employee_id', employeeIds)
      .eq('is_current', true);

    // Batch fetch all comments for ratings
    const { data: allComments } = await supabase
      .from('comments')
      .select('employee_id, rating')
      .in('employee_id', employeeIds);

    // Create lookup maps for O(1) access
    interface EstablishmentData {
      id: string;
      name: string;
      zone: string;
      address: string;
    }
    const employmentMap = new Map<string, EstablishmentData>();
    (allEmployment || []).forEach((emp: { employee_id: string; establishments: unknown }) => {
      if (emp.establishments) {
        employmentMap.set(emp.employee_id, emp.establishments as EstablishmentData);
      }
    });

    // Calculate ratings per employee
    const ratingsMap = new Map<string, { total: number; count: number }>();
    (allComments || []).forEach((comment: { employee_id: string; rating?: number }) => {
      const existing = ratingsMap.get(comment.employee_id) || { total: 0, count: 0 };
      existing.total += comment.rating || 0;
      existing.count += 1;
      ratingsMap.set(comment.employee_id, existing);
    });

    const favoritesWithEstablishment = (favorites || []).map((fav: FavoriteRecord) => {
      const ratingData = ratingsMap.get(fav.employee_id);
      const avgRating = ratingData && ratingData.count > 0
        ? ratingData.total / ratingData.count
        : 0;
      const establishment = employmentMap.get(fav.employee_id);
      // Get employee from our lookup map
      const emp = employeeMap.get(fav.employee_id);

      return {
        id: fav.id,
        employee_id: fav.employee_id,
        employee_name: emp?.name || '',
        employee_nickname: emp?.nickname,
        employee_photos: emp?.photos || [],
        employee_age: emp?.age,
        employee_nationality: emp?.nationality,
        employee_description: emp?.description,
        employee_social_media: emp?.social_media,
        employee_rating: avgRating,
        employee_comment_count: ratingData?.count || 0,
        current_establishment: establishment ? {
          id: establishment.id,
          name: establishment.name,
          zone: establishment.zone,
          address: establishment.address
        } : null,
        created_at: fav.created_at
      };
    });

    res.json({
      favorites: favoritesWithEstablishment,
      count: favoritesWithEstablishment.length,
      _debug: {
        version: 'v3-promise-all',
        employeeIdsCount: employeeIds.length,
        validEmployeesCount: validEmployees.length,
        firstEmployeeId: employeeIds[0]?.substring(0, 8),
        firstValidEmployee: validEmployees[0] ? { id: validEmployees[0].id?.substring(0, 8), name: validEmployees[0].name } : null
      }
    });
});

export const addFavorite = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { employee_id } = req.body;

  if (!userId) {
    throw UnauthorizedError();
  }

  if (!employee_id) {
    throw BadRequestError('Employee ID is required');
  }

  const { data: existingFavorite } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('employee_id', employee_id)
    .single();

  if (existingFavorite) {
    throw ConflictError('Employee already in favorites');
  }

  const { data, error } = await supabase
    .from('user_favorites')
    .insert([{
      user_id: userId,
      employee_id: employee_id
    }])
    .select()
    .single();

  if (error) {
    logger.error('Error adding favorite:', error);
    throw InternalServerError('Failed to add favorite');
  }

    // Notify employee if they have a linked account
    try {
      // Get employee data
      const { data: employee } = await supabase
        .from('employees')
        .select('name, id')
        .eq('id', employee_id)
        .single();

      // Find user linked to this employee
      const { data: linkedUser } = await supabase
        .from('users')
        .select('id, account_type, linked_employee_id')
        .eq('account_type', 'employee')
        .eq('linked_employee_id', employee_id)
        .single();

      // Get current user pseudonym
      const { data: currentUser } = await supabase
        .from('users')
        .select('pseudonym')
        .eq('id', userId)
        .single();

      // Only notify if employee has linked account
      if (employee && linkedUser && currentUser) {
        await notifyNewFavorite(
          linkedUser.id,
          currentUser.pseudonym,
          employee.name
        );
      }
    } catch (notifyError) {
      // Log error but don't fail the request if notification fails
      logger.error('New favorite notification error:', notifyError);
    }

    res.status(201).json({
      message: 'Employee added to favorites',
      favorite: data,
      is_favorite: true
    });
});

export const removeFavorite = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { employee_id } = req.params;

  if (!userId) {
    throw UnauthorizedError();
  }

  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('employee_id', employee_id);

  if (error) {
    logger.error('Error removing favorite:', error);
    throw InternalServerError('Failed to remove favorite');
  }

  res.json({
    message: 'Employee removed from favorites',
    is_favorite: false
  });
});

export const checkFavorite = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { employee_id } = req.params;

  if (!userId) {
    throw UnauthorizedError();
  }

  const { data, error } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('employee_id', employee_id)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error('Error checking favorite:', error);
    throw InternalServerError('Failed to check favorite status');
  }

  res.json({
    is_favorite: !!data
  });
});