-- ===========================================
-- Migration #009: Add rejection_reason columns
-- ===========================================
-- Description: Add rejection_reason TEXT columns to establishments and employees tables
--              to persist admin/moderator rejection reasons for better tracking and transparency.
--
-- Related Issue: Quality Issue #2 - Rejection reason persistence
-- Date: 2025-01-19
-- Author: Claude Code (automated fix)
--
-- Backend Changes:
--   - admin.ts line 704-710: POST /establishments/:id/reject - Added reason validation + persistence
--   - admin.ts line 1161-1167: POST /employees/:id/reject - Added reason validation + persistence
--
-- Test Changes:
--   - admin.complete.test.ts line 488: Establishments reject test (now expects 400 without reason)
--   - admin.complete.test.ts line 778: Employees reject test (now expects 400 without reason)
--
-- Impact:
--   - Admins/moderators MUST provide a reason when rejecting content
--   - Rejection reasons are now stored in database for audit trail
--   - Frontend can display rejection reason to users
-- ===========================================

-- Add rejection_reason column to establishments table
ALTER TABLE establishments
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN establishments.rejection_reason IS
'Reason provided by admin/moderator when rejecting establishment submission. Required field since 2025-01-19.';

-- Add rejection_reason column to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN employees.rejection_reason IS
'Reason provided by admin/moderator when rejecting employee profile submission. Required field since 2025-01-19.';

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================

-- Verify columns were added successfully
SELECT
    'establishments' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'establishments'
    AND column_name = 'rejection_reason'
UNION ALL
SELECT
    'employees' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'employees'
    AND column_name = 'rejection_reason';

-- Expected output:
-- table_name      | column_name       | data_type | is_nullable | column_default
-- ----------------|-------------------|-----------|-------------|---------------
-- establishments  | rejection_reason  | text      | YES         | NULL
-- employees       | rejection_reason  | text      | YES         | NULL

-- ===========================================
-- ROLLBACK (if needed)
-- ===========================================
-- Uncomment to rollback this migration:

-- ALTER TABLE establishments DROP COLUMN IF EXISTS rejection_reason;
-- ALTER TABLE employees DROP COLUMN IF EXISTS rejection_reason;

-- ===========================================
-- USAGE EXAMPLES
-- ===========================================

-- Example 1: Check existing rejections without reasons (data cleanup needed)
SELECT
    'establishments' as type,
    id,
    name,
    status,
    rejection_reason,
    updated_at
FROM establishments
WHERE status = 'rejected'
    AND (rejection_reason IS NULL OR rejection_reason = '')
UNION ALL
SELECT
    'employees' as type,
    id,
    name,
    status,
    rejection_reason,
    updated_at
FROM employees
WHERE status = 'rejected'
    AND (rejection_reason IS NULL OR rejection_reason = '');

-- Example 2: View all rejections with reasons (audit trail)
SELECT
    'establishments' as type,
    id,
    name,
    status,
    rejection_reason,
    updated_at
FROM establishments
WHERE status = 'rejected'
    AND rejection_reason IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- Example 3: Statistics on rejections
SELECT
    'establishments' as table_name,
    COUNT(*) as total_rejections,
    COUNT(rejection_reason) as rejections_with_reason,
    COUNT(*) - COUNT(rejection_reason) as rejections_without_reason
FROM establishments
WHERE status = 'rejected'
UNION ALL
SELECT
    'employees' as table_name,
    COUNT(*) as total_rejections,
    COUNT(rejection_reason) as rejections_with_reason,
    COUNT(*) - COUNT(rejection_reason) as rejections_without_reason
FROM employees
WHERE status = 'rejected';

-- ===========================================
-- POST-MIGRATION TASKS
-- ===========================================
-- [ ] Execute this migration in Supabase SQL Editor
-- [ ] Verify columns exist (run verification query above)
-- [ ] Update RLS policies if needed (currently none required)
-- [ ] Update TypeScript interfaces if rejection_reason should be exposed to frontend
-- [ ] Consider backfilling rejection_reason for old rejections (optional)
-- [ ] Update API documentation to reflect required 'reason' field
-- ===========================================
