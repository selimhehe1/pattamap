import { Request, Response } from 'express';
export declare const getFavorites: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const addFavorite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const removeFavorite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const checkFavorite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=favoriteController.d.ts.map