import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  getEstablishments,
  getEstablishment,
  createEstablishment,
  updateEstablishment,
  deleteEstablishment,
  updateEstablishmentGridPosition
} from '../establishmentController';
import { supabase } from '../../config/supabase';

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('../../config/redis', () => ({
  cacheDel: jest.fn(),
  cacheInvalidatePattern: jest.fn(),
  CACHE_KEYS: {
    ESTABLISHMENT: (id: string) => `establishment:${id}`,
    CATEGORIES: 'categories'
  }
}));

describe('EstablishmentController', () => {
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
    // Setup mocks
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      query: {},
      params: {},
      body: {},
      user: {
        id: 'user123',
        pseudonym: 'testuser',
        email: 'test@example.com',
        role: 'user',
        is_active: true
      }
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEstablishments', () => {
    const mockEstablishment = {
      id: 'est123',
      name: 'Test Bar',
      address: '123 Soi 6',
      zone: 'soi6',
      grid_row: 1,
      grid_col: 1,
      category_id: 1,
      description: 'Test description',
      status: 'approved',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      logo_url: 'https://example.com/logo.jpg',
      ladydrink: '130',
      barfine: '400',
      rooms: 'N/A',
      category: {
        id: 1,
        name: 'Bar',
        icon: '🍺'
      }
    };

    it('should return list of establishments with pagination', async () => {
      mockRequest.query = { status: 'approved', limit: '50', page: '1' };

      // Mock Supabase query chain
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockEstablishment],
          error: null
        })
      };

      const mockCountQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 1,
          error: null
        })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockCountQuery)
        .mockReturnValueOnce(mockQuery);

      // Mock employment_history query for employee counts
      const mockEmploymentQuery = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockEmploymentQuery);

      await getEstablishments(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          establishments: expect.any(Array),
          pagination: expect.objectContaining({
            total: 1,
            page: 1,
            limit: 50,
            hasMore: false,
            totalPages: 1
          })
        })
      );
    });

    it('should filter establishments by zone', async () => {
      mockRequest.query = { zone: 'soi6', status: 'approved' };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockEstablishment],
          error: null
        })
      };

      const mockCountQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          count: 1,
          error: null
        })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockCountQuery)
        .mockReturnValueOnce(mockQuery);

      // Mock employment query
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      });

      await getEstablishments(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery.eq).toHaveBeenCalledWith('zone', 'soi6');
      expect(jsonMock).toHaveBeenCalled();
    });

    it('should filter establishments by category', async () => {
      mockRequest.query = { category_id: '1', status: 'approved' };

      // Mock count query
      const countBuilder = createQueryBuilder({ count: 1, error: null });

      // Mock data query
      const dataBuilder = createQueryBuilder({
        data: [mockEstablishment],
        error: null
      });

      // Mock employment query
      const employmentBuilder = createQueryBuilder({ data: [], error: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(countBuilder)
        .mockReturnValueOnce(dataBuilder)
        .mockReturnValueOnce(employmentBuilder);

      await getEstablishments(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        establishments: expect.arrayContaining([
          expect.objectContaining({ id: 'est123', name: 'Test Bar' })
        ]),
        pagination: expect.any(Object)
      });
    });

    it('should return 400 for invalid status parameter', async () => {
      mockRequest.query = { status: 'invalid_status' };

      await getEstablishments(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid status parameter',
        code: 'INVALID_STATUS'
      });
    });

    it('should return 400 for invalid limit parameter', async () => {
      mockRequest.query = { limit: '300' }; // Over max 200

      await getEstablishments(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_LIMIT'
        })
      );
    });

    it('should search establishments by name', async () => {
      mockRequest.query = { search: 'Test Bar', status: 'approved' };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockEstablishment],
          error: null
        })
      };

      const mockCountQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({
          count: 1,
          error: null
        })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockCountQuery)
        .mockReturnValueOnce(mockQuery);

      // Mock employment query
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      });

      await getEstablishments(mockRequest as AuthRequest, mockResponse as Response);

      expect(mockQuery.or).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalled();
    });
  });

  describe('getEstablishment', () => {
    const mockEstablishment = {
      id: 'est123',
      name: 'Test Bar',
      address: '123 Soi 6',
      zone: 'soi6',
      grid_row: 1,
      grid_col: 1,
      category_id: 1,
      description: 'Test description',
      status: 'approved',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      created_by: 'user123',
      logo_url: 'https://example.com/logo.jpg',
      ladydrink: '130',
      barfine: '400',
      rooms: 'N/A',
      location: null,
      category: {
        id: 1,
        name: 'Bar',
        icon: '🍺'
      },
      created_by_user: {
        pseudonym: 'testuser'
      }
    };

    it('should return establishment by ID', async () => {
      mockRequest.params = { id: 'est123' };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockEstablishment,
          error: null
        })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      // Mock consumables query
      const mockConsumablesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      (supabase.from as jest.Mock).mockReturnValueOnce(mockQuery).mockReturnValueOnce(mockConsumablesQuery);

      await getEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        establishment: expect.objectContaining({
          id: 'est123',
          name: 'Test Bar',
          category_id: 'cat-001', // Transformed from integer 1
          pricing: expect.any(Object)
        })
      });
    });

    it('should return 404 for non-existent establishment', async () => {
      mockRequest.params = { id: 'nonexistent' };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockQuery);

      await getEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Establishment not found' });
    });
  });

  describe('createEstablishment', () => {
    const validEstablishmentData = {
      name: 'New Bar',
      address: '456 Walking Street',
      zone: 'walkingstreet',
      category_id: 1,
      description: 'Great bar',
      phone: '+66123456789',
      website: 'https://example.com',
      pricing: {
        ladydrink: '150',
        barfine: '500',
        rooms: { available: true, price: '1000' }
      }
    };

    it('should create establishment as admin (auto-approved)', async () => {
      mockRequest.body = validEstablishmentData;
      mockRequest.user!.role = 'admin';

      const createdEstablishment = {
        id: 'est456',
        ...validEstablishmentData,
        status: 'approved',
        created_by: 'user123',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        grid_row: null,
        grid_col: null,
        logo_url: null,
        ladydrink: '150',
        barfine: '500',
        rooms: '1000',
        category: { id: 1, name: 'Bar', icon: '🍺' }
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdEstablishment,
          error: null
        })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockInsertQuery);

      // Mock moderation_queue insert
      const mockModerationQuery = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null })
      };
      (supabase.from as jest.Mock).mockReturnValueOnce(mockInsertQuery).mockReturnValueOnce(mockModerationQuery);

      await createEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Establishment submitted for approval',
        establishment: expect.objectContaining({
          id: 'est456',
          name: 'New Bar',
          status: 'approved'
        })
      });
    });

    it('should create establishment as user (pending approval)', async () => {
      mockRequest.body = validEstablishmentData;
      mockRequest.user!.role = 'user';

      const createdEstablishment = {
        id: 'est789',
        ...validEstablishmentData,
        status: 'pending',
        created_by: 'user123'
      };

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdEstablishment,
          error: null
        })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockInsertQuery);

      // Mock moderation queue
      (supabase.from as jest.Mock).mockReturnValueOnce(mockInsertQuery).mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ data: null, error: null })
      });

      await createEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          establishment: expect.objectContaining({
            status: 'pending'
          })
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = {
        name: 'Test Bar'
        // Missing address, zone, category_id
      };

      await createEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Name, address, zone and category are required'
      });
    });

    it('should handle database errors', async () => {
      mockRequest.body = validEstablishmentData;

      const mockInsertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockInsertQuery);

      await createEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('updateEstablishment', () => {
    const mockEstablishment = {
      id: 'est123',
      created_by: 'user123'
    };

    const updateData = {
      name: 'Updated Bar Name',
      description: 'Updated description'
    };

    beforeEach(() => {
      mockRequest.params = { id: 'est123' };
      mockRequest.body = updateData;
    });

    it('should allow admin to update any establishment', async () => {
      mockRequest.user!.role = 'admin';

      // Mock select query for authorization
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockEstablishment,
          error: null
        })
      };

      // Mock update query
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockEstablishment, ...updateData },
          error: null
        })
      };

      // Mock consumables query
      const mockConsumablesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockUpdateQuery)
        .mockReturnValueOnce(mockConsumablesQuery);

      await updateEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Establishment updated successfully',
        establishment: expect.objectContaining({
          name: 'Updated Bar Name'
        })
      });
    });

    it('should allow creator to update own establishment', async () => {
      mockRequest.user!.id = 'user123'; // Same as created_by
      mockRequest.user!.role = 'user';

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockEstablishment,
          error: null
        })
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockEstablishment, ...updateData, status: 'pending' },
          error: null
        })
      };

      const mockConsumablesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockUpdateQuery)
        .mockReturnValueOnce(mockConsumablesQuery);

      await updateEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          establishment: expect.objectContaining({
            status: 'pending' // Non-admin updates go to pending
          })
        })
      );
    });

    it('should deny update for non-owner non-admin user', async () => {
      mockRequest.user!.id = 'different-user'; // Different from created_by
      mockRequest.user!.role = 'user';

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockEstablishment,
          error: null
        })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSelectQuery);

      await updateEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Not authorized to update this establishment',
        code: 'ESTABLISHMENT_UPDATE_FORBIDDEN'
      });
    });

    it('should return 404 for non-existent establishment', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSelectQuery);

      await updateEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Establishment not found' });
    });
  });

  describe('deleteEstablishment', () => {
    const mockEstablishment = {
      id: 'est123',
      created_by: 'user123'
    };

    beforeEach(() => {
      mockRequest.params = { id: 'est123' };
    });

    it('should allow admin to delete any establishment', async () => {
      mockRequest.user!.role = 'admin';

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockEstablishment,
          error: null
        })
      };

      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      await deleteEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Establishment deleted successfully'
      });
    });

    it('should allow creator to delete own establishment', async () => {
      mockRequest.user!.id = 'user123'; // Same as created_by
      mockRequest.user!.role = 'user';

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockEstablishment,
          error: null
        })
      };

      const mockDeleteQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      await deleteEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Establishment deleted successfully'
      });
    });

    it('should deny delete for non-owner non-admin user', async () => {
      mockRequest.user!.id = 'different-user';
      mockRequest.user!.role = 'user';

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockEstablishment,
          error: null
        })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSelectQuery);

      await deleteEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Not authorized to delete this establishment',
        code: 'ESTABLISHMENT_DELETE_FORBIDDEN'
      });
    });

    it('should return 404 for non-existent establishment', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSelectQuery);

      await deleteEstablishment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Establishment not found' });
    });
  });

  describe('updateEstablishmentGridPosition', () => {
    const mockEstablishment = {
      id: 'est123',
      name: 'Test Bar',
      grid_row: 1,
      grid_col: 1,
      zone: 'soi6'
    };

    beforeEach(() => {
      mockRequest.params = { id: 'est123' };
      mockRequest.body = {
        grid_row: 1,
        grid_col: 5,
        zone: 'soi6'
      };
      mockRequest.user!.role = 'admin'; // Only admin can update grid positions
    });

    it('should update grid position for admin', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockEstablishment,
          error: null
        })
      };

      // Mock check for existing establishment at target position (empty)
      const mockCheckQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockEstablishment, grid_row: 1, grid_col: 5 },
          error: null
        })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockCheckQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      await updateEstablishmentGridPosition(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Grid position updated successfully',
        establishment: expect.objectContaining({
          grid_row: 1,
          grid_col: 5
        })
      });
    });

    it('should deny grid position update for non-admin', async () => {
      mockRequest.user!.role = 'user';

      await updateEstablishmentGridPosition(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Only admin/moderator can modify grid positions'
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = {
        grid_row: 1
        // Missing grid_col and zone
      };

      await updateEstablishmentGridPosition(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'grid_row, grid_col, and zone are required'
      });
    });

    it('should return 400 for invalid grid position bounds', async () => {
      mockRequest.body = {
        grid_row: 3, // Out of bounds (max 2 for soi6)
        grid_col: 5,
        zone: 'soi6'
      };

      await updateEstablishmentGridPosition(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'grid_row must be between 1 and 2'
      });
    });

    it('should return 409 when position is occupied (without swap)', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockEstablishment,
          error: null
        })
      };

      const occupiedEstablishment = {
        id: 'est456',
        name: 'Occupied Bar',
        grid_row: 1,
        grid_col: 5
      };

      const mockCheckQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: occupiedEstablishment,
          error: null
        })
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockCheckQuery);

      await updateEstablishmentGridPosition(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Position already occupied',
        occupied_by: {
          id: 'est456',
          name: 'Occupied Bar'
        },
        suggestion: 'Use swap_with_id to exchange positions'
      });
    });

    it('should return 404 for non-existent establishment', async () => {
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      (supabase.from as jest.Mock).mockReturnValue(mockSelectQuery);

      await updateEstablishmentGridPosition(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Establishment not found' });
    });
  });
});
