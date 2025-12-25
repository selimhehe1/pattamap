"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const csrf_1 = require("../middleware/csrf");
const rateLimit_1 = require("../middleware/rateLimit"); // 🔧 FIX S4
const employeeController_1 = require("../controllers/employeeController");
const router = (0, express_1.Router)();
// Public routes (specific routes BEFORE parameterized routes)
router.get('/', employeeController_1.getEmployees);
router.get('/search', rateLimit_1.employeeSearchRateLimit, employeeController_1.searchEmployees); // 🔧 FIX S4: Rate limited search
router.get('/suggestions/names', rateLimit_1.searchSuggestionsRateLimit, employeeController_1.getEmployeeNameSuggestions); // 🔧 FIX S4: Rate limited autocomplete
// ==========================================
// 🆕 EMPLOYEE CLAIM SYSTEM ROUTES (v10.0)
// ==========================================
// IMPORTANT: These must be BEFORE /:id route to avoid conflicts
// Get my linked employee profile
router.get('/my-linked-profile', auth_1.authenticateToken, employeeController_1.getMyLinkedProfile);
// Alias: GET /my-profile (same as /my-linked-profile for convenience)
router.get('/my-profile', auth_1.authenticateToken, employeeController_1.getMyLinkedProfile);
// Get claim requests (admin/moderator only)
router.get('/claims', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'moderator']), employeeController_1.getClaimRequests);
// Create own employee profile (self-managed)
router.post('/my-profile', auth_1.authenticateToken, csrf_1.csrfProtection, employeeController_1.createOwnEmployeeProfile);
// Claim existing employee profile
router.post('/claim/:employeeId', auth_1.authenticateToken, csrf_1.csrfProtection, employeeController_1.claimEmployeeProfile);
// Approve claim request (admin only)
router.post('/claims/:claimId/approve', auth_1.authenticateToken, auth_1.requireAdmin, csrf_1.csrfProtection, employeeController_1.approveClaimRequest);
// Reject claim request (admin only)
router.post('/claims/:claimId/reject', auth_1.authenticateToken, auth_1.requireAdmin, csrf_1.csrfProtection, employeeController_1.rejectClaimRequest);
// ==========================================
// GENERAL ROUTES (parameterized routes AFTER specific routes)
// ==========================================
// Employee stats endpoint (must be before /:id to avoid conflict)
router.get('/:id/stats', auth_1.authenticateToken, employeeController_1.getEmployeeStats);
// Employee reviews endpoint (must be before /:id to avoid conflict)
router.get('/:id/reviews', auth_1.authenticateToken, employeeController_1.getEmployeeReviews);
// Record profile view (public, no auth required)
router.post('/:id/view', employeeController_1.recordProfileView);
router.get('/:id', employeeController_1.getEmployee);
// Protected routes (authenticated users)
router.post('/', auth_1.authenticateToken, employeeController_1.createEmployee);
router.put('/:id', auth_1.authenticateToken, employeeController_1.updateEmployee);
router.delete('/:id', auth_1.authenticateToken, employeeController_1.deleteEmployee);
// Self-removal (special endpoint for employees to request removal)
router.post('/:id/request-removal', employeeController_1.requestSelfRemoval);
// Employment history
router.post('/:id/employment', auth_1.authenticateToken, employeeController_1.addEmployment);
exports.default = router;
//# sourceMappingURL=employees.js.map