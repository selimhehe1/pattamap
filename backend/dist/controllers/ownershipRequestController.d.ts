import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Create a new ownership request (establishment owner only)
 * POST /api/ownership-requests
 */
export declare const createOwnershipRequest: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get current user's ownership requests (establishment owner only)
 * GET /api/ownership-requests/my
 */
export declare const getMyOwnershipRequests: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get all ownership requests (admin only)
 * GET /api/admin/ownership-requests
 * Query params: ?status=pending|approved|rejected
 */
export declare const getAllOwnershipRequests: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Approve ownership request (admin only)
 * PATCH /api/admin/ownership-requests/:id/approve
 */
export declare const approveOwnershipRequest: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Reject ownership request (admin only)
 * PATCH /api/admin/ownership-requests/:id/reject
 */
export declare const rejectOwnershipRequest: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Cancel/delete ownership request (owner only)
 * DELETE /api/ownership-requests/:id
 */
export declare const cancelOwnershipRequest: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=ownershipRequestController.d.ts.map