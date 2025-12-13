-- Migration: Fix approve_employee_claim_request for self-profiles
-- Description: Update approve function to handle self-profiles that are already linked
-- Version: v10.0.1
-- Date: 2025-01-11
BEGIN;

-- ============================================
-- Update approve function to handle self-profiles
-- ============================================

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
  v_claim_type TEXT;
  v_is_already_linked BOOLEAN;
BEGIN
  -- Get claim request details
  SELECT
    submitted_by,
    item_id,
    item_type,
    request_metadata->>'claim_type'
  INTO
    v_user_id,
    v_employee_id,
    v_item_type,
    v_claim_type
  FROM moderation_queue
  WHERE id = p_claim_id
  AND status = 'pending';

  -- Validate claim exists and is pending
  IF NOT FOUND OR v_item_type != 'employee_claim' THEN
    RAISE EXCEPTION 'Claim request not found or not pending';
  END IF;

  -- Check if employee is already linked
  SELECT EXISTS (
    SELECT 1 FROM employees
    WHERE id = v_employee_id
    AND user_id IS NOT NULL
  ) INTO v_is_already_linked;

  -- For "claim_existing" type, employee should NOT be linked yet
  -- For "self_profile" type, employee IS already linked
  IF v_claim_type = 'claim_existing' AND v_is_already_linked THEN
    RAISE EXCEPTION 'Employee already linked to another user';
  END IF;

  -- For self-profiles that are already linked, just approve status
  IF v_claim_type = 'self_profile' AND v_is_already_linked THEN
    -- Update employee status to approved
    UPDATE employees
    SET
      status = 'approved',
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
  END IF;

  -- For claim requests (not self-profiles), create bidirectional link
  IF NOT v_is_already_linked THEN
    -- Update user record
    UPDATE users
    SET
      linked_employee_id = v_employee_id,
      account_type = 'employee',
      updated_at = NOW()
    WHERE id = v_user_id;

    -- Update employee record
    UPDATE employees
    SET
      user_id = v_user_id,
      is_self_profile = TRUE,
      status = 'approved',  -- Approve the profile
      updated_at = NOW()
    WHERE id = v_employee_id;
  ELSE
    -- Employee already linked but claim_type not recognized
    -- Just update status to approved
    UPDATE employees
    SET
      status = 'approved',
      updated_at = NOW()
    WHERE id = v_employee_id;
  END IF;

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

COMMENT ON FUNCTION approve_employee_claim_request IS 'Approve claim request - handles both self-profiles (already linked) and claim requests (create link)';

COMMIT;
