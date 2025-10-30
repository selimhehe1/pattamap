# VIP Subscriptions Migration Guide

## Overview

This migration adds VIP subscription functionality to PattaMap, enabling monetization through premium features for both employees and establishments.

## Migration File

**File**: `add_vip_subscriptions.sql`

**Creates**:
- 3 tables: `employee_vip_subscriptions`, `establishment_vip_subscriptions`, `vip_payment_transactions`
- 14 indexes for performance
- Row Level Security (RLS) policies
- 3 helper functions: `is_employee_vip()`, `is_establishment_vip()`, `expire_vip_subscriptions()`

## Prerequisites

1. **Supabase Project**: You must have a Supabase project set up
2. **Database Access**: Access to Supabase SQL Editor
3. **PostgreSQL Extensions**: Ensure `btree_gist` extension is enabled (for EXCLUDE constraints)

## Step-by-Step Instructions

### Step 1: Enable Required PostgreSQL Extension

Before running the migration, enable the `btree_gist` extension in Supabase:

```sql
-- Run this first in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

This extension is required for the `EXCLUDE` constraint that prevents overlapping VIP subscriptions.

### Step 2: Run the Migration

1. **Open Supabase Dashboard**
   - Navigate to your PattaMap project
   - Go to **SQL Editor**

2. **Copy Migration SQL**
   - Open `add_vip_subscriptions.sql`
   - Copy the entire file contents (Ctrl+A, Ctrl+C)

3. **Paste and Execute**
   - Paste into Supabase SQL Editor
   - Click **Run** (or press F5)

4. **Verify Success**
   - Check for green success message
   - No errors should appear

### Step 3: Verify Tables Created

Run this verification query:

```sql
-- Verify tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%vip%'
ORDER BY table_name;

-- Expected output:
-- employee_vip_subscriptions
-- establishment_vip_subscriptions
-- vip_payment_transactions
```

### Step 4: Verify Indexes Created

```sql
-- Verify indexes exist
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%vip%'
ORDER BY indexname;

-- Expected: 14 indexes (idx_employee_vip_*, idx_establishment_vip_*, idx_vip_transactions_*)
```

### Step 5: Verify Helper Functions

```sql
-- Verify functions exist
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname IN ('is_employee_vip', 'is_establishment_vip', 'expire_vip_subscriptions');

-- Expected output:
-- is_employee_vip(employee_id_param uuid)
-- is_establishment_vip(establishment_id_param uuid)
-- expire_vip_subscriptions()
```

### Step 6: Verify RLS Policies

```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%vip%';

-- All should have rowsecurity = true

-- Check policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE '%vip%'
ORDER BY tablename, policyname;

-- Expected: ~15 policies across the 3 tables
```

## Post-Migration Tasks

### 1. Set Up Cron Job for Expiration

The `expire_vip_subscriptions()` function should be called daily to automatically expire subscriptions.

**Option A: Supabase Edge Functions (Recommended)**
```typescript
// Create a scheduled edge function that runs daily
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabase.rpc('expire_vip_subscriptions')

  return new Response(
    JSON.stringify({ expired: data, error }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

**Option B: pg_cron Extension**
```sql
-- If pg_cron is available
SELECT cron.schedule(
  'expire-vip-subscriptions',
  '0 0 * * *', -- Every day at midnight
  $$SELECT expire_vip_subscriptions()$$
);
```

**Option C: Backend Scheduled Task**
Add to your Node.js backend:
```typescript
// backend/src/scheduled/expireVIP.ts
import cron from 'node-cron';
import { supabase } from '../config/supabase';

// Run every day at 00:00
cron.schedule('0 0 * * *', async () => {
  const { data, error } = await supabase.rpc('expire_vip_subscriptions');
  console.log(`Expired ${data} VIP subscriptions`);
  if (error) console.error('Error expiring VIP subscriptions:', error);
});
```

### 2. Update Backend Environment Variables

No new environment variables are required for the database. However, for PromptPay integration (Phase 2), you'll need:

```bash
# backend/.env (add later in Phase 2)
PROMPTPAY_MERCHANT_ID=your-merchant-id
PROMPTPAY_QR_API_KEY=your-api-key
```

### 3. Test VIP Functions

```sql
-- Test helper functions with existing data
-- (Replace UUIDs with actual IDs from your database)

-- Test employee VIP check (should return false if no VIP subscriptions yet)
SELECT is_employee_vip('replace-with-actual-employee-uuid');

-- Test establishment VIP check
SELECT is_establishment_vip('replace-with-actual-establishment-uuid');

-- Test expire function (should return 0 if no subscriptions exist)
SELECT expire_vip_subscriptions();
```

## Rollback Instructions

If you need to rollback this migration:

```sql
-- ⚠️ WARNING: This will delete all VIP subscription data!
-- Only run this if you need to completely remove VIP functionality

-- Drop tables (cascade will remove dependent objects)
DROP TABLE IF EXISTS vip_payment_transactions CASCADE;
DROP TABLE IF EXISTS employee_vip_subscriptions CASCADE;
DROP TABLE IF EXISTS establishment_vip_subscriptions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS is_employee_vip(UUID);
DROP FUNCTION IF EXISTS is_establishment_vip(UUID);
DROP FUNCTION IF EXISTS expire_vip_subscriptions();
```

## Common Issues

### Issue 1: "btree_gist extension not found"

**Solution**: Run this before the migration:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

### Issue 2: "relation vip_payment_transactions does not exist"

**Cause**: The migration creates tables in a specific order due to foreign key constraints.

**Solution**: Run the entire migration file at once, don't execute individual sections.

### Issue 3: RLS policies preventing access

**Cause**: RLS policies are strict by default.

**Solution**:
- For development/testing, you can temporarily disable RLS:
  ```sql
  ALTER TABLE employee_vip_subscriptions DISABLE ROW LEVEL SECURITY;
  ```
- For production, ensure users have proper roles (admin, establishment_owner)

## Next Steps

After successful migration:

1. ✅ Migration complete
2. ⏭️ Continue to **Day 1 Afternoon** - Backend controllers & routes
3. ⏭️ Day 2 - Frontend purchase UI & payment flows
4. ⏭️ Day 3 - Admin verification & analytics

## Support

If you encounter issues during migration:

1. Check Supabase logs for error details
2. Verify PostgreSQL version (should be 15+)
3. Ensure you have admin/owner access to the database
4. Check for existing tables with conflicting names

## Schema Diagram

```
┌─────────────────────────────────┐
│  employee_vip_subscriptions     │
├─────────────────────────────────┤
│ id (PK)                         │
│ employee_id (FK → employees)    │
│ status                          │
│ tier                            │
│ duration                        │
│ starts_at, expires_at           │
│ payment_method, payment_status  │
│ transaction_id (FK)             │
│ admin_verified_by (FK → users)  │
└─────────────────────────────────┘
           │
           │ (references)
           ↓
┌─────────────────────────────────┐
│  vip_payment_transactions       │
├─────────────────────────────────┤
│ id (PK)                         │
│ subscription_type               │
│ subscription_id                 │
│ user_id (FK → users)            │
│ amount, currency                │
│ payment_method, payment_status  │
│ promptpay_qr_code               │
│ admin_verified_by (FK → users)  │
└─────────────────────────────────┘
           ↑
           │ (references)
           │
┌─────────────────────────────────┐
│ establishment_vip_subscriptions │
├─────────────────────────────────┤
│ id (PK)                         │
│ establishment_id (FK)           │
│ status                          │
│ tier                            │
│ duration                        │
│ starts_at, expires_at           │
│ payment_method, payment_status  │
│ transaction_id (FK)             │
│ admin_verified_by (FK → users)  │
└─────────────────────────────────┘
```
