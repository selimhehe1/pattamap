import { Request, Response } from 'express';
/**
 * POST /api/employees/:id/validation-vote
 * Vote on employee profile existence
 * Auth: Required
 * CSRF: Required
 */
export declare const voteOnEmployee: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/employees/:id/validation-stats
 * Get validation statistics for an employee profile
 * Auth: Optional (returns userVote if authenticated)
 */
export declare const getValidationStats: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/my-validation-votes
 * Get current user's vote history
 * Auth: Required
 */
export declare const getMyVotes: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/owner/my-employees-validation
 * Get all employees from owner's establishments with validation stats
 * Auth: Required (establishment_owner)
 */
export declare const getMyEmployeesValidation: (req: Request, res: Response) => Promise<void>;
/**
 * PATCH /api/owner/employees/:id/visibility
 * Toggle employee visibility (owner only for their establishments)
 * Auth: Required (establishment_owner)
 * CSRF: Required
 */
export declare const toggleEmployeeVisibilityAsOwner: (req: Request, res: Response) => Promise<void>;
/**
 * GET /api/admin/employees-validation
 * Get ALL employees with validation stats (admin/moderator only)
 * Auth: Required (admin/moderator)
 * Query: ?filter=contested (optional)
 */
export declare const getAllEmployeesValidation: (req: Request, res: Response) => Promise<void>;
/**
 * PATCH /api/admin/employees/:id/visibility
 * Toggle employee visibility (admin/moderator - any profile)
 * Auth: Required (admin/moderator)
 * CSRF: Required
 */
export declare const toggleEmployeeVisibilityAsAdmin: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=employeeValidationController.d.ts.map