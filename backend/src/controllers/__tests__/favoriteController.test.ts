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

import { Request, Response, NextFunction } from 'express';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite
} from '../favoriteController';
import { logger } from '../../utils/logger';

// Mock next function for asyncHandler wrapped controllers
const mockNext: NextFunction = jest.fn();

// Import mock helpers
import { createMockQueryBuilder, mockSuccess, mockNotFound, mockError } from '../../config/__mocks__/supabase';

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
import { supabase } from '../../config/supabase';

describe('FavoriteController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

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
    } as any;

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

    // Reset supabase.from to plain mock
    supabase.from = jest.fn();
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

      const mockVotes = [{ employee_id: 'emp-1' }, { employee_id: 'emp-1' }, { employee_id: 'emp-1' }];

      const mockEmployee = {
        id: 'emp-1',
        name: 'Alice',
        nickname: 'Ali',
        age: 25,
        nationality: ['Thai'],
        photos: ['photo1.jpg'],
        description: 'Friendly',
        social_media: { instagram: '@alice' },
        is_verified: false,
        verified_at: null,
        is_vip: false,
        vip_expires_at: null
      };

      // Mock queries: 1) get favorites, 2) get employee, 3) get employment, 4) get ratings, 5) get votes
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockFavorites)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockEmployee)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockEmployment)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockRatings)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockVotes)));

      await getFavorites(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        favorites: expect.arrayContaining([
          expect.objectContaining({
            employee_id: 'emp-1',
            employee_name: 'Alice',
            employee_nickname: 'Ali',
            employee_rating: 4.5,
            employee_comment_count: 2,
            employee_vote_count: 3,
            current_establishment: expect.objectContaining({
              name: 'Test Bar',
              zone: 'walking_street'
            })
          })
        ]),
        count: 1
      }));
    });

    it('should return empty array when user has no favorites', async () => {
      // Mock all 4 queries: favorites, employment, comments, votes (even though last 3 will get empty arrays)
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])));

      await getFavorites(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        favorites: [],
        count: 0
      }));
    });

    it('should return 401 if user not authenticated', async () => {
      (mockRequest as any).user = undefined;

      await getFavorites(mockRequest as Request, mockResponse as Response, mockNext);

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
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound())) // No existing favorite
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockFavorite))) // Insert success
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockEmployee))) // Get employee
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockLinkedUser))) // Get linked user
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockCurrentUser))); // Get current user

      await addFavorite(mockRequest as Request, mockResponse as Response, mockNext);

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

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(existingFavorite))
      );

      await addFavorite(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('already')
        })
      );
    });

    it('should return 400 if employee_id is missing', async () => {
      mockRequest.body = {};

      await addFavorite(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('required')
        })
      );
    });

    it('should return 401 if user not authenticated', async () => {
      (mockRequest as any).user = undefined;
      mockRequest.body = { employee_id: 'emp-1' };

      await addFavorite(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Unauthorized')
        })
      );
    });
  });

  describe('removeFavorite', () => {
    it('should remove employee from favorites successfully', async () => {
      mockRequest.params = { employee_id: 'emp-1' };

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(null))
      );

      await removeFavorite(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Employee removed from favorites',
        is_favorite: false
      });
    });

    it('should handle removal even if favorite does not exist', async () => {
      mockRequest.params = { employee_id: 'non-existent' };

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(null))
      );

      await removeFavorite(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Employee removed from favorites',
        is_favorite: false
      });
    });

    it('should return 401 if user not authenticated', async () => {
      (mockRequest as any).user = undefined;
      mockRequest.params = { employee_id: 'emp-1' };

      await removeFavorite(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Unauthorized')
        })
      );
    });
  });

  describe('checkFavorite', () => {
    it('should return true when employee is favorited', async () => {
      mockRequest.params = { employee_id: 'emp-1' };

      const mockFavorite = { id: 'fav-1' };

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(mockFavorite))
      );

      await checkFavorite(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({ is_favorite: true });
    });

    it('should return false when employee is not favorited', async () => {
      mockRequest.params = { employee_id: 'emp-999' };

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );

      await checkFavorite(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({ is_favorite: false });
    });

    it('should return 401 if user not authenticated', async () => {
      (mockRequest as any).user = undefined;
      mockRequest.params = { employee_id: 'emp-1' };

      await checkFavorite(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });
});
