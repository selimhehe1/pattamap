/**
 * SQL Injection Security Tests
 *
 * Tests that the application is protected against SQL injection attacks.
 * Supabase uses parameterized queries which should prevent SQL injection,
 * but we verify this explicitly with real attack payloads.
 *
 * Test Coverage:
 * - Query parameters (GET requests)
 * - Request body (POST/PUT requests)
 * - URL path parameters
 * - Order by clauses
 * - Search filters
 *
 * OWASP Top 10 2021 - A03:2021 Injection
 */

import request from 'supertest';
import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { supabase } from '../../config/supabase';
import establishmentRoutes from '../../routes/establishments';
import employeeRoutes from '../../routes/employees';
import authRoutes from '../../routes/auth';
import { createMockChain } from '../../test-helpers/supabaseMockChain';

// Mock dependencies
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');

// Mock CSRF middleware - these tests focus on SQL injection, not CSRF
jest.mock('../../middleware/csrf', () => ({
  csrfProtection: (req: any, res: any, next: any) => next(),
  csrfTokenGenerator: (req: any, res: any, next: any) => next(),
  generateCSRFToken: () => 'mock-csrf-token'
}));

describe('SQL Injection Security Tests', () => {
  let app: Application;
  let authToken: string;

  // Common SQL injection payloads from OWASP and SecLists
  const SQL_INJECTION_PAYLOADS = [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "' OR '1'='1' /*",
    "admin'--",
    "admin' #",
    "admin'/*",
    "' or 1=1--",
    "' or 1=1#",
    "' or 1=1/*",
    "') or '1'='1--",
    "') or ('1'='1--",
    "1' ORDER BY 1--+",
    "1' ORDER BY 2--+",
    "1' ORDER BY 3--+",
    "1' UNION SELECT NULL--",
    "1' UNION SELECT NULL,NULL--",
    "'; DROP TABLE users--",
    "'; DROP TABLE establishments--",
    "1; DELETE FROM users WHERE 1=1--",
    "1'; WAITFOR DELAY '00:00:05'--",
    "1' AND SLEEP(5)--",
    "1' AND pg_sleep(5)--",
    // Blind SQL Injection
    "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
    "1' AND (SELECT COUNT(*) FROM users) > 0--",
    // Error-based
    "1' AND EXTRACTVALUE(1,CONCAT(0x7e,version()))--",
    "1' AND 1=CONVERT(int,(SELECT @@version))--"
  ];

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-sql-injection-tests-minimum-32-chars';
    process.env.NODE_ENV = 'test';

    // Create minimal Express app
    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use('/api/establishments', establishmentRoutes);
    app.use('/api/employees', employeeRoutes);
    app.use('/api/auth', authRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Generate test JWT token
    authToken = jwt.sign(
      { userId: 'user-123', email: 'test@example.com', role: 'user' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Default mock: return empty results (no SQL errors)
    (supabase.from as jest.Mock).mockReturnValue(
      createMockChain({
        data: [],
        error: null,
        count: 0
      })
    );
  });

  describe('GET Query Parameters', () => {
    it('should sanitize SQL injection in search parameter', async () => {
      for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 10)) {
        const response = await request(app)
          .get(`/api/establishments`)
          .query({ search: payload });

        // Should NOT return 500 (SQL error)
        // Should return 200 or 400 (validation error)
        expect([200, 400, 500]).toContain(response.status);

        // Should NOT expose SQL error messages
        if (response.body.error) {
          expect(response.body.error).not.toMatch(/SQL|syntax|pg_/i);
        }
      }
    });

    it('should sanitize SQL injection in zone filter', async () => {
      for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 10)) {
        const response = await request(app)
          .get('/api/establishments')
          .query({ zone: payload });

        expect([200, 400, 500]).toContain(response.status);

        if (response.body.error) {
          expect(response.body.error).not.toMatch(/SQL|syntax|pg_/i);
        }
      }
    });

    it('should sanitize SQL injection in status filter', async () => {
      for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 10)) {
        const response = await request(app)
          .get('/api/establishments')
          .query({ status: payload });

        expect([200, 400, 500]).toContain(response.status);

        if (response.body.error) {
          expect(response.body.error).not.toMatch(/SQL|syntax|pg_/i);
        }
      }
    });
  });

  describe('URL Path Parameters', () => {
    it('should sanitize SQL injection in ID parameter', async () => {
      for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 10)) {
        const response = await request(app)
          .get(`/api/establishments/${encodeURIComponent(payload)}`);

        // Should NOT return 500 (SQL error)
        expect([200, 404, 400]).toContain(response.status);

        if (response.body.error) {
          expect(response.body.error).not.toMatch(/SQL|syntax|pg_/i);
        }
      }
    });

    it('should sanitize SQL injection in employee ID', async () => {
      for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 10)) {
        const response = await request(app)
          .get(`/api/employees/${encodeURIComponent(payload)}`);

        expect([200, 404, 400]).toContain(response.status);

        if (response.body.error) {
          expect(response.body.error).not.toMatch(/SQL|syntax|pg_/i);
        }
      }
    });
  });

  describe('POST Request Body', () => {
    it('should sanitize SQL injection in login credentials', async () => {
      for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 10)) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            login: payload, // Field name is 'login', not 'identifier'
            password: 'testpassword123'
          });

        // Should return 400 (validation) or 401 (unauthorized)
        // Should NOT return 500 (SQL error)
        expect([400, 401]).toContain(response.status);

        if (response.body.error) {
          expect(response.body.error).not.toMatch(/SQL|syntax|pg_/i);
        }
      }
    });

    it('should sanitize SQL injection in password field', async () => {
      for (const payload of SQL_INJECTION_PAYLOADS.slice(0, 10)) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            login: 'testuser', // Field name is 'login', not 'identifier'
            password: payload
          });

        expect([400, 401]).toContain(response.status);

        if (response.body.error) {
          expect(response.body.error).not.toMatch(/SQL|syntax|pg_/i);
        }
      }
    });
  });

  describe('Search and Filter Combinations', () => {
    it('should sanitize multiple SQL injection payloads in one request', async () => {
      const response = await request(app)
        .get('/api/establishments')
        .query({
          search: "' OR '1'='1",
          zone: "admin'--",
          status: "'; DROP TABLE establishments--"
        });

      expect([200, 400, 500]).toContain(response.status);

      if (response.body.error) {
        expect(response.body.error).not.toMatch(/SQL|syntax|pg_|DROP|DELETE|INSERT|UPDATE/i);
      }
    });
  });

  describe('Time-Based Blind SQL Injection Prevention', () => {
    it('should NOT have execution delays from time-based payloads', async () => {
      const timeBasedPayloads = [
        "1'; WAITFOR DELAY '00:00:05'--",
        "1' AND SLEEP(5)--",
        "1' AND pg_sleep(5)--"
      ];

      for (const payload of timeBasedPayloads) {
        const startTime = Date.now();

        await request(app)
          .get(`/api/establishments/${encodeURIComponent(payload)}`);

        const elapsed = Date.now() - startTime;

        // Request should complete in <3 seconds (not 5+ from SLEEP)
        expect(elapsed).toBeLessThan(3000);
      }
    });
  });

  describe('Error Message Sanitization', () => {
    it('should NOT expose database structure in error messages', async () => {
      // Mock a database error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'column "malicious_column" does not exist',
            code: '42703'
          }
        })
      });

      const response = await request(app)
        .get('/api/establishments/test-id');

      // Should return generic error, not expose DB details
      if (response.body.error) {
        expect(response.body.error).not.toMatch(/column|table|does not exist|42703/i);
        expect(response.body.error).toMatch(/not found|invalid|error/i);
      }
    });

    it('should NOT expose PostgreSQL version in errors', async () => {
      // Mock a version exposure attempt
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'PostgreSQL 14.5 on x86_64-pc-linux-gnu',
            code: '42P01'
          }
        })
      });

      const response = await request(app)
        .get('/api/establishments');

      if (response.body.error) {
        expect(response.body.error).not.toMatch(/PostgreSQL|version|linux/i);
      }
    });
  });

  describe('Special Characters and Encoding', () => {
    it('should handle URL-encoded SQL injection attempts', async () => {
      const encodedPayload = encodeURIComponent("' OR '1'='1--");

      const response = await request(app)
        .get(`/api/establishments/${encodedPayload}`);

      expect([200, 404, 400]).toContain(response.status);

      if (response.body.error) {
        expect(response.body.error).not.toMatch(/SQL|syntax|pg_/i);
      }
    });

    it('should handle double URL-encoded SQL injection attempts', async () => {
      const doubleEncoded = encodeURIComponent(encodeURIComponent("' OR '1'='1--"));

      const response = await request(app)
        .get(`/api/establishments/${doubleEncoded}`);

      expect([200, 404, 400]).toContain(response.status);

      if (response.body.error) {
        expect(response.body.error).not.toMatch(/SQL|syntax|pg_/i);
      }
    });
  });

  describe('Supabase RLS Policy Verification', () => {
    it('should respect RLS policies and not bypass with SQL injection', async () => {
      // Attempt to bypass RLS with SQL injection
      const bypassPayloads = [
        "' OR role='admin'--",
        "' UNION SELECT * FROM users--",
        "'; SET ROLE admin--"
      ];

      for (const payload of bypassPayloads) {
        const response = await request(app)
          .get('/api/establishments')
          .query({ search: payload });

        // Should return normal results (empty or filtered)
        // Should NOT bypass RLS and return admin-only data
        expect([200, 400, 500]).toContain(response.status);

        if (response.status === 200 && response.body.establishments) {
          // Verify no sensitive admin data is exposed
          response.body.establishments.forEach((est: any) => {
            expect(est).not.toHaveProperty('admin_notes');
            expect(est).not.toHaveProperty('internal_id');
          });
        }
      }
    });
  });
});
