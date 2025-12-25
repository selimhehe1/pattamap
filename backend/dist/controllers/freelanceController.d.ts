/**
 * Freelance Controller
 * Version: 10.3
 *
 * Handles freelance-specific endpoints:
 * - GET /api/freelances - List all freelances (VIP first)
 * - GET /api/freelances/:id - Get freelance detail with nightclub associations
 */
import { Request, Response } from 'express';
/**
 * GET /api/freelances
 * Fetch all freelance employees
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 * - search: string (name, nickname, description)
 * - nationality: string
 * - age_min, age_max: number
 * - has_nightclub: boolean (true = with nightclub, false = free freelance)
 * - sort_by: 'vip' (default), 'name', 'age', 'created_at'
 */
export declare const getFreelances: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/freelances/:id
 * Get freelance detail with nightclub associations
 */
export declare const getFreelanceById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=freelanceController.d.ts.map