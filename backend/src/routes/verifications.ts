import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import {
  submitVerification,
  getVerificationStatus,
  getManualReviewQueue,
  reviewVerification,
  revokeVerification,
  getRecentVerifications
} from '../controllers/verificationController';

const router = Router();

// ==========================================
// EMPLOYEE VERIFICATION ROUTES (v10.2)
// ==========================================
// Feature: Profile verification using manual admin review
// Docs: /docs/features/PROFILE_VERIFICATION.md

/**
 * Submit verification request
 * POST /api/employees/:id/verify
 * Requires: Employee account linked to the employee profile
 * Body: { selfie_url: string }
 * Rate limit: 3 attempts per 24 hours
 */
router.post('/:id/verify', authenticateToken, csrfProtection, submitVerification);

/**
 * Get verification status for an employee
 * GET /api/employees/:id/verification-status
 * Public (any authenticated user can view)
 */
router.get('/:id/verification-status', authenticateToken, getVerificationStatus);

// ==========================================
// ADMIN VERIFICATION MANAGEMENT ROUTES
// ==========================================

/**
 * Get manual review queue
 * GET /api/admin/verifications/manual-review
 * Admin only
 * Returns all verifications pending manual review (65-75% match score)
 */
router.get('/manual-review', authenticateToken, requireAdmin, getManualReviewQueue);

/**
 * Get verifications with filtering
 * GET /api/admin/verifications?status=<filter>&limit=<number>
 * Admin only
 * Query params:
 *  - status: 'all' | 'pending' | 'approved' | 'rejected' | 'revoked' (default: all)
 *  - limit: number (default: 50)
 * Returns verifications filtered by status for admin management
 */
router.get('/', authenticateToken, requireAdmin, getRecentVerifications);

/**
 * Get recent verifications (legacy)
 * GET /api/admin/verifications/recent
 * Admin only
 * Returns last 10 verifications (all statuses) for fraud monitoring
 */
router.get('/recent', authenticateToken, requireAdmin, getRecentVerifications);

/**
 * Review verification (approve or reject)
 * PATCH /api/admin/verifications/:id/review
 * Admin only
 * Body: { action: 'approve' | 'reject', admin_notes?: string }
 */
router.patch('/:id/review', authenticateToken, requireAdmin, csrfProtection, reviewVerification);

/**
 * Revoke verification (remove verified badge)
 * DELETE /api/admin/employees/:employeeId/verification
 * Admin only
 * Body: { reason: string }
 * Use case: Remove verification from fraudulent/misrepresented profiles
 */
router.delete('/employees/:id/verification', authenticateToken, requireAdmin, csrfProtection, revokeVerification);

export default router;
