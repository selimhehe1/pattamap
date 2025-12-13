-- =====================================================
-- Migration: Refactor Freelance to Nightclub-Only System
-- Version: 10.3
-- Date: 2025-01-19
-- =====================================================
BEGIN;
-- Description: Refactor freelance logic to remove map positioning (independent_positions)
-- and restrict freelances to nightclub-only associations with multi-nightclub support.
--
-- BEFORE:
-- - Freelances had freelance_zone field
-- - Freelances could have independent map positions via independent_positions table
-- - Freelances were mutually exclusive with employment_history
--
-- AFTER:
-- - Freelances do NOT have freelance_zone (removed)
-- - Freelances do NOT have independent map positions (deprecated)
-- - Freelances can be associated with MULTIPLE nightclubs simultaneously
-- - Freelances can ONLY be in nightclubs (not bars, gogos, massage salons)
-- - Freelances appear in:
--   • Dedicated /freelances page (all freelances, VIP first)
--   • Search with "Type: Freelance" filter
--   • Nightclub detail pages (when associated)
-- =====================================================

-- =====================================================
-- STEP 1: Remove freelance_zone constraints and index
-- =====================================================

-- Drop check constraint on freelance_zone
ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS check_freelance_zone;

-- Drop partial index on freelance fields
DROP INDEX IF EXISTS idx_employees_freelance;

-- =====================================================
-- STEP 2: Archive existing freelance_zone data
-- =====================================================

-- Create temporary archive table (for rollback if needed)
CREATE TABLE IF NOT EXISTS _archive_freelance_zones AS
SELECT id, is_freelance, freelance_zone, updated_at
FROM employees
WHERE freelance_zone IS NOT NULL;

-- Add comment to archive table
COMMENT ON TABLE _archive_freelance_zones IS 'Archive of freelance_zone values before removal in migration 013. Safe to delete after verification.';

-- =====================================================
-- STEP 3: Remove freelance_zone column
-- =====================================================

ALTER TABLE employees
  DROP COLUMN IF EXISTS freelance_zone;

-- =====================================================
-- STEP 4: Update column comments with new logic
-- =====================================================

COMMENT ON COLUMN employees.is_freelance IS 'True if employee works as freelance. Freelances can be associated with MULTIPLE nightclubs simultaneously via employment_history, or be "free" (no associations). Freelances do NOT have independent map positions.';

-- =====================================================
-- STEP 5: Deprecate independent_positions for freelances
-- =====================================================

-- Mark table as deprecated for freelance usage
COMMENT ON TABLE independent_positions IS 'DEPRECATED for freelances as of v10.3. Freelances no longer have independent map positions. This table may still be used for other purposes (future: establishment-independent workers). Freelances now appear in /freelances list and nightclub detail pages.';

-- =====================================================
-- STEP 6: Create constraint to enforce nightclub-only for freelances
-- =====================================================

-- Create function to validate freelance can only work in nightclubs
CREATE OR REPLACE FUNCTION validate_freelance_nightclub_only()
RETURNS TRIGGER AS $$
DECLARE
  employee_is_freelance BOOLEAN;
  establishment_category_name TEXT;
BEGIN
  -- Only validate if is_current = TRUE (active employment)
  IF NEW.is_current = TRUE THEN
    -- Get employee's freelance status
    SELECT is_freelance INTO employee_is_freelance
    FROM employees
    WHERE id = NEW.employee_id;

    -- If employee is freelance, check establishment category
    IF employee_is_freelance = TRUE THEN
      -- Get establishment category name
      SELECT ec.name INTO establishment_category_name
      FROM establishments e
      INNER JOIN establishment_categories ec ON e.category_id = ec.id
      WHERE e.id = NEW.establishment_id;

      -- Raise error if not a nightclub
      IF establishment_category_name IS NULL THEN
        RAISE EXCEPTION 'Freelances can only be associated with existing establishments';
      END IF;

      IF establishment_category_name != 'Nightclub' THEN
        RAISE EXCEPTION 'Freelances can only be associated with Nightclubs. This establishment is a %.', establishment_category_name;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on employment_history
DROP TRIGGER IF EXISTS trigger_validate_freelance_nightclub ON employment_history;
CREATE TRIGGER trigger_validate_freelance_nightclub
  BEFORE INSERT OR UPDATE ON employment_history
  FOR EACH ROW
  EXECUTE FUNCTION validate_freelance_nightclub_only();

-- Add comment to trigger
COMMENT ON TRIGGER trigger_validate_freelance_nightclub ON employment_history IS 'Validates that freelance employees (is_freelance=TRUE) can only be associated with establishments that have category="Nightclub". Allows multiple simultaneous nightclub associations for freelances.';

-- =====================================================
-- STEP 7: Create index for efficient freelance queries
-- =====================================================

-- Index for freelance filtering (no longer needs zone)
CREATE INDEX IF NOT EXISTS idx_employees_is_freelance
  ON employees(is_freelance)
  WHERE is_freelance = TRUE;

-- Index for freelance + nightclub queries
CREATE INDEX IF NOT EXISTS idx_employment_freelance_nightclub
  ON employment_history(employee_id, is_current)
  WHERE is_current = TRUE;

-- =====================================================
-- Usage Notes for Developers
-- =====================================================
-- 1. Freelance Employee States:
--    - Free Freelance: is_freelance=true, no employment_history with is_current=true
--    - Nightclub Freelance: is_freelance=true, employment_history.is_current=true (one or more nightclubs)
--
-- 2. Multiple Nightclubs:
--    - A freelance can have MULTIPLE employment_history entries with is_current=true
--    - Each entry must reference a Nightclub establishment
--    - Regular employees can only have ONE is_current=true
--
-- 3. Query Patterns:
--    - All freelances: WHERE is_freelance = true
--    - Free freelances: WHERE is_freelance = true AND NOT EXISTS (SELECT 1 FROM employment_history WHERE employee_id = employees.id AND is_current = true)
--    - Nightclub freelances: WHERE is_freelance = true AND EXISTS (SELECT 1 FROM employment_history WHERE employee_id = employees.id AND is_current = true)
--    - Freelances in specific nightclub: JOIN employment_history + JOIN establishments WHERE is_freelance=true AND is_current=true AND category='Nightclub'
--
-- 4. VIP Sorting:
--    - VIP freelances (is_vip=true AND vip_expires_at > NOW()) should appear first in lists
--    - ORDER BY (is_vip AND vip_expires_at > NOW()) DESC, name ASC
--
-- 5. Rollback Instructions (if needed):
--    - Restore freelance_zone: UPDATE employees SET freelance_zone = _archive_freelance_zones.freelance_zone FROM _archive_freelance_zones WHERE employees.id = _archive_freelance_zones.id;
--    - Drop trigger: DROP TRIGGER trigger_validate_freelance_nightclub ON employment_history;
--    - Drop function: DROP FUNCTION validate_freelance_nightclub_only();
-- =====================================================

COMMIT;
