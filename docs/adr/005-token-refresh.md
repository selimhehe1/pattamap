# ADR-005: JWT Token Refresh Strategy

## Status
Accepted

## Context
Long-lived JWT tokens are a security risk. If compromised, they remain valid until expiration. We need a way to:
- Keep users logged in for extended periods
- Revoke access quickly if needed
- Detect token theft

## Decision
Implement refresh token rotation with family tracking:

### Token Lifecycle
1. **Login**: Generate access (15min) + refresh (7d) tokens
2. **API Request**: Use access token from cookie
3. **401 Response**: Frontend calls `/api/auth/refresh`
4. **Refresh**:
   - Validate refresh token
   - Issue new access + refresh tokens
   - Invalidate old refresh token
   - Set new cookies

### Token Family
Each login creates a "token family" (UUID). All refresh tokens from that session share the family ID.

If a refresh token is reused:
1. Detect reuse (token already invalidated)
2. Revoke ALL tokens in that family
3. Force re-authentication

### Storage
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  token_family UUID NOT NULL,
  token_hash VARCHAR(64) NOT NULL,  -- SHA-256
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  revoked_reason VARCHAR(50)
);
```

### Frontend Integration
`useSecureFetch` hook automatically:
1. Detects 401 response
2. Calls `/api/auth/refresh`
3. Retries original request
4. Logs out if refresh fails

## Consequences

### Positive
- Short-lived access tokens (15min)
- Token theft detection
- Quick revocation
- Multi-device logout (`/api/auth/logout-all`)

### Negative
- Database hit on every refresh
- Cookie management complexity
- More network requests

### Key Files
- `backend/src/middleware/refreshToken.ts`
- `backend/database/migrations/020_add_refresh_tokens_table.sql`
- `src/hooks/useSecureFetch.ts`
