import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { CreateEmployeeRequest } from '../types';
import { logger } from '../utils/logger';
import { notifyAdminsPendingContent, notifyUserContentPendingReview } from '../utils/notificationHelper';
import { awardXP } from '../services/gamificationService';
import { missionTrackingService } from '../services/missionTrackingService';
import { validateImageUrls, escapeLikeWildcards } from '../utils/validation';
import { VALID_SEX_VALUES } from '../utils/constants';
import { asyncHandler, BadRequestError, NotFoundError, ForbiddenError } from '../middleware/asyncHandler';
import {
  fetchEmployeeRatingsAndVotes,
  enrichEmployeesWithRatings,
  applySorting,
  updateEmploymentAssociations,
  notifyFollowersOfUpdate,
  validateNationalityArray
} from '../utils/employeeHelpers';

// Type definitions for Supabase query results
interface CurrentEmploymentRecord {
  id: string;
  employee_id: string;
  establishment_id: string;
  is_current: boolean;
  start_date?: string;
  end_date?: string;
  establishment?: {
    id: string;
    name: string;
    zone?: string;
  } | null;
}

export const getEmployees = asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      status = 'approved',
      type = 'all', // v10.3: 'all', 'freelance', 'regular'
      search,
      establishment_id,
      nationality,
      age_min,
      age_max,
      zone,
      verified, // 🆕 v10.3: Filter by verification status
      sort_by = 'created_at',
      sort_order = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build query based on parameters

    // Calculate offset for pagination
    const offset = (Number(page) - 1) * Number(limit);

    // 🆕 v10.x: Changed to LEFT join to include freelances (who have no employment_history)
    // Will filter manually after query to include: employment OR freelance
    let query = supabase
      .from('employees')
      .select(`
        *,
        current_employment:employment_history(
          *,
          establishment:establishments(
            *,
            category:establishment_categories(*)
          )
        )
      `, { count: 'exact' });

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // 🆕 v10.3: Filter by verification status
    // Cast query param to string to avoid TypeScript type mismatch warnings
    if (verified !== undefined && verified !== null && String(verified) !== '') {
      const isVerified = String(verified) === 'true';
      query = query.eq('is_verified', isVerified);
    }

    // Advanced search functionality
    // 🔧 FIX S1: Escape LIKE wildcards to prevent pattern injection
    if (search) {
      const escapedSearch = escapeLikeWildcards(String(search));
      query = query.or(`name.ilike.%${escapedSearch}%,nickname.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`);
    }

    // Filter by establishment
    if (establishment_id) {
      query = query.eq('employment_history.establishment_id', establishment_id);
    }

    // Filter by nationality
    // 🔧 FIX S1: Escape LIKE wildcards
    if (nationality) {
      const escapedNationality = escapeLikeWildcards(String(nationality));
      query = query.ilike('nationality', `%${escapedNationality}%`);
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

    // Sorting - VIP employees ALWAYS appear first (v10.3 Phase 4)
    // Add VIP-first ordering BEFORE all other sort criteria
    query = query.order('is_vip', { ascending: false, nullsFirst: false });

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

    const { data: allEmployees, error, count } = await query;

    // Process query results

    if (error) {
      logger.error('❌ Supabase query error:', error);
      throw BadRequestError(error.message);
    }

    // 🆕 v10.3: Filter by employee type (freelance vs regular)
    const employees = (allEmployees || []).filter(emp => {
      // 🔧 FIX: Si establishment_id est fourni, vérifier que l'employé y travaille actuellement
      // Cela s'applique aux employés réguliers ET aux freelances (qui ont aussi des employment_history)
      const hasCurrentEmploymentAtEstablishment = establishment_id
        ? emp.current_employment?.some((ce: CurrentEmploymentRecord) =>
            ce.is_current === true && ce.establishment_id === establishment_id
          )
        : emp.current_employment?.some((ce: CurrentEmploymentRecord) => ce.is_current === true);

      const isFreelance = emp.is_freelance === true;

      // Base filter: must have active position (employment OR freelance)
      // Si establishment_id fourni: l'employé doit avoir un emploi actif dans CET établissement
      // Sinon: l'employé doit avoir un emploi actif quelque part OU être freelance
      const hasActivePosition = establishment_id
        ? hasCurrentEmploymentAtEstablishment  // Employés/Freelances avec emploi actif dans CET établissement
        : (hasCurrentEmploymentAtEstablishment || isFreelance);  // Tous les employés actifs + freelances
      if (!hasActivePosition) return false;

      // Type filter
      if (type === 'freelance') {
        return isFreelance;
      } else if (type === 'regular') {
        return !isFreelance && hasCurrentEmploymentAtEstablishment;
      } else { // type === 'all' or undefined
        return true;
      }
    });

    // Fetch ratings and votes using helper function
    const employeeIds = employees?.map(emp => emp.id) || [];
    const { ratingsData, votesData } = await fetchEmployeeRatingsAndVotes(employeeIds);

    // Enrich employees with ratings and votes using helper function
    let enrichedEmployees = enrichEmployeesWithRatings(employees || [], ratingsData, votesData);

    // Apply sorting using helper function
    if (sort_by === 'popularity') {
      enrichedEmployees = applySorting(enrichedEmployees, 'popularity', sort_order as string);
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
});

export const getEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
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
      throw NotFoundError('Employee not found');
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

    // 🆕 Get vote count for this employee
    const { data: votes, error: votesError } = await supabase
      .from('employee_existence_votes')
      .select('id')
      .eq('employee_id', id);

    if (votesError) {
      logger.error('Votes error:', votesError);
    }

    const voteCount = votes?.length || 0;

    // Separate current and past employment
    const currentEmployment = employmentHistory?.filter(eh => eh.is_current) || [];
    const pastEmployment = employmentHistory?.filter(eh => !eh.is_current) || [];

    const enrichedEmployee = {
      ...employee,
      current_employment: currentEmployment,
      employment_history: pastEmployment,
      comments: comments || [],
      average_rating: averageRating,
      comment_count: comments?.length || 0,
      vote_count: voteCount
    };

    res.json({ employee: enrichedEmployee });
});

export const createEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      name,
      nickname,
      age,
      sex,
      nationality,
      description,
      photos,
      social_media,
      is_freelance,
      current_establishment_id,
      current_establishment_ids,
      position,
      start_date
    }: CreateEmployeeRequest = req.body;

    if (!name) {
      throw BadRequestError('Name is required');
    }

    // Validate sex field (required)
    if (!sex) {
      throw BadRequestError('Sex/gender is required');
    }
    if (!VALID_SEX_VALUES.includes(sex as typeof VALID_SEX_VALUES[number])) {
      throw BadRequestError(`Sex must be one of: ${VALID_SEX_VALUES.join(', ')}`);
    }

    // ========================================
    // v10.4 - Validate nationality array
    // ========================================
    // Nationality must be an array of strings (max 2 for "half/mixed")
    if (nationality !== undefined && nationality !== null) {
      if (!Array.isArray(nationality)) {
        throw BadRequestError('Nationality must be an array');
      }
      if (nationality.length === 0) {
        throw BadRequestError('Nationality array cannot be empty (omit field if no nationality)');
      }
      if (nationality.length > 2) {
        throw BadRequestError('Maximum 2 nationalities allowed (for half/mixed heritage)');
      }
      // Validate each nationality is a non-empty string
      for (const nat of nationality) {
        if (typeof nat !== 'string' || nat.trim().length === 0) {
          throw BadRequestError('Each nationality must be a non-empty string');
        }
      }
    }

    // ========================================
    // BUG #12 FIX - Validate image URLs
    // ========================================
    // Security: Prevent malicious URLs (XSS, invalid formats)
    const photoValidation = validateImageUrls(photos || [], 0, 5);  // Photos optional
    if (!photoValidation.valid) {
      throw BadRequestError(photoValidation.error || 'Invalid photo URLs');
    }

    // ========================================
    // v10.3 - Freelance Nightclub Validation
    // ========================================
    // Determine establishment IDs to associate
    const establishmentIds: string[] = [];
    if (current_establishment_ids && current_establishment_ids.length > 0) {
      // Freelance with multiple nightclubs
      establishmentIds.push(...current_establishment_ids);
    } else if (current_establishment_id) {
      // Regular employee or freelance with single nightclub
      establishmentIds.push(current_establishment_id);
    }

    // Validate freelance business rules
    const { validateFreelanceRules } = await import('../utils/freelanceValidation');
    const validation = await validateFreelanceRules(null, is_freelance || false, establishmentIds);
    if (!validation.valid) {
      throw BadRequestError(validation.error || 'Invalid freelance configuration');
    }

    // Create employee
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .insert({
        name,
        nickname,
        age,
        sex, // v10.x - Gender field
        nationality,
        description,
        photos,
        social_media,
        is_freelance: is_freelance || false, // v10.3: Support freelance flag
        status: 'pending', // All new employees need approval
        created_by: req.user!.id
      })
      .select()
      .single();

    if (employeeError) {
      throw BadRequestError(employeeError.message);
    }

    // ========================================
    // v10.3 - Add employment associations (single or multiple)
    // ========================================
    // Freelances can have multiple nightclub associations
    // Regular employees can only have one establishment
    if (establishmentIds.length > 0) {
      const employmentRecords = establishmentIds.map(estId => ({
        employee_id: employee.id,
        establishment_id: estId,
        position,
        start_date: start_date || new Date().toISOString().split('T')[0],
        is_current: true,
        created_by: req.user!.id
      }));

      const { error: employmentError } = await supabase
        .from('employment_history')
        .insert(employmentRecords);

      if (employmentError) {
        logger.error('Employment history error:', employmentError);
        // 🔧 ROLLBACK FIX: Delete employee if employment_history fails
        await supabase.from('employees').delete().eq('id', employee.id);
        throw BadRequestError('Failed to add employment history: ' + employmentError.message);
      }

      logger.info(`Created employee ${employee.id} with ${establishmentIds.length} establishment(s)`);
    }

    // Add to moderation queue
    const { error: moderationError } = await supabase
      .from('moderation_queue')
      .insert({
        item_type: 'employee',
        item_id: employee.id,
        submitted_by: req.user!.id,
        status: 'pending'
      });

    // ========================================
    // BUG #5 FIX - Complete rollback if moderation queue fails
    // ========================================
    // Issue: If moderation_queue insert fails, employment_history becomes orphaned
    // Fix: Delete both employee AND employment_history
    if (moderationError) {
      logger.error('Moderation queue error:', moderationError);
      logger.warn('Rolling back employee creation (deleting employee + related records)');

      // Delete employment_history if it was created (v10.3: supports multiple)
      if (establishmentIds.length > 0) {
        await supabase
          .from('employment_history')
          .delete()
          .eq('employee_id', employee.id);
      }

      // Delete employee (cascades to other foreign keys)
      await supabase.from('employees').delete().eq('id', employee.id);

      throw BadRequestError('Failed to submit for moderation: ' + moderationError.message);
    }

    // 🔔 Notify admins of new pending content
    try {
      // Get submitter pseudonym
      const { data: submitterData } = await supabase
        .from('users')
        .select('pseudonym')
        .eq('id', req.user!.id)
        .single();

      const submitterName = submitterData?.pseudonym || 'A user';

      await notifyAdminsPendingContent(
        'employee',
        employee.name,
        submitterName,
        employee.id
      );
    } catch (notifyError) {
      // Log error but don't fail the request if notification fails
      logger.error('Admin notification error:', notifyError);
    }

    // 🔔 Notify the creator that their profile is pending review
    try {
      await notifyUserContentPendingReview(
        req.user!.id,
        'employee',
        employee.name,
        employee.id
      );
    } catch (notifyError) {
      logger.error('Creator notification error:', notifyError);
    }

    // 🎮 Award XP for creating employee profile
    try {
      await awardXP(
        req.user!.id,
        20, // XP for creating employee profile
        'profile_updated',
        'employee',
        employee.id,
        'Created new employee profile'
      );
    } catch (xpError) {
      logger.error('XP award error:', xpError);
    }

    // Track mission progress for establishment owners creating employees
    if (req.user!.account_type === 'establishment_owner') {
      try {
        await missionTrackingService.onEmployeeManagedByOwner(req.user!.id, employee.id, 'added');
      } catch (missionError) {
        logger.error('Mission tracking error (employee managed - added):', missionError);
      }
    }

    res.status(201).json({
      message: 'Employee profile submitted for approval',
      employee
    });
});

export const updateEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    // Check permissions
    const { data: employee } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .single();

    if (!employee) {
      throw NotFoundError('Employee not found');
    }

    // Allow update if: owner (created_by), linked user (user_id), or admin/moderator
    if (
      employee.created_by !== req.user!.id &&
      employee.user_id !== req.user!.id &&
      !['admin', 'moderator'].includes(req.user!.role)
    ) {
      throw ForbiddenError('Not authorized to update this employee');
    }

    // ========================================
    // BUG #12 FIX - Validate image URLs (update)
    // ========================================
    // Security: Prevent malicious URLs (XSS, invalid formats)
    if (updates.photos) {
      const photoValidation = validateImageUrls(updates.photos, 0, 5);  // Photos optional
      if (!photoValidation.valid) {
        throw BadRequestError(photoValidation.error || 'Invalid photo URLs');
      }
    }

    // v10.4 - Validate nationality array using helper
    const nationalityValidation = validateNationalityArray(updates.nationality);
    if (!nationalityValidation.valid) {
      throw BadRequestError(nationalityValidation.error || 'Invalid nationality');
    }

    // Validate sex field if provided
    if (updates.sex !== undefined && updates.sex !== null) {
      if (!VALID_SEX_VALUES.includes(updates.sex as typeof VALID_SEX_VALUES[number])) {
        throw BadRequestError(`Sex must be one of: ${VALID_SEX_VALUES.join(', ')}`);
      }
    }

    // ========================================
    // v10.3 - Handle freelance and establishment updates
    // ========================================
    const { current_establishment_id, current_establishment_ids, ...employeeUpdates } = updates;

    // Determine if employee is/will be freelance
    const isFreelance = updates.is_freelance !== undefined ? updates.is_freelance : employee.is_freelance;

    // Determine establishment IDs to associate
    const newEstablishmentIds: string[] = [];
    if (current_establishment_ids && current_establishment_ids.length > 0) {
      // Freelance with multiple nightclubs (array provided)
      newEstablishmentIds.push(...current_establishment_ids);
    } else if (current_establishment_id !== undefined) {
      // Single establishment (could be null to remove all)
      if (current_establishment_id) {
        newEstablishmentIds.push(current_establishment_id);
      }
      // If current_establishment_id is null/empty, newEstablishmentIds stays empty (remove all)
    }

    // Validate freelance business rules if establishments are being updated
    if (current_establishment_id !== undefined || current_establishment_ids !== undefined) {
      const { validateFreelanceRules } = await import('../utils/freelanceValidation');
      const validation = await validateFreelanceRules(id, isFreelance, newEstablishmentIds);
      if (!validation.valid) {
        throw BadRequestError(validation.error || 'Invalid freelance configuration');
      }

      // Update employment associations using helper function
      const result = await updateEmploymentAssociations(id, newEstablishmentIds, req.user!.id);
      if (!result.success) {
        throw BadRequestError(result.error || 'Failed to update establishments');
      }
    }

    // ========================================
    // BUG #4 FIX - Enforce moderation for all non-admin updates
    // ========================================
    // Security Issue (v10.2): Linked users (user_id) could bypass moderation
    // This allowed malicious employees to update profiles with inappropriate content
    // Fix: All non-admin updates now require re-moderation for security
    // Note: Admins can still approve instantly if needed
    if (req.user!.role !== 'admin') {
      employeeUpdates.status = 'pending';
      logger.info(`Employee ${id} update requires moderation (non-admin user)`);
    }

    const { data: updatedEmployee, error } = await supabase
      .from('employees')
      .update(employeeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw BadRequestError(error.message);
    }

    // Notify followers of profile updates using helper
    if (updatedEmployee) {
      await notifyFollowersOfUpdate(
        id,
        updatedEmployee.name,
        updates,
        employee,
        current_establishment_id !== undefined
      );
    }

    // Track mission progress for employee accounts
    if (req.user!.account_type === 'employee') {
      try {
        const updateFields = Object.keys(updates);
        await missionTrackingService.onEmployeeProfileUpdated(req.user!.id, updateFields);
      } catch (missionError) {
        logger.error('Mission tracking error (employee profile):', missionError);
      }
    }

    // Track mission progress for establishment owners updating employees
    if (req.user!.account_type === 'establishment_owner') {
      try {
        await missionTrackingService.onEmployeeManagedByOwner(req.user!.id, id, 'updated');
      } catch (missionError) {
        logger.error('Mission tracking error (employee managed - updated):', missionError);
      }
    }

    res.json({
      message: 'Employee updated successfully',
      employee: updatedEmployee
    });
});

export const deleteEmployee = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    // Check permissions
    const { data: employee } = await supabase
      .from('employees')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!employee) {
      throw NotFoundError('Employee not found');
    }

    if (employee.created_by !== req.user!.id && !['admin', 'moderator'].includes(req.user!.role)) {
      throw ForbiddenError('Not authorized to delete this employee');
    }

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      throw BadRequestError(error.message);
    }

    res.json({ message: 'Employee deleted successfully' });
});

export const requestSelfRemoval = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { verification_info } = req.body;

    // Validate verification_info
    if (!verification_info) {
      throw BadRequestError('Verification information required for self-removal');
    }
    if (typeof verification_info !== 'string') {
      throw BadRequestError('Verification information must be a string');
    }
    if (verification_info.length > 1000) {
      throw BadRequestError('Verification information too long (max 1000 characters)');
    }

    // First, fetch the employee to check authorization
    const { data: existingEmployee, error: fetchError } = await supabase
      .from('employees')
      .select('id, name, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingEmployee) {
      throw NotFoundError('Employee not found');
    }

    // Security check: Only the linked user can request self-removal
    if (!existingEmployee.user_id || existingEmployee.user_id !== req.user!.id) {
      throw ForbiddenError('You can only request removal of your own profile');
    }

    // Update the employee with self-removal request
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
      throw BadRequestError(error.message);
    }

    // Send notification to admins about self-removal request
    try {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        await supabase.from('notifications').insert(
          admins.map(admin => ({
            user_id: admin.id,
            type: 'self_removal_request',
            title: 'Employee Self-Removal Request',
            message: `Employee "${existingEmployee.name}" has requested profile removal.`,
            data: {
              employee_id: id,
              verification_info: verification_info.substring(0, 200) // Store first 200 chars
            }
          }))
        );
      }
    } catch (notifyError) {
      // Don't fail the request if notification fails, but log it
      logger.error('Failed to send admin notifications for self-removal:', notifyError);
    }

    res.json({
      message: 'Self-removal request submitted. Administrators will review your request.',
      employee
    });
});

export const addEmployment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { establishment_id, position, start_date, end_date } = req.body;

    if (!establishment_id || !start_date) {
      throw BadRequestError('Establishment and start date are required');
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
      throw BadRequestError(error.message);
    }

    res.status(201).json({
      message: 'Employment added successfully',
      employment
    });
});

// ==========================================
// 🚀 EMPLOYEE SEARCH - Extracted to employeeSearchController.ts
// ==========================================
export { getEmployeeNameSuggestions, searchEmployees } from './employeeSearchController';

// ==========================================
// 🆕 EMPLOYEE CLAIM SYSTEM (v10.0) - Extracted to employeeClaimController.ts
// ==========================================
export {
  createOwnEmployeeProfile,
  claimEmployeeProfile,
  getMyLinkedProfile,
  getClaimRequests,
  approveClaimRequest,
  rejectClaimRequest
} from './employeeClaimController';

// ==========================================
// 🆕 EMPLOYEE DASHBOARD STATS (v10.2) - Extracted to employeeStatsController.ts
// ==========================================
export { getEmployeeStats, getEmployeeReviews, recordProfileView } from './employeeStatsController';