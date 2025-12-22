-- ============================================
-- FIX C1: Race Condition in Claim Approval
-- ============================================
-- Problem: Between checking if employee is linked (line 173-180)
-- and updating the link (line 184-197), another admin could
-- approve a different claim for the same employee.
--
-- Solution: Use SELECT ... FOR UPDATE to lock the employee row
-- during the entire transaction, preventing concurrent modifications.
-- ============================================

-- Drop and recreate the function with proper locking
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
  v_employee_user_id UUID;
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

  -- 🔧 FIX C1: Lock the employee row with FOR UPDATE to prevent race conditions
  -- This blocks other transactions from modifying this employee until we commit
  SELECT user_id INTO v_employee_user_id
  FROM employees
  WHERE id = v_employee_id
  FOR UPDATE;

  -- Check if employee is already linked (now with lock held)
  IF v_employee_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Employee already linked to another user';
  END IF;

  -- Also lock the user row to prevent concurrent modifications
  PERFORM 1 FROM users WHERE id = v_user_id FOR UPDATE;

  -- Create bidirectional link
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

COMMENT ON FUNCTION approve_employee_claim_request IS 'Approve claim request with row-level locking to prevent race conditions (FIX C1)';
