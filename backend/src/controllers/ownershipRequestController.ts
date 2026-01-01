import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  CreateOwnershipRequestRequest,
  ReviewOwnershipRequestRequest,
  User,
  Establishment
} from '../types';
import {
  notifyAdminsNewOwnershipRequest,
  notifyOwnerRequestStatusChange,
  notifyOwnershipRequestSubmitted
} from '../utils/notificationHelper';
import { asyncHandler, BadRequestError, NotFoundError, ForbiddenError, ConflictError , InternalServerError } from '../middleware/asyncHandler';

// Type definitions for nested Supabase query results
interface RequestUser {
  id: string;
  account_type?: string;
  pseudonym?: string;
  email?: string;
}
interface RequestEstablishment {
  id?: string;
  name?: string;
  address?: string;
  zone?: string;
}

/**
 * Create a new ownership request (establishment owner only)
 * POST /api/ownership-requests
 */
export const createOwnershipRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const {
      establishment_id,
      documents_urls,
      verification_code,
      request_message,
      establishment_data
    }: CreateOwnershipRequestRequest = req.body;

    // Validate required fields
    if (!establishment_id && !establishment_data) {
      throw BadRequestError('Either establishment_id or establishment_data is required');
    }

    if (!documents_urls || documents_urls.length === 0) {
      throw BadRequestError('At least one document is required');
    }

    // Validate establishment_data if provided
    if (establishment_data) {
      const { name, address, latitude, longitude, category_id } = establishment_data;
      if (!name || !address || !latitude || !longitude || !category_id) {
        throw BadRequestError('establishment_data must include: name, address, latitude, longitude, category_id');
      }
    }

    // Verify user has establishment_owner account type
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('account_type, pseudonym')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw NotFoundError('User not found');
    }

    if (user.account_type !== 'establishment_owner') {
      throw ForbiddenError('Only establishment owners can request ownership');
    }

    // Handle establishment creation if data provided
    let finalEstablishmentId = establishment_id;
    let establishmentName: string;
    let isNewEstablishment = false;

    if (establishment_data) {
      // Create new establishment with status='pending'
      const { data: newEstablishment, error: createError } = await supabase
        .from('establishments')
        .insert({
          name: establishment_data.name,
          address: establishment_data.address,
          location: {
            latitude: establishment_data.latitude,
            longitude: establishment_data.longitude
          },
          category_id: establishment_data.category_id,
          zone: establishment_data.zone,
          description: establishment_data.description,
          phone: establishment_data.phone,
          website: establishment_data.website,
          opening_hours: establishment_data.opening_hours,
          instagram: establishment_data.instagram,
          twitter: establishment_data.twitter,
          tiktok: establishment_data.tiktok,
          status: 'pending',
          created_by: userId
        })
        .select('id, name')
        .single();

      if (createError || !newEstablishment) {
        logger.error('Create establishment error:', createError);
        throw InternalServerError('Failed to create establishment');
      }

      finalEstablishmentId = newEstablishment.id;
      establishmentName = newEstablishment.name;
      isNewEstablishment = true;

      logger.info('Establishment created for ownership request', {
        establishmentId: finalEstablishmentId,
        establishmentName,
        userId
      });
    } else {
      // Verify existing establishment
      const { data: establishment, error: estError } = await supabase
        .from('establishments')
        .select('id, name')
        .eq('id', establishment_id!)
        .single();

      if (estError || !establishment) {
        throw NotFoundError('Establishment not found');
      }

      establishmentName = establishment.name;
    }

    // Check if user already owns this establishment
    const { data: existingOwnership } = await supabase
      .from('establishment_owners')
      .select('id')
      .eq('user_id', userId)
      .eq('establishment_id', finalEstablishmentId!)
      .single();

    if (existingOwnership) {
      throw ConflictError('You already own this establishment');
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await supabase
      .from('establishment_ownership_requests')
      .select('id, status')
      .eq('user_id', userId)
      .eq('establishment_id', finalEstablishmentId!)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      throw ConflictError('You already have a pending request for this establishment');
    }

    // Create ownership request
    const { data: request, error } = await supabase
      .from('establishment_ownership_requests')
      .insert({
        user_id: userId,
        establishment_id: finalEstablishmentId!,
        documents_urls: JSON.stringify(documents_urls),
        verification_code,
        request_message,
        status: 'pending'
      })
      .select(`
        id,
        user_id,
        establishment_id,
        status,
        documents_urls,
        verification_code,
        request_message,
        created_at,
        establishment:establishments(id, name, status),
        user:users!establishment_ownership_requests_user_id_fkey(id, pseudonym, email)
      `)
      .single();

    if (error) {
      logger.error('Create ownership request error:', error);
      throw InternalServerError('Failed to create ownership request');
    }

    logger.info('Ownership request created', {
      requestId: request.id,
      userId,
      establishmentId: finalEstablishmentId,
      establishmentName,
      isNewEstablishment
    });

    // Notify admins (include isNewEstablishment flag)
    await notifyAdminsNewOwnershipRequest(
      establishmentName,
      user.pseudonym,
      request.id,
      isNewEstablishment
    );

    // 🔔 Notify user that their request was submitted (include isNewEstablishment flag)
    try {
      await notifyOwnershipRequestSubmitted(
        userId,
        establishmentName,
        request.id,
        isNewEstablishment
      );
    } catch (notifyError) {
      // Log error but don't fail the request if notification fails
      logger.error('User notification error (ownership request submitted):', notifyError);
    }

    const message = isNewEstablishment
      ? 'Ownership request submitted successfully. Your new establishment and ownership request will be reviewed by admins.'
      : 'Ownership request submitted successfully. Admins will review your request.';

    res.status(201).json({
      message,
      request,
      isNewEstablishment
    });
});

/**
 * Get current user's ownership requests (establishment owner only)
 * GET /api/ownership-requests/my
 */
export const getMyOwnershipRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const { data: requests, error } = await supabase
      .from('establishment_ownership_requests')
      .select(`
        id,
        user_id,
        establishment_id,
        status,
        documents_urls,
        request_message,
        admin_notes,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at,
        establishment:establishments(id, name, address, zone, logo_url),
        reviewer:users!establishment_ownership_requests_reviewed_by_fkey(id, pseudonym)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Get my ownership requests error:', error);
      throw InternalServerError('Failed to fetch ownership requests');
    }

    // Parse documents_urls from JSONB
    const parsedRequests = requests?.map(req => ({
      ...req,
      documents_urls: typeof req.documents_urls === 'string'
        ? JSON.parse(req.documents_urls)
        : req.documents_urls
    })) || [];

    res.json({
      requests: parsedRequests,
      total: parsedRequests.length
    });
});

/**
 * Get all ownership requests (admin only)
 * GET /api/admin/ownership-requests
 * Query params: ?status=pending|approved|rejected
 */
export const getAllOwnershipRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status } = req.query;

    // Note: Removed reviewer join as it causes Supabase 300 Multiple Choices error
    // when reviewed_by is NULL for pending requests. Reviewer info can be fetched
    // separately if needed.
    let query = supabase
      .from('establishment_ownership_requests')
      .select(`
        id,
        user_id,
        establishment_id,
        status,
        documents_urls,
        verification_code,
        request_message,
        admin_notes,
        reviewed_by,
        reviewed_at,
        created_at,
        updated_at,
        user:users!establishment_ownership_requests_user_id_fkey(id, pseudonym, email, account_type),
        establishment:establishments!establishment_ownership_requests_establishment_id_fkey(id, name, address, zone, logo_url)
      `)
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
      query = query.eq('status', status as string);
    }

    const { data: requests, error } = await query;

    if (error) {
      logger.error('Get all ownership requests error:', error);
      throw InternalServerError('Failed to fetch ownership requests');
    }

    // Parse documents_urls from JSONB
    const parsedRequests = requests?.map(req => ({
      ...req,
      documents_urls: typeof req.documents_urls === 'string'
        ? JSON.parse(req.documents_urls)
        : req.documents_urls
    })) || [];

    res.json({
      requests: parsedRequests,
      total: parsedRequests.length
    });
});

/**
 * Approve ownership request (admin only)
 * PATCH /api/admin/ownership-requests/:id/approve
 */
export const approveOwnershipRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { admin_notes, permissions, owner_role }: ReviewOwnershipRequestRequest = req.body;
    const adminId = req.user!.id;

    // Get request details
    // Note: Using explicit FK hints to avoid Supabase 300 Multiple Choices error
    const { data: request, error: fetchError } = await supabase
      .from('establishment_ownership_requests')
      .select(`
        id,
        user_id,
        establishment_id,
        status,
        user:users!establishment_ownership_requests_user_id_fkey(id, pseudonym, email, account_type),
        establishment:establishments!establishment_ownership_requests_establishment_id_fkey(id, name)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !request) {
      throw NotFoundError('Ownership request not found');
    }

    if (request.status !== 'pending') {
      throw BadRequestError(`Request has already been ${request.status}`);
    }

    // Verify user still has establishment_owner account type
    // Handle both array (Supabase) and object (test mock) formats
    const userData = request.user;
    const user = Array.isArray(userData) ? userData[0] as RequestUser : userData as RequestUser;
    if (!user || user.account_type !== 'establishment_owner') {
      throw BadRequestError('User no longer has establishment_owner account type');
    }

    // Check if ownership already exists (race condition protection)
    const { data: existingOwnership } = await supabase
      .from('establishment_owners')
      .select('id')
      .eq('user_id', request.user_id)
      .eq('establishment_id', request.establishment_id)
      .single();

    if (existingOwnership) {
      throw ConflictError('User already owns this establishment');
    }

    // Create establishment ownership with custom or default permissions
    // Default permissions
    const defaultPermissions = {
      can_edit_info: true,
      can_edit_pricing: true,
      can_edit_photos: true,
      can_edit_employees: false,
      can_view_analytics: true
    };

    // Merge custom permissions with defaults (custom overrides defaults)
    const finalPermissions = {
      ...defaultPermissions,
      ...(permissions || {})
    };

    const { error: ownershipError } = await supabase
      .from('establishment_owners')
      .insert({
        user_id: request.user_id,
        establishment_id: request.establishment_id,
        owner_role: owner_role || 'owner', // Allow custom role, default to 'owner'
        permissions: finalPermissions,
        assigned_by: adminId
      });

    if (ownershipError) {
      logger.error('Create ownership error:', ownershipError);
      throw InternalServerError('Failed to create ownership');
    }

    // BUG FIX: Update establishment status to 'approved' if it was pending
    // This ensures newly created establishments become visible after approval
    const { error: estUpdateError } = await supabase
      .from('establishments')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', request.establishment_id)
      .eq('status', 'pending'); // Only update if currently pending (claim won't change already approved)

    if (estUpdateError) {
      logger.warn('Failed to update establishment status:', estUpdateError);
      // Don't fail the request - ownership was already created successfully
    }

    // Update request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from('establishment_ownership_requests')
      .update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes: admin_notes || 'Approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Update request error:', updateError);
      throw InternalServerError('Failed to update request');
    }

    logger.info('Ownership request approved', {
      requestId: id,
      userId: request.user_id,
      establishmentId: request.establishment_id,
      approvedBy: req.user!.pseudonym
    });

    // Notify owner
    // Handle both array (Supabase) and object (test mock) formats
    const estData = request.establishment;
    const establishment = Array.isArray(estData) ? estData[0] as RequestEstablishment : estData as RequestEstablishment;
    await notifyOwnerRequestStatusChange(
      request.user_id,
      'approved',
      establishment?.name || 'Unknown establishment',
      admin_notes,
      id
    );

    res.json({
      message: 'Ownership request approved successfully',
      request: updatedRequest
    });
});

/**
 * Reject ownership request (admin only)
 * PATCH /api/admin/ownership-requests/:id/reject
 */
export const rejectOwnershipRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { admin_notes }: ReviewOwnershipRequestRequest = req.body;
    const adminId = req.user!.id;

    if (!admin_notes || admin_notes.trim() === '') {
      throw BadRequestError('admin_notes is required when rejecting a request');
    }

    // Get request details
    // Note: Using explicit FK hints to avoid Supabase 300 Multiple Choices error
    const { data: request, error: fetchError } = await supabase
      .from('establishment_ownership_requests')
      .select(`
        id,
        user_id,
        establishment_id,
        status,
        establishment:establishments!establishment_ownership_requests_establishment_id_fkey(id, name)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !request) {
      throw NotFoundError('Ownership request not found');
    }

    if (request.status !== 'pending') {
      throw BadRequestError(`Request has already been ${request.status}`);
    }

    // Update request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from('establishment_ownership_requests')
      .update({
        status: 'rejected',
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        admin_notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Update request error:', updateError);
      throw InternalServerError('Failed to update request');
    }

    logger.info('Ownership request rejected', {
      requestId: id,
      userId: request.user_id,
      establishmentId: request.establishment_id,
      rejectedBy: req.user!.pseudonym,
      reason: admin_notes
    });

    // Notify owner
    // Handle both array (Supabase) and object (test mock) formats
    const estData = request.establishment;
    const establishment = Array.isArray(estData) ? estData[0] as RequestEstablishment : estData as RequestEstablishment;
    await notifyOwnerRequestStatusChange(
      request.user_id,
      'rejected',
      establishment?.name || 'Unknown establishment',
      admin_notes,
      id
    );

    res.json({
      message: 'Ownership request rejected',
      request: updatedRequest
    });
});

/**
 * Cancel/delete ownership request (owner only)
 * DELETE /api/ownership-requests/:id
 */
export const cancelOwnershipRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify request exists and belongs to user
    const { data: request, error: fetchError } = await supabase
      .from('establishment_ownership_requests')
      .select('id, user_id, status, establishment:establishments(name)')
      .eq('id', id)
      .single();

    if (fetchError || !request) {
      throw NotFoundError('Ownership request not found');
    }

    if (request.user_id !== userId) {
      throw ForbiddenError('You can only cancel your own requests');
    }

    if (request.status !== 'pending') {
      throw BadRequestError(`Cannot cancel ${request.status} request`);
    }

    // Delete request
    const { error: deleteError } = await supabase
      .from('establishment_ownership_requests')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Delete ownership request error:', deleteError);
      throw InternalServerError('Failed to cancel request');
    }

    // Handle both array (Supabase) and object (test mock) formats
    const estData = request.establishment;
    const establishment = Array.isArray(estData) ? estData[0] as RequestEstablishment : estData as RequestEstablishment;
    logger.info('Ownership request cancelled', {
      requestId: id,
      userId,
      establishmentName: establishment?.name
    });

    res.json({
      message: 'Ownership request cancelled successfully'
    });
});
