import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { CreateEstablishmentOwnerRequest } from '../types';
import {
  notifyEstablishmentOwnerAssigned,
  notifyEstablishmentOwnerRemoved,
  notifyEstablishmentOwnerPermissionsUpdated
} from '../utils/notificationHelper';
import { asyncHandler, BadRequestError, NotFoundError, ConflictError, InternalServerError } from '../middleware/asyncHandler';

/**
 * Get all owners of a specific establishment (admin only)
 * GET /api/admin/establishments/:id/owners
 */
export const getEstablishmentOwners = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params; // establishment_id

    // Verify establishment exists
    const { data: establishment, error: estError } = await supabase
      .from('establishments')
      .select('id, name')
      .eq('id', id)
      .single();

    if (estError || !establishment) {
      throw NotFoundError('Establishment not found');
    }

    // Get all owners with user details
    const { data: owners, error } = await supabase
      .from('establishment_owners')
      .select(`
        id,
        user_id,
        establishment_id,
        owner_role,
        permissions,
        assigned_by,
        assigned_at,
        created_at,
        updated_at,
        user:users!establishment_owners_user_id_fkey(id, pseudonym, email, account_type),
        assigner:users!establishment_owners_assigned_by_fkey(id, pseudonym)
      `)
      .eq('establishment_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Get establishment owners error:', error);
      throw InternalServerError('Failed to fetch owners');
    }

    res.json({
      establishment: { id: establishment.id, name: establishment.name },
      owners: owners || []
    });
});

/**
 * Get all establishments owned by current user
 * GET /api/establishments/my-owned
 */
export const getMyOwnedEstablishments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    // Get ownership records with establishment details
    const { data: ownerships, error } = await supabase
      .from('establishment_owners')
      .select(`
        id,
        user_id,
        establishment_id,
        owner_role,
        permissions,
        assigned_at,
        establishment:establishments(
          id,
          name,
          address,
          zone,
          grid_row,
          grid_col,
          category_id,
          description,
          phone,
          website,
          location,
          opening_hours,
          instagram,
          twitter,
          tiktok,
          status,
          created_at,
          updated_at,
          logo_url,
          ladydrink,
          barfine,
          rooms,
          category:establishment_categories(*)
        )
      `)
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });

    if (error) {
      logger.error('Get my owned establishments error:', error);
      throw InternalServerError('Failed to fetch owned establishments');
    }

    // Extract establishments from ownership records
    const establishments = ownerships?.map((ownership: any) => ({
      ...ownership.establishment,
      ownership_role: ownership.owner_role,
      permissions: ownership.permissions,
      owned_since: ownership.assigned_at
    })) || [];

    res.json({
      establishments,
      total: establishments.length
    });
});

/**
 * Assign a user as owner of an establishment (admin only)
 * POST /api/admin/establishments/:id/owners
 */
export const assignEstablishmentOwner = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params; // establishment_id
    const { user_id, owner_role = 'owner', permissions }: CreateEstablishmentOwnerRequest = req.body;

    // Validate required fields
    if (!user_id) {
      throw BadRequestError('user_id is required');
    }

    // Verify establishment exists
    const { data: establishment, error: estError } = await supabase
      .from('establishments')
      .select('id, name')
      .eq('id', id)
      .single();

    if (estError || !establishment) {
      throw NotFoundError('Establishment not found');
    }

    // Verify user exists and has establishment_owner account type
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, pseudonym, email, account_type')
      .eq('id', user_id)
      .single();

    if (userError || !targetUser) {
      throw NotFoundError('User not found');
    }

    if (targetUser.account_type !== 'establishment_owner') {
      throw BadRequestError('User must have account_type=establishment_owner');
    }

    // Check if ownership already exists
    const { data: existing } = await supabase
      .from('establishment_owners')
      .select('id')
      .eq('user_id', user_id)
      .eq('establishment_id', id)
      .single();

    if (existing) {
      throw ConflictError('User is already an owner of this establishment');
    }

    // Create ownership record
    const { data: ownership, error } = await supabase
      .from('establishment_owners')
      .insert({
        user_id,
        establishment_id: id,
        owner_role,
        permissions: permissions || undefined, // Use default if not provided
        assigned_by: req.user!.id
      })
      .select(`
        id,
        user_id,
        establishment_id,
        owner_role,
        permissions,
        assigned_by,
        assigned_at,
        created_at,
        updated_at,
        user:users!establishment_owners_user_id_fkey(id, pseudonym, email),
        establishment:establishments(id, name)
      `)
      .single();

    if (error) {
      logger.error('Assign establishment owner error:', error);
      throw InternalServerError('Failed to assign owner');
    }

    // BUG FIX: Auto-resolve any pending ownership requests for this user+establishment
    // Check if user has a pending request for this establishment
    const { data: pendingRequest } = await supabase
      .from('establishment_ownership_requests')
      .select('id, status')
      .eq('user_id', user_id)
      .eq('establishment_id', id)
      .eq('status', 'pending')
      .single();

    if (pendingRequest) {
      // Auto-approve the pending request
      const { error: approveError } = await supabase
        .from('establishment_ownership_requests')
        .update({
          status: 'approved',
          reviewed_by: req.user!.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: 'Automatically approved - ownership manually assigned by admin'
        })
        .eq('id', pendingRequest.id);

      if (approveError) {
        logger.warn('Failed to auto-approve pending request during manual assignment', {
          requestId: pendingRequest.id,
          userId: user_id,
          establishmentId: id,
          error: approveError
        });
      } else {
        logger.info('Pending ownership request auto-approved', {
          requestId: pendingRequest.id,
          userId: user_id,
          establishmentId: id,
          approvedBy: req.user!.pseudonym
        });
      }
    }

    logger.info('Establishment owner assigned', {
      establishmentId: id,
      establishmentName: establishment.name,
      ownerId: user_id,
      ownerPseudonym: targetUser.pseudonym,
      assignedBy: req.user!.pseudonym
    });

    // Notify user that they've been assigned as establishment owner
    await notifyEstablishmentOwnerAssigned(
      user_id,
      establishment.name,
      id,
      owner_role
    );

    res.status(201).json({
      message: 'Owner assigned successfully',
      ownership
    });
});

/**
 * Remove an owner from an establishment (admin only)
 * DELETE /api/admin/establishments/:id/owners/:userId
 */
export const removeEstablishmentOwner = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, userId } = req.params; // establishment_id, user_id

    // Verify ownership exists
    const { data: ownership, error: fetchError } = await supabase
      .from('establishment_owners')
      .select(`
        id,
        user:users!establishment_owners_user_id_fkey(pseudonym),
        establishment:establishments(name)
      `)
      .eq('establishment_id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !ownership) {
      throw NotFoundError('Ownership record not found');
    }

    // Delete ownership
    const { error } = await supabase
      .from('establishment_owners')
      .delete()
      .eq('establishment_id', id)
      .eq('user_id', userId);

    if (error) {
      logger.error('Remove establishment owner error:', error);
      throw InternalServerError('Failed to remove owner');
    }

    logger.info('Establishment owner removed', {
      establishmentId: id,
      establishmentName: (ownership.establishment as any)?.name,
      ownerId: userId,
      ownerPseudonym: (ownership.user as any)?.pseudonym,
      removedBy: req.user!.pseudonym
    });

    // Notify user that they've been removed as establishment owner
    await notifyEstablishmentOwnerRemoved(
      userId,
      (ownership.establishment as any)?.name || 'Unknown',
      id
    );

    res.json({
      message: 'Owner removed successfully'
    });
});

/**
 * Update owner permissions (admin only)
 * PATCH /api/admin/establishments/:id/owners/:userId
 */
export const updateEstablishmentOwnerPermissions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id, userId } = req.params; // establishment_id, user_id
    const { permissions, owner_role } = req.body;

    if (!permissions && !owner_role) {
      throw BadRequestError('permissions or owner_role is required');
    }

    // Verify ownership exists
    const { data: existing, error: fetchError } = await supabase
      .from('establishment_owners')
      .select('id')
      .eq('establishment_id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      throw NotFoundError('Ownership record not found');
    }

    // Update ownership
    const updates: any = { updated_at: new Date().toISOString() };
    if (permissions) updates.permissions = permissions;
    if (owner_role) updates.owner_role = owner_role;

    const { data: updated, error } = await supabase
      .from('establishment_owners')
      .update(updates)
      .eq('establishment_id', id)
      .eq('user_id', userId)
      .select(`
        id,
        user_id,
        establishment_id,
        owner_role,
        permissions,
        assigned_by,
        assigned_at,
        created_at,
        updated_at,
        user:users!establishment_owners_user_id_fkey(id, pseudonym, email),
        establishment:establishments(id, name)
      `)
      .single();

    if (error) {
      logger.error('Update establishment owner permissions error:', error);
      throw InternalServerError('Failed to update permissions');
    }

    logger.info('Establishment owner permissions updated', {
      establishmentId: id,
      ownerId: userId,
      updatedBy: req.user!.pseudonym
    });

    // Notify user that their permissions have been updated
    if (updated && permissions) {
      await notifyEstablishmentOwnerPermissionsUpdated(
        userId,
        (updated.establishment as any)?.name || 'Unknown',
        id,
        permissions
      );
    }

    res.json({
      message: 'Permissions updated successfully',
      ownership: updated
    });
});
