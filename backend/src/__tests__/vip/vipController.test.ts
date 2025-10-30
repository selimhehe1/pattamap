/**
 * 🧪 VIP Controller Tests
 *
 * Tests for VIP subscription controller endpoints
 * - GET /api/vip/pricing/:type (5/5 tests passing ✅)
 * - POST /api/vip/purchase (3/6 tests passing, 3 failing due to authorization mock issues ⚠️)
 * - GET /api/vip/my-subscriptions (1/2 tests passing, 1 failing due to mock issues ⚠️)
 * - PATCH /api/vip/subscriptions/:id/cancel (1/4 tests passing, 3 failing due to mock issues ⚠️)
 *
 * CURRENT STATUS: 10/17 tests passing (59%)
 *
 * ⚠️ KNOWN ISSUES:
 * - Authorization mocks in complex queries (purchase, cancel) are not working correctly
 * - Subscription queries with joins are not properly mocked
 * - Admin endpoints (verifyPayment, getVIPTransactions, rejectPayment) need tests
 *
 * TODO:
 * - Debug and fix authorization mock setup for purchase/cancel flows
 * - Add tests for admin endpoints
 * - Investigate supabase mock query builder thenable implementation
 */

import request from 'supertest';
import express from 'express';
import { getPricingOptions, purchaseVIP, getMyVIPSubscriptions, cancelVIPSubscription } from '../../controllers/vipController';
import { authenticateToken } from '../../middleware/auth';
import { csrfProtection } from '../../middleware/csrf';
import {
  mockEmployeeOwnership,
  mockEstablishmentOwnership,
  mockEmployee,
  mockEstablishment,
  mockVIPSubscription,
  mockPaymentTransaction,
} from './helpers/mockOwnership';

// Mock dependencies
jest.mock('../../config/supabase');
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
import { supabase, createMockQueryBuilder, mockSuccess, mockNotFound } from '../../config/__mocks__/supabase';

describe('VIP Controller Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Re-initialize supabase.from with default behavior (don't clear mocks to preserve jest.mock() implementations)
    supabase.from = jest.fn((table: string) => createMockQueryBuilder());

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

      // Chain all mocks in order
      (supabase.from as jest.Mock)
        // Mock 1: employees query (line 152-157)
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        // Mock 2: establishment_owners query (line 168-178)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(ownership)))
        // Mock 3: existing subscription check (line 220-226)
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        // Mock 4: subscription insert (line 277-281)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(subscription)))
        // Mock 5: transaction insert (line 296-313)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(transaction)))
        // Mock 6: subscription update (line 328-331)
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

  // TODO: Fix authorization mock issues in purchase, my-subscriptions, and cancel tests
  // These 7 tests are currently failing due to mock setup problems with complex authorization queries
  // The mocks need to be refactored to properly handle the authorization flow
});

