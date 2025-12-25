"use strict";
/**
 * Employee Validation Controller Tests
 *
 * Tests for community voting on employee profile existence:
 * - voteOnEmployee (8 tests)
 * - getValidationStats (3 tests)
 * - getMyVotes (4 tests)
 * - getMyEmployeesValidation (5 tests)
 * - toggleEmployeeVisibilityAsOwner (6 tests)
 * - getAllEmployeesValidation (4 tests)
 * - toggleEmployeeVisibilityAsAdmin (4 tests)
 *
 * Day 5+ Sprint - Controller Testing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const employeeValidationController_1 = require("../employeeValidationController");
const supabase_1 = require("../../config/supabase");
const supabaseMockChain_1 = require("../../test-helpers/supabaseMockChain");
jest.mock('../../config/supabase');
jest.mock('../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn()
    }
}));
describe('Employee Validation Controller', () => {
    let app;
    const mockUser = { id: 'user-123', role: 'user' };
    const mockOwner = { id: 'owner-123', role: 'establishment_owner' };
    const mockAdmin = { id: 'admin-123', role: 'admin' };
    const mockEmployee = {
        id: 'emp-123',
        stage_name: 'Test Employee',
        photo_url: 'https://example.com/photo.jpg',
        establishment_id: 'est-123',
        is_hidden: false,
        hidden_by: null,
        hidden_at: null,
        hide_reason: null
    };
    beforeEach(() => {
        jest.clearAllMocks();
        app = (0, express_1.default)();
        app.use(express_1.default.json());
    });
    // ============================================
    // voteOnEmployee Tests
    // ============================================
    describe('voteOnEmployee', () => {
        beforeEach(() => {
            app.post('/api/employees/:id/validation-vote', (req, res, next) => {
                req.user = mockUser;
                next();
            }, employeeValidationController_1.voteOnEmployee);
        });
        it('should record vote successfully and award XP', async () => {
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1 && table === 'employees') {
                    // Employee exists check
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockEmployee, error: null });
                }
                if (callCount === 2 && table === 'employee_existence_votes') {
                    // Vote insert
                    return (0, supabaseMockChain_1.createMockChain)({
                        data: { id: 'vote-123', employee_id: 'emp-123', user_id: 'user-123', vote_type: 'exists' },
                        error: null
                    });
                }
                if (callCount === 3 && table === 'employee_existence_votes') {
                    // Stats fetch
                    return (0, supabaseMockChain_1.createMockChain)({ data: [], error: null });
                }
                return (0, supabaseMockChain_1.createMockChain)({ data: [], error: null });
            });
            supabase_1.supabase.rpc.mockResolvedValue({ data: null, error: null });
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees/emp-123/validation-vote')
                .send({ voteType: 'exists' })
                .expect(201);
            expect(response.body.message).toBe('Vote recorded successfully');
            expect(response.body.xpAwarded).toBe(2);
        });
        it('should return 401 if not authenticated', async () => {
            app = (0, express_1.default)();
            app.use(express_1.default.json());
            app.post('/api/employees/:id/validation-vote', employeeValidationController_1.voteOnEmployee);
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees/emp-123/validation-vote')
                .send({ voteType: 'exists' })
                .expect(401);
            expect(response.body.error).toBe('Authentication required');
        });
        it('should return 400 for invalid vote type', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees/emp-123/validation-vote')
                .send({ voteType: 'invalid' })
                .expect(400);
            expect(response.body.error).toBe('Invalid vote type. Must be "exists" or "not_exists"');
        });
        it('should return 400 for missing vote type', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees/emp-123/validation-vote')
                .send({})
                .expect(400);
            expect(response.body.error).toBe('Invalid vote type. Must be "exists" or "not_exists"');
        });
        it('should return 404 if employee not found', async () => {
            supabase_1.supabase.from.mockImplementation(() => (0, supabaseMockChain_1.createMockChain)({ data: null, error: { code: 'PGRST116', message: 'Not found' } }));
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees/non-existent/validation-vote')
                .send({ voteType: 'exists' })
                .expect(404);
            expect(response.body.error).toBe('Employee not found');
        });
        it('should return 409 if user already voted', async () => {
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockEmployee, error: null });
                }
                if (callCount === 2) {
                    return (0, supabaseMockChain_1.createMockChain)({
                        data: null,
                        error: { code: '23505', message: 'Unique violation' }
                    });
                }
                return (0, supabaseMockChain_1.createMockChain)({ data: [], error: null });
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees/emp-123/validation-vote')
                .send({ voteType: 'exists' })
                .expect(409);
            expect(response.body.error).toBe('You have already voted on this profile');
        });
        it('should return 500 on database error', async () => {
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockEmployee, error: null });
                }
                return (0, supabaseMockChain_1.createMockChain)({
                    data: null,
                    error: { code: 'OTHER', message: 'Database error' }
                });
            });
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees/emp-123/validation-vote')
                .send({ voteType: 'not_exists' })
                .expect(500);
            expect(response.body.error).toBe('Failed to record vote');
        });
        it('should accept not_exists vote type', async () => {
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockEmployee, error: null });
                }
                if (callCount === 2) {
                    return (0, supabaseMockChain_1.createMockChain)({
                        data: { id: 'vote-123', vote_type: 'not_exists' },
                        error: null
                    });
                }
                return (0, supabaseMockChain_1.createMockChain)({ data: [], error: null });
            });
            supabase_1.supabase.rpc.mockResolvedValue({ data: null, error: null });
            const response = await (0, supertest_1.default)(app)
                .post('/api/employees/emp-123/validation-vote')
                .send({ voteType: 'not_exists' })
                .expect(201);
            expect(response.body.vote.vote_type).toBe('not_exists');
        });
    });
    // ============================================
    // getValidationStats Tests
    // ============================================
    describe('getValidationStats', () => {
        beforeEach(() => {
            app.get('/api/employees/:id/validation-stats', (req, res, next) => {
                req.user = mockUser;
                next();
            }, employeeValidationController_1.getValidationStats);
        });
        it('should return validation stats for employee', async () => {
            const mockVotes = [
                { vote_type: 'exists', user_id: 'user-1' },
                { vote_type: 'exists', user_id: 'user-2' },
                { vote_type: 'not_exists', user_id: 'user-3' }
            ];
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockVotes, error: null });
                }
                // User levels
                return (0, supabaseMockChain_1.createMockChain)({
                    data: [
                        { user_id: 'user-1', current_level: 1 },
                        { user_id: 'user-2', current_level: 5 },
                        { user_id: 'user-3', current_level: 3 }
                    ],
                    error: null
                });
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees/emp-123/validation-stats')
                .expect(200);
            expect(response.body).toHaveProperty('totalVotes', 3);
            expect(response.body).toHaveProperty('existsVotes', 2);
            expect(response.body).toHaveProperty('notExistsVotes', 1);
            expect(response.body).toHaveProperty('badgeType');
        });
        it('should return empty stats for no votes', async () => {
            supabase_1.supabase.from.mockImplementation(() => (0, supabaseMockChain_1.createMockChain)({ data: [], error: null }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees/emp-123/validation-stats')
                .expect(200);
            expect(response.body.totalVotes).toBe(0);
            expect(response.body.badgeType).toBe('?');
        });
        it('should return 500 on error', async () => {
            supabase_1.supabase.from.mockImplementation(() => {
                throw new Error('Database error');
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees/emp-123/validation-stats')
                .expect(500);
            expect(response.body.error).toBe('Internal server error');
        });
    });
    // ============================================
    // getMyVotes Tests
    // ============================================
    describe('getMyVotes', () => {
        beforeEach(() => {
            app.get('/api/my-validation-votes', (req, res, next) => {
                req.user = mockUser;
                next();
            }, employeeValidationController_1.getMyVotes);
        });
        it('should return user vote history', async () => {
            const mockVotes = [
                {
                    id: 'vote-1',
                    vote_type: 'exists',
                    created_at: '2024-01-01T00:00:00Z',
                    employees: { id: 'emp-1', stage_name: 'Employee 1', photo_url: null }
                },
                {
                    id: 'vote-2',
                    vote_type: 'not_exists',
                    created_at: '2024-01-02T00:00:00Z',
                    employees: { id: 'emp-2', stage_name: 'Employee 2', photo_url: null }
                }
            ];
            supabase_1.supabase.from.mockImplementation(() => (0, supabaseMockChain_1.createMockChain)({ data: mockVotes, error: null }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/my-validation-votes')
                .expect(200);
            expect(response.body.votes).toHaveLength(2);
            expect(response.body.votes[0].vote_type).toBe('exists');
        });
        it('should return 401 if not authenticated', async () => {
            app = (0, express_1.default)();
            app.use(express_1.default.json());
            app.get('/api/my-validation-votes', employeeValidationController_1.getMyVotes);
            const response = await (0, supertest_1.default)(app)
                .get('/api/my-validation-votes')
                .expect(401);
            expect(response.body.error).toBe('Authentication required');
        });
        it('should return 500 on database error', async () => {
            supabase_1.supabase.from.mockImplementation(() => (0, supabaseMockChain_1.createMockChain)({ data: null, error: { message: 'Database error' } }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/my-validation-votes')
                .expect(500);
            expect(response.body.error).toBe('Failed to fetch vote history');
        });
        it('should return empty array when no votes', async () => {
            supabase_1.supabase.from.mockImplementation(() => (0, supabaseMockChain_1.createMockChain)({ data: [], error: null }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/my-validation-votes')
                .expect(200);
            expect(response.body.votes).toEqual([]);
        });
    });
    // ============================================
    // getMyEmployeesValidation Tests (Owner)
    // ============================================
    describe('getMyEmployeesValidation', () => {
        beforeEach(() => {
            app.get('/api/owner/my-employees-validation', (req, res, next) => {
                req.user = mockOwner;
                next();
            }, employeeValidationController_1.getMyEmployeesValidation);
        });
        it('should return employees with validation stats for owner', async () => {
            const mockOwnerships = [{ establishment_id: 'est-123' }];
            const mockEmployees = [
                {
                    ...mockEmployee,
                    establishments: { id: 'est-123', name: 'Test Bar' }
                }
            ];
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation((table) => {
                callCount++;
                if (callCount === 1 && table === 'establishment_owners') {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockOwnerships, error: null });
                }
                if (callCount === 2 && table === 'employees') {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockEmployees, error: null });
                }
                // Validation stats calls
                return (0, supabaseMockChain_1.createMockChain)({ data: [], error: null });
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/owner/my-employees-validation')
                .expect(200);
            expect(response.body.employees).toHaveLength(1);
            expect(response.body.employees[0].employeeName).toBe('Test Employee');
        });
        it('should return 401 if not authenticated', async () => {
            app = (0, express_1.default)();
            app.use(express_1.default.json());
            app.get('/api/owner/my-employees-validation', employeeValidationController_1.getMyEmployeesValidation);
            const response = await (0, supertest_1.default)(app)
                .get('/api/owner/my-employees-validation')
                .expect(401);
            expect(response.body.error).toBe('Authentication required');
        });
        it('should return empty array if no establishments owned', async () => {
            supabase_1.supabase.from.mockImplementation(() => (0, supabaseMockChain_1.createMockChain)({ data: [], error: null }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/owner/my-employees-validation')
                .expect(200);
            expect(response.body.employees).toEqual([]);
        });
        it('should return 500 on ownership fetch error', async () => {
            supabase_1.supabase.from.mockImplementation(() => (0, supabaseMockChain_1.createMockChain)({ data: null, error: { message: 'Database error' } }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/owner/my-employees-validation')
                .expect(500);
            expect(response.body.error).toBe('Failed to fetch establishments');
        });
        it('should return 500 on employee fetch error', async () => {
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: [{ establishment_id: 'est-123' }], error: null });
                }
                return (0, supabaseMockChain_1.createMockChain)({ data: null, error: { message: 'Database error' } });
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/owner/my-employees-validation')
                .expect(500);
            expect(response.body.error).toBe('Failed to fetch employees');
        });
    });
    // ============================================
    // toggleEmployeeVisibilityAsOwner Tests
    // ============================================
    describe('toggleEmployeeVisibilityAsOwner', () => {
        beforeEach(() => {
            app.patch('/api/owner/employees/:id/visibility', (req, res, next) => {
                req.user = mockOwner;
                next();
            }, employeeValidationController_1.toggleEmployeeVisibilityAsOwner);
        });
        it('should toggle visibility to hidden successfully', async () => {
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockEmployee, error: null });
                }
                if (callCount === 2) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: { id: 'ownership-123' }, error: null });
                }
                return (0, supabaseMockChain_1.createMockChain)({ data: null, error: null });
            });
            const response = await (0, supertest_1.default)(app)
                .patch('/api/owner/employees/emp-123/visibility')
                .send({ isHidden: true, reason: 'No longer works here' })
                .expect(200);
            expect(response.body.message).toBe('Visibility updated successfully');
            expect(response.body.isHidden).toBe(true);
            expect(response.body.reason).toBe('No longer works here');
        });
        it('should toggle visibility to visible successfully', async () => {
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockEmployee, error: null });
                }
                if (callCount === 2) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: { id: 'ownership-123' }, error: null });
                }
                return (0, supabaseMockChain_1.createMockChain)({ data: null, error: null });
            });
            const response = await (0, supertest_1.default)(app)
                .patch('/api/owner/employees/emp-123/visibility')
                .send({ isHidden: false })
                .expect(200);
            expect(response.body.isHidden).toBe(false);
        });
        it('should return 401 if not authenticated', async () => {
            app = (0, express_1.default)();
            app.use(express_1.default.json());
            app.patch('/api/owner/employees/:id/visibility', employeeValidationController_1.toggleEmployeeVisibilityAsOwner);
            const response = await (0, supertest_1.default)(app)
                .patch('/api/owner/employees/emp-123/visibility')
                .send({ isHidden: true })
                .expect(401);
            expect(response.body.error).toBe('Authentication required');
        });
        it('should return 400 if isHidden is not boolean', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch('/api/owner/employees/emp-123/visibility')
                .send({ isHidden: 'yes' })
                .expect(400);
            expect(response.body.error).toBe('isHidden must be a boolean');
        });
        it('should return 404 if employee not found', async () => {
            supabase_1.supabase.from.mockImplementation(() => (0, supabaseMockChain_1.createMockChain)({ data: null, error: { code: 'PGRST116' } }));
            const response = await (0, supertest_1.default)(app)
                .patch('/api/owner/employees/non-existent/visibility')
                .send({ isHidden: true })
                .expect(404);
            expect(response.body.error).toBe('Employee not found');
        });
        it('should return 403 if user does not own establishment', async () => {
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockEmployee, error: null });
                }
                // Ownership check returns null (not owner)
                return (0, supabaseMockChain_1.createMockChain)({ data: null, error: { code: 'PGRST116' } });
            });
            const response = await (0, supertest_1.default)(app)
                .patch('/api/owner/employees/emp-123/visibility')
                .send({ isHidden: true })
                .expect(403);
            expect(response.body.error).toBe('You do not own this establishment');
        });
    });
    // ============================================
    // getAllEmployeesValidation Tests (Admin)
    // ============================================
    describe('getAllEmployeesValidation', () => {
        beforeEach(() => {
            app.get('/api/admin/employees-validation', (req, res, next) => {
                req.user = mockAdmin;
                next();
            }, employeeValidationController_1.getAllEmployeesValidation);
        });
        it('should return all employees with validation stats', async () => {
            const mockEmployees = [
                {
                    ...mockEmployee,
                    user_id: null,
                    is_self_profile: false,
                    establishments: { id: 'est-123', name: 'Test Bar' }
                }
            ];
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockEmployees, error: null });
                }
                return (0, supabaseMockChain_1.createMockChain)({ data: [], error: null });
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/admin/employees-validation')
                .expect(200);
            expect(response.body.employees).toHaveLength(1);
            expect(response.body.employees[0].isClaimed).toBe(false);
        });
        it('should return 500 on database error', async () => {
            supabase_1.supabase.from.mockImplementation(() => (0, supabaseMockChain_1.createMockChain)({ data: null, error: { message: 'Database error' } }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/admin/employees-validation')
                .expect(500);
            expect(response.body.error).toBe('Failed to fetch employees');
        });
        it('should mark claimed profiles correctly', async () => {
            const mockEmployees = [
                {
                    id: 'emp-1',
                    stage_name: 'Emp 1',
                    user_id: 'user-123',
                    is_self_profile: false,
                    establishments: { id: 'est-1', name: 'Bar' }
                },
                {
                    id: 'emp-2',
                    stage_name: 'Emp 2',
                    user_id: null,
                    is_self_profile: true,
                    establishments: { id: 'est-2', name: 'Bar 2' }
                }
            ];
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockEmployees, error: null });
                }
                return (0, supabaseMockChain_1.createMockChain)({ data: [], error: null });
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/admin/employees-validation')
                .expect(200);
            expect(response.body.employees[0].isClaimed).toBe(true);
            expect(response.body.employees[1].isClaimed).toBe(true);
        });
        it('should return empty array when no employees', async () => {
            supabase_1.supabase.from.mockImplementation(() => (0, supabaseMockChain_1.createMockChain)({ data: [], error: null }));
            const response = await (0, supertest_1.default)(app)
                .get('/api/admin/employees-validation')
                .expect(200);
            expect(response.body.employees).toEqual([]);
        });
    });
    // ============================================
    // toggleEmployeeVisibilityAsAdmin Tests
    // ============================================
    describe('toggleEmployeeVisibilityAsAdmin', () => {
        beforeEach(() => {
            app.patch('/api/admin/employees/:id/visibility', (req, res, next) => {
                req.user = mockAdmin;
                next();
            }, employeeValidationController_1.toggleEmployeeVisibilityAsAdmin);
        });
        it('should toggle visibility successfully as admin', async () => {
            supabase_1.supabase.from.mockImplementation(() => (0, supabaseMockChain_1.createMockChain)({ data: null, error: null }));
            const response = await (0, supertest_1.default)(app)
                .patch('/api/admin/employees/emp-123/visibility')
                .send({ isHidden: true, reason: 'Violation of terms' })
                .expect(200);
            expect(response.body.message).toBe('Visibility updated successfully');
            expect(response.body.isHidden).toBe(true);
        });
        it('should return 401 if not authenticated', async () => {
            app = (0, express_1.default)();
            app.use(express_1.default.json());
            app.patch('/api/admin/employees/:id/visibility', employeeValidationController_1.toggleEmployeeVisibilityAsAdmin);
            const response = await (0, supertest_1.default)(app)
                .patch('/api/admin/employees/emp-123/visibility')
                .send({ isHidden: true })
                .expect(401);
            expect(response.body.error).toBe('Authentication required');
        });
        it('should return 400 if isHidden is not boolean', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch('/api/admin/employees/emp-123/visibility')
                .send({ isHidden: 'true' })
                .expect(400);
            expect(response.body.error).toBe('isHidden must be a boolean');
        });
        it('should return 500 on update error', async () => {
            supabase_1.supabase.from.mockImplementation(() => {
                const chain = (0, supabaseMockChain_1.createMockChain)({ data: null, error: { message: 'Update failed' } });
                // Override update to return error
                chain.update = jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: { message: 'Update failed' } })
                });
                return chain;
            });
            const response = await (0, supertest_1.default)(app)
                .patch('/api/admin/employees/emp-123/visibility')
                .send({ isHidden: true })
                .expect(500);
            expect(response.body.error).toBe('Failed to update visibility');
        });
    });
    // ============================================
    // Validation Stats Calculation Tests
    // ============================================
    describe('Validation Stats Calculation', () => {
        beforeEach(() => {
            app.get('/api/employees/:id/validation-stats', (req, res, next) => {
                req.user = mockUser;
                next();
            }, employeeValidationController_1.getValidationStats);
        });
        it('should calculate weighted votes based on user levels', async () => {
            const mockVotes = [
                { vote_type: 'exists', user_id: 'level1-user' },
                { vote_type: 'exists', user_id: 'level5-user' },
                { vote_type: 'not_exists', user_id: 'level7-user' }
            ];
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockVotes, error: null });
                }
                return (0, supabaseMockChain_1.createMockChain)({
                    data: [
                        { user_id: 'level1-user', current_level: 1 },
                        { user_id: 'level5-user', current_level: 5 },
                        { user_id: 'level7-user', current_level: 7 }
                    ],
                    error: null
                });
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees/emp-123/validation-stats')
                .expect(200);
            // Level 1 = 1.0x, Level 5 = 2.0x, Level 7 = 3.0x
            // exists: 1.0 + 2.0 = 3.0
            // not_exists: 3.0
            // total weight: 6.0
            expect(response.body.weightedExistsVotes).toBe(3);
            expect(response.body.weightedNotExistsVotes).toBe(3);
            expect(response.body.totalWeight).toBe(6);
        });
        it('should return badge type "?" when under 20 votes', async () => {
            const mockVotes = Array(15).fill(null).map((_, i) => ({
                vote_type: 'exists',
                user_id: `user-${i}`
            }));
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockVotes, error: null });
                }
                return (0, supabaseMockChain_1.createMockChain)({ data: [], error: null });
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees/emp-123/validation-stats')
                .expect(200);
            expect(response.body.badgeType).toBe('?');
        });
        it('should return badge type "neutral" for >50% validation with 20+ votes', async () => {
            const mockVotes = [
                ...Array(15).fill(null).map((_, i) => ({ vote_type: 'exists', user_id: `exists-${i}` })),
                ...Array(10).fill(null).map((_, i) => ({ vote_type: 'not_exists', user_id: `not-${i}` }))
            ];
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockVotes, error: null });
                }
                return (0, supabaseMockChain_1.createMockChain)({ data: [], error: null });
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees/emp-123/validation-stats')
                .expect(200);
            expect(response.body.badgeType).toBe('neutral');
        });
        it('should return badge type "warning" for <=50% validation with 20+ votes', async () => {
            const mockVotes = [
                ...Array(10).fill(null).map((_, i) => ({ vote_type: 'exists', user_id: `exists-${i}` })),
                ...Array(15).fill(null).map((_, i) => ({ vote_type: 'not_exists', user_id: `not-${i}` }))
            ];
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockVotes, error: null });
                }
                return (0, supabaseMockChain_1.createMockChain)({ data: [], error: null });
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees/emp-123/validation-stats')
                .expect(200);
            expect(response.body.badgeType).toBe('warning');
        });
        it('should include user vote when authenticated', async () => {
            const mockVotes = [
                { vote_type: 'exists', user_id: 'user-123' },
                { vote_type: 'not_exists', user_id: 'other-user' }
            ];
            let callCount = 0;
            supabase_1.supabase.from.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return (0, supabaseMockChain_1.createMockChain)({ data: mockVotes, error: null });
                }
                return (0, supabaseMockChain_1.createMockChain)({ data: [], error: null });
            });
            const response = await (0, supertest_1.default)(app)
                .get('/api/employees/emp-123/validation-stats')
                .expect(200);
            expect(response.body.userVote).toBe('exists');
        });
    });
});
//# sourceMappingURL=employeeValidationController.test.js.map