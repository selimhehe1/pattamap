"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeAllUserTokens = exports.cleanupExpiredTokens = exports.autoRefreshMiddleware = exports.refreshAccessToken = exports.generateTokenPair = exports.generateRefreshToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
// 🔧 FIX: Cookie security configuration (same as authController)
const NODE_ENV = process.env.NODE_ENV || 'development';
const COOKIES_SECURE = NODE_ENV === 'production' ||
    process.env.COOKIES_SECURE === 'true' ||
    process.env.HTTPS_ENABLED === 'true';
const COOKIE_DOMAIN = (() => {
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
        }
        catch {
            // Ignore
        }
    }
    return undefined;
})();
const COOKIE_SAME_SITE = COOKIES_SECURE ? 'none' : 'lax';
// Generate a new refresh token
const generateRefreshToken = () => {
    return crypto_1.default.randomBytes(64).toString('hex');
};
exports.generateRefreshToken = generateRefreshToken;
// Generate access and refresh token pair
const generateTokenPair = async (userId, email, role) => {
    const jwtSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.REFRESH_SECRET || process.env.JWT_SECRET;
    if (!jwtSecret || !refreshSecret) {
        throw new Error('JWT secrets not configured');
    }
    // Generate a token family ID for this login session
    const tokenFamily = crypto_1.default.randomUUID();
    // Generate access token (short-lived)
    const accessToken = jsonwebtoken_1.default.sign({ userId, email, role }, jwtSecret, { expiresIn: '15m' } // 15 minutes
    );
    // Generate refresh token (long-lived)
    const refreshToken = jsonwebtoken_1.default.sign({ userId, tokenFamily }, refreshSecret, { expiresIn: '7d' } // 7 days
    );
    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const { error } = await supabase_1.supabase
        .from('refresh_tokens')
        .insert({
        user_id: userId,
        token_family: tokenFamily,
        token_hash: crypto_1.default.createHash('sha256').update(refreshToken).digest('hex'),
        expires_at: expiresAt.toISOString(),
        is_active: true
    });
    if (error) {
        logger_1.logger.error('Failed to store refresh token', error);
        throw new Error('Failed to generate token pair');
    }
    logger_1.logger.debug('Token pair generated successfully');
    return { accessToken, refreshToken, tokenFamily };
};
exports.generateTokenPair = generateTokenPair;
// Refresh access token using refresh token
const refreshAccessToken = async (req, res) => {
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
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refreshToken, refreshSecret);
        }
        catch (jwtError) {
            return res.status(401).json({
                error: 'Invalid refresh token',
                code: 'REFRESH_TOKEN_INVALID'
            });
        }
        // Check if refresh token exists in database and is active
        const tokenHash = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
        const { data: storedToken, error: dbError } = await supabase_1.supabase
            .from('refresh_tokens')
            .select('user_id, token_family, expires_at, is_active')
            .eq('token_hash', tokenHash)
            .eq('is_active', true)
            .single();
        if (dbError || !storedToken) {
            // Token not found or reused - possible security breach
            logger_1.logger.warn('Refresh token reuse detected:', { userId: decoded.userId, tokenFamily: decoded.tokenFamily });
            // Invalidate all tokens for this family
            await supabase_1.supabase
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
            await supabase_1.supabase
                .from('refresh_tokens')
                .update({ is_active: false })
                .eq('token_hash', tokenHash);
            return res.status(401).json({
                error: 'Refresh token expired',
                code: 'REFRESH_TOKEN_EXPIRED'
            });
        }
        // Get user details
        const { data: user, error: userError } = await supabase_1.supabase
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
        const { accessToken, refreshToken: newRefreshToken } = await (0, exports.generateTokenPair)(user.id, user.email, user.role);
        // Invalidate old refresh token
        await supabase_1.supabase
            .from('refresh_tokens')
            .update({ is_active: false })
            .eq('token_hash', tokenHash);
        // Set new cookies with cross-subdomain support
        // 🔧 FIX: Only set domain when COOKIE_DOMAIN is a valid non-empty string
        const authCookieOptions = {
            httpOnly: true,
            secure: COOKIES_SECURE,
            sameSite: COOKIE_SAME_SITE,
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: '/'
        };
        const refreshCookieOptions = {
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
    }
    catch (error) {
        logger_1.logger.error('Token refresh error:', error);
        return res.status(500).json({
            error: 'Token refresh failed',
            code: 'INTERNAL_ERROR'
        });
    }
};
exports.refreshAccessToken = refreshAccessToken;
// Middleware to automatically refresh tokens
const autoRefreshMiddleware = async (req, res, next) => {
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
                const decoded = jsonwebtoken_1.default.decode(accessToken);
                if (decoded && decoded.exp) {
                    const timeUntilExpiry = decoded.exp * 1000 - Date.now();
                    const fiveMinutes = 5 * 60 * 1000;
                    // If token expires in less than 5 minutes, try to refresh
                    if (timeUntilExpiry < fiveMinutes) {
                        logger_1.logger.debug('Access token expiring soon, attempting refresh...');
                        // Don't await - let the request continue
                        (0, exports.refreshAccessToken)(req, res).catch(error => {
                            logger_1.logger.error('Auto-refresh failed:', error);
                        });
                    }
                }
            }
            catch (decodeError) {
                logger_1.logger.error('Token decode error:', decodeError);
            }
        }
    }
    catch (error) {
        logger_1.logger.error('Auto-refresh middleware error:', error);
    }
    next();
};
exports.autoRefreshMiddleware = autoRefreshMiddleware;
// Clean up expired refresh tokens (should be run periodically)
const cleanupExpiredTokens = async () => {
    try {
        const { error } = await supabase_1.supabase
            .from('refresh_tokens')
            .update({ is_active: false })
            .lt('expires_at', new Date().toISOString());
        if (error) {
            logger_1.logger.error('Token cleanup error:', error);
        }
        else {
            logger_1.logger.debug('Expired tokens cleaned up successfully');
        }
    }
    catch (error) {
        logger_1.logger.error('Token cleanup failed:', error);
    }
};
exports.cleanupExpiredTokens = cleanupExpiredTokens;
// Revoke all refresh tokens for a user (useful for logout all devices)
const revokeAllUserTokens = async (userId) => {
    try {
        const { error } = await supabase_1.supabase
            .from('refresh_tokens')
            .update({ is_active: false })
            .eq('user_id', userId);
        if (error) {
            logger_1.logger.error('Token revocation error:', error);
            return false;
        }
        return true;
    }
    catch (error) {
        logger_1.logger.error('Token revocation failed:', error);
        return false;
    }
};
exports.revokeAllUserTokens = revokeAllUserTokens;
//# sourceMappingURL=refreshToken.js.map