import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  addEmployment,
  getEmployeeNameSuggestions,
  searchEmployees,
  createOwnEmployeeProfile,
  claimEmployeeProfile,
  getMyLinkedProfile,
  getClaimRequests,
  approveClaimRequest,
  rejectClaimRequest
} from '../employeeController';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { validateImageUrls } from '../../utils/validation';
import * as freelanceValidation from '../../utils/freelanceValidation';
import * as notificationHelper from '../../utils/notificationHelper';

// Mock next function for asyncHandler wrapped controllers
const mockNext: NextFunction = jest.fn();

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('../../utils/validation', () => ({
  validateImageUrls: jest.fn().mockReturnValue({ valid: true, urls: [] }),
  validateUrlArray: jest.fn().mockReturnValue([]),
  escapeLikeWildcards: jest.fn((input: string) => input || ''), // Return input unchanged for tests
}));
jest.mock('../../utils/freelanceValidation');
jest.mock('../../utils/notificationHelper');

describe('EmployeeController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  // Helper to create a flexible query builder mock that can be both chainable and promisable
  const createQueryBuilder = (finalResult: any) => {
    // Create a thenable object that resolves to finalResult
    const promise = Promise.resolve(finalResult);

    const builder: any = {
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
    // Clear all mock calls and reset implementations
    jest.clearAllMocks();
    
    // Reset supabase.from to clear any leftover mockReturnValueOnce queues
    // while keeping it as a usable mock function
    (supabase.from as jest.Mock).mockReset();
    (supabase.rpc as jest.Mock).mockReset();

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

    // Reset and mock validation helpers
    (validateImageUrls as jest.Mock).mockReset();
    (validateImageUrls as jest.Mock).mockReturnValue({ valid: true, error: null });
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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(employeesBuilder)
        .mockReturnValueOnce(ratingsBuilder)
        .mockReturnValueOnce(votesBuilder);

      mockRequest.query = { status: 'approved', page: '1', limit: '20' };

      await getEmployees(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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
      (supabase.from as jest.Mock).mockReturnValue(builder);

      await getEmployees(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(builder.ilike).toHaveBeenCalledWith('nationality', '%thai%');
    });

    it('should filter employees by age range', async () => {
      mockRequest.query = { status: 'approved', age_min: '18', age_max: '30' };

      const builder = createQueryBuilder({ data: [], error: null, count: 0 });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      await getEmployees(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(builder.gte).toHaveBeenCalledWith('age', 18);
      expect(builder.lte).toHaveBeenCalledWith('age', 30);
    });

    it('should search employees by name/nickname/description', async () => {
      mockRequest.query = { status: 'approved', search: 'alice' };

      const builder = createQueryBuilder({ data: [], error: null, count: 0 });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      await getEmployees(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(builder.or).toHaveBeenCalledWith('name.ilike.%alice%,nickname.ilike.%alice%,description.ilike.%alice%');
    });

    it('should handle database errors', async () => {
      const builder = createQueryBuilder({ data: null, error: { message: 'Database error' } });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      await getEmployees(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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

      (supabase.from as jest.Mock).mockReturnValueOnce({
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

      (supabase.from as jest.Mock).mockReturnValueOnce({
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

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: commentsSelectMock.mockReturnValue({
          eq: commentsEqMock.mockReturnValue({
            eq: commentsEq2Mock.mockReturnValue({
              order: commentsOrderMock
            })
          })
        })
      });

      // Mock votes query (employee_existence_votes)
      const votesSelectMock = jest.fn().mockReturnThis();
      const votesEqMock = jest.fn().mockResolvedValue({
        data: [],
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: votesSelectMock.mockReturnValue({
          eq: votesEqMock
        })
      });

      mockRequest.params = { id: 'emp-1' };

      await getEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        employee: expect.objectContaining({
          id: 'emp-1',
          name: 'Alice',
          current_employment: [mockEmploymentHistory[0]],
          employment_history: [mockEmploymentHistory[1]],
          comments: mockComments,
          average_rating: 5,
          comment_count: 1,
          vote_count: 0  // v10.x: New field
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

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      mockRequest.params = { id: 'non-existent' };

      await getEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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
        sex: 'female', // v10.x: required field
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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(employmentBuilder)
        .mockReturnValueOnce(moderationBuilder);

      await createEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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
        sex: 'female', // v10.x: required field
        photos: ['https://example.com/photo1.jpg'],
        is_freelance: true,  // v10.3: freelance flag
        current_establishment_ids: ['est-1', 'est-2']  // v10.3: multiple nightclubs
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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(employmentBuilder)
        .mockReturnValueOnce(moderationBuilder);

      await createEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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
      mockRequest.body = { name: 'Test', sex: 'female' }; // Missing photos

      // Mock validateImageUrls to return error for missing photos
      (validateImageUrls as jest.Mock).mockReturnValueOnce({
        valid: false,
        error: 'At least 1 photo is required'
      });

      await createEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('photo')
        })
      );
    });

    it('should return 400 for too many photos', async () => {
      mockRequest.body = {
        name: 'Test',
        sex: 'female', // v10.x: required field
        photos: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] // 6 photos (max is 5)
      };

      // Mock validateImageUrls to return error for too many photos
      (validateImageUrls as jest.Mock).mockReturnValueOnce({
        valid: false,
        error: 'Maximum 5 photos allowed'
      });

      await createEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('5')
        })
      );
    });

    it('should return 400 when both establishment and freelance provided', async () => {
      mockRequest.body = {
        name: 'Test',
        sex: 'female', // v10.x: required field
        photos: ['https://example.com/p1.jpg'],
        is_freelance: false,  // Not freelance
        current_establishment_id: 'est-1',  // Single establishment
        current_establishment_ids: ['est-2', 'est-3']  // Multiple establishments (conflict)
      };

      // Mock validateFreelanceRules to return error for conflicting inputs
      jest.spyOn(freelanceValidation, 'validateFreelanceRules').mockResolvedValueOnce({
        valid: false,
        error: 'Cannot provide both single establishment and multiple establishments'
      });

      await createEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Cannot provide both single establishment and multiple establishments'
      });
    });

    it('should return 400 when freelance works at non-nightclub establishment', async () => {
      mockRequest.body = {
        name: 'Test Freelance',
        sex: 'female', // v10.x: required field
        photos: ['https://example.com/p1.jpg'],
        is_freelance: true,
        current_establishment_ids: ['bar-est-1']  // Not a nightclub
      };

      // Mock validateFreelanceRules to return error for non-nightclub
      jest.spyOn(freelanceValidation, 'validateFreelanceRules').mockResolvedValueOnce({
        valid: false,
        error: 'Freelance employees can only work at Nightclub establishments'
      });

      await createEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(updateBuilder)
        .mockReturnValueOnce(favoritesBuilder);

      await updateEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Employee updated successfully',
        employee: expect.objectContaining({ id: 'emp-1' })
      });
    });

    it('should allow admin to update any employee without pending status', async () => {
      mockRequest.user!.role = 'admin';
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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(updateBuilder)
        .mockReturnValueOnce(favoritesBuilder);

      await updateEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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

      (supabase.from as jest.Mock).mockReturnValueOnce(employeeBuilder);

      await updateEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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

      (supabase.from as jest.Mock).mockReturnValueOnce(employeeBuilder);

      await updateEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should toggle freelance mode and deactivate employment', async () => {
      mockRequest.params = { id: 'emp-4' };
      mockRequest.body = { is_freelance: true };  // Toggle to freelance

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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(updateBuilder)
        .mockReturnValueOnce(favoritesBuilder);

      await updateEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(deleteBuilder);

      await deleteEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Employee deleted successfully'
      });
    });

    it('should allow admin to delete any employee', async () => {
      mockRequest.user!.role = 'admin';
      mockRequest.params = { id: 'emp-2' };

      // Mock getEmployee (different creator)
      const employeeBuilder = createQueryBuilder({
        data: { id: 'emp-2', created_by: 'other-user' },
        error: null
      });

      // Mock delete
      const deleteBuilder = createQueryBuilder({ error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(deleteBuilder);

      await deleteEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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

      (supabase.from as jest.Mock).mockReturnValueOnce(employeeBuilder);

      await deleteEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should return 404 for non-existent employee', async () => {
      mockRequest.params = { id: 'emp-nonexistent' };

      // Mock getEmployee (not found)
      const employeeBuilder = createQueryBuilder({
        data: null,
        error: { message: 'Not found' }
      });

      (supabase.from as jest.Mock).mockReturnValueOnce(employeeBuilder);

      await deleteEmployee(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(updateBuilder)
        .mockReturnValueOnce(insertBuilder);

      await addEmployment(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.params = { id: 'emp-1' };
      mockRequest.body = { position: 'Dancer' }; // Missing establishment_id and start_date

      await addEmployment(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(namesBuilder)
        .mockReturnValueOnce(nicknamesBuilder);

      await getEmployeeNameSuggestions(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        suggestions: expect.arrayContaining(['Ali', 'Alice', 'Alison'])
      });
    });

    it('should return empty array for empty query', async () => {
      mockRequest.query = {};

      await getEmployeeNameSuggestions(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({ suggestions: [] });
    });
  });

  describe('createOwnEmployeeProfile (Employee Claim System v10.0)', () => {
    it('should create self-managed employee profile', async () => {
      mockRequest.body = {
        name: 'Self Created',
        sex: 'female',
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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(userCheckBuilder)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(userUpdateBuilder)
        .mockReturnValueOnce(moderationBuilder);

      await createOwnEmployeeProfile(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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

      (supabase.from as jest.Mock).mockReturnValueOnce(userCheckBuilder);

      await createOwnEmployeeProfile(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(userCheckBuilder)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(existingClaimBuilder)
        .mockReturnValueOnce(adminBuilder)
        .mockReturnValueOnce(notificationBuilder);

      // Mock RPC call for claim creation (now uses RPC instead of direct insert)
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: 'claim-1',
        error: null
      });

      await claimEmployeeProfile(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should return 400 for too short message', async () => {
      mockRequest.body = {
        employee_id: 'emp-1',
        message: 'short'  // Less than 20 chars
      };

      await claimEmployeeProfile(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(linkCheckBuilder);

      await claimEmployeeProfile(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(userBuilder)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(historyBuilder)
        .mockReturnValueOnce(commentsBuilder);

      await getMyLinkedProfile(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'emp-1',
          name: 'Linked Employee',
          current_employment: [],
          employment_history: [],
          comments: [],
          average_rating: null,
          comment_count: 0
        })
      );
    });

    it('should return 404 if user has no linked profile', async () => {
      // Mock get user without linked_employee_id
      const userBuilder = createQueryBuilder({
        data: { id: 'user-123', linked_employee_id: null },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce(userBuilder);

      await getMyLinkedProfile(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('getClaimRequests (Admin)', () => {
    it('should return claim requests for admin', async () => {
      mockRequest.user!.role = 'admin';
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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(claimsBuilder)
        .mockReturnValueOnce(employeesBuilder);

      await getClaimRequests(mockRequest as AuthRequest, mockResponse as Response, mockNext);

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
      await getClaimRequests(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('approveClaimRequest (Admin)', () => {
    it('should approve claim and create user-employee link', async () => {
      mockRequest.user!.role = 'admin';
      mockRequest.params = { claimId: 'claim-1' };

      // Mock get claim from moderation_queue
      const claimBuilder = createQueryBuilder({
        data: {
          id: 'claim-1',
          item_id: 'emp-1',
          item_type: 'employee_claim',
          submitted_by: 'user-456',
          status: 'pending',
          request_metadata: { claim_type: 'claim_existing' }  // Not self_profile
        },
        error: null
      });

      // Mock RPC for approving claim
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
        data: true,
        error: null
      });

      // Mock get employee name for notification
      const employeeBuilder = createQueryBuilder({
        data: { name: 'Test Employee' },
        error: null
      });

      // Mock insert notification
      const notificationBuilder = createQueryBuilder({
        data: { id: 'notif-1' },
        error: null
      });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(claimBuilder)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(notificationBuilder);

      await approveClaimRequest(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Claim request approved successfully. User and employee are now linked.',
        success: true
      });
    });

    it('should deny access for non-admin', async () => {
      mockRequest.params = { claimId: 'claim-1' };

      await approveClaimRequest(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('rejectClaimRequest (Admin)', () => {
    it('should reject claim with reason', async () => {
      mockRequest.user!.role = 'admin';
      mockRequest.params = { claimId: 'claim-1' };
      mockRequest.body = { moderator_notes: 'Insufficient proof documents provided' };

      // Mock RPC call to reject claim
      (supabase.rpc as jest.Mock).mockResolvedValueOnce({
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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(claimBuilder)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(notificationBuilder);

      await rejectClaimRequest(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Claim request rejected successfully.',
        success: true
      });
    });

    it('should return 400 for too short rejection reason', async () => {
      mockRequest.user!.role = 'admin';
      mockRequest.params = { claimId: 'claim-1' };
      mockRequest.body = { reason: 'short' };

      await rejectClaimRequest(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should deny access for non-admin', async () => {
      mockRequest.params = { claimId: 'claim-1' };
      mockRequest.body = { reason: 'Valid reason with sufficient length here' };

      await rejectClaimRequest(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});
