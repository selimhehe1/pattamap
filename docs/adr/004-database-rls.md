# ADR-004: Database Row-Level Security

## Status
Accepted

## Context
We use Supabase (PostgreSQL) as our database. The backend uses a service key that bypasses RLS (Row-Level Security), but we want defense-in-depth protection against:
- Direct database access via anon key
- Compromised JWT tokens
- API layer bugs

## Decision
Enable RLS on all sensitive tables with policies that match our API access control:

### Tables with RLS
1. **users** - Read/write own profile only
2. **employees** - Public read (approved), owner write
3. **comments** - Public read (approved), author write
4. **favorites** - Private per user
5. **establishments** - Public read (approved), owner write
6. **notifications** - Private per user
7. **refresh_tokens** - Private per user
8. **VIP tables** - Already had RLS

### Policy Pattern
```sql
-- Read own data
CREATE POLICY "table_read_own" ON table
  FOR SELECT USING (user_id = auth.uid());

-- Admin read all
CREATE POLICY "table_admin_read" ON table
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

## Consequences

### Positive
- Defense in depth
- Database-level protection
- Works even if API bypassed
- Audit trail possible

### Negative
- Backend uses service key (bypasses RLS)
- Policies must stay in sync with API logic
- Performance overhead on direct queries

### Migration
`backend/database/migrations/019_add_rls_sensitive_tables.sql`
