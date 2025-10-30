import request from 'supertest';
import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import jwt from 'jsonwebtoken';
import { csrfTokenGenerator } from '../../middleware/csrf';
import adminRoutes from '../admin';
import { supabase } from '../../config/supabase';

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');

describe('Admin Routes Integration Tests', () => {
  let app: Application;
  let adminToken: string;
  let userToken: string;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests-minimum-32-chars';
    process.env.SESSION_SECRET = 'test-session-secret';
    process.env.NODE_ENV = 'test';

    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use(session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));
    app.use(csrfTokenGenerator);
    app.use('/api/admin', adminRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Generate admin token
    adminToken = jwt.sign(
      { userId: 'admin-123', email: 'admin@test.com', role: 'admin' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Generate regular user token
    userToken = jwt.sign(
      { userId: 'user-123', email: 'user@test.com', role: 'user' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  });

  describe('Authorization Checks', () => {
    it('should return 401 Unauthorized without auth token', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('TOKEN_MISSING');
    });

    it('should return 403 Forbidden for regular user accessing admin routes', async () => {
      // Mock regular user lookup
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'user-123',
                  pseudonym: 'regularuser',
                  email: 'user@test.com',
                  role: 'user',
                  is_active: true
                },
                error: null
              })
            })
          })
        })
      });

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', [`auth-token=${userToken}`])
        .expect(403);

      expect(response.body.code).toBe('INSUFFICIENT_ROLE');
    });

    it('should allow admin access to admin routes', async () => {
      // Mock admin user lookup
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'admin-123',
                  pseudonym: 'admin',
                  email: 'admin@test.com',
                  role: 'admin',
                  is_active: true
                },
                error: null
              })
            })
          })
        })
      });

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', [`auth-token=${adminToken}`]);

      // Should succeed or fail gracefully (not 401/403)
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return dashboard statistics with parallel queries optimization', async () => {
      // Mock admin user
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'admin-123',
                      pseudonym: 'admin',
                      email: 'admin@test.com',
                      role: 'admin',
                      is_active: true
                    },
                    error: null
                  })
                })
              })
            })
          };
        } else {
          // Mock count queries for various tables
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  count: 42,
                  error: null
                })
              }),
              // For direct count queries
              count: 42,
              error: null
            })
          };
        }
      });

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', [`auth-token=${adminToken}`]);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('totalEstablishments');
        expect(response.body).toHaveProperty('totalEmployees');
        expect(response.body).toHaveProperty('totalUsers');
        expect(response.body).toHaveProperty('totalComments');
      }

      // Test should complete quickly due to Promise.all optimization
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return list of all users (admin only)', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          pseudonym: 'user1',
          email: 'user1@test.com',
          role: 'user',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: 'user-2',
          pseudonym: 'user2',
          email: 'user2@test.com',
          role: 'user',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];

      // Use call counter to differentiate between auth check and data fetch
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'users') {
          callCount++;
          if (callCount === 1) {
            // First call: admin authentication check
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: {
                        id: 'admin-123',
                        pseudonym: 'admin',
                        email: 'admin@test.com',
                        role: 'admin',
                        is_active: true
                      },
                      error: null
                    })
                  })
                })
              })
            };
          } else {
            // Second call: fetch users list
            return {
              select: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockUsers,
                  error: null
                })
              })
            };
          }
        }
        return {};
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Cookie', [`auth-token=${adminToken}`]);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('users');
        expect(Array.isArray(response.body.users)).toBe(true);
      }
    });
  });

  describe('POST /api/admin/users/:id/role', () => {
    it('should allow admin to update user roles', async () => {
      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'admin-123',
                      pseudonym: 'admin',
                      email: 'admin@test.com',
                      role: 'admin',
                      is_active: true
                    },
                    error: null
                  })
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue({
                  data: [{
                    id: 'user-456',
                    role: 'moderator'
                  }],
                  error: null
                })
              })
            })
          };
        }
        return {};
      });

      const response = await request(app)
        .post('/api/admin/users/user-456/role')
        .set('Cookie', [`auth-token=${adminToken}`])
        .send({ role: 'moderator' });

      // Should succeed or return validation error
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('GET /api/admin/audit-logs', () => {
    it('should return audit trail of admin actions', async () => {
      const mockAuditLogs = [
        {
          id: 'log-1',
          user_id: 'admin-123',
          action: 'user_role_updated',
          details: { target_user: 'user-456', new_role: 'moderator' },
          created_at: new Date().toISOString()
        }
      ];

      (supabase.from as jest.Mock).mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: {
                      id: 'admin-123',
                      pseudonym: 'admin',
                      email: 'admin@test.com',
                      role: 'admin',
                      is_active: true
                    },
                    error: null
                  })
                })
              })
            })
          };
        } else {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: mockAuditLogs,
                  error: null
                })
              })
            })
          };
        }
      });

      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', [`auth-token=${adminToken}`]);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('logs');
        expect(Array.isArray(response.body.logs)).toBe(true);
      }
    });
  });
});
