import { Response } from 'express';
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

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('../../utils/validation');
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
      or: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
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
    (validateImageUrls as jest.Mock).mockReturnValue({ valid: true, error: null });
    jest.spyOn(freelanceValidation, 'validateFreelanceRules').mockResolvedValue({ valid: true, error: null });
    (notificationHelper.notifyEmployeeUpdate as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (notificationHelper.notifyAdminsPendingContent as jest.Mock) = jest.fn().mockResolvedValue(undefined);
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

      await getEmployees(mockRequest as AuthRequest, mockResponse as Response);

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

      await getEmployees(mockRequest as AuthRequest, mockResponse as Response);

      expect(builder.ilike).toHaveBeenCalledWith('nationality', '%thai%');
    });

    it('should filter employees by age range', async () => {
      mockRequest.query = { status: 'approved', age_min: '18', age_max: '30' };

      const builder = createQueryBuilder({ data: [], error: null, count: 0 });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      await getEmployees(mockRequest as AuthRequest, mockResponse as Response);

      expect(builder.gte).toHaveBeenCalledWith('age', 18);
      expect(builder.lte).toHaveBeenCalledWith('age', 30);
    });

    it('should search employees by name/nickname/description', async () => {
      mockRequest.query = { status: 'approved', search: 'alice' };

      const builder = createQueryBuilder({ data: [], error: null, count: 0 });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      await getEmployees(mockRequest as AuthRequest, mockResponse as Response);

      expect(builder.or).toHaveBeenCalledWith('name.ilike.%alice%,nickname.ilike.%alice%,description.ilike.%alice%');
    });

    it('should handle database errors', async () => {
      const builder = createQueryBuilder({ data: null, error: { message: 'Database error' } });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      await getEmployees(mockRequest as AuthRequest, mockResponse as Response);

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

      mockRequest.params = { id: 'emp-1' };

      await getEmployee(mockRequest as AuthRequest, mockResponse as Response);

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

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      mockRequest.params = { id: 'non-existent' };

      await getEmployee(mockRequest as AuthRequest, mockResponse as Response);

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

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(employeeBuilder)
        .mockReturnValueOnce(employmentBuilder)
        .mockReturnValueOnce(moderationBuilder);

      await createEmployee(mockRequest as AuthRequest, mockResponse as Response);

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

      await createEmployee(mockRequest as AuthRequest, mockResponse as Response);

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

      await createEmployee(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Name and at least one photo are required'
      });
    });

    it('should return 400 for too many photos', async () => {
      mockRequest.body = {
        name: 'Test',
        photos: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] // 6 photos (max is 5)
      };

      await createEmployee(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Maximum 5 photos allowed' });
    });

    it('should return 400 when both establishment and freelance provided', async () => {
      mockRequest.body = {
        name: 'Test',
        photos: ['p1'],
        current_establishment_id: 'est-1',
        freelance_position: { grid_row: 1, grid_col: 1 }
      };

      await createEmployee(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Employee cannot have both an establishment and a freelance position'
      });
    });

    it('should return 409 when freelance position is occupied', async () => {
      mockRequest.body = {
        name: 'Test',
        photos: ['p1'],
        freelance_position: { grid_row: 1, grid_col: 1 }
      };

      // Mock employee creation
      const insertMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: { id: 'emp-temp', name: 'Test' },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: insertMock.mockReturnValue({
          select: selectMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      // Mock position check - occupied
      const posSelectMock = jest.fn().mockReturnThis();
      const posEqMock = jest.fn().mockReturnThis();
      const posSingleMock = jest.fn().mockResolvedValue({
        data: { id: 'pos-existing' }, // Position occupied
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: posSelectMock.mockReturnValue({
          eq: posEqMock.mockReturnValue({
            eq: posEqMock.mockReturnValue({
              eq: posEqMock.mockReturnValue({
                eq: posEqMock.mockReturnValue({
                  single: posSingleMock
                })
              })
            })
          })
        })
      });

      // Mock employee deletion (rollback)
      const deleteMock = jest.fn().mockReturnThis();
      const deleteEqMock = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        delete: deleteMock.mockReturnValue({
          eq: deleteEqMock
        })
      });

      await createEmployee(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Position (1, 1) is already occupied on Beach Road'
      });
    });
  });

  describe('updateEmployee', () => {
    it('should allow creator to update own employee', async () => {
      mockRequest.params = { id: 'emp-1' };
      mockRequest.body = { name: 'Updated Name', age: 26 };
      mockRequest.user = { id: 'user-123', pseudonym: 'testuser', email: 'user@test.com', role: 'user', is_active: true };

      // Mock fetch employee
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { created_by: 'user-123', user_id: null },
              error: null
            })
          })
        })
      });

      // Mock update employee
      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'emp-1', name: 'Updated Name', age: 26, status: 'pending' },
                error: null
              })
            })
          })
        })
      });

      await updateEmployee(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Employee updated successfully',
        employee: expect.objectContaining({
          id: 'emp-1',
          name: 'Updated Name',
          status: 'pending' // Non-admin updates go to pending
        })
      });
    });

    it('should allow admin to update any employee without pending status', async () => {
      mockRequest.params = { id: 'emp-1' };
      mockRequest.body = { name: 'Admin Update' };
      mockRequest.user = { id: 'admin-123', pseudonym: 'admin', email: 'admin@test.com', role: 'admin', is_active: true };

      // Mock fetch employee
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { created_by: 'other-user', user_id: null },
              error: null
            })
          })
        })
      });

      // Mock update (no status change for admin)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'emp-1', name: 'Admin Update', status: 'approved' },
                error: null
              })
            })
          })
        })
      });

      await updateEmployee(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Employee updated successfully',
        employee: expect.objectContaining({
          name: 'Admin Update',
          status: 'approved' // Admin doesn't change to pending
        })
      });
    });

    it('should deny update for non-owner non-admin user', async () => {
      mockRequest.params = { id: 'emp-1' };
      mockRequest.body = { name: 'Unauthorized Update' };
      mockRequest.user = { id: 'other-user', pseudonym: 'otheruser', email: 'other@test.com', role: 'user', is_active: true };

      // Mock fetch employee (different creator)
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: { created_by: 'original-creator', user_id: null },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await updateEmployee(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Not authorized to update this employee'
      });
    });

    it('should return 404 for non-existent employee', async () => {
      mockRequest.params = { id: 'non-existent' };

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: null,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await updateEmployee(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Employee not found' });
    });

    it('should toggle freelance mode and deactivate employment', async () => {
      mockRequest.params = { id: 'emp-1' };
      mockRequest.body = { is_freelance: true, freelance_zone: 'beachroad' };
      mockRequest.user = { id: 'user-123', pseudonym: 'testuser', email: 'user@test.com', role: 'user', is_active: true };

      // Mock fetch employee
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: { created_by: 'user-123', user_id: null },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      // Mock deactivate employment history
      const deactivateUpdateMock = jest.fn().mockReturnThis();
      const deactivateEqMock = jest.fn().mockReturnThis();
      const deactivateEq2Mock = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: deactivateUpdateMock.mockReturnValue({
          eq: deactivateEqMock.mockReturnValue({
            eq: deactivateEq2Mock
          })
        })
      });

      // Mock update employee
      const updateMock = jest.fn().mockReturnThis();
      const updateEqMock = jest.fn().mockReturnThis();
      const updateSelectMock = jest.fn().mockReturnThis();
      const updateSingleMock = jest.fn().mockResolvedValue({
        data: { id: 'emp-1', is_freelance: true, freelance_zone: 'beachroad' },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: updateMock.mockReturnValue({
          eq: updateEqMock.mockReturnValue({
            select: updateSelectMock.mockReturnValue({
              single: updateSingleMock
            })
          })
        })
      });

      await updateEmployee(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Employee updated successfully',
        employee: expect.objectContaining({
          is_freelance: true,
          freelance_zone: 'beachroad'
        })
      });
    });
  });

  describe('deleteEmployee', () => {
    it('should allow creator to delete own employee', async () => {
      mockRequest.params = { id: 'emp-1' };
      mockRequest.user = { id: 'user-123', pseudonym: 'testuser', email: 'user@test.com', role: 'user', is_active: true };

      // Mock fetch employee
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: { created_by: 'user-123' },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      // Mock delete
      const deleteMock = jest.fn().mockReturnThis();
      const deleteEqMock = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        delete: deleteMock.mockReturnValue({
          eq: deleteEqMock
        })
      });

      await deleteEmployee(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Employee deleted successfully'
      });
    });

    it('should allow admin to delete any employee', async () => {
      mockRequest.params = { id: 'emp-1' };
      mockRequest.user = { id: 'admin-123', pseudonym: 'admin', email: 'admin@test.com', role: 'admin', is_active: true };

      // Mock fetch employee
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: { created_by: 'other-user' },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      // Mock delete
      const deleteMock = jest.fn().mockReturnThis();
      const deleteEqMock = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        delete: deleteMock.mockReturnValue({
          eq: deleteEqMock
        })
      });

      await deleteEmployee(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Employee deleted successfully'
      });
    });

    it('should deny delete for non-owner non-admin user', async () => {
      mockRequest.params = { id: 'emp-1' };
      mockRequest.user = { id: 'other-user', pseudonym: 'otheruser', email: 'other@test.com', role: 'user', is_active: true };

      // Mock fetch employee (different creator)
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: { created_by: 'original-creator' },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await deleteEmployee(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Not authorized to delete this employee'
      });
    });

    it('should return 404 for non-existent employee', async () => {
      mockRequest.params = { id: 'non-existent' };

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: null,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await deleteEmployee(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Employee not found' });
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

      // Mock deactivate current positions
      const updateMock = jest.fn().mockReturnThis();
      const updateEqMock = jest.fn().mockReturnThis();
      const updateEq2Mock = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: updateMock.mockReturnValue({
          eq: updateEqMock.mockReturnValue({
            eq: updateEq2Mock
          })
        })
      });

      // Mock insert employment
      const insertMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'eh-new',
          employee_id: 'emp-1',
          establishment_id: 'est-1',
          position: 'Dancer',
          is_current: true
        },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: insertMock.mockReturnValue({
          select: selectMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await addEmployment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Employment added successfully',
        employment: expect.objectContaining({
          employee_id: 'emp-1',
          establishment_id: 'est-1',
          is_current: true
        })
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.params = { id: 'emp-1' };
      mockRequest.body = { position: 'Dancer' }; // Missing establishment_id and start_date

      await addEmployment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Establishment and start date are required'
      });
    });
  });

  describe('getEmployeeNameSuggestions', () => {
    it('should return suggestions for search query', async () => {
      mockRequest.query = { q: 'ali' };

      const mockNames = [{ name: 'Alice' }, { name: 'Alicia' }];
      const mockNicknames = [{ nickname: 'Ali' }];

      // Mock parallel queries
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const likeMock = jest.fn().mockReturnThis();
      const notMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockResolvedValue({
        data: mockNames,
        error: null
      });

      const nicknameSelectMock = jest.fn().mockReturnThis();
      const nicknameEqMock = jest.fn().mockReturnThis();
      const nicknameLikeMock = jest.fn().mockReturnThis();
      const nicknameNotMock = jest.fn().mockReturnThis();
      const nicknameLimitMock = jest.fn().mockResolvedValue({
        data: mockNicknames,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            like: likeMock.mockReturnValue({
              not: notMock.mockReturnValue({
                limit: limitMock
              })
            })
          })
        })
      }).mockReturnValueOnce({
        select: nicknameSelectMock.mockReturnValue({
          eq: nicknameEqMock.mockReturnValue({
            like: nicknameLikeMock.mockReturnValue({
              not: nicknameNotMock.mockReturnValue({
                limit: nicknameLimitMock
              })
            })
          })
        })
      });

      await getEmployeeNameSuggestions(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        suggestions: expect.arrayContaining(['Alice', 'Alicia', 'Ali'])
      });
    });

    it('should return empty array for empty query', async () => {
      mockRequest.query = { q: '' };

      await getEmployeeNameSuggestions(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ suggestions: [] });
    });
  });

  describe('createOwnEmployeeProfile (Employee Claim System v10.0)', () => {
    it('should create self-managed employee profile', async () => {
      mockRequest.body = {
        name: 'Self Profile',
        photos: ['photo1.jpg'],
        age: 25
      };

      // Mock check existing linked profile
      const userSelectMock = jest.fn().mockReturnThis();
      const userEqMock = jest.fn().mockReturnThis();
      const userSingleMock = jest.fn().mockResolvedValue({
        data: { linked_employee_id: null, account_type: null },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: userSelectMock.mockReturnValue({
          eq: userEqMock.mockReturnValue({
            single: userSingleMock
          })
        })
      });

      // Mock employee insert
      const empInsertMock = jest.fn().mockReturnThis();
      const empSelectMock = jest.fn().mockReturnThis();
      const empSingleMock = jest.fn().mockResolvedValue({
        data: { id: 'emp-self', name: 'Self Profile', is_self_profile: true },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: empInsertMock.mockReturnValue({
          select: empSelectMock.mockReturnValue({
            single: empSingleMock
          })
        })
      });

      // Mock user update
      const userUpdateMock = jest.fn().mockReturnThis();
      const userUpdateEqMock = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: userUpdateMock.mockReturnValue({
          eq: userUpdateEqMock
        })
      });

      // Mock moderation queue
      const modInsertMock = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: modInsertMock
      });

      await createOwnEmployeeProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Your employee profile has been created and is pending approval',
        employee: expect.objectContaining({
          id: 'emp-self',
          is_self_profile: true
        }),
        linked: true
      });
    });

    it('should return 409 if user already has linked profile', async () => {
      // Mock existing linked profile
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: { linked_employee_id: 'emp-existing', account_type: 'employee' },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await createOwnEmployeeProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'You already have a linked employee profile',
        code: 'ALREADY_LINKED',
        employee_id: 'emp-existing'
      });
    });
  });

  describe('claimEmployeeProfile (Employee Claim System v10.0)', () => {
    it('should create claim request for existing profile', async () => {
      mockRequest.params = { employeeId: 'emp-1' };
      mockRequest.body = {
        message: 'This is my profile, I can verify with ID',
        verification_proof: ['proof1.jpg']
      };

      // Mock check user linked profile
      const userSelectMock = jest.fn().mockReturnThis();
      const userEqMock = jest.fn().mockReturnThis();
      const userSingleMock = jest.fn().mockResolvedValue({
        data: { linked_employee_id: null },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: userSelectMock.mockReturnValue({
          eq: userEqMock.mockReturnValue({
            single: userSingleMock
          })
        })
      });

      // Mock check employee exists
      const empSelectMock = jest.fn().mockReturnThis();
      const empEqMock = jest.fn().mockReturnThis();
      const empSingleMock = jest.fn().mockResolvedValue({
        data: { id: 'emp-1', name: 'Alice', user_id: null },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: empSelectMock.mockReturnValue({
          eq: empEqMock.mockReturnValue({
            single: empSingleMock
          })
        })
      });

      // Mock check existing claim
      const claimSelectMock = jest.fn().mockReturnThis();
      const claimEqMock = jest.fn().mockReturnThis();
      const claimSingleMock = jest.fn().mockResolvedValue({
        data: null,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: claimSelectMock.mockReturnValue({
          eq: claimEqMock.mockReturnValue({
            eq: claimEqMock.mockReturnValue({
              eq: claimEqMock.mockReturnValue({
                eq: claimEqMock.mockReturnValue({
                  single: claimSingleMock
                })
              })
            })
          })
        })
      });

      // Mock RPC call
      (supabase as any).rpc = jest.fn().mockResolvedValue({
        data: 'claim-id-123',
        error: null
      });

      await claimEmployeeProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Claim request submitted successfully. An administrator will review your request.',
        claim_id: 'claim-id-123'
      });
    });

    it('should return 400 for too short message', async () => {
      mockRequest.params = { employeeId: 'emp-1' };
      mockRequest.body = { message: 'Short' }; // Less than 10 chars

      await claimEmployeeProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Please provide a detailed message (min 10 characters) explaining why this is your profile'
      });
    });

    it('should return 409 if employee already linked', async () => {
      mockRequest.params = { employeeId: 'emp-1' };
      mockRequest.body = { message: 'This is my profile for sure' };

      // Mock user check
      const userSelectMock = jest.fn().mockReturnThis();
      const userEqMock = jest.fn().mockReturnThis();
      const userSingleMock = jest.fn().mockResolvedValue({
        data: { linked_employee_id: null },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: userSelectMock.mockReturnValue({
          eq: userEqMock.mockReturnValue({
            single: userSingleMock
          })
        })
      });

      // Mock employee check - already linked
      const empSelectMock = jest.fn().mockReturnThis();
      const empEqMock = jest.fn().mockReturnThis();
      const empSingleMock = jest.fn().mockResolvedValue({
        data: { id: 'emp-1', name: 'Alice', user_id: 'other-user' }, // Already linked
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: empSelectMock.mockReturnValue({
          eq: empEqMock.mockReturnValue({
            single: empSingleMock
          })
        })
      });

      await claimEmployeeProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'This employee profile is already linked to another user account',
        code: 'ALREADY_LINKED'
      });
    });
  });

  describe('getMyLinkedProfile', () => {
    it('should return linked employee profile', async () => {
      mockRequest.user = { id: 'user-123', pseudonym: 'testuser', email: 'user@test.com', role: 'user', is_active: true };

      // Mock get user's linked_employee_id
      const userSelectMock = jest.fn().mockReturnThis();
      const userEqMock = jest.fn().mockReturnThis();
      const userSingleMock = jest.fn().mockResolvedValue({
        data: { linked_employee_id: 'emp-1' },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: userSelectMock.mockReturnValue({
          eq: userEqMock.mockReturnValue({
            single: userSingleMock
          })
        })
      });

      // Mock getEmployee delegate call
      const empSelectMock = jest.fn().mockReturnThis();
      const empEqMock = jest.fn().mockReturnThis();
      const empSingleMock = jest.fn().mockResolvedValue({
        data: { id: 'emp-1', name: 'My Profile' },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: empSelectMock.mockReturnValue({
          eq: empEqMock.mockReturnValue({
            single: empSingleMock
          })
        })
      });

      // Mock employment history
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      });

      // Mock comments
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      });

      await getMyLinkedProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        employee: expect.objectContaining({
          id: 'emp-1',
          name: 'My Profile'
        })
      });
    });

    it('should return 404 if user has no linked profile', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: { linked_employee_id: null },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await getMyLinkedProfile(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'No linked employee profile found',
        code: 'NOT_LINKED'
      });
    });
  });

  describe('getClaimRequests (Admin)', () => {
    it('should return claim requests for admin', async () => {
      mockRequest.user = { id: 'admin-123', pseudonym: 'admin', email: 'admin@test.com', role: 'admin', is_active: true };
      mockRequest.query = { status: 'pending' };

      const mockClaims = [
        {
          id: 'claim-1',
          item_id: 'emp-1',
          submitted_by_user: { pseudonym: 'User1' }
        }
      ];

      // Mock claims query
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({
        data: mockClaims,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              order: orderMock
            })
          })
        })
      });

      // Mock employee enrichment
      const empSelectMock = jest.fn().mockReturnThis();
      const empEqMock = jest.fn().mockReturnThis();
      const empSingleMock = jest.fn().mockResolvedValue({
        data: { id: 'emp-1', name: 'Alice' },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: empSelectMock.mockReturnValue({
          eq: empEqMock.mockReturnValue({
            single: empSingleMock
          })
        })
      });

      await getClaimRequests(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        claims: expect.arrayContaining([
          expect.objectContaining({
            id: 'claim-1',
            employee: expect.objectContaining({ name: 'Alice' })
          })
        ]),
        total: 1
      });
    });

    it('should deny access for non-admin', async () => {
      mockRequest.user = { id: 'user-123', pseudonym: 'testuser', email: 'user@test.com', role: 'user', is_active: true };

      await getClaimRequests(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Admin/moderator access required',
        code: 'FORBIDDEN'
      });
    });
  });

  describe('approveClaimRequest (Admin)', () => {
    it('should approve claim and create user-employee link', async () => {
      mockRequest.user = { id: 'admin-123', pseudonym: 'admin', email: 'admin@test.com', role: 'admin', is_active: true };
      mockRequest.params = { claimId: 'claim-1' };
      mockRequest.body = { moderator_notes: 'Verified with ID' };

      // Mock get claim
      const claimSelectMock = jest.fn().mockReturnThis();
      const claimEqMock = jest.fn().mockReturnThis();
      const claimSingleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'claim-1',
          item_id: 'emp-1',
          request_metadata: { claim_type: 'claim_existing' }
        },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: claimSelectMock.mockReturnValue({
          eq: claimEqMock.mockReturnValue({
            eq: claimEqMock.mockReturnValue({
              eq: claimEqMock.mockReturnValue({
                single: claimSingleMock
              })
            })
          })
        })
      });

      // Mock RPC call
      (supabase as any).rpc = jest.fn().mockResolvedValue({
        data: true,
        error: null
      });

      await approveClaimRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Claim request approved successfully. User and employee are now linked.',
        success: true
      });
    });

    it('should deny access for non-admin', async () => {
      mockRequest.user = { id: 'user-123', pseudonym: 'testuser', email: 'user@test.com', role: 'user', is_active: true };
      mockRequest.params = { claimId: 'claim-1' };

      await approveClaimRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'FORBIDDEN'
      });
    });
  });

  describe('rejectClaimRequest (Admin)', () => {
    it('should reject claim with reason', async () => {
      mockRequest.user = { id: 'admin-123', pseudonym: 'admin', email: 'admin@test.com', role: 'admin', is_active: true };
      mockRequest.params = { claimId: 'claim-1' };
      mockRequest.body = { moderator_notes: 'Insufficient verification proof provided' };

      // Mock RPC call
      (supabase as any).rpc = jest.fn().mockResolvedValue({
        data: true,
        error: null
      });

      await rejectClaimRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Claim request rejected successfully.',
        success: true
      });
    });

    it('should return 400 for too short rejection reason', async () => {
      mockRequest.user = { id: 'admin-123', pseudonym: 'admin', email: 'admin@test.com', role: 'admin', is_active: true };
      mockRequest.params = { claimId: 'claim-1' };
      mockRequest.body = { moderator_notes: 'Short' }; // Less than 10 chars

      await rejectClaimRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Please provide a reason for rejection (min 10 characters)'
      });
    });

    it('should deny access for non-admin', async () => {
      mockRequest.user = { id: 'user-123', pseudonym: 'testuser', email: 'user@test.com', role: 'user', is_active: true };
      mockRequest.params = { claimId: 'claim-1' };
      mockRequest.body = { moderator_notes: 'Some reason' };

      await rejectClaimRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Admin access required',
        code: 'FORBIDDEN'
      });
    });
  });
});
