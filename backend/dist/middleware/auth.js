"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimitKey = exports.isEstablishmentOwner = exports.requireEstablishmentOwnerAccount = exports.requireEmployeeAccount = exports.requireModerator = exports.requireAdmin = exports.requireRole = exports.authenticateTokenOptional = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importStar(require("jsonwebtoken"));
const supabase_1 = require("../config/supabase");
const logger_1 = require("../utils/logger");
const sentry_1 = require("../config/sentry");
const authenticateToken = async (req, res, next) => {
    try {
        logger_1.logger.debug('Auth check', {
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
            logger_1.logger.debug('Auth failed', { reason: 'no_token' });
            return res.status(401).json({
                error: 'Access token required',
                code: 'TOKEN_MISSING'
            });
        }
        // Verify JWT secret exists
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            logger_1.logger.critical('JWT_SECRET not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        // Verify and decode token
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            logger_1.logger.debug('Token verified', {
                source: tokenSource,
                hasUserId: !!decoded.userId,
                hasRole: !!decoded.role
            });
        }
        catch (jwtError) {
            logger_1.logger.debug('Token verification failed', {
                error: jwtError.message,
                code: jwtError.name
            });
            if (jwtError instanceof jsonwebtoken_1.TokenExpiredError) {
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
        const { data: user, error } = await supabase_1.supabase
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
        logger_1.logger.debug('Authentication successful', {
            hasPseudonym: !!user.pseudonym,
            hasRole: !!user.role,
            isActive: user.is_active
        });
        // Set Sentry user context for error tracking
        (0, sentry_1.setSentryUserFromRequest)(req);
        next();
    }
    catch (error) {
        logger_1.logger.error('Authentication error', error);
        return res.status(500).json({
            error: 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
};
exports.authenticateToken = authenticateToken;
/**
 * Optional authentication middleware
 * Attempts to authenticate user if token exists, but does NOT block if no token
 * Used for endpoints that return different data for authenticated vs anonymous users
 *
 * Version: v10.3
 * Date: 2025-01-20
 */
const authenticateTokenOptional = async (req, res, next) => {
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
            logger_1.logger.warn('JWT_SECRET not configured, skipping optional auth');
            return next();
        }
        // Try to verify and decode token
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        }
        catch (jwtError) {
            // Token invalid/expired - continue without authentication
            logger_1.logger.debug('Optional auth: token verification failed', {
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
        const { data: user, error } = await supabase_1.supabase
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
        logger_1.logger.debug('Optional authentication successful', {
            userId: user.id,
            hasPseudonym: !!user.pseudonym
        });
        // Set Sentry user context for error tracking
        (0, sentry_1.setSentryUserFromRequest)(req);
        next();
    }
    catch (error) {
        // Any error - log and continue without authentication
        logger_1.logger.error('Optional authentication error', error);
        next();
    }
};
exports.authenticateTokenOptional = authenticateTokenOptional;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        // Validate input
        if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
            logger_1.logger.error('Invalid roles configuration');
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
exports.requireRole = requireRole;
// Middleware for admin-only routes
exports.requireAdmin = (0, exports.requireRole)(['admin']);
// Middleware for moderator and admin routes
exports.requireModerator = (0, exports.requireRole)(['admin', 'moderator']);
// Middleware for employee account routes (v10.0)
const requireEmployeeAccount = (req, res, next) => {
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
exports.requireEmployeeAccount = requireEmployeeAccount;
// Middleware for establishment owner account routes (v10.1)
const requireEstablishmentOwnerAccount = (req, res, next) => {
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
exports.requireEstablishmentOwnerAccount = requireEstablishmentOwnerAccount;
// Helper function to check if user is owner of a specific establishment (v10.1)
const isEstablishmentOwner = async (userId, establishmentId) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('establishment_owners')
            .select('id')
            .eq('user_id', userId)
            .eq('establishment_id', establishmentId)
            .single();
        if (error) {
            logger_1.logger.debug('isEstablishmentOwner check failed', { userId, establishmentId, error: error.message });
            return false;
        }
        return !!data;
    }
    catch (error) {
        logger_1.logger.error('isEstablishmentOwner error', error);
        return false;
    }
};
exports.isEstablishmentOwner = isEstablishmentOwner;
// Rate limiting helper for auth endpoints
const createRateLimitKey = (req) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    return `${ip}:${userAgent}`;
};
exports.createRateLimitKey = createRateLimitKey;
//# sourceMappingURL=auth.js.map