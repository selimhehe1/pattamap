import { Response, NextFunction } from 'express';
import { authenticateSupabaseToken, authenticateSupabaseTokenAllowNew, authenticateSupabaseTokenOptional, SupabaseAuthRequest } from '../supabaseAuth';
import { verifySupabaseToken } from '../../config/supabaseAuth';
import { supabase } from '../../config/supabase';

// Mock dependencies - must use factory for supabaseAuth to prevent createClient from running
jest.mock('../../config/supabaseAuth', () => ({
  verifySupabaseToken: jest.fn(),
  getSupabaseUserByEmail: jest.fn().mockResolvedValue(null),
  createSupabaseUserWithHash: jest.fn().mockResolvedValue(null),
  updateSupabaseUserMetadata: jest.fn().mockResolvedValue(false),
  supabaseAdmin: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      admin: { listUsers: jest.fn().mockResolvedValue({ data: { users: [] }, error: null }) },
    },
  },
}));
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');

describe('Supabase Auth Middleware', () => {
  let mockRequest: Partial<SupabaseAuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const validSupabaseUser = {
    id: 'supabase-uid-123',
    email: 'test@example.com',
    aud: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    created_at: '2025-01-01T00:00:00Z'
  };

  const validDbUser = {
    id: 'db-user-123',
    pseudonym: 'testuser',
    email: 'test@example.com',
    role: 'user' as const,
    is_active: true,
    account_type: 'regular' as const,
    linked_employee_id: null,
    auth_id: 'supabase-uid-123'
  };

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      headers: {},
      method: 'POST',
      originalUrl: '/api/auth/sync-user'
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to mock supabase.from().select().eq().single()
  const mockSupabaseQuery = (data: unknown, error: unknown = null) => {
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data, error })
        })
      })
    });
  };

  describe('authenticateSupabaseToken', () => {
    it('should authenticate valid token with existing user', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      (verifySupabaseToken as jest.Mock).mockResolvedValue(validSupabaseUser);
      mockSupabaseQuery(validDbUser);

      await authenticateSupabaseToken(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(validDbUser);
      expect(mockRequest.supabaseUser).toEqual(validSupabaseUser);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject request with no token', async () => {
      await authenticateSupabaseToken(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      (verifySupabaseToken as jest.Mock).mockResolvedValue(null);

      await authenticateSupabaseToken(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 USER_NOT_SYNCED when user not in DB', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      (verifySupabaseToken as jest.Mock).mockResolvedValue(validSupabaseUser);
      mockSupabaseQuery(null, { message: 'Row not found' });

      await authenticateSupabaseToken(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'User not found. Please complete registration.',
        code: 'USER_NOT_SYNCED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject inactive user', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      (verifySupabaseToken as jest.Mock).mockResolvedValue(validSupabaseUser);
      mockSupabaseQuery({ ...validDbUser, is_active: false });

      await authenticateSupabaseToken(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Account is deactivated',
        code: 'USER_INACTIVE'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle verifySupabaseToken throwing an error', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      (verifySupabaseToken as jest.Mock).mockRejectedValue(new Error('Network error'));

      await authenticateSupabaseToken(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Authentication error',
        code: 'AUTH_ERROR'
      });
    });
  });

  describe('authenticateSupabaseTokenAllowNew', () => {
    it('should authenticate existing user (same as authenticateSupabaseToken)', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      (verifySupabaseToken as jest.Mock).mockResolvedValue(validSupabaseUser);
      mockSupabaseQuery(validDbUser);

      await authenticateSupabaseTokenAllowNew(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(validDbUser);
      expect(mockRequest.supabaseUser).toEqual(validSupabaseUser);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should allow new user (not in DB) through with only supabaseUser', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      (verifySupabaseToken as jest.Mock).mockResolvedValue(validSupabaseUser);
      mockSupabaseQuery(null, { message: 'Row not found' });

      await authenticateSupabaseTokenAllowNew(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      // Should NOT have req.user (no DB user)
      expect(mockRequest.user).toBeUndefined();
      // Should have req.supabaseUser (Supabase-verified identity)
      expect(mockRequest.supabaseUser).toEqual(validSupabaseUser);
      // Should call next() instead of returning 401
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject request with no token', async () => {
      await authenticateSupabaseTokenAllowNew(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockRequest.headers = { authorization: 'Bearer bad-token' };
      (verifySupabaseToken as jest.Mock).mockResolvedValue(null);

      await authenticateSupabaseTokenAllowNew(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject inactive existing user', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      (verifySupabaseToken as jest.Mock).mockResolvedValue(validSupabaseUser);
      mockSupabaseQuery({ ...validDbUser, is_active: false });

      await authenticateSupabaseTokenAllowNew(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Account is deactivated',
        code: 'USER_INACTIVE'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle verifySupabaseToken throwing an error', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      (verifySupabaseToken as jest.Mock).mockRejectedValue(new Error('Service unavailable'));

      await authenticateSupabaseTokenAllowNew(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Authentication error',
        code: 'AUTH_ERROR'
      });
    });
  });

  describe('authenticateSupabaseTokenOptional', () => {
    it('should continue without user when no token provided', async () => {
      await authenticateSupabaseTokenOptional(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user when token is invalid', async () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      (verifySupabaseToken as jest.Mock).mockResolvedValue(null);

      await authenticateSupabaseTokenOptional(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach user when token is valid and user exists', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      (verifySupabaseToken as jest.Mock).mockResolvedValue(validSupabaseUser);
      mockSupabaseQuery(validDbUser);

      await authenticateSupabaseTokenOptional(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(validDbUser);
      expect(mockRequest.supabaseUser).toEqual(validSupabaseUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user when user not found in DB', async () => {
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      (verifySupabaseToken as jest.Mock).mockResolvedValue(validSupabaseUser);
      mockSupabaseQuery(null, { message: 'Row not found' });

      await authenticateSupabaseTokenOptional(mockRequest as SupabaseAuthRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
