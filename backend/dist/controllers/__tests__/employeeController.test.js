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
Object.defineProperty(exports, "__esModule", { value: true });
const employeeController_1 = require("../employeeController");
const supabase_1 = require("../../config/supabase");
const validation_1 = require("../../utils/validation");
const freelanceValidation = __importStar(require("../../utils/freelanceValidation"));
const notificationHelper = __importStar(require("../../utils/notificationHelper"));
// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('../../utils/validation', () => ({
    validateImageUrls: jest.fn().mockReturnValue({ valid: true, urls: [] }),
    validateUrlArray: jest.fn().mockReturnValue({ valid: true, urls: [] }),
    escapeLikeWildcards: jest.fn((input) => input || ''), // Return input unchanged for tests
}));
jest.mock('../../utils/freelanceValidation');
jest.mock('../../utils/notificationHelper');
describe('EmployeeController', () => {
    let mockRequest;
    let mockResponse;
    let jsonMock;
    let statusMock;
    // Helper to create a flexible query builder mock that can be both chainable and promisable
    const createQueryBuilder = (finalResult) => {
        // Create a thenable object that resolves to finalResult
        const promise = Promise.resolve(finalResult);
        const builder = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            neq: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            like: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue(finalResult),
            single: jest.fn().mockResolvedValue(finalResult),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            // Make the builder itself awaitable for queries without explicit terminators
            then: promise.then.bind(promise),
            catch: promise.catch.bind(promise),
        };
        // Make all methods return the builder for chaining
        Object.keys(builder).forEach(key => {
            if (key !== 'range' && key !== 'single' && key !== 'then' && key !== 'catch' && typeof builder[key] === 'function') {
                builder[key].mockReturnValue(builder);
            }
        });
        return builder;
    };
    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            query: {},
            params: {},
            body: {},
            user: {
                id: 'user-123',
                pseudonym: 'testuser',
                email: 'user@test.com',
                role: 'user',
                is_active: true
            }
        };
        mockResponse = {
            status: statusMock,
            json: jsonMock
        };
        jest.clearAllMocks();
        // Mock validation helpers
        validation_1.validateImageUrls.mockReturnValue({ valid: true, error: null });
        jest.spyOn(freelanceValidation, 'validateFreelanceRules').mockResolvedValue({ valid: true, error: null });
        jest.spyOn(notificationHelper, 'notifyEmployeeUpdate').mockResolvedValue(undefined);
        jest.spyOn(notificationHelper, 'notifyAdminsPendingContent').mockResolvedValue(undefined);
    });
    describe('getEmployees', () => {
        it('should return list of employees with pagination and ratings', async () => {
            const mockEmployees = [
                {
                    id: 'emp-1',
                    name: 'Alice',
                    is_freelance: false,
                    is_vip: false,
                    current_employment: [{ is_current: true, establishment_id: 'est-1' }],
                    created_at: '2025-01-01'
                },
                {
                    id: 'emp-2',
                    name: 'Bob',
                    is_freelance: true,
                    is_vip: false,
                    current_employment: [],
                    created_at: '2025-01-02'
                }
            ];
            const mockRatings = [
                { employee_id: 'emp-1', rating: 5 },
                { employee_id: 'emp-1', rating: 4 }
            ];
            const mockVotes = [
                { employee_id: 'emp-1' },
                { employee_id: 'emp-1' },
                { employee_id: 'emp-2' }
            ];
            // Mock query chains using the helper
            const employeesBuilder = createQueryBuilder({ data: mockEmployees, error: null, count: 2 });
            const ratingsBuilder = createQueryBuilder({ data: mockRatings, error: null });
            const votesBuilder = createQueryBuilder({ data: mockVotes, error: null });
            supabase_1.supabase.from
                .mockReturnValueOnce(employeesBuilder)
                .mockReturnValueOnce(ratingsBuilder)
                .mockReturnValueOnce(votesBuilder);
            mockRequest.query = { status: 'approved', page: '1', limit: '20' };
            await (0, employeeController_1.getEmployees)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                employees: expect.arrayContaining([
                    expect.objectContaining({
                        id: 'emp-1',
                        name: 'Alice',
                        average_rating: 4.5, // (5+4)/2
                        comment_count: 2,
                        vote_count: 2
                    }),
                    expect.objectContaining({
                        id: 'emp-2',
                        name: 'Bob',
                        average_rating: null,
                        comment_count: 0,
                        vote_count: 1
                    })
                ]),
                pagination: expect.objectContaining({
                    page: 1,
                    limit: 20,
                    total: 2,
                    totalPages: 1,
                    hasMore: false
                })
            });
        });
        it('should filter employees by nationality', async () => {
            mockRequest.query = { status: 'approved', nationality: 'thai' };
            const builder = createQueryBuilder({ data: [], error: null, count: 0 });
            supabase_1.supabase.from.mockReturnValue(builder);
            await (0, employeeController_1.getEmployees)(mockRequest, mockResponse);
            expect(builder.ilike).toHaveBeenCalledWith('nationality', '%thai%');
        });
        it('should filter employees by age range', async () => {
            mockRequest.query = { status: 'approved', age_min: '18', age_max: '30' };
            const builder = createQueryBuilder({ data: [], error: null, count: 0 });
            supabase_1.supabase.from.mockReturnValue(builder);
            await (0, employeeController_1.getEmployees)(mockRequest, mockResponse);
            expect(builder.gte).toHaveBeenCalledWith('age', 18);
            expect(builder.lte).toHaveBeenCalledWith('age', 30);
        });
        it('should search employees by name/nickname/description', async () => {
            mockRequest.query = { status: 'approved', search: 'alice' };
            const builder = createQueryBuilder({ data: [], error: null, count: 0 });
            supabase_1.supabase.from.mockReturnValue(builder);
            await (0, employeeController_1.getEmployees)(mockRequest, mockResponse);
            expect(builder.or).toHaveBeenCalledWith('name.ilike.%alice%,nickname.ilike.%alice%,description.ilike.%alice%');
        });
        it('should handle database errors', async () => {
            const builder = createQueryBuilder({ data: null, error: { message: 'Database error' } });
            supabase_1.supabase.from.mockReturnValue(builder);
            await (0, employeeController_1.getEmployees)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Database error' });
        });
    });
    describe('getEmployee', () => {
        it('should return employee by ID with full details', async () => {
            const mockEmployee = {
                id: 'emp-1',
                name: 'Alice',
                age: 25,
                created_by_user: { pseudonym: 'creator' }
            };
            const mockEmploymentHistory = [
                { id: 'eh-1', is_current: true, establishment: { name: 'Bar 1' } },
                { id: 'eh-2', is_current: false, establishment: { name: 'Bar 2' } }
            ];
            const mockComments = [
                { id: 'c-1', rating: 5, user: { pseudonym: 'reviewer' } }
            ];
            // Mock employee query
            const selectMock = jest.fn().mockReturnThis();
            const eqMock = jest.fn().mockReturnThis();
            const singleMock = jest.fn().mockResolvedValue({
                data: mockEmployee,
                error: null
            });
            supabase_1.supabase.from.mockReturnValueOnce({
                select: selectMock.mockReturnValue({
                    eq: eqMock.mockReturnValue({
                        single: singleMock
                    })
                })
            });
            // Mock employment history query
            const historySelectMock = jest.fn().mockReturnThis();
            const historyEqMock = jest.fn().mockReturnThis();
            const historyOrderMock = jest.fn().mockResolvedValue({
                data: mockEmploymentHistory,
                error: null
            });
            supabase_1.supabase.from.mockReturnValueOnce({
                select: historySelectMock.mockReturnValue({
                    eq: historyEqMock.mockReturnValue({
                        order: historyOrderMock
                    })
                })
            });
            // Mock comments query
            const commentsSelectMock = jest.fn().mockReturnThis();
            const commentsEqMock = jest.fn().mockReturnThis();
            const commentsEq2Mock = jest.fn().mockReturnThis();
            const commentsOrderMock = jest.fn().mockResolvedValue({
                data: mockComments,
                error: null
            });
            supabase_1.supabase.from.mockReturnValueOnce({
                select: commentsSelectMock.mockReturnValue({
                    eq: commentsEqMock.mockReturnValue({
                        eq: commentsEq2Mock.mockReturnValue({
                            order: commentsOrderMock
                        })
                    })
                })
            });
            mockRequest.params = { id: 'emp-1' };
            await (0, employeeController_1.getEmployee)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                employee: expect.objectContaining({
                    id: 'emp-1',
                    name: 'Alice',
                    current_employment: [mockEmploymentHistory[0]],
                    employment_history: [mockEmploymentHistory[1]],
                    comments: mockComments,
                    average_rating: 5,
                    comment_count: 1
                })
            });
        });
        it('should return 404 for non-existent employee', async () => {
            const selectMock = jest.fn().mockReturnThis();
            const eqMock = jest.fn().mockReturnThis();
            const singleMock = jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' }
            });
            supabase_1.supabase.from.mockReturnValue({
                select: selectMock.mockReturnValue({
                    eq: eqMock.mockReturnValue({
                        single: singleMock
                    })
                })
            });
            mockRequest.params = { id: 'non-existent' };
            await (0, employeeController_1.getEmployee)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Employee not found' });
        });
    });
    describe('createEmployee', () => {
        it('should create employee with establishment employment', async () => {
            const mockEmployeeData = {
                name: 'New Employee',
                nickname: 'Nick',
                age: 22,
                nationality: ['Thai'], // v10.4: must be array
                description: 'Test description',
                photos: ['https://example.com/photo1.jpg'],
                social_media: { instagram: '@test' },
                current_establishment_id: 'est-1',
                position: 'Dancer',
                start_date: '2025-01-01'
            };
            mockRequest.body = mockEmployeeData;
            // Mock employee insert using helper
            const employeeBuilder = createQueryBuilder({
                data: { id: 'emp-new', ...mockEmployeeData },
                error: null
            });
            // Mock employment history insert
            const employmentBuilder = createQueryBuilder({ error: null });
            // Mock moderation queue insert
            const moderationBuilder = createQueryBuilder({ error: null });
            supabase_1.supabase.from
                .mockReturnValueOnce(employeeBuilder)
                .mockReturnValueOnce(employmentBuilder)
                .mockReturnValueOnce(moderationBuilder);
            await (0, employeeController_1.createEmployee)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Employee profile submitted for approval',
                employee: expect.objectContaining({
                    id: 'emp-new',
                    name: 'New Employee'
                })
            });
        });
        it('should create employee with freelance position', async () => {
            const mockEmployeeData = {
                name: 'Freelance Employee',
                photos: ['https://example.com/photo1.jpg'],
                is_freelance: true, // v10.3: freelance flag
                current_establishment_ids: ['est-1', 'est-2'] // v10.3: multiple nightclubs
            };
            mockRequest.body = mockEmployeeData;
            // Mock employee insert
            const employeeBuilder = createQueryBuilder({
                data: { id: 'emp-freelance', ...mockEmployeeData },
                error: null
            });
            // Mock employment history insert (for multiple nightclubs)
            const employmentBuilder = createQueryBuilder({ error: null });
            // Mock moderation queue insert
            const moderationBuilder = createQueryBuilder({ error: null });
            supabase_1.supabase.from
                .mockReturnValueOnce(employeeBuilder)
                .mockReturnValueOnce(employmentBuilder)
                .mockReturnValueOnce(moderationBuilder);
            await (0, employeeController_1.createEmployee)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Employee profile submitted for approval',
                employee: expect.objectContaining({
                    id: 'emp-freelance',
                    name: 'Freelance Employee'
                })
            });
        });
        it('should return 400 for missing required fields', async () => {
            mockRequest.body = { name: 'Test' }; // Missing photos
            // Mock validateImageUrls to return error for missing photos
            validation_1.validateImageUrls.mockReturnValueOnce({
                valid: false,
                error: 'At least 1 photo is required'
            });
            await (0, employeeController_1.createEmployee)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'At least 1 photo is required',
                code: 'INVALID_PHOTO_URLS'
            });
        });
        it('should return 400 for too many photos', async () => {
            mockRequest.body = {
                name: 'Test',
                photos: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] // 6 photos (max is 5)
            };
            // Mock validateImageUrls to return error for too many photos
            validation_1.validateImageUrls.mockReturnValueOnce({
                valid: false,
                error: 'Maximum 5 photos allowed'
            });
            await (0, employeeController_1.createEmployee)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Maximum 5 photos allowed',
                code: 'INVALID_PHOTO_URLS'
            });
        });
        it('should return 400 when both establishment and freelance provided', async () => {
            mockRequest.body = {
                name: 'Test',
                photos: ['https://example.com/p1.jpg'],
                is_freelance: false, // Not freelance
                current_establishment_id: 'est-1', // Single establishment
                current_establishment_ids: ['est-2', 'est-3'] // Multiple establishments (conflict)
            };
            // Mock validateFreelanceRules to return error for conflicting inputs
            jest.spyOn(freelanceValidation, 'validateFreelanceRules').mockResolvedValueOnce({
                valid: false,
                error: 'Cannot provide both single establishment and multiple establishments'
            });
            await (0, employeeController_1.createEmployee)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Cannot provide both single establishment and multiple establishments'
            });
        });
        it('should return 400 when freelance works at non-nightclub establishment', async () => {
            mockRequest.body = {
                name: 'Test Freelance',
                photos: ['https://example.com/p1.jpg'],
                is_freelance: true,
                current_establishment_ids: ['bar-est-1'] // Not a nightclub
            };
            // Mock validateFreelanceRules to return error for non-nightclub
            jest.spyOn(freelanceValidation, 'validateFreelanceRules').mockResolvedValueOnce({
                valid: false,
                error: 'Freelance employees can only work at Nightclub establishments'
            });
            await (0, employeeController_1.createEmployee)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Freelance employees can only work at Nightclub establishments'
            });
        });
    });
    describe('updateEmployee', () => {
        it('should allow creator to update own employee', async () => {
            mockRequest.params = { id: 'emp-1' };
            mockRequest.body = {
                name: 'Updated Name',
                nationality: ['Thai'],
                photos: ['https://example.com/photo.jpg']
            };
            // Mock getEmployee
            const employeeBuilder = createQueryBuilder({
                data: { id: 'emp-1', created_by: 'user-123', status: 'approved', is_freelance: false },
                error: null
            });
            // Mock update
            const updateBuilder = createQueryBuilder({
                data: { id: 'emp-1', name: 'Updated Name', status: 'pending' },
                error: null
            });
            // Mock user_favorites query
            const favoritesBuilder = createQueryBuilder({
                data: [],
                error: null
            });
            supabase_1.supabase.from
                .mockReturnValueOnce(employeeBuilder)
                .mockReturnValueOnce(updateBuilder)
                .mockReturnValueOnce(favoritesBuilder);
            await (0, employeeController_1.updateEmployee)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Employee updated successfully',
                employee: expect.objectContaining({ id: 'emp-1' })
            });
        });
        it('should allow admin to update any employee without pending status', async () => {
            mockRequest.user.role = 'admin';
            mockRequest.params = { id: 'emp-2' };
            mockRequest.body = { name: 'Admin Updated' };
            // Mock getEmployee (different creator)
            const employeeBuilder = createQueryBuilder({
                data: { id: 'emp-2', created_by: 'other-user', status: 'approved', is_freelance: false },
                error: null
            });
            // Mock update
            const updateBuilder = createQueryBuilder({
                data: { id: 'emp-2', name: 'Admin Updated', status: 'approved' },
                error: null
            });
            // Mock user_favorites query
            const favoritesBuilder = createQueryBuilder({
                data: [],
                error: null
            });
            supabase_1.supabase.from
                .mockReturnValueOnce(employeeBuilder)
                .mockReturnValueOnce(updateBuilder)
                .mockReturnValueOnce(favoritesBuilder);
            await (0, employeeController_1.updateEmployee)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Employee updated successfully',
                employee: expect.objectContaining({ id: 'emp-2' })
            });
        });
        it('should deny update for non-owner non-admin user', async () => {
            mockRequest.params = { id: 'emp-3' };
            mockRequest.body = { name: 'Unauthorized Update' };
            // Mock getEmployee (different creator, not admin)
            const employeeBuilder = createQueryBuilder({
                data: { id: 'emp-3', created_by: 'other-user', status: 'approved' },
                error: null
            });
            supabase_1.supabase.from.mockReturnValueOnce(employeeBuilder);
            await (0, employeeController_1.updateEmployee)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(403);
        });
        it('should return 404 for non-existent employee', async () => {
            mockRequest.params = { id: 'emp-nonexistent' };
            mockRequest.body = { name: 'Test' };
            // Mock getEmployee (not found)
            const employeeBuilder = createQueryBuilder({
                data: null,
                error: { message: 'Not found' }
            });
            supabase_1.supabase.from.mockReturnValueOnce(employeeBuilder);
            await (0, employeeController_1.updateEmployee)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(404);
        });
        it('should toggle freelance mode and deactivate employment', async () => {
            mockRequest.params = { id: 'emp-4' };
            mockRequest.body = { is_freelance: true }; // Toggle to freelance
            // Mock getEmployee
            const employeeBuilder = createQueryBuilder({
                data: { id: 'emp-4', created_by: 'user-123', is_freelance: false, status: 'approved' },
                error: null
            });
            // Mock update
            const updateBuilder = createQueryBuilder({
                data: { id: 'emp-4', is_freelance: true, status: 'pending' },
                error: null
            });
            // Mock user_favorites query
            const favoritesBuilder = createQueryBuilder({
                data: [],
                error: null
            });
            supabase_1.supabase.from
                .mockReturnValueOnce(employeeBuilder)
                .mockReturnValueOnce(updateBuilder)
                .mockReturnValueOnce(favoritesBuilder);
            await (0, employeeController_1.updateEmployee)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Employee updated successfully',
                employee: expect.objectContaining({ id: 'emp-4' })
            });
        });
    });
    describe('deleteEmployee', () => {
        it('should allow creator to delete own employee', async () => {
            mockRequest.params = { id: 'emp-1' };
            // Mock getEmployee
            const employeeBuilder = createQueryBuilder({
                data: { id: 'emp-1', created_by: 'user-123' },
                error: null
            });
            // Mock delete
            const deleteBuilder = createQueryBuilder({ error: null });
            supabase_1.supabase.from
                .mockReturnValueOnce(employeeBuilder)
                .mockReturnValueOnce(deleteBuilder);
            await (0, employeeController_1.deleteEmployee)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Employee deleted successfully'
            });
        });
        it('should allow admin to delete any employee', async () => {
            mockRequest.user.role = 'admin';
            mockRequest.params = { id: 'emp-2' };
            // Mock getEmployee (different creator)
            const employeeBuilder = createQueryBuilder({
                data: { id: 'emp-2', created_by: 'other-user' },
                error: null
            });
            // Mock delete
            const deleteBuilder = createQueryBuilder({ error: null });
            supabase_1.supabase.from
                .mockReturnValueOnce(employeeBuilder)
                .mockReturnValueOnce(deleteBuilder);
            await (0, employeeController_1.deleteEmployee)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Employee deleted successfully'
            });
        });
        it('should deny delete for non-owner non-admin user', async () => {
            mockRequest.params = { id: 'emp-3' };
            // Mock getEmployee (different creator, not admin)
            const employeeBuilder = createQueryBuilder({
                data: { id: 'emp-3', created_by: 'other-user' },
                error: null
            });
            supabase_1.supabase.from.mockReturnValueOnce(employeeBuilder);
            await (0, employeeController_1.deleteEmployee)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(403);
        });
        it('should return 404 for non-existent employee', async () => {
            mockRequest.params = { id: 'emp-nonexistent' };
            // Mock getEmployee (not found)
            const employeeBuilder = createQueryBuilder({
                data: null,
                error: { message: 'Not found' }
            });
            supabase_1.supabase.from.mockReturnValueOnce(employeeBuilder);
            await (0, employeeController_1.deleteEmployee)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(404);
        });
    });
    describe('addEmployment', () => {
        it('should add employment history entry', async () => {
            mockRequest.params = { id: 'emp-1' };
            mockRequest.body = {
                establishment_id: 'est-1',
                position: 'Dancer',
                start_date: '2025-01-01'
            };
            // Mock update (deactivate current employment)
            const updateBuilder = createQueryBuilder({ error: null });
            // Mock insert
            const insertBuilder = createQueryBuilder({
                data: {
                    id: 'emp-hist-1',
                    employee_id: 'emp-1',
                    establishment_id: 'est-1',
                    position: 'Dancer'
                },
                error: null
            });
            supabase_1.supabase.from
                .mockReturnValueOnce(updateBuilder)
                .mockReturnValueOnce(insertBuilder);
            await (0, employeeController_1.addEmployment)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(201);
        });
        it('should return 400 for missing required fields', async () => {
            mockRequest.params = { id: 'emp-1' };
            mockRequest.body = { position: 'Dancer' }; // Missing establishment_id and start_date
            await (0, employeeController_1.addEmployment)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Establishment and start date are required'
            });
        });
    });
    describe('getEmployeeNameSuggestions', () => {
        it('should return suggestions for search query', async () => {
            mockRequest.query = { q: 'ali' };
            // Mock names query
            const namesBuilder = createQueryBuilder({
                data: [
                    { name: 'Alice' },
                    { name: 'Alison' }
                ],
                error: null
            });
            // Mock nicknames query
            const nicknamesBuilder = createQueryBuilder({
                data: [
                    { nickname: 'Ali' }
                ],
                error: null
            });
            supabase_1.supabase.from
                .mockReturnValueOnce(namesBuilder)
                .mockReturnValueOnce(nicknamesBuilder);
            await (0, employeeController_1.getEmployeeNameSuggestions)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                suggestions: expect.arrayContaining(['Ali', 'Alice', 'Alison'])
            });
        });
        it('should return empty array for empty query', async () => {
            mockRequest.query = {};
            await (0, employeeController_1.getEmployeeNameSuggestions)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({ suggestions: [] });
        });
    });
    describe('createOwnEmployeeProfile (Employee Claim System v10.0)', () => {
        it('should create self-managed employee profile', async () => {
            mockRequest.body = {
                name: 'Self Created',
                photos: ['https://example.com/photo.jpg']
            };
            // Mock check user has no linked_employee_id
            const userCheckBuilder = createQueryBuilder({
                data: { id: 'user-123', linked_employee_id: null, account_type: 'user' },
                error: null
            });
            // Mock create employee
            const employeeBuilder = createQueryBuilder({
                data: { id: 'emp-new', name: 'Self Created', user_id: 'user-123', is_self_profile: true },
                error: null
            });
            // Mock update user to link employee
            const userUpdateBuilder = createQueryBuilder({ error: null });
            // Mock insert moderation_queue
            const moderationBuilder = createQueryBuilder({ error: null });
            supabase_1.supabase.from
                .mockReturnValueOnce(userCheckBuilder)
                .mockReturnValueOnce(employeeBuilder)
                .mockReturnValueOnce(userUpdateBuilder)
                .mockReturnValueOnce(moderationBuilder);
            await (0, employeeController_1.createOwnEmployeeProfile)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(201);
        });
        it('should return 409 if user already has linked profile', async () => {
            mockRequest.body = {
                name: 'Test',
                photos: ['https://example.com/photo.jpg']
            };
            // Mock check existing link in users table
            const userCheckBuilder = createQueryBuilder({
                data: { id: 'user-123', linked_employee_id: 'emp-existing', account_type: 'employee' },
                error: null
            });
            supabase_1.supabase.from.mockReturnValueOnce(userCheckBuilder);
            await (0, employeeController_1.createOwnEmployeeProfile)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(409);
        });
    });
    describe('claimEmployeeProfile (Employee Claim System v10.0)', () => {
        it('should create claim request for existing profile', async () => {
            mockRequest.params = { employeeId: 'emp-1' };
            mockRequest.body = {
                message: 'This is my profile, I have proof documents'
            };
            // Mock check user has no linked profile
            const userCheckBuilder = createQueryBuilder({
                data: { id: 'user-123', linked_employee_id: null },
                error: null
            });
            // Mock check employee exists
            const employeeBuilder = createQueryBuilder({
                data: { id: 'emp-1', name: 'Test Employee', user_id: null },
                error: null
            });
            // Mock check no existing pending claim
            const existingClaimBuilder = createQueryBuilder({
                data: null,
                error: { code: 'PGRST116' }
            });
            // Mock admin users for notifications
            const adminBuilder = createQueryBuilder({
                data: [{ id: 'admin-1' }],
                error: null
            });
            // Mock notification insert
            const notificationBuilder = createQueryBuilder({
                data: null,
                error: null
            });
            supabase_1.supabase.from
                .mockReturnValueOnce(userCheckBuilder)
                .mockReturnValueOnce(employeeBuilder)
                .mockReturnValueOnce(existingClaimBuilder)
                .mockReturnValueOnce(adminBuilder)
                .mockReturnValueOnce(notificationBuilder);
            // Mock RPC call for claim creation (now uses RPC instead of direct insert)
            supabase_1.supabase.rpc = jest.fn().mockResolvedValue({
                data: 'claim-1',
                error: null
            });
            await (0, employeeController_1.claimEmployeeProfile)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(201);
        });
        it('should return 400 for too short message', async () => {
            mockRequest.body = {
                employee_id: 'emp-1',
                message: 'short' // Less than 20 chars
            };
            await (0, employeeController_1.claimEmployeeProfile)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
        });
        it('should return 409 if employee already linked', async () => {
            mockRequest.body = {
                employee_id: 'emp-1',
                message: 'Valid message with more than 20 characters here'
            };
            // Mock check employee exists
            const employeeBuilder = createQueryBuilder({
                data: { id: 'emp-1' },
                error: null
            });
            // Mock check existing link (found)
            const linkCheckBuilder = createQueryBuilder({
                data: { user_id: 'other-user', employee_id: 'emp-1' },
                error: null
            });
            supabase_1.supabase.from
                .mockReturnValueOnce(employeeBuilder)
                .mockReturnValueOnce(linkCheckBuilder);
            await (0, employeeController_1.claimEmployeeProfile)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(409);
        });
    });
    describe('getMyLinkedProfile', () => {
        it('should return linked employee profile', async () => {
            // Mock get user with linked_employee_id
            const userBuilder = createQueryBuilder({
                data: { id: 'user-123', linked_employee_id: 'emp-1' },
                error: null
            });
            // Mock get employee
            const employeeBuilder = createQueryBuilder({
                data: { id: 'emp-1', name: 'Linked Employee' },
                error: null
            });
            // Mock get employment history
            const historyBuilder = createQueryBuilder({
                data: [],
                error: null
            });
            // Mock get comments
            const commentsBuilder = createQueryBuilder({
                data: [],
                error: null
            });
            supabase_1.supabase.from
                .mockReturnValueOnce(userBuilder)
                .mockReturnValueOnce(employeeBuilder)
                .mockReturnValueOnce(historyBuilder)
                .mockReturnValueOnce(commentsBuilder);
            await (0, employeeController_1.getMyLinkedProfile)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                id: 'emp-1',
                name: 'Linked Employee',
                current_employment: [],
                employment_history: [],
                comments: [],
                average_rating: null,
                comment_count: 0
            }));
        });
        it('should return 404 if user has no linked profile', async () => {
            // Mock get user without linked_employee_id
            const userBuilder = createQueryBuilder({
                data: { id: 'user-123', linked_employee_id: null },
                error: null
            });
            supabase_1.supabase.from.mockReturnValueOnce(userBuilder);
            await (0, employeeController_1.getMyLinkedProfile)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(404);
        });
    });
    describe('getClaimRequests (Admin)', () => {
        it('should return claim requests for admin', async () => {
            mockRequest.user.role = 'admin';
            mockRequest.query = {};
            // Mock get claim requests from moderation_queue
            const claimsBuilder = createQueryBuilder({
                data: [
                    {
                        id: 'claim-1',
                        item_id: 'emp-1',
                        item_type: 'employee_claim',
                        status: 'pending',
                        submitted_by: 'user-456'
                    }
                ],
                error: null
            });
            // 🔧 FIX C4: Mock batch IN query for employees (not individual fetches)
            const employeesBuilder = createQueryBuilder({
                data: [{ id: 'emp-1', name: 'Test Employee', nickname: null, photos: [] }],
                error: null
            });
            supabase_1.supabase.from
                .mockReturnValueOnce(claimsBuilder)
                .mockReturnValueOnce(employeesBuilder);
            await (0, employeeController_1.getClaimRequests)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                claims: expect.arrayContaining([
                    expect.objectContaining({
                        id: 'claim-1',
                        employee: expect.objectContaining({ id: 'emp-1' })
                    })
                ]),
                total: 1
            });
        });
        it('should deny access for non-admin', async () => {
            await (0, employeeController_1.getClaimRequests)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(403);
        });
    });
    describe('approveClaimRequest (Admin)', () => {
        it('should approve claim and create user-employee link', async () => {
            mockRequest.user.role = 'admin';
            mockRequest.params = { claimId: 'claim-1' };
            // Mock get claim
            const claimBuilder = createQueryBuilder({
                data: { id: 'claim-1', user_id: 'user-456', employee_id: 'emp-1', status: 'pending' },
                error: null
            });
            // Mock update claim status
            const updateClaimBuilder = createQueryBuilder({
                data: { id: 'claim-1', status: 'approved' },
                error: null
            });
            // Mock create link
            const linkBuilder = createQueryBuilder({
                data: { user_id: 'user-456', employee_id: 'emp-1' },
                error: null
            });
            supabase_1.supabase.from
                .mockReturnValueOnce(claimBuilder)
                .mockReturnValueOnce(updateClaimBuilder)
                .mockReturnValueOnce(linkBuilder);
            await (0, employeeController_1.approveClaimRequest)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Claim request approved successfully. User and employee are now linked.',
                success: true
            });
        });
        it('should deny access for non-admin', async () => {
            mockRequest.params = { claimId: 'claim-1' };
            await (0, employeeController_1.approveClaimRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(403);
        });
    });
    describe('rejectClaimRequest (Admin)', () => {
        it('should reject claim with reason', async () => {
            mockRequest.user.role = 'admin';
            mockRequest.params = { claimId: 'claim-1' };
            mockRequest.body = { moderator_notes: 'Insufficient proof documents provided' };
            // Mock RPC call to reject claim
            supabase_1.supabase.rpc.mockResolvedValueOnce({
                data: true,
                error: null
            });
            // 🔧 FIX C2: Mock additional queries for rejection notification
            // 1. Fetch claim data
            const claimBuilder = createQueryBuilder({
                data: {
                    id: 'claim-1',
                    item_id: 'emp-1',
                    submitted_by: 'user-456',
                    request_metadata: { claim_type: 'claim_existing' }
                },
                error: null
            });
            // 2. Fetch employee name
            const employeeBuilder = createQueryBuilder({
                data: { name: 'Test Employee' },
                error: null
            });
            // 3. Insert notification
            const notificationBuilder = createQueryBuilder({
                data: { id: 'notif-1' },
                error: null
            });
            supabase_1.supabase.from
                .mockReturnValueOnce(claimBuilder)
                .mockReturnValueOnce(employeeBuilder)
                .mockReturnValueOnce(notificationBuilder);
            await (0, employeeController_1.rejectClaimRequest)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Claim request rejected successfully.',
                success: true
            });
        });
        it('should return 400 for too short rejection reason', async () => {
            mockRequest.user.role = 'admin';
            mockRequest.params = { claimId: 'claim-1' };
            mockRequest.body = { reason: 'short' };
            await (0, employeeController_1.rejectClaimRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
        });
        it('should deny access for non-admin', async () => {
            mockRequest.params = { claimId: 'claim-1' };
            mockRequest.body = { reason: 'Valid reason with sufficient length here' };
            await (0, employeeController_1.rejectClaimRequest)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(403);
        });
    });
});
//# sourceMappingURL=employeeController.test.js.map