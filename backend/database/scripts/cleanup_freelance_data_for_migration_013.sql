-- =====================================================
-- Cleanup Script: Prepare Freelance Data for Migration 013
-- Date: 2025-01-19
-- =====================================================
-- Description: Cleanup script to prepare existing data for migration 013.
-- This script:
-- 1. Deactivates all active independent_positions for freelances
-- 2. Terminates employment for freelances in non-nightclub establishments
--
-- IMPORTANT: Run verify_freelance_data_before_migration_013.sql FIRST
-- to understand the impact of this cleanup.
--
-- This script is OPTIONAL but RECOMMENDED before migration 013.
-- =====================================================

BEGIN;

\echo '====================================================='
\echo 'FREELANCE DATA CLEANUP - Pre-Migration 013'
\echo '====================================================='
\echo ''

-- =====================================================
-- CLEANUP 1: Deactivate all active independent_positions
-- =====================================================
\echo '1. Deactivating all active independent positions for freelances...'
\echo ''

-- First, show what will be deactivated
\echo 'Positions to be deactivated:'
SELECT
  ip.id,
  e.name as employee_name,
  e.nickname,
  ip.zone,
  ip.grid_row,
  ip.grid_col
FROM independent_positions ip
INNER JOIN employees e ON ip.employee_id = e.id
WHERE ip.is_active = TRUE
  AND e.is_freelance = TRUE;

-- Deactivate positions
UPDATE independent_positions
SET is_active = FALSE,
    updated_at = NOW()
WHERE is_active = TRUE
  AND employee_id IN (
    SELECT id FROM employees WHERE is_freelance = TRUE
  );

\echo ''
\echo 'Deactivation complete. Positions set to is_active=FALSE.'
\echo ''

-- =====================================================
-- CLEANUP 2: Terminate employment for freelances in non-nightclubs
-- =====================================================
\echo '2. Terminating employment for freelances in non-nightclub establishments...'
\echo ''

-- First, show what will be terminated
\echo 'Employment relationships to be terminated:'
SELECT
  e.id as employee_id,
  e.name as employee_name,
  e.nickname,
  est.name as establishment_name,
  ec.name as category_name
FROM employment_history eh
INNER JOIN employees e ON eh.employee_id = e.id
INNER JOIN establishments est ON eh.establishment_id = est.id
INNER JOIN establishment_categories ec ON est.category_id = ec.id
WHERE e.is_freelance = TRUE
  AND eh.is_current = TRUE
  AND ec.name != 'Nightclub';

-- Terminate employment (set is_current = FALSE, add end_date)
UPDATE employment_history
SET is_current = FALSE,
    end_date = CURRENT_DATE,
    updated_at = NOW()
WHERE id IN (
  SELECT eh.id
  FROM employment_history eh
  INNER JOIN employees e ON eh.employee_id = e.id
  INNER JOIN establishments est ON eh.establishment_id = est.id
  INNER JOIN establishment_categories ec ON est.category_id = ec.id
  WHERE e.is_freelance = TRUE
    AND eh.is_current = TRUE
    AND ec.name != 'Nightclub'
);

\echo ''
\echo 'Termination complete. Freelances removed from non-nightclub establishments.'
\echo ''

-- =====================================================
-- CLEANUP 3: Verification after cleanup
-- =====================================================
\echo '3. Verifying cleanup results...'
\echo ''

-- Check remaining active positions
\echo 'Remaining active independent_positions (should be 0 for freelances):'
SELECT COUNT(*) as remaining_active_positions
FROM independent_positions ip
INNER JOIN employees e ON ip.employee_id = e.id
WHERE ip.is_active = TRUE
  AND e.is_freelance = TRUE;

\echo ''

-- Check remaining non-nightclub associations
\echo 'Remaining freelances in non-nightclub establishments (should be 0):'
SELECT COUNT(*) as remaining_non_nightclub_freelances
FROM employment_history eh
INNER JOIN employees e ON eh.employee_id = e.id
INNER JOIN establishments est ON eh.establishment_id = est.id
INNER JOIN establishment_categories ec ON est.category_id = ec.id
WHERE e.is_freelance = TRUE
  AND eh.is_current = TRUE
  AND ec.name != 'Nightclub';

\echo ''

-- Show freelance distribution after cleanup
\echo 'Freelance distribution after cleanup:'
SELECT
  'Free freelances (no establishment)' as category,
  COUNT(*) as count
FROM employees e
WHERE e.is_freelance = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM employment_history eh
    WHERE eh.employee_id = e.id AND eh.is_current = TRUE
  )
UNION ALL
SELECT
  'Nightclub freelances' as category,
  COUNT(DISTINCT e.id) as count
FROM employees e
INNER JOIN employment_history eh ON e.id = eh.employee_id
INNER JOIN establishments est ON eh.establishment_id = est.id
INNER JOIN establishment_categories ec ON est.category_id = ec.id
WHERE e.is_freelance = TRUE
  AND eh.is_current = TRUE
  AND ec.name = 'Nightclub';

\echo ''

-- =====================================================
-- COMMIT OR ROLLBACK
-- =====================================================
\echo '====================================================='
\echo 'CLEANUP SUMMARY'
\echo '====================================================='
\echo ''
\echo 'Cleanup operations completed successfully.'
\echo ''
\echo 'Review the results above. If everything looks good:'
\echo '  - Type COMMIT; to apply changes'
\echo ''
\echo 'If you want to cancel changes:'
\echo '  - Type ROLLBACK; to undo all changes'
\echo ''
\echo 'After committing, you can proceed with migration 013:'
\echo '  - psql -d your_database -f 013_refactor_freelance_nightclub_system.sql'
\echo ''
\echo '====================================================='

-- Do NOT auto-commit - let user decide
-- User must manually type COMMIT; or ROLLBACK;
