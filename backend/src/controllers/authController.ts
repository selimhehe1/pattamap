import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

// Input validation helpers
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password too long' };
  }
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

const validatePseudonym = (pseudonym: string): boolean => {
  return pseudonym.length >= 3 && pseudonym.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(pseudonym);
};

const sanitizeInput = (input: string): string => {
  return input.trim().toLowerCase();
};

export const register = async (req: Request, res: Response) => {
  try {
    const { pseudonym, email, password } = req.body;

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

    // Create user with explicit fields
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        pseudonym: pseudonym.trim(),
        email: sanitizedEmail,
        password: hashedPassword,
        role: 'user',
        is_active: true
      })
      .select('id, pseudonym, email, role, is_active, created_at')
      .single();

    if (error) {
      logger.error('User creation error:', error);
      return res.status(400).json({
        error: 'Failed to create user',
        code: 'CREATION_FAILED'
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
        role: user.role
      },
      jwtSecret,
      { expiresIn: jwtExpiration } as jwt.SignOptions
    );

    // Set secure httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth-token', token, {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/'
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: user
    });

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

    // Find user by pseudonym or email with security checks
    const { data: users, error } = await supabase
      .from('users')
      .select('id, pseudonym, email, password, role, is_active')
      .or(`pseudonym.eq."${sanitizedLogin}",email.eq."${sanitizedLogin}"`)
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
        role: user.role
      },
      jwtSecret,
      { expiresIn: jwtExpiration } as jwt.SignOptions
    );

    // Set secure httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth-token', token, {
      httpOnly: true,
      secure: isProduction, // HTTPS only in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/'
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      user: userWithoutPassword
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

    // Return user profile without sensitive data
    const { password, ...userProfile } = req.user as any;

    res.json({
      user: userProfile
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
      secure: process.env.NODE_ENV === 'production',
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