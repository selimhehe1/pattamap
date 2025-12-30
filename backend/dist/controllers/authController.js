"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutAll = exports.checkAvailability = exports.resetPassword = exports.forgotPassword = exports.logout = exports.changePassword = exports.getProfile = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const csrf_1 = require("../middleware/csrf"); // 🔧 Import for token regeneration
const validation_1 = require("../utils/validation"); // 🔧 FIX S1
const refreshToken_1 = require("../middleware/refreshToken"); // 🔧 Token rotation
// Cookie security configuration (shared with server.ts)
const NODE_ENV = process.env.NODE_ENV || 'development';
const COOKIES_SECURE = NODE_ENV === 'production' ||
    process.env.COOKIES_SECURE === 'true' ||
    process.env.HTTPS_ENABLED === 'true';
// 🔧 FIX: Cookie domain for cross-subdomain sharing (www.pattamap.com <-> api.pattamap.com)
// Note: Modern browsers don't require leading dot, and Express cookie library may reject it
const COOKIE_DOMAIN = (() => {
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
        }
        catch {
            // Ignore parsing errors
        }
    }
    return undefined;
})();
// 🔧 FIX: sameSite must be 'none' for cross-subdomain, 'lax' for same-origin dev
const COOKIE_SAME_SITE = COOKIES_SECURE ? 'none' : 'lax';
// Input validation helpers
const validateEmail = (email) => {
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
const validatePassword = (password) => {
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
const checkPasswordBreach = async (password) => {
    try {
        // SHA-1 hash the password
        const sha1Hash = crypto_1.default
            .createHash('sha1')
            .update(password)
            .digest('hex')
            .toUpperCase();
        // k-Anonymity: Send only first 5 characters
        const hashPrefix = sha1Hash.substring(0, 5);
        const hashSuffix = sha1Hash.substring(5);
        // Query HaveIBeenPwned API (range search)
        const response = await fetch(`https://api.pwnedpasswords.com/range/${hashPrefix}`, {
            method: 'GET',
            headers: {
                'User-Agent': 'PattaMap-PasswordChecker/1.0',
                'Add-Padding': 'true' // HIBP padding for additional privacy
            }
        });
        if (!response.ok) {
            // If API fails, log but don't block registration
            // (fail-open for availability, but log for monitoring)
            logger_1.logger.warn('HaveIBeenPwned API request failed', {
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
            logger_1.logger.warn('Password found in breach database', {
                hashPrefix, // Safe to log (only 5 chars)
                // DO NOT log full hash or password
            });
        }
        return isBreached;
    }
    catch (error) {
        // If check fails (network error, etc.), log but don't block
        logger_1.logger.error('Password breach check failed', error);
        return false; // Fail-open for user convenience
    }
};
const validatePseudonym = (pseudonym) => {
    return pseudonym.length >= 3 && pseudonym.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(pseudonym);
};
const sanitizeInput = (input) => {
    return input.trim().toLowerCase();
};
const register = async (req, res) => {
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
        // 🔒 SECURITY: Check if password has been breached (warning only, not blocking)
        // Uses HaveIBeenPwned API with k-Anonymity (privacy-preserving)
        const isBreached = await checkPasswordBreach(password);
        if (isBreached) {
            logger_1.logger.warn('User registering with breached password (warning issued)', {
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
        const { data: existingUsers } = await supabase_1.supabase
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
        const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
        // Create user with explicit fields (including account_type)
        const { data: user, error } = await supabase_1.supabase
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
            logger_1.logger.error('User creation error:', error);
            return res.status(400).json({
                error: 'Failed to create user',
                code: 'CREATION_FAILED'
            });
        }
        // 🔧 ROLLBACK FIX: Wrap post-creation steps in try-catch to rollback user if anything fails
        try {
            // 🎯 FIX: Initialize user_points immediately after user creation
            // This ensures GamificationContext can load userProgress from the start
            const { error: pointsError } = await supabase_1.supabase
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
                logger_1.logger.error('Failed to initialize user_points:', pointsError);
                // Rollback: delete user if user_points creation fails
                await supabase_1.supabase.from('users').delete().eq('id', user.id);
                return res.status(500).json({ error: 'Failed to initialize user gamification data' });
            }
            logger_1.logger.debug('✅ user_points initialized for new user:', user.id);
            // Generate JWT with proper expiration
            const jwtSecret = process.env.JWT_SECRET;
            const jwtExpiration = process.env.JWT_EXPIRES_IN || '7d';
            if (!jwtSecret) {
                logger_1.logger.error('JWT_SECRET not configured');
                // Rollback: delete user and user_points if JWT_SECRET is missing
                await supabase_1.supabase.from('user_points').delete().eq('user_id', user.id);
                await supabase_1.supabase.from('users').delete().eq('id', user.id);
                return res.status(500).json({ error: 'Server configuration error' });
            }
            const token = jsonwebtoken_1.default.sign({
                userId: user.id,
                email: user.email,
                role: user.role
            }, jwtSecret, { expiresIn: jwtExpiration });
            // Set secure httpOnly cookie
            // 🔧 FIX: Only set domain when COOKIE_DOMAIN is a valid non-empty string
            const registerCookieOptions = {
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
            // 🔧 CSRF FIX v2: Regenerate CSRF token AFTER auth to ensure session synchronization
            // Non-blocking save - register succeeds even if session store fails
            const freshCsrfToken = (0, csrf_1.generateCSRFToken)();
            req.session.csrfToken = freshCsrfToken;
            // Fire and forget - don't block register on session save
            req.session.save((err) => {
                if (err) {
                    logger_1.logger.error('Failed to save session after register (non-blocking)', err);
                }
                else {
                    logger_1.logger.debug('CSRF token regenerated and session saved after register', {
                        sessionId: req.sessionID,
                        tokenPreview: freshCsrfToken.substring(0, 8) + '...'
                    });
                }
            });
            res.status(201).json({
                message: 'User registered successfully',
                user: user,
                csrfToken: freshCsrfToken, // 🔧 Token synchronized with active session
                passwordBreached: isBreached // ⚠️ Warning flag for frontend to display
            });
        }
        catch (postCreationError) {
            // 🔧 ROLLBACK: Delete user if any post-creation step fails
            logger_1.logger.error('Post-creation error, rolling back user:', postCreationError);
            await supabase_1.supabase.from('users').delete().eq('id', user.id);
            return res.status(500).json({
                error: 'Registration failed. Please try again.',
                code: 'POST_CREATION_FAILED'
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Registration error:', error);
        return res.status(500).json({
            error: 'Registration failed',
            code: 'INTERNAL_ERROR'
        });
    }
};
exports.register = register;
const login = async (req, res) => {
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
        const escapedLogin = (0, validation_1.escapeLikeWildcards)(sanitizedLogin);
        const { data: users, error } = await supabase_1.supabase
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
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
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
        // 🔧 FIX: Ensure JWT_EXPIRES_IN is valid (non-empty string or use default)
        const rawExpiration = process.env.JWT_EXPIRES_IN;
        const jwtExpiration = rawExpiration && rawExpiration.trim() ? rawExpiration.trim() : '7d';
        if (!jwtSecret) {
            logger_1.logger.error('JWT_SECRET not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
            linkedEmployeeId: user.linked_employee_id // ✅ Include in JWT!
        }, jwtSecret, { expiresIn: jwtExpiration });
        // Set secure httpOnly cookie
        // 🔧 FIX: Only set domain when COOKIE_DOMAIN is a valid non-empty string
        const cookieOptions = {
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
        // 🔧 CSRF FIX: Regenerate CSRF token AFTER auth (same as register)
        // Non-blocking save - login succeeds even if session store fails
        const freshCsrfToken = (0, csrf_1.generateCSRFToken)();
        req.session.csrfToken = freshCsrfToken;
        // Fire and forget - don't block login on session save
        req.session.save((err) => {
            if (err) {
                logger_1.logger.error('Failed to save session after login (non-blocking)', err);
            }
            else {
                logger_1.logger.debug('CSRF token regenerated and session saved after login', {
                    sessionId: req.sessionID,
                    tokenPreview: freshCsrfToken.substring(0, 8) + '...'
                });
            }
        });
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        res.json({
            message: 'Login successful',
            user: userWithoutPassword,
            csrfToken: freshCsrfToken // 🔧 Token synchronized with active session
        });
    }
    catch (error) {
        logger_1.logger.error('Login error:', error);
        return res.status(500).json({
            error: 'Login failed',
            code: 'INTERNAL_ERROR'
        });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    try {
        // User is already validated by middleware
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }
        // Get full user profile with linked employee (if any)
        const { data: fullUser, error } = await supabase_1.supabase
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
            logger_1.logger.error('Get profile error:', error);
            return res.status(404).json({
                error: 'User profile not found',
                code: 'USER_NOT_FOUND'
            });
        }
        // 🔍 DEBUG: Log what we're returning
        logger_1.logger.debug('🔍 /api/auth/profile response:', {
            userId: fullUser.id,
            pseudonym: fullUser.pseudonym,
            account_type: fullUser.account_type,
            linked_employee_id: fullUser.linked_employee_id,
            hasLinkedEmployee: !!fullUser.linked_employee_id
        });
        res.json({
            user: fullUser
        });
    }
    catch (error) {
        logger_1.logger.error('Profile error:', error);
        return res.status(500).json({
            error: 'Failed to get profile',
            code: 'INTERNAL_ERROR'
        });
    }
};
exports.getProfile = getProfile;
// Password change endpoint
const changePassword = async (req, res) => {
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
        // 🔒 SECURITY: Check if new password has been breached (warning only, not blocking)
        const isBreached = await checkPasswordBreach(newPassword);
        if (isBreached) {
            logger_1.logger.warn('User changing to breached password (warning issued)', {
                userId: req.user.id,
                pseudonym: req.user.pseudonym
            });
            // Don't block - just warn. The flag will be included in the response.
        }
        // Get current password hash
        const { data: userData, error: fetchError } = await supabase_1.supabase
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
        const validCurrentPassword = await bcryptjs_1.default.compare(currentPassword, userData.password);
        if (!validCurrentPassword) {
            return res.status(401).json({
                error: 'Current password is incorrect',
                code: 'INVALID_CURRENT_PASSWORD'
            });
        }
        // Hash new password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, saltRounds);
        // Update password
        const { error: updateError } = await supabase_1.supabase
            .from('users')
            .update({ password: hashedNewPassword })
            .eq('id', req.user.id);
        if (updateError) {
            logger_1.logger.error('Password update error:', updateError);
            return res.status(500).json({
                error: 'Failed to update password',
                code: 'UPDATE_FAILED'
            });
        }
        res.json({
            message: 'Password changed successfully',
            passwordBreached: isBreached // ⚠️ Warning flag for frontend to display
        });
    }
    catch (error) {
        logger_1.logger.error('Change password error:', error);
        return res.status(500).json({
            error: 'Password change failed',
            code: 'INTERNAL_ERROR'
        });
    }
};
exports.changePassword = changePassword;
// Logout endpoint to clear cookies
const logout = async (req, res) => {
    try {
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
    }
    catch (error) {
        logger_1.logger.error('Logout error:', error);
        return res.status(500).json({
            error: 'Logout failed',
            code: 'INTERNAL_ERROR'
        });
    }
};
exports.logout = logout;
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
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        // Validate email
        if (!email || !validateEmail(email)) {
            return res.status(400).json({
                error: 'Valid email address is required',
                code: 'INVALID_EMAIL'
            });
        }
        const normalizedEmail = email.toLowerCase().trim();
        // Check if user exists (don't reveal if account exists for security)
        const { data: user, error: userError } = await supabase_1.supabase
            .from('users')
            .select('id, email, pseudonym')
            .ilike('email', normalizedEmail)
            .single();
        if (userError || !user) {
            // Return success even if user doesn't exist (security best practice)
            logger_1.logger.info('Password reset requested for non-existent email', {
                email: normalizedEmail
            });
            return res.json({
                message: 'If an account exists with this email, you will receive password reset instructions.',
                code: 'RESET_REQUESTED'
            });
        }
        // Generate secure reset token
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetTokenHash = crypto_1.default.createHash('sha256').update(resetToken).digest('hex');
        const resetTokenExpiry = new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRY_MS);
        // Store token hash in database (never store plain token)
        const { error: updateError } = await supabase_1.supabase
            .from('users')
            .update({
            password_reset_token: resetTokenHash,
            password_reset_expires: resetTokenExpiry.toISOString()
        })
            .eq('id', user.id);
        if (updateError) {
            logger_1.logger.error('Failed to store password reset token', {
                userId: user.id,
                error: updateError.message
            });
            return res.status(500).json({
                error: 'Failed to process password reset request',
                code: 'INTERNAL_ERROR'
            });
        }
        // Log reset token for manual email (until email service is configured)
        // In production, this should send an email instead
        logger_1.logger.info('🔐 PASSWORD RESET TOKEN GENERATED', {
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
    }
    catch (error) {
        logger_1.logger.error('Password reset request failed:', error);
        return res.status(500).json({
            error: 'Password reset request failed',
            code: 'INTERNAL_ERROR'
        });
    }
};
exports.forgotPassword = forgotPassword;
/**
 * Reset password with token
 * Validates the token and updates the user's password
 */
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        // Validate inputs
        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                error: 'Reset token is required',
                code: 'MISSING_TOKEN'
            });
        }
        if (!newPassword) {
            return res.status(400).json({
                error: 'New password is required',
                code: 'MISSING_PASSWORD'
            });
        }
        // Validate new password strength
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                error: passwordValidation.message,
                code: 'WEAK_PASSWORD'
            });
        }
        // Hash the provided token
        const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
        // Find user with matching token that hasn't expired
        const { data: user, error: userError } = await supabase_1.supabase
            .from('users')
            .select('id, pseudonym, email, password_reset_expires')
            .eq('password_reset_token', tokenHash)
            .single();
        if (userError || !user) {
            logger_1.logger.warn('Invalid password reset token used', {
                tokenHashPrefix: tokenHash.substring(0, 8)
            });
            return res.status(400).json({
                error: 'Invalid or expired reset token',
                code: 'INVALID_TOKEN'
            });
        }
        // Check if token has expired
        if (!user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
            logger_1.logger.warn('Expired password reset token used', {
                userId: user.id,
                expiredAt: user.password_reset_expires
            });
            return res.status(400).json({
                error: 'Reset token has expired. Please request a new password reset.',
                code: 'TOKEN_EXPIRED'
            });
        }
        // Hash the new password
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
        // Update password and clear reset token
        const { error: updateError } = await supabase_1.supabase
            .from('users')
            .update({
            password_hash: hashedPassword,
            password_reset_token: null,
            password_reset_expires: null
        })
            .eq('id', user.id);
        if (updateError) {
            logger_1.logger.error('Failed to update password', {
                userId: user.id,
                error: updateError.message
            });
            return res.status(500).json({
                error: 'Failed to reset password',
                code: 'INTERNAL_ERROR'
            });
        }
        logger_1.logger.info('Password reset successfully', {
            userId: user.id,
            pseudonym: user.pseudonym
        });
        res.json({
            message: 'Password has been reset successfully. You can now log in with your new password.',
            code: 'PASSWORD_RESET_SUCCESS'
        });
    }
    catch (error) {
        logger_1.logger.error('Password reset failed:', error);
        return res.status(500).json({
            error: 'Password reset failed',
            code: 'INTERNAL_ERROR'
        });
    }
};
exports.resetPassword = resetPassword;
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
const checkAvailability = async (req, res) => {
    try {
        const { pseudonym, email } = req.query;
        // At least one field must be provided
        if (!pseudonym && !email) {
            return res.status(400).json({
                error: 'At least one of pseudonym or email must be provided',
                code: 'MISSING_FIELD'
            });
        }
        const result = {};
        // Check pseudonym availability
        if (pseudonym && typeof pseudonym === 'string') {
            const trimmedPseudonym = pseudonym.trim();
            // Validate format first
            if (!validatePseudonym(trimmedPseudonym)) {
                result.pseudonymAvailable = false;
                result.pseudonymError = 'INVALID_FORMAT';
            }
            else {
                // Check if exists in database
                const { data: existingUser } = await supabase_1.supabase
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
            }
            else {
                // Check if exists in database
                const { data: existingUser } = await supabase_1.supabase
                    .from('users')
                    .select('id')
                    .ilike('email', sanitizedEmail)
                    .single();
                result.emailAvailable = !existingUser;
            }
        }
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Check availability error:', error);
        return res.status(500).json({
            error: 'Failed to check availability',
            code: 'INTERNAL_ERROR'
        });
    }
};
exports.checkAvailability = checkAvailability;
// ==========================================
// 🔧 v10.3: Logout All Devices
// ==========================================
/**
 * Logout from all devices
 * Revokes all refresh tokens for the authenticated user
 */
const logoutAll = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }
        // Revoke all refresh tokens for this user
        const success = await (0, refreshToken_1.revokeAllUserTokens)(req.user.id);
        if (!success) {
            return res.status(500).json({
                error: 'Failed to logout from all devices',
                code: 'REVOCATION_FAILED'
            });
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
        logger_1.logger.info('User logged out from all devices', {
            userId: req.user.id,
            pseudonym: req.user.pseudonym
        });
        res.json({
            message: 'Successfully logged out from all devices'
        });
    }
    catch (error) {
        logger_1.logger.error('Logout all error:', error);
        return res.status(500).json({
            error: 'Logout failed',
            code: 'INTERNAL_ERROR'
        });
    }
};
exports.logoutAll = logoutAll;
//# sourceMappingURL=authController.js.map