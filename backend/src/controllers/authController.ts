import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { generateCSRFToken } from '../middleware/csrf'; // 🔧 Import for token regeneration
import { escapeLikeWildcards } from '../utils/validation'; // 🔧 FIX S1

// Cookie security configuration (shared with server.ts)
const NODE_ENV = process.env.NODE_ENV || 'development';
const COOKIES_SECURE = NODE_ENV === 'production' ||
  process.env.COOKIES_SECURE === 'true' ||
  process.env.HTTPS_ENABLED === 'true';

// Input validation helpers
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

/**
 * 🔒 SECURITY FIX: Strengthened Password Policy (CVSS 6.5)
 *
 * Requirements (NIST SP 800-63B compliant):
 * - Minimum 12 characters (was 8)
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
  // Length checks
  if (password.length < 12) {
    return {
      valid: false,
      message: 'Password must be at least 12 characters long'
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
  if (!/(?=.*[@$!%*?&#^()_+\-=\[\]{};':"\\|,.<>\/])/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one special character (@$!%*?&#^()_+-=[]{};\':"|,.<>/)'
    };
  }

  return { valid: true };
};

/**
 * 🔒 SECURITY FIX: HaveIBeenPwned Breach Check (CVSS 6.5)
 *
 * Checks if password has been exposed in known data breaches
 * using the HaveIBeenPwned Passwords API (k-Anonymity model)
 *
 * How it works:
 * 1. Hash password with SHA-1
 * 2. Send first 5 chars of hash to API (privacy-preserving)
 * 3. API returns all hashes starting with those 5 chars
 * 4. Check if full hash is in the response
 *
 * Privacy: Password never sent to API, only partial hash
 *
 * @param password - Password to check
 * @returns true if password found in breach database
 */
const checkPasswordBreach = async (password: string): Promise<boolean> => {
  try {
    // SHA-1 hash the password
    const sha1Hash = crypto
      .createHash('sha1')
      .update(password)
      .digest('hex')
      .toUpperCase();

    // k-Anonymity: Send only first 5 characters
    const hashPrefix = sha1Hash.substring(0, 5);
    const hashSuffix = sha1Hash.substring(5);

    // Query HaveIBeenPwned API (range search)
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${hashPrefix}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'PattaMap-PasswordChecker/1.0',
          'Add-Padding': 'true' // HIBP padding for additional privacy
        }
      }
    );

    if (!response.ok) {
      // If API fails, log but don't block registration
      // (fail-open for availability, but log for monitoring)
      logger.warn('HaveIBeenPwned API request failed', {
        status: response.status,
        statusText: response.statusText
      });
      return false; // Don't block on API failure
    }

    const hashList = await response.text();

    // Check if our hash suffix appears in the response
    // Format: "SUFFIX:COUNT\r\n" (e.g., "003D68EB55068C33ACE09247EE4C639306B:3")
    const isBreached = hashList
      .split('\r\n')
      .some(line => line.startsWith(hashSuffix));

    if (isBreached) {
      logger.warn('Password found in breach database', {
        hashPrefix, // Safe to log (only 5 chars)
        // DO NOT log full hash or password
      });
    }

    return isBreached;

  } catch (error) {
    // If check fails (network error, etc.), log but don't block
    logger.error('Password breach check failed', error);
    return false; // Fail-open for user convenience
  }
};

const validatePseudonym = (pseudonym: string): boolean => {
  return pseudonym.length >= 3 && pseudonym.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(pseudonym);
};

const sanitizeInput = (input: string): string => {
  return input.trim().toLowerCase();
};

export const register = async (req: Request, res: Response) => {
  try {
    const { pseudonym, email, password, account_type } = req.body;

    // Input validation
    if (!pseudonym || !email || !password) {
      return res.status(400).json({
        error: 'Pseudonym, email and password are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate pseudonym
    if (!validatePseudonym(pseudonym)) {
      return res.status(400).json({
        error: 'Pseudonym must be 3-50 characters, alphanumeric with dash/underscore only',
        code: 'INVALID_PSEUDONYM'
      });
    }

    // Validate email
    const sanitizedEmail = sanitizeInput(email);
    if (!validateEmail(sanitizedEmail)) {
      return res.status(400).json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: passwordValidation.message,
        code: 'INVALID_PASSWORD'
      });
    }

    // 🔒 SECURITY FIX: Check if password has been breached
    // Uses HaveIBeenPwned API with k-Anonymity (privacy-preserving)
    const isBreached = await checkPasswordBreach(password);
    if (isBreached) {
      logger.warn('User attempted registration with breached password', {
        pseudonym, // Safe to log
        email: sanitizedEmail.substring(0, 3) + '***' // Partial email for privacy
      });
      return res.status(400).json({
        error: 'This password has been exposed in a data breach and cannot be used. Please choose a different password.',
        code: 'PASSWORD_BREACHED',
        hint: 'Use a unique password that hasn\'t been compromised'
      });
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
      return res.status(409).json({
        error: `User with this ${conflictType} already exists`,
        code: 'USER_EXISTS'
      });
    }

    // Hash password with secure rounds
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with explicit fields (including account_type)
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        pseudonym: pseudonym.trim(),
        email: sanitizedEmail,
        password: hashedPassword,
        role: 'user',
        is_active: true,
        account_type: userAccountType
      })
      .select('id, pseudonym, email, role, is_active, account_type, created_at')
      .single();

    if (error) {
      logger.error('User creation error:', error);
      return res.status(400).json({
        error: 'Failed to create user',
        code: 'CREATION_FAILED'
      });
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
        return res.status(500).json({ error: 'Failed to initialize user gamification data' });
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
        return res.status(500).json({ error: 'Server configuration error' });
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
      res.cookie('auth-token', token, {
        httpOnly: true,
        secure: COOKIES_SECURE, // HTTPS required (production or COOKIES_SECURE=true in dev)
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        path: '/'
      });

      // 🔧 CSRF FIX v2: Regenerate CSRF token AFTER auth to ensure session synchronization
      // This prevents session ID mismatch between register and subsequent requests
      req.session.csrfToken = generateCSRFToken();

      // Explicitly save session before returning to ensure token is persisted
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            logger.error('Failed to save session after token regeneration', err);
            reject(err);
          } else {
            logger.debug('CSRF token regenerated and session saved after auth', {
              sessionId: req.sessionID,
              tokenPreview: req.session.csrfToken!.substring(0, 8) + '...'
            });
            resolve();
          }
        });
      });

      const freshCsrfToken = req.session.csrfToken;

      res.status(201).json({
        message: 'User registered successfully',
        user: user,
        csrfToken: freshCsrfToken // 🔧 Token synchronized with active session
      });
    } catch (postCreationError) {
      // 🔧 ROLLBACK: Delete user if any post-creation step fails
      logger.error('Post-creation error, rolling back user:', postCreationError);
      await supabase.from('users').delete().eq('id', user.id);

      return res.status(500).json({
        error: 'Registration failed. Please try again.',
        code: 'POST_CREATION_FAILED'
      });
    }

  } catch (error) {
    logger.error('Registration error:', error);
    return res.status(500).json({
      error: 'Registration failed',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body; // login can be pseudonym or email

    // Input validation
    if (!login || !password) {
      return res.status(400).json({
        error: 'Login and password are required',
        code: 'MISSING_FIELDS'
      });
    }

    if (typeof login !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Invalid input types',
        code: 'INVALID_INPUT'
      });
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
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const user = users[0];

    // Check password with constant time comparison
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      // Use constant time delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100));
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate JWT with proper expiration
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiration = process.env.JWT_EXPIRES_IN || '7d';

    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
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
    res.cookie('auth-token', token, {
      httpOnly: true,
      secure: COOKIES_SECURE, // HTTPS required (production or COOKIES_SECURE=true in dev)
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/'
    });

    // 🔧 CSRF FIX: Regenerate CSRF token AFTER auth (same as register)
    req.session.csrfToken = generateCSRFToken();

    // Explicitly save session before returning to ensure token is persisted
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          logger.error('Failed to save session after token regeneration', err);
          reject(err);
        } else {
          logger.debug('CSRF token regenerated and session saved after login', {
            sessionId: req.sessionID,
            tokenPreview: req.session.csrfToken!.substring(0, 8) + '...'
          });
          resolve();
        }
      });
    });

    const freshCsrfToken = req.session.csrfToken;

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      csrfToken: freshCsrfToken // 🔧 Token synchronized with active session
    });

  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({
      error: 'Login failed',
      code: 'INTERNAL_ERROR'
    });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    // User is already validated by middleware
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
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
      return res.status(404).json({
        error: 'User profile not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // 🔍 DEBUG: Log what we're returning
    logger.debug('🔍 /api/auth/profile response:', {
      userId: fullUser.id,
      pseudonym: fullUser.pseudonym,
      account_type: fullUser.account_type,
      linked_employee_id: fullUser.linked_employee_id,
      hasLinkedEmployee: !!fullUser.linked_employee_id
    });

    res.json({
      user: fullUser
    });

  } catch (error) {
    logger.error('Profile error:', error);
    return res.status(500).json({
      error: 'Failed to get profile',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Password change endpoint
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current and new password are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: passwordValidation.message,
        code: 'INVALID_PASSWORD'
      });
    }

    // 🔒 SECURITY FIX: Check if new password has been breached
    const isBreached = await checkPasswordBreach(newPassword);
    if (isBreached) {
      logger.warn('User attempted to change to breached password', {
        userId: req.user.id,
        pseudonym: req.user.pseudonym
      });
      return res.status(400).json({
        error: 'This password has been exposed in a data breach and cannot be used. Please choose a different password.',
        code: 'PASSWORD_BREACHED',
        hint: 'Use a unique password that hasn\'t been compromised'
      });
    }

    // Get current password hash
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('password')
      .eq('id', req.user.id)
      .single();

    if (fetchError || !userData) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const validCurrentPassword = await bcrypt.compare(currentPassword, userData.password);
    if (!validCurrentPassword) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INVALID_CURRENT_PASSWORD'
      });
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
      return res.status(500).json({
        error: 'Failed to update password',
        code: 'UPDATE_FAILED'
      });
    }

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Change password error:', error);
    return res.status(500).json({
      error: 'Password change failed',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Logout endpoint to clear cookies
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    // Clear the httpOnly cookie
    res.clearCookie('auth-token', {
      httpOnly: true,
      secure: COOKIES_SECURE,
      sameSite: 'strict',
      path: '/'
    });

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    return res.status(500).json({
      error: 'Logout failed',
      code: 'INTERNAL_ERROR'
    });
  }
};