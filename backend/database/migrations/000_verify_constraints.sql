-- ========================================
-- VERIFICATION SCRIPT - Audit Métier Fixes
-- ========================================
-- Purpose: Verify if Bug #1 fix (UNIQUE constraint) is already applied
-- Run this in Supabase SQL Editor before applying fixes

-- 1. Check if UNIQUE index exists on grid positions
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'establishments'
  AND indexname = 'idx_unique_position_per_zone';

-- Expected result:
-- If index exists → Bug #1 is already fixed ✅
-- If empty → Need to run add-unique-constraint.sql ❌

-- 2. Check for duplicate positions (should be 0 if constraint is active)
SELECT
  zone,
  grid_row,
  grid_col,
  COUNT(*) as count,
  array_agg(id) as establishment_ids,
  array_agg(name) as establishment_names
FROM establishments
WHERE zone IS NOT NULL
  AND grid_row IS NOT NULL
  AND grid_col IS NOT NULL
GROUP BY zone, grid_row, grid_col
HAVING COUNT(*) > 1;

-- Expected result:
-- Empty → No duplicates ✅
-- Rows → Duplicates exist! ❌ (must be resolved before adding constraint)

-- 3. Check establishments table constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'establishments'::regclass
ORDER BY conname;

-- 4. Check if swap RPC function exists (for Bug #7 fix)
SELECT
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname = 'swap_establishment_positions';

-- Expected result:
-- If exists → Bug #7 fix is applied ✅
-- If empty → Need to create RPC function ❌
