"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const csrf_1 = require("../middleware/csrf");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
// Test endpoint pour debugging - capture TOUT ce qui arrive
router.post('/test-frontend', csrf_1.csrfTokenGenerator, csrf_1.csrfProtection, auth_1.authenticateToken, (req, res) => {
    logger_1.logger.debug('\n' + '='.repeat(60));
    logger_1.logger.debug('🧪 DEBUG FRONTEND TEST ENDPOINT HIT!');
    logger_1.logger.debug('='.repeat(60));
    // Logs détaillés de la requête
    logger_1.logger.debug('📍 Request Details:');
    logger_1.logger.debug('   Method:', req.method);
    logger_1.logger.debug('   URL:', req.originalUrl);
    logger_1.logger.debug('   Session ID:', req.sessionID);
    logger_1.logger.debug('   User-Agent:', req.get('User-Agent'));
    logger_1.logger.debug('   Origin:', req.get('Origin'));
    logger_1.logger.debug('   Referer:', req.get('Referer'));
    // Headers complets
    logger_1.logger.debug('\n🔧 All Headers:');
    Object.entries(req.headers).forEach(([key, value]) => {
        logger_1.logger.debug(`   ${key}: ${value}`);
    });
    // Cookies
    logger_1.logger.debug('\n🍪 Cookies:');
    logger_1.logger.debug(JSON.stringify(req.cookies || {}, null, 2));
    // Session info
    logger_1.logger.debug('\n🔐 Session Info:');
    logger_1.logger.debug('   Session ID:', req.sessionID);
    logger_1.logger.debug('   Session data:', JSON.stringify(req.session, null, 2));
    logger_1.logger.debug('   CSRF Token in session:', req.session.csrfToken || 'MISSING');
    // Body
    logger_1.logger.debug('\n📦 Request Body:');
    logger_1.logger.debug(JSON.stringify(req.body, null, 2));
    // User info (après auth)
    logger_1.logger.debug('\n👤 User Info (après auth):');
    logger_1.logger.debug('   User ID:', req.user?.id);
    logger_1.logger.debug('   User email:', req.user?.email);
    logger_1.logger.debug('   User role:', req.user?.role);
    logger_1.logger.debug('\n' + '='.repeat(60));
    logger_1.logger.debug('✅ DEBUG ENDPOINT - Toutes les validations ont réussi!');
    logger_1.logger.debug('='.repeat(60));
    // Réponse de succès avec infos utiles
    res.json({
        success: true,
        message: 'Debug endpoint reached successfully',
        sessionId: req.sessionID,
        userId: req.user?.id,
        timestamp: new Date().toISOString(),
        csrf_validation: 'PASSED',
        auth_validation: 'PASSED',
        received_data: req.body
    });
});
// Endpoint simple sans auth ni CSRF pour comparer
router.post('/test-simple', csrf_1.csrfTokenGenerator, (req, res) => {
    logger_1.logger.debug('\n' + '='.repeat(60));
    logger_1.logger.debug('🧪 SIMPLE TEST ENDPOINT HIT (no auth, no CSRF protection)!');
    logger_1.logger.debug('='.repeat(60));
    logger_1.logger.debug('📍 Request Details:');
    logger_1.logger.debug('   Method:', req.method);
    logger_1.logger.debug('   URL:', req.originalUrl);
    logger_1.logger.debug('   Session ID:', req.sessionID);
    logger_1.logger.debug('   Body:', JSON.stringify(req.body, null, 2));
    logger_1.logger.debug('='.repeat(60));
    res.json({
        success: true,
        message: 'Simple endpoint reached - no validation',
        sessionId: req.sessionID,
        timestamp: new Date().toISOString(),
        received_data: req.body
    });
});
// Endpoint pour tester juste CSRF (pas auth)
router.post('/test-csrf-only', csrf_1.csrfTokenGenerator, csrf_1.csrfProtection, (req, res) => {
    logger_1.logger.debug('\n' + '='.repeat(60));
    logger_1.logger.debug('🧪 CSRF-ONLY TEST ENDPOINT HIT!');
    logger_1.logger.debug('='.repeat(60));
    logger_1.logger.debug('📍 Request Details:');
    logger_1.logger.debug('   Method:', req.method);
    logger_1.logger.debug('   URL:', req.originalUrl);
    logger_1.logger.debug('   Session ID:', req.sessionID);
    logger_1.logger.debug('   CSRF Token from headers:', req.headers['x-csrf-token']);
    logger_1.logger.debug('   CSRF Token from session:', req.session.csrfToken);
    logger_1.logger.debug('   Body:', JSON.stringify(req.body, null, 2));
    logger_1.logger.debug('='.repeat(60));
    res.json({
        success: true,
        message: 'CSRF-only endpoint reached - CSRF validation passed',
        sessionId: req.sessionID,
        timestamp: new Date().toISOString(),
        csrf_validation: 'PASSED',
        received_data: req.body
    });
});
// Test Sentry error capture
router.get('/test-sentry-error', (req, res) => {
    logger_1.logger.info('🧪 Testing Sentry error capture...');
    // Throw an intentional test error
    throw new Error('🧪 TEST ERROR: This is a test error to verify Sentry integration is working correctly');
});
// Test Sentry message capture
router.get('/test-sentry-message', (req, res) => {
    logger_1.logger.info('🧪 Testing Sentry message capture...');
    // Manually capture a test message
    const { captureSentryMessage } = require('../config/sentry');
    captureSentryMessage('🧪 TEST MESSAGE: Sentry message capture test', 'info');
    res.json({
        success: true,
        message: 'Test message sent to Sentry'
    });
});
exports.default = router;
//# sourceMappingURL=debug.js.map