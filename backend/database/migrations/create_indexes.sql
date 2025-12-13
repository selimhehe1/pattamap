-- ========================================
-- PATTAMAP - Additional Performance Indexes
-- ========================================
-- Note: Many indexes already exist in schema.sql
-- This script adds only the missing ones
BEGIN;

-- 1. ESTABLISHMENTS - Additional indexes
CREATE INDEX IF NOT EXISTS idx_establishments_status_zone ON establishments(status, zone);
CREATE INDEX IF NOT EXISTS idx_establishments_name_gin ON establishments USING gin(to_tsvector('english', name));

-- 2. EMPLOYEES - Additional indexes
CREATE INDEX IF NOT EXISTS idx_employees_nationality ON employees(nationality);
CREATE INDEX IF NOT EXISTS idx_employees_age ON employees(age);
CREATE INDEX IF NOT EXISTS idx_employees_name_gin ON employees USING gin(to_tsvector('english', name || ' ' || COALESCE(nickname, '')));
CREATE INDEX IF NOT EXISTS idx_employees_status_nationality ON employees(status, nationality);

-- 3. EMPLOYMENT_HISTORY - Additional indexes
CREATE INDEX IF NOT EXISTS idx_employment_history_employee ON employment_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_employment_history_current ON employment_history(is_current) WHERE is_current = true;

-- 4. COMMENTS - Additional indexes
CREATE INDEX IF NOT EXISTS idx_comments_employee_status ON comments(employee_id, status) WHERE status = 'approved';

-- 5. REPORTS - Additional indexes
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Verify indexes created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

COMMIT;
