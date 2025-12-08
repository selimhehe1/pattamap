-- Migration: Fix Employee Verifications - Remove UNIQUE Constraint
-- Description: Allow multiple verification attempts per employee (max 3 per 24h)
-- Date: 2025-01-17
-- Version: v10.2.1
-- Issue: UNIQUE constraint on employee_id prevented multiple verification attempts,
--        conflicting with rate limiting logic (max 3 attempts/24h)

-- ============================================
-- Remove UNIQUE constraint on employee_id
-- ============================================

-- The constraint name is auto-generated as "employee_verifications_employee_id_key"
ALTER TABLE employee_verifications
  DROP CONSTRAINT IF EXISTS employee_verifications_employee_id_key;

-- ============================================
-- Verification
-- ============================================

-- The non-unique index idx_employee_verifications_employee_id already exists
-- and will continue to provide query performance for lookups by employee_id

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE employee_verifications IS 'Stores employee profile verification attempts and results using Azure Face API. Allows up to 3 attempts per 24h per employee (rate limited in code).';

-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 012 completed: UNIQUE constraint removed from employee_verifications.employee_id';
  RAISE NOTICE '📝 Users can now retry verification up to 3 times per 24 hours';
END $$;
