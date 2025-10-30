-- Migration: Add Employee Community Validation System
-- Description: Allow community to vote on employee profile existence + owner/admin control visibility
-- Date: 2025-01-19
-- Version: v10.3

-- ============================================
-- PART 1: COMMUNITY VOTES TABLE
-- ============================================

-- Table for community votes on employee existence
CREATE TABLE IF NOT EXISTS employee_existence_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Vote type: exists (this person is real) or not_exists (fake profile)
  vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('exists', 'not_exists')),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate votes: one user can vote only once per employee
  CONSTRAINT unique_employee_existence_vote UNIQUE (employee_id, user_id)
);

-- ============================================
-- PART 2: INDEXES FOR PERFORMANCE
-- ============================================

-- Index for quick lookup of all votes for an employee
CREATE INDEX IF NOT EXISTS idx_employee_existence_votes_employee_id
  ON employee_existence_votes(employee_id);

-- Index for quick lookup of all votes by a user
CREATE INDEX IF NOT EXISTS idx_employee_existence_votes_user_id
  ON employee_existence_votes(user_id);

-- Index for filtering by vote type
CREATE INDEX IF NOT EXISTS idx_employee_existence_votes_type
  ON employee_existence_votes(vote_type);

-- Composite index for common query (employee + type aggregation)
CREATE INDEX IF NOT EXISTS idx_employee_existence_votes_employee_type
  ON employee_existence_votes(employee_id, vote_type);

-- ============================================
-- PART 3: VISIBILITY CONTROL COLUMNS
-- ============================================

-- Add columns to employees table for owner/admin visibility control
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hide_reason TEXT;

-- ============================================
-- PART 4: INDEXES FOR VISIBILITY
-- ============================================

-- Index for filtering hidden profiles (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_employees_is_hidden
  ON employees(is_hidden)
  WHERE is_hidden = true;

-- Index for lookup who hid a profile
CREATE INDEX IF NOT EXISTS idx_employees_hidden_by
  ON employees(hidden_by)
  WHERE hidden_by IS NOT NULL;

-- ============================================
-- PART 5: COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE employee_existence_votes IS 'Community votes on employee profile existence. Users vote "exists" or "not_exists" to validate profile authenticity. Used for trust validation badges.';

COMMENT ON COLUMN employee_existence_votes.vote_type IS 'Vote type: "exists" (profile is real person) or "not_exists" (suspected fake profile)';

COMMENT ON COLUMN employees.is_hidden IS 'TRUE if profile is hidden by owner/admin (manual decision based on community votes or other reasons). Not automatic.';
COMMENT ON COLUMN employees.hidden_by IS 'User ID (establishment owner or admin/moderator) who hid the profile';
COMMENT ON COLUMN employees.hidden_at IS 'Timestamp when profile was hidden';
COMMENT ON COLUMN employees.hide_reason IS 'Reason for hiding profile (e.g., "Community validation <50%", "Owner decision", "Suspected fake")';

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Verify employee_existence_votes table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'employee_existence_votes'
-- ORDER BY ordinal_position;

-- Verify new employees columns
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'employees'
-- AND column_name IN ('is_hidden', 'hidden_by', 'hidden_at', 'hide_reason')
-- ORDER BY ordinal_position;

-- Verify indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('employee_existence_votes', 'employees')
-- AND indexname LIKE '%existence%' OR indexname LIKE '%hidden%'
-- ORDER BY tablename, indexname;

-- ============================================
-- SEED DATA (for testing - optional)
-- ============================================

-- Example: Add some test votes
-- INSERT INTO employee_existence_votes (employee_id, user_id, vote_type) VALUES
-- ('<employee-id-1>', '<user-id-1>', 'exists'),
-- ('<employee-id-1>', '<user-id-2>', 'exists'),
-- ('<employee-id-1>', '<user-id-3>', 'not_exists');

-- Example: Test visibility control
-- UPDATE employees SET is_hidden = false WHERE id = '<employee-id>';
