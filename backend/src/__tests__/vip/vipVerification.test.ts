/**
 * 🧪 VIP Admin Verification Tests
 *
 * Tests for admin verification endpoints:
 * - GET /api/admin/vip/transactions
 * - POST /api/admin/vip/verify-payment/:id
 * - POST /api/admin/vip/reject-payment/:id
 */

import request from 'supertest';
import express from 'express';
import { getVIPTransactions, verifyPayment, rejectPayment } from '../../controllers/vipController';
import { supabase } from '../../config/supabase';
import { authenticateToken } from '../../middleware/auth';
import { csrfProtection } from '../../middleware/csrf';
import { requireAdmin } from '../../middleware/auth';

jest.mock('../../config/supabase');
jest.mock('../../middleware/auth');
jest.mock('../../middleware/csrf');

describe('VIP Admin Verification Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock admin auth middleware
    (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { id: 'admin-user-id', role: 'admin' };
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

    app.get('/api/admin/vip/transactions', authenticateToken, requireAdmin, getVIPTransactions);
    app.post('/api/admin/vip/verify-payment/:transactionId', authenticateToken, requireAdmin, csrfProtection, verifyPayment);
    app.post('/api/admin/vip/reject-payment/:transactionId', authenticateToken, requireAdmin, csrfProtection, rejectPayment);

    jest.clearAllMocks();
  });

  describe('GET /api/admin/vip/transactions', () => {
    it('should return all VIP transactions for admin', async () => {
      const mockTransactions = [
        {
          id: 'transaction-1',
          subscription_type: 'employee',
          user_id: 'user-1',
          amount: 3600,
          payment_method: 'cash',
          payment_status: 'pending',
          created_at: new Date().toISOString()
        },
        {
          id: 'transaction-2',
          subscription_type: 'establishment',
          user_id: 'user-2',
          amount: 10800,
          payment_method: 'cash',
          payment_status: 'completed',
          created_at: new Date().toISOString()
        }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockTransactions, error: null })
      });

      const response = await request(app)
        .get('/api/admin/vip/transactions')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transactions');
      expect(response.body.transactions).toBeInstanceOf(Array);
      expect(response.body.transactions.length).toBe(2);
    });

    it('should filter transactions by payment status', async () => {
      const mockPendingTransactions = [
        {
          id: 'transaction-1',
          payment_status: 'pending',
          amount: 3600
        }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockPendingTransactions, error: null })
      });

      const response = await request(app)
        .get('/api/admin/vip/transactions?status=pending')
        .expect(200);

      expect(response.body.transactions.length).toBe(1);
      expect(response.body.transactions[0].payment_status).toBe('pending');
    });

    it('should filter transactions by payment method', async () => {
      const mockCashTransactions = [
        {
          id: 'transaction-1',
          payment_method: 'cash',
          amount: 3600
        }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockCashTransactions, error: null })
      });

      const response = await request(app)
        .get('/api/admin/vip/transactions?payment_method=cash')
        .expect(200);

      expect(response.body.transactions.length).toBe(1);
      expect(response.body.transactions[0].payment_method).toBe('cash');
    });

    it('should return 403 for non-admin users', async () => {
      (requireAdmin as jest.Mock).mockImplementationOnce((req, res) => {
        res.status(403).json({ error: 'Admin access required' });
      });

      const response = await request(app)
        .get('/api/admin/vip/transactions')
        .expect(403);

      expect(response.body.error).toBe('Admin access required');
    });

    it('should include joined data (user, employee/establishment, subscription)', async () => {
      const mockTransactionsWithJoins = [
        {
          id: 'transaction-1',
          subscription_type: 'employee',
          user: {
            id: 'user-1',
            pseudonym: 'john_doe',
            email: 'john@example.com'
          },
          employee: {
            id: 'employee-1',
            name: 'Jane Doe',
            nickname: 'JD'
          },
          subscription: {
            tier: 'employee',
            duration: 30,
            expires_at: new Date().toISOString()
          }
        }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockTransactionsWithJoins, error: null })
      });

      const response = await request(app)
        .get('/api/admin/vip/transactions')
        .expect(200);

      const transaction = response.body.transactions[0];
      expect(transaction).toHaveProperty('user');
      expect(transaction).toHaveProperty('employee');
      expect(transaction).toHaveProperty('subscription');
    });
  });

  describe('POST /api/admin/vip/verify-payment/:transactionId', () => {
    it('should verify payment and activate subscription successfully', async () => {
      const mockTransaction = {
        id: 'transaction-123',
        subscription_id: 'sub-123',
        subscription_type: 'employee',
        payment_status: 'pending'
      };

      const mockSubscription = {
        id: 'sub-123',
        employee_id: 'employee-123',
        status: 'pending_payment'
      };

      const mockUpdatedTransaction = {
        ...mockTransaction,
        payment_status: 'completed',
        admin_verified_by: 'admin-user-id',
        admin_verified_at: new Date().toISOString()
      };

      const mockUpdatedSubscription = {
        ...mockSubscription,
        status: 'active'
      };

      // Mock transaction fetch
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null })
      }));

      // Mock subscription fetch
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSubscription, error: null })
      }));

      // Mock transaction update
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedTransaction, error: null })
      }));

      // Mock subscription update
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUpdatedSubscription, error: null })
      }));

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/transaction-123')
        .send({
          admin_notes: 'Cash payment verified in person'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.transaction.payment_status).toBe('completed');
      expect(response.body.subscription.status).toBe('active');
    });

    it('should return 404 if transaction does not exist', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      });

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/non-existent')
        .send({
          admin_notes: 'Test'
        })
        .expect(404);

      expect(response.body.error).toContain('Transaction not found');
    });

    it('should return 400 if payment is already verified', async () => {
      const mockTransaction = {
        id: 'transaction-123',
        payment_status: 'completed' // Already completed
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null })
      });

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/transaction-123')
        .send({
          admin_notes: 'Test'
        })
        .expect(400);

      expect(response.body.error).toContain('already verified');
    });

    it('should populate admin audit fields (admin_verified_by, admin_verified_at, admin_notes)', async () => {
      const mockTransaction = {
        id: 'transaction-123',
        subscription_id: 'sub-123',
        subscription_type: 'employee',
        payment_status: 'pending'
      };

      const mockSubscription = {
        id: 'sub-123',
        status: 'pending_payment'
      };

      let capturedUpdate: any;

      (supabase.from as jest.Mock)
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null })
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSubscription, error: null })
        }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockImplementation((data) => {
            capturedUpdate = data;
            return {
              eq: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { ...mockTransaction, ...data },
                error: null
              })
            };
          })
        }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockSubscription, status: 'active' },
            error: null
          })
        }));

      await request(app)
        .post('/api/admin/vip/verify-payment/transaction-123')
        .send({
          admin_notes: 'Verified via bank transfer receipt'
        })
        .expect(200);

      expect(capturedUpdate).toHaveProperty('payment_status', 'completed');
      expect(capturedUpdate).toHaveProperty('admin_verified_by', 'admin-user-id');
      expect(capturedUpdate).toHaveProperty('admin_verified_at');
      expect(capturedUpdate).toHaveProperty('admin_notes', 'Verified via bank transfer receipt');
    });
  });

  describe('POST /api/admin/vip/reject-payment/:transactionId', () => {
    it('should reject payment and cancel subscription successfully', async () => {
      const mockTransaction = {
        id: 'transaction-123',
        subscription_id: 'sub-123',
        subscription_type: 'employee',
        payment_status: 'pending'
      };

      const mockSubscription = {
        id: 'sub-123',
        employee_id: 'employee-123',
        status: 'pending_payment'
      };

      const mockRejectedTransaction = {
        ...mockTransaction,
        payment_status: 'failed',
        admin_notes: 'Payment receipt invalid'
      };

      const mockCancelledSubscription = {
        ...mockSubscription,
        status: 'cancelled'
      };

      (supabase.from as jest.Mock)
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null })
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSubscription, error: null })
        }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockRejectedTransaction, error: null })
        }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockCancelledSubscription, error: null })
        }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        }));

      const response = await request(app)
        .post('/api/admin/vip/reject-payment/transaction-123')
        .send({
          admin_notes: 'Payment receipt invalid'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.transaction.payment_status).toBe('failed');
      expect(response.body.subscription.status).toBe('cancelled');
    });

    it('should return 400 if admin_notes is missing', async () => {
      const response = await request(app)
        .post('/api/admin/vip/reject-payment/transaction-123')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('admin_notes');
    });

    it('should return 400 if transaction is already rejected', async () => {
      const mockTransaction = {
        id: 'transaction-123',
        payment_status: 'failed' // Already failed
      };

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null })
      });

      const response = await request(app)
        .post('/api/admin/vip/reject-payment/transaction-123')
        .send({
          admin_notes: 'Test'
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should update entity VIP status to false when rejecting', async () => {
      const mockTransaction = {
        id: 'transaction-123',
        subscription_id: 'sub-123',
        subscription_type: 'employee',
        payment_status: 'pending'
      };

      const mockSubscription = {
        id: 'sub-123',
        employee_id: 'employee-123',
        status: 'pending_payment'
      };

      let capturedEntityUpdate: any;

      (supabase.from as jest.Mock)
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null })
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSubscription, error: null })
        }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockTransaction, payment_status: 'failed' },
            error: null
          })
        }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { ...mockSubscription, status: 'cancelled' },
            error: null
          })
        }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockImplementation((data) => {
            capturedEntityUpdate = data;
            return {
              eq: jest.fn().mockResolvedValue({ data: null, error: null })
            };
          })
        }));

      await request(app)
        .post('/api/admin/vip/reject-payment/transaction-123')
        .send({
          admin_notes: 'Invalid payment'
        })
        .expect(200);

      expect(capturedEntityUpdate).toHaveProperty('is_vip', false);
      expect(capturedEntityUpdate).toHaveProperty('vip_expires_at', null);
    });
  });

  describe('Admin Authorization', () => {
    it('should return 403 for non-admin users trying to verify', async () => {
      (requireAdmin as jest.Mock).mockImplementationOnce((req, res) => {
        res.status(403).json({ error: 'Admin access required' });
      });

      const response = await request(app)
        .post('/api/admin/vip/verify-payment/transaction-123')
        .send({
          admin_notes: 'Test'
        })
        .expect(403);

      expect(response.body.error).toBe('Admin access required');
    });

    it('should return 403 for non-admin users trying to reject', async () => {
      (requireAdmin as jest.Mock).mockImplementationOnce((req, res) => {
        res.status(403).json({ error: 'Admin access required' });
      });

      const response = await request(app)
        .post('/api/admin/vip/reject-payment/transaction-123')
        .send({
          admin_notes: 'Test'
        })
        .expect(403);

      expect(response.body.error).toBe('Admin access required');
    });
  });
});
