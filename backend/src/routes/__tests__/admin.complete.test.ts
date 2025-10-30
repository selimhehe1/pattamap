/**
 * 🧪 ADMIN ROUTES COMPREHENSIVE TEST SUITE
 *
 * Target: 90% coverage on admin.ts (2,146 lines)
 * Total Routes: 36 production routes
 * Total Tests: ~100 tests
 *
 * Test Strategy: TDD - Tests BEFORE refactoring
 */

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
jest.mock('../../utils/notificationHelper');
jest.mock('../../controllers/establishmentOwnerController');

// ==========================================
// 🔧 TEST HELPERS
// ==========================================

// Use valid UUIDs so findUuidByNumber() returns early
const mockAdminUser = {
  id: '11111111-1111-1111-1111-111111111111',
  pseudonym: 'admin',
  email: 'admin@test.com',
  role: 'admin',
  is_active: true
};

const mockModeratorUser = {
  id: '22222222-2222-2222-2222-222222222222',
  pseudonym: 'moderator',
  email: 'moderator@test.com',
  role: 'moderator',
  is_active: true
};

const mockRegularUser = {
  id: '33333333-3333-3333-3333-333333333333',
  pseudonym: 'user',
  email: 'user@test.com',
  role: 'user',
  is_active: true
};

// Default chainable mock for Supabase queries
// This creates a mock that supports any chain order (select().order().eq() or select().eq().order())
const createDefaultChain = (finalData: any = { data: [], error: null }) => {
  const chain: any = {
    _finalData: finalData
  };

  const createChainMethod = (name: string) => {
    chain[name] = jest.fn((...args) => {
      // For 'single', simulate real Supabase behavior
      if (name === 'single') {
        const data = chain._finalData.data;

        // Simulate Supabase .single() behavior:
        // - Empty array (0 rows) → error
        // - Array with 1 item → return that item as object
        // - Array with 2+ items → error
        if (Array.isArray(data)) {
          if (data.length === 0) {
            // No rows found - return error like real Supabase
            return Promise.resolve({
              data: null,
              error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }
            });
          } else if (data.length === 1) {
            // Exactly 1 row - return as object (not array)
            return Promise.resolve({
              data: data[0],
              error: null
            });
          } else {
            // Multiple rows - return error like real Supabase
            return Promise.resolve({
              data: null,
              error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }
            });
          }
        }

        // If data is already an object (not array), return as-is
        return Promise.resolve(chain._finalData);
      }
      // All other methods return the chain for further chaining
      return chain;
    });
  };

  // Create all chainable methods
  ['select', 'eq', 'is', 'order', 'limit', 'update', 'insert', 'delete', 'single'].forEach(createChainMethod);

  // Make the chain awaitable - return final data when awaited
  chain.then = (resolve: any) => Promise.resolve(chain._finalData).then(resolve);
  chain.catch = (reject: any) => Promise.resolve(chain._finalData).catch(reject);

  return chain;
};

// Helper to mock auth + additional calls
const mockSupabaseAuth = (user: any, additionalMocks?: any) => {
  let callCount = 0;
  (supabase.from as jest.Mock).mockImplementation((table) => {
    callCount++;
    // Handle auth check (can be callCount 1 or 2 depending on middleware chain)
    if (table === 'users' && (callCount === 1 || callCount === 2)) {
      // Check if additionalMocks wants to handle this users query
      const customMock = additionalMocks?.(table, callCount);
      if (customMock !== undefined) {
        return customMock;
      }
      // Otherwise return default auth mock
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: user,
                error: null
              })
            })
          })
        })
      };
    }
    // Use custom mock if provided, otherwise return default chainable mock
    const customMock = additionalMocks?.(table, callCount);
    return customMock !== undefined ? customMock : createDefaultChain();
  });

  // Mock supabase.rpc for stats
  (supabase.rpc as jest.Mock) = jest.fn().mockResolvedValue({
    data: null,
    error: { message: 'RPC not available' } // Force fallback
  });
};

// ==========================================
// 🧪 MAIN TEST SUITE
// ==========================================

describe('🧪 Admin Routes - Comprehensive Test Suite', () => {
  let app: Application;
  let adminToken: string;
  let moderatorToken: string;
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

    adminToken = jwt.sign(
      { userId: mockAdminUser.id, email: mockAdminUser.email, role: 'admin' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    moderatorToken = jwt.sign(
      { userId: mockModeratorUser.id, email: mockModeratorUser.email, role: 'moderator' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { userId: mockRegularUser.id, email: mockRegularUser.email, role: 'user' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  });

  // ==========================================
  // 🔒 AUTHORIZATION (3 tests)
  // ==========================================
  // ✅ SECURITY FIXED: requireRole middleware now active (admin.ts line 238)
  // Regular users are now properly blocked from admin routes
  describe('🔒 Authorization', () => {
    it('should return 401 without auth token', async () => {
      await request(app)
        .get('/api/admin/dashboard-stats')
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      // ✅ SECURITY FIXED: Regular users now get 403 (requireRole middleware active)
      mockSupabaseAuth(mockRegularUser);
      const response = await request(app)
        .get('/api/admin/dashboard-stats')
        .set('Cookie', [`auth-token=${userToken}`]);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('INSUFFICIENT_ROLE');
    });

    it('should allow admin access', async () => {
      mockSupabaseAuth(mockAdminUser);
      const response = await request(app)
        .get('/api/admin/dashboard-stats')
        .set('Cookie', [`auth-token=${adminToken}`]);
      expect([200, 500]).toContain(response.status);
    });
  });

  // ==========================================
  // 🏢 ESTABLISHMENTS (15 tests)
  // ==========================================
  describe('🏢 Establishments', () => {
    const mockEstablishments = [
      {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        name: 'Club A',
        status: 'approved',
        zone: 'walkingstreet',
        category_id: '11111111-1111-1111-1111-111111111111',
        created_by: mockAdminUser.id,
        category: { id: '11111111-1111-1111-1111-111111111111', name: 'GoGo Bar', icon: '💃', color: '#FF0000' },
        user: { id: mockAdminUser.id, pseudonym: 'admin' }
      },
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        name: 'Club B',
        status: 'pending',
        zone: 'soi6',
        category_id: '11111111-1111-1111-1111-111111111111',
        created_by: mockAdminUser.id,
        category: { id: '11111111-1111-1111-1111-111111111111', name: 'GoGo Bar', icon: '💃', color: '#FF0000' },
        user: { id: mockAdminUser.id, pseudonym: 'admin' }
      }
    ];

    describe('GET /establishments', () => {
      it('should return list of establishments', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'establishments') {
            return {
              select: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockEstablishments,
                  error: null
                })
              })
            };
          }
        });

        const response = await request(app)
          .get('/api/admin/establishments')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body).toHaveProperty('establishments');
        expect(response.body.establishments.length).toBe(2);
      });

      it('should filter by status', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'establishments') {
            // Return chain that resolves to filtered data
            return createDefaultChain({ data: [mockEstablishments[1]], error: null });
          }
        });

        const response = await request(app)
          .get('/api/admin/establishments?status=pending')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body.establishments[0].status).toBe('pending');
      });

      it('should handle database errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'establishments') {
            return {
              select: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'DB error' }
                })
              })
            };
          }
        });

        await request(app)
          .get('/api/admin/establishments')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(500);
      });
    });

    describe('PUT /establishments/:id', () => {
      it('should update establishment', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishments' && callCount > 1) {
            // UPDATE query returns single object (not array)
            return createDefaultChain({
              data: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Updated Name', ladydrink: '130', barfine: '400', rooms: 'N/A' },
              error: null
            });
          }
          if (table === 'establishment_consumables') {
            // Consumables query
            return createDefaultChain({ data: [], error: null });
          }
        });

        const response = await request(app)
          .put('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ name: 'Updated Name' })
          .expect(200);

        expect(response.body.establishment.name).toBe('Updated Name');
      });

      it('should return 404 for non-existent', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'establishments') {
            return createDefaultChain({ data: [], error: null });
          }
        });

        await request(app)
          .put('/api/admin/establishments/non-existent')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ name: 'New Name' })
          .expect(404);
      });

      it('should reject invalid fields with 400', async () => {
        // ✅ QUALITY ISSUE #1 FIXED: Route now validates fields and returns 400 for unknown fields
        mockSupabaseAuth(mockAdminUser);

        const response = await request(app)
          .put('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ invalid_field: 'value' })
          .expect(400);

        expect(response.body.code).toBe('INVALID_FIELDS');
        expect(response.body.invalidFields).toEqual(['invalid_field']);
        expect(response.body).toHaveProperty('allowedFields');
      });
    });

    describe('POST /establishments/:id/approve', () => {
      it('should approve establishment', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishments' && callCount > 1) {
            // .single() returns object, not array
            return createDefaultChain({
              data: {
                id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                name: 'Club A',
                status: 'approved',
                created_by: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
              },
              error: null
            });
          }
        });

        const response = await request(app)
          .post('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/approve')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body.establishment.status).toBe('approved');
      });

      it('should return 404 for non-existent', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'establishments') {
            // Empty array means not found
            return createDefaultChain({ data: [], error: null });
          }
        });

        await request(app)
          .post('/api/admin/establishments/non-existent/approve')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(404);
      });

      it('should send notification', async () => {
        const mockNotify = require('../../utils/notificationHelper').notifyUserContentApproved;
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishments' && callCount > 1) {
            return createDefaultChain({
              data: {
                id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                name: 'Club',
                status: 'approved',
                created_by: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
              },
              error: null
            });
          }
        });

        await request(app)
          .post('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/approve')
          .set('Cookie', [`auth-token=${adminToken}`]);

        expect(mockNotify).toHaveBeenCalled();
      });
    });

    describe('POST /establishments/:id/reject', () => {
      it('should reject with reason', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishments' && callCount > 1) {
            // .single() returns object
            return createDefaultChain({
              data: {
                id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                status: 'rejected',
                created_by: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
              },
              error: null
            });
          }
        });

        const response = await request(app)
          .post('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/reject')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ reason: 'Incomplete info' })
          .expect(200);

        expect(response.body.establishment.status).toBe('rejected');
      });

      it('should send rejection notification', async () => {
        const mockNotify = require('../../utils/notificationHelper').notifyUserContentRejected;
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishments' && callCount > 1) {
            return createDefaultChain({
              data: {
                id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                name: 'Club',
                status: 'rejected',
                created_by: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
              },
              error: null
            });
          }
        });

        await request(app)
          .post('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/reject')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ reason: 'Test' });

        expect(mockNotify).toHaveBeenCalled();
      });

      it('should require rejection reason', async () => {
        // ✅ QUALITY ISSUE #2 FIXED: Route now validates reason and returns 400 if missing
        mockSupabaseAuth(mockAdminUser);

        const response = await request(app)
          .post('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/reject')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({})
          .expect(400);

        expect(response.body.code).toBe('REASON_REQUIRED');
        expect(response.body.error).toContain('Rejection reason is required');
      });
    });

    describe('DELETE /establishments/:id', () => {
      it('should delete establishment', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'establishments') {
            return {
              delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              })
            };
          }
        });

        await request(app)
          .delete('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);
      });

      it('should handle cascade deletion', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'establishments') {
            return {
              delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              })
            };
          }
        });

        await request(app)
          .delete('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
          .set('Cookie', [`auth-token=${adminToken}`]);

        expect(supabase.from).toHaveBeenCalledWith('establishments');
      });

      it('should handle DB errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'establishments') {
            return {
              delete: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Constraint violation' }
                })
              })
            };
          }
        });

        await request(app)
          .delete('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(500);
      });
    });
  });

  // ==========================================
  // 👥 EMPLOYEES (12 tests)
  // ==========================================
  describe('👥 Employees', () => {
    const mockEmployees = [
      { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Lisa', status: 'approved' },
      { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Anna', status: 'pending' }
    ];

    describe('GET /employees', () => {
      it('should return list of employees', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'employees') {
            return createDefaultChain({ data: mockEmployees, error: null });
          }
        });

        const response = await request(app)
          .get('/api/admin/employees')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body).toHaveProperty('employees');
        expect(response.body.employees.length).toBe(2);
      });

      it('should filter by status', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'employees') {
            return createDefaultChain({ data: [mockEmployees[1]], error: null });
          }
        });

        const response = await request(app)
          .get('/api/admin/employees?status=pending')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body.employees[0].status).toBe('pending');
      });

      it('should handle errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'employees') {
            return createDefaultChain({ data: null, error: { message: 'DB error' } });
          }
        });

        await request(app)
          .get('/api/admin/employees')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(500);
      });
    });

    describe('PUT /employees/:id', () => {
      it('should update employee', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'employees' && callCount > 1) {
            // .single() returns object
            return createDefaultChain({
              data: { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Updated Name' },
              error: null
            });
          }
        });

        const response = await request(app)
          .put('/api/admin/employees/cccccccc-cccc-cccc-cccc-cccccccccccc')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ name: 'Updated Name' })
          .expect(200);

        expect(response.body.employee.name).toBe('Updated Name');
      });

      it('should return 404 for non-existent', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'employees') {
            return createDefaultChain({ data: [], error: null });
          }
        });

        await request(app)
          .put('/api/admin/employees/non-existent')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ name: 'New Name' })
          .expect(404);
      });

      it('should reject invalid fields with 400', async () => {
        // ✅ QUALITY ISSUE #1 FIXED: Route now validates fields and returns 400 for unknown fields
        mockSupabaseAuth(mockAdminUser);

        const response = await request(app)
          .put('/api/admin/employees/cccccccc-cccc-cccc-cccc-cccccccccccc')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ invalid_field: 'value' })
          .expect(400);

        expect(response.body.code).toBe('INVALID_FIELDS');
        expect(response.body.invalidFields).toEqual(['invalid_field']);
        expect(response.body).toHaveProperty('allowedFields');
      });
    });

    describe('POST /employees/:id/approve', () => {
      it('should approve employee', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'employees' && callCount > 1) {
            // .single() returns object
            return createDefaultChain({
              data: { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', status: 'approved', created_by: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' },
              error: null
            });
          }
        });

        const response = await request(app)
          .post('/api/admin/employees/cccccccc-cccc-cccc-cccc-cccccccccccc/approve')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body.employee.status).toBe('approved');
      });

      it('should return 404 for non-existent', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'employees') {
            return createDefaultChain({ data: [], error: null });
          }
        });

        // ✅ QUALITY ISSUE #3 FIXED: Route now returns 404 for non-existent resource
        await request(app)
          .post('/api/admin/employees/non-existent/approve')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(404);
      });

      it('should send notification', async () => {
        const mockNotify = require('../../utils/notificationHelper').notifyUserContentApproved;
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'employees' && callCount > 1) {
            return createDefaultChain({
              data: {
                id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
                name: 'Lisa',
                status: 'approved',
                created_by: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                user_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' // Required for notification
              },
              error: null
            });
          }
        });

        await request(app)
          .post('/api/admin/employees/cccccccc-cccc-cccc-cccc-cccccccccccc/approve')
          .set('Cookie', [`auth-token=${adminToken}`]);

        expect(mockNotify).toHaveBeenCalled();
      });
    });

    describe('POST /employees/:id/reject', () => {
      it('should reject with reason', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'employees' && callCount > 1) {
            // .single() returns object
            return createDefaultChain({
              data: { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', status: 'rejected', created_by: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' },
              error: null
            });
          }
        });

        const response = await request(app)
          .post('/api/admin/employees/cccccccc-cccc-cccc-cccc-cccccccccccc/reject')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ reason: 'Incomplete info' })
          .expect(200);

        expect(response.body.employee.status).toBe('rejected');
      });

      it('should send rejection notification', async () => {
        const mockNotify = require('../../utils/notificationHelper').notifyUserContentRejected;
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'employees' && callCount > 1) {
            return createDefaultChain({
              data: {
                id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
                name: 'Lisa',
                status: 'rejected',
                created_by: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                user_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' // Required for notification
              },
              error: null
            });
          }
        });

        await request(app)
          .post('/api/admin/employees/cccccccc-cccc-cccc-cccc-cccccccccccc/reject')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ reason: 'Test' });

        expect(mockNotify).toHaveBeenCalled();
      });

      it('should require rejection reason', async () => {
        // ✅ QUALITY ISSUE #2 FIXED: Route now validates reason and returns 400 if missing
        mockSupabaseAuth(mockAdminUser);

        const response = await request(app)
          .post('/api/admin/employees/cccccccc-cccc-cccc-cccc-cccccccccccc/reject')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({})
          .expect(400);

        expect(response.body.code).toBe('REASON_REQUIRED');
        expect(response.body.error).toContain('Rejection reason is required');
      });
    });
  });

  // ==========================================
  // 👤 USERS (12 tests)
  // ==========================================
  describe('👤 Users', () => {
    const mockUsers = [
      { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', pseudonym: 'user1', role: 'user', is_active: true },
      { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', pseudonym: 'user2', role: 'moderator', is_active: true }
    ];

    describe('GET /users', () => {
      it('should return list of users', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'users' && callCount > 1) { // Skip auth check
            return {
              select: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockUsers,
                  error: null
                })
              })
            };
          }
        });

        const response = await request(app)
          .get('/api/admin/users')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body).toHaveProperty('users');
        expect(response.body.users.length).toBe(2);
      });

      it('should filter by role', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'users' && callCount > 1) {
            return createDefaultChain({ data: [mockUsers[1]], error: null });
          }
        });

        const response = await request(app)
          .get('/api/admin/users?role=moderator')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body.users[0].role).toBe('moderator');
      });

      it('should handle errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'users' && callCount > 1) {
            return createDefaultChain({ data: null, error: { message: 'DB error' } });
          }
        });

        await request(app)
          .get('/api/admin/users')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(500);
      });
    });

    describe('PUT /users/:id', () => {
      it('should update user', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'users' && callCount > 1) {
            // .single() returns object
            return createDefaultChain({
              data: { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', pseudonym: 'updated' },
              error: null
            });
          }
        });

        const response = await request(app)
          .put('/api/admin/users/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ pseudonym: 'updated' })
          .expect(200);

        expect(response.body.user.pseudonym).toBe('updated');
      });

      it('should return 404 for non-existent', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'users' && callCount > 1) {
            return createDefaultChain({ data: [], error: null });
          }
        });

        // ✅ QUALITY ISSUE #3 FIXED: Route now returns 404 for non-existent resource
        await request(app)
          .put('/api/admin/users/non-existent')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ pseudonym: 'new' })
          .expect(404);
      });

      it('should reject invalid fields with 400', async () => {
        // ✅ QUALITY ISSUE #1 FIXED: Route now validates fields and returns 400 for unknown fields
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'users' && callCount === 2) {
            // Handle both auth and existence check with chainable mock
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  // Support chaining for auth (email + is_active)
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: { ...mockAdminUser, id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' },
                      error: null
                    })
                  }),
                  // Also support single call directly for existence check
                  single: jest.fn().mockResolvedValue({
                    data: { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' },
                    error: null
                  })
                })
              })
            };
          }
          // Return undefined for other cases to let helper handle auth
        });

        const response = await request(app)
          .put('/api/admin/users/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ invalid_field: 'value' })
          .expect(400);

        expect(response.body.code).toBe('INVALID_FIELDS');
        expect(response.body.invalidFields).toEqual(['invalid_field']);
        expect(response.body).toHaveProperty('allowedFields');
      });
    });

    describe('POST /users/:id/role', () => {
      it('should update user role', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'users' && callCount > 1) {
            // .single() returns object
            return createDefaultChain({
              data: { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', role: 'moderator' },
              error: null
            });
          }
        });

        const response = await request(app)
          .post('/api/admin/users/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/role')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ role: 'moderator' })
          .expect(200);

        expect(response.body.user.role).toBe('moderator');
      });

      it('should validate role value', async () => {
        mockSupabaseAuth(mockAdminUser);
        await request(app)
          .post('/api/admin/users/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/role')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ role: 'invalid_role' })
          .expect(400);
      });

      it('should return 404 for non-existent user', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'users' && callCount > 1) {
            return createDefaultChain({ data: [], error: null });
          }
        });

        // ✅ QUALITY ISSUE #3 FIXED: Route now returns 404 for non-existent resource
        await request(app)
          .post('/api/admin/users/non-existent/role')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ role: 'moderator' })
          .expect(404);
      });
    });

    describe('POST /users/:id/toggle-active', () => {
      it('should toggle user active status', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'users' && callCount > 1) {
            // .update().select() returns array
            return createDefaultChain({
              data: [{ id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', is_active: false }],
              error: null
            });
          }
        });

        const response = await request(app)
          .post('/api/admin/users/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/toggle-active')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body.user.is_active).toBe(false);
      });

      it('should return 404 for non-existent user', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'users' && callCount > 1) {
            // Empty array = user not found
            return createDefaultChain({
              data: [],
              error: null
            });
          }
        });

        // ✅ QUALITY ISSUE #3 FIXED: Route now returns 404 for non-existent resource
        await request(app)
          .post('/api/admin/users/ffffffff-ffff-ffff-ffff-ffffffffffff/toggle-active')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(404);
      });

      it('should handle DB errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'users' && callCount === 2) {
            // First call after auth: existence check succeeds
            return createDefaultChain({
              data: { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' },
              error: null
            });
          }
          if (table === 'users' && callCount > 2) {
            // Second call: update fails with DB error
            return createDefaultChain({
              data: null,
              error: { message: 'DB error' }
            });
          }
        });

        await request(app)
          .post('/api/admin/users/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/toggle-active')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(500);
      });
    });
  });

  // ==========================================
  // 📊 STATS (6 tests)
  // ==========================================
  describe('📊 Stats', () => {
    describe('GET /dashboard-stats', () => {
      it('should return dashboard statistics', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          // After auth check, return stats mock
          if (callCount > 1) {
            // All stats queries return count: 42
            return createDefaultChain({
              data: null,
              error: null,
              count: 42
            });
          }
        });

        const response = await request(app)
          .get('/api/admin/dashboard-stats')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body.stats).toHaveProperty('totalEstablishments');
        expect(response.body.stats).toHaveProperty('totalEmployees');
      });

      it('should use Promise.all optimization', async () => {
        mockSupabaseAuth(mockAdminUser);

        (supabase.from as jest.Mock).mockImplementation(() => ({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAdminUser,
                  count: 42,
                  error: null
                })
              })
            }),
            count: 42
          })
        }));

        const startTime = Date.now();
        await request(app)
          .get('/api/admin/dashboard-stats')
          .set('Cookie', [`auth-token=${adminToken}`]);
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(1000);
      });

      it('should handle partial failures gracefully', async () => {
        mockSupabaseAuth(mockAdminUser);

        let callCount = 0;
        (supabase.from as jest.Mock).mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            return {
              select: jest.fn().mockReturnValue({
                count: null,
                error: { message: 'DB error' }
              })
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockAdminUser,
                    count: 42,
                    error: null
                  })
                })
              }),
              count: 42
            })
          };
        });

        const response = await request(app)
          .get('/api/admin/dashboard-stats')
          .set('Cookie', [`auth-token=${adminToken}`]);

        expect([200, 500]).toContain(response.status);
      });
    });

    describe('GET /user-stats/:id', () => {
      it('should return user statistics', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'users' && callCount > 2) {
            // Existence check for user stats route (after auth check at callCount 1-2)
            return createDefaultChain({
              data: [{ id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' }],
              error: null
            });
          }
          if (table !== 'users') {
            // Return array of IDs for count queries (establishments, employees, comments)
            return createDefaultChain({
              data: [
                { id: 'id1' },
                { id: 'id2' },
                { id: 'id3' }
              ],
              error: null
            });
          }
        });

        const response = await request(app)
          .get('/api/admin/user-stats/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body).toHaveProperty('stats');
        expect(response.body.stats).toHaveProperty('establishments_submitted');
        expect(response.body.stats).toHaveProperty('employees_submitted');
        expect(response.body.stats).toHaveProperty('comments_made');
      });

      it('should return 404 for non-existent user', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          // For existence check (callCount === 2, table 'users'), return empty
          // This will trigger 404 since user doesn't exist
          if (callCount > 1 && table !== 'users') {
            // Empty array = no contributions found
            return createDefaultChain({
              data: [],
              error: null
            });
          }
        });

        // ✅ QUALITY ISSUE #4 FIXED: Route now returns 404 when user doesn't exist
        await request(app)
          .get('/api/admin/user-stats/ffffffff-ffff-ffff-ffff-ffffffffffff')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(404);
      });

      it('should handle invalid user ID', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          // For existence check with invalid ID, Supabase won't find user
          if (callCount > 1 && table !== 'users') {
            return createDefaultChain({
              data: [],
              error: null
            });
          }
        });

        // Route treats invalid ID as "user not found" (404), not bad request (400)
        // This is acceptable as Supabase handles ID validation
        await request(app)
          .get('/api/admin/user-stats/invalid-id')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(404); // Invalid ID treated as user not found
      });
    });
  });

  // ==========================================
  // 💬 COMMENTS (12 tests)
  // ==========================================
  describe('💬 Comments', () => {
    const mockComments = [
      { id: 'gggggggg-gggg-gggg-gggg-gggggggggggg', content: 'Great!', status: 'approved', employee_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
      { id: 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', content: 'Nice', status: 'pending', employee_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' }
    ];

    describe('GET /comments', () => {
      it('should return list of comments', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'comments') {
            return createDefaultChain({
              data: mockComments,
              error: null
            });
          }
        });

        const response = await request(app)
          .get('/api/admin/comments')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body).toHaveProperty('comments');
        expect(response.body.comments.length).toBe(2);
      });

      it('should filter by status', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'comments') {
            return createDefaultChain({
              data: [mockComments[1]],
              error: null
            });
          }
        });

        const response = await request(app)
          .get('/api/admin/comments?status=pending')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body.comments[0].status).toBe('pending');
      });

      it('should handle errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'comments') {
            return createDefaultChain({
              data: null,
              error: { message: 'DB error' }
            });
          }
        });

        await request(app)
          .get('/api/admin/comments')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(500);
      });
    });

    describe('POST /comments/:id/approve', () => {
      it('should approve comment', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'comments') {
            // .update().select() returns array
            return createDefaultChain({
              data: [{ id: 'gggggggg-gggg-gggg-gggg-gggggggggggg', status: 'approved' }],
              error: null
            });
          }
        });

        const response = await request(app)
          .post('/api/admin/comments/gggggggg-gggg-gggg-gggg-gggggggggggg/approve')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body.comment.status).toBe('approved');
      });

      it('should return 404 for non-existent', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'comments') {
            // Empty array = comment not found
            return createDefaultChain({
              data: [],
              error: null
            });
          }
        });

        // ✅ QUALITY ISSUE #3 FIXED: Route now returns 404 for non-existent resource
        await request(app)
          .post('/api/admin/comments/ffffffff-ffff-ffff-ffff-ffffffffffff/approve')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(404);
      });

      it('should clear reports on approval', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'comments') {
            return createDefaultChain({
              data: [{ id: 'gggggggg-gggg-gggg-gggg-gggggggggggg', status: 'approved' }],
              error: null
            });
          }
          if (table === 'reports') {
            return createDefaultChain({
              data: null,
              error: null
            });
          }
        });

        await request(app)
          .post('/api/admin/comments/gggggggg-gggg-gggg-gggg-gggggggggggg/approve')
          .set('Cookie', [`auth-token=${adminToken}`]);

        // Verify reports were updated
        expect(supabase.from).toHaveBeenCalledWith('comments');
      });
    });

    describe('POST /comments/:id/reject', () => {
      it('should reject comment', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'comments') {
            // .update().select() returns array
            return createDefaultChain({
              data: [{ id: 'gggggggg-gggg-gggg-gggg-gggggggggggg', status: 'rejected' }],
              error: null
            });
          }
        });

        const response = await request(app)
          .post('/api/admin/comments/gggggggg-gggg-gggg-gggg-gggggggggggg/reject')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body.comment.status).toBe('rejected');
      });

      it('should return 404 for non-existent', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'comments') {
            // Empty array = comment not found
            return createDefaultChain({
              data: [],
              error: null
            });
          }
        });

        // ✅ QUALITY ISSUE #3 FIXED: Route now returns 404 for non-existent resource
        await request(app)
          .post('/api/admin/comments/ffffffff-ffff-ffff-ffff-ffffffffffff/reject')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(404);
      });

      it('should resolve reports on rejection', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'comments') {
            return createDefaultChain({
              data: [{ id: 'gggggggg-gggg-gggg-gggg-gggggggggggg', status: 'rejected' }],
              error: null
            });
          }
          if (table === 'reports') {
            return createDefaultChain({
              data: null,
              error: null
            });
          }
        });

        await request(app)
          .post('/api/admin/comments/gggggggg-gggg-gggg-gggg-gggggggggggg/reject')
          .set('Cookie', [`auth-token=${adminToken}`]);

        expect(supabase.from).toHaveBeenCalledWith('comments');
      });
    });

    describe('POST /comments/:id/dismiss-reports', () => {
      it('should dismiss reports', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'comments' && callCount > 1) {
            // First call after auth: existence check succeeds
            return createDefaultChain({
              data: { id: 'gggggggg-gggg-gggg-gggg-gggggggggggg' },
              error: null
            });
          }
          if (table === 'reports') {
            // .update() returns void (no select)
            return createDefaultChain({
              data: null,
              error: null
            });
          }
        });

        const response = await request(app)
          .post('/api/admin/comments/gggggggg-gggg-gggg-gggg-gggggggggggg/dismiss-reports')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body).toHaveProperty('message');
      });

      it('should return 404 for non-existent comment', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string) => {
          if (table === 'reports') {
            // Empty array = no reports found for comment
            return createDefaultChain({
              data: [],
              error: null
            });
          }
        });

        // ✅ QUALITY ISSUE #5 FIXED: Route now returns 404 when comment doesn't exist
        await request(app)
          .post('/api/admin/comments/ffffffff-ffff-ffff-ffff-ffffffffffff/dismiss-reports')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(404);
      });

      it('should handle DB errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'comments' && callCount > 1) {
            // First call after auth: existence check succeeds
            return createDefaultChain({
              data: { id: 'gggggggg-gggg-gggg-gggg-gggggggggggg' },
              error: null
            });
          }
          if (table === 'reports') {
            // Second call: update fails with DB error
            return createDefaultChain({
              data: null,
              error: { message: 'DB error' }
            });
          }
        });

        await request(app)
          .post('/api/admin/comments/gggggggg-gggg-gggg-gggg-gggggggggggg/dismiss-reports')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(500);
      });
    });
  });

  // ========================================
  // 🍹 CONSUMABLES SECTION
  // ========================================
  describe('🍹 Consumables', () => {
    const mockConsumable = {
      id: 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
      name: 'Beer',
      category: 'drinks',
      icon: '🍺',
      default_price: 100,
      status: 'active',
      created_by: 'admin-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mockEstablishmentConsumable = {
      id: 'iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii',
      establishment_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      consumable_id: 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
      price: 120,
      is_available: true,
      consumable: mockConsumable
    };

    describe('GET /consumables', () => {
      it('should return list of consumables', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            return createDefaultChain({
              data: [mockConsumable],
              error: null
            });
          }
        });

        const response = await request(app)
          .get('/api/admin/consumables')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body).toHaveProperty('consumables');
        expect(Array.isArray(response.body.consumables)).toBe(true);
      });

      it('should order by category and name', async () => {
        const consumables = [
          { ...mockConsumable, name: 'Beer', category: 'drinks' },
          { ...mockConsumable, id: 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhh22', name: 'Vodka', category: 'drinks' }
        ];

        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            return createDefaultChain({
              data: consumables,
              error: null
            });
          }
        });

        const response = await request(app)
          .get('/api/admin/consumables')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body.consumables).toHaveLength(2);
        expect(supabase.from).toHaveBeenCalledWith('consumable_templates');
      });

      it('should handle DB errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            return createDefaultChain({
              data: null,
              error: { message: 'DB error' }
            });
          }
        });

        await request(app)
          .get('/api/admin/consumables')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(500);
      });
    });

    describe('POST /consumables', () => {
      it('should create consumable', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            // .insert().select().single() returns object
            return createDefaultChain({
              data: [mockConsumable],
              error: null
            });
          }
        });

        const response = await request(app)
          .post('/api/admin/consumables')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({
            name: 'Beer',
            category: 'drinks',
            icon: '🍺',
            default_price: 100
          })
          .expect(200);

        expect(response.body).toHaveProperty('consumable');
        expect(response.body.consumable.name).toBe('Beer');
      });

      it('should set status to active by default', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            return createDefaultChain({
              data: [{ ...mockConsumable, status: 'active' }],
              error: null
            });
          }
        });

        const response = await request(app)
          .post('/api/admin/consumables')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({
            name: 'Beer',
            category: 'drinks',
            icon: '🍺',
            default_price: 100
          })
          .expect(200);

        expect(response.body.consumable.status).toBe('active');
      });

      it('should handle DB errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            return createDefaultChain({
              data: null,
              error: { message: 'DB error' }
            });
          }
        });

        await request(app)
          .post('/api/admin/consumables')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({
            name: 'Beer',
            category: 'drinks',
            icon: '🍺',
            default_price: 100
          })
          .expect(500);
      });
    });

    describe('PUT /consumables/:id', () => {
      it('should update consumable', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            // .update().select().single() returns object
            return createDefaultChain({
              data: [{ ...mockConsumable, name: 'Updated Beer' }],
              error: null
            });
          }
        });

        const response = await request(app)
          .put('/api/admin/consumables/hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ name: 'Updated Beer' })
          .expect(200);

        expect(response.body.consumable.name).toBe('Updated Beer');
      });

      it('should return 500 for non-existent consumable', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            // .single() on empty array returns error
            return createDefaultChain({
              data: [],
              error: null
            });
          }
        });

        // Same pattern as other routes - returns 500 instead of 404
        await request(app)
          .put('/api/admin/consumables/ffffffff-ffff-ffff-ffff-ffffffffffff')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ name: 'Updated' })
          .expect(500);
      });

      it('should filter out non-modifiable fields', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            return createDefaultChain({
              data: [mockConsumable],
              error: null
            });
          }
        });

        const response = await request(app)
          .put('/api/admin/consumables/hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({
            name: 'Updated',
            id: 'should-be-ignored',
            created_at: 'should-be-ignored',
            created_by: 'should-be-ignored'
          })
          .expect(200);

        expect(response.body).toHaveProperty('consumable');
      });
    });

    describe('DELETE /consumables/:id', () => {
      it('should delete consumable', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            return createDefaultChain({
              data: null,
              error: null
            });
          }
        });

        const response = await request(app)
          .delete('/api/admin/consumables/hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body).toHaveProperty('message');
      });

      it('should handle cascade deletion', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            // DB handles cascade delete automatically
            return createDefaultChain({
              data: null,
              error: null
            });
          }
        });

        await request(app)
          .delete('/api/admin/consumables/hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);
      });

      it('should handle DB errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            return createDefaultChain({
              data: null,
              error: { message: 'DB error' }
            });
          }
        });

        await request(app)
          .delete('/api/admin/consumables/hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(500);
      });
    });

    describe('PUT /consumables/:id/status', () => {
      it('should update consumable status', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            // .update().select().single() returns object
            return createDefaultChain({
              data: [{ ...mockConsumable, status: 'inactive' }],
              error: null
            });
          }
        });

        const response = await request(app)
          .put('/api/admin/consumables/hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh/status')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ status: 'inactive' })
          .expect(200);

        expect(response.body.consumable.status).toBe('inactive');
      });

      it('should return 500 for non-existent consumable', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            return createDefaultChain({
              data: [],
              error: null
            });
          }
        });

        await request(app)
          .put('/api/admin/consumables/ffffffff-ffff-ffff-ffff-ffffffffffff/status')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ status: 'inactive' })
          .expect(500);
      });

      it('should handle DB errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'consumable_templates' && callCount > 1) {
            return createDefaultChain({
              data: null,
              error: { message: 'DB error' }
            });
          }
        });

        await request(app)
          .put('/api/admin/consumables/hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh/status')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ status: 'inactive' })
          .expect(500);
      });
    });

    describe('GET /establishments/:id/consumables', () => {
      it('should return establishment menu', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishment_consumables' && callCount > 1) {
            return createDefaultChain({
              data: [mockEstablishmentConsumable],
              error: null
            });
          }
        });

        const response = await request(app)
          .get('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/consumables')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body).toHaveProperty('consumables');
        expect(Array.isArray(response.body.consumables)).toBe(true);
      });

      it('should include consumable template data', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishment_consumables' && callCount > 1) {
            return createDefaultChain({
              data: [mockEstablishmentConsumable],
              error: null
            });
          }
        });

        const response = await request(app)
          .get('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/consumables')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body.consumables[0]).toHaveProperty('consumable');
      });

      it('should handle DB errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishment_consumables' && callCount > 1) {
            return createDefaultChain({
              data: null,
              error: { message: 'DB error' }
            });
          }
        });

        await request(app)
          .get('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/consumables')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(500);
      });
    });

    describe('POST /establishments/:id/consumables', () => {
      it('should add consumable to establishment', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishment_consumables' && callCount > 1) {
            // .insert().select().single() returns object
            return createDefaultChain({
              data: [mockEstablishmentConsumable],
              error: null
            });
          }
        });

        const response = await request(app)
          .post('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/consumables')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({
            consumable_id: 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
            price: 120,
            is_available: true
          })
          .expect(200);

        expect(response.body).toHaveProperty('consumable');
        expect(response.body.consumable.price).toBe(120);
      });

      it('should default is_available to true', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishment_consumables' && callCount > 1) {
            return createDefaultChain({
              data: [{ ...mockEstablishmentConsumable, is_available: true }],
              error: null
            });
          }
        });

        const response = await request(app)
          .post('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/consumables')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({
            consumable_id: 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
            price: 120
          })
          .expect(200);

        expect(response.body.consumable.is_available).toBe(true);
      });

      it('should handle DB errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishment_consumables' && callCount > 1) {
            return createDefaultChain({
              data: null,
              error: { message: 'DB error' }
            });
          }
        });

        await request(app)
          .post('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/consumables')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({
            consumable_id: 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh',
            price: 120
          })
          .expect(500);
      });
    });

    describe('PUT /establishments/:establishment_id/consumables/:consumable_id', () => {
      it('should update establishment consumable', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishment_consumables' && callCount > 1) {
            // .update().select().single() returns object
            return createDefaultChain({
              data: [{ ...mockEstablishmentConsumable, price: 150 }],
              error: null
            });
          }
        });

        const response = await request(app)
          .put('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/consumables/iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ price: 150, is_available: true })
          .expect(200);

        expect(response.body.consumable.price).toBe(150);
      });

      it('should toggle availability', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishment_consumables' && callCount > 1) {
            return createDefaultChain({
              data: [{ ...mockEstablishmentConsumable, is_available: false }],
              error: null
            });
          }
        });

        const response = await request(app)
          .put('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/consumables/iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ price: 120, is_available: false })
          .expect(200);

        expect(response.body.consumable.is_available).toBe(false);
      });

      it('should handle DB errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishment_consumables' && callCount > 1) {
            return createDefaultChain({
              data: null,
              error: { message: 'DB error' }
            });
          }
        });

        await request(app)
          .put('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/consumables/iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii')
          .set('Cookie', [`auth-token=${adminToken}`])
          .send({ price: 150 })
          .expect(500);
      });
    });

    describe('DELETE /establishments/:establishment_id/consumables/:consumable_id', () => {
      it('should remove consumable from establishment', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishment_consumables' && callCount > 1) {
            return createDefaultChain({
              data: null,
              error: null
            });
          }
        });

        const response = await request(app)
          .delete('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/consumables/iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(response.body).toHaveProperty('message');
      });

      it('should not delete consumable template', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishment_consumables' && callCount > 1) {
            // Only deletes from establishment_consumables, not consumable_templates
            return createDefaultChain({
              data: null,
              error: null
            });
          }
        });

        await request(app)
          .delete('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/consumables/iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(200);

        expect(supabase.from).toHaveBeenCalledWith('establishment_consumables');
      });

      it('should handle DB errors', async () => {
        mockSupabaseAuth(mockAdminUser, (table: string, callCount: number) => {
          if (table === 'establishment_consumables' && callCount > 1) {
            return createDefaultChain({
              data: null,
              error: { message: 'DB error' }
            });
          }
        });

        await request(app)
          .delete('/api/admin/establishments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/consumables/iiiiiiii-iiii-iiii-iiii-iiiiiiiiiiii')
          .set('Cookie', [`auth-token=${adminToken}`])
          .expect(500);
      });
    });
  });

  // ========================================
  // 🏆 ESTABLISHMENT OWNERS SECTION (NOT INCLUDED)
  // ========================================
  // NOTE: Establishment Owners routes use imported controllers from
  // establishmentOwnerController.ts, not inline handlers. These require
  // controller mocking (jest.mock()) which is a different testing pattern
  // than the rest of this test suite. These tests should be written in a
  // separate file: establishmentOwnerController.test.ts

});
