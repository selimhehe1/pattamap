-- ========================================
-- PATTAMAP - Performance Indexes
-- ========================================

-- 1. ESTABLISHMENTS
CREATE INDEX IF NOT EXISTS idx_establishments_status ON establishments(status);
CREATE INDEX IF NOT EXISTS idx_establishments_zone ON establishments(zone);
CREATE INDEX IF NOT EXISTS idx_establishments_category ON establishments(category_id);
CREATE INDEX IF NOT EXISTS idx_establishments_status_zone ON establishments(status, zone);
CREATE INDEX IF NOT EXISTS idx_establishments_grid ON establishments(zone, grid_row, grid_col);
CREATE INDEX IF NOT EXISTS idx_establishments_created_at ON establishments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_establishments_name_gin ON establishments USING gin(to_tsvector('english', name));

-- 2. EMPLOYEES
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_nationality ON employees(nationality);
CREATE INDEX IF NOT EXISTS idx_employees_age ON employees(age);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON employees(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_name_gin ON employees USING gin(to_tsvector('english', name || ' ' || COALESCE(nickname, '')));
CREATE INDEX IF NOT EXISTS idx_employees_status_nationality ON employees(status, nationality);

-- 3. EMPLOYMENT_HISTORY
CREATE INDEX IF NOT EXISTS idx_employment_history_employee ON employment_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_employment_history_establishment ON employment_history(establishment_id);
CREATE INDEX IF NOT EXISTS idx_employment_history_current ON employment_history(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_employment_history_est_current ON employment_history(establishment_id, is_current) WHERE is_current = true;

-- 4. COMMENTS
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_employee ON comments(employee_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_employee_status ON comments(employee_id, status) WHERE status = 'approved';

-- 5. USERS
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- 6. REPORTS
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_comment ON reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- 7. FAVORITES
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_establishment ON favorites(establishment_id);
CREATE INDEX IF NOT EXISTS idx_favorites_employee ON favorites(employee_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_establishment ON favorites(user_id, establishment_id) WHERE establishment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_user_employee ON favorites(user_id, employee_id) WHERE employee_id IS NOT NULL;

-- Verify indexes created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
