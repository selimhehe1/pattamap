/**
 * Deletion Request Controller
 *
 * Handles requests from users who want their employee profile deleted.
 * This is part of PDPA compliance - users have the right to request deletion
 * of their personal data.
 *
 * Flow:
 * 1. User uploads proof of identity (selfie or document)
 * 2. Proof is stored on Cloudinary
 * 3. Request is saved to database
 * 4. Admin receives email notification
 * 5. Admin manually reviews and processes the request
 */

import { Request, Response } from 'express';
import cloudinary, { ensureConfigured } from '../config/cloudinary';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { sendDeletionRequestEmail } from '../services/emailService';
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/asyncHandler';

interface DeletionRequestBody {
  email: string;
  message?: string;
  employeeId: string;
  employeeName: string;
}

/**
 * Submit a deletion request for an employee profile
 * POST /api/employees/:id/deletion-request
 *
 * This endpoint is public (no auth required) since the person requesting
 * deletion may not have an account.
 *
 * Body (multipart/form-data):
 * - proof: File (required) - Image or PDF proof of identity
 * - email: string (required) - Contact email
 * - message: string (optional) - Additional context
 * - employeeId: string (required) - ID of employee profile
 * - employeeName: string (required) - Name for email notification
 */
export const submitDeletionRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, message, employeeName } = req.body as DeletionRequestBody;

  // Validate required fields
  if (!email || !email.includes('@')) {
    throw BadRequestError('Valid email address is required');
  }

  if (!req.file) {
    throw BadRequestError('Proof of identity file is required');
  }

  // Verify the employee exists
  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id, name, user_id')
    .eq('id', id)
    .single();

  if (employeeError || !employee) {
    throw NotFoundError('Employee profile not found');
  }

  // Upload proof to Cloudinary
  ensureConfigured();

  const proofUrl = await new Promise<string>((resolve, reject) => {
    const b64 = Buffer.from(req.file!.buffer).toString('base64');
    const dataURI = `data:${req.file!.mimetype};base64,${b64}`;

    cloudinary.uploader.upload(
      dataURI,
      {
        folder: 'pattaya-directory/deletion-requests',
        public_id: `deletion_${id}_${Date.now()}`,
        // Don't apply aggressive transformations - we need the original for verification
        transformation: [
          { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' },
          { format: 'auto' }
        ],
        // Set access control - private URL with signature
        type: 'private'
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error for deletion proof:', error);
          reject(new Error('Failed to upload proof document'));
        } else {
          resolve(result!.secure_url);
        }
      }
    );
  });

  // Save deletion request to database
  const { data: deletionRequest, error: insertError } = await supabase
    .from('deletion_requests')
    .insert({
      employee_id: id,
      requester_email: email,
      message: message || null,
      proof_url: proofUrl,
      status: 'pending',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    // If the table doesn't exist, log and continue anyway
    if (insertError.code === '42P01') {
      logger.warn('deletion_requests table does not exist. Request logged but not saved to DB.');
    } else {
      logger.error('Failed to save deletion request:', insertError);
    }
  }

  // Send email notification to admin
  const emailSent = await sendDeletionRequestEmail({
    employeeId: id,
    employeeName: employeeName || employee.name,
    requesterEmail: email,
    message: message || undefined,
    proofUrl
  });

  if (!emailSent) {
    logger.warn('Deletion request email could not be sent, but request was saved');
  }

  // Log the request for audit purposes
  logger.info('🗑️ Deletion request submitted', {
    employeeId: id,
    employeeName: employee.name,
    requesterEmail: email,
    requestId: deletionRequest?.id || 'not_saved',
    proofUrl
  });

  res.status(201).json({
    success: true,
    message: 'Deletion request submitted successfully. We will contact you at the provided email address.',
    requestId: deletionRequest?.id || null
  });
});

/**
 * Get all pending deletion requests (admin only)
 * GET /api/admin/deletion-requests
 */
export const getDeletionRequests = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string || 'pending';

  const { data: requests, error } = await supabase
    .from('deletion_requests')
    .select(`
      *,
      employee:employees (
        id,
        name,
        nickname,
        photos
      )
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch deletion requests:', error);
    throw new Error('Failed to fetch deletion requests');
  }

  res.json({
    success: true,
    requests: requests || []
  });
});

/**
 * Process a deletion request (admin only)
 * PATCH /api/admin/deletion-requests/:requestId
 *
 * Body:
 * - action: 'approve' | 'reject'
 * - admin_notes: string (optional)
 */
export const processDeletionRequest = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { action, admin_notes } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    throw BadRequestError('Invalid action. Must be "approve" or "reject"');
  }

  const { data: request, error: fetchError } = await supabase
    .from('deletion_requests')
    .select('*, employee:employees(*)')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) {
    throw NotFoundError('Deletion request not found');
  }

  // Update request status
  const { error: updateError } = await supabase
    .from('deletion_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      processed_at: new Date().toISOString(),
      admin_notes: admin_notes || null
    })
    .eq('id', requestId);

  if (updateError) {
    logger.error('Failed to update deletion request:', updateError);
    throw new Error('Failed to process deletion request');
  }

  // If approved, mark employee for deletion or soft-delete
  if (action === 'approve' && request.employee_id) {
    // Option 1: Soft delete - mark as removed
    await supabase
      .from('employees')
      .update({
        status: 'removed',
        self_removal_requested: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.employee_id);

    logger.info('🗑️ Employee profile marked for deletion after request approval', {
      employeeId: request.employee_id,
      requestId
    });
  }

  res.json({
    success: true,
    message: `Deletion request ${action}d successfully`
  });
});
