-- Migration: Update grid constraints for Walking Street (2 rows × 20 cols)
-- Date: 2025-09-30
-- Purpose: Walking Street uses 2 rows (north/south sides) with 20 columns
BEGIN;

-- Drop existing constraints
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS establishments_grid_row_check;
ALTER TABLE establishments DROP CONSTRAINT IF EXISTS establishments_grid_col_check;

-- Add updated constraints
ALTER TABLE establishments
ADD CONSTRAINT establishments_grid_row_check
CHECK (grid_row IS NULL OR (grid_row >= 1 AND grid_row <= 2));

ALTER TABLE establishments
ADD CONSTRAINT establishments_grid_col_check
CHECK (grid_col IS NULL OR (grid_col >= 1 AND grid_col <= 20));

COMMIT;