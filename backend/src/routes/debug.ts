import express from 'express';
import { csrfTokenGenerator, csrfProtection } from '../middleware/csrf';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Test endpoint pour debugging - capture TOUT ce qui arrive
router.post('/test-frontend', csrfTokenGenerator, csrfProtection, authenticateToken, (req, res) => {
  logger.debug('\n' + '='.repeat(60));
  logger.debug('🧪 DEBUG FRONTEND TEST ENDPOINT HIT!');
  logger.debug('='.repeat(60));

  // Logs détaillés de la requête
  logger.debug('📍 Request Details:');
  logger.debug('   Method:', req.method);
  logger.debug('   URL:', req.originalUrl);
  logger.debug('   Session ID:', req.sessionID);
  logger.debug('   User-Agent:', req.get('User-Agent'));
  logger.debug('   Origin:', req.get('Origin'));
  logger.debug('   Referer:', req.get('Referer'));

  // Headers complets
  logger.debug('\n🔧 All Headers:');
  Object.entries(req.headers).forEach(([key, value]) => {
    logger.debug(`   ${key}: ${value}`);
  });

  // Cookies
  logger.debug('\n🍪 Cookies:');
  logger.debug(JSON.stringify(req.cookies || {}, null, 2));

  // Session info
  logger.debug('\n🔐 Session Info:');
  logger.debug('   Session ID:', req.sessionID);
  logger.debug('   Session data:', JSON.stringify(req.session, null, 2));
  logger.debug('   CSRF Token in session:', req.session.csrfToken || 'MISSING');

  // Body
  logger.debug('\n📦 Request Body:');
  logger.debug(JSON.stringify(req.body, null, 2));

  // User info (après auth)
  logger.debug('\n👤 User Info (après auth):');
  logger.debug('   User ID:', (req as any).user?.id);
  logger.debug('   User email:', (req as any).user?.email);
  logger.debug('   User role:', (req as any).user?.role);

  logger.debug('\n' + '='.repeat(60));
  logger.debug('✅ DEBUG ENDPOINT - Toutes les validations ont réussi!');
  logger.debug('='.repeat(60));

  // Réponse de succès avec infos utiles
  res.json({
    success: true,
    message: 'Debug endpoint reached successfully',
    sessionId: req.sessionID,
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString(),
    csrf_validation: 'PASSED',
    auth_validation: 'PASSED',
    received_data: req.body
  });
});

// Endpoint simple sans auth ni CSRF pour comparer
router.post('/test-simple', csrfTokenGenerator, (req, res) => {
  logger.debug('\n' + '='.repeat(60));
  logger.debug('🧪 SIMPLE TEST ENDPOINT HIT (no auth, no CSRF protection)!');
  logger.debug('='.repeat(60));

  logger.debug('📍 Request Details:');
  logger.debug('   Method:', req.method);
  logger.debug('   URL:', req.originalUrl);
  logger.debug('   Session ID:', req.sessionID);
  logger.debug('   Body:', JSON.stringify(req.body, null, 2));

  logger.debug('='.repeat(60));

  res.json({
    success: true,
    message: 'Simple endpoint reached - no validation',
    sessionId: req.sessionID,
    timestamp: new Date().toISOString(),
    received_data: req.body
  });
});

// Endpoint pour tester juste CSRF (pas auth)
router.post('/test-csrf-only', csrfTokenGenerator, csrfProtection, (req, res) => {
  logger.debug('\n' + '='.repeat(60));
  logger.debug('🧪 CSRF-ONLY TEST ENDPOINT HIT!');
  logger.debug('='.repeat(60));

  logger.debug('📍 Request Details:');
  logger.debug('   Method:', req.method);
  logger.debug('   URL:', req.originalUrl);
  logger.debug('   Session ID:', req.sessionID);
  logger.debug('   CSRF Token from headers:', req.headers['x-csrf-token']);
  logger.debug('   CSRF Token from session:', req.session.csrfToken);
  logger.debug('   Body:', JSON.stringify(req.body, null, 2));

  logger.debug('='.repeat(60));

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
  logger.info('🧪 Testing Sentry error capture...');

  // Throw an intentional test error
  throw new Error('🧪 TEST ERROR: This is a test error to verify Sentry integration is working correctly');
});

// Test Sentry message capture
router.get('/test-sentry-message', (req, res) => {
  logger.info('🧪 Testing Sentry message capture...');

  // Manually capture a test message
  const { captureSentryMessage } = require('../config/sentry');
  captureSentryMessage('🧪 TEST MESSAGE: Sentry message capture test', 'info');

  res.json({
    success: true,
    message: 'Test message sent to Sentry'
  });
});

export default router;