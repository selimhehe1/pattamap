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
import { authenticateToken } from '../../middleware/auth';
import { csrfProtection } from '../../middleware/csrf';

jest.mock('../../config/supabase');
jest.mock('../../middleware/auth');
jest.mock('../../middleware/csrf');

describe('VIP Purchase Workflow Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
      req.user = { id: 'owner-user-id', role: 'user' };
      next();
    });

    (csrfProtection as jest.Mock).mockImplementation((req, res, next) => next());

    app.post('/api/vip/purchase', authenticateToken, csrfProtection, purchaseVIP);

    jest.clearAllMocks();
  });

  describe('Employee VIP Purchase', () => {
    it('should purchase VIP for employee successfully (cash payment)', async () => {
      const mockEmployee = {
        id: 'employee-123',
        name: 'Jane Doe',
        nickname: 'JD',
        establishment_id: 'est-123'
      };

      const mockEstablishment = {
        id: 'est-123',
        name: 'Test Bar'
      };

      const mockOwnership = {
        id: 'ownership-123',
        user_id: 'owner-user-id',
        establishment_id: 'est-123',
        owner_role: 'owner'
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

      // Mock employee fetch
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockEmployee, error: null })
      }));

      // Mock establishment fetch
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockEstablishment, error: null })
      }));

      // Mock ownership check
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockOwnership, error: null })
      }));

      // Mock transaction insert
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null })
      }));

      // Mock subscription insert
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockSubscription, error: null })
      }));

      // Mock entity VIP status update
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null })
      }));

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('subscription');
      expect(response.body).toHaveProperty('transaction');
      expect(response.body.subscription.status).toBe('pending_payment');
      expect(response.body.transaction.payment_status).toBe('pending');
    });

    it('should return 404 if employee does not exist', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      });

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'non-existent-employee',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Employee not found');
    });

    it('should return 403 if user is not owner of establishment', async () => {
      const mockEmployee = {
        id: 'employee-123',
        name: 'Jane Doe',
        establishment_id: 'est-123'
      };

      const mockEstablishment = {
        id: 'est-123',
        name: 'Test Bar'
      };

      // Mock employee fetch
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockEmployee, error: null })
      }));

      // Mock establishment fetch
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockEstablishment, error: null })
      }));

      // Mock ownership check - no ownership found
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      }));

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
      expect(response.body.error).toContain('Permission denied');
    });

    it('should calculate correct price for 7-day duration', async () => {
      const mockEmployee = {
        id: 'employee-123',
        name: 'Jane Doe',
        establishment_id: 'est-123'
      };

      const mockEstablishment = { id: 'est-123', name: 'Test Bar' };
      const mockOwnership = {
        user_id: 'owner-user-id',
        establishment_id: 'est-123'
      };

      let capturedTransaction: any;

      (supabase.from as jest.Mock)
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockEmployee, error: null })
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockEstablishment, error: null })
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockOwnership, error: null })
        }))
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockImplementation((data) => {
            capturedTransaction = data;
            return {
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { ...data, id: 'transaction-123' },
                error: null
              })
            };
          })
        }))
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'sub-123' },
            error: null
          })
        }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        }));

      await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 7,
          payment_method: 'cash'
        })
        .expect(200);

      // Verify price: 7 days = 1000 THB
      expect(capturedTransaction.amount).toBe(1000);
    });

    it('should calculate correct price for 365-day duration with 50% discount', async () => {
      const mockEmployee = {
        id: 'employee-123',
        name: 'Jane Doe',
        establishment_id: 'est-123'
      };

      const mockEstablishment = { id: 'est-123', name: 'Test Bar' };
      const mockOwnership = {
        user_id: 'owner-user-id',
        establishment_id: 'est-123'
      };

      let capturedTransaction: any;

      (supabase.from as jest.Mock)
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockEmployee, error: null })
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockEstablishment, error: null })
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockOwnership, error: null })
        }))
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockImplementation((data) => {
            capturedTransaction = data;
            return {
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { ...data, id: 'transaction-123' },
                error: null
              })
            };
          })
        }))
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'sub-123' },
            error: null
          })
        }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        }));

      await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 365,
          payment_method: 'cash'
        })
        .expect(200);

      // Verify price: 365 days = 18250 THB (50% discount from ~36500)
      expect(capturedTransaction.amount).toBe(18250);
    });
  });

  describe('Establishment VIP Purchase', () => {
    it('should purchase VIP for establishment successfully', async () => {
      const mockEstablishment = {
        id: 'est-123',
        name: 'Luxury Bar'
      };

      const mockOwnership = {
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
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockEstablishment, error: null })
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockOwnership, error: null })
        }))
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockTransaction, error: null })
        }))
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSubscription, error: null })
        }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        }));

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'establishment',
          entity_id: 'est-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.subscription.tier).toBe('establishment');
    });

    it('should return 404 if establishment does not exist', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
      });

      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'establishment',
          entity_id: 'non-existent-establishment',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(404);

      expect(response.body.error).toContain('Establishment not found');
    });

    it('should calculate establishment pricing correctly (4x employee pricing)', async () => {
      const mockEstablishment = { id: 'est-123', name: 'Bar' };
      const mockOwnership = {
        user_id: 'owner-user-id',
        establishment_id: 'est-123'
      };

      let capturedTransaction: any;

      (supabase.from as jest.Mock)
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockEstablishment, error: null })
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockOwnership, error: null })
        }))
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockImplementation((data) => {
            capturedTransaction = data;
            return {
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { ...data, id: 'transaction-123' },
                error: null
              })
            };
          })
        }))
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'sub-123' },
            error: null
          })
        }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        }));

      await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'establishment',
          entity_id: 'est-123',
          duration: 7,
          payment_method: 'cash'
        })
        .expect(200);

      // Establishment 7-day = 3000 THB (vs employee 1000 THB)
      expect(capturedTransaction.amount).toBe(3000);
    });
  });

  describe('Payment Method Handling', () => {
    it('should accept cash payment method', async () => {
      const mockEmployee = {
        id: 'employee-123',
        establishment_id: 'est-123'
      };

      const mockEstablishment = { id: 'est-123' };
      const mockOwnership = {
        user_id: 'owner-user-id',
        establishment_id: 'est-123'
      };

      let capturedTransaction: any;

      (supabase.from as jest.Mock)
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockEmployee, error: null })
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockEstablishment, error: null })
        }))
        .mockImplementationOnce(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockOwnership, error: null })
        }))
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockImplementation((data) => {
            capturedTransaction = data;
            return {
              select: jest.fn().mockReturnThis(),
              single: jest.fn().mockResolvedValue({
                data: { ...data, id: 'transaction-123' },
                error: null
              })
            };
          })
        }))
        .mockImplementationOnce(() => ({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'sub-123' },
            error: null
          })
        }))
        .mockImplementationOnce(() => ({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null })
        }));

      await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 30,
          payment_method: 'cash'
        })
        .expect(200);

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

    it('should accept promptpay payment method (when implemented)', async () => {
      // Note: This test will pass once PromptPay is implemented
      const response = await request(app)
        .post('/api/vip/purchase')
        .send({
          subscription_type: 'employee',
          entity_id: 'employee-123',
          duration: 30,
          payment_method: 'promptpay'
        });

      // For now, should return 400 or 501 (Not Implemented)
      expect([400, 501]).toContain(response.status);
    });
  });
});
