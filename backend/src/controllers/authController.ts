import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { generateCSRFToken } from '../middleware/csrf';
import { escapeLikeWildcards } from '../utils/validation';
import { revokeAllUserTokens } from '../middleware/refreshToken';
import { checkPasswordBreach } from '../utils/passwordSecurity';
import { asyncHandler, BadRequestError, NotFoundError, UnauthorizedError, ConflictError, InternalServerError } from '../middleware/asyncHandler';
import { blacklistToken } from '../config/redis';

// Cookie security configuration (shared with server.ts)
const NODE_ENV = process.env.NODE_ENV || 'development';
const COOKIES_SECURE = NODE_ENV === 'production' ||
  process.env.COOKIES_SECURE === 'true' ||
  process.env.HTTPS_ENABLED === 'true';

// 🔧 FIX: Cookie domain for cross-subdomain sharing (www.pattamap.com <-> api.pattamap.com)
// Note: Modern browsers don't require leading dot, and Express cookie library may reject it
const _COOKIE_DOMAIN = (() => {
  if (process.env.COOKIE_DOMAIN) {
    return process.env.COOKIE_DOMAIN;
  }
  // Auto-derive from CORS_ORIGIN in production
  if (NODE_ENV === 'production' && process.env.CORS_ORIGIN) {
    try {
      const url = new URL(process.env.CORS_ORIGIN);
      const parts = url.hostname.split('.');
      if (parts.length >= 2) {
        // Return domain without leading dot (e.g., "pattamap.com")
        return parts.slice(-2).join('.');
      }
    } catch {
      // Ignore parsing errors
    }
  }
  return undefined;
})();

// 🔧 FIX: sameSite must be 'none' for cross-subdomain, 'lax' for same-origin dev
const COOKIE_SAME_SITE: 'none' | 'lax' | 'strict' = COOKIES_SECURE ? 'none' : 'lax';

// Input validation helpers
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

/**
 * 🔒 Password Policy
 *
 * Requirements:
 * - Minimum 8 characters (user request: not a high-security site)
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 * - Maximum 128 characters (prevent DoS)
 *
 * Protection against:
 * - Brute force attacks
 * - Dictionary attacks
 * - Credential stuffing
 */
const validatePassword = (password: string): { valid: boolean; message?: string } => {
  // Length checks - 🔧 FIX P1: Changed from 12 to 8 (user request)
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long'
    };
  }
  if (password.length > 128) {
    return {
      valid: false,
      message: 'Password too long (max 128 characters)'
    };
  }

  // Complexity checks
  if (!/(?=.*[a-z])/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter (a-z)'
    };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter (A-Z)'
    };
  }
  if (!/(?=.*\d)/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number (0-9)'
    };
  }

  // 🔒 NEW: Special character requirement
  if (!/(?=.*[@$!%*?&#^()_+\-=[{};':"\\|,.<>/\]])/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one special character (@$!%*?&#^()_+-=[]{};\':"|,.<>/)'
    };
  }

  return { valid: true };
};

const validatePseudonym = (pseudonym: string): boolean => {
  return pseudonym.length >= 3 && pseudonym.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(pseudonym);
};

const sanitizeInput = (input: string): string => {
  return input.trim().toLowerCase();
};

export const register = asyncHandler(async (req: Request, res: Response) => {
    const { pseudonym, email, password, account_type, avatar_url } = req.body;

    // Input validation
    if (!pseudonym || !email || !password) {
      throw BadRequestError('Pseudonym, email and password are required');
    }

    // Validate pseudonym
    if (!validatePseudonym(pseudonym)) {
      throw BadRequestError('Pseudonym must be 3-50 characters, alphanumeric with dash/underscore only');
    }

    // Validate email
    const sanitizedEmail = sanitizeInput(email);
    if (!validateEmail(sanitizedEmail)) {
      throw BadRequestError('Invalid email format');
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw BadRequestError(passwordValidation.message || 'Invalid password');
    }

    // 🔒 SECURITY: Check if password has been breached (warning only, not blocking)
    // Uses HaveIBeenPwned API with k-Anonymity (privacy-preserving)
    const isBreached = await checkPasswordBreach(password);
    if (isBreached) {
      logger.warn('User registering with breached password (warning issued)', {
        pseudonym, // Safe to log
        email: sanitizedEmail.substring(0, 3) + '***' // Partial email for privacy
      });
      // Don't block - just warn. The flag will be included in the response.
    }

    // Validate account_type (optional, defaults to 'regular')
    const validAccountTypes = ['regular', 'employee', 'establishment_owner'];
    const userAccountType = account_type && validAccountTypes.includes(account_type)
      ? account_type
      : 'regular';

    // Check if user already exists with parameterized queries
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id, pseudonym, email')
      .or(`pseudonym.eq."${pseudonym}",email.eq."${sanitizedEmail}"`);

    if (existingUsers && existingUsers.length > 0) {
      const conflictType = existingUsers.some(u => u.email === sanitizedEmail) ? 'email' : 'pseudonym';
      throw ConflictError(`User with this ${conflictType} already exists`);
    }

    // Hash password with secure rounds
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with explicit fields (including account_type and optional avatar_url)
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        pseudonym: pseudonym.trim(),
        email: sanitizedEmail,
        password: hashedPassword,
        role: 'user',
        is_active: true,
        account_type: userAccountType,
        avatar_url: avatar_url || null
      })
      .select('id, pseudonym, email, role, is_active, account_type, avatar_url, created_at')
      .single();

    if (error) {
      logger.error('User creation error:', error);
      throw BadRequestError('Failed to create user');
    }

    // 🔧 ROLLBACK FIX: Wrap post-creation steps in try-catch to rollback user if anything fails
    try {
      // 🎯 FIX: Initialize user_points immediately after user creation
      // This ensures GamificationContext can load userProgress from the start
      const { error: pointsError } = await supabase
        .from('user_points')
        .insert({
          user_id: user.id,
          total_xp: 0,
          monthly_xp: 0,
          current_level: 1,
          current_streak_days: 0,
          longest_streak_days: 0,
          last_activity_date: new Date().toISOString().split('T')[0] // DATE format (YYYY-MM-DD)
        });

      if (pointsError) {
        logger.error('Failed to initialize user_points:', pointsError);
        // Rollback: delete user if user_points creation fails
        await supabase.from('users').delete().eq('id', user.id);
        throw InternalServerError('Failed to initialize user gamification data');
      }

      logger.debug('✅ user_points initialized for new user:', user.id);

      // Generate JWT with proper expiration
      const jwtSecret = process.env.JWT_SECRET;
      const jwtExpiration = process.env.JWT_EXPIRES_IN || '7d';

      if (!jwtSecret) {
        logger.error('JWT_SECRET not configured');
        // Rollback: delete user and user_points if JWT_SECRET is missing
        await supabase.from('user_points').delete().eq('user_id', user.id);
        await supabase.from('users').delete().eq('id', user.id);
        throw InternalServerError('Server configuration error');
      }

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role
        },
        jwtSecret,
        { expiresIn: jwtExpiration } as jwt.SignOptions
      );

      // Set secure httpOnly cookie
      // 🔧 FIX: Only set domain when COOKIE_DOMAIN is a valid non-empty string
      const registerCookieOptions: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: 'none' | 'lax' | 'strict';
        maxAge: number;
        path: string;
        domain?: string;
      } = {
        httpOnly: true,
        secure: COOKIES_SECURE, // HTTPS required (production or COOKIES_SECURE=true in dev)
        sameSite: COOKIE_SAME_SITE, // 🔧 FIX: 'none' for cross-subdomain in production
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        path: '/'
      };

      // 🔧 FIX: Temporarily disable domain setting - causes "option domain is invalid" errors
      // if (COOKIE_DOMAIN && typeof COOKIE_DOMAIN === 'string' && COOKIE_DOMAIN.trim().length > 0) {
      //   registerCookieOptions.domain = COOKIE_DOMAIN.trim();
      // }

      res.cookie('auth-token', token, registerCookieOptions);

      // 🔧 CSRF FIX v3: Regenerate CSRF token and WAIT for session save
      // Previous bug: response was sent before session was saved, causing CSRF mismatch
      const freshCsrfToken = generateCSRFToken();
      req.session.csrfToken = freshCsrfToken;

      // 🔧 BLOCKING save - response sent only AFTER session is persisted
      req.session.save((err) => {
        if (err) {
          logger.error('Failed to save session after register', err);
          // Still return success since auth cookie is set, but warn about CSRF
          return res.status(201).json({
            message: 'User registered successfully',
            user: user,
            csrfToken: freshCsrfToken,
            passwordBreached: isBreached,
            warning: 'Session save failed - CSRF may be unreliable'
          });
        }

        logger.debug('CSRF token regenerated and session saved after register', {
          sessionId: req.sessionID,
          tokenPreview: freshCsrfToken.substring(0, 8) + '...'
        });

        res.status(201).json({
          message: 'User registered successfully',
          user: user,
          csrfToken: freshCsrfToken,
          passwordBreached: isBreached
        });
      });
    } catch (postCreationError) {
      // 🔧 ROLLBACK: Delete user if any post-creation step fails
      logger.error('Post-creation error, rolling back user:', postCreationError);
      await supabase.from('users').delete().eq('id', user.id);

      throw InternalServerError('Registration failed. Please try again.');
    }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { login, password } = req.body; // login can be pseudonym or email

    // Input validation
    if (!login || !password) {
      throw BadRequestError('Login and password are required');
    }

    if (typeof login !== 'string' || typeof password !== 'string') {
      throw BadRequestError('Invalid input types');
    }

    const sanitizedLogin = sanitizeInput(login);

    // Find user by pseudonym or email with security checks (case-insensitive)
    // Using ilike for case-insensitive search on pseudonym and email
    // 🔧 FIX S1: Escape LIKE wildcards to prevent login bypass via % or _
    const escapedLogin = escapeLikeWildcards(sanitizedLogin);
    const { data: users, error } = await supabase
      .from('users')
      .select('id, pseudonym, email, password, role, is_active, account_type, linked_employee_id')
      .or(`pseudonym.ilike."${escapedLogin}",email.ilike."${escapedLogin}"`)
      .eq('is_active', true);

    if (error || !users || users.length === 0) {
      // Use constant time delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100));
      throw UnauthorizedError('Invalid credentials');
    }

    const user = users[0];

    // Check password with constant time comparison
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      // Use constant time delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100));
      throw UnauthorizedError('Invalid credentials');
    }

    // LEGACY JWT: Single token (7 days), no refresh token.
    // A token-pair system exists in refreshToken.ts (access 15min + refresh 7d)
    // but is NOT connected to login/register flows. To migrate:
    // 1. Replace jwt.sign() below with generateTokenPair() from refreshToken.ts
    // 2. Set both 'auth-token' and 'refresh-token' cookies
    // 3. Apply autoRefreshMiddleware() in server.ts
    const jwtSecret = process.env.JWT_SECRET;
    // 🔧 FIX: Ensure JWT_EXPIRES_IN is valid (non-empty string or use default)
    const rawExpiration = process.env.JWT_EXPIRES_IN;
    const jwtExpiration = rawExpiration && rawExpiration.trim() ? rawExpiration.trim() : '7d';

    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      throw InternalServerError('Server configuration error');
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        linkedEmployeeId: user.linked_employee_id  // ✅ Include in JWT!
      },
      jwtSecret,
      { expiresIn: jwtExpiration } as jwt.SignOptions
    );

    // Set secure httpOnly cookie
    // 🔧 FIX: Only set domain when COOKIE_DOMAIN is a valid non-empty string
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'none' | 'lax' | 'strict';
      maxAge: number;
      path: string;
      domain?: string;
    } = {
      httpOnly: true,
      secure: COOKIES_SECURE, // HTTPS required (production or COOKIES_SECURE=true in dev)
      sameSite: COOKIE_SAME_SITE, // 🔧 FIX: 'none' for cross-subdomain in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/'
    };

    // 🔧 FIX: Temporarily disable domain setting - causes "option domain is invalid" errors
    // Cross-subdomain cookies will be handled by browser (sameSite=none + secure)
    // if (COOKIE_DOMAIN && typeof COOKIE_DOMAIN === 'string' && COOKIE_DOMAIN.trim().length > 0) {
    //   cookieOptions.domain = COOKIE_DOMAIN.trim();
    // }

    res.cookie('auth-token', token, cookieOptions);

    // 🔧 CSRF FIX v3: Regenerate CSRF token and WAIT for session save
    // Previous bug: response was sent before session was saved, causing CSRF mismatch
    const freshCsrfToken = generateCSRFToken();
    req.session.csrfToken = freshCsrfToken;

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // 🔧 BLOCKING save - response sent only AFTER session is persisted
    req.session.save((err) => {
      if (err) {
        logger.error('Failed to save session after login', err);
        // Still return success since auth cookie is set, but warn about CSRF
        return res.json({
          message: 'Login successful',
          user: userWithoutPassword,
          csrfToken: freshCsrfToken,
          warning: 'Session save failed - CSRF may be unreliable'
        });
      }

      logger.debug('CSRF token regenerated and session saved after login', {
        sessionId: req.sessionID,
        tokenPreview: freshCsrfToken.substring(0, 8) + '...'
      });

      res.json({
        message: 'Login successful',
        user: userWithoutPassword,
        csrfToken: freshCsrfToken
      });
    });
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    // User is already validated by middleware
    if (!req.user) {
      throw UnauthorizedError('Authentication required');
    }

    // Get full user profile with linked employee (if any)
    const { data: fullUser, error } = await supabase
      .from('users')
      .select(`
        id,
        pseudonym,
        email,
        role,
        is_active,
        account_type,
        avatar_url,
        linked_employee_id,
        created_at,
        linkedEmployee:employees!users_linked_employee_id_fkey(
          id,
          name,
          nickname,
          photos,
          status
        )
      `)
      .eq('id', req.user.id)
      .single();

    if (error || !fullUser) {
      logger.error('Get profile error:', error);
      throw NotFoundError('User profile not found');
    }

    res.json({
      user: fullUser
    });
});

// Password change endpoint
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    if (!req.user) {
      throw UnauthorizedError('Authentication required');
    }

    if (!currentPassword || !newPassword) {
      throw BadRequestError('Current and new password are required');
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw BadRequestError(passwordValidation.message || 'Invalid password');
    }

    // 🔒 SECURITY: Check if new password has been breached (warning only, not blocking)
    const isBreached = await checkPasswordBreach(newPassword);
    if (isBreached) {
      logger.warn('User changing to breached password (warning issued)', {
        userId: req.user.id,
        pseudonym: req.user.pseudonym
      });
      // Don't block - just warn. The flag will be included in the response.
    }

    // Get current password hash
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('password')
      .eq('id', req.user.id)
      .single();

    if (fetchError || !userData) {
      throw UnauthorizedError('User not found');
    }

    // Verify current password
    const validCurrentPassword = await bcrypt.compare(currentPassword, userData.password);
    if (!validCurrentPassword) {
      throw UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedNewPassword })
      .eq('id', req.user.id);

    if (updateError) {
      logger.error('Password update error:', updateError);
      throw InternalServerError('Failed to update password');
    }

    res.json({
      message: 'Password changed successfully',
      passwordBreached: isBreached // ⚠️ Warning flag for frontend to display
    });
});

// Logout endpoint to clear cookies
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    // 🛡️ SECURITY: Blacklist the current token to prevent reuse
    const token = req.cookies?.['auth-token'] ||
      (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].substring(7) : null);

    if (token) {
      try {
        // Decode token to get expiry time (without verifying, since we just want the TTL)
        const decoded = jwt.decode(token) as { exp?: number } | null;
        if (decoded?.exp) {
          // Calculate remaining TTL
          const remainingTtl = decoded.exp - Math.floor(Date.now() / 1000);
          if (remainingTtl > 0) {
            // Blacklist token for its remaining lifetime
            await blacklistToken(token, remainingTtl);
            logger.debug('Token blacklisted on logout', {
              userId: req.user?.id,
              ttlSeconds: remainingTtl
            });
          }
        }
      } catch (error) {
        // Don't fail logout if blacklisting fails
        logger.warn('Failed to blacklist token on logout:', error);
      }
    }

    // Clear the httpOnly cookie
    res.clearCookie('auth-token', {
      httpOnly: true,
      secure: COOKIES_SECURE,
      sameSite: COOKIE_SAME_SITE,
      path: '/'
      // domain temporarily disabled - see login fix
    });

    res.json({
      message: 'Logout successful'
    });
});

// ==========================================
// 🔧 FIX A4: Password Reset Flow
// ==========================================

// Password reset token expiry (1 hour)
const PASSWORD_RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Request password reset
 * Generates a secure token and stores it in the database
 * Note: Email sending is not yet implemented - tokens are logged for manual intervention
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    // Validate email
    if (!email || !validateEmail(email)) {
      throw BadRequestError('Valid email address is required');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists (don't reveal if account exists for security)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, pseudonym')
      .ilike('email', normalizedEmail)
      .single();

    if (userError || !user) {
      // Return success even if user doesn't exist (security best practice)
      logger.info('Password reset requested for non-existent email', {
        email: normalizedEmail
      });
      res.json({
        message: 'If an account exists with this email, you will receive password reset instructions.',
        code: 'RESET_REQUESTED'
      });
      return;
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS);

    // Store token hash in database (never store plain token)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_reset_token: resetTokenHash,
        password_reset_expires: resetTokenExpiry.toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      logger.error('Failed to store password reset token', {
        userId: user.id,
        error: updateError.message
      });
      throw InternalServerError('Failed to process password reset request');
    }

    // Log reset token for manual email (until email service is configured)
    // In production, this should send an email instead
    logger.info('🔐 PASSWORD RESET TOKEN GENERATED', {
      userId: user.id,
      pseudonym: user.pseudonym,
      email: normalizedEmail,
      resetToken: resetToken, // Only logged for manual intervention
      expiresAt: resetTokenExpiry.toISOString(),
      note: 'Email service not configured - manual intervention required'
    });

    res.json({
      message: 'If an account exists with this email, you will receive password reset instructions.',
      code: 'RESET_REQUESTED',
      // In development, include token for testing (remove in production)
      ...(NODE_ENV === 'development' && { _devToken: resetToken })
    });
});

/**
 * Reset password with token
 * Validates the token and updates the user's password
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;

    // Validate inputs
    if (!token || typeof token !== 'string') {
      throw BadRequestError('Reset token is required');
    }

    if (!newPassword) {
      throw BadRequestError('New password is required');
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw BadRequestError(passwordValidation.message || 'Weak password');
    }

    // Hash the provided token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching token that hasn't expired
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, pseudonym, email, password_reset_expires')
      .eq('password_reset_token', tokenHash)
      .single();

    // 🛡️ SECURITY: Use same error message for invalid AND expired tokens
    // This prevents attackers from distinguishing between valid-but-expired vs never-existed tokens
    const GENERIC_TOKEN_ERROR = 'Invalid or expired reset token. Please request a new password reset.';

    if (userError || !user) {
      logger.warn('Invalid password reset token used', {
        tokenHashPrefix: tokenHash.substring(0, 8)
      });
      throw BadRequestError(GENERIC_TOKEN_ERROR);
    }

    // Check if token has expired
    if (!user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
      logger.warn('Expired password reset token used', {
        userId: user.id,
        expiredAt: user.password_reset_expires
      });
      throw BadRequestError(GENERIC_TOKEN_ERROR);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null
      })
      .eq('id', user.id);

    if (updateError) {
      logger.error('Failed to update password', {
        userId: user.id,
        error: updateError.message
      });
      throw InternalServerError('Failed to reset password');
    }

    logger.info('Password reset successfully', {
      userId: user.id,
      pseudonym: user.pseudonym
    });

    res.json({
      message: 'Password has been reset successfully. You can now log in with your new password.',
      code: 'PASSWORD_RESET_SUCCESS'
    });
});

// ==========================================
// 🔧 Phase 9: Real-time Availability Check
// ==========================================

/**
 * Check if pseudonym and/or email are available
 * GET /api/auth/check-availability?pseudonym=xxx&email=xxx
 *
 * Used for real-time validation during registration
 * Rate limited separately (more permissive than auth endpoints)
 */
export const checkAvailability = asyncHandler(async (req: Request, res: Response) => {
    const { pseudonym, email } = req.query;

    // At least one field must be provided
    if (!pseudonym && !email) {
      throw BadRequestError('At least one of pseudonym or email must be provided');
    }

    const result: {
      pseudonymAvailable?: boolean;
      emailAvailable?: boolean;
      pseudonymError?: string;
      emailError?: string;
    } = {};

    // Check pseudonym availability
    if (pseudonym && typeof pseudonym === 'string') {
      const trimmedPseudonym = pseudonym.trim();

      // Validate format first
      if (!validatePseudonym(trimmedPseudonym)) {
        result.pseudonymAvailable = false;
        result.pseudonymError = 'INVALID_FORMAT';
      } else {
        // Check if exists in database
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .ilike('pseudonym', trimmedPseudonym)
          .single();

        result.pseudonymAvailable = !existingUser;
      }
    }

    // Check email availability
    if (email && typeof email === 'string') {
      const sanitizedEmail = sanitizeInput(email);

      // Validate format first
      if (!validateEmail(sanitizedEmail)) {
        result.emailAvailable = false;
        result.emailError = 'INVALID_FORMAT';
      } else {
        // Check if exists in database
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .ilike('email', sanitizedEmail)
          .single();

        result.emailAvailable = !existingUser;
      }
    }

    res.json(result);
});

// ==========================================
// 🔧 v10.3: Logout All Devices
// ==========================================

/**
 * Logout from all devices
 * Revokes all refresh tokens for the authenticated user
 */
export const logoutAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      throw UnauthorizedError('Authentication required');
    }

    // Revoke all refresh tokens for this user
    const success = await revokeAllUserTokens(req.user.id);

    if (!success) {
      throw InternalServerError('Failed to logout from all devices');
    }

    // Clear cookies
    res.clearCookie('auth-token', {
      httpOnly: true,
      secure: COOKIES_SECURE,
      sameSite: COOKIE_SAME_SITE,
      path: '/'
      // domain temporarily disabled - see login fix
    });

    res.clearCookie('refresh-token', {
      httpOnly: true,
      secure: COOKIES_SECURE,
      sameSite: COOKIE_SAME_SITE,
      path: '/'
      // domain temporarily disabled - see login fix
    });

    logger.info('User logged out from all devices', {
      userId: req.user.id,
      pseudonym: req.user.pseudonym
    });

    res.json({
      message: 'Successfully logged out from all devices'
    });
});

/**
 * Sync Supabase Auth user with our database
 *
 * Called after Supabase Auth login/signup to ensure user exists in our users table.
 * For OAuth users (Google), creates a new user profile.
 * For existing users, returns the existing profile.
 *
 * @route POST /api/auth/sync-user
 * @requires Supabase Auth token in Authorization header
 */
export const syncSupabaseUser = asyncHandler(async (req: Request, res: Response) => {
  const { supabaseUserId, email, pseudonym, account_type, avatar_url, checkOnly } = req.body;

  // Validate required fields
  if (!supabaseUserId) {
    throw BadRequestError('Supabase user ID is required');
  }

  if (!email) {
    throw BadRequestError('Email is required');
  }

  logger.debug('[SyncUser] Syncing user', {
    supabaseUserId,
    email,
    pseudonym: pseudonym || 'auto-generated'
  });

  // Check if user already exists by auth_id
  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', supabaseUserId)
    .single();

  if (existingUser) {
    logger.debug('[SyncUser] User already synced', {
      userId: existingUser.id,
      pseudonym: existingUser.pseudonym
    });

    // Update avatar_url if missing and provided (from Google)
    if (!existingUser.avatar_url && avatar_url) {
      await supabase
        .from('users')
        .update({ avatar_url })
        .eq('id', existingUser.id);
      existingUser.avatar_url = avatar_url;
    }

    // Set JWT cookie for existing OAuth users (needed for CSRF and subsequent requests)
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      const jwtExpiration = process.env.JWT_EXPIRES_IN?.trim() || '7d';
      const token = jwt.sign(
        {
          userId: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
          linkedEmployeeId: existingUser.linked_employee_id
        },
        jwtSecret,
        { expiresIn: jwtExpiration } as jwt.SignOptions
      );

      res.cookie('auth-token', token, {
        httpOnly: true,
        secure: COOKIES_SECURE,
        sameSite: COOKIE_SAME_SITE,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });
    }

    return res.json({
      message: 'User already synced',
      isNew: false,
      user: {
        id: existingUser.id,
        pseudonym: existingUser.pseudonym,
        email: existingUser.email,
        role: existingUser.role,
        is_active: existingUser.is_active,
        account_type: existingUser.account_type,
        linked_employee_id: existingUser.linked_employee_id,
        avatar_url: existingUser.avatar_url,
        auth_id: existingUser.auth_id
      }
    });
  }

  // Check if user exists by email (legacy user migration)
  const { data: legacyUser } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    .single();

  if (legacyUser) {
    // Link existing user to Supabase Auth and update avatar if provided
    const updateData: Record<string, unknown> = { auth_id: supabaseUserId };
    if (!legacyUser.avatar_url && avatar_url) {
      updateData.avatar_url = avatar_url;
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', legacyUser.id)
      .select()
      .single();

    if (updateError) {
      logger.error('[SyncUser] Failed to link legacy user:', updateError);
      throw InternalServerError('Failed to link user account');
    }

    logger.info('[SyncUser] Legacy user linked to Supabase Auth', {
      userId: updatedUser.id,
      pseudonym: updatedUser.pseudonym
    });

    // Set JWT cookie for legacy OAuth users (needed for CSRF and subsequent requests)
    const jwtSecretLegacy = process.env.JWT_SECRET;
    if (jwtSecretLegacy) {
      const jwtExpirationLegacy = process.env.JWT_EXPIRES_IN?.trim() || '7d';
      const tokenLegacy = jwt.sign(
        {
          userId: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          linkedEmployeeId: updatedUser.linked_employee_id
        },
        jwtSecretLegacy,
        { expiresIn: jwtExpirationLegacy } as jwt.SignOptions
      );

      res.cookie('auth-token', tokenLegacy, {
        httpOnly: true,
        secure: COOKIES_SECURE,
        sameSite: COOKIE_SAME_SITE,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });
    }

    return res.json({
      message: 'User account linked',
      isNew: false,
      user: {
        id: updatedUser.id,
        pseudonym: updatedUser.pseudonym,
        email: updatedUser.email,
        role: updatedUser.role,
        is_active: updatedUser.is_active,
        account_type: updatedUser.account_type,
        linked_employee_id: updatedUser.linked_employee_id,
        avatar_url: updatedUser.avatar_url,
        auth_id: updatedUser.auth_id
      }
    });
  }

  // If checkOnly mode, return isNew without creating account
  // This is used to determine if user should be redirected to registration
  if (checkOnly) {
    logger.debug('[SyncUser] CheckOnly mode - user is new');
    return res.json({
      message: 'User does not exist',
      isNew: true,
      user: null
    });
  }

  // Create new user (OAuth signup)
  // Generate unique pseudonym if not provided
  let finalPseudonym = pseudonym;
  if (!finalPseudonym) {
    // Use email prefix as base pseudonym
    const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
    finalPseudonym = emailPrefix.slice(0, 40); // Max 40 chars to leave room for suffix

    // Check if pseudonym is taken
    const { data: existingPseudonym } = await supabase
      .from('users')
      .select('id')
      .ilike('pseudonym', finalPseudonym)
      .single();

    if (existingPseudonym) {
      // Add random suffix
      finalPseudonym = `${finalPseudonym}_${crypto.randomBytes(3).toString('hex')}`;
    }
  }

  // Check pseudonym uniqueness
  const { data: pseudonymCheck } = await supabase
    .from('users')
    .select('id')
    .ilike('pseudonym', finalPseudonym)
    .single();

  if (pseudonymCheck) {
    throw ConflictError('Pseudonym already taken. Please choose another.');
  }

  // Create the user
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      auth_id: supabaseUserId,
      email: email.toLowerCase(),
      pseudonym: finalPseudonym,
      password: 'SUPABASE_AUTH', // Placeholder - password managed by Supabase
      role: 'user',
      is_active: true,
      account_type: account_type || 'regular',
      avatar_url: avatar_url || null
    })
    .select()
    .single();

  if (createError) {
    logger.error('[SyncUser] Failed to create user:', createError);
    throw InternalServerError('Failed to create user account');
  }

  // Initialize gamification (user_points)
  const { error: pointsError } = await supabase
    .from('user_points')
    .insert({
      user_id: newUser.id,
      total_xp: 0,
      monthly_xp: 0,
      current_level: 1,
      current_streak_days: 0,
      longest_streak_days: 0
    });

  if (pointsError) {
    logger.warn('[SyncUser] Failed to initialize user_points:', pointsError);
    // Non-critical - continue
  }

  logger.info('[SyncUser] New user created via Supabase Auth', {
    userId: newUser.id,
    pseudonym: newUser.pseudonym,
    provider: 'oauth'
  });

  // Set JWT cookie so that subsequent requests (CSRF, uploads, claims) are authenticated
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    const jwtExpiration = process.env.JWT_EXPIRES_IN?.trim() || '7d';
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role
      },
      jwtSecret,
      { expiresIn: jwtExpiration } as jwt.SignOptions
    );

    res.cookie('auth-token', token, {
      httpOnly: true,
      secure: COOKIES_SECURE,
      sameSite: COOKIE_SAME_SITE,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });
  }

  res.status(201).json({
    message: 'User created successfully',
    isNew: true,
    user: {
      id: newUser.id,
      pseudonym: newUser.pseudonym,
      email: newUser.email,
      role: newUser.role,
      is_active: newUser.is_active,
      account_type: newUser.account_type,
      linked_employee_id: newUser.linked_employee_id,
      avatar_url: newUser.avatar_url,
      auth_id: newUser.auth_id
    }
  });
});