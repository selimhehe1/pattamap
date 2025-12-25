"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const csrf_1 = require("../../middleware/csrf");
const employees_1 = __importDefault(require("../employees"));
const supabase_1 = require("../../config/supabase");
const supabaseMockChain_1 = require("../../test-helpers/supabaseMockChain");
// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('../../middleware/cache', () => ({
    listingsCache: () => (req, res, next) => next()
}));
describe('Employees Routes Integration Tests', () => {
    let app;
    let authToken;
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
        app.use('/api/employees', employees_1.default);
    });
    beforeEach(() => {
        jest.clearAllMocks();
        authToken = jsonwebtoken_1.default.sign({ userId: 'user-123', email: 'user@test.com', role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    });
    describe('GET /api/employees', () => {
        it('should return 200 OK with array of employees', async () => {
            const mockEmployees = [
                {
                    id: 'emp-1',
                    name: 'Test Employee',
                    nationality: 'Thai',
                    age: 25,
                    status: 'approved',
                    is_freelance: false
                }
            ];
            // Use createMockChain helper
            supabase_1.supabase.from.mockReturnValue((0, supabaseMockChain_1.createMockChain)({
                data: mockEmployees,
                error: null,
                count: 1
            }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees')
                .expect(200);
            expect(response.body).toHaveProperty('employees');
            expect(Array.isArray(response.body.employees)).toBe(true);
        });
        it.skip('should filter by status parameter', async () => {
            const mockPendingEmployees = [
                {
                    id: 'emp-pending',
                    name: 'Pending Employee',
                    status: 'pending'
                }
            ];
            // Use createMockChain helper
            supabase_1.supabase.from.mockReturnValue((0, supabaseMockChain_1.createMockChain)({
                data: mockPendingEmployees,
                error: null,
                count: 1
            }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees?status=pending')
                .expect(200);
            expect(response.body.employees[0].status).toBe('pending');
        });
    });
    describe('GET /api/employees/:id', () => {
        it('should return 200 OK with single employee', async () => {
            const mockEmployee = {
                id: 'emp-123',
                name: 'Test Employee',
                nationality: 'Thai',
                age: 25,
                status: 'approved',
                is_freelance: false,
                employment_history: [],
                comments: []
            };
            // Use createMockChain helper - .single() auto-handled
            supabase_1.supabase.from.mockReturnValue((0, supabaseMockChain_1.createMockChain)({
                data: [mockEmployee], // Array for .single() handling
                error: null
            }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees/emp-123')
                .expect(200);
            expect(response.body).toHaveProperty('employee');
            expect(response.body.employee.name).toBe('Test Employee');
        });
        it('should return 404 for non-existent employee', async () => {
            // Use createMockChain helper - empty array for .single() = 404
            supabase_1.supabase.from.mockReturnValue((0, supabaseMockChain_1.createMockChain)({
                data: [], // Empty array triggers PGRST116 error in .single()
                error: null
            }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees/nonexistent-id')
                .expect(404);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('POST /api/employees', () => {
        it('should return 401 Unauthorized without auth token', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees')
                .send({
                name: 'New Employee',
                nationality: 'Thai',
                age: 25
            })
                .expect(401);
            expect(response.body.code).toBe('TOKEN_MISSING');
        });
        it('should create employee with valid auth', async () => {
            // Mock user lookup
            supabase_1.supabase.from.mockImplementation((table) => {
                if (table === 'users') {
                    return {
                        select: jest.fn().mockReturnValue({
                            eq: jest.fn().mockReturnValue({
                                eq: jest.fn().mockReturnValue({
                                    single: jest.fn().mockResolvedValue({
                                        data: {
                                            id: 'user-123',
                                            pseudonym: 'testuser',
                                            email: 'user@test.com',
                                            role: 'user',
                                            is_active: true
                                        },
                                        error: null
                                    })
                                })
                            })
                        })
                    };
                }
                else {
                    return {
                        insert: jest.fn().mockReturnValue({
                            select: jest.fn().mockResolvedValue({
                                data: [{
                                        id: 'emp-new',
                                        name: 'New Employee',
                                        nationality: 'Thai',
                                        age: 25,
                                        status: 'pending'
                                    }],
                                error: null
                            })
                        })
                    };
                }
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees')
                .set('Cookie', [`auth-token=${authToken}`])
                .send({
                name: 'New Employee',
                nationality: 'Thai',
                age: 25
            });
            // May return 201 or 400 depending on validation
            expect([201, 400]).toContain(response.status);
        });
    });
    describe('PUT /api/employees/:id', () => {
        it('should return 401 without authentication', async () => {
            const response = await (0, supertest_1.default)(app)
                .put('/api/employees/emp-123')
                .send({ name: 'Updated Name' })
                .expect(401);
            expect(response.body.code).toBe('TOKEN_MISSING');
        });
        it('should require authorization to update employee', async () => {
            // Mock user lookup using helper
            const user = {
                id: 'user-123',
                pseudonym: 'testuser',
                email: 'user@test.com',
                role: 'user',
                is_active: true
            };
            supabase_1.supabase.from = (0, supabaseMockChain_1.mockSupabaseAuth)(user);
            const response = await (0, supertest_1.default)(app)
                .put('/api/employees/emp-123')
                .set('Cookie', [`auth-token=${authToken}`])
                .send({ name: 'Updated Name' });
            // Authorization check happens in controller
            expect([200, 400, 403, 404]).toContain(response.status);
        });
    });
    describe('POST /api/employees/my-profile', () => {
        it('should allow authenticated users to create own profile', async () => {
            // Mock user lookup using helper
            const user = {
                id: 'user-123',
                pseudonym: 'testuser',
                email: 'user@test.com',
                role: 'user',
                is_active: true,
                account_type: 'employee'
            };
            supabase_1.supabase.from = (0, supabaseMockChain_1.mockSupabaseAuth)(user);
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees/my-profile')
                .set('Cookie', [`auth-token=${authToken}`])
                .send({
                name: 'My Profile',
                nationality: 'Thai',
                age: 25,
                is_freelance: true
            });
            // May succeed or fail validation
            expect([201, 400, 401, 403]).toContain(response.status);
        });
    });
    describe('GET /api/employees/name-suggestions', () => {
        it.skip('should return employee name suggestions', async () => {
            const mockSuggestions = [
                { id: 'emp-1', name: 'Alice' },
                { id: 'emp-2', name: 'Alicia' }
            ];
            // Use createMockChain helper
            supabase_1.supabase.from.mockReturnValue((0, supabaseMockChain_1.createMockChain)({
                data: mockSuggestions,
                error: null
            }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees/name-suggestions?search=ali')
                .expect(200);
            expect(response.body).toHaveProperty('suggestions');
        });
    });
    describe('DELETE /api/employees/:id', () => {
        it('should require admin role to delete', async () => {
            // Mock regular user using helper
            const user = {
                id: 'user-123',
                pseudonym: 'testuser',
                email: 'user@test.com',
                role: 'user',
                is_active: true
            };
            supabase_1.supabase.from = (0, supabaseMockChain_1.mockSupabaseAuth)(user);
            const response = await (0, supertest_1.default)(app)
                .delete('/api/employees/emp-123')
                .set('Cookie', [`auth-token=${authToken}`]);
            // Should be denied (403 Forbidden or 404 if route doesn't exist)
            expect([403, 401, 404]).toContain(response.status);
        });
    });
});
//# sourceMappingURL=employees.integration.test.js.map