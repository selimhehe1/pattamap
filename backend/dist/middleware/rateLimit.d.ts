import { Request, Response, NextFunction } from 'express';
declare class MemoryRateLimitStore {
    private store;
    private cleanupInterval;
    constructor();
    private cleanup;
    get(key: string): {
        count: number;
        resetTime: number;
    } | null;
    increment(key: string, windowMs: number): {
        count: number;
        resetTime: number;
    };
    destroy(): void;
}
interface RateLimitOptions {
    windowMs: number;
    maxRequests: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    keyGenerator?: (req: Request) => string;
}
declare const store: MemoryRateLimitStore;
export declare const createRateLimit: (options: RateLimitOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const apiRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const authRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const uploadRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const adminRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const adminCriticalRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const userManagementRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const bulkOperationRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const commentRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const establishmentEmployeesRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const vipPurchaseRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const vipStatusCheckRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const healthCheckRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const searchSuggestionsRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const employeeSearchRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const notificationRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const notificationMutationRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const availabilityCheckRateLimit: (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export { store as rateLimitStore };
//# sourceMappingURL=rateLimit.d.ts.map