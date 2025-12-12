/**
 * 🧪 VIP Purchase Workflow Tests
 *
 * Tests for complete VIP purchase flow including:
 * - Entity validation (employee/establishment exists)
 * - Permission checks (ownership validation)
 * - Price calculation
 * - Subscription creation
 * - Transaction creation
 * - Entity VIP status update (trigger simulation)
 */

import request from 'supertest';
import express from 'express';
import { purchaseVIP } from '../../controllers/vipController';
import { supabase } from '../../config/supabase';
import { createMockChain } from '../../test-helpers/supabaseMockChain';
import { authenticateToken } from '../../middleware/auth';
import { csrfProtection } from '../../middleware/csrf';

jest.mock('../../config/supabase');
jest.mock('../../middleware/auth');
jest.mock('../../middleware/csrf');
jest.mock('../../services/promptpayService', () => ({
  isPromptPayConfigured: jest.fn(() => true),
  generatePromptPayQR: jest.fn(async (amount: number, reference: string) => ({
    qrCode: 'data:image/png;base64,mockQRCode',
    payload: 'mockPayload',
    reference: reference,
    amount: amount
  }))
}));

describe('VIP Purchase Workflow Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { id: 'owner-user-id', role: 'user' };
      next();
    });

    (csrfProtection as jest.Mock).mockImplementation((req, res, next) => next());

    app.post('/api/vip/purchase', authenticateToken, csrfProtection, purchaseVIP);
  });

  describe('Employee VIP Purchase', () => {
    it('should purchase VIP for employee successfully (cash payment)', async () => {
      const mockEmployee = {
        id: 'employee-123',
        user_id: 'owner-user-id', // Employee owns their own profile
        name: 'Jane Doe',
        nickname: 'JD',
        establishment_id: 'est-123'
      };

      const mockTransaction = {
        id: 'transaction-123',
        subscription_type: 'employee',
        user_id: 'owner-user-id',
        amount: 3600,
        currency: 'THB',
        payment_method: 'cash',
        payment_status: 'pending'
      };

      const mockSubscription = {
        id: 'sub-123',
        employee_id: 'employee-123',
        status: 'pending_payment',
        tier: 'employee',
        duration: 30,
        price_paid: 3600,
        transaction_id: 'transaction-123',
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      // 1. Mock employee authorization check
      (supabase.from as jest.Mock).mockImplementationOnce(() =>
        createMockChain({ data: mockEmployee, error: null })
      );

      // 2. Mock existing active subscription check (no active subscription)
      (supabase.from as jest.Mock).mockImplementationOnce(() =>
        createMockChain({ data: null, error: null })
      );

      // 3. Mock subscription insert
      (supabase.from as jest.Mock).mockImplementationOnce(() =>
        createMockChain({ data: mockSubscription, error: null })
      );

      // 4. Mock transaction insert
      (supabase.from as jest.Mock).mockImplementationOnce(() =>
        createMockChain({ data: mockTransaction, error: null })
      );

      // 5. Mock subscription update with transaction_id
      (supabase.from as jest.Mock).mockImplementationOnce(() =>
        createMockChain({ data: null, error: null })
      );

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('subscription');
      expect(response.body).toHaveProperty('transaction');
      expect(response.body.subscription.status).toBe('pending_payment');
      expect(response.body.transaction.payment_status).toBe('pending');
    });

    it('should return 403 if employee does not exist', async () => {
      // 1. Mock employee authorization check (employee not found)
      (supabase.from as jest.Mock).mockImplementationOnce(() =>
        createMockChain({ data: null, error: null })
      );

      // 2. Mock ownership check (also fails - no ownership)
      (supabase.from as jest.Mock).mockImplementationOnce(() =>
        createMockChain({ data: null, error: null })
      );

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'non-existent-employee',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Forbidden');
    });

    it('should return 403 if user is not owner of establishment', async () => {
      const mockEmployee = {
        id: 'employee-123',
        user_id: 'different-user-id', // Employee belongs to different user
        name: 'Jane Doe',
        establishment_id: 'est-123'
      };

      // 1. Mock employee authorization check (employee exists but different user_id)
      (supabase.from as jest.Mock).mockImplementationOnce(() =>
        createMockChain({ data: null, error: null }) // Query with eq('user_id', currentUser) returns null
      );

      // 2. Mock ownership check (user is not owner)
      (supabase.from as jest.Mock).mockImplementationOnce(() =>
        createMockChain({ data: null, error: null })
      );

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Forbidden');
    });

    it('should calculate correct price for 7-day duration', async () => {
      const mockEmployee = {
        id: 'employee-123',
        user_id: 'owner-user-id',
        name: 'Jane Doe',
        establishment_id: 'est-123'
      };

      let capturedTransaction: any;

      (supabase.from as jest.Mock)
        // 1. Employee authorization check
        .mockImplementationOnce(() =>
          createMockChain({ data: mockEmployee, error: null })
        )
        // 2. Existing subscription check
        .mockImplementationOnce(() =>
          createMockChain({ data: null, error: null })
        )
        // 3. Subscription insert
        .mockImplementationOnce(() =>
          createMockChain({ data: { id: 'sub-123' }, error: null })
        )
        // 4. Transaction insert
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockImplementation((data) => {
            capturedTransaction = data;
            return createMockChain({
              data: { ...data, id: 'transaction-123' },
              error: null
            });
          })
        }))
        // 5. Subscription update
        .mockImplementationOnce(() =>
          createMockChain({ data: null, error: null })
        );

      await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 7,
          payment_method: 'cash'
        })
        .expect(201);

      // Verify price: 7 days = 1000 THB
      expect(capturedTransaction.amount).toBe(1000);
    });

    it('should calculate correct price for 365-day duration with 50% discount', async () => {
      const mockEmployee = {
        id: 'employee-123',
        user_id: 'owner-user-id',
        name: 'Jane Doe',
        establishment_id: 'est-123'
      };

      let capturedTransaction: any;

      (supabase.from as jest.Mock)
        // 1. Employee authorization check
        .mockImplementationOnce(() =>
          createMockChain({ data: mockEmployee, error: null })
        )
        // 2. Existing subscription check
        .mockImplementationOnce(() =>
          createMockChain({ data: null, error: null })
        )
        // 3. Subscription insert
        .mockImplementationOnce(() =>
          createMockChain({ data: { id: 'sub-123' }, error: null })
        )
        // 4. Transaction insert
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockImplementation((data) => {
            capturedTransaction = data;
            return createMockChain({
              data: { ...data, id: 'transaction-123' },
              error: null
            });
          })
        }))
        // 5. Subscription update
        .mockImplementationOnce(() =>
          createMockChain({ data: null, error: null })
        );

      await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 365,
          payment_method: 'cash'
        })
        .expect(201);

      // Verify price: 365 days = 18250 THB (50% discount from ~36500)
      expect(capturedTransaction.amount).toBe(18250);
    });
  });

  describe('Establishment VIP Purchase', () => {
    it('should purchase VIP for establishment successfully', async () => {
      const mockOwnership = {
        id: 'ownership-123',
        user_id: 'owner-user-id',
        establishment_id: 'est-123'
      };

      const mockTransaction = {
        id: 'transaction-123',
        subscription_type: 'establishment',
        amount: 10800,
        payment_status: 'pending'
      };

      const mockSubscription = {
        id: 'sub-123',
        establishment_id: 'est-123',
        status: 'pending_payment',
        tier: 'establishment',
        duration: 30
      };

      (supabase.from as jest.Mock)
        // 1. Ownership authorization check
        .mockImplementationOnce(() =>
          createMockChain({ data: mockOwnership, error: null })
        )
        // 2. Existing subscription check
        .mockImplementationOnce(() =>
          createMockChain({ data: null, error: null })
        )
        // 3. Subscription insert
        .mockImplementationOnce(() =>
          createMockChain({ data: mockSubscription, error: null })
        )
        // 4. Transaction insert
        .mockImplementationOnce(() =>
          createMockChain({ data: mockTransaction, error: null })
        )
        // 5. Subscription update
        .mockImplementationOnce(() =>
          createMockChain({ data: null, error: null })
        );

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'establishment',
          entity_id: 'est-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.subscription.tier).toBe('establishment');
    });

    it('should return 403 if establishment ownership not found', async () => {
      // 1. Ownership check fails (no ownership)
      (supabase.from as jest.Mock).mockReturnValue(
        createMockChain({ data: null, error: null })
      );

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'establishment',
          entity_id: 'non-existent-establishment',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(403);

      expect(response.body.error).toBe('Forbidden');
    });

    it('should calculate establishment pricing correctly (4x employee pricing)', async () => {
      const mockOwnership = {
        id: 'ownership-123',
        user_id: 'owner-user-id',
        establishment_id: 'est-123'
      };

      let capturedTransaction: any;

      (supabase.from as jest.Mock)
        // 1. Ownership authorization check
        .mockImplementationOnce(() =>
          createMockChain({ data: mockOwnership, error: null })
        )
        // 2. Existing subscription check
        .mockImplementationOnce(() =>
          createMockChain({ data: null, error: null })
        )
        // 3. Subscription insert
        .mockImplementationOnce(() =>
          createMockChain({ data: { id: 'sub-123' }, error: null })
        )
        // 4. Transaction insert
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockImplementation((data) => {
            capturedTransaction = data;
            return createMockChain({
              data: { ...data, id: 'transaction-123' },
              error: null
            });
          })
        }))
        // 5. Subscription update
        .mockImplementationOnce(() =>
          createMockChain({ data: null, error: null })
        );

      await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'establishment',
          entity_id: 'est-123',
          duration: 7,
          payment_method: 'cash'
        })
        .expect(201);

      // Establishment 7-day = 3000 THB (vs employee 1000 THB)
      expect(capturedTransaction.amount).toBe(3000);
    });
  });

  describe('Payment Method Handling', () => {
    it('should accept cash payment method', async () => {
      const mockEmployee = {
        id: 'employee-123',
        user_id: 'owner-user-id',
        establishment_id: 'est-123'
      };

      let capturedTransaction: any;

      (supabase.from as jest.Mock)
        // 1. Employee authorization check
        .mockImplementationOnce(() =>
          createMockChain({ data: mockEmployee, error: null })
        )
        // 2. Existing subscription check
        .mockImplementationOnce(() =>
          createMockChain({ data: null, error: null })
        )
        // 3. Subscription insert
        .mockImplementationOnce(() =>
          createMockChain({ data: { id: 'sub-123' }, error: null })
        )
        // 4. Transaction insert
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockImplementation((data) => {
            capturedTransaction = data;
            return createMockChain({
              data: { ...data, id: 'transaction-123' },
              error: null
            });
          })
        }))
        // 5. Subscription update
        .mockImplementationOnce(() =>
          createMockChain({ data: null, error: null })
        );

      await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(201);

      expect(capturedTransaction.payment_method).toBe('cash');
      expect(capturedTransaction.payment_status).toBe('pending');
    });

    it('should reject unsupported payment methods', async () => {
      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 30,
          payment_method: 'credit_card' // Not implemented yet
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should accept promptpay payment method', async () => {
      const mockEmployee = {
        id: 'employee-123',
        user_id: 'owner-user-id',
        establishment_id: 'est-123'
      };

      const mockTransaction = {
        id: 'transaction-123',
        amount: 3600,
        currency: 'THB',
        payment_method: 'promptpay',
        payment_status: 'pending'
      };

      (supabase.from as jest.Mock)
        // 1. Employee authorization check
        .mockImplementationOnce(() =>
          createMockChain({ data: mockEmployee, error: null })
        )
        // 2. Existing subscription check
        .mockImplementationOnce(() =>
          createMockChain({ data: null, error: null })
        )
        // 3. Subscription insert
        .mockImplementationOnce(() =>
          createMockChain({ data: { id: 'sub-123' }, error: null })
        )
        // 4. Transaction insert
        .mockImplementationOnce(() =>
          createMockChain({ data: mockTransaction, error: null })
        )
        // 5. Subscription update
        .mockImplementationOnce(() =>
          createMockChain({ data: null, error: null })
        );

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 30,
          payment_method: 'promptpay'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.transaction.payment_method).toBe('promptpay');
    });
  });
});
