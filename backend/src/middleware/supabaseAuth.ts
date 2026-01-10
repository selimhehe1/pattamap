/**
 * Supabase Auth Middleware
 *
 * Authenticates requests using Supabase Auth JWT tokens.
 * Works alongside the legacy JWT middleware for transition period.
 */

import { Request, Response, NextFunction } from 'express';
import { verifySupabaseToken, SupabaseUser } from '../config/supabaseAuth';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { setSentryUserFromRequest } from '../config/sentry';

export interface SupabaseAuthRequest extends Request {
  user?: {
    id: string;
    pseudonym: string;
    email: string;
    role: 'user' | 'moderator' | 'admin';
    is_active: boolean;
    account_type?: 'regular' | 'employee' | 'establishment_owner';
    linked_employee_id?: string;
    auth_id?: string; // Supabase Auth user ID
  };
  supabaseUser?: SupabaseUser;
}

/**
 * Middleware to authenticate Supabase Auth tokens
 * Extracts the Bearer token from Authorization header and verifies it
 */
export const authenticateSupabaseToken = async (
  req: SupabaseAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.debug('[SupabaseAuth] Auth check', {
      method: req.method,
      url: req.originalUrl
    });

    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      logger.debug('[SupabaseAuth] No token provided');
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify the Supabase token
    const supabaseUser = await verifySupabaseToken(token);

    if (!supabaseUser) {
      logger.debug('[SupabaseAuth] Token verification failed');
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }

    logger.debug('[SupabaseAuth] Token verified', {
      supabaseUserId: supabaseUser.id,
      email: supabaseUser.email
    });

    // Get user from our database using auth_id
    const { data: user, error } = await supabase
      .from('users')
      .select('id, pseudonym, email, role, is_active, account_type, linked_employee_id, auth_id')
      .eq('auth_id', supabaseUser.id)
      .single();

    if (error || !user) {
      logger.debug('[SupabaseAuth] User not found in database', {
        supabaseUserId: supabaseUser.id,
        error: error?.message
      });

      // User exists in Supabase Auth but not in our database
      // This is normal for new OAuth users - they will be synced via /sync-user endpoint
      return res.status(401).json({
        error: 'User not found. Please complete registration.',
        code: 'USER_NOT_SYNCED'
      });
    }

    if (!user.is_active) {
      logger.debug('[SupabaseAuth] User is inactive', { userId: user.id });
      return res.status(401).json({
        error: 'Account is deactivated',
        code: 'USER_INACTIVE'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      pseudonym: user.pseudonym,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      account_type: user.account_type,
      linked_employee_id: user.linked_employee_id,
      auth_id: user.auth_id
    };
    req.supabaseUser = supabaseUser;

    // Set Sentry user context
    setSentryUserFromRequest(req);

    logger.debug('[SupabaseAuth] Authentication successful', {
      userId: user.id,
      pseudonym: user.pseudonym
    });

    next();
  } catch (error) {
    logger.error('[SupabaseAuth] Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional Supabase auth middleware - continues if no token provided
 * Useful for routes that work with or without authentication
 */
export const authenticateSupabaseTokenOptional = async (
  req: SupabaseAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      // No token - continue without user
      return next();
    }

    // Try to verify the token
    const supabaseUser = await verifySupabaseToken(token);

    if (!supabaseUser) {
      // Invalid token - continue without user
      return next();
    }

    // Get user from database
    const { data: user } = await supabase
      .from('users')
      .select('id, pseudonym, email, role, is_active, account_type, linked_employee_id, auth_id')
      .eq('auth_id', supabaseUser.id)
      .single();

    if (user && user.is_active) {
      req.user = {
        id: user.id,
        pseudonym: user.pseudonym,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        account_type: user.account_type,
        linked_employee_id: user.linked_employee_id,
        auth_id: user.auth_id
      };
      req.supabaseUser = supabaseUser;
      setSentryUserFromRequest(req);
    }

    next();
  } catch (error) {
    logger.error('[SupabaseAuth] Optional auth error:', error);
    // Continue without authentication on error
    next();
  }
};

export default authenticateSupabaseToken;
