# ADR-002: Authentication Strategy

## Status
Accepted

## Context
We need a secure authentication system that:
- Works with our React frontend
- Protects against XSS and CSRF attacks
- Supports session management
- Integrates with Supabase database

## Decision
We use JWT tokens stored in httpOnly cookies with CSRF protection:

1. **Access Token (JWT)**
   - Stored in httpOnly cookie `auth-token`
   - 15-minute expiration (short-lived)
   - Contains: userId, email, role

2. **Refresh Token (JWT)**
   - Stored in httpOnly cookie `refresh-token`
   - 7-day expiration
   - Stored hashed in database for rotation
   - Token family tracking for reuse detection

3. **CSRF Protection**
   - Custom CSRF middleware
   - Token stored in session
   - Required for all POST/PUT/DELETE requests
   - Timing-safe comparison

4. **Password Security**
   - bcrypt with 12 rounds
   - Minimum 8 characters with complexity requirements
   - HaveIBeenPwned breach check (k-anonymity)

## Consequences

### Positive
- XSS protection: httpOnly cookies cannot be accessed by JavaScript
- CSRF protection: Custom token validation
- Token rotation: Refresh tokens are rotated on use
- Breach detection: Token family revocation on reuse

### Negative
- More complex than localStorage tokens
- Cookie configuration must match domains
- CORS configuration required

### Implementation Files
- `backend/src/middleware/auth.ts` - Token validation
- `backend/src/middleware/refreshToken.ts` - Token rotation
- `backend/src/middleware/csrf.ts` - CSRF protection
- `backend/src/controllers/authController.ts` - Auth endpoints
