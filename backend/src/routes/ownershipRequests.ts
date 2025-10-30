import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { logger } from '../utils/logger';
import {
  createOwnershipRequest,
  getMyOwnershipRequests,
  getAllOwnershipRequests,
  approveOwnershipRequest,
  rejectOwnershipRequest,
  cancelOwnershipRequest
} from '../controllers/ownershipRequestController';

const router = express.Router();

// ========================================
// OWNERSHIP REQUESTS ROUTES
// ========================================

/**
 * @swagger
 * /api/ownership-requests:
 *   post:
 *     summary: Create new ownership request
 *     description: Submit a request to claim ownership of an establishment. Requires authenticated user with establishment_owner account type. User must upload documents (business license, ID, etc.) and provide optional verification code.
 *     tags: [Ownership Requests]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - establishment_id
 *               - documents_urls
 *             properties:
 *               establishment_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of establishment being claimed
 *               documents_urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 description: Cloudinary URLs of uploaded documents (business license, ID, etc.)
 *                 minItems: 1
 *               verification_code:
 *                 type: string
 *                 description: Optional verification code from establishment profile
 *               request_message:
 *                 type: string
 *                 description: User message explaining ownership claim
 *     responses:
 *       201:
 *         description: Ownership request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ownership request submitted successfully
 *                 request:
 *                   $ref: '#/components/schemas/EstablishmentOwnershipRequest'
 *       400:
 *         description: Validation error (missing fields, duplicate pending request, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized (not authenticated)
 *       403:
 *         description: Forbidden (CSRF token invalid or user not establishment_owner account type)
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticateToken, csrfProtection, createOwnershipRequest);

/**
 * @swagger
 * /api/ownership-requests/my:
 *   get:
 *     summary: Get current user's ownership requests
 *     description: Retrieve all ownership requests submitted by the authenticated user. Optionally filter by status (pending/approved/rejected).
 *     tags: [Ownership Requests]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by request status
 *     responses:
 *       200:
 *         description: List of user's ownership requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EstablishmentOwnershipRequest'
 *       401:
 *         description: Unauthorized (not authenticated)
 *       500:
 *         description: Internal server error
 */
router.get('/my', authenticateToken, getMyOwnershipRequests);

/**
 * @swagger
 * /api/ownership-requests/{id}:
 *   delete:
 *     summary: Cancel/delete ownership request
 *     description: Delete a pending ownership request. Users can only delete their own pending requests. Approved requests cannot be deleted.
 *     tags: [Ownership Requests]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ownership request ID
 *     responses:
 *       200:
 *         description: Request deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ownership request deleted successfully
 *       400:
 *         description: Bad request (cannot delete approved request)
 *       401:
 *         description: Unauthorized (not authenticated)
 *       403:
 *         description: Forbidden (CSRF invalid or trying to delete another user's request)
 *       404:
 *         description: Request not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticateToken, csrfProtection, cancelOwnershipRequest);

/**
 * @swagger
 * /api/ownership-requests/admin/all:
 *   get:
 *     summary: Get all ownership requests (Admin only)
 *     description: Retrieve all ownership requests across all users. Admin can optionally filter by status. Used in Admin Panel for reviewing pending requests.
 *     tags: [Ownership Requests, Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter by request status (default shows all)
 *     responses:
 *       200:
 *         description: List of all ownership requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EstablishmentOwnershipRequest'
 *       401:
 *         description: Unauthorized (not authenticated)
 *       403:
 *         description: Forbidden (user is not admin)
 *       500:
 *         description: Internal server error
 */
router.get('/admin/all', authenticateToken, requireAdmin, getAllOwnershipRequests);

/**
 * @swagger
 * /api/ownership-requests/{id}/approve:
 *   patch:
 *     summary: Approve ownership request (Admin only)
 *     description: Approve a pending ownership request and automatically assign ownership to the user. Creates notification for the user and audit trail entry.
 *     tags: [Ownership Requests, Admin]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ownership request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - admin_notes
 *             properties:
 *               admin_notes:
 *                 type: string
 *                 description: Admin notes explaining approval decision
 *                 minLength: 1
 *     responses:
 *       200:
 *         description: Request approved and ownership assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ownership request approved and ownership assigned successfully
 *                 request:
 *                   $ref: '#/components/schemas/EstablishmentOwnershipRequest'
 *       400:
 *         description: Bad request (missing admin_notes, request not pending, etc.)
 *       401:
 *         description: Unauthorized (not authenticated)
 *       403:
 *         description: Forbidden (CSRF invalid or user not admin)
 *       404:
 *         description: Request not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/approve', authenticateToken, requireAdmin, csrfProtection, approveOwnershipRequest);

/**
 * @swagger
 * /api/ownership-requests/{id}/reject:
 *   patch:
 *     summary: Reject ownership request (Admin only)
 *     description: Reject a pending ownership request with explanation. Creates notification for the user. User can resubmit a new request later.
 *     tags: [Ownership Requests, Admin]
 *     security:
 *       - cookieAuth: []
 *       - csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ownership request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - admin_notes
 *             properties:
 *               admin_notes:
 *                 type: string
 *                 description: Admin notes explaining rejection reason
 *                 minLength: 1
 *     responses:
 *       200:
 *         description: Request rejected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ownership request rejected
 *                 request:
 *                   $ref: '#/components/schemas/EstablishmentOwnershipRequest'
 *       400:
 *         description: Bad request (missing admin_notes, request not pending, etc.)
 *       401:
 *         description: Unauthorized (not authenticated)
 *       403:
 *         description: Forbidden (CSRF invalid or user not admin)
 *       404:
 *         description: Request not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/reject', authenticateToken, requireAdmin, csrfProtection, rejectOwnershipRequest);

export default router;
