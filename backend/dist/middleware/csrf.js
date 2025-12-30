"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCSRFToken = exports.csrfProtection = exports.csrfTokenGenerator = exports.generateCSRFToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../utils/logger");
// Générer un token CSRF sécurisé
// 🔧 Exported for use in authController to regenerate token after auth
const generateCSRFToken = () => {
    return crypto_1.default.randomBytes(32).toString('hex');
};
exports.generateCSRFToken = generateCSRFToken;
// Middleware pour générer le token CSRF
const csrfTokenGenerator = (req, res, next) => {
    // 🔧 FIX: Force token regeneration when explicitly requesting /api/csrf-token
    // This fixes stale/corrupted tokens from sessions created before session.save() fix
    const isExplicitTokenRequest = req.originalUrl === '/api/csrf-token' || req.path === '/csrf-token';
    logger_1.logger.debug('CSRF token generator', {
        method: req.method,
        url: req.originalUrl,
        hasSession: !!req.session,
        hasExistingToken: !!req.session.csrfToken,
        forceRegenerate: isExplicitTokenRequest
    });
    // Générer un nouveau token si pas déjà présent en session OR if explicitly requesting token
    if (!req.session.csrfToken || isExplicitTokenRequest) {
        req.session.csrfToken = (0, exports.generateCSRFToken)();
        // Explicitly save the session to ensure token persistence BEFORE proceeding
        req.session.save((err) => {
            if (err) {
                logger_1.logger.error('Failed to save CSRF session', err);
                return next(err); // Pass error to error handler
            }
            logger_1.logger.debug('CSRF token generated and session saved', {
                tokenLength: req.session.csrfToken.length
            });
            // Rendre le token disponible pour les vues/API
            req.csrfToken = req.session.csrfToken;
            // ✅ Call next() ONLY after session is saved
            next();
        });
    }
    else {
        logger_1.logger.debug('CSRF token reused from session');
        // Rendre le token disponible pour les vues/API
        req.csrfToken = req.session.csrfToken;
        // ✅ Call next() for existing token case
        next();
    }
};
exports.csrfTokenGenerator = csrfTokenGenerator;
// Middleware de validation CSRF pour les routes sensibles
const csrfProtection = (req, res, next) => {
    logger_1.logger.debug('CSRF protection check', {
        method: req.method,
        url: req.originalUrl
    });
    // Ignorer la validation pour les méthodes GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        logger_1.logger.debug('CSRF check skipped for safe method', { method: req.method });
        return next();
    }
    // ========================================
    // 🔒 CSRF BYPASS REMOVED - SECURITY FIX
    // ========================================
    // CRITICAL SECURITY ISSUE FIXED:
    // - Previous code bypassed CSRF for ALL /api/admin/* routes (CVSS 7.5)
    // - This allowed potential CSRF attacks from malicious sites/subdomains
    // - Even with httpOnly cookies, CSRF protection is REQUIRED because:
    //   * Browsers send cookies automatically on cross-site requests
    //   * Attacker can forge requests from evil.com → pattamap.com/api/admin/users/delete
    //   * CSRF token is the ONLY defense (attacker cannot access it)
    //
    // ✅ FIX: NO BYPASS - All mutations (POST/PUT/DELETE) require CSRF token
    // Frontend already sends X-CSRF-Token header via useSecureFetch
    //
    // If CSRF errors occur on admin routes:
    // 1. Verify frontend includes X-CSRF-Token header
    // 2. Check CSRFContext is wrapping AdminPanel
    // 3. Ensure session persistence (cookies enabled)
    // ========================================
    const sessionToken = req.session.csrfToken;
    const requestToken = req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf;
    logger_1.logger.debug('CSRF tokens check', {
        method: req.method,
        url: req.originalUrl,
        sessionId: req.sessionID, // 🔍 Track session ID to detect session changes
        sessionToken: sessionToken ? `${sessionToken.substring(0, 8)}...` : null, // 🔍 Show token preview
        requestToken: requestToken ? `${String(requestToken).substring(0, 8)}...` : null, // 🔍 Show token preview
        hasSessionToken: !!sessionToken,
        hasRequestToken: !!requestToken,
        requestTokenSource: req.headers['x-csrf-token'] ? 'header' : (req.body._csrf ? 'body' : 'query'),
        tokensMatch: sessionToken && requestToken ? sessionToken === String(requestToken) : false // 🔍 Quick check
    });
    // Vérifier que les tokens existent
    if (!sessionToken) {
        logger_1.logger.warn('CSRF validation failed', {
            reason: 'session_token_missing',
            sessionId: req.sessionID,
            hasSession: !!req.session,
            sessionKeys: req.session ? Object.keys(req.session) : []
        });
        return res.status(403).json({
            error: 'CSRF session token missing',
            code: 'CSRF_SESSION_MISSING',
            debug: {
                sessionId: req.sessionID?.substring(0, 8) + '...',
                hint: 'Session may have expired or cookies not sent'
            }
        });
    }
    if (!requestToken) {
        logger_1.logger.warn('CSRF validation failed', { reason: 'request_token_missing' });
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
            logger_1.logger.warn('CSRF validation failed', { reason: 'token_length_mismatch' });
            return res.status(403).json({
                error: 'CSRF token length mismatch',
                code: 'CSRF_TOKEN_LENGTH_MISMATCH'
            });
        }
        const isValid = crypto_1.default.timingSafeEqual(Buffer.from(sessionToken), Buffer.from(requestToken));
        if (!isValid) {
            logger_1.logger.warn('CSRF validation failed', {
                reason: 'token_content_mismatch',
                sessionId: req.sessionID,
                sessionTokenPreview: sessionToken.substring(0, 8) + '...',
                requestTokenPreview: String(requestToken).substring(0, 8) + '...'
            });
            return res.status(403).json({
                error: 'CSRF token mismatch',
                code: 'CSRF_TOKEN_INVALID',
                debug: {
                    sessionId: req.sessionID?.substring(0, 8) + '...',
                    expected: sessionToken.substring(0, 8) + '...',
                    received: String(requestToken).substring(0, 8) + '...'
                }
            });
        }
    }
    catch (error) {
        logger_1.logger.error('CSRF token comparison failed', error);
        return res.status(403).json({
            error: 'CSRF token comparison failed',
            code: 'CSRF_COMPARISON_ERROR'
        });
    }
    logger_1.logger.debug('CSRF validation successful');
    next();
};
exports.csrfProtection = csrfProtection;
// Route pour obtenir le token CSRF (pour le frontend)
const getCSRFToken = (req, res) => {
    const token = req.csrfToken || req.session.csrfToken;
    if (!token) {
        logger_1.logger.error('CSRF token not available');
        return res.status(500).json({
            error: 'Could not generate CSRF token'
        });
    }
    logger_1.logger.debug('CSRF token requested');
    res.json({
        csrfToken: token,
        sessionId: req.sessionID, // Include session ID for debugging
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    });
};
exports.getCSRFToken = getCSRFToken;
//# sourceMappingURL=csrf.js.map