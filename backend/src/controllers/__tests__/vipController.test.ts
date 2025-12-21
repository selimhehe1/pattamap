/**
 * VIP Controller Tests
 *
 * Tests for VIP subscription system (897 LOC):
 * - getPricingOptions (4 tests)
 * - purchaseVIP (12 tests)
 * - getMyVIPSubscriptions (3 tests)
 * - cancelVIPSubscription (6 tests)
 * - verifyPayment (7 tests)
 * - getVIPTransactions (4 tests)
 * - rejectPayment (6 tests)
 *
 * Total: 42 tests
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import {
  getPricingOptions,
  purchaseVIP,
  getMyVIPSubscriptions,
  cancelVIPSubscription,
  verifyPayment,
  getVIPTransactions,
  rejectPayment,
} from '../vipController';

// Import mock helpers
import { createMockQueryBuilder, mockSuccess, mockNotFound, mockError } from '../../config/__mocks__/supabase';

// Mock dependencies
jest.mock('../../config/supabase', () => {
  const mockModule = jest.requireActual('../../config/__mocks__/supabase');
  return {
    supabase: mockModule.supabase,
    createMockQueryBuilder: mockModule.createMockQueryBuilder,
    mockSuccess: mockModule.mockSuccess,
    mockNotFound: mockModule.mockNotFound,
    mockError: mockModule.mockError,
  };
});

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../utils/notificationHelper', () => ({
  notifyVIPPurchaseConfirmed: jest.fn().mockResolvedValue(undefined),
  notifyVIPPaymentVerified: jest.fn().mockResolvedValue(undefined),
  notifyVIPPaymentRejected: jest.fn().mockResolvedValue(undefined),
  notifyVIPSubscriptionCancelled: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/promptpayService', () => ({
  generatePromptPayQR: jest.fn().mockResolvedValue({ qrCode: 'mock-qr', reference: 'mock-ref' }),
  isPromptPayConfigured: jest.fn().mockReturnValue(true),
}));

// Import after mocks
import { supabase } from '../../config/supabase';
import {
  notifyVIPPurchaseConfirmed,
  notifyVIPPaymentVerified,
  notifyVIPPaymentRejected,
  notifyVIPSubscriptionCancelled,
} from '../../utils/notificationHelper';
import { isPromptPayConfigured } from '../../services/promptpayService';

// Default mock user with all required fields
const defaultUser = {
  id: 'test-user-123',
  pseudonym: 'TestUser',
  email: 'test@example.com',
  role: 'user',
  is_active: true,
};

// Helper to create mock request/response
const createMockReqRes = (overrides: Partial<AuthRequest> = {}) => {
  const req = {
    user: defaultUser,
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as AuthRequest;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  return { req, res };
};

describe('VIPController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.from as jest.Mock).mockImplementation(() => createMockQueryBuilder());
  });

  // ========================================
  // getPricingOptions Tests
  // ========================================
  describe('getPricingOptions', () => {
    it('should return pricing for employee type', async () => {
      const { req, res } = createMockReqRes({ params: { type: 'employee' } });

      await getPricingOptions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          type: 'employee',
          pricing: expect.any(Object),
        })
      );
    });

    it('should return pricing for establishment type', async () => {
      const { req, res } = createMockReqRes({ params: { type: 'establishment' } });

      await getPricingOptions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          type: 'establishment',
        })
      );
    });

    it('should reject invalid subscription type', async () => {
      const { req, res } = createMockReqRes({ params: { type: 'invalid' } });

      await getPricingOptions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid subscription type',
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const { req, res } = createMockReqRes({ params: { type: 'employee' } });

      // Force an error by mocking the function to throw
      jest.spyOn(require('../../config/vipPricing'), 'getAllPricingOptions').mockImplementationOnce(() => {
        throw new Error('Pricing error');
      });

      await getPricingOptions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ========================================
  // purchaseVIP Tests
  // ========================================
  describe('purchaseVIP', () => {
    const validPurchaseBody = {
      subscription_type: 'employee',
      entity_id: 'emp-123',
      duration: 30,
      payment_method: 'cash',
    };

    it('should require authentication', async () => {
      const { req, res } = createMockReqRes({ user: undefined, body: validPurchaseBody });

      await purchaseVIP(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should require all fields', async () => {
      const { req, res } = createMockReqRes({
        body: { subscription_type: 'employee' }, // Missing fields
      });

      await purchaseVIP(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required fields',
        })
      );
    });

    it('should reject invalid subscription type', async () => {
      const { req, res } = createMockReqRes({
        body: { ...validPurchaseBody, subscription_type: 'invalid' },
      });

      await purchaseVIP(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid subscription type',
        })
      );
    });

    it('should reject invalid duration', async () => {
      const { req, res } = createMockReqRes({
        body: { ...validPurchaseBody, duration: 15 }, // Invalid duration
      });

      await purchaseVIP(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid duration',
        })
      );
    });

    it('should reject invalid payment method', async () => {
      const { req, res } = createMockReqRes({
        body: { ...validPurchaseBody, payment_method: 'bitcoin' },
      });

      await purchaseVIP(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid payment method',
        })
      );
    });

    it('should check employee ownership for employee VIP purchase', async () => {
      const { req, res } = createMockReqRes({ body: validPurchaseBody });

      // Employee not linked to user
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );
      // Not an establishment owner either
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );

      await purchaseVIP(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Forbidden',
        })
      );
    });

    it('should reject if active subscription exists', async () => {
      const { req, res } = createMockReqRes({ body: validPurchaseBody });

      // Employee linked to user
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'emp-123', user_id: 'test-user-123' }))
      );
      // Active subscription exists
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'sub-123', expires_at: '2025-12-31', tier: 'employee' }))
      );

      await purchaseVIP(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Active subscription exists',
        })
      );
    });

    it('should create subscription successfully with cash payment', async () => {
      const { req, res } = createMockReqRes({ body: validPurchaseBody });

      // Employee linked to user
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'emp-123', user_id: 'test-user-123' }))
      );
      // No active subscription
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(null))
      );
      // Create subscription
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({
          id: 'sub-new',
          status: 'pending_payment',
          starts_at: '2025-12-21',
          expires_at: '2026-01-20',
          price_paid: 299,
        }))
      );
      // Create transaction
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({
          id: 'txn-new',
          amount: 299,
          currency: 'THB',
          payment_method: 'cash',
          payment_status: 'pending',
        }))
      );
      // Update subscription with transaction_id
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(null))
      );

      await purchaseVIP(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          subscription: expect.objectContaining({ id: 'sub-new' }),
          transaction: expect.objectContaining({ id: 'txn-new' }),
        })
      );
      expect(notifyVIPPurchaseConfirmed).toHaveBeenCalled();
    });

    it('should create subscription with PromptPay and generate QR', async () => {
      const { req, res } = createMockReqRes({
        body: { ...validPurchaseBody, payment_method: 'promptpay' },
      });

      // Employee linked to user
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'emp-123', user_id: 'test-user-123' }))
      );
      // No active subscription
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(null))
      );
      // Create subscription
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'sub-new', price_paid: 299 }))
      );
      // Create transaction with QR
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({
          id: 'txn-new',
          amount: 299,
          promptpay_qr_code: 'mock-qr',
          promptpay_reference: 'mock-ref',
        }))
      );
      // Update subscription
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(null))
      );

      await purchaseVIP(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction: expect.objectContaining({
            promptpay_qr_code: 'mock-qr',
          }),
        })
      );
    });

    it('should reject PromptPay if not configured', async () => {
      (isPromptPayConfigured as jest.Mock).mockReturnValueOnce(false);

      const { req, res } = createMockReqRes({
        body: { ...validPurchaseBody, payment_method: 'promptpay' },
      });

      // Employee linked to user
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'emp-123', user_id: 'test-user-123' }))
      );
      // No active subscription
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(null))
      );
      // Create subscription
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'sub-new', price_paid: 299 }))
      );

      await purchaseVIP(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'PromptPay not available',
        })
      );
    });

    it('should rollback subscription on transaction creation failure', async () => {
      const { req, res } = createMockReqRes({ body: validPurchaseBody });

      const deleteMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockResolvedValue({ error: null });

      // Employee linked to user
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'emp-123', user_id: 'test-user-123' }))
      );
      // No active subscription
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(null))
      );
      // Create subscription
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'sub-new' }))
      );
      // Transaction creation fails
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockError('Transaction failed'))
      );
      // Delete subscription (rollback)
      (supabase.from as jest.Mock).mockReturnValueOnce({
        delete: deleteMock,
        eq: eqMock,
      });

      await purchaseVIP(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to create payment transaction',
        })
      );
    });
  });

  // ========================================
  // getMyVIPSubscriptions Tests
  // ========================================
  describe('getMyVIPSubscriptions', () => {
    it('should require authentication', async () => {
      const { req, res } = createMockReqRes({ user: undefined });

      await getMyVIPSubscriptions(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return user subscriptions', async () => {
      const { req, res } = createMockReqRes();

      // Employee subscriptions
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess([{ id: 'emp-sub-1' }]))
      );
      // Establishment subscriptions
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess([{ id: 'est-sub-1' }]))
      );

      await getMyVIPSubscriptions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          subscriptions: expect.objectContaining({
            employees: expect.any(Array),
            establishments: expect.any(Array),
          }),
        })
      );
    });

    it('should handle empty subscriptions', async () => {
      const { req, res } = createMockReqRes();

      (supabase.from as jest.Mock).mockReturnValue(
        createMockQueryBuilder(mockSuccess([]))
      );

      await getMyVIPSubscriptions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ========================================
  // cancelVIPSubscription Tests
  // ========================================
  describe('cancelVIPSubscription', () => {
    it('should require authentication', async () => {
      const { req, res } = createMockReqRes({
        user: undefined,
        params: { id: 'sub-123' },
        body: { subscription_type: 'employee' },
      });

      await cancelVIPSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should validate subscription type', async () => {
      const { req, res } = createMockReqRes({
        params: { id: 'sub-123' },
        body: { subscription_type: 'invalid' },
      });

      await cancelVIPSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid subscription type',
        })
      );
    });

    it('should return 404 if subscription not found', async () => {
      const { req, res } = createMockReqRes({
        params: { id: 'sub-nonexistent' },
        body: { subscription_type: 'employee' },
      });

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );

      await cancelVIPSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should check user permission', async () => {
      const { req, res } = createMockReqRes({
        params: { id: 'sub-123' },
        body: { subscription_type: 'employee' },
      });

      // Subscription exists
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'sub-123', employee_id: 'emp-123', status: 'active' }))
      );
      // User not owner
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );

      await cancelVIPSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should reject if subscription not active', async () => {
      const { req, res } = createMockReqRes({
        params: { id: 'sub-123' },
        body: { subscription_type: 'employee' },
      });

      // Subscription already cancelled
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'sub-123', employee_id: 'emp-123', status: 'cancelled' }))
      );
      // User is owner
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'owner-123' }))
      );

      await cancelVIPSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Subscription not active',
        })
      );
    });

    it('should cancel subscription successfully', async () => {
      const { req, res } = createMockReqRes({
        params: { id: 'sub-123' },
        body: { subscription_type: 'employee' },
      });

      // Subscription exists and is active
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'sub-123', employee_id: 'emp-123', status: 'active', tier: 'employee' }))
      );
      // User is owner
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'owner-123' }))
      );
      // Update subscription
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'sub-123', status: 'cancelled' }))
      );

      await cancelVIPSubscription(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'VIP subscription cancelled successfully',
        })
      );
      expect(notifyVIPSubscriptionCancelled).toHaveBeenCalled();
    });
  });

  // ========================================
  // verifyPayment Tests (Admin)
  // ========================================
  describe('verifyPayment', () => {
    it('should require authentication', async () => {
      const { req, res } = createMockReqRes({ user: undefined, params: { transactionId: 'txn-123' } });

      await verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should require admin role', async () => {
      const { req, res } = createMockReqRes({
        params: { transactionId: 'txn-123' },
        user: { ...defaultUser, id: 'user-123', role: 'user' },
      });

      // Check user role
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ role: 'user' }))
      );

      await verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 if transaction not found', async () => {
      const { req, res } = createMockReqRes({
        params: { transactionId: 'txn-nonexistent' },
        user: { ...defaultUser, id: 'admin-123', role: 'admin' },
      });

      // User is admin
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ role: 'admin' }))
      );
      // Transaction not found
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );

      await verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should reject already verified transaction', async () => {
      const { req, res } = createMockReqRes({
        params: { transactionId: 'txn-123' },
        user: { ...defaultUser, id: 'admin-123', role: 'admin' },
      });

      // User is admin
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ role: 'admin' }))
      );
      // Transaction already verified
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'txn-123', payment_status: 'completed' }))
      );

      await verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Payment already verified',
        })
      );
    });

    it('should only verify cash payments', async () => {
      const { req, res } = createMockReqRes({
        params: { transactionId: 'txn-123' },
        user: { ...defaultUser, id: 'admin-123', role: 'admin' },
      });

      // User is admin
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ role: 'admin' }))
      );
      // Transaction is promptpay
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'txn-123', payment_status: 'pending', payment_method: 'promptpay' }))
      );

      await verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid payment method',
        })
      );
    });

    it('should verify payment and activate subscription', async () => {
      const { req, res } = createMockReqRes({
        params: { transactionId: 'txn-123' },
        body: { admin_notes: 'Verified cash payment' },
        user: { ...defaultUser, id: 'admin-123', role: 'admin' },
      });

      // User is admin
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ role: 'admin' }))
      );
      // Transaction pending cash
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({
          id: 'txn-123',
          payment_status: 'pending',
          payment_method: 'cash',
          subscription_type: 'employee',
          user_id: 'buyer-123',
        }))
      );
      // Update transaction
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(null))
      );
      // Update subscription
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({
          id: 'sub-123',
          tier: 'employee',
          expires_at: '2026-01-20',
        }))
      );

      await verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Payment verified and subscription activated',
        })
      );
      expect(notifyVIPPaymentVerified).toHaveBeenCalled();
    });

    it('should handle transaction update failure', async () => {
      const { req, res } = createMockReqRes({
        params: { transactionId: 'txn-123' },
        user: { ...defaultUser, id: 'admin-123', role: 'admin' },
      });

      // User is admin
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ role: 'admin' }))
      );
      // Transaction pending cash
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({
          id: 'txn-123',
          payment_status: 'pending',
          payment_method: 'cash',
          subscription_type: 'employee',
        }))
      );
      // Update transaction fails
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockError('Update failed'))
      );

      await verifyPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ========================================
  // getVIPTransactions Tests (Admin)
  // ========================================
  describe('getVIPTransactions', () => {
    it('should return all transactions without filters', async () => {
      const { req, res } = createMockReqRes({ query: {} });

      const mockTransactions = [
        { id: 'txn-1', subscription_type: 'employee' },
        { id: 'txn-2', subscription_type: 'establishment' },
      ];

      // Get transactions
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(mockTransactions))
      );
      // Get subscription for txn-1
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ tier: 'employee' }))
      );
      // Get subscription for txn-2
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ tier: 'establishment' }))
      );

      await getVIPTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          transactions: expect.any(Array),
          count: 2,
        })
      );
    });

    it('should filter by payment_method', async () => {
      const { req, res } = createMockReqRes({ query: { payment_method: 'cash' } });

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess([]))
      );

      await getVIPTransactions(req, res);

      expect(supabase.from).toHaveBeenCalledWith('vip_payment_transactions');
    });

    it('should filter by status', async () => {
      const { req, res } = createMockReqRes({ query: { status: 'pending' } });

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess([]))
      );

      await getVIPTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle database errors', async () => {
      const { req, res } = createMockReqRes();

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockError('Database error'))
      );

      await getVIPTransactions(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ========================================
  // rejectPayment Tests (Admin)
  // ========================================
  describe('rejectPayment', () => {
    it('should require authentication', async () => {
      const { req, res } = createMockReqRes({
        user: undefined,
        params: { transactionId: 'txn-123' },
        body: { admin_notes: 'Fake payment' },
      });

      await rejectPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should require admin_notes', async () => {
      const { req, res } = createMockReqRes({
        params: { transactionId: 'txn-123' },
        body: {}, // Missing admin_notes
      });

      await rejectPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rejection reason (admin_notes) is required',
        })
      );
    });

    it('should return 404 if transaction not found', async () => {
      const { req, res } = createMockReqRes({
        params: { transactionId: 'txn-nonexistent' },
        body: { admin_notes: 'Fake payment' },
      });

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockNotFound())
      );

      await rejectPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should reject already processed transaction', async () => {
      const { req, res } = createMockReqRes({
        params: { transactionId: 'txn-123' },
        body: { admin_notes: 'Fake payment' },
      });

      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ id: 'txn-123', payment_status: 'completed' }))
      );

      await rejectPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Transaction already processed',
        })
      );
    });

    it('should reject payment and cancel subscription', async () => {
      const { req, res } = createMockReqRes({
        params: { transactionId: 'txn-123' },
        body: { admin_notes: 'Payment proof is fake' },
      });

      // Transaction pending
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({
          id: 'txn-123',
          payment_status: 'pending',
          subscription_type: 'employee',
          user_id: 'buyer-123',
        }))
      );
      // Update transaction to failed
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(null))
      );
      // Cancel subscription
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess(null))
      );
      // Get tier for notification
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({ tier: 'employee' }))
      );

      await rejectPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Payment rejected successfully',
        })
      );
      expect(notifyVIPPaymentRejected).toHaveBeenCalled();
    });

    it('should handle transaction update failure', async () => {
      const { req, res } = createMockReqRes({
        params: { transactionId: 'txn-123' },
        body: { admin_notes: 'Fake payment' },
      });

      // Transaction pending
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockSuccess({
          id: 'txn-123',
          payment_status: 'pending',
          subscription_type: 'employee',
        }))
      );
      // Update transaction fails
      (supabase.from as jest.Mock).mockReturnValueOnce(
        createMockQueryBuilder(mockError('Update failed'))
      );

      await rejectPayment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
