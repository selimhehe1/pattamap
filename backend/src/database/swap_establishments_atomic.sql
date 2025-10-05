-- Migration: Atomic Swap Function for Establishments
-- Version: 1.0.0
-- Date: 2025-09-30
-- Description: Creates a stored procedure for atomic position swapping between two establishments

-- Drop existing function if exists
DROP FUNCTION IF EXISTS swap_establishments_atomic(UUID, UUID, INT, INT, INT, INT, VARCHAR);

-- Create atomic swap function
CREATE OR REPLACE FUNCTION swap_establishments_atomic(
  p_source_id UUID,
  p_target_id UUID,
  p_source_new_row INT,
  p_source_new_col INT,
  p_target_new_row INT,
  p_target_new_col INT,
  p_zone VARCHAR
) RETURNS TABLE (
  source_establishment JSONB,
  target_establishment JSONB
) AS $$
DECLARE
  v_source_data JSONB;
  v_target_data JSONB;
  v_timestamp TIMESTAMP;
BEGIN
  v_timestamp := NOW();

  -- Validate input parameters
  IF p_source_id IS NULL OR p_target_id IS NULL THEN
    RAISE EXCEPTION 'Source and target IDs cannot be NULL';
  END IF;

  IF p_source_id = p_target_id THEN
    RAISE EXCEPTION 'Source and target IDs must be different';
  END IF;

  -- STEP 1: Move source to temporary position (99, 1) to free up its slot
  -- Using row 99 (out of bounds for ALL zones) to avoid conflicts
  UPDATE establishments
  SET
    grid_row = 99,
    grid_col = 1,
    zone = p_zone,
    updated_at = v_timestamp
  WHERE id = p_source_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source establishment not found: %', p_source_id;
  END IF;

  -- STEP 2: Move target to its new position (source's original position)
  UPDATE establishments
  SET
    grid_row = p_target_new_row,
    grid_col = p_target_new_col,
    zone = p_zone,
    updated_at = v_timestamp
  WHERE id = p_target_id;

  IF NOT FOUND THEN
    -- Rollback source if target fails
    UPDATE establishments
    SET
      grid_row = p_source_new_row,
      grid_col = p_source_new_col,
      zone = p_zone,
      updated_at = v_timestamp
    WHERE id = p_source_id;

    RAISE EXCEPTION 'Target establishment not found: %', p_target_id;
  END IF;

  -- STEP 3: Move source to its new position (target's original position)
  UPDATE establishments
  SET
    grid_row = p_source_new_row,
    grid_col = p_source_new_col,
    zone = p_zone,
    updated_at = v_timestamp
  WHERE id = p_source_id
  RETURNING to_jsonb(establishments.*) INTO v_source_data;

  -- Get target data for response
  SELECT to_jsonb(establishments.*) INTO v_target_data
  FROM establishments
  WHERE id = p_target_id;

  -- Return both establishments data
  RETURN QUERY SELECT v_source_data, v_target_data;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and re-raise
    RAISE NOTICE 'Swap failed: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION swap_establishments_atomic(UUID, UUID, INT, INT, INT, INT, VARCHAR) IS
'Atomically swaps positions between two establishments using a 3-step process with temporary position. Includes rollback on failure.';

-- Test the function (optional - comment out if not needed)
-- SELECT * FROM swap_establishments_atomic(
--   'source-uuid'::UUID,
--   'target-uuid'::UUID,
--   2, 5,  -- source new position (row, col)
--   1, 3,  -- target new position (row, col)
--   'soi6'
-- );