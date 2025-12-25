import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Get all owners of a specific establishment (admin only)
 * GET /api/admin/establishments/:id/owners
 */
export declare const getEstablishmentOwners: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get all establishments owned by current user
 * GET /api/establishments/my-owned
 */
export declare const getMyOwnedEstablishments: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Assign a user as owner of an establishment (admin only)
 * POST /api/admin/establishments/:id/owners
 */
export declare const assignEstablishmentOwner: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Remove an owner from an establishment (admin only)
 * DELETE /api/admin/establishments/:id/owners/:userId
 */
export declare const removeEstablishmentOwner: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Update owner permissions (admin only)
 * PATCH /api/admin/establishments/:id/owners/:userId
 */
export declare const updateEstablishmentOwnerPermissions: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=establishmentOwnerController.d.ts.map