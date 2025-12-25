"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeVerification = exports.getRecentVerifications = exports.reviewVerification = exports.getManualReviewQueue = exports.getVerificationStatus = exports.submitVerification = void 0;
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const verification_1 = require("../config/verification");
const notificationHelper_1 = require("../utils/notificationHelper");
/**
 * Submit verification request
 * POST /api/employees/:id/verify
 * Requires: Employee account linked to the employee profile
 */
const submitVerification = async (req, res) => {
    try {
        const { id } = req.params; // employee_id
        const { selfie_url } = req.body;
        // Validate input
        if (!selfie_url) {
            return res.status(400).json({ error: 'selfie_url is required' });
        }
        // Verify employee exists
        const { data: employee, error: empError } = await supabase_1.supabase
            .from('employees')
            .select('id, name, photos, is_verified, verified_at, user_id')
            .eq('id', id)
            .single();
        if (empError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Cast to include new verification fields (types will be updated after Supabase type regeneration)
        const employeeData = employee;
        // Authorization check: Only the employee themselves can request verification
        // (user_id must match the logged-in user)
        if (employeeData.user_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only verify your own profile' });
        }
        // Check if already verified
        if (employeeData.is_verified) {
            return res.status(400).json({
                error: 'Profile is already verified',
                verified_at: employeeData.verified_at
            });
        }
        // Check rate limiting - max 3 attempts per 24h
        const twentyFourHoursAgo = new Date(Date.now() - verification_1.VERIFICATION_RATE_LIMIT.WINDOW_HOURS * 60 * 60 * 1000).toISOString();
        const { data: recentAttempts, error: rateError } = await supabase_1.supabase
            .from('employee_verifications')
            .select('id, submitted_at')
            .eq('employee_id', id)
            .gte('submitted_at', twentyFourHoursAgo)
            .order('submitted_at', { ascending: false });
        if (rateError) {
            logger_1.logger.error('Rate limit check error:', rateError);
        }
        if (recentAttempts && recentAttempts.length >= verification_1.VERIFICATION_RATE_LIMIT.MAX_ATTEMPTS) {
            return res.status(429).json({
                error: `Maximum ${verification_1.VERIFICATION_RATE_LIMIT.MAX_ATTEMPTS} verification attempts per ${verification_1.VERIFICATION_RATE_LIMIT.WINDOW_HOURS} hours`,
                retry_after: recentAttempts[0].submitted_at
            });
        }
        // 🔧 NEW WORKFLOW: Full manual review (no AI)
        // Status: manual_review + badge given immediately (admin will verify later)
        const status = verification_1.VERIFICATION_STATUS.MANUAL_REVIEW;
        const autoApproved = false;
        const faceMatchScore = 0; // No face detection anymore
        // Create verification record
        const { data: verification, error: verifyError } = await supabase_1.supabase
            .from('employee_verifications')
            .insert({
            employee_id: id,
            selfie_url,
            face_match_score: faceMatchScore,
            status,
            auto_approved: autoApproved
        })
            .select('id, status, face_match_score, auto_approved, submitted_at')
            .single();
        if (verifyError) {
            logger_1.logger.error('Create verification record error:', verifyError);
            return res.status(500).json({ error: 'Failed to create verification record' });
        }
        // Update employee record with verified status
        const { error: updateError } = await supabase_1.supabase
            .from('employees')
            .update({
            is_verified: true,
            verified_at: new Date().toISOString()
        })
            .eq('id', id);
        if (updateError) {
            logger_1.logger.error('Update employee verified status error:', updateError);
        }
        else {
            logger_1.logger.info('Employee verification submitted (manual review)', {
                employeeId: id,
                employeeName: employeeData.name,
                status: 'manual_review',
                badgeActive: true
            });
        }
        // Notify employee that verification was submitted
        if (employeeData.user_id) {
            await (0, notificationHelper_1.notifyEmployeeVerificationSubmitted)(employeeData.user_id, employeeData.name);
        }
        // Notify admins of new verification request
        await (0, notificationHelper_1.notifyAdminsNewVerificationRequest)(employeeData.name, verification.id);
        // Success message
        const message = 'Verification submitted! Your badge is active. An admin will review your submission soon.';
        res.status(201).json({
            message,
            verification: {
                id: verification.id,
                status: verification.status,
                face_match_score: verification.face_match_score,
                auto_approved: verification.auto_approved,
                submitted_at: verification.submitted_at
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Submit verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.submitVerification = submitVerification;
/**
 * Get verification status for an employee
 * GET /api/employees/:id/verification-status
 * Public endpoint (any authenticated user)
 */
const getVerificationStatus = async (req, res) => {
    try {
        const { id } = req.params; // employee_id
        // Get employee verification status
        const { data: employee, error: empError } = await supabase_1.supabase
            .from('employees')
            .select('id, name, is_verified, verified_at')
            .eq('id', id)
            .single();
        if (empError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Get latest verification record (if any)
        const { data: verification, error: verifyError } = await supabase_1.supabase
            .from('employee_verifications')
            .select('id, status, face_match_score, submitted_at, auto_approved, admin_notes, reviewed_by, reviewed_at')
            .eq('employee_id', id)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .single();
        // Allow null error if no verification exists yet
        if (verifyError && verifyError.code !== 'PGRST116') {
            logger_1.logger.error('Get verification status error:', verifyError);
        }
        res.json({
            employee: {
                id: employee.id,
                name: employee.name,
                is_verified: employee.is_verified,
                verified_at: employee.verified_at
            },
            latest_verification: verification || null
        });
    }
    catch (error) {
        logger_1.logger.error('Get verification status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getVerificationStatus = getVerificationStatus;
/**
 * Get manual review queue (admin only)
 * GET /api/admin/verifications/manual-review
 */
const getManualReviewQueue = async (req, res) => {
    try {
        // Get all verifications pending manual review
        const { data: verifications, error } = await supabase_1.supabase
            .from('employee_verifications')
            .select(`
        id,
        employee_id,
        selfie_url,
        face_match_score,
        status,
        submitted_at,
        employee:employees(
          id,
          name,
          photos,
          user_id
        )
      `)
            .eq('status', verification_1.VERIFICATION_STATUS.MANUAL_REVIEW)
            .order('submitted_at', { ascending: true });
        if (error) {
            logger_1.logger.error('Get manual review queue error:', error);
            return res.status(500).json({ error: 'Failed to fetch manual review queue' });
        }
        res.json({
            verifications: verifications || [],
            total: verifications?.length || 0
        });
    }
    catch (error) {
        logger_1.logger.error('Get manual review queue error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getManualReviewQueue = getManualReviewQueue;
/**
 * Review verification (admin only)
 * PATCH /api/admin/verifications/:id/review
 */
const reviewVerification = async (req, res) => {
    try {
        const { id } = req.params; // verification_id
        const { action, admin_notes } = req.body; // action: 'approve' | 'reject'
        // Validate input
        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'action must be "approve" or "reject"' });
        }
        // Get verification record
        const { data: verification, error: fetchError } = await supabase_1.supabase
            .from('employee_verifications')
            .select('id, employee_id, status, face_match_score')
            .eq('id', id)
            .single();
        if (fetchError || !verification) {
            return res.status(404).json({ error: 'Verification not found' });
        }
        // Check if already reviewed
        if (verification.status !== verification_1.VERIFICATION_STATUS.MANUAL_REVIEW) {
            return res.status(400).json({
                error: 'Verification is not in manual_review status',
                current_status: verification.status
            });
        }
        const newStatus = action === 'approve' ? verification_1.VERIFICATION_STATUS.APPROVED : verification_1.VERIFICATION_STATUS.REJECTED;
        // Update verification record
        const { error: updateError } = await supabase_1.supabase
            .from('employee_verifications')
            .update({
            status: newStatus,
            reviewed_by: req.user.id,
            reviewed_at: new Date().toISOString(),
            admin_notes: admin_notes || null
        })
            .eq('id', id);
        if (updateError) {
            logger_1.logger.error('Update verification review error:', updateError);
            return res.status(500).json({ error: 'Failed to update verification' });
        }
        // If approved, update employee record
        if (action === 'approve') {
            const { error: empUpdateError } = await supabase_1.supabase
                .from('employees')
                .update({
                is_verified: true,
                verified_at: new Date().toISOString()
            })
                .eq('id', verification.employee_id);
            if (empUpdateError) {
                logger_1.logger.error('Update employee verified status error:', empUpdateError);
            }
            // Notify employee of approval
            const { data: employeeData } = await supabase_1.supabase
                .from('employees')
                .select('user_id, name')
                .eq('id', verification.employee_id)
                .single();
            if (employeeData?.user_id) {
                await (0, notificationHelper_1.notifyEmployeeVerificationApproved)(employeeData.user_id, employeeData.name);
            }
        }
        else if (action === 'reject') {
            // Notify employee of rejection
            const { data: employeeData } = await supabase_1.supabase
                .from('employees')
                .select('user_id, name')
                .eq('id', verification.employee_id)
                .single();
            if (employeeData?.user_id) {
                await (0, notificationHelper_1.notifyEmployeeVerificationRejected)(employeeData.user_id, employeeData.name, admin_notes || 'No reason provided');
            }
        }
        logger_1.logger.info('Verification reviewed', {
            verificationId: id,
            employeeId: verification.employee_id,
            action,
            reviewedBy: req.user.pseudonym,
            faceMatchScore: verification.face_match_score
        });
        res.json({
            message: action === 'approve' ? 'Verification approved successfully' : 'Verification rejected successfully',
            verification: {
                id,
                status: newStatus,
                reviewed_by: req.user.id,
                admin_notes
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Review verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.reviewVerification = reviewVerification;
/**
 * Get recent verifications (admin only)
 * GET /api/admin/verifications/recent (legacy)
 * GET /api/admin/verifications?status=<filter> (new)
 */
const getRecentVerifications = async (req, res) => {
    try {
        const { status } = req.query;
        const limit = parseInt(req.query.limit) || 50;
        // Build query
        let query = supabase_1.supabase
            .from('employee_verifications')
            .select(`
        id,
        employee_id,
        selfie_url,
        face_match_score,
        status,
        submitted_at,
        auto_approved,
        employee:employees(
          id,
          name,
          photos
        )
      `)
            .order('submitted_at', { ascending: false })
            .limit(limit);
        // Apply status filter if provided and not 'all'
        if (status && status !== 'all' && status !== '') {
            query = query.eq('status', status);
        }
        const { data: verifications, error } = await query;
        if (error) {
            logger_1.logger.error('Get recent verifications error:', error);
            return res.status(500).json({ error: 'Failed to fetch recent verifications' });
        }
        res.json({
            verifications: verifications || [],
            total: verifications?.length || 0
        });
    }
    catch (error) {
        logger_1.logger.error('Get recent verifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getRecentVerifications = getRecentVerifications;
/**
 * Revoke verification (admin only)
 * DELETE /api/admin/employees/:id/verification
 */
const revokeVerification = async (req, res) => {
    try {
        const { id } = req.params; // employee_id
        const { reason } = req.body; // Admin reason for revocation
        // Validate input
        if (!reason || reason.trim().length === 0) {
            return res.status(400).json({ error: 'reason is required' });
        }
        // Get employee
        const { data: employee, error: empError } = await supabase_1.supabase
            .from('employees')
            .select('id, name, is_verified, verified_at, user_id')
            .eq('id', id)
            .single();
        if (empError || !employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        // Check if currently verified
        if (!employee.is_verified) {
            return res.status(400).json({ error: 'Employee is not currently verified' });
        }
        // Update employee - remove verification
        const { error: removeError } = await supabase_1.supabase
            .from('employees')
            .update({
            is_verified: false,
            verified_at: null
        })
            .eq('id', id);
        if (removeError) {
            logger_1.logger.error('Remove employee verification error:', removeError);
            return res.status(500).json({ error: 'Failed to revoke verification' });
        }
        // 🔧 Create rejection record (no longer using "revoked" status - merged with rejected)
        const { error: revokeError } = await supabase_1.supabase
            .from('employee_verifications')
            .insert({
            employee_id: id,
            selfie_url: '', // No selfie for rejection
            status: verification_1.VERIFICATION_STATUS.REJECTED,
            reviewed_by: req.user.id,
            reviewed_at: new Date().toISOString(),
            admin_notes: reason
        });
        if (revokeError) {
            logger_1.logger.error('Create rejection record error:', revokeError);
            // Don't fail the request, rejection was successful
        }
        logger_1.logger.info('Employee verification rejected by admin', {
            employeeId: id,
            employeeName: employee.name,
            rejectedBy: req.user.pseudonym,
            reason
        });
        // Notify employee of verification revocation
        if (employee.user_id) {
            await (0, notificationHelper_1.notifyEmployeeVerificationRevoked)(employee.user_id, employee.name, reason);
        }
        res.json({
            message: 'Verification rejected successfully',
            employee: {
                id: employee.id,
                name: employee.name,
                is_verified: false
            },
            rejection: {
                reason,
                rejected_by: req.user.id,
                rejected_at: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Revoke verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.revokeVerification = revokeVerification;
//# sourceMappingURL=verificationController.js.map