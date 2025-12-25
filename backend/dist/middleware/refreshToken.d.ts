import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export declare const generateRefreshToken: () => string;
export declare const generateTokenPair: (userId: string, email: string, role: string) => Promise<{
    accessToken: string;
    refreshToken: string;
    tokenFamily: `${string}-${string}-${string}-${string}-${string}`;
}>;
export declare const refreshAccessToken: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const autoRefreshMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const cleanupExpiredTokens: () => Promise<void>;
export declare const revokeAllUserTokens: (userId: string) => Promise<boolean>;
//# sourceMappingURL=refreshToken.d.ts.map