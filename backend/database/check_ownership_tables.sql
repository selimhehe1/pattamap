-- ========================================
-- CHECK OWNERSHIP SYSTEM TABLES
-- ========================================
-- Run this in Supabase SQL Editor to verify ownership tables exist

-- 1. Check if tables exist
SELECT
  table_name,
  CASE
    WHEN table_name IN ('establishment_owners', 'establishment_ownership_requests')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('establishment_owners', 'establishment_ownership_requests')
ORDER BY table_name;

-- 2. Check establishment_owners structure (if exists)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'establishment_owners'
ORDER BY ordinal_position;

-- 3. Check establishment_ownership_requests structure (if exists)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'establishment_ownership_requests'
ORDER BY ordinal_position;

-- 4. Count existing records
SELECT
  'establishment_owners' as table_name,
  COUNT(*) as record_count
FROM establishment_owners
UNION ALL
SELECT
  'establishment_ownership_requests',
  COUNT(*)
FROM establishment_ownership_requests;

-- 5. Check users.account_type supports 'establishment_owner'
SELECT DISTINCT account_type
FROM users
WHERE account_type IS NOT NULL
ORDER BY account_type;
