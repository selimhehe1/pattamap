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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Force reload with NULL NULL fix
// Load environment variables FIRST
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
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
const sentry_1 = require("./config/sentry");
(0, sentry_1.initSentry)();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_session_1 = __importDefault(require("express-session"));
const connect_redis_1 = require("connect-redis");
const redis_1 = require("@upstash/redis");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const csrf_1 = require("./middleware/csrf");
const auth_1 = require("./middleware/auth");
const logger_1 = require("./utils/logger");
const auth_2 = __importDefault(require("./routes/auth"));
const establishments_1 = __importDefault(require("./routes/establishments"));
const employees_1 = __importDefault(require("./routes/employees"));
const comments_1 = __importDefault(require("./routes/comments"));
const consumables_1 = __importDefault(require("./routes/consumables"));
const upload_1 = __importDefault(require("./routes/upload"));
const moderation_1 = __importDefault(require("./routes/moderation"));
const admin_1 = __importDefault(require("./routes/admin"));
const favorites_1 = __importDefault(require("./routes/favorites"));
const editProposals_1 = __importDefault(require("./routes/editProposals"));
const freelances_1 = __importDefault(require("./routes/freelances"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const push_1 = __importDefault(require("./routes/push"));
const verifications_1 = __importDefault(require("./routes/verifications"));
const vip_1 = __importDefault(require("./routes/vip"));
const gamification_1 = __importDefault(require("./routes/gamification"));
const employeeValidation_1 = __importDefault(require("./routes/employeeValidation"));
const ownershipRequests_1 = __importDefault(require("./routes/ownershipRequests"));
const export_1 = __importDefault(require("./routes/export"));
const public_1 = __importDefault(require("./routes/public"));
const rateLimit_1 = require("./middleware/rateLimit");
const redis_2 = require("./config/redis");
const missionResetJobs_1 = require("./jobs/missionResetJobs");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';
// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);
// Sentry request handler - captures request context
app.use((0, sentry_1.sentryRequestMiddleware)());
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
    origin: (origin, callback) => {
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
app.use((0, cors_1.default)(corsOptions));
// Security middleware - Helmet.js for HTTP headers
// 🔒 SECURITY: Conditional CSP - Strict by default, relaxed only for Swagger UI
app.use((req, res, next) => {
    // Relaxed CSP for Swagger UI (requires inline scripts/styles)
    if (req.path.startsWith('/api-docs')) {
        (0, helmet_1.default)({
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
    }
    else {
        // Strict CSP for application (NO unsafe-inline)
        (0, helmet_1.default)({
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
app.use((0, compression_1.default)({
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
        return compression_1.default.filter(req, res);
    }
}));
// Cookie parser middleware
app.use((0, cookie_parser_1.default)());
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
                logger_1.logger.info(`🍪 Cookie domain auto-derived from CORS_ORIGIN: ${derivedDomain}`);
                return derivedDomain;
            }
        }
        catch (error) {
            logger_1.logger.warn('Failed to auto-derive cookie domain from CORS_ORIGIN:', error);
        }
    }
    return undefined;
})();
// Log warning if cookies are not secure in development
if (NODE_ENV === 'development' && !cookiesSecure) {
    logger_1.logger.warn('⚠️  SECURITY WARNING: Cookies are NOT secure in development');
    logger_1.logger.warn('⚠️  Cookies can be intercepted on local networks (MITM attacks)');
    logger_1.logger.warn('💡 Enable HTTPS in development: See backend/docs/HTTPS_DEV_SETUP.md');
    logger_1.logger.warn('💡 Or set COOKIES_SECURE=true in .env (requires HTTPS setup)');
}
// 🔧 FIX: Create Redis session store for serverless compatibility (Vercel)
// Without this, each serverless function instance has its own MemoryStore
// which breaks CSRF validation across requests
const createSessionStore = () => {
    const redisUrl = process.env.REDIS_URL;
    const useRedis = process.env.USE_REDIS === 'true';
    if (!useRedis || !redisUrl) {
        if (NODE_ENV === 'production') {
            logger_1.logger.warn('⚠️  PRODUCTION WARNING: No Redis configured for session store!');
            logger_1.logger.warn('⚠️  Sessions will use MemoryStore which breaks in serverless environments');
            logger_1.logger.warn('💡 Set USE_REDIS=true and REDIS_URL in environment variables');
        }
        return undefined;
    }
    try {
        logger_1.logger.info(`🔗 Redis session store initializing...`);
        // Parse URL to extract host and password
        // URL format: rediss://default:password@host:port or redis://default:password@host:port
        const urlForParsing = redisUrl.replace('rediss://', 'https://').replace('redis://', 'http://');
        const parsedUrl = new URL(urlForParsing);
        const password = decodeURIComponent(parsedUrl.password);
        const host = parsedUrl.hostname;
        // 🔧 FIX: Use Upstash HTTP REST API instead of TCP for serverless compatibility
        // Upstash REST URL is https://host and token is the password
        const restUrl = `https://${host}`;
        logger_1.logger.info(`🔗 Using Upstash REST API: ${restUrl}`);
        // Create Upstash HTTP client (stateless - perfect for serverless)
        const upstashClient = new redis_1.Redis({
            url: restUrl,
            token: password
        });
        // Create a wrapper that makes Upstash client compatible with connect-redis
        // IMPORTANT: connect-redis expects raw strings, but Upstash auto-serializes JSON
        // We need to handle serialization ourselves
        const redisClientWrapper = {
            get: async (key) => {
                try {
                    const value = await upstashClient.get(key);
                    // If Upstash already deserialized it to an object, re-serialize it
                    if (value && typeof value === 'object') {
                        return JSON.stringify(value);
                    }
                    return value;
                }
                catch (err) {
                    logger_1.logger.error('Redis GET error:', err);
                    return null;
                }
            },
            set: async (key, value, optionsOrFlag, ttl) => {
                try {
                    // connect-redis v8+ uses { EX: ttl } format
                    // connect-redis v7 uses 'EX', ttl format
                    if (typeof optionsOrFlag === 'object' && optionsOrFlag.EX) {
                        await upstashClient.setex(key, optionsOrFlag.EX, value);
                    }
                    else if (optionsOrFlag === 'EX' && ttl) {
                        await upstashClient.setex(key, ttl, value);
                    }
                    else {
                        await upstashClient.set(key, value);
                    }
                    return 'OK';
                }
                catch (err) {
                    logger_1.logger.error('Redis SET error:', err);
                    throw err;
                }
            },
            del: async (key) => {
                try {
                    if (Array.isArray(key)) {
                        await Promise.all(key.map(k => upstashClient.del(k)));
                    }
                    else {
                        await upstashClient.del(key);
                    }
                    return 1;
                }
                catch (err) {
                    logger_1.logger.error('Redis DEL error:', err);
                    return 0;
                }
            },
            // For connect-redis v8+ compatibility
            expire: async (key, seconds) => {
                try {
                    await upstashClient.expire(key, seconds);
                    return 1;
                }
                catch (err) {
                    logger_1.logger.error('Redis EXPIRE error:', err);
                    return 0;
                }
            },
            // Needed by connect-redis for touch functionality
            ttl: async (key) => {
                try {
                    return await upstashClient.ttl(key);
                }
                catch (err) {
                    logger_1.logger.error('Redis TTL error:', err);
                    return -1;
                }
            }
        };
        const store = new connect_redis_1.RedisStore({
            client: redisClientWrapper,
            prefix: 'pattamap:session:'
        });
        logger_1.logger.info('✅ Upstash Redis session store configured (HTTP/stateless)');
        return store;
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to create Redis session store:', error);
        return undefined;
    }
};
const sessionStore = createSessionStore();
// Session configuration for CSRF - Fixed session synchronization
app.use((0, express_session_1.default)({
    store: sessionStore, // Use Redis store in production for serverless compatibility
    secret: process.env.SESSION_SECRET || (() => {
        if (NODE_ENV === 'production') {
            throw new Error('SESSION_SECRET environment variable is required in production');
        }
        // Generate random secret in development (but warn about it)
        const crypto = require('crypto');
        const devSecret = crypto.randomBytes(32).toString('hex');
        logger_1.logger.warn('⚠️  Using auto-generated SESSION_SECRET in development. Set SESSION_SECRET in .env for persistence.');
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
app.use(csrf_1.csrfTokenGenerator);
// Body parsing with security limits
app.use(express_1.default.json({
    limit: '10mb',
    strict: false // 🔧 RELAXED: Allow less strict JSON parsing
}));
app.use(express_1.default.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 100
}));
// Global rate limiting - DISABLED for testing
// TODO: Re-enable in production after testing is complete
app.use('/api', (req, res, next) => {
    // Rate limiting disabled - just pass through
    next();
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
        logger_1.logger.debug('Request', {
            method: req.method,
            url: req.url,
            ip: req.ip || req.connection.remoteAddress
        });
        // Log critical methods without exposing sensitive data
        if (['PUT', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
            logger_1.logger.debug(`${req.method} request`, {
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
app.get('/api/csrf-token', csrf_1.getCSRFToken);
// Health check route (with rate limiting to prevent DDoS)
app.get('/api/health', rateLimit_1.healthCheckRateLimit, (req, res) => {
    res.json({
        message: 'PattaMap API is running!',
        timestamp: new Date().toISOString(),
        version: '2.0.0-secure'
    });
});
/**
 * Establishment Grid Position Update Endpoint
 *
 * Handles moving and swapping establishments on the grid system.
 * Supports intelligent auto-swap when target position is occupied.
 *
 * TODO: Refactor into establishmentController for better code organization
 *
 * @route POST /api/grid-move-workaround
 * @access Admin or Establishment Owner (secured with authentication)
 */
app.post('/api/grid-move-workaround', auth_1.authenticateToken, async (req, res) => {
    try {
        const { supabase } = require('./config/supabase');
        logger_1.logger.debug('Grid move workaround', {
            hasBody: !!req.body,
            isSwap: !!req.body.swap_with_id
        });
        const { establishmentId, grid_row, grid_col, zone, swap_with_id } = req.body;
        // 🛡️ SECURITY: Check if user is admin OR owner of the establishment
        const user = req.user;
        const isAdmin = user?.role === 'admin' || user?.role === 'moderator';
        const isOwner = user?.id ? await (0, auth_1.isEstablishmentOwner)(user.id, establishmentId) : false;
        if (!isAdmin && !isOwner) {
            logger_1.logger.warn('Unauthorized grid move attempt', {
                userId: user?.id,
                establishmentId,
                isAdmin,
                isOwner
            });
            return res.status(403).json({
                error: 'Unauthorized',
                details: 'Only admins or establishment owners can move establishments'
            });
        }
        // Enhanced UUID validation
        const isValidUUID = (uuid) => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            return typeof uuid === 'string' && uuidRegex.test(uuid);
        };
        if (!isValidUUID(establishmentId)) {
            logger_1.logger.warn('Invalid UUID format', { field: 'establishmentId' });
            return res.status(400).json({
                error: 'Invalid establishmentId format',
                details: 'establishmentId must be a valid UUID'
            });
        }
        if (swap_with_id && !isValidUUID(swap_with_id)) {
            logger_1.logger.warn('Invalid UUID format', { field: 'swap_with_id' });
            return res.status(400).json({
                error: 'Invalid swap_with_id format',
                details: 'swap_with_id must be a valid UUID'
            });
        }
        if (!establishmentId || !grid_row || !grid_col || !zone) {
            return res.status(400).json({
                error: 'Missing required fields: establishmentId, grid_row, grid_col, zone'
            });
        }
        // Validate grid column range per zone
        const zoneColumnLimits = {
            soi6: 20,
            walkingstreet: 24, // Main WS uses 24 columns
            lkmetro: 10,
            treetown: 10,
            soibuakhao: 18,
            jomtiencomplex: 15,
            boyztown: 12,
            soi78: 16,
            beachroad: 40
        };
        const maxCol = zoneColumnLimits[zone] || 24; // Default to 24 (highest)
        if (grid_col < 1 || grid_col > maxCol) {
            logger_1.logger.warn('Invalid grid position for zone', { zone, col: grid_col, validRange: `1-${maxCol}` });
            return res.status(400).json({
                error: 'Column position out of bounds',
                details: `${zone} columns must be between 1 and ${maxCol}.`,
                validRange: { min: 1, max: maxCol }
            });
        }
        // Validate grid row range per zone
        if (zone === 'soi6' && (grid_row < 1 || grid_row > 2)) {
            logger_1.logger.warn('Invalid grid position for zone', { zone, row: grid_row, validRange: '1-2' });
            return res.status(400).json({
                error: 'Row position out of bounds for Soi 6',
                details: 'Soi 6 rows must be between 1 and 2.',
                validRange: { min: 1, max: 2 }
            });
        }
        if (zone === 'walkingstreet' && (grid_row < 1 || grid_row > 42)) {
            logger_1.logger.warn('Invalid grid position for zone', { zone, row: grid_row, validRange: '1-42' });
            return res.status(400).json({
                error: 'Row position out of bounds for Walking Street',
                details: 'Walking Street rows must be between 1 and 42 (1-12: horizontal, 13-42: vertical Sois with 3 positions per side).',
                validRange: { min: 1, max: 42 }
            });
        }
        if (zone === 'lkmetro') {
            // LK Metro: L-shaped layout with masked positions at junction
            // Row 1: cols 1-9 = 9 positions
            // Row 2: cols 1-8 = 8 positions (mask col 9)
            // Row 3: cols 3-9 = 7 positions (mask cols 1-2)
            // Row 4: cols 1-9 = 9 positions
            // Total: 33 positions (9+8+7+9)
            if (grid_row < 1 || grid_row > 4) {
                logger_1.logger.warn('Invalid grid position for zone', { zone, row: grid_row, validRange: '1-4' });
                return res.status(400).json({
                    error: 'Row position out of bounds for LK Metro',
                    details: 'LK Metro rows must be between 1 and 4.',
                    validRange: { min: 1, max: 4 }
                });
            }
            // Row-specific column validation with masked positions
            let minCol = 1;
            let maxCol;
            if (grid_row === 2) {
                // Row 2: mask col 9 (prevents overlap with vertical segment start)
                maxCol = 8;
            }
            else if (grid_row === 3) {
                // Row 3: mask cols 1-2 (prevents overlap at L-junction)
                minCol = 3;
                maxCol = 9;
            }
            else {
                // Rows 1 and 4: full range 1-9
                maxCol = 9;
            }
            if (grid_col < minCol || grid_col > maxCol) {
                logger_1.logger.warn('Invalid grid position for zone', { zone, row: grid_row, col: grid_col, validRange: `${minCol}-${maxCol}` });
                return res.status(400).json({
                    error: 'Column position out of bounds for LK Metro',
                    details: `LK Metro row ${grid_row} columns must be between ${minCol} and ${maxCol} (rows 1-2: cols 1-10, row 3: cols 3-5, row 4: cols 1-5).`,
                    validRange: { min: minCol, max: maxCol }
                });
            }
        }
        // Check if this is a SWAP operation
        if (swap_with_id) {
            logger_1.logger.debug('Atomic SWAP detected');
            // Get current position of the source establishment
            const { data: sourceData, error: sourceError } = await supabase
                .from('establishments')
                .select('grid_row, grid_col, zone')
                .eq('id', establishmentId)
                .single();
            if (sourceError) {
                logger_1.logger.error('Failed to fetch source establishment', sourceError);
                return res.status(500).json({ error: 'Failed to fetch source establishment' });
            }
            logger_1.logger.debug('Source position loaded');
            // USE ATOMIC RPC FUNCTION (recommended)
            // Call the stored procedure for atomic swap with transaction
            try {
                logger_1.logger.debug('Calling atomic swap RPC function');
                const { data: swapResult, error: swapError } = await supabase
                    .rpc('swap_establishments_atomic', {
                    p_source_id: establishmentId,
                    p_target_id: swap_with_id,
                    p_source_new_row: grid_row,
                    p_source_new_col: grid_col,
                    p_target_new_row: sourceData.grid_row,
                    p_target_new_col: sourceData.grid_col,
                    p_zone: zone
                });
                if (swapError) {
                    logger_1.logger.warn('Atomic SWAP RPC failed, falling back to sequential', {
                        error: swapError.message
                    });
                    const now = new Date().toISOString();
                    // STEP 1: Move source to temporary position (NULL, NULL, zone)
                    // Using NULL for grid_row and grid_col (allowed by DB constraint: "grid_row IS NULL OR ...")
                    // Keep zone='soi6' so element stays in zone but disappears from map during swap
                    logger_1.logger.debug('🔄 STEP 1: Moving source to temporary position (NULL, NULL, \'' + zone + '\')');
                    const { data: step1Data, error: step1Error } = await supabase
                        .from('establishments')
                        .update({
                        grid_row: null,
                        grid_col: null,
                        zone: zone, // Keep zone to avoid disappearing from map filter
                        updated_at: now
                    })
                        .eq('id', establishmentId)
                        .select();
                    if (step1Error) {
                        logger_1.logger.error('❌ STEP 1 FAILED:', step1Error);
                        return res.status(500).json({ error: 'Failed to move source to temporary position' });
                    }
                    logger_1.logger.debug('✅ STEP 1 SUCCESS:', step1Data[0]);
                    // STEP 2: Move target to source's original position
                    logger_1.logger.debug('🔄 STEP 2: Moving target to source original position:', sourceData);
                    const { data: step2Data, error: step2Error } = await supabase
                        .from('establishments')
                        .update({
                        grid_row: sourceData.grid_row,
                        grid_col: sourceData.grid_col,
                        zone: sourceData.zone,
                        updated_at: now
                    })
                        .eq('id', swap_with_id)
                        .select();
                    if (step2Error) {
                        logger_1.logger.error('❌ STEP 2 FAILED:', step2Error);
                        return res.status(500).json({ error: 'Failed to move target to source position' });
                    }
                    logger_1.logger.debug('✅ STEP 2 SUCCESS:', step2Data[0]);
                    // STEP 3: Move source to target's final position
                    logger_1.logger.debug('🔄 STEP 3: Moving source to target position:', { grid_row, grid_col, zone });
                    const { data: step3Data, error: step3Error } = await supabase
                        .from('establishments')
                        .update({
                        grid_row,
                        grid_col,
                        zone,
                        updated_at: now
                    })
                        .eq('id', establishmentId)
                        .select();
                    if (step3Error) {
                        logger_1.logger.error('❌ STEP 3 FAILED:', step3Error);
                        return res.status(500).json({ error: 'Failed to move source to final position' });
                    }
                    logger_1.logger.debug('✅ STEP 3 SUCCESS:', step3Data[0]);
                    logger_1.logger.debug('✅ SEQUENTIAL SWAP completed successfully:', {
                        establishment1: step3Data[0],
                        establishment2: step2Data[0]
                    });
                    // 🔧 FIX M3: Invalidate cache after grid move
                    await (0, redis_2.cacheInvalidatePattern)('establishments:*');
                    await (0, redis_2.cacheDel)('dashboard:stats');
                    return res.json({
                        success: true,
                        message: 'Sequential swap operation completed successfully (fallback)',
                        establishments: {
                            source: step3Data[0],
                            target: step2Data[0]
                        }
                    });
                }
                // RPC SUCCESS - Return result from stored procedure
                logger_1.logger.debug('✅ ATOMIC SWAP RPC completed successfully:', swapResult);
                const sourceEstablishment = swapResult[0]?.source_establishment;
                const targetEstablishment = swapResult[0]?.target_establishment;
                // 🔧 FIX M3: Invalidate cache after grid move
                await (0, redis_2.cacheInvalidatePattern)('establishments:*');
                await (0, redis_2.cacheDel)('dashboard:stats');
                res.json({
                    success: true,
                    message: 'Atomic swap operation completed successfully',
                    establishments: {
                        source: sourceEstablishment,
                        target: targetEstablishment
                    }
                });
            }
            catch (rpcException) {
                logger_1.logger.error('❌ ATOMIC SWAP RPC EXCEPTION:', rpcException);
                return res.status(500).json({
                    error: 'Failed to perform atomic swap',
                    details: rpcException instanceof Error ? rpcException.message : 'Unknown error'
                });
            }
        }
        else {
            // INTELLIGENT MOVE with auto-swap detection
            logger_1.logger.debug('🔍 Checking if target position is occupied:', { zone, grid_row, grid_col });
            // Check if another establishment exists at target position
            const { data: existingAtTarget, error: checkError } = await supabase
                .from('establishments')
                .select('id, name')
                .eq('zone', zone)
                .eq('grid_row', grid_row)
                .eq('grid_col', grid_col)
                .neq('id', establishmentId) // Exclude the moving establishment itself
                .maybeSingle(); // Use maybeSingle instead of single to avoid error when not found
            if (checkError) {
                logger_1.logger.error('Error checking target position:', checkError);
                return res.status(500).json({ error: 'Failed to check target position' });
            }
            if (existingAtTarget) {
                // TARGET OCCUPIED - Auto-convert MOVE to SWAP
                logger_1.logger.debug('⚠️ TARGET OCCUPIED - Auto-converting MOVE to SWAP:', {
                    movingEstablishment: establishmentId,
                    targetEstablishment: existingAtTarget.id,
                    targetEstablishmentName: existingAtTarget.name
                });
                // Get current position of the source establishment
                const { data: sourceData, error: sourceError } = await supabase
                    .from('establishments')
                    .select('grid_row, grid_col, zone')
                    .eq('id', establishmentId)
                    .single();
                if (sourceError) {
                    logger_1.logger.error('Error fetching source establishment:', sourceError);
                    return res.status(500).json({ error: 'Failed to fetch source establishment' });
                }
                logger_1.logger.debug('📍 Source original position:', sourceData);
                // ========================================
                // BUG #7 FIX - Atomic Swap with Rollback
                // ========================================
                // Try atomic RPC function first, fallback to sequential swap with rollback protection
                // ATTEMPT 1: Atomic RPC Function (Best - Transaction-safe)
                logger_1.logger.debug('🔄 Attempting atomic RPC swap...');
                const { data: rpcData, error: rpcError } = await supabase
                    .rpc('swap_establishment_positions', {
                    p_source_id: establishmentId,
                    p_target_id: existingAtTarget.id,
                    p_new_zone: zone
                });
                if (!rpcError && rpcData && rpcData.length > 0 && rpcData[0].success) {
                    logger_1.logger.debug('✅ ATOMIC RPC SWAP SUCCESS:', rpcData[0]);
                    // 🔧 FIX M3: Invalidate cache after grid move
                    await (0, redis_2.cacheInvalidatePattern)('establishments:*');
                    await (0, redis_2.cacheDel)('dashboard:stats');
                    return res.json({
                        success: true,
                        message: 'Auto-swap operation completed successfully (atomic)',
                        establishments: {
                            source: rpcData[0].source_establishment,
                            target: rpcData[0].target_establishment
                        }
                    });
                }
                // ATTEMPT 2: Sequential Swap with Rollback Protection (Fallback)
                logger_1.logger.warn('⚠️ RPC swap failed, falling back to sequential swap with rollback protection:', rpcError);
                logger_1.logger.debug('🔄 Starting sequential swap with rollback protection...');
                const now = new Date().toISOString();
                let step1Success = false;
                let step2Success = false;
                try {
                    // STEP 1: Move source to temporary position (NULL, NULL, zone)
                    logger_1.logger.debug('🔄 STEP 1: Moving source to temporary position (NULL, NULL, \'' + zone + '\')');
                    const { data: step1Data, error: step1Error } = await supabase
                        .from('establishments')
                        .update({
                        grid_row: null,
                        grid_col: null,
                        zone: zone,
                        updated_at: now
                    })
                        .eq('id', establishmentId)
                        .select();
                    if (step1Error) {
                        logger_1.logger.error('❌ STEP 1 FAILED:', step1Error);
                        throw new Error('Failed to move source to temporary position');
                    }
                    logger_1.logger.debug('✅ STEP 1 SUCCESS:', step1Data[0]);
                    step1Success = true;
                    // STEP 2: Move target to source's original position
                    logger_1.logger.debug('🔄 STEP 2: Moving target to source original position:', sourceData);
                    const { data: step2Data, error: step2Error } = await supabase
                        .from('establishments')
                        .update({
                        grid_row: sourceData.grid_row,
                        grid_col: sourceData.grid_col,
                        zone: sourceData.zone,
                        updated_at: now
                    })
                        .eq('id', existingAtTarget.id)
                        .select();
                    if (step2Error) {
                        logger_1.logger.error('❌ STEP 2 FAILED:', step2Error);
                        throw new Error('Failed to move target to source position');
                    }
                    logger_1.logger.debug('✅ STEP 2 SUCCESS:', step2Data[0]);
                    step2Success = true;
                    // STEP 3: Move source to target's final position
                    logger_1.logger.debug('🔄 STEP 3: Moving source to target position:', { grid_row, grid_col, zone });
                    const { data: step3Data, error: step3Error } = await supabase
                        .from('establishments')
                        .update({
                        grid_row,
                        grid_col,
                        zone,
                        updated_at: now
                    })
                        .eq('id', establishmentId)
                        .select();
                    if (step3Error) {
                        logger_1.logger.error('❌ STEP 3 FAILED:', step3Error);
                        throw new Error('Failed to move source to final position');
                    }
                    logger_1.logger.debug('✅ STEP 3 SUCCESS:', step3Data[0]);
                    logger_1.logger.debug('✅ AUTO-SWAP completed successfully (sequential):', {
                        establishment1: step3Data[0],
                        establishment2: step2Data[0]
                    });
                    // 🔧 FIX M3: Invalidate cache after grid move
                    await (0, redis_2.cacheInvalidatePattern)('establishments:*');
                    await (0, redis_2.cacheDel)('dashboard:stats');
                    return res.json({
                        success: true,
                        message: 'Auto-swap operation completed successfully (sequential)',
                        establishments: {
                            source: step3Data[0],
                            target: step2Data[0]
                        }
                    });
                }
                catch (swapError) {
                    // ROLLBACK: Restore source to original position if any step failed
                    logger_1.logger.error('🔄 SWAP FAILED - Initiating rollback...', swapError);
                    if (step1Success) {
                        logger_1.logger.debug('🔄 Rolling back STEP 1: Restoring source to original position:', sourceData);
                        const { error: rollbackError } = await supabase
                            .from('establishments')
                            .update({
                            grid_row: sourceData.grid_row,
                            grid_col: sourceData.grid_col,
                            zone: sourceData.zone,
                            updated_at: now
                        })
                            .eq('id', establishmentId);
                        if (rollbackError) {
                            logger_1.logger.error('❌ ROLLBACK FAILED - DATA CORRUPTION RISK:', rollbackError);
                            return res.status(500).json({
                                error: 'Swap failed and rollback failed - please contact support',
                                details: 'Source establishment may be at (NULL, NULL)'
                            });
                        }
                        logger_1.logger.debug('✅ ROLLBACK SUCCESS - Source restored to original position');
                    }
                    return res.status(500).json({
                        error: 'Failed to swap establishments',
                        details: swapError instanceof Error ? swapError.message : 'Unknown error'
                    });
                }
            }
            else {
                // TARGET EMPTY - Continue with simple MOVE
                logger_1.logger.debug('✅ TARGET EMPTY - Proceeding with simple MOVE');
                const { data, error } = await supabase
                    .from('establishments')
                    .update({
                    grid_row,
                    grid_col,
                    zone,
                    updated_at: new Date().toISOString()
                })
                    .eq('id', establishmentId)
                    .select();
                if (error) {
                    logger_1.logger.error('Database update error:', error);
                    return res.status(500).json({ error: 'Failed to update position' });
                }
                logger_1.logger.debug('✅ Position updated successfully:', data);
                // 🔧 FIX M3: Invalidate cache after grid move
                await (0, redis_2.cacheInvalidatePattern)('establishments:*');
                await (0, redis_2.cacheDel)('dashboard:stats');
                res.json({
                    success: true,
                    message: 'Position updated successfully',
                    establishment: data[0]
                });
            }
        }
    }
    catch (error) {
        logger_1.logger.error('🔧 DIRECT WORKAROUND ERROR:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Routes with specific rate limiting and CSRF protection
app.use('/api/auth', rateLimit_1.authRateLimit, auth_2.default);
app.use('/api/establishments', csrf_1.csrfProtection, establishments_1.default);
app.use('/api/employees', csrf_1.csrfProtection, employees_1.default);
app.use('/api/comments', csrf_1.csrfProtection, comments_1.default); // Rate limit disabled for testing
app.use('/api/consumables', csrf_1.csrfProtection, consumables_1.default);
app.use('/api/upload', upload_1.default); // CSRF handled internally by upload routes - rate limit disabled for testing
app.use('/api/favorites', csrf_1.csrfProtection, favorites_1.default);
app.use('/api/edit-proposals', csrf_1.csrfProtection, editProposals_1.default);
app.use('/api/freelances', freelances_1.default); // No CSRF protection for GET-only routes
app.use('/api/notifications', auth_1.authenticateToken, notifications_1.default);
app.use('/api/push', push_1.default);
app.use('/api/verifications', auth_1.authenticateToken, verifications_1.default);
app.use('/api/vip', vip_1.default); // VIP subscriptions (rate limiters + CSRF handled in routes)
app.use('/api/gamification', gamification_1.default); // Gamification system (auth + CSRF handled in routes)
app.use('/api/employees', employeeValidation_1.default); // Employee community validation (auth + CSRF handled in routes)
app.use('/api/moderation', process.env.NODE_ENV === 'production' ? rateLimit_1.adminRateLimit : (req, res, next) => next(), csrf_1.csrfProtection, moderation_1.default);
app.use('/api/admin', process.env.NODE_ENV === 'production' ? rateLimit_1.adminRateLimit : (req, res, next) => next(), csrf_1.csrfProtection, admin_1.default);
app.use('/api/ownership-requests', csrf_1.csrfProtection, ownershipRequests_1.default);
app.use('/api/export', export_1.default); // Export data to CSV (auth handled in routes)
app.use('/api/public', public_1.default); // Public stats (no auth required)
// Swagger API Documentation (development only)
if (NODE_ENV === 'development') {
    Promise.resolve().then(() => __importStar(require('swagger-ui-express'))).then((swaggerUi) => {
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
        logger_1.logger.info('📚 Swagger UI available at http://localhost:8080/api-docs');
    });
}
// Sentry error handler - must be before other error handlers
app.use((0, sentry_1.sentryErrorMiddleware)());
// Error handling middleware
app.use((err, req, res, next) => {
    logger_1.logger.error('Server error', err);
    res.status(500).json({ error: 'Something went wrong!' });
});
// Initialize Redis cache before starting server
(async () => {
    try {
        await (0, redis_2.initRedis)();
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize Redis, server will start with fallback cache:', error);
    }
    // Start mission reset cron jobs
    try {
        (0, missionResetJobs_1.startMissionResetJobs)();
    }
    catch (error) {
        logger_1.logger.error('Failed to start mission reset cron jobs:', error);
        logger_1.logger.warn('Server will continue without automatic mission resets');
    }
    app.listen(PORT, () => {
        logger_1.logger.info(`Server running on port ${PORT}`, {
            environment: NODE_ENV,
            version: '2.0.0-secure'
        });
    });
})();
// Graceful shutdown - stop cron jobs
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully...');
    (0, missionResetJobs_1.stopMissionResetJobs)();
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully...');
    (0, missionResetJobs_1.stopMissionResetJobs)();
    process.exit(0);
});
// trigger restart - v6
//# sourceMappingURL=server.js.map