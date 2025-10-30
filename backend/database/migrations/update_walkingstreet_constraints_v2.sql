-- Migration: Update grid constraints for Walking Street V2
-- Date: 2025-10-04
-- Purpose: Support new topographic system with perpendicular Sois
--
-- NEW SYSTEM:
-- Rows 1-2: Main Walking Street horizontal (24 columns each)
-- Rows 3-30: Perpendicular Sois grids (1 column each, 28 rows total)
--   - Diamond (3-8): 6 rows
--   - Republic (9-10): 2 rows
--   - Myst (11-12): 2 rows
--   - Soi 15 (13-18): 6 rows
--   - Soi 16 (19-24): 6 rows
--   - BJ Alley (25-30): 6 rows

-- Drop old global constraints (too restrictive)
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS establishments_grid_row_check;
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS establishments_grid_col_check;
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_grid_row;
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS check_grid_col;

-- Add new zone-specific constraints
-- WALKING STREET: Rows 1-30, Cols 1-24
-- SOI 6: Rows 1-2, Cols 1-20
-- Other zones: flexible (no strict limits for now)

ALTER TABLE establishments
ADD CONSTRAINT check_grid_row CHECK (
  grid_row IS NULL OR
  (zone = 'walkingstreet' AND grid_row >= 1 AND grid_row <= 30) OR
  (zone = 'soi6' AND grid_row >= 1 AND grid_row <= 2) OR
  (zone = 'lkmetro' AND grid_row >= 1 AND grid_row <= 4) OR
  (zone = 'treetown' AND grid_row >= 1 AND grid_row <= 14) OR
  (zone = 'soibuakhao' AND grid_row >= 1 AND grid_row <= 3) OR
  (zone = 'jomtiencomplex' AND grid_row >= 1 AND grid_row <= 2) OR
  (zone = 'boyztown' AND grid_row >= 1 AND grid_row <= 2) OR
  (zone = 'soi78' AND grid_row >= 1 AND grid_row <= 3) OR
  (zone = 'beachroadcentral' AND grid_row >= 1 AND grid_row <= 2) OR
  (zone NOT IN ('walkingstreet', 'soi6', 'lkmetro', 'treetown', 'soibuakhao', 'jomtiencomplex', 'boyztown', 'soi78', 'beachroadcentral'))
);

ALTER TABLE establishments
ADD CONSTRAINT check_grid_col CHECK (
  grid_col IS NULL OR
  (zone = 'walkingstreet' AND grid_col >= 1 AND grid_col <= 24) OR
  (zone = 'soi6' AND grid_col >= 1 AND grid_col <= 20) OR
  (zone = 'lkmetro' AND grid_col >= 1 AND grid_col <= 10) OR
  (zone = 'treetown' AND grid_col >= 1 AND grid_col <= 10) OR
  (zone = 'soibuakhao' AND grid_col >= 1 AND grid_col <= 18) OR
  (zone = 'jomtiencomplex' AND grid_col >= 1 AND grid_col <= 15) OR
  (zone = 'boyztown' AND grid_col >= 1 AND grid_col <= 12) OR
  (zone = 'soi78' AND grid_col >= 1 AND grid_col <= 16) OR
  (zone = 'beachroadcentral' AND grid_col >= 1 AND grid_col <= 22) OR
  (zone NOT IN ('walkingstreet', 'soi6', 'lkmetro', 'treetown', 'soibuakhao', 'jomtiencomplex', 'boyztown', 'soi78', 'beachroadcentral'))
);

-- Verify constraints
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conname IN ('check_grid_row', 'check_grid_col')
  AND conrelid = 'establishments'::regclass;
