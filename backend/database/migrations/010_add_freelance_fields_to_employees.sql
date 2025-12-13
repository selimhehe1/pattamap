-- =====================================================
-- Migration: Add Freelance Mode Fields to Employees
-- Version: 10.x
-- Date: 2025-01-15
-- =====================================================
BEGIN;
-- Description: Add is_freelance and freelance_zone columns to employees table
-- to support simple freelance mode without requiring map position (independent_positions).
--
-- This allows employees to be marked as freelance and associated with a zone
-- without needing precise grid coordinates (grid_row, grid_col).
--
-- independent_positions table remains for employees who want/need a specific
-- position on the interactive map (managed by admin via drag & drop).
-- =====================================================

-- Add freelance mode fields to employees table
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_freelance BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS freelance_zone TEXT;

-- Add check constraint: if freelance, zone must be provided
-- if not freelance, zone must be null
ALTER TABLE employees
  ADD CONSTRAINT check_freelance_zone
  CHECK (
    (is_freelance = FALSE AND freelance_zone IS NULL) OR
    (is_freelance = TRUE AND freelance_zone IS NOT NULL)
  );

-- Create index for efficient freelance queries
-- Partial index: only indexes rows where is_freelance = TRUE
CREATE INDEX IF NOT EXISTS idx_employees_freelance
  ON employees(is_freelance, freelance_zone)
  WHERE is_freelance = TRUE;

-- Add comment to columns for documentation
COMMENT ON COLUMN employees.is_freelance IS 'True if employee works as freelance (no fixed establishment). Mutually exclusive with employment_history.is_current=true.';
COMMENT ON COLUMN employees.freelance_zone IS 'Zone where freelance employee works (beachroad, walkingstreet, etc.). Required if is_freelance=true, null otherwise.';

-- =====================================================
-- Usage Notes:
-- =====================================================
-- 1. Employee can be:
--    - Regular: is_freelance=false, has employment_history with is_current=true
--    - Simple Freelance: is_freelance=true, freelance_zone set, no specific map position
--    - Mapped Freelance: is_freelance=true + independent_positions with grid coordinates
--
-- 2. When employee switches to freelance mode:
--    - Set is_freelance = true
--    - Set freelance_zone = 'zonename'
--    - Update employment_history: is_current = false (deactivate all)
--
-- 3. When employee switches back to establishment:
--    - Set is_freelance = false
--    - Set freelance_zone = null
--    - Create new employment_history with is_current = true
--
-- 4. Query patterns:
--    - Include freelances in search: WHERE is_freelance = true OR employment_history.is_current = true
--    - Filter by zone: WHERE freelance_zone = 'beachroad' OR establishment.zone = 'beachroad'
-- =====================================================

COMMIT;
