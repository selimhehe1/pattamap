-- Migration: Add User ↔ Employee linking system
-- Description: Allow users to be linked to employee profiles (self-managed profiles)
-- Version: v10.0.0
-- Date: 2025-01-11
BEGIN;

-- ============================================
-- STEP 1: Add account_type to users table
-- ============================================

-- Add account_type column to differentiate user types
ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'regular'
CHECK (account_type IN ('regular', 'employee', 'establishment_owner'));

-- Add linked_employee_id for quick access to employee profile
ALTER TABLE users
ADD COLUMN IF NOT EXISTS linked_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.account_type IS 'Type of user account: regular (default), employee (self-managed profile), establishment_owner (future use)';
COMMENT ON COLUMN users.linked_employee_id IS 'Direct link to employee profile if user is an employee (bidirectional with employees.user_id)';

-- ============================================
-- STEP 2: Add user_id to employees table
-- ============================================

-- Add user_id to link employee profile to user account
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add flag to indicate if profile is self-managed
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS is_self_profile BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN employees.user_id IS 'User account linked to this employee profile (bidirectional with users.linked_employee_id)';
COMMENT ON COLUMN employees.is_self_profile IS 'TRUE if employee profile was created by the employee themselves (vs created by other users)';

-- ============================================
-- STEP 3: Add constraints for data integrity
-- ============================================

-- Ensure one-to-one relationship: one user can only be linked to one employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_linked_employee_unique
ON users(linked_employee_id)
WHERE linked_employee_id IS NOT NULL;

-- Ensure one-to-one relationship: one employee can only be linked to one user
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_user_id_unique
ON employees(user_id)
WHERE user_id IS NOT NULL;

-- ============================================
-- STEP 4: Add performance indexes
-- ============================================

-- Index for filtering users by account type
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

-- Index for quick lookup of user's linked employee
CREATE INDEX IF NOT EXISTS idx_users_linked_employee ON users(linked_employee_id)
WHERE linked_employee_id IS NOT NULL;

-- Index for quick lookup of employee's linked user
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id)
WHERE user_id IS NOT NULL;

-- Index for filtering self-managed profiles
CREATE INDEX IF NOT EXISTS idx_employees_is_self_profile ON employees(is_self_profile)
WHERE is_self_profile = TRUE;

-- Composite index for common queries (employee accounts with linked profiles)
CREATE INDEX IF NOT EXISTS idx_users_account_type_linked_employee
ON users(account_type, linked_employee_id);

-- ============================================
-- STEP 5: Update existing data (if needed)
-- ============================================

-- Set default account_type for existing users (all are 'regular' unless specified)
UPDATE users SET account_type = 'regular' WHERE account_type IS NULL;

-- Set is_self_profile to FALSE for existing employees (none are self-managed yet)
UPDATE employees SET is_self_profile = FALSE WHERE is_self_profile IS NULL;

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Verify structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name IN ('users', 'employees')
-- AND column_name IN ('account_type', 'linked_employee_id', 'user_id', 'is_self_profile')
-- ORDER BY table_name, ordinal_position;

-- Verify indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('users', 'employees')
-- AND indexname LIKE '%account_type%' OR indexname LIKE '%linked%' OR indexname LIKE '%user_id%'
-- ORDER BY tablename, indexname;

-- Verify constraints
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name IN ('users', 'employees')
-- AND constraint_name LIKE '%account%' OR constraint_name LIKE '%linked%' OR constraint_name LIKE '%user_id%'
-- ORDER BY table_name, constraint_name;

COMMIT;
