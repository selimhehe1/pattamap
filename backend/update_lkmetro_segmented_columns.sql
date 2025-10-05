/**
 * LK Metro Grid Update - Masked Positions to Prevent Overlap
 *
 * Update database constraint with masked positions at junction:
 * - Row 1: cols 1-9 = 9 positions
 * - Row 2: cols 1-8 = 8 positions (mask col 9 to prevent overlap)
 * - Row 3: cols 3-9 = 7 positions (mask cols 1-2 to prevent junction overlap)
 * - Row 4: cols 1-9 = 9 positions
 *
 * Total capacity: 33 positions (9+8+7+9)
 *
 * Positions 2.9, 3.1, 3.2 are masked to avoid visual overlap
 * between horizontal and vertical segments at the L-junction.
 */

-- Step 1: Drop existing constraint
ALTER TABLE establishments
DROP CONSTRAINT IF EXISTS check_lkmetro_grid;

DROP CONSTRAINT IF EXISTS check_lkmetro_grid_segmented;

-- Step 2: Add new constraint with masked positions at junction
-- This constraint validates columns with specific masks per row:
-- - Row 1: cols 1-9 (full)
-- - Row 2: cols 1-8 (mask col 9)
-- - Row 3: cols 3-9 (mask cols 1-2)
-- - Row 4: cols 1-9 (full)
ALTER TABLE establishments
ADD CONSTRAINT check_lkmetro_grid_segmented CHECK (
  zone != 'lkmetro' OR (
    -- Row validation (1-4)
    grid_row >= 1 AND grid_row <= 4 AND
    -- Column validation with masked positions
    (
      (grid_row = 1 AND grid_col >= 1 AND grid_col <= 9) OR  -- Row 1: full (9 positions)
      (grid_row = 2 AND grid_col >= 1 AND grid_col <= 8) OR  -- Row 2: mask 9 (8 positions)
      (grid_row = 3 AND grid_col >= 3 AND grid_col <= 9) OR  -- Row 3: mask 1-2 (7 positions)
      (grid_row = 4 AND grid_col >= 1 AND grid_col <= 9)     -- Row 4: full (9 positions)
    )
  )
);

-- Step 3: Verify constraint is active
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'check_lkmetro_grid_segmented';

-- Step 4: Test validation with sample data
-- These should PASS:
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 1, 1, ...);   -- Row 1, col 1
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 1, 9, ...);   -- Row 1, col 9 (max)
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 2, 1, ...);   -- Row 2, col 1
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 2, 8, ...);   -- Row 2, col 8 (max, 9 masked)
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 3, 3, ...);   -- Row 3, col 3 (min, 1-2 masked)
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 3, 9, ...);   -- Row 3, col 9 (max)
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 4, 1, ...);   -- Row 4, col 1
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 4, 9, ...);   -- Row 4, col 9 (max)

-- These should FAIL:
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 2, 9, ...);   -- MASKED position 2.9
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 3, 1, ...);   -- MASKED position 3.1
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 3, 2, ...);   -- MASKED position 3.2
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 1, 10, ...);  -- Col out of bounds (> 9)
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 5, 1, ...);   -- Row out of bounds
-- INSERT INTO establishments (zone, grid_row, grid_col, ...) VALUES ('lkmetro', 1, 0, ...);   -- Col out of bounds (< 1)

-- Step 5: Check current LK Metro establishments (optional)
-- See how many establishments are currently in each segment
SELECT
  grid_row,
  COUNT(*) as count,
  CASE
    WHEN grid_row <= 2 THEN 'Horizontal Segment (10 cols)'
    ELSE 'Vertical Segment (5 cols)'
  END as segment
FROM establishments
WHERE zone = 'lkmetro'
GROUP BY grid_row
ORDER BY grid_row;

-- Step 6: Identify any invalid positions that need migration (optional)
-- Lists establishments that would violate the new constraint
SELECT
  id,
  name,
  grid_row,
  grid_col,
  CASE
    WHEN grid_row = 2 AND grid_col = 9 THEN 'MASKED position 2.9'
    WHEN grid_row = 3 AND grid_col = 1 THEN 'MASKED position 3.1'
    WHEN grid_row = 3 AND grid_col = 2 THEN 'MASKED position 3.2'
    WHEN grid_col > 9 THEN 'Column overflow (col > 9)'
    WHEN grid_col < 1 THEN 'Column underflow (col < 1)'
    WHEN grid_row > 4 THEN 'Row overflow (row > 4)'
    WHEN grid_row < 1 THEN 'Row underflow (row < 1)'
    ELSE 'Valid'
  END as issue
FROM establishments
WHERE zone = 'lkmetro'
  AND (
    (grid_row = 2 AND grid_col = 9) OR
    (grid_row = 3 AND (grid_col = 1 OR grid_col = 2)) OR
    grid_col > 9 OR grid_col < 1 OR
    grid_row > 4 OR grid_row < 1
  );

-- NOTE: If Step 6 returns any rows, those establishments need to be manually
-- repositioned to valid grid positions before applying the constraint.
-- Use the frontend drag & drop in edit mode or update via:
-- UPDATE establishments
-- SET grid_row = <new_row>, grid_col = <new_col>
-- WHERE id = '<establishment_id>';
