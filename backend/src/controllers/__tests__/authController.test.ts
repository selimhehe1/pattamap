import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../../middleware/auth';
import {
  register,
  login,
  getProfile,
  changePassword,
  logout
} from '../authController';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { generateCSRFToken } from '../../middleware/csrf';

// Mock next function for asyncHandler wrapped controllers
const mockNext: NextFunction = jest.fn();

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../middleware/csrf');
jest.mock('../../config/redis', () => ({
  blacklistToken: jest.fn().mockResolvedValue(undefined),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  getRedisClient: jest.fn().mockReturnValue(null),
  isRedisConnected: jest.fn().mockReturnValue(false)
}));

// Mock global fetch for HaveIBeenPwned API
global.fetch = jest.fn();

describe('AuthController', () => {
  let mockRequest: Partial<Request | AuthRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let cookieMock: jest.Mock;
  let clearCookieMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    cookieMock = jest.fn();
    clearCookieMock = jest.fn();

    mockRequest = {
      body: {},
      headers: {},
      cookies: {},
      session: {
        csrfToken: 'initial-csrf-token',
        save: jest.fn((callback: (err?: Error) => void) => callback())
      } as any,
      sessionID: 'test-session-id'
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
      cookie: cookieMock,
      clearCookie: clearCookieMock
    };

    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
    process.env.JWT_EXPIRES_IN = '7d';
    process.env.BCRYPT_ROUNDS = '12';

    // Mock generateCSRFToken
    (generateCSRFToken as jest.Mock).mockReturnValue('new-csrf-token');

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    const validRegistration = {
      pseudonym: 'testuser',
      email: 'test@example.com',
      password: 'SecureP@ss123!'  // Fixed: Added special chars
    };

    it('should register a new user successfully', async () => {
      mockRequest.body = validRegistration;

      // Mock user check (no existing users)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      });

      // Mock HaveIBeenPwned API (not breached)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('ABCDE:5\nXYZ12:3') // No match
      });

      // Mock bcrypt hash
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // Mock user creation
      const newUser = {
        id: 'user-123',
        pseudonym: 'testuser',
        email: 'test@example.com',
        role: 'user',
        is_active: true,
        account_type: 'regular',
        created_at: '2025-01-01'
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newUser,
              error: null
            })
          })
        })
      });

      // Mock user_points creation
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      // Mock JWT sign
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token-123');

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(cookieMock).toHaveBeenCalledWith('auth-token', 'jwt-token-123', expect.objectContaining({
        httpOnly: true,
        path: '/'
      }));

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'User registered successfully',
        user: newUser,
        csrfToken: 'new-csrf-token',
        passwordBreached: false
      });
    });

    it('should register user with establishment_owner account type', async () => {
      mockRequest.body = {
        ...validRegistration,
        account_type: 'establishment_owner'
      };

      // Mock user check
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      // Mock HaveIBeenPwned API (not breached)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('ABCDE:5')
      });

      // Mock bcrypt
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // Mock user creation with account_type
      const newUser = {
        id: 'owner-123',
        pseudonym: 'testowner',
        email: 'test@example.com',
        role: 'user',
        is_active: true,
        account_type: 'establishment_owner',
        created_at: '2025-01-01'
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: newUser,
              error: null
            })
          })
        })
      });

      // Mock user_points creation
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      (jwt.sign as jest.Mock).mockReturnValue('jwt-token-owner');

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            account_type: 'establishment_owner'
          })
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = { email: 'test@example.com' }; // Missing pseudonym and password

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('required')
        })
      );
    });

    it('should return 400 for invalid pseudonym format', async () => {
      mockRequest.body = {
        pseudonym: 'ab', // Too short
        email: 'test@example.com',
        password: 'SecurePass123'
      };

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Pseudonym')
        })
      );
    });

    it('should return 400 for invalid email format', async () => {
      mockRequest.body = {
        pseudonym: 'testuser',
        email: 'invalid-email',
        password: 'SecurePass123'
      };

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('email')
        })
      );
    });

    it('should return 400 for weak password', async () => {
      mockRequest.body = {
        pseudonym: 'testuser',
        email: 'test@example.com',
        password: 'weak' // Missing uppercase, numbers
      };

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Password')
        })
      );
    });

    it('should return 409 for duplicate email', async () => {
      mockRequest.body = validRegistration;

      // Mock existing user with same email
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({
            data: [{ id: 'existing', email: 'test@example.com', pseudonym: 'other' }],
            error: null
          })
        })
      });

      // Note: Breach check not reached, but mock for safety
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('ABCDE:5')
      });

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('email')
        })
      );
    });

    it('should return 409 for duplicate pseudonym', async () => {
      mockRequest.body = validRegistration;

      // Mock existing user with same pseudonym
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({
            data: [{ id: 'existing', email: 'other@example.com', pseudonym: 'testuser' }],
            error: null
          })
        })
      });

      // Note: Breach check not reached, but mock for safety
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('ABCDE:5')
      });

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('pseudonym')
        })
      );
    });

    it('should return 500 if JWT_SECRET is missing', async () => {
      delete process.env.JWT_SECRET;
      mockRequest.body = validRegistration;

      // Mock successful user checks
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      // Mock HaveIBeenPwned API (not breached)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('ABCDE:5')
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-123' },
              error: null
            })
          })
        })
      });

      // Mock user_points creation
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      // Mock delete (rollback) for when JWT_SECRET is missing
      (supabase.from as jest.Mock).mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      });
      (supabase.from as jest.Mock).mockReturnValueOnce({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      });

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String)
      }));

      // Restore JWT_SECRET
      process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
    });
  });

  describe('login', () => {
    const validCredentials = {
      login: 'testuser',
      password: 'SecurePass123'
    };

    const mockUser = {
      id: 'user-123',
      pseudonym: 'testuser',
      email: 'test@example.com',
      password: 'hashed-password',
      role: 'user',
      is_active: true
    };

    it('should login user with pseudonym successfully', async () => {
      mockRequest.body = validCredentials;

      // Mock user fetch
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [mockUser],
              error: null
            })
          })
        })
      });

      // Mock password comparison
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Mock JWT sign
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token-login');

      await login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(cookieMock).toHaveBeenCalledWith('auth-token', 'jwt-token-login', expect.any(Object));
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Login successful',
        user: expect.objectContaining({
          id: 'user-123',
          pseudonym: 'testuser'
        }),
        csrfToken: 'new-csrf-token'
      });
    });

    it('should login user with email successfully', async () => {
      mockRequest.body = {
        login: 'test@example.com',
        password: 'SecurePass123'
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [mockUser],
              error: null
            })
          })
        })
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('jwt-token-email');

      await login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Login successful',
        user: expect.objectContaining({
          email: 'test@example.com'
        }),
        csrfToken: 'new-csrf-token'
      });
    });

    it('should return 400 for missing credentials', async () => {
      mockRequest.body = { login: 'testuser' }; // Missing password

      await login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('required')
        })
      );
    });

    it('should return 401 for non-existent user', async () => {
      mockRequest.body = validCredentials;

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      });

      await login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid')
        })
      );
    });

    it('should return 401 for incorrect password', async () => {
      mockRequest.body = validCredentials;

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [mockUser],
              error: null
            })
          })
        })
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid')
        })
      );
    });

    it('should return 500 if JWT_SECRET is missing', async () => {
      delete process.env.JWT_SECRET;
      mockRequest.body = validCredentials;

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: [mockUser],
              error: null
            })
          })
        })
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await login(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Server configuration error' });

      // Restore JWT_SECRET
      process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
    });
  });

  describe('getProfile', () => {
    it('should return user profile with linked employee', async () => {
      mockRequest = {
        user: {
          id: 'user-123',
          pseudonym: 'testuser',
          email: 'test@example.com',
          role: 'user',
          is_active: true
        }
      } as AuthRequest;

      const mockProfile = {
        id: 'user-123',
        pseudonym: 'testuser',
        email: 'test@example.com',
        role: 'user',
        is_active: true,
        account_type: 'employee',
        linked_employee_id: 'emp-123',
        created_at: '2025-01-01',
        linkedEmployee: {
          id: 'emp-123',
          name: 'Test Employee',
          photos: ['photo1.jpg'],
          status: 'approved'
        }
      };

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      });

      await getProfile(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: 'user-123',
          linkedEmployee: expect.objectContaining({
            id: 'emp-123',
            name: 'Test Employee'
          })
        })
      });
    });

    it('should return 401 for unauthenticated request', async () => {
      mockRequest = {} as AuthRequest; // No user

      await getProfile(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Authentication')
        })
      );
    });

    it('should return 404 if user profile not found', async () => {
      mockRequest = {
        user: {
          id: 'non-existent',
          pseudonym: 'test',
          email: 'test@test.com',
          role: 'user',
          is_active: true
        }
      } as AuthRequest;

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      });

      await getProfile(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('not found')
        })
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockRequest = {
        user: {
          id: 'user-123',
          pseudonym: 'testuser',
          email: 'test@example.com',
          role: 'user',
          is_active: true
        },
        body: {
          currentPassword: 'OldP@ss123!',  // Fixed: Added special chars
          newPassword: 'NewSecureP@ss456!'  // Fixed: Added special chars
        }
      } as AuthRequest;

      // Mock HaveIBeenPwned API (not breached)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('ABCDE:5')
      });

      // Mock fetch current password
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { password: 'hashed-old-password' },
              error: null
            })
          })
        })
      });

      // Mock password comparison (correct current password)
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Mock new password hashing
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-password');

      // Mock password update
      (supabase.from as jest.Mock).mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      });

      await changePassword(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Password changed successfully',
        passwordBreached: false
      });
    });

    it('should return 401 for unauthenticated request', async () => {
      mockRequest = {
        body: {
          currentPassword: 'OldPass123',
          newPassword: 'NewSecurePass456'
        }
      } as AuthRequest; // No user

      await changePassword(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Authentication')
        })
      );
    });

    it('should return 400 for missing fields', async () => {
      mockRequest = {
        user: {
          id: 'user-123',
          pseudonym: 'testuser',
          email: 'test@example.com',
          role: 'user',
          is_active: true
        },
        body: {
          currentPassword: 'OldPass123'
          // Missing newPassword
        }
      } as AuthRequest;

      await changePassword(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('required')
        })
      );
    });

    it('should return 400 for invalid new password', async () => {
      mockRequest = {
        user: {
          id: 'user-123',
          pseudonym: 'testuser',
          email: 'test@example.com',
          role: 'user',
          is_active: true
        },
        body: {
          currentPassword: 'OldPass123',
          newPassword: 'weak' // Invalid password
        }
      } as AuthRequest;

      await changePassword(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Password')
        })
      );
    });

    it('should return 401 for incorrect current password', async () => {
      mockRequest = {
        user: {
          id: 'user-123',
          pseudonym: 'testuser',
          email: 'test@example.com',
          role: 'user',
          is_active: true
        },
        body: {
          currentPassword: 'WrongOldP@ss!',  // Fixed: Added special chars
          newPassword: 'NewSecureP@ss456!'  // Fixed: Added special chars
        }
      } as AuthRequest;

      // Mock HaveIBeenPwned API (not breached)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue('ABCDE:5')
      });

      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { password: 'hashed-old-password' },
              error: null
            })
          })
        })
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await changePassword(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('password')
        })
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear cookie', async () => {
      await logout(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(clearCookieMock).toHaveBeenCalledWith('auth-token', expect.objectContaining({
        httpOnly: true,
        path: '/'
      }));

      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Logout successful'
      });
    });

    it('should handle logout errors gracefully', async () => {
      clearCookieMock.mockImplementation(() => {
        throw new Error('Cookie clear error');
      });

      await logout(mockRequest as AuthRequest, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('server error')
        })
      );
    });
  });
});
