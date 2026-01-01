/**
 * Express.Request Type Extensions
 *
 * This file extends the Express Request interface globally to include
 * custom properties set by our middleware (auth, csrf, etc.)
 *
 * This eliminates the need for `(req as any).user` type assertions.
 */

declare global {
  namespace Express {
    interface Request {
      /**
       * User object populated by authenticateToken middleware
       * May be undefined for unauthenticated requests
       */
      user?: {
        id: string;
        pseudonym: string;
        email: string;
        role: string;
        is_active: boolean;
        account_type?: string;
        linked_employee_id?: string;
      };

      /**
       * CSRF token populated by csrf middleware
       */
      csrfToken?: string;
    }
  }
}

// Required for TypeScript to treat this as a module
export {};
