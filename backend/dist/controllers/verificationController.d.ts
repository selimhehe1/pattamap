import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Submit verification request
 * POST /api/employees/:id/verify
 * Requires: Employee account linked to the employee profile
 */
export declare const submitVerification: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get verification status for an employee
 * GET /api/employees/:id/verification-status
 * Public endpoint (any authenticated user)
 */
export declare const getVerificationStatus: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get manual review queue (admin only)
 * GET /api/admin/verifications/manual-review
 */
export declare const getManualReviewQueue: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Review verification (admin only)
 * PATCH /api/admin/verifications/:id/review
 */
export declare const reviewVerification: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get recent verifications (admin only)
 * GET /api/admin/verifications/recent (legacy)
 * GET /api/admin/verifications?status=<filter> (new)
 */
export declare const getRecentVerifications: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Revoke verification (admin only)
 * DELETE /api/admin/employees/:id/verification
 */
export declare const revokeVerification: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=verificationController.d.ts.map