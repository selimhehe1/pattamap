import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { setSentryUserFromRequest } from '../config/sentry';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    pseudonym: string;
    email: string;
    role: string;
    is_active: boolean;
    account_type?: string; // v10.0 - Employee Claim System
    linked_employee_id?: string; // v10.0 - Link to employee profile
  };
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  linkedEmployeeId?: string;  // ✅ Optional - added in v10.0
  iat: number;
  exp: number;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    logger.debug('Auth check', {
      method: req.method,
      url: req.originalUrl
    });

    // Extract token from httpOnly cookie (primary) or Authorization header (fallback for backward compatibility)
    let token = req.cookies?.['auth-token'];
    let tokenSource = 'cookie';

    if (!token) {
      // Fallback to Authorization header for backward compatibility
      const authHeader = req.headers['authorization'];
      token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      tokenSource = 'header';
    }

    if (!token) {
      logger.debug('Auth failed', { reason: 'no_token' });
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify JWT secret exists
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.critical('JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify and decode token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload;
      logger.debug('Token verified', {
        source: tokenSource,
        hasUserId: !!decoded.userId,
        hasRole: !!decoded.role
      });
    } catch (jwtError: any) {
      logger.debug('Token verification failed', {
        error: jwtError.message,
        code: jwtError.name
      });
      if (jwtError instanceof TokenExpiredError) {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }

    // Validate token payload
    if (!decoded.userId || !decoded.email || !decoded.role) {
      return res.status(401).json({
        error: 'Invalid token payload',
        code: 'TOKEN_MALFORMED'
      });
    }

    // Get user from database with security checks
    const { data: user, error } = await supabase
      .from('users')
      .select('id, pseudonym, email, role, is_active, account_type, linked_employee_id')
      .eq('id', decoded.userId)
      .eq('is_active', true) // Only active users
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: 'User not found or inactive',
        code: 'USER_INVALID'
      });
    }

    // Verify token claims match database
    if (user.email !== decoded.email || user.role !== decoded.role) {
      return res.status(401).json({
        error: 'Token claims mismatch',
        code: 'TOKEN_STALE'
      });
    }

    // Attach user to request
    req.user = user;
    logger.debug('Authentication successful', {
      hasPseudonym: !!user.pseudonym,
      hasRole: !!user.role,
      isActive: user.is_active
    });

    // Set Sentry user context for error tracking
    setSentryUserFromRequest(req);

    next();

  } catch (error) {
    logger.error('Authentication error', error);
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional authentication middleware
 * Attempts to authenticate user if token exists, but does NOT block if no token
 * Used for endpoints that return different data for authenticated vs anonymous users
 *
 * Version: v10.3
 * Date: 2025-01-20
 */
export const authenticateTokenOptional = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Extract token from httpOnly cookie (primary) or Authorization header (fallback)
    let token = req.cookies?.['auth-token'];

    if (!token) {
      // Fallback to Authorization header
      const authHeader = req.headers['authorization'];
      token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    }

    // If no token, continue without authentication
    if (!token) {
      return next();
    }

    // Verify JWT secret exists
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.warn('JWT_SECRET not configured, skipping optional auth');
      return next();
    }

    // Try to verify and decode token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    } catch (jwtError: any) {
      // Token invalid/expired - continue without authentication
      logger.debug('Optional auth: token verification failed', {
        error: jwtError.message
      });
      return next();
    }

    // Validate token payload
    if (!decoded.userId || !decoded.email || !decoded.role) {
      // Malformed token - continue without authentication
      return next();
    }

    // Get user from database with security checks
    const { data: user, error } = await supabase
      .from('users')
      .select('id, pseudonym, email, role, is_active, account_type, linked_employee_id')
      .eq('id', decoded.userId)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      // User not found or inactive - continue without authentication
      return next();
    }

    // Verify token claims match database
    if (user.email !== decoded.email || user.role !== decoded.role) {
      // Token stale - continue without authentication
      return next();
    }

    // Attach user to request (optional authentication succeeded)
    req.user = user;
    logger.debug('Optional authentication successful', {
      userId: user.id,
      hasPseudonym: !!user.pseudonym
    });

    // Set Sentry user context for error tracking
    setSentryUserFromRequest(req);

    next();

  } catch (error) {
    // Any error - log and continue without authentication
    logger.error('Optional authentication error', error);
    next();
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Validate input
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      logger.error('Invalid roles configuration');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Verify user is active
    if (!req.user.is_active) {
      return res.status(403).json({
        error: 'Account deactivated',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Check role authorization
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_ROLE',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

// Middleware for admin-only routes
export const requireAdmin = requireRole(['admin']);

// Middleware for moderator and admin routes
export const requireModerator = requireRole(['admin', 'moderator']);

// Middleware for employee account routes (v10.0)
export const requireEmployeeAccount = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Check if user has employee account type
  if (req.user.account_type !== 'employee') {
    return res.status(403).json({
      error: 'Employee account required. Please register as an employee or claim your profile.',
      code: 'EMPLOYEE_ACCOUNT_REQUIRED',
      current_account_type: req.user.account_type || 'regular'
    });
  }

  next();
};

// Middleware for establishment owner account routes (v10.1)
export const requireEstablishmentOwnerAccount = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Check if user has establishment_owner account type
  if (req.user.account_type !== 'establishment_owner') {
    return res.status(403).json({
      error: 'Establishment owner account required.',
      code: 'ESTABLISHMENT_OWNER_ACCOUNT_REQUIRED',
      current_account_type: req.user.account_type || 'regular'
    });
  }

  next();
};

// Helper function to check if user is owner of a specific establishment (v10.1)
export const isEstablishmentOwner = async (userId: string, establishmentId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('establishment_owners')
      .select('id')
      .eq('user_id', userId)
      .eq('establishment_id', establishmentId)
      .single();

    if (error) {
      logger.debug('isEstablishmentOwner check failed', { userId, establishmentId, error: error.message });
      return false;
    }

    return !!data;
  } catch (error) {
    logger.error('isEstablishmentOwner error', error);
    return false;
  }
};

// Rate limiting helper for auth endpoints
export const createRateLimitKey = (req: Request): string => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  return `${ip}:${userAgent}`;
};