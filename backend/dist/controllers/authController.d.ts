import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const changePassword: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const logout: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Request password reset
 * Generates a secure token and stores it in the database
 * Note: Email sending is not yet implemented - tokens are logged for manual intervention
 */
export declare const forgotPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Reset password with token
 * Validates the token and updates the user's password
 */
export declare const resetPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Check if pseudonym and/or email are available
 * GET /api/auth/check-availability?pseudonym=xxx&email=xxx
 *
 * Used for real-time validation during registration
 * Rate limited separately (more permissive than auth endpoints)
 */
export declare const checkAvailability: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Logout from all devices
 * Revokes all refresh tokens for the authenticated user
 */
export declare const logoutAll: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=authController.d.ts.map