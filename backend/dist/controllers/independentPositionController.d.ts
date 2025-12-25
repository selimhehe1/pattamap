/**
 * @deprecated since v10.3
 *
 * ⚠️ DEPRECATED: This controller is deprecated as of v10.3
 *
 * The independent_positions table is no longer used for freelances.
 * Freelances are now managed through the standard employment_history table
 * with multi-nightclub association support.
 *
 * Migration: Freelances now:
 * - Use is_freelance flag on employees table
 * - Associate with nightclubs via employment_history (can_work_multiple = true)
 * - Appear in dedicated /freelances page
 * - Filter via search with type=freelance
 *
 * See: backend/database/migrations/013_refactor_freelance_nightclub_system.sql
 *
 * This file is kept for backward compatibility but should not be used for new features.
 */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Get independent position for a specific employee
 * @deprecated since v10.3 - Use /api/employees?type=freelance instead
 */
export declare const getIndependentPosition: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get all active freelances for the map
 * @deprecated since v10.3 - Use /api/freelances instead
 */
export declare const getFreelancesForMap: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Create an independent position for an employee (freelance mode)
 * @deprecated since v10.3 - Freelances now use employment_history with is_freelance flag
 */
export declare const createIndependentPosition: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Update an independent position
 * @deprecated since v10.3 - Freelances now use employment_history with is_freelance flag
 */
export declare const updateIndependentPosition: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Delete (deactivate) an independent position
 * @deprecated since v10.3 - Freelances now use employment_history with is_freelance flag
 */
export declare const deleteIndependentPosition: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=independentPositionController.d.ts.map