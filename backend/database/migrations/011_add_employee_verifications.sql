-- Migration: Add Employee Verification System
-- Description: Create employee_verifications table and add verification fields to employees
-- Date: 2025-01-15
-- Version: v10.2

-- ============================================
-- 1. Create employee_verifications table
-- ============================================

CREATE TABLE IF NOT EXISTS employee_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,

  -- Verification Photo
  selfie_url TEXT NOT NULL,

  -- AI Face Matching Result
  face_match_score DECIMAL(5,2),  -- Best match score (0.00 - 100.00)

  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'manual_review', 'revoked')),
  auto_approved BOOLEAN DEFAULT false,

  -- Admin Review (for manual_review and revoked statuses)
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,

  -- Metadata
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_face_match_score CHECK (face_match_score IS NULL OR (face_match_score >= 0 AND face_match_score <= 100))
);

-- ============================================
-- 2. Add indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employee_verifications_status
  ON employee_verifications(status);

CREATE INDEX IF NOT EXISTS idx_employee_verifications_employee_id
  ON employee_verifications(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_verifications_submitted_at
  ON employee_verifications(submitted_at DESC);

-- ============================================
-- 3. Add verification fields to employees table
-- ============================================

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- 4. Create index on employees.is_verified
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employees_verified
  ON employees(is_verified)
  WHERE is_verified = true;

-- ============================================
-- 5. Add comments for documentation
-- ============================================

COMMENT ON TABLE employee_verifications IS 'Stores employee profile verification attempts and results using Azure Face API';
COMMENT ON COLUMN employee_verifications.selfie_url IS 'Cloudinary URL of verification selfie with mini heart pose';
COMMENT ON COLUMN employee_verifications.face_match_score IS 'Best face matching score (0-100) from Azure Face API comparing selfie vs all profile photos';
COMMENT ON COLUMN employee_verifications.status IS 'Verification status: pending (processing), approved (>=75%), rejected (<65%), manual_review (65-75%), revoked (admin removed)';
COMMENT ON COLUMN employee_verifications.auto_approved IS 'True if approved automatically by AI (score >=75%), false if manual admin approval';
COMMENT ON COLUMN employee_verifications.admin_notes IS 'Admin notes for manual reviews or revocations (e.g., "Fake identity", "Photo mismatch")';

COMMENT ON COLUMN employees.is_verified IS 'True if employee has successfully verified their profile';
COMMENT ON COLUMN employees.verified_at IS 'Timestamp when profile was verified (either auto-approved or manually approved by admin)';
