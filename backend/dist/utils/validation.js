"use strict";
// Security validation utilities
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareFilterParams = exports.sanitizeErrorForClient = exports.escapeSQLString = exports.validateImageUrls = exports.isValidImageUrl = exports.validateUrlArray = exports.isValidExternalUrl = exports.sanitizeInternalLink = exports.validateURL = exports.validateEmail = exports.validateUUID = exports.validateNumericInput = exports.validateTextInput = exports.validateAgainstSQLInjection = exports.escapeLikeWildcards = exports.sanitizeInput = void 0;
// Input sanitization for SQL injection prevention
const sanitizeInput = (input) => {
    if (typeof input !== 'string') {
        throw new Error('Input must be a string');
    }
    // Remove null bytes and trim
    return input.replace(/\0/g, '').trim();
};
exports.sanitizeInput = sanitizeInput;
// 🔧 FIX S1: Escape LIKE/ILIKE wildcards to prevent pattern injection
// Escapes % and _ characters which are wildcards in PostgreSQL LIKE queries
// Without this, searching for "%" would match ALL records
const escapeLikeWildcards = (input) => {
    if (!input || typeof input !== 'string') {
        return '';
    }
    // Escape backslash first, then % and _
    return input.replace(/\\/g, '\\\\').replace(/[%_]/g, '\\$&');
};
exports.escapeLikeWildcards = escapeLikeWildcards;
// SQL injection detection patterns
const SQL_INJECTION_PATTERNS = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(--|\/\*|\*\/|;|'|"|`)/g,
    /(script|javascript|vbscript|onload|onerror)/gi,
    /(<|>|&lt;|&gt;)/g
];
// Validate input against SQL injection
const validateAgainstSQLInjection = (input) => {
    if (!input || typeof input !== 'string') {
        return true; // Empty input is safe
    }
    return !SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
};
exports.validateAgainstSQLInjection = validateAgainstSQLInjection;
// Validate and sanitize text input
const validateTextInput = (input, minLength = 0, maxLength = 1000, allowEmpty = false) => {
    if (!input && !allowEmpty) {
        return { valid: false, error: 'Input is required' };
    }
    if (!input && allowEmpty) {
        return { valid: true, sanitized: '' };
    }
    if (typeof input !== 'string') {
        return { valid: false, error: 'Input must be a string' };
    }
    const sanitized = (0, exports.sanitizeInput)(input);
    if (sanitized.length < minLength) {
        return { valid: false, error: `Input must be at least ${minLength} characters` };
    }
    if (sanitized.length > maxLength) {
        return { valid: false, error: `Input must be at most ${maxLength} characters` };
    }
    if (!(0, exports.validateAgainstSQLInjection)(sanitized)) {
        return { valid: false, error: 'Input contains invalid characters' };
    }
    return { valid: true, sanitized };
};
exports.validateTextInput = validateTextInput;
// Validate numeric input
const validateNumericInput = (input, min, max) => {
    const num = Number(input);
    if (isNaN(num) || !isFinite(num)) {
        return { valid: false, error: 'Input must be a valid number' };
    }
    if (min !== undefined && num < min) {
        return { valid: false, error: `Number must be at least ${min}` };
    }
    if (max !== undefined && num > max) {
        return { valid: false, error: `Number must be at most ${max}` };
    }
    return { valid: true, value: num };
};
exports.validateNumericInput = validateNumericInput;
// Validate UUID format
const validateUUID = (input) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(input);
};
exports.validateUUID = validateUUID;
// Validate email format (same as authController but centralized)
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
};
exports.validateEmail = validateEmail;
// Validate URL format
const validateURL = (url) => {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
};
exports.validateURL = validateURL;
// 🔧 FIX N2: Validate internal link paths for notifications
// Prevents open redirects, XSS, and path traversal attacks
const sanitizeInternalLink = (link) => {
    if (!link || typeof link !== 'string') {
        return null;
    }
    // Must start with /
    if (!link.startsWith('/')) {
        return null;
    }
    // Prevent javascript:, data:, and other protocol handlers
    if (/^\/+[a-z]+:/i.test(link)) {
        return null;
    }
    // Prevent path traversal with ..
    if (link.includes('..')) {
        return null;
    }
    // Prevent null bytes and control characters
    // eslint-disable-next-line no-control-regex -- Intentional: detecting control chars for security
    if (/[\u0000-\u001f\u007f]/.test(link)) {
        return null;
    }
    // Only allow safe URL characters
    // Allows: letters, numbers, /, -, _, ., ~, ?, =, &, #, @, %, +
    if (!/^[a-zA-Z0-9\/_\-.~?=&#@%+]+$/.test(link)) {
        return null;
    }
    // Limit length to prevent abuse
    if (link.length > 500) {
        return link.substring(0, 500);
    }
    return link;
};
exports.sanitizeInternalLink = sanitizeInternalLink;
// ========================================
// 🔧 FIX C2 - Validate external URLs (for verification proofs, etc.)
// ========================================
// Validates that a URL is a secure external URL (HTTPS preferred)
// Prevents XSS attacks (javascript:, data:, etc.) and SSRF
const isValidExternalUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return false;
    }
    try {
        const parsed = new URL(url);
        // 1. Protocol must be HTTPS (secure) - allow HTTP only in development
        const NODE_ENV = process.env.NODE_ENV || 'development';
        const allowedProtocols = NODE_ENV === 'production'
            ? ['https:']
            : ['http:', 'https:'];
        if (!allowedProtocols.includes(parsed.protocol)) {
            return false;
        }
        // 2. Must have valid domain
        if (!parsed.hostname || parsed.hostname.length === 0) {
            return false;
        }
        // 3. Prevent SSRF - Block private/internal IP ranges
        const hostname = parsed.hostname.toLowerCase();
        const privateIpPatterns = [
            /^localhost$/i,
            /^127\./,
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /^192\.168\./,
            /^169\.254\./,
            /^0\./,
            /^::1$/,
            /^fc00:/i,
            /^fe80:/i,
            /\.local$/i,
            /\.internal$/i,
            /\.localhost$/i,
        ];
        if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
            return false;
        }
        // 4. Prevent XSS vectors
        const xssPatterns = [
            /javascript:/i,
            /data:/i,
            /vbscript:/i,
            /<script/i,
            /onerror/i,
            /onload/i
        ];
        if (xssPatterns.some(pattern => pattern.test(url))) {
            return false;
        }
        // 5. Limit URL length to prevent abuse
        if (url.length > 2048) {
            return false;
        }
        return true;
    }
    catch {
        return false;
    }
};
exports.isValidExternalUrl = isValidExternalUrl;
// Helper to validate and filter an array of URLs
const validateUrlArray = (urls) => {
    if (!urls || !Array.isArray(urls)) {
        return [];
    }
    return urls.filter(url => (0, exports.isValidExternalUrl)(url));
};
exports.validateUrlArray = validateUrlArray;
// ========================================
// BUG #12 FIX - Validate image URLs
// ========================================
// Validates that a URL is a secure image URL (HTTPS + valid extension)
// Prevents XSS attacks (javascript:, data:, etc.) and malformed URLs
// SECURITY FIX: Also prevents SSRF by blocking private/internal IPs
const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return false;
    }
    try {
        const parsed = new URL(url);
        // 1. Protocol must be HTTPS (secure) or HTTP (for local dev)
        // Production should enforce HTTPS only
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
        }
        // 2. Must have valid domain (prevent javascript:, data:, file: schemes)
        if (!parsed.hostname || parsed.hostname.length === 0) {
            return false;
        }
        // 3. SECURITY FIX: Prevent SSRF - Block private/internal IP ranges
        const hostname = parsed.hostname.toLowerCase();
        const privateIpPatterns = [
            /^localhost$/i,
            /^127\./, // Loopback
            /^10\./, // Class A private
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B private
            /^192\.168\./, // Class C private
            /^169\.254\./, // Link-local
            /^0\./, // Current network
            /^::1$/, // IPv6 loopback
            /^fc00:/i, // IPv6 private
            /^fe80:/i, // IPv6 link-local
            /\.local$/i, // mDNS local domains
            /\.internal$/i, // Internal domains
            /\.localhost$/i, // Localhost subdomains
        ];
        if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
            return false;
        }
        // 4. Pathname must end with valid image extension
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const hasValidExtension = validExtensions.some(ext => parsed.pathname.toLowerCase().endsWith(ext));
        if (!hasValidExtension) {
            return false;
        }
        // 5. Prevent XSS vectors (script tags, event handlers in URL)
        const xssPatterns = [
            /javascript:/i,
            /data:/i,
            /vbscript:/i,
            /<script/i,
            /onerror/i,
            /onload/i
        ];
        if (xssPatterns.some(pattern => pattern.test(url))) {
            return false;
        }
        return true;
    }
    catch {
        // Invalid URL format
        return false;
    }
};
exports.isValidImageUrl = isValidImageUrl;
// Validate array of image URLs
const validateImageUrls = (urls, minCount = 0, // Photos are optional by default
maxCount = 5) => {
    if (!Array.isArray(urls)) {
        return { valid: false, error: 'URLs must be an array' };
    }
    if (urls.length < minCount) {
        return { valid: false, error: `At least ${minCount} photo(s) required` };
    }
    if (urls.length > maxCount) {
        return { valid: false, error: `Maximum ${maxCount} photos allowed` };
    }
    const invalidUrls = urls.filter(url => !(0, exports.isValidImageUrl)(url));
    if (invalidUrls.length > 0) {
        return {
            valid: false,
            error: `Invalid image URL(s): ${invalidUrls.join(', ')}`
        };
    }
    return { valid: true };
};
exports.validateImageUrls = validateImageUrls;
// Sanitize for PostgreSQL queries (escape single quotes)
const escapeSQLString = (input) => {
    return input.replace(/'/g, "''");
};
exports.escapeSQLString = escapeSQLString;
// ========================================
// SECURITY FIX - Sanitize error messages for API responses
// ========================================
// Prevents database structure/internal details from being exposed to clients
// Maps known error codes to user-friendly messages
const ERROR_CODE_MESSAGES = {
    '23505': 'Cette entrée existe déjà',
    '23503': 'Référence invalide',
    '23502': 'Champ requis manquant',
    '22P02': 'Format de données invalide',
    '42501': 'Permission refusée',
    '42P01': 'Ressource non trouvée',
    'PGRST116': 'Ressource non trouvée',
};
const sanitizeErrorForClient = (error, context) => {
    // In development, return more details for debugging
    if (process.env.NODE_ENV === 'development') {
        return error?.message || 'Une erreur est survenue';
    }
    // Check for known Postgres/Supabase error codes
    if (error?.code && ERROR_CODE_MESSAGES[error.code]) {
        return ERROR_CODE_MESSAGES[error.code];
    }
    // Generic user-friendly messages based on context
    const contextMessages = {
        'fetch': 'Erreur lors de la récupération des données',
        'create': 'Erreur lors de la création',
        'update': 'Erreur lors de la mise à jour',
        'delete': 'Erreur lors de la suppression',
        'auth': 'Erreur d\'authentification',
        'upload': 'Erreur lors du téléchargement',
    };
    return contextMessages[context || ''] || 'Une erreur est survenue';
};
exports.sanitizeErrorForClient = sanitizeErrorForClient;
// Validate and prepare filter parameters for safe SQL usage
const prepareFilterParams = (params) => {
    const sanitized = {};
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
            continue;
        }
        // Validate key name to prevent injection
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
            throw new Error(`Invalid parameter name: ${key}`);
        }
        if (typeof value === 'string') {
            const validation = (0, exports.validateTextInput)(value, 0, 1000, true);
            if (!validation.valid) {
                throw new Error(`Invalid value for ${key}: ${validation.error}`);
            }
            sanitized[key] = validation.sanitized;
        }
        else if (typeof value === 'number') {
            const validation = (0, exports.validateNumericInput)(value);
            if (!validation.valid) {
                throw new Error(`Invalid numeric value for ${key}: ${validation.error}`);
            }
            sanitized[key] = validation.value;
        }
        else if (typeof value === 'boolean') {
            sanitized[key] = value;
        }
        else {
            throw new Error(`Unsupported parameter type for ${key}`);
        }
    }
    return sanitized;
};
exports.prepareFilterParams = prepareFilterParams;
//# sourceMappingURL=validation.js.map