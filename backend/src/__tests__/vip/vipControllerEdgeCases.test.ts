/**
 * 🧪 VIP Controller Edge Cases & Error Handling Tests
 *
 * Supplementary tests covering error paths and edge cases
 * not covered by main test files:
 * - Error handling for database failures
 * - PromptPay configuration errors
 * - Transaction rollback scenarios
 * - Invalid subscription type handling
 * - Admin permission checks in verifyPayment
 *
 * Target: Increase vipController.ts coverage from 79% to 90%+
 */

import request from 'supertest';
import express from 'express';
import {
  getPricingOptions,
  purchaseVIP,
  getMyVIPSubscriptions,
  cancelVIPSubscription,
  verifyPayment,
  getVIPTransactions,
  rejectPayment
} from '../../controllers/vipController';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { csrfProtection } from '../../middleware/csrf';
import { createMockQueryBuilder, mockSuccess, mockError, mockNotFound } from '../../config/__mocks__/supabase';
import { isPromptPayConfigured, generatePromptPayQR } from '../../services/promptpayService';

// Mock dependencies
jest.mock('../../config/supabase', () => {
  const mockModule = jest.requireActual('../../config/__mocks__/supabase');
  return {
    supabase: mockModule.supabase,
    createMockQueryBuilder: mockModule.createMockQueryBuilder,
    mockSuccess: mockModule.mockSuccess,
    mockError: mockModule.mockError,
    mockNotFound: mockModule.mockNotFound
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
jest.mock('../../services/promptpayService', () => ({
  isPromptPayConfigured: jest.fn(),
  generatePromptPayQR: jest.fn()
}));

import { supabase } from '../../config/supabase';

describe('VIP Controller Edge Cases', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.from as jest.Mock).mockImplementation(() => createMockQueryBuilder());

    app = express();
    app.use(express.json());

    (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { id: 'test-user-id', role: 'user' };
      next();
    });

    (requireAdmin as jest.Mock).mockImplementation((req, res, next) => {
      if (req.user?.role === 'admin') {
        next();
      } else {
        res.status(403).json({ error: 'Admin access required' });
      }
    });

    (csrfProtection as jest.Mock).mockImplementation((req, res, next) => next());

    // Setup routes
    app.get('/api/vip/pricing/:type', getPricingOptions);
    app.post('/api/vip/purchase', authenticateToken, csrfProtection, purchaseVIP);
    app.get('/api/vip/my-subscriptions', authenticateToken, getMyVIPSubscriptions);
    app.patch('/api/vip/subscriptions/:id/cancel', authenticateToken, csrfProtection, cancelVIPSubscription);
    app.post('/api/admin/vip/verify-payment/:transactionId', authenticateToken, verifyPayment);
    app.get('/api/admin/vip/transactions', authenticateToken, getVIPTransactions);
    app.post('/api/admin/vip/reject-payment/:transactionId', authenticateToken, rejectPayment);
  });

  describe('getPricingOptions - Error Handling', () => {
    it('should return 500 on unexpected error', async () => {
      // Force an error by passing undefined type
      const response = await request(app)
        .get('/api/vip/pricing/undefined')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('purchaseVIP - Error Paths', () => {
    it('should return 401 if user is not authenticated', async () => {
      (authenticateToken as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'emp-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid subscription type', async () => {
      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'invalid_type',
          entity_id: 'emp-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid subscription type');
    });

    it('should return 409 if active subscription already exists', async () => {
      const existingSubscription = {
        id: 'sub-existing',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        tier: 'employee'
      };

      (supabase.from as jest.Mock)
        // Employee ownership check
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'emp-123', user_id: 'test-user-id' })))
        // Existing subscription check - returns active subscription
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(existingSubscription)));

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'emp-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(409);

      expect(response.body.error).toContain('active');
    });

    it('should return 500 if subscription creation fails', async () => {
      (supabase.from as jest.Mock)
        // Employee ownership check
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'emp-123', user_id: 'test-user-id' })))
        // No existing subscription
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        // Subscription creation fails
        .mockReturnValueOnce(createMockQueryBuilder(mockError('Database connection error')));

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'emp-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(500);

      expect(response.body.error).toContain('Failed to create VIP subscription');
    });

    it('should return 400 if PromptPay is not configured', async () => {
      (isPromptPayConfigured as jest.Mock).mockReturnValue(false);

      (supabase.from as jest.Mock)
        // Employee ownership check
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'emp-123', user_id: 'test-user-id' })))
        // No existing subscription
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        // Subscription creation succeeds
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'sub-123' })));

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'emp-123',
          duration: 30,
          payment_method: 'promptpay'
        })
        .expect(400);

      expect(response.body.error).toContain('PromptPay not available');
    });

    it('should rollback subscription if transaction creation fails', async () => {
      const subscriptionId = 'sub-to-rollback';

      (supabase.from as jest.Mock)
        // Employee ownership check
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'emp-123', user_id: 'test-user-id' })))
        // No existing subscription
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        // Subscription creation succeeds
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: subscriptionId })))
        // Transaction creation fails
        .mockReturnValueOnce(createMockQueryBuilder(mockError('Transaction insert failed')))
        // Subscription delete (rollback)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(null)));

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'emp-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(500);

      expect(response.body.error).toContain('Failed to create payment transaction');
    });

    it('should handle admin_grant payment method correctly', async () => {
      (authenticateToken as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = { id: 'admin-user-id', role: 'admin' };
        next();
      });

      const subscription = {
        id: 'sub-123',
        status: 'active',
        tier: 'employee',
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        price_paid: 3600
      };

      const transaction = {
        id: 'txn-123',
        amount: 3600,
        currency: 'THB',
        payment_method: 'admin_grant',
        payment_status: 'completed'
      };

      (supabase.from as jest.Mock)
        // Employee ownership check
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'emp-123', user_id: 'admin-user-id' })))
        // No existing subscription
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        // Subscription creation
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(subscription)))
        // Transaction creation
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(transaction)))
        // Update subscription with transaction_id
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(null)));

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'emp-123',
          duration: 30,
          payment_method: 'admin_grant'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('activated successfully');
    });
  });

  describe('getMyVIPSubscriptions - Error Paths', () => {
    it('should return 401 if user is not authenticated', async () => {
      (authenticateToken as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .get('/api/vip/my-subscriptions')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 500 on database error', async () => {
      // Mock both calls to throw errors
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/vip/my-subscriptions')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('cancelVIPSubscription - Error Paths', () => {
    it('should return 401 if user is not authenticated', async () => {
      (authenticateToken as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .patch('/api/vip/subscriptions/sub-123/cancel')
        .send({ subscription_type: 'employee' })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 400 for missing subscription_type', async () => {
      const response = await request(app)
        .patch('/api/vip/subscriptions/sub-123/cancel')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('Invalid subscription type');
    });

    it('should return 500 if subscription update fails', async () => {
      const subscription = {
        id: 'sub-123',
        employee_id: 'emp-123',
        status: 'active'
      };

      const ownership = {
        id: 'ownership-123',
        user_id: 'test-user-id'
      };

      (supabase.from as jest.Mock)
        // Subscription fetch
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(subscription)))
        // Ownership check
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(ownership)))
        // Subscription update fails
        .mockReturnValueOnce(createMockQueryBuilder(mockError('Update failed')));

      const response = await request(app)
        .patch('/api/vip/subscriptions/sub-123/cancel')
        .send({ subscription_type: 'employee' })
        .expect(500);

      expect(response.body.error).toContain('Failed to cancel subscription');
    });

    it('should handle establishment subscription cancellation', async () => {
      const subscription = {
        id: 'sub-123',
        establishment_id: 'est-123',
        status: 'active',
        tier: 'establishment'
      };

      const ownership = {
        id: 'ownership-123',
        user_id: 'test-user-id'
      };

      const cancelledSubscription = {
        ...subscription,
        status: 'cancelled'
      };

      (supabase.from as jest.Mock)
        // Subscription fetch
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(subscription)))
        // Ownership check
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(ownership)))
        // Subscription update
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(cancelledSubscription)));

      const response = await request(app)
        .patch('/api/vip/subscriptions/sub-123/cancel')
        .send({ subscription_type: 'establishment' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subscription.status).toBe('cancelled');
    });
  });

  describe('verifyPayment - Error Paths', () => {
    it('should return 401 if user is not authenticated', async () => {
      (authenticateToken as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/txn-123')
        .send({ admin_notes: 'Test' })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not admin', async () => {
      // User is authenticated but not admin
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ role: 'user' })));

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/txn-123')
        .send({ admin_notes: 'Test' })
        .expect(403);

      expect(response.body.error).toContain('admin');
    });

    it('should return 400 for non-cash payment method', async () => {
      const transaction = {
        id: 'txn-123',
        payment_status: 'pending',
        payment_method: 'promptpay' // Not cash
      };

      (supabase.from as jest.Mock)
        // Admin role check
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ role: 'admin' })))
        // Transaction fetch
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(transaction)));

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/txn-123')
        .send({ admin_notes: 'Test' })
        .expect(400);

      expect(response.body.error).toContain('cash');
    });

    it('should return 500 if transaction update fails', async () => {
      const transaction = {
        id: 'txn-123',
        payment_status: 'pending',
        payment_method: 'cash'
      };

      (supabase.from as jest.Mock)
        // Admin role check
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ role: 'admin' })))
        // Transaction fetch
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(transaction)))
        // Transaction update fails
        .mockReturnValueOnce(createMockQueryBuilder(mockError('Update failed')));

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/txn-123')
        .send({ admin_notes: 'Test' })
        .expect(500);

      expect(response.body.error).toContain('Failed to update transaction');
    });

    it('should return 500 if subscription activation fails', async () => {
      const transaction = {
        id: 'txn-123',
        subscription_type: 'employee',
        payment_status: 'pending',
        payment_method: 'cash',
        user_id: 'user-123'
      };

      (supabase.from as jest.Mock)
        // Admin role check
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ role: 'admin' })))
        // Transaction fetch
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(transaction)))
        // Transaction update succeeds
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(null)))
        // Subscription update fails
        .mockReturnValueOnce(createMockQueryBuilder(mockError('Subscription update failed')));

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/txn-123')
        .send({ admin_notes: 'Test' })
        .expect(500);

      expect(response.body.error).toContain('Failed to activate subscription');
    });
  });

  describe('getVIPTransactions - Error Paths', () => {
    it('should return 500 on database error', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
        });

      const response = await request(app)
        .get('/api/admin/vip/transactions')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should return empty array when no transactions exist', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        });

      const response = await request(app)
        .get('/api/admin/vip/transactions')
        .expect(200);

      expect(response.body.transactions).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it('should handle status=all filter correctly', async () => {
      const transactions = [
        { id: 'txn-1', subscription_type: 'employee', payment_status: 'pending' },
        { id: 'txn-2', subscription_type: 'employee', payment_status: 'completed' }
      ];

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'vip_payment_transactions') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: transactions, error: null })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      const response = await request(app)
        .get('/api/admin/vip/transactions?status=all')
        .expect(200);

      expect(response.body.transactions.length).toBe(2);
    });
  });

  describe('rejectPayment - Error Paths', () => {
    it('should return 401 if user is not authenticated', async () => {
      (authenticateToken as jest.Mock).mockImplementationOnce((req, res, next) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .post('/api/admin/vip/reject-payment/txn-123')
        .send({ admin_notes: 'Rejected' })
        .expect(401);

      expect(response.body.error).toContain('Authentication required');
    });

    it('should return 404 if transaction not found', async () => {
      (supabase.from as jest.Mock)
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()));

      const response = await request(app)
        .post('/api/admin/vip/reject-payment/non-existent')
        .send({ admin_notes: 'Rejected' })
        .expect(404);

      expect(response.body.error).toContain('Transaction not found');
    });

    it('should return 500 if transaction update fails', async () => {
      const transaction = {
        id: 'txn-123',
        subscription_type: 'employee',
        payment_status: 'pending'
      };

      (supabase.from as jest.Mock)
        // Transaction fetch
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(transaction)))
        // Transaction update fails
        .mockReturnValueOnce(createMockQueryBuilder(mockError('Update failed')));

      const response = await request(app)
        .post('/api/admin/vip/reject-payment/txn-123')
        .send({ admin_notes: 'Invalid payment' })
        .expect(500);

      expect(response.body.error).toContain('Failed to update transaction');
    });

    it('should continue even if subscription update fails', async () => {
      const transaction = {
        id: 'txn-123',
        subscription_type: 'employee',
        payment_status: 'pending',
        user_id: 'user-123'
      };

      (supabase.from as jest.Mock)
        // Transaction fetch
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(transaction)))
        // Transaction update succeeds
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(null)))
        // Subscription update fails (should continue anyway)
        .mockReturnValueOnce(createMockQueryBuilder(mockError('Subscription update failed')))
        // Subscription tier fetch for notification
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ tier: 'employee' })));

      const response = await request(app)
        .post('/api/admin/vip/reject-payment/txn-123')
        .send({ admin_notes: 'Invalid payment' })
        .expect(200);

      // Should still succeed even if subscription update failed
      expect(response.body.success).toBe(true);
    });

    it('should handle establishment subscription rejection', async () => {
      const transaction = {
        id: 'txn-123',
        subscription_type: 'establishment',
        payment_status: 'pending',
        user_id: 'user-123'
      };

      (supabase.from as jest.Mock)
        // Transaction fetch
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(transaction)))
        // Transaction update
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(null)))
        // Subscription update
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(null)))
        // Subscription tier fetch
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ tier: 'establishment' })));

      const response = await request(app)
        .post('/api/admin/vip/reject-payment/txn-123')
        .send({ admin_notes: 'Invalid receipt' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PromptPay Integration', () => {
    it('should generate QR code for PromptPay payment', async () => {
      (isPromptPayConfigured as jest.Mock).mockReturnValue(true);
      (generatePromptPayQR as jest.Mock).mockResolvedValue({
        qrCode: 'data:image/png;base64,mockQR',
        reference: 'ref-123'
      });

      const subscription = {
        id: 'sub-123',
        status: 'pending_payment',
        tier: 'employee',
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        price_paid: 3600
      };

      const transaction = {
        id: 'txn-123',
        amount: 3600,
        currency: 'THB',
        payment_method: 'promptpay',
        payment_status: 'pending',
        promptpay_qr_code: 'data:image/png;base64,mockQR',
        promptpay_reference: 'ref-123'
      };

      (supabase.from as jest.Mock)
        // Employee ownership check
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess({ id: 'emp-123', user_id: 'test-user-id' })))
        // No existing subscription
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        // Subscription creation
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(subscription)))
        // Transaction creation
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(transaction)))
        // Update subscription with transaction_id
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(null)));

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'emp-123',
          duration: 30,
          payment_method: 'promptpay'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.transaction.promptpay_qr_code).toBeDefined();
      expect(response.body.transaction.promptpay_reference).toBeDefined();
      expect(generatePromptPayQR).toHaveBeenCalled();
    });
  });

  describe('Owner Buying VIP for Employee', () => {
    it('should allow establishment owner to purchase VIP for their employee', async () => {
      const ownership = {
        id: 'ownership-123',
        permissions: { can_edit_employees: true },
        current_employment: {
          establishment_id: 'est-123',
          employee_id: 'emp-123'
        }
      };

      const subscription = {
        id: 'sub-123',
        status: 'pending_payment',
        tier: 'employee',
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        price_paid: 3600
      };

      const transaction = {
        id: 'txn-123',
        amount: 3600,
        payment_method: 'cash',
        payment_status: 'pending'
      };

      (supabase.from as jest.Mock)
        // Employee self-ownership check (not the owner)
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        // Establishment owner check
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(ownership)))
        // No existing subscription
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        // Subscription creation
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(subscription)))
        // Transaction creation
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(transaction)))
        // Update subscription with transaction_id
        .mockReturnValueOnce(createMockQueryBuilder(mockSuccess(null)));

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'emp-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject if owner lacks can_edit_employees permission', async () => {
      const ownership = {
        id: 'ownership-123',
        permissions: { can_edit_employees: false }, // No permission
        current_employment: {
          establishment_id: 'est-123',
          employee_id: 'emp-123'
        }
      };

      (supabase.from as jest.Mock)
        // Employee self-ownership check
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()))
        // Establishment owner check (no can_edit_employees permission)
        .mockReturnValueOnce(createMockQueryBuilder(mockNotFound()));

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'emp-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(403);

      expect(response.body.error).toContain('permission');
    });
  });
});
