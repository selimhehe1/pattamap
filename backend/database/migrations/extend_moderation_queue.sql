-- Migration: Extend moderation_queue for employee claim requests
-- Description: Add support for employee profile claim requests with metadata and verification proofs
-- Version: v10.0.0
-- Date: 2025-01-11
BEGIN;

-- ============================================
-- STEP 1: Extend item_type enum to include 'employee_claim'
-- ============================================

-- Drop existing check constraint
ALTER TABLE moderation_queue
DROP CONSTRAINT IF EXISTS moderation_queue_item_type_check;

-- Add new check constraint with 'employee_claim' type
ALTER TABLE moderation_queue
ADD CONSTRAINT moderation_queue_item_type_check
CHECK (item_type IN ('employee', 'establishment', 'comment', 'employee_claim'));

COMMENT ON COLUMN moderation_queue.item_type IS 'Type of moderation item: employee (new profile), establishment, comment, employee_claim (user claiming existing profile)';

-- ============================================
-- STEP 2: Add request_metadata JSONB column
-- ============================================

-- Add metadata column for flexible claim request data
ALTER TABLE moderation_queue
ADD COLUMN IF NOT EXISTS request_metadata JSONB;

COMMENT ON COLUMN moderation_queue.request_metadata IS 'JSON metadata for claim requests: {message: string, employee_id: uuid, user_id: uuid, claimed_at: timestamp}';

-- ============================================
-- STEP 3: Add verification_proof array column
-- ============================================

-- Add verification_proof column for identity proof URLs
ALTER TABLE moderation_queue
ADD COLUMN IF NOT EXISTS verification_proof TEXT[];

COMMENT ON COLUMN moderation_queue.verification_proof IS 'Array of URLs to verification documents/images uploaded by user (e.g., ID photos, social media links)';

-- ============================================
-- STEP 4: Add performance indexes
-- ============================================

-- Index for filtering claim requests specifically
CREATE INDEX IF NOT EXISTS idx_moderation_queue_item_type_claim
ON moderation_queue(item_type, status)
WHERE item_type = 'employee_claim';

-- Index for quick access to metadata (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_moderation_queue_metadata
ON moderation_queue USING GIN (request_metadata);

-- Composite index for claim request queries
CREATE INDEX IF NOT EXISTS idx_moderation_queue_claim_status_date
ON moderation_queue(item_type, status, created_at DESC)
WHERE item_type = 'employee_claim';

-- ============================================
-- STEP 5: Add helper function for claim request creation
-- ============================================

-- Function to create a claim request with proper metadata
CREATE OR REPLACE FUNCTION create_employee_claim_request(
  p_user_id UUID,
  p_employee_id UUID,
  p_message TEXT,
  p_verification_proof TEXT[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_claim_id UUID;
BEGIN
  -- Validate: employee exists and is not already linked
  IF NOT EXISTS (
    SELECT 1 FROM employees
    WHERE id = p_employee_id
    AND user_id IS NULL  -- Not already linked
  ) THEN
    RAISE EXCEPTION 'Employee not found or already linked to a user';
  END IF;

  -- Validate: user doesn't already have a linked employee
  IF EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id
    AND linked_employee_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'User already has a linked employee profile';
  END IF;

  -- Validate: no pending claim request exists for this user/employee pair
  IF EXISTS (
    SELECT 1 FROM moderation_queue
    WHERE item_type = 'employee_claim'
    AND status = 'pending'
    AND submitted_by = p_user_id
    AND request_metadata->>'employee_id' = p_employee_id::TEXT
  ) THEN
    RAISE EXCEPTION 'Claim request already pending for this employee';
  END IF;

  -- Create claim request
  INSERT INTO moderation_queue (
    item_type,
    item_id,
    submitted_by,
    status,
    request_metadata,
    verification_proof,
    created_at
  ) VALUES (
    'employee_claim',
    p_employee_id,  -- Reference to employee being claimed
    p_user_id,
    'pending',
    jsonb_build_object(
      'message', p_message,
      'employee_id', p_employee_id,
      'user_id', p_user_id,
      'claimed_at', NOW()
    ),
    p_verification_proof,
    NOW()
  )
  RETURNING id INTO v_claim_id;

  RETURN v_claim_id;
END;
$$;

COMMENT ON FUNCTION create_employee_claim_request IS 'Helper function to create an employee claim request with validation checks';

-- ============================================
-- STEP 6: Add helper function for claim approval
-- ============================================

-- Function to approve a claim request and create the user-employee link
CREATE OR REPLACE FUNCTION approve_employee_claim_request(
  p_claim_id UUID,
  p_moderator_id UUID,
  p_moderator_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_employee_id UUID;
  v_item_type VARCHAR(20);
BEGIN
  -- Get claim request details
  SELECT
    submitted_by,
    item_id,
    item_type
  INTO
    v_user_id,
    v_employee_id,
    v_item_type
  FROM moderation_queue
  WHERE id = p_claim_id
  AND status = 'pending';

  -- Validate claim exists and is pending
  IF NOT FOUND OR v_item_type != 'employee_claim' THEN
    RAISE EXCEPTION 'Claim request not found or not pending';
  END IF;

  -- Double-check employee is not already linked
  IF EXISTS (
    SELECT 1 FROM employees
    WHERE id = v_employee_id
    AND user_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Employee already linked to another user';
  END IF;

  -- Create bidirectional link
  -- Update user record
  UPDATE users
  SET
    linked_employee_id = v_employee_id,
    account_type = 'employee',  -- Ensure account_type is set
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Update employee record
  UPDATE employees
  SET
    user_id = v_user_id,
    is_self_profile = TRUE,  -- Mark as self-managed
    updated_at = NOW()
  WHERE id = v_employee_id;

  -- Update moderation queue
  UPDATE moderation_queue
  SET
    status = 'approved',
    moderator_id = p_moderator_id,
    moderator_notes = p_moderator_notes,
    reviewed_at = NOW()
  WHERE id = p_claim_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION approve_employee_claim_request IS 'Approve claim request and create bidirectional user-employee link';

-- ============================================
-- STEP 7: Add helper function for claim rejection
-- ============================================

-- Function to reject a claim request
CREATE OR REPLACE FUNCTION reject_employee_claim_request(
  p_claim_id UUID,
  p_moderator_id UUID,
  p_moderator_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update moderation queue
  UPDATE moderation_queue
  SET
    status = 'rejected',
    moderator_id = p_moderator_id,
    moderator_notes = p_moderator_notes,
    reviewed_at = NOW()
  WHERE id = p_claim_id
  AND status = 'pending'
  AND item_type = 'employee_claim';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim request not found or not pending';
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION reject_employee_claim_request IS 'Reject claim request without creating any links';

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Verify new columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'moderation_queue'
-- AND column_name IN ('request_metadata', 'verification_proof')
-- ORDER BY ordinal_position;

-- Verify constraint update
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'moderation_queue_item_type_check';

-- Verify indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'moderation_queue'
-- AND (indexname LIKE '%claim%' OR indexname LIKE '%metadata%')
-- ORDER BY indexname;

-- Verify functions exist
-- SELECT proname, prosrc
-- FROM pg_proc
-- WHERE proname LIKE '%claim_request%'
-- ORDER BY proname;

COMMIT;
