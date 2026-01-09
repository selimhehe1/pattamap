// Express type extensions (for req.user, req.csrfToken)
// TypeScript automatically picks up .d.ts files from ./types/ via tsconfig.json
// Force reload with NULL NULL fix
// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config();

// Validate critical environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SESSION_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ FATAL ERROR: Missing required environment variables');
  console.error('❌ Missing variables:', missingEnvVars.join(', '));
  console.error('💡 Please create a .env file in the backend/ directory');
  console.error('💡 Use backend/.env.example as a template');
  process.exit(1);
}

// Validate JWT_SECRET is strong enough (minimum 32 characters)
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('❌ FATAL ERROR: JWT_SECRET must be at least 32 characters long');
  console.error('💡 Generate a strong secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

// Initialize Sentry BEFORE any other imports (critical for error tracking)
import { initSentry, Sentry as _Sentry, sentryRequestMiddleware, sentryErrorMiddleware } from './config/sentry';
initSentry();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { Redis as UpstashRedis } from '@upstash/redis';

/** Redis client interface compatible with connect-redis session store */
interface RedisClientWrapper {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, optionsOrFlag?: { EX?: number } | string, ttl?: number): Promise<string>;
  del(key: string | string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
}
import cookieParser from 'cookie-parser';
import { csrfTokenGenerator, csrfProtection, getCSRFToken } from './middleware/csrf';
import { authenticateToken, requireAdmin as _requireAdmin, isEstablishmentOwner as _isEstablishmentOwner } from './middleware/auth';
import { logger } from './utils/logger';
import authRoutes from './routes/auth';
import establishmentRoutes from './routes/establishments';
import employeeRoutes from './routes/employees';
import commentRoutes from './routes/comments';
import consumableRoutes from './routes/consumables';
import uploadRoutes from './routes/upload';
import moderationRoutes from './routes/moderation';
import adminRoutes from './routes/admin';
import favoriteRoutes from './routes/favorites';
import editProposalRoutes from './routes/editProposals';
import freelanceRoutes from './routes/freelances';
import notificationRoutes from './routes/notifications';
import pushRoutes from './routes/push';
import verificationsRoutes from './routes/verifications';
import vipRoutes from './routes/vip';
import gamificationRoutes from './routes/gamification';
import employeeValidationRoutes from './routes/employeeValidation';
import ownershipRequestRoutes from './routes/ownershipRequests';
import exportRoutes from './routes/export';
import publicRoutes from './routes/public';
import userRoutes from './routes/users';
import {
  apiRateLimit as _apiRateLimit,
  authRateLimit,
  uploadRateLimit as _uploadRateLimit,
  adminRateLimit,
  commentRateLimit as _commentRateLimit,
  healthCheckRateLimit,
  globalRateLimit,
  globalAuthenticatedRateLimit
} from './middleware/rateLimit';
import { initRedis, cacheInvalidatePattern as _cacheInvalidatePattern, cacheDel as _cacheDel, getRedisClient as _getRedisClient, isRedisConnected as _isRedisConnected } from './config/redis';
import { startMissionResetJobs, stopMissionResetJobs } from './jobs/missionResetJobs';
import { handleGridMove } from './controllers/gridMoveController';

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Sentry request handler - captures request context
app.use(sentryRequestMiddleware());

// CORS configuration - Strict whitelist
// 🔒 MUST run BEFORE Helmet to properly set Access-Control-Allow-Origin
// 🔒 SECURITY FIX: Fail fast in production if CORS_ORIGIN not configured
if (NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.error('❌ FATAL ERROR: CORS_ORIGIN must be set in production');
  console.error('💡 Set CORS_ORIGIN environment variable with your production domain(s)');
  console.error('💡 Example: CORS_ORIGIN=https://pattamap.com,https://www.pattamap.com');
  process.exit(1);
}

const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:3006',
  'http://localhost:3007',
  'http://localhost:3008',
  'http://localhost:5173'
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In development, log blocked origins for debugging
    if (NODE_ENV === 'development') {
      console.log(`🚫 CORS blocked origin: ${origin}`);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'Accept', 'Origin'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'X-CSRF-Token'],
  maxAge: 86400 // 24 hours preflight cache
};

app.use(cors(corsOptions));

// Security middleware - Helmet.js for HTTP headers
// 🔒 SECURITY: Conditional CSP - Strict by default, relaxed only for Swagger UI
app.use((req, res, next) => {
  // Relaxed CSP for Swagger UI (requires inline scripts/styles)
  if (req.path.startsWith('/api-docs')) {
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
          scriptSrc: ["'self'", "'unsafe-inline'"], // Required for Swagger UI
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow CORS requests
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      noSniff: true,
      ieNoOpen: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true
    })(req, res, next);
  } else {
    // Strict CSP for application (NO unsafe-inline)
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'"], // ✅ HARDENED: No unsafe-inline
          scriptSrc: ["'self'"], // ✅ HARDENED: No unsafe-inline
          imgSrc: ["'self'", "data:", "https:"], // Allow data URIs and HTTPS images
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow CORS requests
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      noSniff: true,
      ieNoOpen: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true
    })(req, res, next);
  }
});

// 🚀 Response compression (gzip/brotli) - Reduces bandwidth by ~70%
// Compresses all text-based responses (JSON, HTML, CSS, JS)
app.use(compression({
  // Only compress responses larger than 1KB
  threshold: 1024,
  // Compression level (0-9, higher = better compression but slower)
  level: 6,
  // Filter function to determine what to compress
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Use compression's default filter (compresses text-based responses)
    return compression.filter(req, res);
  }
}));

// Cookie parser middleware
app.use(cookieParser());

// Determine if cookies should be secure
// - Production: always true (HTTPS required)
// - Development: true if COOKIES_SECURE=true or HTTPS_ENABLED=true in .env
// - Test: false (for easier testing)
const cookiesSecure = NODE_ENV === 'production' ||
  process.env.COOKIES_SECURE === 'true' ||
  process.env.HTTPS_ENABLED === 'true';

// Cookie domain for cross-subdomain sharing (pattamap.com <-> api.pattamap.com)
// In production, set COOKIE_DOMAIN=.pattamap.com to share cookies across subdomains
// 🔧 FIX: Auto-derive cookie domain from CORS_ORIGIN in production if not explicitly set
const cookieDomain = (() => {
  // Use explicit COOKIE_DOMAIN if set
  if (process.env.COOKIE_DOMAIN) {
    return process.env.COOKIE_DOMAIN;
  }

  // In production, try to derive from CORS_ORIGIN
  if (NODE_ENV === 'production' && process.env.CORS_ORIGIN) {
    try {
      // Extract domain from first CORS origin (e.g., https://www.pattamap.com -> .pattamap.com)
      const firstOrigin = process.env.CORS_ORIGIN.split(',')[0];
      const url = new URL(firstOrigin);
      const hostParts = url.hostname.split('.');

      // Get root domain (e.g., pattamap.com from www.pattamap.com)
      if (hostParts.length >= 2) {
        const rootDomain = hostParts.slice(-2).join('.');
        const derivedDomain = `.${rootDomain}`;
        logger.info(`🍪 Cookie domain auto-derived from CORS_ORIGIN: ${derivedDomain}`);
        return derivedDomain;
      }
    } catch (error) {
      logger.warn('Failed to auto-derive cookie domain from CORS_ORIGIN:', error);
    }
  }

  return undefined;
})();

// Log warning if cookies are not secure in development
if (NODE_ENV === 'development' && !cookiesSecure) {
  logger.warn('⚠️  SECURITY WARNING: Cookies are NOT secure in development');
  logger.warn('⚠️  Cookies can be intercepted on local networks (MITM attacks)');
  logger.warn('💡 Enable HTTPS in development: See backend/docs/HTTPS_DEV_SETUP.md');
  logger.warn('💡 Or set COOKIES_SECURE=true in .env (requires HTTPS setup)');
}

// 🔧 FIX: Create Redis session store for serverless compatibility (Vercel)
// Without this, each serverless function instance has its own MemoryStore
// which breaks CSRF validation across requests
const createSessionStore = (): session.Store | undefined => {
  const redisUrl = process.env.REDIS_URL;
  const useRedis = process.env.USE_REDIS === 'true';

  if (!useRedis || !redisUrl) {
    if (NODE_ENV === 'production') {
      logger.error('🚨 CRITICAL: Redis not configured in production!');
      logger.error('🚨 Sessions will NOT persist across serverless instances (Vercel/Railway)');
      logger.error('🚨 CSRF validation and auth sessions will fail randomly');
      logger.error('💡 FIX: Set USE_REDIS=true and REDIS_URL in environment variables');
    } else {
      logger.warn('⚠️  No Redis configured - using MemoryStore (OK for development)');
    }
    return undefined;
  }

  try {
    logger.info(`🔗 Redis session store initializing...`);

    // Parse URL to extract host and password
    // URL format: rediss://default:password@host:port or redis://default:password@host:port
    const urlForParsing = redisUrl.replace('rediss://', 'https://').replace('redis://', 'http://');
    const parsedUrl = new URL(urlForParsing);
    const password = decodeURIComponent(parsedUrl.password);
    const host = parsedUrl.hostname;

    // 🔧 FIX: Use Upstash HTTP REST API instead of TCP for serverless compatibility
    // Upstash REST URL is https://host and token is the password
    const restUrl = `https://${host}`;

    logger.info(`🔗 Using Upstash REST API: ${restUrl}`);

    // Create Upstash HTTP client (stateless - perfect for serverless)
    const upstashClient = new UpstashRedis({
      url: restUrl,
      token: password
    });

    // Create a wrapper that makes Upstash client compatible with connect-redis
    // IMPORTANT: connect-redis expects raw strings, but Upstash auto-serializes JSON
    // We need to handle serialization ourselves
    const redisClientWrapper: RedisClientWrapper = {
      get: async (key: string): Promise<string | null> => {
        try {
          const value = await upstashClient.get(key);
          // If Upstash already deserialized it to an object, re-serialize it
          if (value && typeof value === 'object') {
            return JSON.stringify(value);
          }
          return typeof value === 'string' ? value : null;
        } catch (err) {
          logger.error('Redis GET error:', err);
          return null;
        }
      },
      set: async (key: string, value: string, optionsOrFlag?: { EX?: number } | string, ttl?: number) => {
        try {
          // connect-redis v8+ uses { EX: ttl } format
          // connect-redis v7 uses 'EX', ttl format
          if (typeof optionsOrFlag === 'object' && optionsOrFlag.EX) {
            await upstashClient.setex(key, optionsOrFlag.EX, value);
          } else if (optionsOrFlag === 'EX' && ttl) {
            await upstashClient.setex(key, ttl, value);
          } else {
            await upstashClient.set(key, value);
          }
          return 'OK';
        } catch (err) {
          logger.error('Redis SET error:', err);
          throw err;
        }
      },
      del: async (key: string | string[]) => {
        try {
          if (Array.isArray(key)) {
            await Promise.all(key.map(k => upstashClient.del(k)));
          } else {
            await upstashClient.del(key);
          }
          return 1;
        } catch (err) {
          logger.error('Redis DEL error:', err);
          return 0;
        }
      },
      // For connect-redis v8+ compatibility
      expire: async (key: string, seconds: number) => {
        try {
          await upstashClient.expire(key, seconds);
          return 1;
        } catch (err) {
          logger.error('Redis EXPIRE error:', err);
          return 0;
        }
      },
      // Needed by connect-redis for touch functionality
      ttl: async (key: string) => {
        try {
          return await upstashClient.ttl(key);
        } catch (err) {
          logger.error('Redis TTL error:', err);
          return -1;
        }
      }
    };

    // Type assertion needed: our wrapper implements the required methods but
    // connect-redis expects specific Redis client types (ioredis/node-redis)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = new RedisStore({
      client: redisClientWrapper as unknown as ConstructorParameters<typeof RedisStore>[0]['client'],
      prefix: 'pattamap:session:'
    });

    logger.info('✅ Upstash Redis session store configured (HTTP/stateless)');
    return store;
  } catch (error) {
    logger.error('❌ Failed to create Redis session store:', error);
    return undefined;
  }
};

const sessionStore = createSessionStore();

// Session configuration for CSRF - Fixed session synchronization
app.use(session({
  store: sessionStore, // Use Redis store in production for serverless compatibility
  secret: process.env.SESSION_SECRET || (() => {
    if (NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable is required in production');
    }
    // Generate random secret in development (but warn about it)
    const crypto = require('crypto');
    const devSecret = crypto.randomBytes(32).toString('hex');
    logger.warn('⚠️  Using auto-generated SESSION_SECRET in development. Set SESSION_SECRET in .env for persistence.');
    return devSecret;
  })(),
  resave: false,
  saveUninitialized: false, // Don't create sessions until needed (set by csrfTokenGenerator)
  rolling: false, // Disable rolling to prevent session ID changes on each request
  cookie: {
    secure: cookiesSecure,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    // 🔧 FIX: Use 'none' for cross-subdomain AJAX requests (www.pattamap.com -> api.pattamap.com)
    // 'lax' blocks cookies on POST AJAX requests even between subdomains in some browsers
    // 'none' requires secure:true which is already set in production
    sameSite: cookiesSecure ? 'none' : 'lax', // 'none' in production, 'lax' in dev (http)
    domain: cookieDomain // Share cookie across subdomains (e.g., .pattamap.com)
  },
  name: 'pattamap.sid'
}));

// CSRF protection middleware
app.use(csrfTokenGenerator);

// Body parsing with security limits
app.use(express.json({
  limit: '10mb',
  strict: true  // Strict JSON parsing - only accept valid JSON objects/arrays
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 100
}));

// Global rate limiting - Anti-bot protection
// Authenticated users: 1000 req/15min, Anonymous: 300 req/15min
app.use('/api', (req, res, next) => {
  // Authenticated users get much higher limits (power users)
  // Type assertion needed because express.d.ts augmentation isn't always picked up by ts-node
  if ((req as any).user?.id) {
    return globalAuthenticatedRateLimit(req, res, next);
  }
  // Anonymous users get lower limits (anti-bot)
  return globalRateLimit(req, res, next);
});

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Remove server information
  res.removeHeader('X-Powered-By');

  next();
});

// Request logging middleware (development only)
if (NODE_ENV === 'development') {
  app.use((req, res, next) => {
    logger.debug('Request', {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress
    });

    // Log critical methods without exposing sensitive data
    if (['PUT', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
      logger.debug(`${req.method} request`, {
        url: req.url,
        hasBody: !!req.body,
        bodyKeys: req.body ? Object.keys(req.body) : []
      });
    }

    next();
  });
}

/**
 * @swagger
 * /api/csrf-token:
 *   get:
 *     summary: Get CSRF token
 *     description: Obtient un token CSRF pour protéger les requêtes POST/PUT/DELETE
 *     tags: [Security]
 *     responses:
 *       200:
 *         description: CSRF token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CSRFToken'
 */
// CSRF token endpoint (no protection needed for GET)
app.get('/api/csrf-token', getCSRFToken);

// Health check route (with rate limiting to prevent DDoS)
app.get('/api/health', healthCheckRateLimit, (req, res) => {
  res.json({
    message: 'PattaMap API is running!',
    timestamp: new Date().toISOString(),
    version: '2.0.0-secure',
    buildId: 'estfix-20260101-v2'
  });
});

/**
 * Establishment Grid Position Update Endpoint
 *
 * Handles moving and swapping establishments on the grid system.
 * Supports intelligent auto-swap when target position is occupied.
 *
 * @route POST /api/grid-move-workaround
 * @access Admin or Establishment Owner (secured with authentication)
 */
app.post('/api/grid-move-workaround', authenticateToken, handleGridMove);

// Routes with specific rate limiting and CSRF protection
app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/establishments', csrfProtection, establishmentRoutes);
app.use('/api/employees', csrfProtection, employeeRoutes);
app.use('/api/comments',
  csrfProtection,
  commentRoutes
); // Rate limit disabled for testing
app.use('/api/consumables', csrfProtection, consumableRoutes);
app.use('/api/upload', uploadRoutes); // CSRF handled internally by upload routes - rate limit disabled for testing
app.use('/api/favorites', csrfProtection, favoriteRoutes);
app.use('/api/edit-proposals', csrfProtection, editProposalRoutes);
app.use('/api/freelances', freelanceRoutes); // No CSRF protection for GET-only routes
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/verifications', authenticateToken, verificationsRoutes);
app.use('/api/vip', vipRoutes); // VIP subscriptions (rate limiters + CSRF handled in routes)
app.use('/api/gamification', gamificationRoutes); // Gamification system (auth + CSRF handled in routes)
app.use('/api/employees', employeeValidationRoutes); // Employee community validation (auth + CSRF handled in routes)
app.use('/api/moderation',
  process.env.NODE_ENV === 'production' ? adminRateLimit : (req, res, next) => next(),
  csrfProtection,
  moderationRoutes
);
app.use('/api/admin',
  process.env.NODE_ENV === 'production' ? adminRateLimit : (req, res, next) => next(),
  csrfProtection,
  adminRoutes
);
app.use('/api/ownership-requests', csrfProtection, ownershipRequestRoutes);
app.use('/api/export', exportRoutes); // Export data to CSV (auth handled in routes)
app.use('/api/public', publicRoutes); // Public stats (no auth required)
app.use('/api/users', userRoutes); // User profiles (auth handled in routes)

// Swagger API Documentation (development only)
if (NODE_ENV === 'development') {
  import('swagger-ui-express').then((swaggerUi) => {
    const { swaggerSpec } = require('./config/swagger');

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'PattaMap API Docs',
      customfavIcon: '/favicon.ico'
    }));

    // Serve OpenAPI JSON
    app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    logger.info('📚 Swagger UI available at http://localhost:8080/api-docs');
  });
}

// Sentry error handler - must be before other error handlers
app.use(sentryErrorMiddleware());

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Server error', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize Redis cache before starting server
(async () => {
  try {
    await initRedis();
  } catch (error) {
    logger.error('Failed to initialize Redis, server will start with fallback cache:', error);
  }

  // Start mission reset cron jobs
  try {
    startMissionResetJobs();
  } catch (error) {
    logger.error('Failed to start mission reset cron jobs:', error);
    logger.warn('Server will continue without automatic mission resets');
  }

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, {
      environment: NODE_ENV,
      version: '2.0.0-secure'
    });
  });
})();

// Graceful shutdown - stop cron jobs
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  stopMissionResetJobs();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  stopMissionResetJobs();
  process.exit(0);
});

// trigger restart - v6
