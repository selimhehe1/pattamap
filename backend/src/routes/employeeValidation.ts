import express from 'express';
import {
  voteOnEmployee,
  getValidationStats,
  getMyVotes,
  getMyEmployeesValidation,
  toggleEmployeeVisibilityAsOwner,
  getAllEmployeesValidation,
  toggleEmployeeVisibilityAsAdmin
} from '../controllers/employeeValidationController';
import { authenticateToken, authenticateTokenOptional, requireRole } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';

/**
 * Employee Validation Routes
 * Handles community voting and visibility control
 *
 * Version: v10.3
 * Date: 2025-01-19
 */

const router = express.Router();

// ============================================
// PUBLIC ENDPOINTS (Community Voting)
// ============================================

/**
 * POST /api/employees/:id/validation-vote
 * Vote on employee profile existence
 * Auth: Required
 * CSRF: Required
 */
router.post(
  '/:id/validation-vote',
  authenticateToken,
  csrfProtection,
  voteOnEmployee
);

/**
 * GET /api/employees/:id/validation-stats
 * Get validation statistics
 * Auth: Optional (returns userVote if authenticated)
 */
router.get(
  '/:id/validation-stats',
  authenticateTokenOptional,
  getValidationStats
);

/**
 * GET /api/my-validation-votes
 * Get current user's vote history
 * Auth: Required
 */
router.get(
  '/my-votes',
  authenticateToken,
  getMyVotes
);

// ============================================
// OWNER ENDPOINTS (Visibility Control)
// ============================================

/**
 * GET /api/owner/my-employees-validation
 * Get owner's employees with validation stats
 * Auth: Required (establishment_owner)
 */
router.get(
  '/owner/my-employees',
  authenticateToken,
  requireRole(['establishment_owner', 'admin']), // Admin can also access
  getMyEmployeesValidation
);

/**
 * PATCH /api/owner/employees/:id/visibility
 * Toggle employee visibility (owner only)
 * Auth: Required (establishment_owner)
 * CSRF: Required
 */
router.patch(
  '/owner/employees/:id/visibility',
  authenticateToken,
  requireRole(['establishment_owner', 'admin']), // Admin can also access
  csrfProtection,
  toggleEmployeeVisibilityAsOwner
);

// ============================================
// ADMIN ENDPOINTS (Full Control)
// ============================================

/**
 * GET /api/admin/employees-validation
 * Get ALL employees with validation stats
 * Auth: Required (admin/moderator)
 * Query: ?filter=contested
 */
router.get(
  '/admin/employees-validation',
  authenticateToken,
  requireRole(['admin', 'moderator']),
  getAllEmployeesValidation
);

/**
 * PATCH /api/admin/employees/:id/visibility
 * Toggle employee visibility (admin override)
 * Auth: Required (admin/moderator)
 * CSRF: Required
 */
router.patch(
  '/admin/employees/:id/visibility',
  authenticateToken,
  requireRole(['admin', 'moderator']),
  csrfProtection,
  toggleEmployeeVisibilityAsAdmin
);

export default router;
