/**
 * Verification Controller Tests
 *
 * Tests for employee verification system:
 * - submitVerification (8 tests)
 * - getVerificationStatus (4 tests)
 * - getManualReviewQueue (3 tests)
 * - reviewVerification (7 tests)
 * - getRecentVerifications (4 tests)
 * - revokeVerification (6 tests)
 *
 * Day 5+ Sprint - Controller Testing
 */

import request from 'supertest';
import express from 'express';
import {
  submitVerification,
  getVerificationStatus,
  getManualReviewQueue,
  reviewVerification,
  getRecentVerifications,
  revokeVerification
} from '../verificationController';
import { supabase } from '../../config/supabase';
import { createMockChain } from '../../test-helpers/supabaseMockChain';

jest.mock('../../config/supabase');
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));
jest.mock('../../utils/notificationHelper', () => ({
  notifyEmployeeVerificationSubmitted: jest.fn().mockResolvedValue(undefined),
  notifyEmployeeVerificationApproved: jest.fn().mockResolvedValue(undefined),
  notifyEmployeeVerificationRejected: jest.fn().mockResolvedValue(undefined),
  notifyEmployeeVerificationRevoked: jest.fn().mockResolvedValue(undefined),
  notifyAdminsNewVerificationRequest: jest.fn().mockResolvedValue(undefined)
}));

describe('Verification Controller', () => {
  let app: express.Application;

  const mockUser = { id: 'user-123', role: 'user', pseudonym: 'TestUser' };
  const mockAdmin = { id: 'admin-123', role: 'admin', pseudonym: 'AdminUser' };

  const mockEmployee = {
    id: 'emp-123',
    name: 'Test Employee',
    photos: ['https://example.com/photo1.jpg'],
    is_verified: false,
    verified_at: null,
    user_id: 'user-123'
  };

  const mockVerification = {
    id: 'verify-123',
    employee_id: 'emp-123',
    selfie_url: 'https://example.com/selfie.jpg',
    face_match_score: 0,
    status: 'manual_review',
    auto_approved: false,
    submitted_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
  });

  // ============================================
  // submitVerification Tests
  // ============================================
  describe('submitVerification', () => {
    beforeEach(() => {
      app.post('/api/employees/:id/verify', (req, res, next) => {
        (req as any).user = mockUser;
        next();
      }, submitVerification);
    });

    it('should submit verification successfully', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1 && table === 'employees') {
          return createMockChain({ data: mockEmployee, error: null });
        }
        if (callCount === 2 && table === 'employee_verifications') {
          // Rate limit check - no recent attempts
          return createMockChain({ data: [], error: null });
        }
        if (callCount === 3 && table === 'employee_verifications') {
          // Insert verification
          return createMockChain({ data: mockVerification, error: null });
        }
        if (callCount === 4 && table === 'employees') {
          // Update employee
          return createMockChain({ data: null, error: null });
        }
        return createMockChain({ data: null, error: null });
      });

      const response = await request(app)
        .post('/api/employees/emp-123/verify')
        .send({ selfie_url: 'https://example.com/selfie.jpg' })
        .expect(201);

      expect(response.body.message).toContain('Verification submitted');
      expect(response.body.verification).toBeDefined();
    });

    it('should return 400 if selfie_url is missing', async () => {
      const response = await request(app)
        .post('/api/employees/emp-123/verify')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('selfie_url is required');
    });

    it('should return 404 if employee not found', async () => {
      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: null, error: { code: 'PGRST116' } })
      );

      const response = await request(app)
        .post('/api/employees/non-existent/verify')
        .send({ selfie_url: 'https://example.com/selfie.jpg' })
        .expect(404);

      expect(response.body.error).toBe('Employee not found');
    });

    it('should return 403 if user is not the employee owner', async () => {
      const employeeOwnedByOther = { ...mockEmployee, user_id: 'other-user-456' };

      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: employeeOwnedByOther, error: null })
      );

      const response = await request(app)
        .post('/api/employees/emp-123/verify')
        .send({ selfie_url: 'https://example.com/selfie.jpg' })
        .expect(403);

      expect(response.body.error).toBe('You can only verify your own profile');
    });

    it('should return 400 if already verified', async () => {
      const verifiedEmployee = { ...mockEmployee, is_verified: true, verified_at: '2024-01-01T00:00:00Z' };

      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: verifiedEmployee, error: null })
      );

      const response = await request(app)
        .post('/api/employees/emp-123/verify')
        .send({ selfie_url: 'https://example.com/selfie.jpg' })
        .expect(400);

      expect(response.body.error).toBe('Profile is already verified');
    });

    it('should return 429 if rate limit exceeded', async () => {
      const recentAttempts = [
        { id: '1', submitted_at: new Date().toISOString() },
        { id: '2', submitted_at: new Date().toISOString() },
        { id: '3', submitted_at: new Date().toISOString() }
      ];

      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({ data: mockEmployee, error: null });
        }
        if (callCount === 2) {
          return createMockChain({ data: recentAttempts, error: null });
        }
        return createMockChain({ data: null, error: null });
      });

      const response = await request(app)
        .post('/api/employees/emp-123/verify')
        .send({ selfie_url: 'https://example.com/selfie.jpg' })
        .expect(429);

      expect(response.body.error).toContain('Maximum');
      expect(response.body.retry_after).toBeDefined();
    });

    it('should return 500 on verification insert error', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({ data: mockEmployee, error: null });
        }
        if (callCount === 2) {
          return createMockChain({ data: [], error: null });
        }
        if (callCount === 3) {
          return createMockChain({ data: null, error: { message: 'Insert failed' } });
        }
        return createMockChain({ data: null, error: null });
      });

      const response = await request(app)
        .post('/api/employees/emp-123/verify')
        .send({ selfie_url: 'https://example.com/selfie.jpg' })
        .expect(500);

      expect(response.body.error).toBe('Failed to create verification record');
    });

    it('should return 500 on unexpected error', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await request(app)
        .post('/api/employees/emp-123/verify')
        .send({ selfie_url: 'https://example.com/selfie.jpg' })
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  // ============================================
  // getVerificationStatus Tests
  // ============================================
  describe('getVerificationStatus', () => {
    beforeEach(() => {
      app.get('/api/employees/:id/verification-status', (req, res, next) => {
        (req as any).user = mockUser;
        next();
      }, getVerificationStatus);
    });

    it('should return verification status successfully', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1 && table === 'employees') {
          return createMockChain({ data: mockEmployee, error: null });
        }
        if (callCount === 2 && table === 'employee_verifications') {
          return createMockChain({ data: mockVerification, error: null });
        }
        return createMockChain({ data: null, error: null });
      });

      const response = await request(app)
        .get('/api/employees/emp-123/verification-status')
        .expect(200);

      expect(response.body.employee).toBeDefined();
      expect(response.body.employee.id).toBe('emp-123');
      expect(response.body.latest_verification).toBeDefined();
    });

    it('should return 404 if employee not found', async () => {
      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: null, error: { code: 'PGRST116' } })
      );

      const response = await request(app)
        .get('/api/employees/non-existent/verification-status')
        .expect(404);

      expect(response.body.error).toBe('Employee not found');
    });

    it('should return null for latest_verification if none exists', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({ data: mockEmployee, error: null });
        }
        // No verification found (PGRST116 is expected for .single() with no results)
        return createMockChain({ data: null, error: { code: 'PGRST116' } });
      });

      const response = await request(app)
        .get('/api/employees/emp-123/verification-status')
        .expect(200);

      expect(response.body.latest_verification).toBeNull();
    });

    it('should return 500 on unexpected error', async () => {
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/employees/emp-123/verification-status')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  // ============================================
  // getManualReviewQueue Tests (Admin)
  // ============================================
  describe('getManualReviewQueue', () => {
    beforeEach(() => {
      app.get('/api/admin/verifications/manual-review', (req, res, next) => {
        (req as any).user = mockAdmin;
        next();
      }, getManualReviewQueue);
    });

    it('should return manual review queue successfully', async () => {
      const mockQueue = [
        { ...mockVerification, employee: mockEmployee },
        { ...mockVerification, id: 'verify-456', employee: { ...mockEmployee, id: 'emp-456' } }
      ];

      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: mockQueue, error: null })
      );

      const response = await request(app)
        .get('/api/admin/verifications/manual-review')
        .expect(200);

      expect(response.body.verifications).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should return empty queue', async () => {
      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: [], error: null })
      );

      const response = await request(app)
        .get('/api/admin/verifications/manual-review')
        .expect(200);

      expect(response.body.verifications).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should return 500 on database error', async () => {
      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: null, error: { message: 'Database error' } })
      );

      const response = await request(app)
        .get('/api/admin/verifications/manual-review')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch manual review queue');
    });
  });

  // ============================================
  // reviewVerification Tests (Admin)
  // ============================================
  describe('reviewVerification', () => {
    beforeEach(() => {
      app.patch('/api/admin/verifications/:id/review', (req, res, next) => {
        (req as any).user = mockAdmin;
        next();
      }, reviewVerification);
    });

    it('should approve verification successfully', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1 && table === 'employee_verifications') {
          return createMockChain({ data: mockVerification, error: null });
        }
        if (callCount === 2 && table === 'employee_verifications') {
          return createMockChain({ data: null, error: null });
        }
        if (callCount === 3 && table === 'employees') {
          return createMockChain({ data: null, error: null });
        }
        if (callCount === 4 && table === 'employees') {
          return createMockChain({ data: { user_id: 'user-123', name: 'Test' }, error: null });
        }
        return createMockChain({ data: null, error: null });
      });

      const response = await request(app)
        .patch('/api/admin/verifications/verify-123/review')
        .send({ action: 'approve', admin_notes: 'Looks good' })
        .expect(200);

      expect(response.body.message).toBe('Verification approved successfully');
      expect(response.body.verification.status).toBe('approved');
    });

    it('should reject verification successfully', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({ data: mockVerification, error: null });
        }
        if (callCount === 2) {
          return createMockChain({ data: null, error: null });
        }
        if (callCount === 3) {
          return createMockChain({ data: { user_id: 'user-123', name: 'Test' }, error: null });
        }
        return createMockChain({ data: null, error: null });
      });

      const response = await request(app)
        .patch('/api/admin/verifications/verify-123/review')
        .send({ action: 'reject', admin_notes: 'Photo mismatch' })
        .expect(200);

      expect(response.body.message).toBe('Verification rejected successfully');
      expect(response.body.verification.status).toBe('rejected');
    });

    it('should return 400 for invalid action', async () => {
      const response = await request(app)
        .patch('/api/admin/verifications/verify-123/review')
        .send({ action: 'invalid' })
        .expect(400);

      expect(response.body.error).toBe('action must be "approve" or "reject"');
    });

    it('should return 400 for missing action', async () => {
      const response = await request(app)
        .patch('/api/admin/verifications/verify-123/review')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('action must be "approve" or "reject"');
    });

    it('should return 404 if verification not found', async () => {
      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: null, error: { code: 'PGRST116' } })
      );

      const response = await request(app)
        .patch('/api/admin/verifications/non-existent/review')
        .send({ action: 'approve' })
        .expect(404);

      expect(response.body.error).toBe('Verification not found');
    });

    it('should return 400 if verification not in manual_review status', async () => {
      const approvedVerification = { ...mockVerification, status: 'approved' };

      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: approvedVerification, error: null })
      );

      const response = await request(app)
        .patch('/api/admin/verifications/verify-123/review')
        .send({ action: 'approve' })
        .expect(400);

      expect(response.body.error).toBe('Verification is not in manual_review status');
    });

    it('should return 500 on update error', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({ data: mockVerification, error: null });
        }
        return createMockChain({ data: null, error: { message: 'Update failed' } });
      });

      const response = await request(app)
        .patch('/api/admin/verifications/verify-123/review')
        .send({ action: 'approve' })
        .expect(500);

      expect(response.body.error).toBe('Failed to update verification');
    });
  });

  // ============================================
  // getRecentVerifications Tests (Admin)
  // ============================================
  describe('getRecentVerifications', () => {
    beforeEach(() => {
      app.get('/api/admin/verifications/recent', (req, res, next) => {
        (req as any).user = mockAdmin;
        next();
      }, getRecentVerifications);
    });

    it('should return recent verifications', async () => {
      const mockVerifications = [
        { ...mockVerification, employee: mockEmployee },
        { ...mockVerification, id: 'verify-456', status: 'approved' }
      ];

      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: mockVerifications, error: null })
      );

      const response = await request(app)
        .get('/api/admin/verifications/recent')
        .expect(200);

      expect(response.body.verifications).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter by status', async () => {
      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: [mockVerification], error: null })
      );

      const response = await request(app)
        .get('/api/admin/verifications/recent?status=manual_review')
        .expect(200);

      expect(response.body.verifications).toHaveLength(1);
    });

    it('should return empty array when no verifications', async () => {
      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: [], error: null })
      );

      const response = await request(app)
        .get('/api/admin/verifications/recent')
        .expect(200);

      expect(response.body.verifications).toEqual([]);
    });

    it('should return 500 on database error', async () => {
      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: null, error: { message: 'Database error' } })
      );

      const response = await request(app)
        .get('/api/admin/verifications/recent')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch recent verifications');
    });
  });

  // ============================================
  // revokeVerification Tests (Admin)
  // ============================================
  describe('revokeVerification', () => {
    beforeEach(() => {
      app.delete('/api/admin/employees/:id/verification', (req, res, next) => {
        (req as any).user = mockAdmin;
        next();
      }, revokeVerification);
    });

    it('should revoke verification successfully', async () => {
      const verifiedEmployee = { ...mockEmployee, is_verified: true, verified_at: '2024-01-01T00:00:00Z' };

      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1 && table === 'employees') {
          return createMockChain({ data: verifiedEmployee, error: null });
        }
        if (callCount === 2 && table === 'employees') {
          return createMockChain({ data: null, error: null });
        }
        if (callCount === 3 && table === 'employee_verifications') {
          return createMockChain({ data: null, error: null });
        }
        return createMockChain({ data: null, error: null });
      });

      const response = await request(app)
        .delete('/api/admin/employees/emp-123/verification')
        .send({ reason: 'Fraudulent verification' })
        .expect(200);

      expect(response.body.message).toBe('Verification rejected successfully');
      expect(response.body.employee.is_verified).toBe(false);
      expect(response.body.rejection.reason).toBe('Fraudulent verification');
    });

    it('should return 400 if reason is missing', async () => {
      const response = await request(app)
        .delete('/api/admin/employees/emp-123/verification')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('reason is required');
    });

    it('should return 400 if reason is empty', async () => {
      const response = await request(app)
        .delete('/api/admin/employees/emp-123/verification')
        .send({ reason: '   ' })
        .expect(400);

      expect(response.body.error).toBe('reason is required');
    });

    it('should return 404 if employee not found', async () => {
      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: null, error: { code: 'PGRST116' } })
      );

      const response = await request(app)
        .delete('/api/admin/employees/non-existent/verification')
        .send({ reason: 'Test reason' })
        .expect(404);

      expect(response.body.error).toBe('Employee not found');
    });

    it('should return 400 if employee not currently verified', async () => {
      (supabase.from as jest.Mock).mockImplementation(() =>
        createMockChain({ data: mockEmployee, error: null })
      );

      const response = await request(app)
        .delete('/api/admin/employees/emp-123/verification')
        .send({ reason: 'Test reason' })
        .expect(400);

      expect(response.body.error).toBe('Employee is not currently verified');
    });

    it('should return 500 on update error', async () => {
      const verifiedEmployee = { ...mockEmployee, is_verified: true };

      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain({ data: verifiedEmployee, error: null });
        }
        return createMockChain({ data: null, error: { message: 'Update failed' } });
      });

      const response = await request(app)
        .delete('/api/admin/employees/emp-123/verification')
        .send({ reason: 'Test reason' })
        .expect(500);

      expect(response.body.error).toBe('Failed to revoke verification');
    });
  });
});
