import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        pseudonym: string;
        email: string;
        role: string;
        is_active: boolean;
        account_type?: string;
        linked_employee_id?: string;
    };
}
export declare const authenticateToken: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Optional authentication middleware
 * Attempts to authenticate user if token exists, but does NOT block if no token
 * Used for endpoints that return different data for authenticated vs anonymous users
 *
 * Version: v10.3
 * Date: 2025-01-20
 */
export declare const authenticateTokenOptional: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (allowedRoles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requireModerator: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requireEmployeeAccount: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requireEstablishmentOwnerAccount: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const isEstablishmentOwner: (userId: string, establishmentId: string) => Promise<boolean>;
export declare const createRateLimitKey: (req: Request) => string;
//# sourceMappingURL=auth.d.ts.map