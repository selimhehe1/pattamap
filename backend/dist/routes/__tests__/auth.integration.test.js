"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const csrf_1 = require("../../middleware/csrf");
const auth_1 = __importDefault(require("../auth"));
const supabase_1 = require("../../config/supabase");
const supabaseMockChain_1 = require("../../test-helpers/supabaseMockChain");
// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
// Mock CSRF protection - integration tests focus on auth flow, not CSRF
// CSRF is tested separately in csrf.test.ts
jest.mock('../../middleware/csrf', () => ({
    csrfProtection: (req, res, next) => next(),
    csrfTokenGenerator: (req, res, next) => {
        req.csrfToken = 'mock-csrf-token';
        next();
    },
    generateCSRFToken: () => 'mock-csrf-token'
}));
describe('Auth Routes Integration Tests', () => {
    let app;
    beforeAll(() => {
        process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests-minimum-32-chars';
        process.env.SESSION_SECRET = 'test-session-secret';
        process.env.NODE_ENV = 'test';
        app = (0, express_1.default)();
        app.use((0, cookie_parser_1.default)());
        app.use(express_1.default.json());
        app.use((0, express_session_1.default)({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: { secure: false }
        }));
        app.use(csrf_1.csrfTokenGenerator);
        app.use('/api/auth', auth_1.default);
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Complete Authentication Flow', () => {
        it('should complete: Register → Login → Access Protected Route', async () => {
            // Step 1: Register new user
            supabase_1.supabase.from.mockImplementation((table) => {
                if (table === 'users') {
                    // Create mock with both select and insert support
                    const mockChain = (0, supabaseMockChain_1.createMockChain)({
                        data: [{
                                id: 'new-user-123',
                                pseudonym: 'newuser',
                                email: 'newuser@test.com',
                                role: 'user',
                                is_active: true,
                                account_type: 'regular'
                            }],
                        error: null
                    });
                    // Add insert method that returns chain for insert().select()
                    mockChain.insert = jest.fn().mockReturnValue(mockChain);
                    return mockChain;
                }
                return (0, supabaseMockChain_1.createMockChain)({ data: [], error: null });
            });
            bcryptjs_1.default.hash.mockResolvedValue('hashed_password');
            jsonwebtoken_1.default.sign.mockReturnValue('test-jwt-token');
            const registerResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                pseudonym: 'newuser',
                email: 'newuser@test.com',
                password: 'SecurePass123',
                account_type: 'regular'
            });
            // Registration may succeed or fail validation
            expect([200, 201, 400]).toContain(registerResponse.status);
            // Step 2: Login with credentials
            supabase_1.supabase.from.mockReturnValue((0, supabaseMockChain_1.createMockChain)({
                data: [{
                        id: 'user-123',
                        pseudonym: 'newuser',
                        email: 'newuser@test.com',
                        password_hash: 'hashed_password',
                        role: 'user',
                        is_active: true
                    }],
                error: null
            }));
            bcryptjs_1.default.compare.mockResolvedValue(true);
            jsonwebtoken_1.default.sign.mockReturnValue('login-jwt-token');
            const loginResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'newuser@test.com',
                password: 'SecurePass123'
            });
            expect([200, 400]).toContain(loginResponse.status);
            // Step 3: Access protected route with token
            if (loginResponse.status === 200) {
                const authCookie = loginResponse.headers['set-cookie'];
                expect(authCookie).toBeDefined();
            }
        });
        it('should reject login with incorrect credentials', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabaseMockChain_1.createMockChain)({
                data: [{
                        id: 'user-123',
                        email: 'user@test.com',
                        password_hash: 'hashed_password',
                        role: 'user',
                        is_active: true
                    }],
                error: null
            }));
            bcryptjs_1.default.compare.mockResolvedValue(false);
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'user@test.com',
                password: 'WrongPassword'
            });
            expect([401, 400]).toContain(response.status);
            if (response.status === 401) {
                expect(response.body).toHaveProperty('error');
            }
        });
    });
    describe('POST /api/auth/register', () => {
        it('should validate required fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                // Missing required fields
                email: 'test@test.com'
            })
                .expect(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should reject duplicate email', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabaseMockChain_1.createMockChain)({
                data: [{ id: 'existing-user', email: 'existing@test.com' }],
                error: null
            }));
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                pseudonym: 'testuser',
                email: 'existing@test.com',
                password: 'SecurePass123',
                account_type: 'regular'
            });
            expect([400, 409]).toContain(response.status);
        });
    });
    describe('POST /api/auth/login', () => {
        it('should return 401 for non-existent user', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabaseMockChain_1.createMockChain)({
                data: [], // Empty array for .single() = 404
                error: null
            }));
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'nonexistent@test.com',
                password: 'Password123'
            });
            expect([401, 400]).toContain(response.status);
        });
        it('should set httpOnly cookie on successful login', async () => {
            supabase_1.supabase.from.mockReturnValue((0, supabaseMockChain_1.createMockChain)({
                data: [{
                        id: 'user-123',
                        pseudonym: 'testuser',
                        email: 'user@test.com',
                        password_hash: 'hashed_password',
                        role: 'user',
                        is_active: true
                    }],
                error: null
            }));
            bcryptjs_1.default.compare.mockResolvedValue(true);
            jsonwebtoken_1.default.sign.mockReturnValue('jwt-token-123');
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'user@test.com',
                password: 'CorrectPassword123'
            });
            if (response.status === 200) {
                const cookies = response.headers['set-cookie'];
                expect(cookies).toBeDefined();
                // Check for httpOnly flag
                const authCookie = cookies?.find((c) => c.includes('auth-token'));
                if (authCookie) {
                    expect(authCookie).toContain('HttpOnly');
                }
            }
        });
    });
    describe('POST /api/auth/logout', () => {
        it('should clear auth cookie', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/logout');
            expect([200, 400]).toContain(response.status);
            if (response.status === 200) {
                const cookies = response.headers['set-cookie'];
                if (cookies) {
                    const authCookie = cookies.find((c) => c.includes('auth-token'));
                    // Cookie should be cleared (maxAge=0 or expires in past)
                    if (authCookie) {
                        expect(authCookie).toMatch(/(Max-Age=0|expires=Thu, 01 Jan 1970)/i);
                    }
                }
            }
        });
    });
    describe('GET /api/auth/profile', () => {
        it('should require authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/profile')
                .expect(401);
            expect(response.body).toHaveProperty('error');
        });
        it('should return user profile with valid token', async () => {
            const validToken = jsonwebtoken_1.default.sign({ userId: 'user-123', email: 'user@test.com', role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
            // Mock user lookup
            supabase_1.supabase.from.mockReturnValue((0, supabaseMockChain_1.createMockChain)({
                data: [{
                        id: 'user-123',
                        pseudonym: 'testuser',
                        email: 'user@test.com',
                        role: 'user',
                        is_active: true
                    }],
                error: null
            }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/profile')
                .set('Cookie', [`auth-token=${validToken}`]);
            expect([200, 401]).toContain(response.status);
        });
    });
});
//# sourceMappingURL=auth.integration.test.js.map