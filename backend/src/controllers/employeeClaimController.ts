/**
 * Employee Claim Controller
 *
 * Handles employee profile claiming and self-profile creation.
 * Extracted from employeeController.ts
 */

import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { CreateEmployeeRequest } from '../types';
import { logger } from '../utils/logger';
import { validateUrlArray } from '../utils/validation';
import { VALID_SEX_VALUES } from '../utils/constants';
import { asyncHandler, BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError, ConflictError, InternalServerError } from '../middleware/asyncHandler';

/**
 * Create own employee profile (self-managed)
 * User creates their own employee profile, automatically linked to their account
 * Requires account_type = 'employee'
 */
export const createOwnEmployeeProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw UnauthorizedError('Authentication required');
    }

    // Check if user already has a linked employee profile
    const { data: existingUser } = await supabase
      .from('users')
      .select('linked_employee_id, account_type')
      .eq('id', req.user.id)
      .single();

    if (existingUser?.linked_employee_id) {
      throw ConflictError('You already have a linked employee profile');
    }

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

    // Validation
    if (!name) {
      throw BadRequestError('Name is required');
    }
    if (photos && photos.length > 5) {
      throw BadRequestError('Maximum 5 photos allowed');
    }

    // Validate sex field (required)
    if (!sex) {
      throw BadRequestError('Sex/gender is required');
    }
    if (!VALID_SEX_VALUES.includes(sex as typeof VALID_SEX_VALUES[number])) {
      throw BadRequestError(`Sex must be one of: ${VALID_SEX_VALUES.join(', ')}`);
    }

    // Determine establishment IDs for freelance support
    const establishmentIds: string[] = [];
    if (current_establishment_ids && current_establishment_ids.length > 0) {
      establishmentIds.push(...current_establishment_ids);
    } else if (current_establishment_id) {
      establishmentIds.push(current_establishment_id);
    }

    // Create employee with self-profile flag and user link
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .insert({
        name,
        nickname,
        age,
        sex,
        nationality,
        description,
        photos,
        social_media,
        is_freelance: is_freelance || false,
        status: 'pending', // Needs moderation approval
        created_by: req.user.id,
        user_id: req.user.id, // Link to user account
        is_self_profile: true // Mark as self-managed
      })
      .select()
      .single();

    if (employeeError) {
      logger.error('Create self-profile error:', employeeError);
      throw BadRequestError(employeeError.message);
    }

    // Update user account to link employee and set account_type
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        linked_employee_id: employee.id,
        account_type: 'employee'
      })
      .eq('id', req.user.id);

    if (userUpdateError) {
      logger.error('Update user link error:', userUpdateError);
      // Rollback: delete employee if user update fails
      await supabase.from('employees').delete().eq('id', employee.id);
      throw InternalServerError('Failed to link profile to account');
    }

    // Add employment/freelance positions if provided
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
        // Rollback: Delete employee AND unlink user
        await supabase.from('employees').delete().eq('id', employee.id);
        await supabase.from('users').update({ linked_employee_id: null }).eq('id', req.user.id);
        throw BadRequestError('Failed to add employment history: ' + employmentError.message);
      }
    }

    // Add to moderation queue as employee_claim (self-profile type)
    const { error: moderationError } = await supabase
      .from('moderation_queue')
      .insert({
        item_type: 'employee_claim',
        item_id: employee.id,
        submitted_by: req.user.id,
        status: 'pending',
        request_metadata: {
          claim_type: 'self_profile',
          message: 'I am creating my own employee profile'
        }
      });

    // Rollback: Delete employee AND unlink user if moderation queue fails
    if (moderationError) {
      logger.error('Moderation queue error:', moderationError);
      await supabase.from('employees').delete().eq('id', employee.id);
      await supabase.from('users').update({ linked_employee_id: null }).eq('id', req.user.id);
      throw BadRequestError('Failed to submit for moderation: ' + moderationError.message);
    }

    logger.info(`Self-profile created by user ${req.user.id}:`, { employee_id: employee.id });

    res.status(201).json({
      message: 'Your employee profile has been created and is pending approval',
      employee,
      linked: true
    });
});

/**
 * Claim existing employee profile
 * User requests to link their account to an existing employee profile
 * Creates a moderation request for admin approval
 */
export const claimEmployeeProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw UnauthorizedError('Authentication required');
    }

    const { employeeId } = req.params;
    const { message, verification_proof }: { message: string; verification_proof?: string[] } = req.body;

    if (!message || message.trim().length < 10) {
      throw BadRequestError('Please provide a detailed message (min 10 characters) explaining why this is your profile');
    }

    // Limit proof URLs to 5 max
    const MAX_PROOF_URLS = 5;
    if (verification_proof && verification_proof.length > MAX_PROOF_URLS) {
      throw BadRequestError(`Maximum ${MAX_PROOF_URLS} proof URLs allowed`);
    }

    // Check if user already has a linked profile
    const { data: existingUser } = await supabase
      .from('users')
      .select('linked_employee_id')
      .eq('id', req.user.id)
      .single();

    if (existingUser?.linked_employee_id) {
      throw ConflictError('You already have a linked employee profile');
    }

    // Check if employee exists and is not already linked
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, name, user_id')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      throw NotFoundError('Employee profile not found');
    }

    if (employee.user_id) {
      throw ConflictError('This employee profile is already linked to another user account');
    }

    // Check if there's already a pending claim request for this employee by this user
    const { data: existingClaim } = await supabase
      .from('moderation_queue')
      .select('id')
      .eq('item_type', 'employee_claim')
      .eq('item_id', employeeId)
      .eq('submitted_by', req.user.id)
      .eq('status', 'pending')
      .single();

    if (existingClaim) {
      throw ConflictError('You already have a pending claim request for this profile');
    }

    // Validate verification proof URLs to prevent XSS/SSRF
    const validatedProofs = validateUrlArray(verification_proof);
    if (verification_proof && verification_proof.length > 0 && validatedProofs.length === 0) {
      logger.warn('All verification proof URLs rejected as invalid', {
        userId: req.user.id,
        employeeId,
        originalCount: verification_proof.length
      });
    }
    // Handle empty arrays: PostgreSQL RPC requires NULL instead of empty array
    const verificationProofForDB = validatedProofs.length > 0 ? validatedProofs : null;

    const { data: claimRequest, error: claimError } = await supabase
      .rpc('create_employee_claim_request', {
        p_user_id: req.user.id,
        p_employee_id: employeeId,
        p_message: message.trim(),
        p_verification_proof: verificationProofForDB
      });

    if (claimError) {
      logger.error('Create claim request error:', claimError);
      throw BadRequestError(claimError.message || 'Failed to create claim request');
    }

    // Create notifications for all admin users
    try {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const adminNotifications = admins.map(admin => ({
          user_id: admin.id,
          type: 'new_ownership_request',
          title: 'New Employee Claim Request',
          message: `User "${req.user!.pseudonym || 'A user'}" has requested to claim employee profile "${employee.name}"`,
          link: '/admin/employee-claims',
          related_entity_type: 'employee_claim',
          related_entity_id: claimRequest
        }));

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(adminNotifications);

        if (notificationError) {
          logger.error('Failed to create admin notifications for claim:', notificationError);
        } else {
          logger.info(`Created ${admins.length} admin notifications for claim ${claimRequest}`);
        }
      }
    } catch (notificationError) {
      logger.error('Admin notification error:', notificationError);
    }

    logger.info(`Claim request created by user ${req.user.id} for employee ${employeeId}`);

    res.status(201).json({
      message: 'Claim request submitted successfully. An administrator will review your request.',
      claim_id: claimRequest
    });
});

/**
 * Get user's linked employee profile
 * Returns the employee profile linked to the authenticated user
 */
export const getMyLinkedProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw UnauthorizedError('Authentication required');
    }

    const { data: user } = await supabase
      .from('users')
      .select('linked_employee_id')
      .eq('id', req.user.id)
      .single();

    if (!user?.linked_employee_id) {
      throw NotFoundError('No linked employee profile found');
    }

    const employeeId = user.linked_employee_id;

    // Get employee with current employment
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select(`
        *,
        created_by_user:users!employees_created_by_fkey(pseudonym)
      `)
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      throw NotFoundError('Employee profile not found');
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
      .eq('employee_id', employeeId)
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
      .eq('employee_id', employeeId)
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

    // Return employee directly (no wrapper) for frontend compatibility
    res.json(enrichedEmployee);
});

/**
 * Get all claim requests (admin only)
 * Returns pending/approved/rejected claim requests for moderation
 */
export const getClaimRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw UnauthorizedError('Authentication required');
    }

    // Only admin/moderator can view claims
    if (!['admin', 'moderator'].includes(req.user.role)) {
      throw ForbiddenError('Admin/moderator access required');
    }

    const { status = 'pending' } = req.query;

    // Get claim requests from moderation_queue
    let query = supabase
      .from('moderation_queue')
      .select(`
        *,
        submitted_by_user:users!moderation_queue_submitted_by_fkey(id, pseudonym, email),
        moderator_user:users!moderation_queue_moderator_id_fkey(id, pseudonym)
      `)
      .eq('item_type', 'employee_claim');

    // Only apply status filter if NOT 'all'
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: claims, error } = await query.order('created_at', { ascending: false });

    if (error) {
      logger.error('Get claim requests error:', error);
      throw BadRequestError(error.message);
    }

    // Batch fetch employee data with IN query instead of N+1
    const employeeIds = [...new Set((claims || []).map(c => c.item_id).filter(Boolean))];
    let employeesMap: Record<string, { id: string; name: string; nickname: string; photos: string[] }> = {};

    if (employeeIds.length > 0) {
      const { data: employees } = await supabase
        .from('employees')
        .select('id, name, nickname, photos')
        .in('id', employeeIds);

      if (employees) {
        employeesMap = employees.reduce((acc, emp) => {
          acc[emp.id] = emp;
          return acc;
        }, {} as typeof employeesMap);
      }
    }

    // Enrich claims with pre-fetched employee data (O(1) lookup)
    const enrichedClaims = (claims || []).map(claim => ({
      ...claim,
      employee: employeesMap[claim.item_id] || null
    }));

    res.json({
      claims: enrichedClaims,
      total: enrichedClaims.length
    });
});

/**
 * Approve claim request (admin only)
 * Creates the bidirectional user ↔ employee link
 */
export const approveClaimRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw UnauthorizedError('Authentication required');
    }

    // Only admin can approve claims
    if (req.user.role !== 'admin') {
      throw ForbiddenError('Admin access required');
    }

    const { claimId } = req.params;
    const { moderator_notes }: { moderator_notes?: string } = req.body;

    // First, get the claim details to check claim_type
    const { data: claim, error: claimError } = await supabase
      .from('moderation_queue')
      .select('*, request_metadata')
      .eq('id', claimId)
      .eq('status', 'pending')
      .eq('item_type', 'employee_claim')
      .single();

    if (claimError || !claim) {
      logger.error('Claim not found:', claimError);
      throw NotFoundError('Claim request not found or already processed');
    }

    const claimType = claim.request_metadata?.claim_type;

    // For self-profiles that are already linked, just approve the employee status
    if (claimType === 'self_profile') {
      // Update employee status to approved
      const { error: employeeUpdateError } = await supabase
        .from('employees')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', claim.item_id);

      if (employeeUpdateError) {
        logger.error('Failed to approve employee:', employeeUpdateError);
        throw InternalServerError('Failed to approve employee profile');
      }

      // Update moderation queue
      const { error: queueUpdateError } = await supabase
        .from('moderation_queue')
        .update({
          status: 'approved',
          moderator_id: req.user.id,
          moderator_notes: moderator_notes || 'Self-profile approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', claimId);

      if (queueUpdateError) {
        logger.error('Failed to update moderation queue:', queueUpdateError);
      }

      logger.info(`Self-profile claim ${claimId} approved by admin ${req.user.id}`);

      // Notify user that their self-profile was approved
      try {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: claim.submitted_by,
            type: 'ownership_request_approved',
            title: 'Employee Profile Approved',
            message: 'Your employee profile has been approved and is now publicly visible!',
            link: '/my-employee-profile',
            related_entity_type: 'employee_claim',
            related_entity_id: claimId
          });

        if (notifError) {
          logger.error('Failed to create user notification for approved self-profile:', notifError);
        } else {
          logger.info(`Notified user ${claim.submitted_by} of approved self-profile`);
        }
      } catch (notifError) {
        logger.error('User notification error:', notifError);
      }

      return res.json({
        message: 'Self-profile approved successfully. Employee profile is now public.',
        success: true
      });
    }

    // For claim_existing type, use SQL helper function to create the link
    const { data: _success, error: approveError } = await supabase
      .rpc('approve_employee_claim_request', {
        p_claim_id: claimId,
        p_moderator_id: req.user.id,
        p_moderator_notes: moderator_notes || null
      });

    if (approveError) {
      logger.error('Approve claim request error:', approveError);
      throw BadRequestError(approveError.message || 'Failed to approve claim request');
    }

    logger.info(`Claim request ${claimId} approved by admin ${req.user.id}`);

    // Notify user that their claim was approved
    try {
      // Get employee name for notification message
      const { data: employee } = await supabase
        .from('employees')
        .select('name')
        .eq('id', claim.item_id)
        .single();

      const employeeName = employee?.name || 'the employee profile';

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: claim.submitted_by,
          type: 'ownership_request_approved',
          title: 'Claim Request Approved',
          message: `Your claim request for "${employeeName}" has been approved! You can now manage this profile.`,
          link: '/my-employee-profile',
          related_entity_type: 'employee_claim',
          related_entity_id: claimId
        });

      if (notifError) {
        logger.error('Failed to create user notification for approved claim:', notifError);
      } else {
        logger.info(`Notified user ${claim.submitted_by} of approved claim for ${employeeName}`);
      }
    } catch (notifError) {
      logger.error('User notification error:', notifError);
    }

    res.json({
      message: 'Claim request approved successfully. User and employee are now linked.',
      success: true
    });
});

/**
 * Reject claim request (admin only)
 * Marks the claim as rejected without creating any links
 */
export const rejectClaimRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw UnauthorizedError('Authentication required');
    }

    // Only admin can reject claims
    if (req.user.role !== 'admin') {
      throw ForbiddenError('Admin access required');
    }

    const { claimId } = req.params;
    const { moderator_notes }: { moderator_notes?: string } = req.body;

    if (!moderator_notes || moderator_notes.trim().length < 10) {
      throw BadRequestError('Please provide a reason for rejection (min 10 characters)');
    }

    // First get the claim details to send notification later
    const { data: claim, error: claimError } = await supabase
      .from('moderation_queue')
      .select('*, request_metadata')
      .eq('id', claimId)
      .eq('status', 'pending')
      .eq('item_type', 'employee_claim')
      .single();

    if (claimError || !claim) {
      logger.error('Claim not found:', claimError);
      throw NotFoundError('Claim request not found or already processed');
    }

    // Use SQL helper function to reject claim
    const { error: rejectError } = await supabase
      .rpc('reject_employee_claim_request', {
        p_claim_id: claimId,
        p_moderator_id: req.user.id,
        p_moderator_notes: moderator_notes.trim()
      });

    if (rejectError) {
      logger.error('Reject claim request error:', rejectError);
      throw BadRequestError(rejectError.message || 'Failed to reject claim request');
    }

    logger.info(`Claim request ${claimId} rejected by admin ${req.user.id}`);

    // Notify user that their claim was rejected
    try {
      // Get employee name for notification message
      const { data: employee } = await supabase
        .from('employees')
        .select('name')
        .eq('id', claim.item_id)
        .single();

      const employeeName = employee?.name || 'the employee profile';
      const claimType = claim.request_metadata?.claim_type;
      const isSelftProfile = claimType === 'self_profile';

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: claim.submitted_by,
          type: 'ownership_request_rejected',
          title: isSelftProfile ? 'Employee Profile Rejected' : 'Claim Request Rejected',
          message: isSelftProfile
            ? `Your employee profile request has been rejected. Reason: ${moderator_notes.trim()}`
            : `Your claim request for "${employeeName}" has been rejected. Reason: ${moderator_notes.trim()}`,
          link: '/my-claims',
          related_entity_type: 'employee_claim',
          related_entity_id: claimId,
          metadata: {
            i18n_key: isSelftProfile ? 'notifications.selfProfileRejected' : 'notifications.claimRejected',
            i18n_params: { employeeName, reason: moderator_notes.trim() }
          }
        });

      if (notifError) {
        logger.error('Failed to create user notification for rejected claim:', notifError);
      } else {
        logger.info(`Notified user ${claim.submitted_by} of rejected claim for ${employeeName}`);
      }
    } catch (notifError) {
      logger.error('User notification error:', notifError);
    }

    res.json({
      message: 'Claim request rejected successfully.',
      success: true
    });
});
