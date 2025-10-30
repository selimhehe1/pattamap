/**
 * 🧪 Moderation Controller Tests
 *
 * Tests for moderation queue and content approval workflows
 * - getModerationQueue (0/2 tests)
 * - approveItem (0/2 tests)
 * - rejectItem (0/2 tests)
 * - getModerationStats (0/2 tests)
 * - getReports (2/2 tests ✅)
 * - resolveReport (1/2 tests)
 *
 * CURRENT STATUS: 3/12 tests passing (25%) ⚠️
 *
 * 📋 TODO (Day 4 Sprint):
 * - Align mocks with actual controller implementation
 * - Controller uses complex batch queries with Promise.all
 * - Need to mock parallel database queries properly
 * - Consider using table-based mocking strategy like vipController
 *
 * Day 3 Sprint - Critical Controllers Testing (Foundation created)
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
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

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

    // Default mock implementation
    (supabase.from as jest.Mock).mockImplementation(() => createMockQueryBuilder());
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
      const mockEstablishment = { id: 'est-1', name: 'Test Bar', status: 'pending' };

      // Mock moderation queue query
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockQueue)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([mockEmployee])))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([mockEstablishment])))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])));

      await getModerationQueue(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        moderationItems: expect.arrayContaining([
          expect.objectContaining({
            id: 'mod-1',
            item_type: 'employee',
            fullItem: mockEmployee
          }),
          expect.objectContaining({
            id: 'mod-2',
            item_type: 'establishment',
            fullItem: mockEstablishment
          })
        ])
      });
    });

    it('should return empty array when no items in queue', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess([]))
      );

      await getModerationQueue(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ moderationItems: [] });
    });
  });

  describe('approveItem', () => {
    it('should approve moderation item successfully', async () => {
      mockRequest.params = { id: 'mod-1' };
      mockRequest.body = { notes: 'Looks good!' };

      const mockQueueItem = {
        id: 'mod-1',
        item_type: 'employee',
        item_id: 'emp-1',
        status: 'pending',
        submitted_by: 'user-1'
      };

      // Mock queries: get queue item, update queue item, update employee status
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockQueueItem)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ ...mockQueueItem, status: 'approved' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'emp-1', status: 'approved' })));

      await approveItem(mockRequest as AuthRequest, mockResponse as Response);

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

      await approveItem(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Moderation item not found' });
    });
  });

  describe('rejectItem', () => {
    it('should reject moderation item successfully', async () => {
      mockRequest.params = { id: 'mod-1' };
      mockRequest.body = { reason: 'Invalid data', notes: 'Missing required fields' };

      const mockQueueItem = {
        id: 'mod-1',
        item_type: 'employee',
        item_id: 'emp-1',
        status: 'pending',
        submitted_by: 'user-1'
      };

      // Mock queries: get queue item, update queue item, update employee status
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockQueueItem)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ ...mockQueueItem, status: 'rejected' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'emp-1', status: 'rejected' })));

      await rejectItem(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Item rejected successfully',
        moderationItem: expect.objectContaining({ id: 'mod-1', status: 'rejected' })
      });
    });

    it('should return 400 if rejection reason is missing', async () => {
      mockRequest.params = { id: 'mod-1' };
      mockRequest.body = {}; // No reason provided

      await rejectItem(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Rejection reason is required' });
    });
  });

  describe('getModerationStats', () => {
    it('should return moderation statistics', async () => {
      const mockStats = {
        pending: 15,
        approved: 120,
        rejected: 8,
        total: 143
      };

      // Mock count queries for each status
      // Note: Using mockSuccess with empty data, actual controller implementation varies
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])));

      await getModerationStats(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        stats: expect.objectContaining({
          pending: expect.any(Number),
          approved: expect.any(Number),
          rejected: expect.any(Number)
        })
      });
    });

    it('should handle errors gracefully', async () => {
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockError({ message: 'Database error' }))
      );

      await getModerationStats(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Database error' });
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

      await getReports(mockRequest as AuthRequest, mockResponse as Response);

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

      await getReports(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({ reports: [] });
    });
  });

  describe('resolveReport', () => {
    it('should resolve report successfully', async () => {
      mockRequest.params = { id: 'report-1' };
      mockRequest.body = { action: 'remove_content', notes: 'Content violates guidelines' };

      const mockReport = {
        id: 'report-1',
        item_type: 'comment',
        item_id: 'comment-1',
        status: 'pending'
      };

      // Mock queries: get report, update report status
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(mockReport)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ ...mockReport, status: 'resolved' })));

      await resolveReport(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Report resolved successfully',
        report: expect.objectContaining({ id: 'report-1', status: 'resolved' })
      });
    });

    it('should return 404 if report not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockRequest.body = { action: 'dismiss' };

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );

      await resolveReport(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Report not found' });
    });
  });
});
