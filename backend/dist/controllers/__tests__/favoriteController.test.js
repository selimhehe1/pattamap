"use strict";
/**
 * 🧪 Favorite Controller Tests
 *
 * Tests for user favorites management
 * - getFavorites (3/3 tests ✅)
 * - addFavorite (4/4 tests ✅)
 * - removeFavorite (3/3 tests ✅)
 * - checkFavorite (3/3 tests ✅)
 *
 * CURRENT STATUS: 13/13 tests passing (100%) ✅
 *
 * Day 4 Sprint - Secondary Controllers Testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
const favoriteController_1 = require("../favoriteController");
// Import mock helpers
const supabase_1 = require("../../config/__mocks__/supabase");
// Mock dependencies with explicit factory for supabase
jest.mock('../../config/supabase', () => {
    const mockModule = jest.requireActual('../../config/__mocks__/supabase');
    return {
        supabase: mockModule.supabase,
        supabaseClient: mockModule.supabaseClient,
        createMockQueryBuilder: mockModule.createMockQueryBuilder,
        mockSuccess: mockModule.mockSuccess,
        mockNotFound: mockModule.mockNotFound,
        mockError: mockModule.mockError,
    };
});
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('../../utils/notificationHelper', () => ({
    notifyNewFavorite: jest.fn()
}));
// Import supabase AFTER jest.mock
const supabase_2 = require("../../config/supabase");
describe('FavoriteController', () => {
    let mockRequest;
    let mockResponse;
    let jsonMock;
    let statusMock;
    beforeEach(() => {
        jest.clearAllMocks();
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
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
        // Reset supabase.from to plain mock
        supabase_2.supabase.from = jest.fn();
    });
    describe('getFavorites', () => {
        it('should return user favorites with employee details', async () => {
            // Note: Supabase returns nested relations as arrays
            const mockFavorites = [
                {
                    id: 'fav-1',
                    employee_id: 'emp-1',
                    created_at: new Date().toISOString(),
                    employee: [{
                            id: 'emp-1',
                            name: 'Alice',
                            nickname: 'Ali',
                            age: 25,
                            nationality: ['Thai'],
                            photos: ['photo1.jpg'],
                            description: 'Friendly',
                            social_media: { instagram: '@alice' }
                        }]
                }
            ];
            // Note: Supabase returns nested relations as arrays
            const mockEmployment = [{
                    employee_id: 'emp-1',
                    establishment_id: 'est-1',
                    establishments: {
                        id: 'est-1',
                        name: 'Test Bar',
                        zone: 'walking_street',
                        address: '123 Main St'
                    }
                }];
            const mockRatings = [{ employee_id: 'emp-1', rating: 5 }, { employee_id: 'emp-1', rating: 4 }];
            // Mock queries: 1) get favorites, 2) get employment, 3) get ratings
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockFavorites)))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockEmployment)))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockRatings)));
            await (0, favoriteController_1.getFavorites)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                favorites: expect.arrayContaining([
                    expect.objectContaining({
                        employee_id: 'emp-1',
                        employee_name: 'Alice',
                        employee_nickname: 'Ali',
                        employee_rating: 4.5,
                        employee_comment_count: 2,
                        current_establishment: expect.objectContaining({
                            name: 'Test Bar',
                            zone: 'walking_street'
                        })
                    })
                ]),
                count: 1
            });
        });
        it('should return empty array when user has no favorites', async () => {
            // Mock all 3 queries: favorites, employment, comments (even though last 2 will get empty arrays)
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])))
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)([])));
            await (0, favoriteController_1.getFavorites)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                favorites: [],
                count: 0
            });
        });
        it('should return 401 if user not authenticated', async () => {
            mockRequest.user = undefined;
            await (0, favoriteController_1.getFavorites)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });
    });
    describe('addFavorite', () => {
        it('should add employee to favorites successfully', async () => {
            mockRequest.body = { employee_id: 'emp-1' };
            const mockFavorite = {
                id: 'fav-1',
                user_id: 'user-123',
                employee_id: 'emp-1',
                created_at: new Date().toISOString()
            };
            const mockEmployee = { name: 'Alice', id: 'emp-1' };
            const mockLinkedUser = { id: 'emp-user-1', account_type: 'employee', linked_employee_id: 'emp-1' };
            const mockCurrentUser = { pseudonym: 'testuser' };
            // Mock queries: 1) check existing, 2) insert, 3) get employee, 4) get linked user, 5) get current user
            supabase_2.supabase.from
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)())) // No existing favorite
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockFavorite))) // Insert success
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockEmployee))) // Get employee
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockLinkedUser))) // Get linked user
                .mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockCurrentUser))); // Get current user
            await (0, favoriteController_1.addFavorite)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Employee added to favorites',
                favorite: mockFavorite,
                is_favorite: true
            });
        });
        it('should return 409 if employee already in favorites', async () => {
            mockRequest.body = { employee_id: 'emp-1' };
            const existingFavorite = { id: 'fav-1' };
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(existingFavorite)));
            await (0, favoriteController_1.addFavorite)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(409);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Employee already in favorites',
                is_favorite: true
            });
        });
        it('should return 400 if employee_id is missing', async () => {
            mockRequest.body = {};
            await (0, favoriteController_1.addFavorite)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Employee ID is required' });
        });
        it('should return 401 if user not authenticated', async () => {
            mockRequest.user = undefined;
            mockRequest.body = { employee_id: 'emp-1' };
            await (0, favoriteController_1.addFavorite)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });
    });
    describe('removeFavorite', () => {
        it('should remove employee from favorites successfully', async () => {
            mockRequest.params = { employee_id: 'emp-1' };
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            await (0, favoriteController_1.removeFavorite)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Employee removed from favorites',
                is_favorite: false
            });
        });
        it('should handle removal even if favorite does not exist', async () => {
            mockRequest.params = { employee_id: 'non-existent' };
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(null)));
            await (0, favoriteController_1.removeFavorite)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Employee removed from favorites',
                is_favorite: false
            });
        });
        it('should return 401 if user not authenticated', async () => {
            mockRequest.user = undefined;
            mockRequest.params = { employee_id: 'emp-1' };
            await (0, favoriteController_1.removeFavorite)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });
    });
    describe('checkFavorite', () => {
        it('should return true when employee is favorited', async () => {
            mockRequest.params = { employee_id: 'emp-1' };
            const mockFavorite = { id: 'fav-1' };
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockSuccess)(mockFavorite)));
            await (0, favoriteController_1.checkFavorite)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({ is_favorite: true });
        });
        it('should return false when employee is not favorited', async () => {
            mockRequest.params = { employee_id: 'emp-999' };
            supabase_2.supabase.from.mockReturnValueOnce((0, supabase_1.createMockQueryBuilder)((0, supabase_1.mockNotFound)()));
            await (0, favoriteController_1.checkFavorite)(mockRequest, mockResponse);
            expect(jsonMock).toHaveBeenCalledWith({ is_favorite: false });
        });
        it('should return 401 if user not authenticated', async () => {
            mockRequest.user = undefined;
            mockRequest.params = { employee_id: 'emp-1' };
            await (0, favoriteController_1.checkFavorite)(mockRequest, mockResponse);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
        });
    });
});
//# sourceMappingURL=favoriteController.test.js.map