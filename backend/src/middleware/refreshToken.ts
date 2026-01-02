import { Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { AuthRequest } from './auth';
import { logger } from '../utils/logger';

// 🔧 FIX: Cookie security configuration (same as authController)
const NODE_ENV = process.env.NODE_ENV || 'development';
const COOKIES_SECURE = NODE_ENV === 'production' ||
  process.env.COOKIES_SECURE === 'true' ||
  process.env.HTTPS_ENABLED === 'true';

const _COOKIE_DOMAIN = (() => {
  if (process.env.COOKIE_DOMAIN) {
    return process.env.COOKIE_DOMAIN;
  }
  if (NODE_ENV === 'production' && process.env.CORS_ORIGIN) {
    try {
      const url = new URL(process.env.CORS_ORIGIN);
      const parts = url.hostname.split('.');
      if (parts.length >= 2) {
        // Return domain without leading dot (e.g., "pattamap.com")
        return parts.slice(-2).join('.');
      }
    } catch {
      // Ignore
    }
  }
  return undefined;
})();

const COOKIE_SAME_SITE: 'none' | 'lax' | 'strict' = COOKIES_SECURE ? 'none' : 'lax';

interface RefreshTokenPayload {
  userId: string;
  tokenFamily: string;
  iat: number;
  exp: number;
}

// Generate a new refresh token
export const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

// Generate access and refresh token pair
export const generateTokenPair = async (userId: string, email: string, role: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.REFRESH_SECRET || process.env.JWT_SECRET;

  if (!jwtSecret || !refreshSecret) {
    throw new Error('JWT secrets not configured');
  }

  // Generate a token family ID for this login session
  const tokenFamily = crypto.randomUUID();

  // Generate access token (short-lived)
  const accessToken = jwt.sign(
    { userId, email, role },
    jwtSecret,
    { expiresIn: '15m' } // 15 minutes
  );

  // Generate refresh token (long-lived)
  const refreshToken = jwt.sign(
    { userId, tokenFamily },
    refreshSecret,
    { expiresIn: '7d' } // 7 days
  );

  // Store refresh token in database
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  const { error } = await supabase
    .from('refresh_tokens')
    .insert({
      user_id: userId,
      token_family: tokenFamily,
      token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      expires_at: expiresAt.toISOString(),
      is_active: true
    });

  if (error) {
    logger.error('Failed to store refresh token', error);
    throw new Error('Failed to generate token pair');
  }

  logger.debug('Token pair generated successfully');
  return { accessToken, refreshToken, tokenFamily };
};

// Refresh access token using refresh token
export const refreshAccessToken = async (req: AuthRequest, res: Response) => {
  try {
    const refreshToken = req.cookies?.['refresh-token'];

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    const refreshSecret = process.env.REFRESH_SECRET || process.env.JWT_SECRET;
    if (!refreshSecret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Verify refresh token
    let decoded: RefreshTokenPayload;
    try {
      decoded = jwt.verify(refreshToken, refreshSecret) as RefreshTokenPayload;
    } catch (_jwtError) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_INVALID'
      });
    }

    // Check if refresh token exists in database and is active
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const { data: storedToken, error: dbError } = await supabase
      .from('refresh_tokens')
      .select('user_id, token_family, expires_at, is_active')
      .eq('token_hash', tokenHash)
      .eq('is_active', true)
      .single();

    if (dbError || !storedToken) {
      // Token not found or reused - possible security breach
      logger.warn('Refresh token reuse detected:', { userId: decoded.userId, tokenFamily: decoded.tokenFamily });

      // Invalidate all tokens for this family
      await supabase
        .from('refresh_tokens')
        .update({ is_active: false })
        .eq('token_family', decoded.tokenFamily);

      return res.status(401).json({
        error: 'Refresh token invalid or reused',
        code: 'REFRESH_TOKEN_REUSED'
      });
    }

    // Check if token has expired
    if (new Date(storedToken.expires_at) < new Date()) {
      await supabase
        .from('refresh_tokens')
        .update({ is_active: false })
        .eq('token_hash', tokenHash);

      return res.status(401).json({
        error: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, pseudonym, email, role, is_active')
      .eq('id', storedToken.user_id)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      return res.status(401).json({
        error: 'User not found or inactive',
        code: 'USER_INVALID'
      });
    }

    // Generate new token pair (rotation)
    const { accessToken, refreshToken: newRefreshToken } = await generateTokenPair(
      user.id,
      user.email,
      user.role
    );

    // Invalidate old refresh token
    await supabase
      .from('refresh_tokens')
      .update({ is_active: false })
      .eq('token_hash', tokenHash);

    // Set new cookies with cross-subdomain support
    // 🔧 FIX: Only set domain when COOKIE_DOMAIN is a valid non-empty string
    const authCookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'none' | 'lax' | 'strict';
      maxAge: number;
      path: string;
      domain?: string;
    } = {
      httpOnly: true,
      secure: COOKIES_SECURE,
      sameSite: COOKIE_SAME_SITE,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    };

    const refreshCookieOptions: typeof authCookieOptions = {
      httpOnly: true,
      secure: COOKIES_SECURE,
      sameSite: COOKIE_SAME_SITE,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    };

    // 🔧 FIX: Temporarily disable domain setting - causes "option domain is invalid" errors
    // if (COOKIE_DOMAIN && typeof COOKIE_DOMAIN === 'string' && COOKIE_DOMAIN.trim().length > 0) {
    //   authCookieOptions.domain = COOKIE_DOMAIN.trim();
    //   refreshCookieOptions.domain = COOKIE_DOMAIN.trim();
    // }

    // Access token cookie (short-lived)
    res.cookie('auth-token', accessToken, authCookieOptions);

    // Refresh token cookie (long-lived)
    res.cookie('refresh-token', newRefreshToken, refreshCookieOptions);

    res.json({
      message: 'Token refreshed successfully',
      user: user
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    return res.status(500).json({
      error: 'Token refresh failed',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Middleware to automatically refresh tokens
export const autoRefreshMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Only run for authenticated routes
  if (!req.user) {
    return next();
  }

  try {
    const accessToken = req.cookies?.['auth-token'];

    if (accessToken) {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next();
      }

      try {
        const decoded = jwt.decode(accessToken);

        if (decoded && typeof decoded === 'object' && 'exp' in decoded) {
          const timeUntilExpiry = (decoded as JwtPayload).exp! * 1000 - Date.now();
          const fiveMinutes = 5 * 60 * 1000;

          // If token expires in less than 5 minutes, try to refresh
          if (timeUntilExpiry < fiveMinutes) {
            logger.debug('Access token expiring soon, attempting refresh...');

            // Don't await - let the request continue
            refreshAccessToken(req, res).catch(error => {
              logger.error('Auto-refresh failed:', error);
            });
          }
        }
      } catch (decodeError) {
        logger.error('Token decode error:', decodeError);
      }
    }
  } catch (error) {
    logger.error('Auto-refresh middleware error:', error);
  }

  next();
};

// Clean up expired refresh tokens (should be run periodically)
export const cleanupExpiredTokens = async () => {
  try {
    const { error } = await supabase
      .from('refresh_tokens')
      .update({ is_active: false })
      .lt('expires_at', new Date().toISOString());

    if (error) {
      logger.error('Token cleanup error:', error);
    } else {
      logger.debug('Expired tokens cleaned up successfully');
    }
  } catch (error) {
    logger.error('Token cleanup failed:', error);
  }
};

// Revoke all refresh tokens for a user (useful for logout all devices)
export const revokeAllUserTokens = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('refresh_tokens')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      logger.error('Token revocation error:', error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Token revocation failed:', error);
    return false;
  }
};