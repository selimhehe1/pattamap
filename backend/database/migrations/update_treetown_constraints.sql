-- ============================================================
-- Tree Town Grid System Update - SQL Constraints
-- ============================================================
-- Updates database constraints for new Tree Town grid system
--
-- NEW STRUCTURE (42 positions total):
-- - Rows 1-2: Horizontal main street (18 positions)
--   * Row 1: cols 1-10 (10 positions)
--   * Row 2: cols 2-9 (8 positions, MASKED: 2,1 and 2,10)
-- - Rows 3-8: Left vertical branch (2 cols × 6 rows = 12 positions)
-- - Rows 9-14: Right vertical branch (2 cols × 6 rows = 12 positions)
--
-- MASKED POSITIONS: (2,1) and (2,10) interfere with vertical roads
-- ============================================================

-- Drop existing grid constraints
ALTER TABLE establishments
DROP CONSTRAINT IF EXISTS check_grid_row;

ALTER TABLE establishments
DROP CONSTRAINT IF EXISTS check_grid_col;

-- Create updated grid row constraint
ALTER TABLE establishments
ADD CONSTRAINT check_grid_row CHECK (
  (zone = 'soi6' AND grid_row >= 1 AND grid_row <= 2) OR
  (zone = 'walkingstreet' AND grid_row >= 1 AND grid_row <= 42) OR
  (zone = 'lkmetro' AND grid_row >= 1 AND grid_row <= 4) OR
  (zone = 'treetown' AND grid_row >= 1 AND grid_row <= 14) OR  -- Updated from 10 to 14
  (zone = 'soibuakhao' AND grid_row >= 1 AND grid_row <= 3) OR
  (zone = 'jomtiencomplex' AND grid_row >= 1 AND grid_row <= 2) OR
  (zone = 'boyztown' AND grid_row >= 1 AND grid_row <= 2) OR
  (zone = 'soi78' AND grid_row >= 1 AND grid_row <= 3) OR
  (zone = 'beachroadcentral' AND grid_row >= 1 AND grid_row <= 2) OR
  (zone NOT IN ('soi6', 'walkingstreet', 'lkmetro', 'treetown', 'soibuakhao', 'jomtiencomplex', 'boyztown', 'soi78', 'beachroadcentral'))
);

-- Create updated grid col constraint with variable column limits per row
-- This constraint ensures:
-- - Row 1 (horizontal north): cols 1-10
-- - Row 2 (horizontal south): cols 2-9 (MASKED: 2,1 and 2,10)
-- - Rows 3-8 (left vertical): cols 1-2
-- - Rows 9-14 (right vertical): cols 1-2
ALTER TABLE establishments
ADD CONSTRAINT check_grid_col CHECK (
  (zone = 'soi6' AND grid_col >= 1 AND grid_col <= 20) OR
  (zone = 'walkingstreet' AND grid_col >= 1 AND grid_col <= 5) OR
  (zone = 'lkmetro' AND grid_col >= 1 AND grid_col <= 9) OR
  (
    zone = 'treetown' AND (
      (grid_row = 1 AND grid_col >= 1 AND grid_col <= 10) OR                     -- Row 1: cols 1-10 (10 positions)
      (grid_row = 2 AND grid_col >= 2 AND grid_col <= 9) OR                      -- Row 2: cols 2-9 (8 positions, masked 2,1 & 2,10)
      (grid_row >= 3 AND grid_row <= 8 AND grid_col >= 1 AND grid_col <= 2) OR   -- Left vertical: 2 cols
      (grid_row >= 9 AND grid_row <= 14 AND grid_col >= 1 AND grid_col <= 2)     -- Right vertical: 2 cols
    )
  ) OR
  (zone = 'soibuakhao' AND grid_col >= 1 AND grid_col <= 18) OR
  (zone = 'jomtiencomplex' AND grid_col >= 1 AND grid_col <= 15) OR
  (zone = 'boyztown' AND grid_col >= 1 AND grid_col <= 12) OR
  (zone = 'soi78' AND grid_col >= 1 AND grid_col <= 16) OR
  (zone = 'beachroadcentral' AND grid_col >= 1 AND grid_col <= 22) OR
  (zone NOT IN ('soi6', 'walkingstreet', 'lkmetro', 'treetown', 'soibuakhao', 'jomtiencomplex', 'boyztown', 'soi78', 'beachroadcentral'))
);

-- Verification query: Show Tree Town establishments with their new grid positions
SELECT
  id,
  name,
  zone,
  grid_row,
  grid_col,
  CASE
    WHEN grid_row >= 1 AND grid_row <= 2 THEN 'Horizontal Main'
    WHEN grid_row >= 3 AND grid_row <= 8 THEN 'Left Vertical'
    WHEN grid_row >= 9 AND grid_row <= 14 THEN 'Right Vertical'
    ELSE 'INVALID'
  END as segment,
  CASE
    WHEN grid_row >= 1 AND grid_row <= 2 AND grid_col >= 1 AND grid_col <= 10 THEN '✅ Valid'
    WHEN grid_row >= 3 AND grid_row <= 8 AND grid_col >= 1 AND grid_col <= 2 THEN '✅ Valid'
    WHEN grid_row >= 9 AND grid_row <= 14 AND grid_col >= 1 AND grid_col <= 2 THEN '✅ Valid'
    ELSE '❌ INVALID'
  END as validation_status
FROM establishments
WHERE zone = 'treetown'
ORDER BY grid_row, grid_col;

-- Summary statistics
SELECT
  'Tree Town Capacity' as metric,
  COUNT(*) as current_establishments,
  42 as total_capacity,
  ROUND((COUNT(*) * 100.0 / 42), 1) || '%' as utilization
FROM establishments
WHERE zone = 'treetown';

COMMENT ON CONSTRAINT check_grid_row ON establishments IS
'Grid row validation: soi6(1-2), walkingstreet(1-42), lkmetro(1-4), treetown(1-14), soibuakhao(1-3), jomtiencomplex(1-2), boyztown(1-2), soi78(1-3), beachroadcentral(1-2)';

COMMENT ON CONSTRAINT check_grid_col ON establishments IS
'Grid column validation with variable limits per zone and row. Tree Town: rows 1-2 (10 cols), rows 3-8 (2 cols), rows 9-14 (2 cols)';
