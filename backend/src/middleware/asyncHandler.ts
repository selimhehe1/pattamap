/**
 * 🛡️ asyncHandler - Middleware pour gérer les erreurs async
 *
 * Élimine le besoin de try/catch dans chaque controller.
 * Les erreurs sont automatiquement passées au middleware d'erreur global.
 *
 * Avant:
 * ```
 * export const getUser = async (req, res) => {
 *   try {
 *     const user = await findUser(req.params.id);
 *     res.json(user);
 *   } catch (error) {
 *     logger.error('Error:', error);
 *     res.status(500).json({ error: 'Internal server error' });
 *   }
 * };
 * ```
 *
 * Après:
 * ```
 * export const getUser = asyncHandler(async (req, res) => {
 *   const user = await findUser(req.params.id);
 *   res.json(user);
 * });
 * ```
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '../utils/logger';

/**
 * Type pour les fonctions async de controller
 */
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/**
 * Wrapper pour les controllers async
 * Catch les erreurs et les passe au middleware d'erreur
 * Returns the Promise so tests can await the handler
 */
export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next))
      .then(() => {})
      .catch((error: Error) => {
        logger.error(`❌ Controller error [${req.method} ${req.path}]:`, error);

        // Si la réponse n'a pas encore été envoyée
        if (!res.headersSent) {
          // Erreur personnalisée avec status code
          if ('statusCode' in error && typeof (error as { statusCode: number }).statusCode === 'number') {
            res.status((error as { statusCode: number }).statusCode).json({
              error: error.message || 'An error occurred',
            });
            return;
          }

          // Erreur par défaut
          res.status(500).json({
            error: 'Internal server error',
          });
          return;
        }

        // Si headers déjà envoyés, passer au middleware d'erreur
        next(error);
      });
  };
};

/**
 * Classe d'erreur HTTP personnalisée
 * Usage: throw new HttpError(404, 'User not found');
 */
export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'HttpError';
  }
}

/**
 * Helpers pour les erreurs HTTP courantes
 */
export const NotFoundError = (message = 'Resource not found') => new HttpError(404, message);
export const BadRequestError = (message = 'Bad request') => new HttpError(400, message);
export const UnauthorizedError = (message = 'Unauthorized') => new HttpError(401, message);
export const ForbiddenError = (message = 'Forbidden') => new HttpError(403, message);
export const ConflictError = (message = 'Conflict') => new HttpError(409, message);
export const InternalServerError = (message = 'Internal server error') => new HttpError(500, message);

export default asyncHandler;
