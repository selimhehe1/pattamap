-- Add UNIQUE constraint on (zone, grid_row, grid_col) to prevent future duplicates
-- This ensures that within each zone, each position can only be occupied by one establishment
BEGIN;

-- First, create a unique index that allows NULL values (for establishments not on the map)
-- NULL values are not considered equal in PostgreSQL unique constraints, so multiple NULLs are allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_position_per_zone
ON establishments (zone, grid_row, grid_col)
WHERE zone IS NOT NULL AND grid_row IS NOT NULL AND grid_col IS NOT NULL;

-- Add a descriptive comment
COMMENT ON INDEX idx_unique_position_per_zone IS
'Ensures unique positions within each zone. NULLs are allowed for establishments not on the map.';

-- Verify the constraint was added successfully
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'establishments'
  AND indexname = 'idx_unique_position_per_zone';

COMMIT;