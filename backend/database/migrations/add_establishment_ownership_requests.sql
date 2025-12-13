-- ========================================
-- MIGRATION: Add Establishment Ownership Requests System
-- Version: v10.2
-- Date: 2025-01-XX
-- Description: Create establishment_ownership_requests table for owner verification workflow
-- ========================================
BEGIN;

-- Purpose: Allow establishment owners to request ownership of establishments with document verification
-- This creates a structured approval workflow for admins to review ownership claims

-- Create establishment_ownership_requests table
CREATE TABLE IF NOT EXISTS establishment_ownership_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,

  -- Status workflow (pending → approved/rejected)
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

  -- Documents uploaded for verification (Cloudinary URLs)
  documents_urls JSONB DEFAULT '[]'::jsonb,

  -- Optional verification code (admin can provide secret code to real owner)
  verification_code VARCHAR(50),

  -- Owner's justification message
  request_message TEXT,

  -- Admin review
  admin_notes TEXT,
  reviewed_by UUID REFERENCES users(id), -- Admin who reviewed the request
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate pending requests
  CONSTRAINT unique_pending_request UNIQUE (user_id, establishment_id, status)
);

-- Indexes for performance
CREATE INDEX idx_ownership_requests_user_id ON establishment_ownership_requests(user_id);
CREATE INDEX idx_ownership_requests_establishment_id ON establishment_ownership_requests(establishment_id);
CREATE INDEX idx_ownership_requests_status ON establishment_ownership_requests(status);
CREATE INDEX idx_ownership_requests_reviewed_by ON establishment_ownership_requests(reviewed_by);
CREATE INDEX idx_ownership_requests_created_at ON establishment_ownership_requests(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE establishment_ownership_requests IS 'Ownership requests submitted by users with account_type=establishment_owner. Admins review and approve/reject.';
COMMENT ON COLUMN establishment_ownership_requests.status IS 'Workflow status: pending (awaiting review), approved (ownership granted), rejected (claim denied).';
COMMENT ON COLUMN establishment_ownership_requests.documents_urls IS 'Array of Cloudinary URLs for uploaded verification documents (business license, rental contract, etc.).';
COMMENT ON COLUMN establishment_ownership_requests.verification_code IS 'Optional code provided by admin to real owner as additional verification layer.';
COMMENT ON COLUMN establishment_ownership_requests.admin_notes IS 'Notes from admin explaining approval/rejection decision. Visible to requester.';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ownership_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ownership_request_updated_at
  BEFORE UPDATE ON establishment_ownership_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_ownership_request_updated_at();

-- ========================================
-- MIGRATION ROLLBACK (if needed)
-- ========================================
-- To rollback this migration, run:
-- DROP TRIGGER IF EXISTS trigger_update_ownership_request_updated_at ON establishment_ownership_requests;
-- DROP FUNCTION IF EXISTS update_ownership_request_updated_at();
-- DROP TABLE IF EXISTS establishment_ownership_requests CASCADE;

COMMIT;
