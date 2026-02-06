import { Router } from 'express';
import { authenticateToken, requireRole, requireAdmin } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { searchSuggestionsRateLimit, employeeSearchRateLimit } from '../middleware/rateLimit'; // 🔧 FIX S4
import { uploadWithDocs } from '../middleware/upload';
import { validateMagicBytes } from '../middleware/validateMagicBytes';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  requestSelfRemoval,
  addEmployment,
  searchEmployees,
  getEmployeeNameSuggestions,
  // 🆕 Employee Claim System
  createOwnEmployeeProfile,
  claimEmployeeProfile,
  getMyLinkedProfile,
  getClaimRequests,
  approveClaimRequest,
  rejectClaimRequest,
  // 🆕 Employee Dashboard Stats (v10.2)
  getEmployeeStats,
  getEmployeeReviews,
  recordProfileView
} from '../controllers/employeeController';
import { submitDeletionRequest } from '../controllers/deletionRequestController';

const router = Router();

// Public routes (specific routes BEFORE parameterized routes)
router.get('/', getEmployees);
router.get('/search', employeeSearchRateLimit, searchEmployees); // 🔧 FIX S4: Rate limited search
router.get('/suggestions/names', searchSuggestionsRateLimit, getEmployeeNameSuggestions); // 🔧 FIX S4: Rate limited autocomplete

// ==========================================
// 🆕 EMPLOYEE CLAIM SYSTEM ROUTES (v10.0)
// ==========================================
// IMPORTANT: These must be BEFORE /:id route to avoid conflicts

// Get my linked employee profile
router.get('/my-linked-profile', authenticateToken, getMyLinkedProfile);

// Alias: GET /my-profile (same as /my-linked-profile for convenience)
router.get('/my-profile', authenticateToken, getMyLinkedProfile);

// Get claim requests (admin/moderator only)
router.get('/claims', authenticateToken, requireRole(['admin', 'moderator']), getClaimRequests);

// Create own employee profile (self-managed)
router.post('/my-profile', authenticateToken, csrfProtection, createOwnEmployeeProfile);

// Claim existing employee profile
router.post('/claim/:employeeId', authenticateToken, csrfProtection, claimEmployeeProfile);

// Approve claim request (admin only)
router.post('/claims/:claimId/approve', authenticateToken, requireAdmin, csrfProtection, approveClaimRequest);

// Reject claim request (admin only)
router.post('/claims/:claimId/reject', authenticateToken, requireAdmin, csrfProtection, rejectClaimRequest);

// ==========================================
// GENERAL ROUTES (parameterized routes AFTER specific routes)
// ==========================================

// Employee stats endpoint (must be before /:id to avoid conflict)
router.get('/:id/stats', authenticateToken, getEmployeeStats);

// Employee reviews endpoint (must be before /:id to avoid conflict)
router.get('/:id/reviews', authenticateToken, getEmployeeReviews);

// Record profile view (public, no auth required)
router.post('/:id/view', recordProfileView);

router.get('/:id', getEmployee);

// Protected routes (authenticated users)
router.post('/', authenticateToken, createEmployee);
router.put('/:id', authenticateToken, updateEmployee);
router.delete('/:id', authenticateToken, deleteEmployee);

// Self-removal (special endpoint for employees to request removal)
router.post('/:id/request-removal', requestSelfRemoval);

// 🆕 PDPA Compliance: Profile deletion request (public, no auth required)
// Allows anyone to request deletion of their profile by providing proof of identity
router.post('/:id/deletion-request', uploadWithDocs.single('proof'), validateMagicBytes, submitDeletionRequest);

// Employment history
router.post('/:id/employment', authenticateToken, addEmployment);

export default router;