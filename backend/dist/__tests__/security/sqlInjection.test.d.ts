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
export {};
//# sourceMappingURL=sqlInjection.test.d.ts.map