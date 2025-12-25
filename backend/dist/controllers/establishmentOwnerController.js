"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEstablishmentOwnerPermissions = exports.removeEstablishmentOwner = exports.assignEstablishmentOwner = exports.getMyOwnedEstablishments = exports.getEstablishmentOwners = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const notificationHelper_1 = require("../utils/notificationHelper");
/**
 * Get all owners of a specific establishment (admin only)
 * GET /api/admin/establishments/:id/owners
 */
const getEstablishmentOwners = async (req, res) => {
    try {
        const { id } = req.params; // establishment_id
        // Verify establishment exists
        const { data: establishment, error: estError } = await supabase_1.supabase
            .from('establishments')
            .select('id, name')
            .eq('id', id)
            .single();
        if (estError || !establishment) {
            return res.status(404).json({ error: 'Establishment not found' });
        }
        // Get all owners with user details
        const { data: owners, error } = await supabase_1.supabase
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
        user:users(id, pseudonym, email, account_type),
        assigner:users!establishment_owners_assigned_by_fkey(id, pseudonym)
      `)
            .eq('establishment_id', id)
            .order('created_at', { ascending: false });
        if (error) {
            logger_1.logger.error('Get establishment owners error:', error);
            return res.status(500).json({ error: 'Failed to fetch owners' });
        }
        res.json({
            establishment: { id: establishment.id, name: establishment.name },
            owners: owners || []
        });
    }
    catch (error) {
        logger_1.logger.error('Get establishment owners error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getEstablishmentOwners = getEstablishmentOwners;
/**
 * Get all establishments owned by current user
 * GET /api/establishments/my-owned
 */
const getMyOwnedEstablishments = async (req, res) => {
    try {
        const userId = req.user.id;
        // Get ownership records with establishment details
        const { data: ownerships, error } = await supabase_1.supabase
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
            logger_1.logger.error('Get my owned establishments error:', error);
            return res.status(500).json({ error: 'Failed to fetch owned establishments' });
        }
        // Extract establishments from ownership records
        const establishments = ownerships?.map((ownership) => ({
            ...ownership.establishment,
            ownership_role: ownership.owner_role,
            permissions: ownership.permissions,
            owned_since: ownership.assigned_at
        })) || [];
        res.json({
            establishments,
            total: establishments.length
        });
    }
    catch (error) {
        logger_1.logger.error('Get my owned establishments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMyOwnedEstablishments = getMyOwnedEstablishments;
/**
 * Assign a user as owner of an establishment (admin only)
 * POST /api/admin/establishments/:id/owners
 */
const assignEstablishmentOwner = async (req, res) => {
    try {
        const { id } = req.params; // establishment_id
        const { user_id, owner_role = 'owner', permissions } = req.body;
        // Validate required fields
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }
        // Verify establishment exists
        const { data: establishment, error: estError } = await supabase_1.supabase
            .from('establishments')
            .select('id, name')
            .eq('id', id)
            .single();
        if (estError || !establishment) {
            return res.status(404).json({ error: 'Establishment not found' });
        }
        // Verify user exists and has establishment_owner account type
        const { data: targetUser, error: userError } = await supabase_1.supabase
            .from('users')
            .select('id, pseudonym, email, account_type')
            .eq('id', user_id)
            .single();
        if (userError || !targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (targetUser.account_type !== 'establishment_owner') {
            return res.status(400).json({
                error: 'User must have account_type=establishment_owner',
                current_account_type: targetUser.account_type
            });
        }
        // Check if ownership already exists
        const { data: existing } = await supabase_1.supabase
            .from('establishment_owners')
            .select('id')
            .eq('user_id', user_id)
            .eq('establishment_id', id)
            .single();
        if (existing) {
            return res.status(409).json({
                error: 'User is already an owner of this establishment'
            });
        }
        // Create ownership record
        const { data: ownership, error } = await supabase_1.supabase
            .from('establishment_owners')
            .insert({
            user_id,
            establishment_id: id,
            owner_role,
            permissions: permissions || undefined, // Use default if not provided
            assigned_by: req.user.id
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
        user:users(id, pseudonym, email),
        establishment:establishments(id, name)
      `)
            .single();
        if (error) {
            logger_1.logger.error('Assign establishment owner error:', error);
            return res.status(500).json({ error: 'Failed to assign owner' });
        }
        // BUG FIX: Auto-resolve any pending ownership requests for this user+establishment
        // Check if user has a pending request for this establishment
        const { data: pendingRequest } = await supabase_1.supabase
            .from('establishment_ownership_requests')
            .select('id, status')
            .eq('user_id', user_id)
            .eq('establishment_id', id)
            .eq('status', 'pending')
            .single();
        if (pendingRequest) {
            // Auto-approve the pending request
            const { error: approveError } = await supabase_1.supabase
                .from('establishment_ownership_requests')
                .update({
                status: 'approved',
                reviewed_by: req.user.id,
                reviewed_at: new Date().toISOString(),
                admin_notes: 'Automatically approved - ownership manually assigned by admin'
            })
                .eq('id', pendingRequest.id);
            if (approveError) {
                logger_1.logger.warn('Failed to auto-approve pending request during manual assignment', {
                    requestId: pendingRequest.id,
                    userId: user_id,
                    establishmentId: id,
                    error: approveError
                });
            }
            else {
                logger_1.logger.info('Pending ownership request auto-approved', {
                    requestId: pendingRequest.id,
                    userId: user_id,
                    establishmentId: id,
                    approvedBy: req.user.pseudonym
                });
            }
        }
        logger_1.logger.info('Establishment owner assigned', {
            establishmentId: id,
            establishmentName: establishment.name,
            ownerId: user_id,
            ownerPseudonym: targetUser.pseudonym,
            assignedBy: req.user.pseudonym
        });
        // Notify user that they've been assigned as establishment owner
        await (0, notificationHelper_1.notifyEstablishmentOwnerAssigned)(user_id, establishment.name, id, owner_role);
        res.status(201).json({
            message: 'Owner assigned successfully',
            ownership
        });
    }
    catch (error) {
        logger_1.logger.error('Assign establishment owner error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.assignEstablishmentOwner = assignEstablishmentOwner;
/**
 * Remove an owner from an establishment (admin only)
 * DELETE /api/admin/establishments/:id/owners/:userId
 */
const removeEstablishmentOwner = async (req, res) => {
    try {
        const { id, userId } = req.params; // establishment_id, user_id
        // Verify ownership exists
        const { data: ownership, error: fetchError } = await supabase_1.supabase
            .from('establishment_owners')
            .select(`
        id,
        user:users(pseudonym),
        establishment:establishments(name)
      `)
            .eq('establishment_id', id)
            .eq('user_id', userId)
            .single();
        if (fetchError || !ownership) {
            return res.status(404).json({ error: 'Ownership record not found' });
        }
        // Delete ownership
        const { error } = await supabase_1.supabase
            .from('establishment_owners')
            .delete()
            .eq('establishment_id', id)
            .eq('user_id', userId);
        if (error) {
            logger_1.logger.error('Remove establishment owner error:', error);
            return res.status(500).json({ error: 'Failed to remove owner' });
        }
        logger_1.logger.info('Establishment owner removed', {
            establishmentId: id,
            establishmentName: ownership.establishment?.name,
            ownerId: userId,
            ownerPseudonym: ownership.user?.pseudonym,
            removedBy: req.user.pseudonym
        });
        // Notify user that they've been removed as establishment owner
        await (0, notificationHelper_1.notifyEstablishmentOwnerRemoved)(userId, ownership.establishment?.name || 'Unknown', id);
        res.json({
            message: 'Owner removed successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Remove establishment owner error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.removeEstablishmentOwner = removeEstablishmentOwner;
/**
 * Update owner permissions (admin only)
 * PATCH /api/admin/establishments/:id/owners/:userId
 */
const updateEstablishmentOwnerPermissions = async (req, res) => {
    try {
        const { id, userId } = req.params; // establishment_id, user_id
        const { permissions, owner_role } = req.body;
        if (!permissions && !owner_role) {
            return res.status(400).json({ error: 'permissions or owner_role is required' });
        }
        // Verify ownership exists
        const { data: existing, error: fetchError } = await supabase_1.supabase
            .from('establishment_owners')
            .select('id')
            .eq('establishment_id', id)
            .eq('user_id', userId)
            .single();
        if (fetchError || !existing) {
            return res.status(404).json({ error: 'Ownership record not found' });
        }
        // Update ownership
        const updates = { updated_at: new Date().toISOString() };
        if (permissions)
            updates.permissions = permissions;
        if (owner_role)
            updates.owner_role = owner_role;
        const { data: updated, error } = await supabase_1.supabase
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
        user:users(id, pseudonym, email),
        establishment:establishments(id, name)
      `)
            .single();
        if (error) {
            logger_1.logger.error('Update establishment owner permissions error:', error);
            return res.status(500).json({ error: 'Failed to update permissions' });
        }
        logger_1.logger.info('Establishment owner permissions updated', {
            establishmentId: id,
            ownerId: userId,
            updatedBy: req.user.pseudonym
        });
        // Notify user that their permissions have been updated
        if (updated && permissions) {
            await (0, notificationHelper_1.notifyEstablishmentOwnerPermissionsUpdated)(userId, updated.establishment?.name || 'Unknown', id, permissions);
        }
        res.json({
            message: 'Permissions updated successfully',
            ownership: updated
        });
    }
    catch (error) {
        logger_1.logger.error('Update establishment owner permissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateEstablishmentOwnerPermissions = updateEstablishmentOwnerPermissions;
//# sourceMappingURL=establishmentOwnerController.js.map