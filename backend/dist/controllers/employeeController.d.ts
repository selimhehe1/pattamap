import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getEmployees: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getEmployee: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createEmployee: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateEmployee: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteEmployee: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const requestSelfRemoval: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const addEmployment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getEmployeeNameSuggestions: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const searchEmployees: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Create own employee profile (self-managed)
 * User creates their own employee profile, automatically linked to their account
 * Requires account_type = 'employee'
 */
export declare const createOwnEmployeeProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Claim existing employee profile
 * User requests to link their account to an existing employee profile
 * Creates a moderation request for admin approval
 */
export declare const claimEmployeeProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get user's linked employee profile
 * Returns the employee profile linked to the authenticated user
 * 🔧 v10.2 FIX: Returns employee directly (without {employee: ...} wrapper) for frontend compatibility
 */
export declare const getMyLinkedProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get all claim requests (admin only)
 * Returns pending/approved/rejected claim requests for moderation
 *
 * 🔧 v10.2 FIX: Only returns REAL claims (claim_existing), not self-profile creations
 * Self-profiles are managed in EmployeesAdmin (via employees table directly)
 */
export declare const getClaimRequests: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Approve claim request (admin only)
 * Creates the bidirectional user ↔ employee link
 */
export declare const approveClaimRequest: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Reject claim request (admin only)
 * Marks the claim as rejected without creating any links
 */
export declare const rejectClaimRequest: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get employee statistics for dashboard
 * Returns profile views, reviews count, average rating, favorites count, and employment info
 */
export declare const getEmployeeStats: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get employee reviews with pagination (v10.2)
 * Returns paginated reviews (comments with ratings) for employee dashboard
 */
export declare const getEmployeeReviews: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Record profile view
 * Tracks when a user views an employee profile (public endpoint, no auth required)
 * Supports both anonymous and authenticated visitors
 */
export declare const recordProfileView: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=employeeController.d.ts.map