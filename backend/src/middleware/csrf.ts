import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * 🛡️ Modern CSRF Protection Middleware
 * Alternative to deprecated csurf package
 *
 * Génère et valide des tokens CSRF pour protéger contre les attaques Cross-Site Request Forgery
 */

// Extend session object to include csrfToken property
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}

// Générer un token CSRF sécurisé
export const generateCSRFToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Middleware pour générer le token CSRF
export const csrfTokenGenerator = (req: Request, res: Response, next: NextFunction) => {
  logger.debug('CSRF token generator', {
    method: req.method,
    url: req.originalUrl,
    hasSession: !!req.session,
    hasExistingToken: !!req.session.csrfToken
  });

  // Générer un nouveau token si pas déjà présent en session
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();

    // Explicitly save the session to ensure token persistence
    req.session.save((err) => {
      if (err) {
        logger.error('Failed to save CSRF session', err);
      } else {
        logger.debug('CSRF token generated and session saved', {
          tokenLength: req.session.csrfToken!.length
        });
      }
    });
  } else {
    logger.debug('CSRF token reused from session');
  }

  // Rendre le token disponible pour les vues/API
  (req as any).csrfToken = req.session.csrfToken;

  next();
};

// Middleware de validation CSRF pour les routes sensibles
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  logger.debug('CSRF protection check', {
    method: req.method,
    url: req.originalUrl
  });

  // Ignorer la validation pour les méthodes GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    logger.debug('CSRF check skipped for safe method', { method: req.method });
    return next();
  }

  // Check if user is admin authenticated - bypass CSRF for admin operations with auth token
  if (req.originalUrl.includes('/api/admin/') && req.headers.cookie && req.headers.cookie.includes('auth-token=')) {
    logger.debug('CSRF check bypassed for authenticated admin route');
    return next();
  }

  const sessionToken = req.session.csrfToken;
  const requestToken = req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf;

  logger.debug('CSRF tokens check', {
    hasSessionToken: !!sessionToken,
    hasRequestToken: !!requestToken,
    requestTokenSource: req.headers['x-csrf-token'] ? 'header' : (req.body._csrf ? 'body' : 'query')
  });

  // Vérifier que les tokens existent
  if (!sessionToken) {
    logger.warn('CSRF validation failed', { reason: 'session_token_missing' });
    return res.status(403).json({
      error: 'CSRF session token missing',
      code: 'CSRF_SESSION_MISSING'
    });
  }

  if (!requestToken) {
    logger.warn('CSRF validation failed', { reason: 'request_token_missing' });
    return res.status(403).json({
      error: 'CSRF token missing in request',
      code: 'CSRF_TOKEN_MISSING',
      hint: 'Include X-CSRF-Token header or _csrf field'
    });
  }

  // Comparaison cryptographiquement sécurisée
  try {
    // Vérifier que les deux tokens ont la même longueur
    if (sessionToken.length !== requestToken.toString().length) {
      logger.warn('CSRF validation failed', { reason: 'token_length_mismatch' });
      return res.status(403).json({
        error: 'CSRF token length mismatch',
        code: 'CSRF_TOKEN_LENGTH_MISMATCH'
      });
    }

    const isValid = crypto.timingSafeEqual(Buffer.from(sessionToken), Buffer.from(requestToken as string));
    if (!isValid) {
      logger.warn('CSRF validation failed', { reason: 'token_content_mismatch' });
      return res.status(403).json({
        error: 'CSRF token mismatch',
        code: 'CSRF_TOKEN_INVALID'
      });
    }
  } catch (error) {
    logger.error('CSRF token comparison failed', error);
    return res.status(403).json({
      error: 'CSRF token comparison failed',
      code: 'CSRF_COMPARISON_ERROR'
    });
  }

  logger.debug('CSRF validation successful');
  next();
};

// Route pour obtenir le token CSRF (pour le frontend)
export const getCSRFToken = (req: Request, res: Response) => {
  const token = (req as any).csrfToken || req.session.csrfToken;

  if (!token) {
    logger.error('CSRF token not available');
    return res.status(500).json({
      error: 'Could not generate CSRF token'
    });
  }

  logger.debug('CSRF token requested');

  res.json({
    csrfToken: token,
    sessionId: req.sessionID, // Include session ID for debugging
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
  });
};