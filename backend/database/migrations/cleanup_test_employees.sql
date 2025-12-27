-- ========================================
-- CLEANUP: Remove Test Employees from Production
-- Date: 2025-12-27
-- Description: Removes test employee records created during development
-- ========================================

-- WARNING: Run this script ONCE in production to clean up test data
-- The employees table has CASCADE DELETE on most FKs, so related records will be auto-deleted

-- ========================================
-- Step 1: Show what will be deleted (DRY RUN)
-- ========================================
DO $$
DECLARE
  test_employee_count INT;
BEGIN
  SELECT COUNT(*) INTO test_employee_count
  FROM employees
  WHERE name ILIKE '%test%'
     OR name ILIKE '%xp test%'
     OR nickname ILIKE '%test%';

  RAISE NOTICE 'Found % test employees to delete', test_employee_count;
END $$;

-- View the employees that will be deleted
SELECT id, name, nickname, status, created_at
FROM employees
WHERE name ILIKE '%test%'
   OR name ILIKE '%xp test%'
   OR nickname ILIKE '%test%';

-- ========================================
-- Step 2: Unlink any users linked to these employees
-- (users.linked_employee_id doesn't have CASCADE)
-- ========================================
UPDATE users
SET linked_employee_id = NULL
WHERE linked_employee_id IN (
  SELECT id FROM employees
  WHERE name ILIKE '%test%'
     OR name ILIKE '%xp test%'
     OR nickname ILIKE '%test%'
);

-- ========================================
-- Step 3: Delete the test employees
-- Related records will be cascade deleted:
--   - employment_history
--   - independent_positions
--   - comments
--   - user_favorites
--   - employee_vip_subscriptions
--   - employee_verifications
--   - employee_existence_votes
--   - profile_views
-- ========================================
DELETE FROM employees
WHERE name ILIKE '%test%'
   OR name ILIKE '%xp test%'
   OR nickname ILIKE '%test%';

-- ========================================
-- Step 4: Verify cleanup
-- ========================================
DO $$
DECLARE
  remaining_test_count INT;
BEGIN
  SELECT COUNT(*) INTO remaining_test_count
  FROM employees
  WHERE name ILIKE '%test%'
     OR name ILIKE '%xp test%'
     OR nickname ILIKE '%test%';

  IF remaining_test_count = 0 THEN
    RAISE NOTICE 'SUCCESS: All test employees have been removed';
  ELSE
    RAISE NOTICE 'WARNING: % test employees still remain', remaining_test_count;
  END IF;
END $$;

-- Show remaining employees count
SELECT COUNT(*) as total_employees FROM employees;
