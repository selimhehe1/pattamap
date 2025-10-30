import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  reportComment,
  getEmployeeRatings,
  getUserRating,
  updateUserRating
} from '../commentController';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');

describe('CommentController', () => {
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

  describe('getComments', () => {
    it('should return comments for an employee', async () => {
      mockRequest.query = { employee_id: 'emp-1', status: 'approved' };

      const mockComments = [
        {
          id: 'comment-1',
          employee_id: 'emp-1',
          content: 'Great service',
          parent_comment_id: null,
          rating: null,
          created_at: '2025-01-01',
          user: { pseudonym: 'user1' }
        },
        {
          id: 'comment-2',
          employee_id: 'emp-1',
          content: 'Reply to comment',
          parent_comment_id: 'comment-1',
          rating: null,
          created_at: '2025-01-02',
          user: { pseudonym: 'user2' }
        }
      ];

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockComments,
                  error: null
                })
              })
            })
          })
        })
      });

      await getComments(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        comments: expect.arrayContaining([
          expect.objectContaining({
            id: 'comment-1',
            content: 'Great service',
            parent_id: null
          }),
          expect.objectContaining({
            id: 'comment-2',
            content: 'Reply to comment',
            parent_id: 'comment-1'
          })
        ])
      });
    });

    it('should return 400 if employee_id is missing', async () => {
      mockRequest.query = {}; // No employee_id

      await getComments(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Employee ID is required' });
    });

    it('should handle database errors', async () => {
      mockRequest.query = { employee_id: 'emp-1' };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database error' }
                })
              })
            })
          })
        })
      });

      await getComments(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      mockRequest.body = {
        employee_id: 'emp-1',
        content: 'Great service!',
        rating: null
      };

      // Mock employee check
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'emp-1', status: 'approved' },
                error: null
              })
            })
          })
        })
      });

      // Mock comment creation
      const newComment = {
        id: 'comment-new',
        employee_id: 'emp-1',
        user_id: 'user-123',
        content: 'Great service!',
        rating: null,
        status: 'approved',
        user: { pseudonym: 'testuser' }
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newComment,
              error: null
            })
          })
        })
      });

      await createComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Comment added successfully',
        comment: newComment
      });
    });

    it('should create a comment with rating', async () => {
      mockRequest.body = {
        employee_id: 'emp-1',
        content: 'Excellent!',
        rating: 5
      };

      // Mock employee check
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'emp-1', status: 'approved' },
                error: null
              })
            })
          })
        })
      });

      // Mock rating check (no existing rating)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' } // No rows found
                  })
                })
              })
            })
          })
        })
      });

      // Mock comment creation
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'comment-rated', rating: 5 },
              error: null
            })
          })
        })
      });

      await createComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = { employee_id: 'emp-1' }; // Missing content

      await createComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Employee ID and content are required'
      });
    });

    it('should return 400 for invalid rating', async () => {
      mockRequest.body = {
        employee_id: 'emp-1',
        content: 'Test',
        rating: 6 // Invalid rating
      };

      await createComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Rating must be between 1 and 5'
      });
    });

    it('should return 404 if employee not found', async () => {
      mockRequest.body = {
        employee_id: 'non-existent',
        content: 'Test comment'
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' }
              })
            })
          })
        })
      });

      await createComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Employee not found or not approved'
      });
    });

    it('should return 400 if user already rated employee', async () => {
      mockRequest.body = {
        employee_id: 'emp-1',
        content: 'Another rating',
        rating: 4
      };

      // Mock employee check
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'emp-1', status: 'approved' },
                error: null
              })
            })
          })
        })
      });

      // Mock existing rating found
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'existing-rating', rating: 5 },
                    error: null
                  })
                })
              })
            })
          })
        })
      });

      await createComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.stringContaining('already rated'),
        existing_rating: 5
      });
    });
  });

  describe('updateComment', () => {
    it('should allow owner to update own comment', async () => {
      mockRequest.params = { id: 'comment-1' };
      mockRequest.body = { content: 'Updated content' };

      // Mock fetch comment (user is owner)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                user_id: 'user-123',
                parent_comment_id: null
              },
              error: null
            })
          })
        })
      });

      // Mock update
      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'comment-1',
                  content: 'Updated content',
                  user: { pseudonym: 'testuser' }
                },
                error: null
              })
            })
          })
        })
      });

      await updateComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Comment updated successfully',
        comment: expect.objectContaining({
          content: 'Updated content'
        })
      });
    });

    it('should allow admin to update any comment', async () => {
      mockRequest.params = { id: 'comment-1' };
      mockRequest.body = { content: 'Admin update' };
      mockRequest.user = {
        id: 'admin-123',
        pseudonym: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        is_active: true
      };

      // Mock fetch comment (different owner)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                user_id: 'other-user',
                parent_comment_id: null
              },
              error: null
            })
          })
        })
      });

      // Mock update
      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'comment-1',
                  content: 'Admin update'
                },
                error: null
              })
            })
          })
        })
      });

      await updateComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Comment updated successfully',
        comment: expect.any(Object)
      });
    });

    it('should deny update for non-owner non-admin', async () => {
      mockRequest.params = { id: 'comment-1' };
      mockRequest.body = { content: 'Unauthorized update' };
      mockRequest.user = {
        id: 'other-user',
        pseudonym: 'otheruser',
        email: 'other@test.com',
        role: 'user',
        is_active: true
      };

      // Mock fetch comment (different owner)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                user_id: 'original-user',
                parent_comment_id: null
              },
              error: null
            })
          })
        })
      });

      await updateComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Not authorized to update this comment'
      });
    });

    it('should return 404 for non-existent comment', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockRequest.body = { content: 'Update' };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      await updateComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Comment not found' });
    });
  });

  describe('deleteComment', () => {
    it('should allow owner to delete own comment', async () => {
      mockRequest.params = { id: 'comment-1' };

      // Mock fetch comment (user is owner)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { user_id: 'user-123' },
              error: null
            })
          })
        })
      });

      // Mock delete
      (supabase.from as jest.Mock).mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      });

      await deleteComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Comment deleted successfully'
      });
    });

    it('should allow admin to delete any comment', async () => {
      mockRequest.params = { id: 'comment-1' };
      mockRequest.user = {
        id: 'admin-123',
        pseudonym: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        is_active: true
      };

      // Mock fetch comment (different owner)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { user_id: 'other-user' },
              error: null
            })
          })
        })
      });

      // Mock delete
      (supabase.from as jest.Mock).mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      });

      await deleteComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Comment deleted successfully'
      });
    });

    it('should deny delete for non-owner non-admin', async () => {
      mockRequest.params = { id: 'comment-1' };
      mockRequest.user = {
        id: 'other-user',
        pseudonym: 'otheruser',
        email: 'other@test.com',
        role: 'user',
        is_active: true
      };

      // Mock fetch comment (different owner)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { user_id: 'original-user' },
              error: null
            })
          })
        })
      });

      await deleteComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Not authorized to delete this comment'
      });
    });
  });

  describe('reportComment', () => {
    it('should report a comment successfully', async () => {
      mockRequest.params = { id: 'comment-1' };
      mockRequest.body = {
        reason: 'spam',
        description: 'This is spam content'
      };

      // Mock comment existence check
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'comment-1' },
              error: null
            })
          })
        })
      });

      // Mock existing report check (none found)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        })
      });

      // Mock report creation
      const newReport = {
        id: 'report-1',
        comment_id: 'comment-1',
        reported_by: 'user-123',
        reason: 'spam',
        status: 'pending'
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newReport,
              error: null
            })
          })
        })
      });

      await reportComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Comment reported successfully',
        report: newReport
      });
    });

    it('should return 400 if reason is missing', async () => {
      mockRequest.params = { id: 'comment-1' };
      mockRequest.body = { description: 'Some description' }; // Missing reason

      await reportComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Reason is required' });
    });

    it('should return 404 if comment not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockRequest.body = { reason: 'spam' };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      });

      await reportComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Comment not found' });
    });

    it('should return 400 if user already reported comment', async () => {
      mockRequest.params = { id: 'comment-1' };
      mockRequest.body = { reason: 'spam' };

      // Mock comment existence
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'comment-1' },
              error: null
            })
          })
        })
      });

      // Mock existing report found
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'existing-report' },
                error: null
              })
            })
          })
        })
      });

      await reportComment(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'You have already reported this comment'
      });
    });
  });

  describe('getEmployeeRatings', () => {
    it('should return employee ratings with distribution', async () => {
      mockRequest.params = { employee_id: 'emp-1' };

      const mockRatings = [
        { rating: 5, created_at: '2025-01-01' },
        { rating: 5, created_at: '2025-01-02' },
        { rating: 4, created_at: '2025-01-03' },
        { rating: 3, created_at: '2025-01-04' }
      ];

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({
                data: mockRatings,
                error: null
              })
            })
          })
        })
      });

      await getEmployeeRatings(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        average_rating: 4.25, // (5+5+4+3)/4
        total_ratings: 4,
        distribution: {
          1: 0,
          2: 0,
          3: 1,
          4: 1,
          5: 2
        },
        ratings: mockRatings
      });
    });

    it('should return null average for no ratings', async () => {
      mockRequest.params = { employee_id: 'emp-2' };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      });

      await getEmployeeRatings(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        average_rating: null,
        total_ratings: 0,
        distribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0
        },
        ratings: []
      });
    });
  });

  describe('getUserRating', () => {
    it('should return user rating for employee', async () => {
      mockRequest.params = { employee_id: 'emp-1' };

      const mockRating = {
        id: 'rating-1',
        rating: 5,
        content: 'Excellent',
        created_at: '2025-01-01'
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [mockRating],
                      error: null
                    })
                  })
                })
              })
            })
          })
        })
      });

      await getUserRating(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        user_rating: mockRating
      });
    });

    it('should return null if user has not rated', async () => {
      mockRequest.params = { employee_id: 'emp-2' };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [],
                      error: null
                    })
                  })
                })
              })
            })
          })
        })
      });

      await getUserRating(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        user_rating: null
      });
    });
  });

  describe('updateUserRating', () => {
    it('should create new rating if none exists', async () => {
      mockRequest.params = { employee_id: 'emp-1' };
      mockRequest.body = { rating: 5, content: 'Amazing!' };

      // Mock employee check
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'emp-1', status: 'approved' },
                error: null
              })
            })
          })
        })
      });

      // Mock existing rating check (none found)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' }
                  })
                })
              })
            })
          })
        })
      });

      // Mock new rating creation
      const newRating = {
        id: 'rating-new',
        rating: 5,
        content: 'Amazing!',
        user: { pseudonym: 'testuser' }
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newRating,
              error: null
            })
          })
        })
      });

      await updateUserRating(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Rating added successfully',
        comment: newRating
      });
    });

    it('should update existing rating', async () => {
      mockRequest.params = { employee_id: 'emp-1' };
      mockRequest.body = { rating: 4, content: 'Updated rating' };

      // Mock employee check
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'emp-1', status: 'approved' },
                error: null
              })
            })
          })
        })
      });

      // Mock existing rating found
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'rating-existing' },
                    error: null
                  })
                })
              })
            })
          })
        })
      });

      // Mock rating update
      const updatedRating = {
        id: 'rating-existing',
        rating: 4,
        content: 'Updated rating',
        user: { pseudonym: 'testuser' }
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedRating,
                error: null
              })
            })
          })
        })
      });

      await updateUserRating(mockRequest as AuthRequest, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Rating updated successfully',
        comment: updatedRating
      });
    });

    it('should return 400 for invalid rating', async () => {
      mockRequest.params = { employee_id: 'emp-1' };
      mockRequest.body = { rating: 6 }; // Invalid rating

      await updateUserRating(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Valid rating (1-5) is required'
      });
    });

    it('should return 404 if employee not found', async () => {
      mockRequest.params = { employee_id: 'non-existent' };
      mockRequest.body = { rating: 5 };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' }
              })
            })
          })
        })
      });

      await updateUserRating(mockRequest as AuthRequest, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Employee not found or not approved'
      });
    });
  });
});
