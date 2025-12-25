"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const employeeValidationController_1 = require("../controllers/employeeValidationController");
const auth_1 = require("../middleware/auth");
const csrf_1 = require("../middleware/csrf");
/**
 * Employee Validation Routes
 * Handles community voting and visibility control
 *
 * Version: v10.3
 * Date: 2025-01-19
 */
const router = express_1.default.Router();
// ============================================
// PUBLIC ENDPOINTS (Community Voting)
// ============================================
/**
 * POST /api/employees/:id/validation-vote
 * Vote on employee profile existence
 * Auth: Required
 * CSRF: Required
 */
router.post('/:id/validation-vote', auth_1.authenticateToken, csrf_1.csrfProtection, employeeValidationController_1.voteOnEmployee);
/**
 * GET /api/employees/:id/validation-stats
 * Get validation statistics
 * Auth: Optional (returns userVote if authenticated)
 */
router.get('/:id/validation-stats', auth_1.authenticateTokenOptional, employeeValidationController_1.getValidationStats);
/**
 * GET /api/my-validation-votes
 * Get current user's vote history
 * Auth: Required
 */
router.get('/my-votes', auth_1.authenticateToken, employeeValidationController_1.getMyVotes);
// ============================================
// OWNER ENDPOINTS (Visibility Control)
// ============================================
/**
 * GET /api/owner/my-employees-validation
 * Get owner's employees with validation stats
 * Auth: Required (establishment_owner)
 */
router.get('/owner/my-employees', auth_1.authenticateToken, (0, auth_1.requireRole)(['establishment_owner', 'admin']), // Admin can also access
employeeValidationController_1.getMyEmployeesValidation);
/**
 * PATCH /api/owner/employees/:id/visibility
 * Toggle employee visibility (owner only)
 * Auth: Required (establishment_owner)
 * CSRF: Required
 */
router.patch('/owner/employees/:id/visibility', auth_1.authenticateToken, (0, auth_1.requireRole)(['establishment_owner', 'admin']), // Admin can also access
csrf_1.csrfProtection, employeeValidationController_1.toggleEmployeeVisibilityAsOwner);
// ============================================
// ADMIN ENDPOINTS (Full Control)
// ============================================
/**
 * GET /api/admin/employees-validation
 * Get ALL employees with validation stats
 * Auth: Required (admin/moderator)
 * Query: ?filter=contested
 */
router.get('/admin/employees-validation', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'moderator']), employeeValidationController_1.getAllEmployeesValidation);
/**
 * PATCH /api/admin/employees/:id/visibility
 * Toggle employee visibility (admin override)
 * Auth: Required (admin/moderator)
 * CSRF: Required
 */
router.patch('/admin/employees/:id/visibility', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'moderator']), csrf_1.csrfProtection, employeeValidationController_1.toggleEmployeeVisibilityAsAdmin);
exports.default = router;
//# sourceMappingURL=employeeValidation.js.map