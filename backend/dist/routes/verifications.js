"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const csrf_1 = require("../middleware/csrf");
const verificationController_1 = require("../controllers/verificationController");
const router = (0, express_1.Router)();
// ==========================================
// EMPLOYEE VERIFICATION ROUTES (v10.2)
// ==========================================
// Feature: Profile verification using Azure Face API
// Docs: /docs/features/PROFILE_VERIFICATION.md
/**
 * Submit verification request
 * POST /api/employees/:id/verify
 * Requires: Employee account linked to the employee profile
 * Body: { selfie_url: string }
 * Rate limit: 3 attempts per 24 hours
 */
router.post('/:id/verify', auth_1.authenticateToken, csrf_1.csrfProtection, verificationController_1.submitVerification);
/**
 * Get verification status for an employee
 * GET /api/employees/:id/verification-status
 * Public (any authenticated user can view)
 */
router.get('/:id/verification-status', auth_1.authenticateToken, verificationController_1.getVerificationStatus);
// ==========================================
// ADMIN VERIFICATION MANAGEMENT ROUTES
// ==========================================
/**
 * Get manual review queue
 * GET /api/admin/verifications/manual-review
 * Admin only
 * Returns all verifications pending manual review (65-75% match score)
 */
router.get('/manual-review', auth_1.authenticateToken, auth_1.requireAdmin, verificationController_1.getManualReviewQueue);
/**
 * Get verifications with filtering
 * GET /api/admin/verifications?status=<filter>&limit=<number>
 * Admin only
 * Query params:
 *  - status: 'all' | 'pending' | 'approved' | 'rejected' | 'revoked' (default: all)
 *  - limit: number (default: 50)
 * Returns verifications filtered by status for admin management
 */
router.get('/', auth_1.authenticateToken, auth_1.requireAdmin, verificationController_1.getRecentVerifications);
/**
 * Get recent verifications (legacy)
 * GET /api/admin/verifications/recent
 * Admin only
 * Returns last 10 verifications (all statuses) for fraud monitoring
 */
router.get('/recent', auth_1.authenticateToken, auth_1.requireAdmin, verificationController_1.getRecentVerifications);
/**
 * Review verification (approve or reject)
 * PATCH /api/admin/verifications/:id/review
 * Admin only
 * Body: { action: 'approve' | 'reject', admin_notes?: string }
 */
router.patch('/:id/review', auth_1.authenticateToken, auth_1.requireAdmin, csrf_1.csrfProtection, verificationController_1.reviewVerification);
/**
 * Revoke verification (remove verified badge)
 * DELETE /api/admin/employees/:employeeId/verification
 * Admin only
 * Body: { reason: string }
 * Use case: Remove verification from fraudulent/misrepresented profiles
 */
router.delete('/employees/:id/verification', auth_1.authenticateToken, auth_1.requireAdmin, csrf_1.csrfProtection, verificationController_1.revokeVerification);
exports.default = router;
//# sourceMappingURL=verifications.js.map