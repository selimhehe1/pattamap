"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOwnershipRequest = exports.rejectOwnershipRequest = exports.approveOwnershipRequest = exports.getAllOwnershipRequests = exports.getMyOwnershipRequests = exports.createOwnershipRequest = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const notificationHelper_1 = require("../utils/notificationHelper");
/**
 * Create a new ownership request (establishment owner only)
 * POST /api/ownership-requests
 */
const createOwnershipRequest = async (req, res) => {
    try {
        const userId = req.user.id;
        const { establishment_id, documents_urls, verification_code, request_message, establishment_data } = req.body;
        // Validate required fields
        if (!establishment_id && !establishment_data) {
            return res.status(400).json({
                error: 'Either establishment_id or establishment_data is required'
            });
        }
        if (!documents_urls || documents_urls.length === 0) {
            return res.status(400).json({
                error: 'At least one document is required'
            });
        }
        // Validate establishment_data if provided
        if (establishment_data) {
            const { name, address, latitude, longitude, category_id } = establishment_data;
            if (!name || !address || !latitude || !longitude || !category_id) {
                return res.status(400).json({
                    error: 'establishment_data must include: name, address, latitude, longitude, category_id'
                });
            }
        }
        // Verify user has establishment_owner account type
        const { data: user, error: userError } = await supabase_1.supabase
            .from('users')
            .select('account_type, pseudonym')
            .eq('id', userId)
            .single();
        if (userError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.account_type !== 'establishment_owner') {
            return res.status(403).json({
                error: 'Only establishment owners can request ownership',
                current_account_type: user.account_type
            });
        }
        // Handle establishment creation if data provided
        let finalEstablishmentId = establishment_id;
        let establishmentName;
        let isNewEstablishment = false;
        if (establishment_data) {
            // Create new establishment with status='pending'
            const { data: newEstablishment, error: createError } = await supabase_1.supabase
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
                logger_1.logger.error('Create establishment error:', createError);
                return res.status(500).json({ error: 'Failed to create establishment' });
            }
            finalEstablishmentId = newEstablishment.id;
            establishmentName = newEstablishment.name;
            isNewEstablishment = true;
            logger_1.logger.info('Establishment created for ownership request', {
                establishmentId: finalEstablishmentId,
                establishmentName,
                userId
            });
        }
        else {
            // Verify existing establishment
            const { data: establishment, error: estError } = await supabase_1.supabase
                .from('establishments')
                .select('id, name')
                .eq('id', establishment_id)
                .single();
            if (estError || !establishment) {
                return res.status(404).json({ error: 'Establishment not found' });
            }
            establishmentName = establishment.name;
        }
        // Check if user already owns this establishment
        const { data: existingOwnership } = await supabase_1.supabase
            .from('establishment_owners')
            .select('id')
            .eq('user_id', userId)
            .eq('establishment_id', finalEstablishmentId)
            .single();
        if (existingOwnership) {
            return res.status(409).json({
                error: 'You already own this establishment'
            });
        }
        // Check if there's already a pending request
        const { data: existingRequest } = await supabase_1.supabase
            .from('establishment_ownership_requests')
            .select('id, status')
            .eq('user_id', userId)
            .eq('establishment_id', finalEstablishmentId)
            .eq('status', 'pending')
            .single();
        if (existingRequest) {
            return res.status(409).json({
                error: 'You already have a pending request for this establishment'
            });
        }
        // Create ownership request
        const { data: request, error } = await supabase_1.supabase
            .from('establishment_ownership_requests')
            .insert({
            user_id: userId,
            establishment_id: finalEstablishmentId,
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
            logger_1.logger.error('Create ownership request error:', error);
            return res.status(500).json({ error: 'Failed to create ownership request' });
        }
        logger_1.logger.info('Ownership request created', {
            requestId: request.id,
            userId,
            establishmentId: finalEstablishmentId,
            establishmentName,
            isNewEstablishment
        });
        // Notify admins (include isNewEstablishment flag)
        await (0, notificationHelper_1.notifyAdminsNewOwnershipRequest)(establishmentName, user.pseudonym, request.id, isNewEstablishment);
        // 🔔 Notify user that their request was submitted (include isNewEstablishment flag)
        try {
            await (0, notificationHelper_1.notifyOwnershipRequestSubmitted)(userId, establishmentName, request.id, isNewEstablishment);
        }
        catch (notifyError) {
            // Log error but don't fail the request if notification fails
            logger_1.logger.error('User notification error (ownership request submitted):', notifyError);
        }
        const message = isNewEstablishment
            ? 'Ownership request submitted successfully. Your new establishment and ownership request will be reviewed by admins.'
            : 'Ownership request submitted successfully. Admins will review your request.';
        res.status(201).json({
            message,
            request,
            isNewEstablishment
        });
    }
    catch (error) {
        logger_1.logger.error('Create ownership request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.createOwnershipRequest = createOwnershipRequest;
/**
 * Get current user's ownership requests (establishment owner only)
 * GET /api/ownership-requests/my
 */
const getMyOwnershipRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data: requests, error } = await supabase_1.supabase
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
            logger_1.logger.error('Get my ownership requests error:', error);
            return res.status(500).json({ error: 'Failed to fetch ownership requests' });
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
    }
    catch (error) {
        logger_1.logger.error('Get my ownership requests error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getMyOwnershipRequests = getMyOwnershipRequests;
/**
 * Get all ownership requests (admin only)
 * GET /api/admin/ownership-requests
 * Query params: ?status=pending|approved|rejected
 */
const getAllOwnershipRequests = async (req, res) => {
    try {
        const { status } = req.query;
        // Note: Removed reviewer join as it causes Supabase 300 Multiple Choices error
        // when reviewed_by is NULL for pending requests. Reviewer info can be fetched
        // separately if needed.
        let query = supabase_1.supabase
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
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            query = query.eq('status', status);
        }
        const { data: requests, error } = await query;
        if (error) {
            logger_1.logger.error('Get all ownership requests error:', error);
            return res.status(500).json({ error: 'Failed to fetch ownership requests' });
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
    }
    catch (error) {
        logger_1.logger.error('Get all ownership requests error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllOwnershipRequests = getAllOwnershipRequests;
/**
 * Approve ownership request (admin only)
 * PATCH /api/admin/ownership-requests/:id/approve
 */
const approveOwnershipRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_notes, permissions, owner_role } = req.body;
        const adminId = req.user.id;
        // Get request details
        const { data: request, error: fetchError } = await supabase_1.supabase
            .from('establishment_ownership_requests')
            .select(`
        id,
        user_id,
        establishment_id,
        status,
        user:users(id, pseudonym, email, account_type),
        establishment:establishments(id, name)
      `)
            .eq('id', id)
            .single();
        if (fetchError || !request) {
            return res.status(404).json({ error: 'Ownership request not found' });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({
                error: `Request has already been ${request.status}`,
                current_status: request.status
            });
        }
        // Verify user still has establishment_owner account type
        const user = request.user;
        if (!user || user.account_type !== 'establishment_owner') {
            return res.status(400).json({
                error: 'User no longer has establishment_owner account type',
                current_account_type: user?.account_type
            });
        }
        // Check if ownership already exists (race condition protection)
        const { data: existingOwnership } = await supabase_1.supabase
            .from('establishment_owners')
            .select('id')
            .eq('user_id', request.user_id)
            .eq('establishment_id', request.establishment_id)
            .single();
        if (existingOwnership) {
            return res.status(409).json({
                error: 'User already owns this establishment'
            });
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
        const { error: ownershipError } = await supabase_1.supabase
            .from('establishment_owners')
            .insert({
            user_id: request.user_id,
            establishment_id: request.establishment_id,
            owner_role: owner_role || 'owner', // Allow custom role, default to 'owner'
            permissions: finalPermissions,
            assigned_by: adminId
        });
        if (ownershipError) {
            logger_1.logger.error('Create ownership error:', ownershipError);
            return res.status(500).json({ error: 'Failed to create ownership' });
        }
        // Update request status
        const { data: updatedRequest, error: updateError } = await supabase_1.supabase
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
            logger_1.logger.error('Update request error:', updateError);
            return res.status(500).json({ error: 'Failed to update request' });
        }
        logger_1.logger.info('Ownership request approved', {
            requestId: id,
            userId: request.user_id,
            establishmentId: request.establishment_id,
            approvedBy: req.user.pseudonym
        });
        // Notify owner
        const establishment = request.establishment;
        await (0, notificationHelper_1.notifyOwnerRequestStatusChange)(request.user_id, 'approved', establishment.name, admin_notes, id);
        res.json({
            message: 'Ownership request approved successfully',
            request: updatedRequest
        });
    }
    catch (error) {
        logger_1.logger.error('Approve ownership request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.approveOwnershipRequest = approveOwnershipRequest;
/**
 * Reject ownership request (admin only)
 * PATCH /api/admin/ownership-requests/:id/reject
 */
const rejectOwnershipRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { admin_notes } = req.body;
        const adminId = req.user.id;
        if (!admin_notes || admin_notes.trim() === '') {
            return res.status(400).json({
                error: 'admin_notes is required when rejecting a request'
            });
        }
        // Get request details
        const { data: request, error: fetchError } = await supabase_1.supabase
            .from('establishment_ownership_requests')
            .select(`
        id,
        user_id,
        establishment_id,
        status,
        establishment:establishments(id, name)
      `)
            .eq('id', id)
            .single();
        if (fetchError || !request) {
            return res.status(404).json({ error: 'Ownership request not found' });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({
                error: `Request has already been ${request.status}`,
                current_status: request.status
            });
        }
        // Update request status
        const { data: updatedRequest, error: updateError } = await supabase_1.supabase
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
            logger_1.logger.error('Update request error:', updateError);
            return res.status(500).json({ error: 'Failed to update request' });
        }
        logger_1.logger.info('Ownership request rejected', {
            requestId: id,
            userId: request.user_id,
            establishmentId: request.establishment_id,
            rejectedBy: req.user.pseudonym,
            reason: admin_notes
        });
        // Notify owner
        const establishment = request.establishment;
        await (0, notificationHelper_1.notifyOwnerRequestStatusChange)(request.user_id, 'rejected', establishment.name, admin_notes, id);
        res.json({
            message: 'Ownership request rejected',
            request: updatedRequest
        });
    }
    catch (error) {
        logger_1.logger.error('Reject ownership request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.rejectOwnershipRequest = rejectOwnershipRequest;
/**
 * Cancel/delete ownership request (owner only)
 * DELETE /api/ownership-requests/:id
 */
const cancelOwnershipRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // Verify request exists and belongs to user
        const { data: request, error: fetchError } = await supabase_1.supabase
            .from('establishment_ownership_requests')
            .select('id, user_id, status, establishment:establishments(name)')
            .eq('id', id)
            .single();
        if (fetchError || !request) {
            return res.status(404).json({ error: 'Ownership request not found' });
        }
        if (request.user_id !== userId) {
            return res.status(403).json({
                error: 'You can only cancel your own requests'
            });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({
                error: `Cannot cancel ${request.status} request`,
                current_status: request.status
            });
        }
        // Delete request
        const { error: deleteError } = await supabase_1.supabase
            .from('establishment_ownership_requests')
            .delete()
            .eq('id', id);
        if (deleteError) {
            logger_1.logger.error('Delete ownership request error:', deleteError);
            return res.status(500).json({ error: 'Failed to cancel request' });
        }
        const establishment = request.establishment;
        logger_1.logger.info('Ownership request cancelled', {
            requestId: id,
            userId,
            establishmentName: establishment?.name
        });
        res.json({
            message: 'Ownership request cancelled successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Cancel ownership request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.cancelOwnershipRequest = cancelOwnershipRequest;
//# sourceMappingURL=ownershipRequestController.js.map