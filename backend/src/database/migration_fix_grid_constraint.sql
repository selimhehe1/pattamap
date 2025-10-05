-- Migration: Fix grid column constraint to allow 1-20 columns
-- Date: 2025-09-22
-- Purpose: Expand the check_grid_col constraint from 1-15 to 1-20 to support full Soi 6 grid

-- Drop the existing constraint that limits columns to 15
ALTER TABLE establishments DROP CONSTRAINT check_grid_col;

-- Add new constraint that allows columns 1-20
ALTER TABLE establishments ADD CONSTRAINT check_grid_col
CHECK (grid_col IS NULL OR (grid_col >= 1 AND grid_col <= 20));

-- Verify the constraint change
SELECT conname, consrc
FROM pg_constraint
WHERE conname = 'check_grid_col';

-- Test with a sample update to column 20 (should now work)
-- This is safe because we'll revert it immediately
DO $$
DECLARE
    test_establishment_id UUID;
    original_col INTEGER;
BEGIN
    -- Get any establishment to test with
    SELECT id, grid_col INTO test_establishment_id, original_col
    FROM establishments
    WHERE zone = 'soi6'
    LIMIT 1;

    IF test_establishment_id IS NOT NULL THEN
        -- Test update to column 20
        UPDATE establishments
        SET grid_col = 20
        WHERE id = test_establishment_id;

        -- Immediately revert to original position
        UPDATE establishments
        SET grid_col = original_col
        WHERE id = test_establishment_id;

        RAISE NOTICE 'SUCCESS: Constraint fix verified - column 20 is now allowed';
    ELSE
        RAISE NOTICE 'No test establishment found in soi6 zone';
    END IF;
END $$;