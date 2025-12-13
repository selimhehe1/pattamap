-- Migration: Repair Existing Employee Links
-- Description: Fix users with account_type='employee' but linked_employee_id IS NULL
-- Version: v10.0.2
-- Date: 2025-01-11
-- Type: Data Migration (Idempotent - can be run multiple times safely)
BEGIN;

-- ============================================
-- PROBLEM:
-- ============================================
-- Some users have account_type='employee' but linked_employee_id IS NULL
-- This causes the "No Profile Linked" error in the Employee Dashboard
--
-- Causes:
-- 1. Employee profiles created BEFORE the add_user_employee_link.sql migration
-- 2. Employee profiles created by admins/users for someone else (not self-managed)
-- 3. Partial transaction failures during createOwnEmployeeProfile
-- 4. Manual approval without creating the bidirectional link

-- ============================================
-- SOLUTION:
-- ============================================
-- Find all users with account_type='employee' and linked_employee_id IS NULL
-- For each user, find if an employee exists with user_id = user.id
-- If found, create the bidirectional link: users.linked_employee_id → employees.id

-- ============================================
-- STEP 1: Diagnostic Query (Read-Only)
-- ============================================
-- Run this first to see how many users will be affected

SELECT
  u.id AS user_id,
  u.email,
  u.pseudonym,
  u.account_type,
  u.linked_employee_id AS current_link,
  e.id AS employee_id,
  e.name AS employee_name,
  e.nickname AS employee_nickname,
  e.status AS employee_status,
  CASE
    WHEN e.id IS NOT NULL THEN '✅ Can be repaired'
    ELSE '⚠️ Orphan (no employee found)'
  END AS repair_status
FROM users u
LEFT JOIN employees e ON e.user_id = u.id
WHERE u.account_type = 'employee'
  AND u.linked_employee_id IS NULL
ORDER BY u.created_at DESC;

-- ============================================
-- STEP 2: Repair Query (Write - Idempotent)
-- ============================================
-- This UPDATE is idempotent: it only updates users where linked_employee_id IS NULL
-- and only if a matching employee exists

-- Uncomment the following query to execute the repair:
-- (Comment it back after running to prevent accidental re-execution)

/*
UPDATE users
SET
  linked_employee_id = employees.id,
  updated_at = NOW()
FROM employees
WHERE employees.user_id = users.id
  AND users.account_type = 'employee'
  AND users.linked_employee_id IS NULL;
*/

-- ============================================
-- STEP 3: Verification Query (Read-Only)
-- ============================================
-- Run this after the repair to verify the fix

SELECT
  u.id AS user_id,
  u.email,
  u.pseudonym,
  u.account_type,
  u.linked_employee_id,
  e.id AS employee_id,
  e.name AS employee_name,
  e.user_id AS employee_user_link,
  CASE
    WHEN u.linked_employee_id = e.id AND e.user_id = u.id THEN '✅ Bidirectional link OK'
    WHEN u.linked_employee_id IS NOT NULL AND e.user_id IS NULL THEN '⚠️ User links to employee but employee does not link back'
    WHEN u.linked_employee_id IS NULL AND e.user_id IS NOT NULL THEN '⚠️ Employee links to user but user does not link back'
    WHEN u.linked_employee_id IS NULL AND e.user_id IS NULL THEN '❌ No link at all'
    ELSE '❓ Unknown state'
  END AS link_status
FROM users u
LEFT JOIN employees e ON e.id = u.linked_employee_id
WHERE u.account_type = 'employee'
ORDER BY u.created_at DESC;

-- ============================================
-- STEP 4: Find Orphan Users (No Employee)
-- ============================================
-- Users with account_type='employee' but no employee profile exists

SELECT
  u.id AS user_id,
  u.email,
  u.pseudonym,
  u.created_at,
  '⚠️ No employee profile exists for this user' AS issue,
  'User should create their profile or claim an existing one' AS action_needed
FROM users u
LEFT JOIN employees e ON e.user_id = u.id
WHERE u.account_type = 'employee'
  AND u.linked_employee_id IS NULL
  AND e.id IS NULL
ORDER BY u.created_at DESC;

-- ============================================
-- STEP 5: Find Orphan Employees (No User)
-- ============================================
-- Employees with user_id IS NOT NULL but user does not link back

SELECT
  e.id AS employee_id,
  e.name,
  e.nickname,
  e.user_id,
  u.email AS user_email,
  u.linked_employee_id AS user_link,
  '⚠️ Employee links to user but user does not link back' AS issue,
  'Run repair query to fix this' AS action_needed
FROM employees e
LEFT JOIN users u ON u.id = e.user_id
WHERE e.user_id IS NOT NULL
  AND (u.linked_employee_id IS NULL OR u.linked_employee_id != e.id)
ORDER BY e.created_at DESC;

-- ============================================
-- USAGE INSTRUCTIONS:
-- ============================================
-- 1. Run STEP 1 (Diagnostic Query) to see affected users
-- 2. Review the results to understand the scope
-- 3. Uncomment STEP 2 (Repair Query) and run it
-- 4. Run STEP 3 (Verification Query) to verify the fix
-- 5. Run STEP 4 (Orphan Users) to find users without employee profiles
-- 6. Run STEP 5 (Orphan Employees) to find employees without user links
-- 7. Comment STEP 2 back to prevent accidental re-execution

-- ============================================
-- NOTES:
-- ============================================
-- - This migration is idempotent: safe to run multiple times
-- - Only affects users with account_type='employee' and linked_employee_id IS NULL
-- - Does NOT delete or modify employee profiles
-- - Does NOT change user account_type
-- - Only creates the missing link: users.linked_employee_id → employees.id
-- - Orphan users (no employee) are identified but not modified
--   (they need to create their profile or claim an existing one)

-- ============================================
-- ROLLBACK (if needed):
-- ============================================
-- If you need to undo the repair (NOT recommended):

/*
UPDATE users
SET
  linked_employee_id = NULL,
  updated_at = NOW()
WHERE account_type = 'employee'
  AND linked_employee_id IN (
    SELECT id FROM employees WHERE user_id = users.id
  );
*/

COMMIT;
