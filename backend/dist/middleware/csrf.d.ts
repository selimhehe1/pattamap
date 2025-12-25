import { Request, Response, NextFunction } from 'express';
/**
 * 🛡️ Modern CSRF Protection Middleware
 * Alternative to deprecated csurf package
 *
 * Génère et valide des tokens CSRF pour protéger contre les attaques Cross-Site Request Forgery
 */
declare module 'express-session' {
    interface SessionData {
        csrfToken?: string;
    }
}
export declare const generateCSRFToken: () => string;
export declare const csrfTokenGenerator: (req: Request, res: Response, next: NextFunction) => void;
export declare const csrfProtection: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const getCSRFToken: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=csrf.d.ts.map