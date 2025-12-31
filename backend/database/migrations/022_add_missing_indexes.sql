-- =====================================================
-- Migration: Add Missing Performance Indexes
-- Date: 2025-12-31
-- Description: Adds indexes identified during code audit
--              for better query performance
-- =====================================================
BEGIN;

-- =====================================================
-- 1. EMPLOYEES TABLE INDEXES
-- =====================================================

-- Index for filtering verified employees
-- Used in: getEmployees() with verified filter
CREATE INDEX IF NOT EXISTS idx_employees_is_verified
ON public.employees(is_verified)
WHERE is_verified = TRUE;

-- Composite index for common filter combinations
-- Used in: searchEmployees() with status + verified filters
CREATE INDEX IF NOT EXISTS idx_employees_status_verified
ON public.employees(status, is_verified);

-- Index for hidden status filtering
-- Used in: getEmployees() to exclude hidden profiles
CREATE INDEX IF NOT EXISTS idx_employees_is_hidden
ON public.employees(is_hidden)
WHERE is_hidden = TRUE;

-- Composite index for self-profile lookups
-- Used in: queries filtering by self-managed profiles
CREATE INDEX IF NOT EXISTS idx_employees_is_self_profile
ON public.employees(is_self_profile)
WHERE is_self_profile = TRUE;

-- =====================================================
-- 2. COMMENTS TABLE INDEXES
-- =====================================================

-- Index for rating aggregation queries
-- Used in: getEmployees() to calculate average_rating
CREATE INDEX IF NOT EXISTS idx_comments_employee_rating
ON public.comments(employee_id, rating)
WHERE rating IS NOT NULL AND status = 'approved';

-- Composite index for employee comments lookup
-- Used in: getEmployeeReviews()
CREATE INDEX IF NOT EXISTS idx_comments_employee_status
ON public.comments(employee_id, status, created_at DESC);

-- =====================================================
-- 3. EMPLOYMENT_HISTORY INDEXES
-- =====================================================

-- Index for current employment lookups
-- Used in: finding current positions
CREATE INDEX IF NOT EXISTS idx_employment_history_current
ON public.employment_history(employee_id, is_current)
WHERE is_current = TRUE;

-- =====================================================
-- 4. MODERATION_QUEUE INDEXES
-- =====================================================

-- Index for pending claims lookup
-- Used in: getClaimRequests()
CREATE INDEX IF NOT EXISTS idx_moderation_queue_pending_claims
ON public.moderation_queue(status, item_type)
WHERE status = 'pending' AND item_type = 'employee_claim';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
COMMENT ON INDEX idx_employees_is_verified IS 'Optimizes queries filtering for verified employees';
COMMENT ON INDEX idx_employees_status_verified IS 'Optimizes combined status+verified filtering';
COMMENT ON INDEX idx_comments_employee_rating IS 'Optimizes rating aggregation for employees';

COMMIT;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
/*
BEGIN;
DROP INDEX IF EXISTS idx_employees_is_verified;
DROP INDEX IF EXISTS idx_employees_status_verified;
DROP INDEX IF EXISTS idx_employees_is_hidden;
DROP INDEX IF EXISTS idx_employees_is_self_profile;
DROP INDEX IF EXISTS idx_comments_employee_rating;
DROP INDEX IF EXISTS idx_comments_employee_status;
DROP INDEX IF EXISTS idx_employment_history_current;
DROP INDEX IF EXISTS idx_moderation_queue_pending_claims;
COMMIT;
*/
