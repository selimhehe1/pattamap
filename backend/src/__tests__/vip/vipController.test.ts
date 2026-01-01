/**
 * VIP Controller Tests
 *
 * Tests for VIP subscription controller endpoints:
 * - GET /api/vip/pricing/:type (5 tests)
 * - POST /api/vip/purchase (6 tests)
 * - GET /api/vip/my-subscriptions (2 tests)
 * - PATCH /api/vip/subscriptions/:id/cancel (4 tests)
 * - POST /api/admin/vip/verify-payment/:transactionId (6 tests)
 * - GET /api/admin/vip/transactions (4 tests)
 * - POST /api/admin/vip/reject-payment/:transactionId (5 tests)
 *
 * Day 5+ Sprint - Security Testing
 */

import request from 'supertest';
import express from 'express';
import { getPricingOptions, purchaseVIP, getMyVIPSubscriptions, cancelVIPSubscription, verifyPayment, getVIPTransactions, rejectPayment } from '../../controllers/vipController';
import { authenticateToken } from '../../middleware/auth';
import { csrfProtection } from '../../middleware/csrf';
import {
  mockEmployeeOwnership,
  mockEstablishmentOwnership,
  mockEmployee,
  mockEstablishment,
  mockVIPSubscription,
  mockPaymentTransaction,
} from '../../test-helpers/mockOwnership';

// Import mock helpers FIRST
import { createMockQueryBuilder, mockSuccess, mockNotFound } from '../../config/__mocks__/supabase';

// Mock dependencies with explicit factory
jest.mock('../../config/supabase', () => {
  const mockModule = jest.requireActual('../../config/__mocks__/supabase');
  return {
    supabase: mockModule.supabase,
    supabaseClient: mockModule.supabaseClient,
    createMockQueryBuilder: mockModule.createMockQueryBuilder,
    mockSuccess: mockModule.mockSuccess,
    mockError: mockModule.mockError,
    mockNotFound: mockModule.mockNotFound,
  };
});

jest.mock('../../middleware/auth');
jest.mock('../../middleware/csrf');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));
jest.mock('../../utils/notificationHelper', () => ({
  notifyVIPPurchaseConfirmed: jest.fn(),
  notifyVIPPaymentVerified: jest.fn(),
  notifyVIPPaymentRejected: jest.fn(),
  notifyVIPSubscriptionCancelled: jest.fn()
}));

// Import mocks AFTER jest.mock() call
import { supabase } from '../../config/supabase';

describe('VIP Controller Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Re-initialize supabase.from with default implementation
    (supabase.from as jest.Mock).mockImplementation(() => createMockQueryBuilder());

    // Setup Express app for testing
    app = express();
    app.use(express.json());

    // Mock middleware
    (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { id: 'test-user-id', role: 'user' };
      next();
    });

    (csrfProtection as jest.Mock).mockImplementation((req, res, next) => next());

    // Setup routes
    app.get('/api/vip/pricing/:type', getPricingOptions);
    app.post('/api/vip/purchase', authenticateToken, csrfProtection, purchaseVIP);
    app.get('/api/vip/my-subscriptions', authenticateToken, getMyVIPSubscriptions);
    app.patch('/api/vip/subscriptions/:id/cancel', authenticateToken, csrfProtection, cancelVIPSubscription);

    // Admin routes
    app.post('/api/admin/vip/verify-payment/:transactionId', authenticateToken, verifyPayment);
    app.get('/api/admin/vip/transactions', authenticateToken, getVIPTransactions);
    app.post('/api/admin/vip/reject-payment/:transactionId', authenticateToken, rejectPayment);
  });

  describe('GET /api/vip/pricing/:type', () => {
    it('should return employee pricing successfully', async () => {
      const response = await request(app)
        .get('/api/vip/pricing/employee')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('type', 'employee');
      expect(response.body).toHaveProperty('pricing');
      expect(response.body.pricing).toHaveProperty('name');
      expect(response.body.pricing).toHaveProperty('description');
      expect(response.body.pricing).toHaveProperty('features');
      expect(response.body.pricing).toHaveProperty('prices');
      expect(response.body.pricing.prices).toBeInstanceOf(Array);
      expect(response.body.pricing.prices.length).toBe(4); // 7, 30, 90, 365 days
    });

    it('should return establishment pricing successfully', async () => {
      const response = await request(app)
        .get('/api/vip/pricing/establishment')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('type', 'establishment');
      expect(response.body.pricing.prices.length).toBe(4);
    });

    it('should return 400 for invalid subscription type', async () => {
      const response = await request(app)
        .get('/api/vip/pricing/invalid-type')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should include discount information for longer durations', async () => {
      const response = await request(app)
        .get('/api/vip/pricing/employee')
        .expect(200);

      const prices = response.body.pricing.prices;

      // Check 30-day tier has discount
      const tier30 = prices.find((p: any) => p.duration === 30);
      expect(tier30).toBeDefined();
      expect(tier30.discount).toBeGreaterThan(0);

      // Check 90-day tier has higher discount
      const tier90 = prices.find((p: any) => p.duration === 90);
      expect(tier90).toBeDefined();
      expect(tier90.discount).toBeGreaterThan(tier30.discount);
    });

    it('should mark 30-day duration as popular', async () => {
      const response = await request(app)
        .get('/api/vip/pricing/employee')
        .expect(200);

      const tier30 = response.body.pricing.prices.find((p: any) => p.duration === 30);
      expect(tier30.popular).toBe(true);
    });
  });

  describe('POST /api/vip/purchase', () => {
    it('should create VIP subscription successfully', async () => {
      const userId = 'test-user-id';
      const employeeId = 'employee-123';
      const establishmentId = 'est-123';

      const employee = mockEmployee(employeeId, 'Test Employee', establishmentId);
      const ownership = mockEmployeeOwnership(userId, employeeId, establishmentId);
      const subscription = mockVIPSubscription('sub-123', employeeId, 'employee');
      const transaction = mockPaymentTransaction('txn-123', userId, 'employee', 3600);

      // Mock authorization flow: Owner buying VIP for employee
      // Using table-based mocking strategy for clarity
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        switch (table) {
          case 'employees':
            // Query 1: Check if user is the employee (return not found)
            return createMockQueryBuilder(mockNotFound());

          case 'establishment_owners':
            // Query 2: Check if user is establishment owner (return ownership)
            return createMockQueryBuilder(mockSuccess(ownership));

          case 'employee_vip_subscriptions':
            // Multiple calls to this table:
            // Call 1: Check existing subscription (return not found)
            // Call 2+: Insert/update subscription (return subscription)
            const vipSubsCallCount = (supabase.from as jest.Mock).mock.calls.filter(
              c => c[0] === 'employee_vip_subscriptions'
            ).length;

            if (vipSubsCallCount === 1) {
              return createMockQueryBuilder(mockNotFound());
            } else {
              return createMockQueryBuilder(mockSuccess(subscription));
            }

          case 'vip_payment_transactions':
            // Query: Insert transaction
            return createMockQueryBuilder(mockSuccess(transaction));

          default:
            return createMockQueryBuilder(mockNotFound());
        }
      });

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: employeeId,
          duration: 30,
          payment_method: 'cash'
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('subscription');
      expect(response.body.subscription.status).toBe('pending_payment');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee'
          // Missing entity_id, duration, payment_method
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid duration', async () => {
      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 15, // Invalid duration
          payment_method: 'cash'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid payment method', async () => {
      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 30,
          payment_method: 'bitcoin' // Invalid payment method
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should calculate correct price based on duration', async () => {
      const userId = 'test-user-id';
      const employeeId = 'employee-123';
      const establishmentId = 'est-123';

      const ownership = mockEmployeeOwnership(userId, employeeId, establishmentId);
      const subscription = { ...mockVIPSubscription('sub-123', employeeId, 'employee', 'pending_payment', 90), price_paid: 8400 };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(ownership)))
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(subscription)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'txn-123' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(subscription)));

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: employeeId,
          duration: 90,
          payment_method: 'cash'
        })
        .expect(201);

      // Verify price calculation (90 days = 8400 THB with 30% discount)
      expect(response.body.subscription.price_paid).toBe(8400);
    });

    it('should set status to pending_payment for cash payment', async () => {
      const userId = 'test-user-id';
      const employeeId = 'employee-123';
      const establishmentId = 'est-123';

      const ownership = mockEmployeeOwnership(userId, employeeId, establishmentId);
      const subscription = mockVIPSubscription('sub-123', employeeId, 'employee', 'pending_payment');

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(ownership)))
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(subscription)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'txn-123' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(subscription)));

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: employeeId,
          duration: 30,
          payment_method: 'cash'
        })
        .expect(201);

      expect(response.body.subscription.status).toBe('pending_payment');
    });
  });

  describe('GET /api/vip/my-subscriptions', () => {
    it('should return user subscriptions successfully', async () => {
      const employeeSubscription = {
        ...mockVIPSubscription('sub-1', 'emp-123', 'employee', 'active'),
        employees: {
          id: 'emp-123',
          name: 'John Doe',
          nickname: 'JD'
        }
      };

      const establishmentSubscription = {
        ...mockVIPSubscription('sub-2', 'est-123', 'establishment', 'active'),
        establishments: {
          id: 'est-123',
          name: 'Test Bar'
        }
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([employeeSubscription])))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([establishmentSubscription])));

      const response = await request(app)
        .get('/api/vip/my-subscriptions')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('subscriptions');
      expect(response.body.subscriptions).toHaveProperty('employees');
      expect(response.body.subscriptions).toHaveProperty('establishments');
      expect(response.body.subscriptions.employees).toHaveLength(1);
      expect(response.body.subscriptions.establishments).toHaveLength(1);
    });

    it('should return empty arrays if user has no subscriptions', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess([])));

      const response = await request(app)
        .get('/api/vip/my-subscriptions')
        .expect(200);

      expect(response.body.subscriptions.employees).toEqual([]);
      expect(response.body.subscriptions.establishments).toEqual([]);
    });
  });

  describe('PATCH /api/vip/subscriptions/:id/cancel', () => {
    it('should cancel subscription successfully', async () => {
      const userId = 'test-user-id';
      const employeeId = 'employee-123';
      const establishmentId = 'est-123';

      const subscription = mockVIPSubscription('sub-123', employeeId, 'employee', 'active');
      const ownership = mockEmployeeOwnership(userId, employeeId, establishmentId);
      const cancelledSubscription = { ...subscription, status: 'cancelled' };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(subscription)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(ownership)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(cancelledSubscription)));

      const response = await request(app)
        .patch('/api/vip/subscriptions/sub-123/cancel')
        .send({ subscription_type: 'employee' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.subscription.status).toBe('cancelled');
    });

    it('should return 404 for non-existent subscription', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()));

      const response = await request(app)
        .patch('/api/vip/subscriptions/non-existent/cancel')
        .send({ subscription_type: 'employee' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 if user tries to cancel someone else subscription', async () => {
      const employeeId = 'employee-123';
      const subscription = mockVIPSubscription('sub-123', employeeId, 'employee', 'active');

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(subscription)))
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()));

      const response = await request(app)
        .patch('/api/vip/subscriptions/sub-123/cancel')
        .send({ subscription_type: 'employee' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if subscription is already cancelled', async () => {
      const employeeId = 'employee-123';
      const establishmentId = 'est-123';
      const subscription = mockVIPSubscription('sub-123', employeeId, 'employee', 'cancelled');
      const ownership = mockEmployeeOwnership('test-user-id', employeeId, establishmentId);

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(subscription)))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(ownership)));

      const response = await request(app)
        .patch('/api/vip/subscriptions/sub-123/cancel')
        .send({ subscription_type: 'employee' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  // =====================================================
  // ADMIN ENDPOINT TESTS
  // =====================================================

  describe('POST /api/admin/vip/verify-payment/:transactionId', () => {
    const mockTransaction = {
      id: 'txn-123',
      subscription_type: 'employee',
      subscription_id: 'sub-123',
      user_id: 'user-456',
      amount: 3600,
      currency: 'THB',
      payment_method: 'cash',
      payment_status: 'pending',
      created_at: new Date().toISOString()
    };

    const mockSubscription = {
      id: 'sub-123',
      employee_id: 'emp-123',
      status: 'pending_payment',
      tier: 'employee',
      duration: 30,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    it('should verify payment successfully', async () => {
      // Mock admin user
      (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 'admin-user-id', role: 'admin' };
        next();
      });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        switch (table) {
          case 'users':
            return createMockQueryBuilder(mockSuccess({ role: 'admin' }));
          case 'vip_payment_transactions':
            return createMockQueryBuilder(mockSuccess(mockTransaction));
          case 'employee_vip_subscriptions':
            return createMockQueryBuilder(mockSuccess({ ...mockSubscription, status: 'active' }));
          default:
            return createMockQueryBuilder(mockNotFound());
        }
      });

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/txn-123')
        .send({ admin_notes: 'Cash received' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Payment verified and subscription activated');
    });

    it('should return 401 if not authenticated', async () => {
      (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/txn-123')
        .send({ admin_notes: 'Cash received' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 403 if not admin', async () => {
      (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 'regular-user-id', role: 'user' };
        next();
      });

      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockQueryBuilder(mockSuccess({ role: 'user' }))
      );

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/txn-123')
        .send({ admin_notes: 'Cash received' })
        .expect(403);

      expect(response.body.error).toContain('admin');
    });

    it('should return 404 if transaction not found', async () => {
      (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 'admin-user-id', role: 'admin' };
        next();
      });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ role: 'admin' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()));

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/non-existent')
        .send({ admin_notes: 'Cash received' })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Transaction not found');
    });

    it('should return 400 if payment already verified', async () => {
      (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 'admin-user-id', role: 'admin' };
        next();
      });

      const verifiedTransaction = { ...mockTransaction, payment_status: 'completed' };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ role: 'admin' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(verifiedTransaction)));

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/txn-123')
        .send({ admin_notes: 'Cash received' })
        .expect(400);

      expect(response.body.error).toEqual(expect.stringContaining('already'));
    });

    it('should return 400 if payment method is not cash', async () => {
      (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 'admin-user-id', role: 'admin' };
        next();
      });

      const promptpayTransaction = { ...mockTransaction, payment_method: 'promptpay' };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ role: 'admin' })))
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(promptpayTransaction)));

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/txn-123')
        .send({ admin_notes: 'Cash received' })
        .expect(400);

      expect(response.body.error).toEqual(expect.stringContaining('cash'));
    });
  });

  describe('GET /api/admin/vip/transactions', () => {
    const mockTransactions = [
      {
        id: 'txn-1',
        subscription_type: 'employee',
        user_id: 'user-1',
        amount: 3600,
        payment_method: 'cash',
        payment_status: 'pending',
        created_at: new Date().toISOString()
      },
      {
        id: 'txn-2',
        subscription_type: 'establishment',
        user_id: 'user-2',
        amount: 5000,
        payment_method: 'promptpay',
        payment_status: 'completed',
        created_at: new Date().toISOString()
      }
    ];

    beforeEach(() => {
      // Reset to admin user for all transaction tests
      (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 'admin-user-id', role: 'admin' };
        next();
      });
    });

    it('should return all transactions', async () => {
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'vip_payment_transactions') {
          return createMockQueryBuilder(mockSuccess(mockTransactions));
        }
        return createMockQueryBuilder(mockSuccess(null));
      });

      const response = await request(app)
        .get('/api/admin/vip/transactions')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transactions');
      expect(response.body.transactions).toHaveLength(2);
    });

    it('should filter by payment method', async () => {
      const cashTransactions = mockTransactions.filter(t => t.payment_method === 'cash');

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'vip_payment_transactions') {
          return createMockQueryBuilder(mockSuccess(cashTransactions));
        }
        return createMockQueryBuilder(mockSuccess(null));
      });

      const response = await request(app)
        .get('/api/admin/vip/transactions?payment_method=cash')
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].payment_method).toBe('cash');
    });

    it('should filter by status', async () => {
      const pendingTransactions = mockTransactions.filter(t => t.payment_status === 'pending');

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'vip_payment_transactions') {
          return createMockQueryBuilder(mockSuccess(pendingTransactions));
        }
        return createMockQueryBuilder(mockSuccess(null));
      });

      const response = await request(app)
        .get('/api/admin/vip/transactions?status=pending')
        .expect(200);

      expect(response.body.transactions).toHaveLength(1);
      expect(response.body.transactions[0].payment_status).toBe('pending');
    });

    it('should return empty array when no transactions', async () => {
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'vip_payment_transactions') {
          return createMockQueryBuilder(mockSuccess([]));
        }
        return createMockQueryBuilder(mockSuccess(null));
      });

      const response = await request(app)
        .get('/api/admin/vip/transactions')
        .expect(200);

      expect(response.body.transactions).toEqual([]);
      expect(response.body.count).toBe(0);
    });
  });

  describe('POST /api/admin/vip/reject-payment/:transactionId', () => {
    const mockTransaction = {
      id: 'txn-123',
      subscription_type: 'employee',
      subscription_id: 'sub-123',
      user_id: 'user-456',
      amount: 3600,
      payment_method: 'cash',
      payment_status: 'pending',
      created_at: new Date().toISOString()
    };

    beforeEach(() => {
      (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { id: 'admin-user-id', role: 'admin' };
        next();
      });
    });

    it('should reject payment successfully', async () => {
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        switch (table) {
          case 'vip_payment_transactions':
            return createMockQueryBuilder(mockSuccess(mockTransaction));
          case 'employee_vip_subscriptions':
            return createMockQueryBuilder(mockSuccess({ tier: 'employee' }));
          default:
            return createMockQueryBuilder(mockSuccess(null));
        }
      });

      const response = await request(app)
        .post('/api/admin/vip/reject-payment/txn-123')
        .send({ admin_notes: 'Invalid payment proof' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Payment rejected successfully');
    });

    it('should return 401 if not authenticated', async () => {
      (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .post('/api/admin/vip/reject-payment/txn-123')
        .send({ admin_notes: 'Invalid payment proof' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should return 400 if reason is missing', async () => {
      const response = await request(app)
        .post('/api/admin/vip/reject-payment/txn-123')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Rejection reason (admin_notes) is required');
    });

    it('should return 404 if transaction not found', async () => {
      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockQueryBuilder(mockNotFound())
      );

      const response = await request(app)
        .post('/api/admin/vip/reject-payment/non-existent')
        .send({ admin_notes: 'Invalid payment proof' })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Transaction not found');
    });

    it('should return 400 if transaction already processed', async () => {
      const processedTransaction = { ...mockTransaction, payment_status: 'completed' };

      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockQueryBuilder(mockSuccess(processedTransaction))
      );

      const response = await request(app)
        .post('/api/admin/vip/reject-payment/txn-123')
        .send({ admin_notes: 'Invalid payment proof' })
        .expect(400);

      expect(response.body.error).toEqual(expect.stringContaining('status'));
    });
  });

});

