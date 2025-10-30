/**
 * 🧪 VIP Controller Tests
 *
 * Tests for VIP subscription controller endpoints
 * - GET /api/vip/pricing/:type
 * - POST /api/vip/purchase
 * - GET /api/vip/my-subscriptions
 * - PATCH /api/vip/subscriptions/:id/cancel
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
    warn: jest.fn()
  }
}));

// Import mocks AFTER jest.mock() call
import { supabase, createMockQueryBuilder, mockSuccess, mockNotFound } from '../../config/__mocks__/supabase';

describe('VIP Controller Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Clear all mocks FIRST
    jest.clearAllMocks();

    // Reset supabase.from to default behavior
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

      // Mock ownership check (ligne 150-160) - CRITICAL pour éviter 403
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(ownership))
      );

      // Mock existing subscription check (ligne 193-199)
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound()) // Pas de subscription active
      );

      // Mock transaction insert (ligne 230-245)
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(transaction))
      );

      // Mock subscription insert (ligne 255-275)
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(subscription))
      );

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: employeeId,
          duration: 30,
          payment_method: 'cash'
        })
        .expect(200);

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
      let capturedSubscription: any;

      // Mock ownership check
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(ownership))
      );

      // Mock existing subscription check
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );

      // Mock transaction insert
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'txn-123' }))
      );

      // Mock subscription insert - Capture data
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockImplementation((data) => {
          capturedSubscription = data[0]; // Insert expects array
          return createMockQueryBuilder(mockSuccess({ ...data[0], id: 'sub-123' }));
        })
      });

      await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: employeeId,
          duration: 90,
          payment_method: 'cash'
        })
        .expect(200);

      // Verify price calculation (90 days = 8400 THB with 30% discount)
      expect(capturedSubscription.price_paid).toBe(8400);
    });

    it('should set status to pending_payment for cash payment', async () => {
      const userId = 'test-user-id';
      const employeeId = 'employee-123';
      const establishmentId = 'est-123';

      const ownership = mockEmployeeOwnership(userId, employeeId, establishmentId);
      let capturedSubscription: any;

      // Mock ownership check
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(ownership))
      );

      // Mock existing subscription check
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );

      // Mock transaction insert
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'txn-123' }))
      );

      // Mock subscription insert - Capture status
      (supabase.from as jest.Mock).mockReturnValueOnce({
        insert: jest.fn().mockImplementation((data) => {
          capturedSubscription = data[0];
          return createMockQueryBuilder(mockSuccess({ ...data[0], id: 'sub-123' }));
        })
      });

      await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: employeeId,
          duration: 30,
          payment_method: 'cash'
        })
        .expect(200);

      expect(capturedSubscription.status).toBe('pending_payment');
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

      // Mock employee subscriptions query (ligne 364-374)
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess([employeeSubscription]))
      );

      // Mock establishment subscriptions query (ligne 377-386)
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess([establishmentSubscription]))
      );

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
      // Mock employee subscriptions (empty)
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess([]))
      );

      // Mock establishment subscriptions (empty)
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess([]))
      );

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

      // Mock fetch subscription (ligne 436-440)
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(subscription))
      );

      // Mock ownership check (ligne 455-461)
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(ownership))
      );

      // Mock update subscription (ligne 490-500)
      const cancelledSubscription = { ...subscription, status: 'cancelled' };
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(cancelledSubscription))
      );

      const response = await request(app)
        .patch('/api/vip/subscriptions/sub-123/cancel')
        .send({ subscription_type: 'employee' }) // CRITICAL: subscription_type required
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.subscription.status).toBe('cancelled');
    });

    it('should return 404 for non-existent subscription', async () => {
      // Mock fetch subscription - Not found
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );

      const response = await request(app)
        .patch('/api/vip/subscriptions/non-existent/cancel')
        .send({ subscription_type: 'employee' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 if user tries to cancel someone else subscription', async () => {
      const employeeId = 'employee-123';
      const subscription = mockVIPSubscription('sub-123', employeeId, 'employee', 'active');

      // Mock fetch subscription - Found
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(subscription))
      );

      // Mock ownership check - No ownership (different user)
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound()) // No ownership found
      );

      const response = await request(app)
        .patch('/api/vip/subscriptions/sub-123/cancel')
        .send({ subscription_type: 'employee' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if subscription is already cancelled', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'test-user-id',
        status: 'cancelled'
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSubscription, error: null })
      });

      const response = await request(app)
        .patch('/api/vip/subscriptions/sub-123/cancel')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
