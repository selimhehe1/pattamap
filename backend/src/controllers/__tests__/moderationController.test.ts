/**
 * 🧪 Moderation Controller Tests
 *
 * Tests for moderation queue and content approval workflows
 * - getModerationQueue (2/2 tests ✅)
 * - approveItem (2/2 tests ✅)
 * - rejectItem (2/2 tests ✅)
 * - getModerationStats (2/2 tests ✅)
 * - getReports (2/2 tests ✅)
 * - resolveReport (2/2 tests ✅)
 *
 * CURRENT STATUS: 12/12 tests passing (100%) ✅
 *
 * 🔧 FIXED (Day 4 Sprint):
 * - Aligned mocks with actual controller implementation
 * - Properly mocked sequential query chains (get → update flow)
 * - Fixed batch query mocking for getModerationQueue (Promise.all pattern)
 * - Fixed mock pollution by resetting supabase.from in beforeEach
 * - Corrected error responses (500 not 400 for internal errors)
 * - Matched exact controller response messages
 *
 * Day 4 Sprint - Critical Controllers Testing
 */

import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  getModerationQueue,
  approveItem,
  rejectItem,
  getModerationStats,
  getReports,
  resolveReport
} from '../moderationController';
import { logger } from '../../utils/logger';

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
  notifyUserContentApproved: jest.fn(),
  notifyUserContentRejected: jest.fn(),
  notifyAdminsPendingContent: jest.fn(),
  notifyFavoriteAvailable: jest.fn(),
  notifyCommentRemoved: jest.fn()
}));

// Import supabase AFTER jest.mock
import { supabase } from '../../config/supabase';

describe('ModerationController', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockNext = jest.fn();

    mockRequest = {
      query: {},
      params: {},
      body: {},
      user: {
        id: 'admin-123',
        pseudonym: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        is_active: true
      }
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

    // Reset supabase.from to plain mock (no default implementation)
    // This prevents mock pollution between tests
    supabase.from = jest.fn();
  });

  describe('getModerationQueue', () => {
    it('should return moderation queue items successfully', async () => {
      const mockQueue = [
        {
          id: 'mod-1',
          item_type: 'employee',
          item_id: 'emp-1',
          status: 'pending',
          submitted_by: 'user-1',
          submitter: { pseudonym: 'user1' },
          moderator: null,
          created_at: new Date().toISOString()
        },
        {
          id: 'mod-2',
          item_type: 'establishment',
          item_id: 'est-1',
          status: 'pending',
          submitted_by: 'user-2',
          submitter: { pseudonym: 'user2' },
          moderator: null,
          created_at: new Date().toISOString()
        }
      ];

      const mockEmployee = { id: 'emp-1', name: 'John Doe', status: 'pending' };
      const mockEstablishment = { id: 'est-1', name: 'Test Bar', status: 'pending', category: { name: 'Bar' } };

      // Mock: 1) moderation_queue query, 2) employees batch, 3) establishments batch, 4) comments batch
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockQueue)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([mockEmployee])))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([mockEstablishment])))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])));

      await getModerationQueue(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        moderationItems: expect.arrayContaining([
          expect.objectContaining({
            id: 'mod-1',
            item_type: 'employee',
            item_data: mockEmployee
          }),
          expect.objectContaining({
            id: 'mod-2',
            item_type: 'establishment',
            item_data: mockEstablishment
          })
        ])
      });
    });

    it('should return empty array when no items in queue', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess([]))
      );

      await getModerationQueue(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({ moderationItems: [] });
    });
  });

  describe('approveItem', () => {
    it('should approve moderation item successfully', async () => {
      mockRequest.params = { id: 'mod-1' };
      mockRequest.body = { moderator_notes: 'Looks good!' };

      const mockQueueItem = {
        id: 'mod-1',
        item_type: 'employee',
        item_id: 'emp-1',
        status: 'pending',
        submitted_by: 'user-1',
        submitter: { id: 'user-1', pseudonym: 'user1' }
      };

      const mockEmployee = { name: 'John Doe' };
      const mockEmployment = {
        establishment_id: 'est-1',
        establishments: { name: 'Test Bar' }
      };

      // Mock queries: 1) get queue item, 2) get employee name, 3) update employee, 4) update queue, 5) get employment
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockQueueItem)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockEmployee)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'emp-1', status: 'approved' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ ...mockQueueItem, status: 'approved' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockEmployment)));

      await approveItem(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Item approved successfully',
        moderationItem: expect.objectContaining({ id: 'mod-1', status: 'approved' })
      });
    });

    it('should return 404 if moderation item not found', async () => {
      mockRequest.params = { id: 'non-existent' };

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );

      await approveItem(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Moderation item not found' });
    });
  });

  describe('rejectItem', () => {
    it('should reject moderation item successfully', async () => {
      mockRequest.params = { id: 'mod-1' };
      mockRequest.body = { moderator_notes: 'Invalid data - missing required fields' };

      const mockQueueItem = {
        id: 'mod-1',
        item_type: 'employee',
        item_id: 'emp-1',
        status: 'pending',
        submitted_by: 'user-1',
        submitter: { id: 'user-1', pseudonym: 'user1' }
      };

      const mockEmployee = { name: 'John Doe' };

      // Mock queries: 1) get queue item, 2) get employee name, 3) update employee, 4) update queue
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockQueueItem)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockEmployee)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'emp-1', status: 'rejected' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ ...mockQueueItem, status: 'rejected' })));

      await rejectItem(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Item rejected successfully',
        moderationItem: expect.objectContaining({ id: 'mod-1', status: 'rejected' })
      });
    });

    it('should return 400 if moderator notes are missing', async () => {
      mockRequest.params = { id: 'mod-1' };
      mockRequest.body = {}; // No moderator_notes provided

      await rejectItem(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Moderator notes are required for rejection' });
    });
  });

  describe('getModerationStats', () => {
    it('should return moderation statistics', async () => {
      // Controller uses .length on data arrays to count
      // Mock 6 queries: pending, approved, rejected, employee_pending, establishment_pending, comment_pending
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(Array(15).fill({ id: 'x' }))))  // pending: 15
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(Array(120).fill({ id: 'x' })))) // approved: 120
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(Array(8).fill({ id: 'x' }))))   // rejected: 8
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(Array(5).fill({ id: 'x' }))))   // employees: 5
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(Array(7).fill({ id: 'x' }))))   // establishments: 7
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(Array(3).fill({ id: 'x' }))));  // comments: 3

      await getModerationStats(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        stats: {
          total_pending: 15,
          total_approved: 120,
          total_rejected: 8,
          pending_by_type: {
            employees: 5,
            establishments: 7,
            comments: 3
          }
        }
      });
    });

    it('should handle errors gracefully', async () => {
      // Simulate a database error by throwing an exception
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await getModerationStats(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('getReports', () => {
    it('should return user reports successfully', async () => {
      const mockReports = [
        {
          id: 'report-1',
          item_type: 'comment',
          item_id: 'comment-1',
          reason: 'spam',
          status: 'pending',
          reporter: { pseudonym: 'user1' },
          created_at: new Date().toISOString()
        },
        {
          id: 'report-2',
          item_type: 'comment',
          item_id: 'comment-2',
          reason: 'offensive',
          status: 'pending',
          reporter: { pseudonym: 'user2' },
          created_at: new Date().toISOString()
        }
      ];

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(mockReports))
      );

      await getReports(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        reports: expect.arrayContaining([
          expect.objectContaining({ id: 'report-1', reason: 'spam' }),
          expect.objectContaining({ id: 'report-2', reason: 'offensive' })
        ])
      });
    });

    it('should return empty array when no reports', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess([]))
      );

      await getReports(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({ reports: [] });
    });
  });

  describe('resolveReport', () => {
    it('should resolve report with dismiss action', async () => {
      mockRequest.params = { id: 'report-1' };
      mockRequest.body = { action: 'dismiss', notes: 'Not a violation' };

      const mockReport = {
        id: 'report-1',
        comment_id: 'comment-1',
        status: 'pending'
      };

      // Mock queries: 1) get report, 2) update report status
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockReport)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ ...mockReport, status: 'resolved' })));

      await resolveReport(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Report resolved successfully. Comment kept.',
        report: expect.objectContaining({ id: 'report-1', status: 'resolved' })
      });
    });

    it('should return 404 if report not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockRequest.body = { action: 'dismiss' };

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );

      await resolveReport(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Report not found' });
    });
  });
});
