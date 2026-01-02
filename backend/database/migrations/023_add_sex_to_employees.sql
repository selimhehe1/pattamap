-- =====================================================
-- Migration: Add Sex/Gender Field to Employees
-- Version: 10.x
-- Date: 2025-01-02
-- =====================================================
BEGIN;

-- Description: Add sex column to employees table to identify gender.
-- Values: 'male', 'female', 'ladyboy' (common in Thailand nightlife context)
-- This field is REQUIRED for new employees.
-- =====================================================

-- Add sex column with default 'female' for existing data
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS sex TEXT DEFAULT 'female';

-- Add check constraint for valid sex values
ALTER TABLE employees
  ADD CONSTRAINT check_sex_values
  CHECK (sex IN ('male', 'female', 'ladyboy'));

-- Make column NOT NULL after setting default
ALTER TABLE employees
  ALTER COLUMN sex SET NOT NULL;

-- Remove default (required field for new entries)
ALTER TABLE employees
  ALTER COLUMN sex DROP DEFAULT;

-- Create index for efficient sex-based queries and filtering
CREATE INDEX IF NOT EXISTS idx_employees_sex
  ON employees(sex);

-- Add comment to column for documentation
COMMENT ON COLUMN employees.sex IS 'Gender of the employee: male, female, or ladyboy. Required field.';

COMMIT;
