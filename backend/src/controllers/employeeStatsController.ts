/**
 * Employee Stats Controller
 *
 * Handles employee dashboard statistics and profile view tracking.
 * Extracted from employeeController.ts to reduce complexity.
 */

import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { missionTrackingService } from '../services/missionTrackingService';
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/asyncHandler';

// ==========================================
// 🆕 EMPLOYEE DASHBOARD STATS (v10.2)
// ==========================================

/**
 * Get employee statistics for dashboard
 * Returns profile views, reviews count, average rating, favorites count, and employment info
 */
export const getEmployeeStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, name, status')
      .eq('id', id)
      .single();

    if (employeeError || !employee) {
      throw NotFoundError('Employee not found');
    }

    // Parallel queries for better performance
    const [
      profileViewsResult,
      ratingsResult,
      reviewsResult,
      favoritesResult,
      employmentResult
    ] = await Promise.all([
      // 1. Profile Views Count
      supabase
        .from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', id),

      // 2. Ratings (for average calculation - includes ratings with or without text)
      supabase
        .from('comments')
        .select('rating')
        .eq('employee_id', id)
        .eq('status', 'approved')
        .not('rating', 'is', null),

      // 3. Reviews (comments with text content only)
      supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', id)
        .eq('status', 'approved')
        .not('content', 'is', null)
        .neq('content', '')
        .is('parent_comment_id', null), // Only top-level comments

      // 4. Favorites Count
      supabase
        .from('user_favorites')
        .select('id', { count: 'exact', head: true })
        .eq('employee_id', id),

      // 5. Current Employment
      supabase
        .from('employment_history')
        .select(`
          *,
          establishment:establishments(
            id,
            name,
            zone,
            category:establishment_categories(name, icon)
          )
        `)
        .eq('employee_id', id)
        .eq('is_current', true)
        .single()
    ]);

    // Calculate average rating
    const ratings = ratingsResult.data?.map(r => r.rating) || [];
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      : 0;

    // Build stats response
    const stats = {
      profileViews: profileViewsResult.count || 0,
      reviewsCount: reviewsResult.count || 0, // 🔧 v10.2 FIX: Count only reviews with text content
      averageRating: averageRating ? parseFloat(averageRating.toFixed(1)) : 0,
      favoritesCount: favoritesResult.count || 0,
      currentEmployment: employmentResult.data || null
    };

    res.json({ stats });
});

/**
 * Get employee reviews with pagination (v10.2)
 * Returns paginated reviews (comments with ratings) for employee dashboard
 */
export const getEmployeeReviews = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    const offset = parseInt(req.query.offset as string) || 0;

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', id)
      .single();

    if (employeeError || !employee) {
      throw NotFoundError('Employee not found');
    }

    // Get total count of reviews (not comments - only ratings)
    const { count } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('employee_id', id)
      .eq('status', 'approved')
      .not('rating', 'is', null)
      .is('parent_comment_id', null);

    // Get paginated reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        rating,
        created_at,
        user:users(pseudonym)
      `)
      .eq('employee_id', id)
      .eq('status', 'approved')
      .not('rating', 'is', null)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (reviewsError) {
      logger.error('Get employee reviews error:', reviewsError);
      throw BadRequestError(reviewsError.message);
    }

    res.json({
      reviews: reviews || [],
      total: count || 0,
      limit,
      offset
    });
});

// ==========================================
// 🆕 PROFILE VIEW TRACKING (v10.2)
// ==========================================

/**
 * Record profile view
 * Tracks when a user views an employee profile (public endpoint, no auth required)
 * Supports both anonymous and authenticated visitors
 */
export const recordProfileView = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', id)
      .single();

    if (employeeError || !employee) {
      throw NotFoundError('Employee not found');
    }

    // Record view (anonymous or authenticated)
    const { error } = await supabase
      .from('profile_views')
      .insert({
        employee_id: id,
        user_id: req.user?.id || null, // Null if anonymous
        viewed_at: new Date().toISOString()
      });

    if (error) {
      logger.error('Record profile view error:', error);
      throw BadRequestError(error.message);
    }

    // Track mission progress for authenticated users only
    if (req.user?.id) {
      try {
        await missionTrackingService.onProfileViewed(req.user.id, id);
      } catch (missionError) {
        logger.error('Mission tracking error (profile view):', missionError);
      }
    }

    res.json({ success: true });
});
