// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  createOwnershipRequest,
  getMyOwnershipRequests,
  getAllOwnershipRequests,
  approveOwnershipRequest,
  rejectOwnershipRequest
} from '../ownershipRequestController';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('../../utils/notificationHelper');

describe('OwnershipRequestController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

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
  });

  describe('createOwnershipRequest', () => {
    it('should create ownership request successfully', async () => {
      mockRequest.body = {
        establishment_id: 'est-1',
        documents_urls: ['doc1.jpg', 'doc2.pdf'],
        verification_code: 'VERIFY123',
        request_message: 'I am the owner of this establishment and can provide business registration documents.'
      };

      // Mock check existing request
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: null,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              eq: eqMock.mockReturnValue({
                single: singleMock
              })
            })
          })
        })
      });

      // Mock insert ownership request
      const insertMock = jest.fn().mockReturnThis();
      const insertSelectMock = jest.fn().mockReturnThis();
      const insertSingleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'req-1',
          user_id: 'user-123',
          establishment_id: 'est-1',
          status: 'pending',
          documents_urls: ['doc1.jpg', 'doc2.pdf'],
          verification_code: 'VERIFY123',
          request_message: 'I am the owner of this establishment...',
          created_at: '2025-01-15T10:00:00Z'
        },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: insertMock.mockReturnValue({
          select: insertSelectMock.mockReturnValue({
            single: insertSingleMock
          })
        })
      });

      await createOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Ownership request submitted successfully',
        request: expect.objectContaining({
          id: 'req-1',
          status: 'pending',
          establishment_id: 'est-1'
        })
      });
    });

    it('should return 400 for missing establishment_id', async () => {
      mockRequest.body = {
        documents_urls: ['doc1.jpg']
      };

      await createOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Establishment ID and at least one document are required'
      });
    });

    it('should return 400 for empty documents array', async () => {
      mockRequest.body = {
        establishment_id: 'est-1',
        documents_urls: []
      };

      await createOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Establishment ID and at least one document are required'
      });
    });

    it('should return 409 if user already has pending request for same establishment', async () => {
      mockRequest.body = {
        establishment_id: 'est-1',
        documents_urls: ['doc1.jpg']
      };

      // Mock existing pending request
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'req-existing',
          status: 'pending'
        },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              eq: eqMock.mockReturnValue({
                single: singleMock
              })
            })
          })
        })
      });

      await createOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'You already have a pending ownership request for this establishment'
      });
    });

    it('should allow new request after previous rejection', async () => {
      mockRequest.body = {
        establishment_id: 'est-1',
        documents_urls: ['doc1.jpg']
      };

      // Mock existing rejected request
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'req-rejected',
          status: 'rejected'
        },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              eq: eqMock.mockReturnValue({
                single: singleMock
              })
            })
          })
        })
      });

      // Mock insert new request
      const insertMock = jest.fn().mockReturnThis();
      const insertSelectMock = jest.fn().mockReturnThis();
      const insertSingleMock = jest.fn().mockResolvedValue({
        data: { id: 'req-new', status: 'pending' },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: insertMock.mockReturnValue({
          select: insertSelectMock.mockReturnValue({
            single: insertSingleMock
          })
        })
      });

      await createOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('getMyOwnershipRequests', () => {
    it('should return user\'s ownership requests', async () => {
      const mockRequests = [
        {
          id: 'req-1',
          status: 'pending',
          establishment: { id: 'est-1', name: 'Bar 1' },
          created_at: '2025-01-15T10:00:00Z'
        },
        {
          id: 'req-2',
          status: 'approved',
          establishment: { id: 'est-2', name: 'Bar 2' },
          created_at: '2025-01-14T10:00:00Z'
        }
      ];

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({
        data: mockRequests,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            order: orderMock
          })
        })
      });

      await getMyOwnershipRequests(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        requests: mockRequests
      });
    });

    it('should filter by status if provided', async () => {
      mockRequest.query = { status: 'pending' };

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({
        data: [],
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              order: orderMock
            })
          })
        })
      });

      await getMyOwnershipRequests(mockRequest as AuthRequest, mockResponse as Response);

      expect(eqMock).toHaveBeenCalledWith('status', 'pending');
    });

    it('should return empty array if no requests found', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({
        data: [],
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            order: orderMock
          })
        })
      });

      await getMyOwnershipRequests(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ requests: [] });
    });
  });

  describe.skip('getOwnershipRequestById', () => {
    it('should return ownership request by ID', async () => {
      mockRequest.params = { id: 'req-1' };

      const mockRequest1 = {
        id: 'req-1',
        user_id: 'user-123',
        status: 'pending',
        establishment: { id: 'est-1', name: 'Bar 1' },
        user: { id: 'user-123', pseudonym: 'testuser', email: 'user@test.com' }
      };

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: mockRequest1,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await getOwnershipRequestById(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ request: mockRequest1 });
    });

    it('should return 404 if request not found', async () => {
      mockRequest.params = { id: 'non-existent' };

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

      await getOwnershipRequestById(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Ownership request not found'
      });
    });

    it('should return 403 if user tries to access another user\'s request', async () => {
      mockRequest.params = { id: 'req-1' };
      mockRequest.user = {
        id: 'other-user',
        pseudonym: 'otheruser',
        email: 'other@test.com',
        role: 'user',
        is_active: true
      };

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'req-1',
          user_id: 'user-123' // Different user
        },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await getOwnershipRequestById(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Not authorized to view this request'
      });
    });

    it('should allow admin to access any request', async () => {
      mockRequest.params = { id: 'req-1' };
      mockRequest.user = {
        id: 'admin-123',
        pseudonym: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        is_active: true
      };

      const mockRequest1 = {
        id: 'req-1',
        user_id: 'other-user', // Different user
        status: 'pending'
      };

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: mockRequest1,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await getOwnershipRequestById(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ request: mockRequest1 });
    });
  });

  describe('getAllOwnershipRequests (Admin)', () => {
    it('should return all ownership requests for admin', async () => {
      mockRequest.user = {
        id: 'admin-123',
        pseudonym: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        is_active: true
      };

      const mockRequests = [
        { id: 'req-1', status: 'pending' },
        { id: 'req-2', status: 'pending' }
      ];

      const selectMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({
        data: mockRequests,
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          order: orderMock
        })
      });

      await getAllOwnershipRequests(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ requests: mockRequests });
    });

    it('should filter by status if provided', async () => {
      mockRequest.user = {
        id: 'admin-123',
        pseudonym: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        is_active: true
      };
      mockRequest.query = { status: 'approved' };

      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockResolvedValue({
        data: [],
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            order: orderMock
          })
        })
      });

      await getAllOwnershipRequests(mockRequest as AuthRequest, mockResponse as Response);

      expect(eqMock).toHaveBeenCalledWith('status', 'approved');
    });

    it('should return 403 for non-admin users', async () => {
      mockRequest.user = {
        id: 'user-123',
        pseudonym: 'testuser',
        email: 'user@test.com',
        role: 'user',
        is_active: true
      };

      await getAllOwnershipRequests(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Admin access required'
      });
    });
  });

  describe('approveOwnershipRequest (Admin)', () => {
    it('should approve request and assign ownership', async () => {
      mockRequest.params = { id: 'req-1' };
      mockRequest.body = {
        admin_notes: 'Documents verified successfully'
      };
      mockRequest.user = {
        id: 'admin-123',
        pseudonym: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        is_active: true
      };

      // Mock get request
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'req-1',
          user_id: 'user-123',
          establishment_id: 'est-1',
          status: 'pending'
        },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      // Mock update request status
      const updateMock = jest.fn().mockReturnThis();
      const updateEqMock = jest.fn().mockReturnThis();
      const updateSelectMock = jest.fn().mockReturnThis();
      const updateSingleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'req-1',
          status: 'approved',
          admin_notes: 'Documents verified successfully',
          reviewed_by: 'admin-123',
          reviewed_at: '2025-01-15T12:00:00Z'
        },
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

      // Mock insert establishment_owner
      const insertMock = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: insertMock
      });

      await approveOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Ownership request approved and ownership assigned successfully',
        request: expect.objectContaining({
          id: 'req-1',
          status: 'approved'
        })
      });
    });

    it('should return 400 for missing admin notes', async () => {
      mockRequest.params = { id: 'req-1' };
      mockRequest.body = {}; // No admin_notes
      mockRequest.user = {
        id: 'admin-123',
        pseudonym: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        is_active: true
      };

      await approveOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Admin notes are required'
      });
    });

    it('should return 400 if request is not pending', async () => {
      mockRequest.params = { id: 'req-1' };
      mockRequest.body = { admin_notes: 'Some notes' };
      mockRequest.user = {
        id: 'admin-123',
        pseudonym: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        is_active: true
      };

      // Mock get request - already approved
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'req-1',
          status: 'approved' // Already approved
        },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await approveOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Only pending requests can be approved'
      });
    });

    it('should return 403 for non-admin users', async () => {
      mockRequest.params = { id: 'req-1' };
      mockRequest.body = { admin_notes: 'Some notes' };
      mockRequest.user = {
        id: 'user-123',
        pseudonym: 'testuser',
        email: 'user@test.com',
        role: 'user',
        is_active: true
      };

      await approveOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Admin access required'
      });
    });
  });

  describe('rejectOwnershipRequest (Admin)', () => {
    it('should reject request with admin notes', async () => {
      mockRequest.params = { id: 'req-1' };
      mockRequest.body = {
        admin_notes: 'Insufficient documentation provided'
      };
      mockRequest.user = {
        id: 'admin-123',
        pseudonym: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        is_active: true
      };

      // Mock get request
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'req-1',
          user_id: 'user-123',
          establishment_id: 'est-1',
          status: 'pending'
        },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      // Mock update request status
      const updateMock = jest.fn().mockReturnThis();
      const updateEqMock = jest.fn().mockReturnThis();
      const updateSelectMock = jest.fn().mockReturnThis();
      const updateSingleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'req-1',
          status: 'rejected',
          admin_notes: 'Insufficient documentation provided',
          reviewed_by: 'admin-123',
          reviewed_at: '2025-01-15T12:00:00Z'
        },
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

      await rejectOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Ownership request rejected',
        request: expect.objectContaining({
          id: 'req-1',
          status: 'rejected'
        })
      });
    });

    it('should return 400 for missing admin notes', async () => {
      mockRequest.params = { id: 'req-1' };
      mockRequest.body = {}; // No admin_notes
      mockRequest.user = {
        id: 'admin-123',
        pseudonym: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        is_active: true
      };

      await rejectOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Admin notes are required for rejection'
      });
    });

    it('should return 400 if request is not pending', async () => {
      mockRequest.params = { id: 'req-1' };
      mockRequest.body = { admin_notes: 'Some notes' };
      mockRequest.user = {
        id: 'admin-123',
        pseudonym: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        is_active: true
      };

      // Mock get request - already rejected
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'req-1',
          status: 'rejected' // Already rejected
        },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await rejectOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Only pending requests can be rejected'
      });
    });

    it('should return 403 for non-admin users', async () => {
      mockRequest.params = { id: 'req-1' };
      mockRequest.body = { admin_notes: 'Some notes' };
      mockRequest.user = {
        id: 'user-123',
        pseudonym: 'testuser',
        email: 'user@test.com',
        role: 'user',
        is_active: true
      };

      await rejectOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Admin access required'
      });
    });
  });

  describe.skip('deleteOwnershipRequest', () => {
    it('should allow user to delete their own pending request', async () => {
      mockRequest.params = { id: 'req-1' };

      // Mock get request
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'req-1',
          user_id: 'user-123',
          status: 'pending'
        },
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

      await deleteOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Ownership request deleted successfully'
      });
    });

    it('should return 400 if trying to delete approved request', async () => {
      mockRequest.params = { id: 'req-1' };

      // Mock get request - already approved
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'req-1',
          user_id: 'user-123',
          status: 'approved'
        },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await deleteOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Cannot delete approved or rejected requests'
      });
    });

    it('should return 403 if user tries to delete another user\'s request', async () => {
      mockRequest.params = { id: 'req-1' };
      mockRequest.user = {
        id: 'other-user',
        pseudonym: 'otheruser',
        email: 'other@test.com',
        role: 'user',
        is_active: true
      };

      // Mock get request
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({
        data: {
          id: 'req-1',
          user_id: 'user-123', // Different user
          status: 'pending'
        },
        error: null
      });

      (supabase.from as jest.Mock).mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            single: singleMock
          })
        })
      });

      await deleteOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Not authorized to delete this request'
      });
    });

    it('should return 404 if request not found', async () => {
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

      await deleteOwnershipRequest(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Ownership request not found'
      });
    });
  });
});
