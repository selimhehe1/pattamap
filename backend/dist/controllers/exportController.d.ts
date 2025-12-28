import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Export user's favorites to CSV
 * GET /api/export/favorites
 */
export declare const exportFavorites: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Export user's visit history to CSV
 * GET /api/export/visits
 */
export declare const exportVisits: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Export user's badges to CSV
 * GET /api/export/badges
 */
export declare const exportBadges: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Export user's comments/reviews to CSV
 * GET /api/export/reviews
 */
export declare const exportReviews: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=exportController.d.ts.map