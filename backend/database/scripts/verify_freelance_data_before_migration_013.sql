-- =====================================================
-- Verification Script: Check Freelance Data Before Migration 013
-- Date: 2025-01-19
-- =====================================================
-- Description: Verify existing freelance data before applying migration 013.
-- This script checks for:
-- 1. Employees with freelance_zone set
-- 2. Active freelance positions in independent_positions table
-- 3. Freelances currently in non-nightclub establishments
--
-- Run this script BEFORE applying migration 013 to understand data impact.
-- =====================================================

\echo '====================================================='
\echo 'FREELANCE DATA VERIFICATION - Pre-Migration 013'
\echo '====================================================='
\echo ''

-- =====================================================
-- CHECK 1: Employees with freelance_zone
-- =====================================================
\echo '1. Checking employees with freelance_zone field...'
\echo ''

SELECT
  COUNT(*) as total_with_zone,
  COUNT(CASE WHEN is_freelance = TRUE THEN 1 END) as freelance_with_zone,
  COUNT(CASE WHEN is_freelance = FALSE THEN 1 END) as non_freelance_with_zone
FROM employees
WHERE freelance_zone IS NOT NULL;

\echo ''
\echo 'Detail of employees with freelance_zone:'
SELECT
  id,
  name,
  nickname,
  is_freelance,
  freelance_zone,
  status
FROM employees
WHERE freelance_zone IS NOT NULL
ORDER BY is_freelance DESC, name;

\echo ''

-- =====================================================
-- CHECK 2: Active positions in independent_positions
-- =====================================================
\echo '2. Checking active freelance positions in independent_positions...'
\echo ''

SELECT
  COUNT(*) as total_active_positions,
  COUNT(DISTINCT employee_id) as distinct_employees
FROM independent_positions
WHERE is_active = TRUE;

\echo ''
\echo 'Detail of active independent positions:'
SELECT
  ip.id,
  e.name as employee_name,
  e.nickname,
  e.is_freelance,
  ip.zone,
  ip.grid_row,
  ip.grid_col,
  ip.created_at
FROM independent_positions ip
INNER JOIN employees e ON ip.employee_id = e.id
WHERE ip.is_active = TRUE
ORDER BY ip.zone, ip.grid_row, ip.grid_col;

\echo ''

-- =====================================================
-- CHECK 3: Freelances in non-nightclub establishments
-- =====================================================
\echo '3. Checking freelances currently in non-nightclub establishments...'
\echo ''

SELECT
  COUNT(*) as freelances_in_non_nightclubs
FROM employment_history eh
INNER JOIN employees e ON eh.employee_id = e.id
INNER JOIN establishments est ON eh.establishment_id = est.id
INNER JOIN establishment_categories ec ON est.category_id = ec.id
WHERE e.is_freelance = TRUE
  AND eh.is_current = TRUE
  AND ec.name != 'Nightclub';

\echo ''
\echo 'Detail of freelances in non-nightclub establishments (WILL FAIL migration 013):'
SELECT
  e.id as employee_id,
  e.name as employee_name,
  e.nickname,
  est.name as establishment_name,
  ec.name as category_name,
  eh.start_date
FROM employment_history eh
INNER JOIN employees e ON eh.employee_id = e.id
INNER JOIN establishments est ON eh.establishment_id = est.id
INNER JOIN establishment_categories ec ON est.category_id = ec.id
WHERE e.is_freelance = TRUE
  AND eh.is_current = TRUE
  AND ec.name != 'Nightclub'
ORDER BY e.name;

\echo ''

-- =====================================================
-- CHECK 4: Freelances with multiple current establishments
-- =====================================================
\echo '4. Checking freelances with multiple current establishments (good for new system)...'
\echo ''

SELECT
  e.id as employee_id,
  e.name as employee_name,
  e.nickname,
  COUNT(*) as num_current_establishments,
  STRING_AGG(est.name || ' (' || ec.name || ')', ', ' ORDER BY est.name) as establishments
FROM employment_history eh
INNER JOIN employees e ON eh.employee_id = e.id
INNER JOIN establishments est ON eh.establishment_id = est.id
INNER JOIN establishment_categories ec ON est.category_id = ec.id
WHERE e.is_freelance = TRUE
  AND eh.is_current = TRUE
GROUP BY e.id, e.name, e.nickname
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, e.name;

\echo ''

-- =====================================================
-- CHECK 5: Free freelances (no current establishment)
-- =====================================================
\echo '5. Checking free freelances (no current establishment association)...'
\echo ''

SELECT
  COUNT(*) as free_freelances
FROM employees e
WHERE e.is_freelance = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM employment_history eh
    WHERE eh.employee_id = e.id AND eh.is_current = TRUE
  );

\echo ''
\echo 'Detail of free freelances:'
SELECT
  e.id,
  e.name,
  e.nickname,
  e.freelance_zone as current_zone,
  e.status
FROM employees e
WHERE e.is_freelance = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM employment_history eh
    WHERE eh.employee_id = e.id AND eh.is_current = TRUE
  )
ORDER BY e.name;

\echo ''

-- =====================================================
-- SUMMARY & RECOMMENDATIONS
-- =====================================================
\echo '====================================================='
\echo 'SUMMARY & NEXT STEPS'
\echo '====================================================='
\echo ''
\echo 'Before running migration 013, you should:'
\echo ''
\echo '1. If CHECK 3 shows freelances in non-nightclub establishments:'
\echo '   - Manually update these records to nightclubs OR'
\echo '   - Set is_freelance=FALSE for these employees'
\echo ''
\echo '2. If CHECK 1 shows employees with freelance_zone:'
\echo '   - Data will be auto-archived in _archive_freelance_zones table'
\echo '   - Review after migration if needed'
\echo ''
\echo '3. If CHECK 2 shows active independent_positions:'
\echo '   - These positions will be deprecated (table commented)'
\echo '   - Consider deactivating them: UPDATE independent_positions SET is_active=FALSE WHERE is_active=TRUE;'
\echo ''
\echo '4. After verification, run migration 013:'
\echo '   - psql -d your_database -f 013_refactor_freelance_nightclub_system.sql'
\echo ''
\echo '====================================================='
