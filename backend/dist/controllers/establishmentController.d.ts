import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const getEstablishments: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getEstablishment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createEstablishment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateEstablishment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteEstablishment: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateEstablishmentGridPosition: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateEstablishmentLogo: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getEstablishmentCategories: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/establishments/:id/employees
 *
 * Returns all employees working at an establishment.
 * Only accessible by establishment owners/managers.
 *
 * @param req.params.id - Establishment ID
 * @param req.user.id - Current user ID
 * @returns { employees[], total, establishment }
 */
export declare const getEstablishmentEmployees: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=establishmentController.d.ts.map