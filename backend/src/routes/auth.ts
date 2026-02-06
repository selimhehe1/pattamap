import { Router } from 'express';
import { register, login, getProfile, logout, forgotPassword, resetPassword, checkAvailability, logoutAll, syncSupabaseUser } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { authenticateSupabaseToken, authenticateSupabaseTokenAllowNew } from '../middleware/supabaseAuth';
import { csrfProtection } from '../middleware/csrf';
import { availabilityCheckRateLimit, authRateLimit } from '../middleware/rateLimit';
import { refreshAccessToken } from '../middleware/refreshToken';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new user
 *     description: Créer un nouveau compte utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pseudonym
 *               - email
 *               - password
 *             properties:
 *               pseudonym:
 *                 type: string
 *                 example: JohnDoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: MySecurePass123!
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// No CSRF for register - users don't have a session yet
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authentifier un utilisateur et obtenir un JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MySecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             description: HttpOnly cookie containing JWT token
 *             schema:
 *               type: string
 *               example: auth-token=eyJhbGc...; HttpOnly; Path=/
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// No CSRF for login - users don't have a session yet
router.post('/login', login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Déconnecter l'utilisateur et supprimer le cookie JWT
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 */
router.post('/logout', csrfProtection, logout);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     description: Récupérer le profil de l'utilisateur authentifié
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Request a password reset link for the specified email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Reset request processed (success response regardless of email existence for security)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: If an account exists with this email, you will receive password reset instructions.
 *       400:
 *         description: Invalid email format
 */
// No CSRF for forgot-password - public endpoint
// 🛡️ SECURITY FIX: Added rate limiting to prevent brute-force token enumeration
router.post('/forgot-password', authRateLimit, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     description: Reset the user's password using a valid reset token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token received via email
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 12
 *                 example: MyNewSecurePass123!
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password has been reset successfully
 *       400:
 *         description: Invalid token, expired token, or weak password
 */
// No CSRF for reset-password - uses token-based auth
// 🛡️ SECURITY FIX: Added rate limiting to prevent brute-force token attacks
router.post('/reset-password', authRateLimit, resetPassword);

/**
 * @swagger
 * /api/auth/check-availability:
 *   get:
 *     summary: Check pseudonym/email availability
 *     description: Real-time check if pseudonym or email is available during registration
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: pseudonym
 *         schema:
 *           type: string
 *         description: Pseudonym to check
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Email to check
 *     responses:
 *       200:
 *         description: Availability check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pseudonymAvailable:
 *                   type: boolean
 *                 emailAvailable:
 *                   type: boolean
 *                 pseudonymError:
 *                   type: string
 *                   description: INVALID_FORMAT if format is wrong
 *                 emailError:
 *                   type: string
 *                   description: INVALID_FORMAT if format is wrong
 *       400:
 *         description: Missing parameters
 *       429:
 *         description: Rate limit exceeded
 */
router.get('/check-availability', availabilityCheckRateLimit, checkAvailability);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using a valid refresh token (stored in httpOnly cookie)
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         headers:
 *           Set-Cookie:
 *             description: New auth-token and refresh-token cookies
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', refreshAccessToken);

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     description: Revoke all refresh tokens for the authenticated user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: All sessions terminated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out from all devices
 *       401:
 *         description: Not authenticated
 */
router.post('/logout-all', authenticateToken, csrfProtection, logoutAll);

/**
 * @swagger
 * /api/auth/sync-user:
 *   post:
 *     summary: Sync Supabase Auth user with database
 *     description: |
 *       Called after Supabase Auth login/signup (OAuth, email) to ensure user exists in our database.
 *       - For new OAuth users: creates a new user profile
 *       - For existing users: returns the existing profile
 *       - For legacy users: links their account to Supabase Auth
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - supabaseUserId
 *               - email
 *             properties:
 *               supabaseUserId:
 *                 type: string
 *                 format: uuid
 *                 description: Supabase Auth user ID
 *               email:
 *                 type: string
 *                 format: email
 *               pseudonym:
 *                 type: string
 *                 description: Optional pseudonym (auto-generated if not provided)
 *               account_type:
 *                 type: string
 *                 enum: [regular, employee, establishment_owner]
 *                 default: regular
 *     responses:
 *       200:
 *         description: User synced or already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       201:
 *         description: New user created
 *       401:
 *         description: Invalid or missing Supabase Auth token
 */
router.post('/sync-user', authenticateSupabaseTokenAllowNew, syncSupabaseUser);

export default router;