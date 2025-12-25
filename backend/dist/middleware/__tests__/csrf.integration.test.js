"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const csrf_1 = require("../csrf");
describe('CSRF Protection Integration Tests', () => {
    let app;
    beforeEach(() => {
        app = (0, express_1.default)();
        // Setup middleware
        app.use(express_1.default.json());
        app.use((0, express_session_1.default)({
            secret: 'test-session-secret',
            resave: false,
            saveUninitialized: true,
            cookie: { secure: false } // Allow in test environment
        }));
        app.use(csrf_1.csrfTokenGenerator);
        // Test routes
        app.get('/csrf-token', csrf_1.getCSRFToken);
        // Protected POST route
        app.post('/protected', csrf_1.csrfProtection, (req, res) => {
            res.json({ success: true, message: 'CSRF validation passed' });
        });
        // Protected PUT route
        app.put('/protected/:id', csrf_1.csrfProtection, (req, res) => {
            res.json({ success: true, id: req.params.id });
        });
        // Public GET route (should not require CSRF)
        app.get('/public', csrf_1.csrfProtection, (req, res) => {
            res.json({ success: true, message: 'Public GET endpoint' });
        });
    });
    describe('CSRF Token Generation', () => {
        it('should generate and return CSRF token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/csrf-token')
                .expect(200);
            expect(response.body).toHaveProperty('csrfToken');
            expect(response.body.csrfToken).toHaveLength(64); // 32 bytes = 64 hex chars
            expect(response.body).toHaveProperty('sessionId');
        });
        it('should persist CSRF token in session', async () => {
            const agent = supertest_1.default.agent(app);
            // First request to generate token
            const firstResponse = await agent.get('/csrf-token').expect(200);
            const firstToken = firstResponse.body.csrfToken;
            // Second request should return same token
            const secondResponse = await agent.get('/csrf-token').expect(200);
            const secondToken = secondResponse.body.csrfToken;
            expect(firstToken).toBe(secondToken);
        });
    });
    describe('CSRF Protection - Safe Methods', () => {
        it('should allow GET requests without CSRF token', async () => {
            await (0, supertest_1.default)(app)
                .get('/public')
                .expect(200)
                .expect({ success: true, message: 'Public GET endpoint' });
        });
        it('should allow HEAD requests without CSRF token', async () => {
            app.head('/public', csrf_1.csrfProtection, (req, res) => {
                res.status(200).end();
            });
            await (0, supertest_1.default)(app)
                .head('/public')
                .expect(200);
        });
        it('should allow OPTIONS requests without CSRF token', async () => {
            app.options('/protected', csrf_1.csrfProtection, (req, res) => {
                res.status(200).end();
            });
            await (0, supertest_1.default)(app)
                .options('/protected')
                .expect(200);
        });
    });
    describe('CSRF Protection - Unsafe Methods', () => {
        it('should reject POST request without CSRF token', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/protected')
                .send({ data: 'test' })
                .expect(403);
            expect(response.body).toHaveProperty('error');
            expect(response.body.code).toBe('CSRF_TOKEN_MISSING');
        });
        it('should reject PUT request without CSRF token', async () => {
            const response = await (0, supertest_1.default)(app)
                .put('/protected/123')
                .send({ data: 'test' })
                .expect(403);
            expect(response.body).toHaveProperty('error');
            expect(response.body.code).toBe('CSRF_TOKEN_MISSING');
        });
        it('should accept POST request with valid CSRF token in header', async () => {
            const agent = supertest_1.default.agent(app);
            // Get CSRF token
            const tokenResponse = await agent.get('/csrf-token').expect(200);
            const csrfToken = tokenResponse.body.csrfToken;
            // Make protected request with token
            await agent
                .post('/protected')
                .set('X-CSRF-Token', csrfToken)
                .send({ data: 'test' })
                .expect(200)
                .expect({ success: true, message: 'CSRF validation passed' });
        });
        it('should accept PUT request with valid CSRF token', async () => {
            const agent = supertest_1.default.agent(app);
            // Get CSRF token
            const tokenResponse = await agent.get('/csrf-token').expect(200);
            const csrfToken = tokenResponse.body.csrfToken;
            // Make protected request
            await agent
                .put('/protected/456')
                .set('X-CSRF-Token', csrfToken)
                .send({ data: 'test' })
                .expect(200)
                .expect({ success: true, id: '456' });
        });
        it('should reject request with invalid CSRF token', async () => {
            const agent = supertest_1.default.agent(app);
            // Get valid token first to establish session
            await agent.get('/csrf-token').expect(200);
            // Use wrong token
            const response = await agent
                .post('/protected')
                .set('X-CSRF-Token', 'invalid-token-123')
                .send({ data: 'test' })
                .expect(403);
            expect(response.body.code).toBe('CSRF_TOKEN_LENGTH_MISMATCH');
        });
        it('should reject request with mismatched CSRF token', async () => {
            const agent = supertest_1.default.agent(app);
            // Get token
            await agent.get('/csrf-token').expect(200);
            // Create a valid-looking but different token
            const fakeToken = 'a'.repeat(64); // 64 char hex string but wrong value
            const response = await agent
                .post('/protected')
                .set('X-CSRF-Token', fakeToken)
                .send({ data: 'test' })
                .expect(403);
            expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
        });
        it('should reject request with token but no prior session establishment', async () => {
            // Note: express-session automatically creates session, so we test token mismatch instead
            const response = await (0, supertest_1.default)(app)
                .post('/protected')
                .set('X-CSRF-Token', 'a'.repeat(64)) // Valid length but wrong token
                .send({ data: 'test' })
                .expect(403);
            // Session exists but token doesn't match
            expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
        });
    });
    describe('CSRF Token in Request Body', () => {
        it('should accept CSRF token from request body', async () => {
            const agent = supertest_1.default.agent(app);
            // Get token
            const tokenResponse = await agent.get('/csrf-token').expect(200);
            const csrfToken = tokenResponse.body.csrfToken;
            // Send token in body instead of header
            await agent
                .post('/protected')
                .send({ data: 'test', _csrf: csrfToken })
                .expect(200);
        });
    });
    describe('Admin Route CSRF Protection', () => {
        it('should enforce CSRF protection on admin routes (NO BYPASS)', async () => {
            app.post('/api/admin/test', csrf_1.csrfProtection, (req, res) => {
                res.json({ success: true });
            });
            // Admin routes now require CSRF token (security fix - CVSS 7.5)
            // Previously bypassed CSRF if auth cookie present - VULNERABILITY FIXED
            await (0, supertest_1.default)(app)
                .post('/api/admin/test')
                .set('Cookie', ['auth-token=admin-jwt-token'])
                .send({ data: 'admin action' })
                .expect(403)
                .expect((res) => {
                expect(res.body).toHaveProperty('code', 'CSRF_TOKEN_MISSING');
            });
        });
        it('should also enforce CSRF for non-admin routes with auth cookie', async () => {
            await (0, supertest_1.default)(app)
                .post('/protected')
                .set('Cookie', ['auth-token=user-jwt-token'])
                .send({ data: 'test' })
                .expect(403);
        });
    });
});
//# sourceMappingURL=csrf.integration.test.js.map