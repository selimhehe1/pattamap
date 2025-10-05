-- Migration: Create independent_positions table for freelancers
-- This allows employees to have their own position on the map independent of establishments

CREATE TABLE independent_positions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  zone VARCHAR(50) NOT NULL, -- 'soi6', 'walkingstreet', 'lkmetro', 'beachroad', 'soibuakhao', etc.
  grid_row INTEGER NOT NULL CHECK (grid_row >= 1 AND grid_row <= 2),
  grid_col INTEGER NOT NULL CHECK (grid_col >= 1 AND grid_col <= 40),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one active position per employee
CREATE UNIQUE INDEX unique_active_position_per_employee
ON independent_positions (employee_id)
WHERE is_active = TRUE;

-- Prevent position conflicts: only one active freelance per grid cell
CREATE UNIQUE INDEX unique_active_grid_position
ON independent_positions (zone, grid_row, grid_col)
WHERE is_active = TRUE;

-- Index for map queries
CREATE INDEX idx_independent_positions_zone_grid
ON independent_positions (zone, grid_row, grid_col)
WHERE is_active = TRUE;

-- Index for employee lookups
CREATE INDEX idx_independent_positions_employee
ON independent_positions (employee_id, is_active);

-- Add comment for documentation
COMMENT ON TABLE independent_positions IS 'Stores independent positions for freelance employees on the map';
COMMENT ON COLUMN independent_positions.is_active IS 'Only one active position allowed per employee at a time';
