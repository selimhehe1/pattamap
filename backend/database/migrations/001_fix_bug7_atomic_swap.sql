-- ========================================
-- BUG #7 FIX - Atomic Swap with Transaction
-- ========================================
-- Purpose: Prevent establishments from disappearing when swap fails
-- Issue: If STEP 2 or STEP 3 fails, source remains at (NULL, NULL)
-- Solution: Wrap entire swap in a PostgreSQL transaction

CREATE OR REPLACE FUNCTION swap_establishment_positions(
  p_source_id UUID,
  p_target_id UUID,
  p_new_zone TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  source_establishment JSONB,
  target_establishment JSONB,
  error_message TEXT
) AS $$
DECLARE
  v_source_row INTEGER;
  v_source_col INTEGER;
  v_source_zone TEXT;
  v_target_row INTEGER;
  v_target_col INTEGER;
  v_target_zone TEXT;
  v_now TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Initialize timestamp
  v_now := NOW();

  -- Get source establishment current position
  SELECT grid_row, grid_col, zone
  INTO v_source_row, v_source_col, v_source_zone
  FROM establishments
  WHERE id = p_source_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE,
      NULL::JSONB,
      NULL::JSONB,
      'Source establishment not found'::TEXT;
    RETURN;
  END IF;

  -- Get target establishment current position
  SELECT grid_row, grid_col, zone
  INTO v_target_row, v_target_col, v_target_zone
  FROM establishments
  WHERE id = p_target_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE,
      NULL::JSONB,
      NULL::JSONB,
      'Target establishment not found'::TEXT;
    RETURN;
  END IF;

  -- Perform atomic swap in transaction
  -- PostgreSQL automatically wraps function in transaction if called from single statement

  -- STEP 1: Move source to temporary position (NULL, NULL)
  UPDATE establishments
  SET
    grid_row = NULL,
    grid_col = NULL,
    zone = p_new_zone,
    updated_at = v_now
  WHERE id = p_source_id;

  -- STEP 2: Move target to source's original position
  UPDATE establishments
  SET
    grid_row = v_source_row,
    grid_col = v_source_col,
    zone = v_source_zone,
    updated_at = v_now
  WHERE id = p_target_id;

  -- STEP 3: Move source to target's original position
  UPDATE establishments
  SET
    grid_row = v_target_row,
    grid_col = v_target_col,
    zone = v_target_zone,
    updated_at = v_now
  WHERE id = p_source_id;

  -- Return success with both establishments' final state
  RETURN QUERY
  SELECT
    TRUE AS success,
    (SELECT row_to_json(e)::JSONB FROM establishments e WHERE e.id = p_source_id) AS source_establishment,
    (SELECT row_to_json(e)::JSONB FROM establishments e WHERE e.id = p_target_id) AS target_establishment,
    NULL::TEXT AS error_message;

  -- If any error occurs, PostgreSQL automatically rolls back entire transaction

EXCEPTION
  WHEN OTHERS THEN
    -- Catch any error and return failure
    RETURN QUERY SELECT
      FALSE,
      NULL::JSONB,
      NULL::JSONB,
      SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION swap_establishment_positions IS
'Atomically swap positions of two establishments. If any step fails, entire operation is rolled back to prevent data corruption.';

-- Grant execute permission to authenticated users
-- GRANT EXECUTE ON FUNCTION swap_establishment_positions TO authenticated;

-- Example usage:
-- SELECT * FROM swap_establishment_positions(
--   'source-establishment-uuid'::UUID,
--   'target-establishment-uuid'::UUID,
--   'walking-street'::TEXT
-- );
