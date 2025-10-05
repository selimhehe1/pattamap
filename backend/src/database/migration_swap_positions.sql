-- Migration to add swap_establishment_positions function
-- This function allows atomic swapping of grid positions between two establishments

CREATE OR REPLACE FUNCTION swap_establishment_positions(
    est1_id UUID,
    est2_id UUID,
    new_row1 INTEGER,
    new_col1 INTEGER,
    new_row2 INTEGER,
    new_col2 INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Use a transaction to ensure atomicity
    -- Update both establishments in a single transaction

    -- Temporarily set establishment 1 to negative values to avoid constraint conflicts
    UPDATE establishments
    SET grid_row = -1, grid_col = -1
    WHERE id = est1_id;

    -- Update establishment 2 to establishment 1's new position
    UPDATE establishments
    SET grid_row = new_row2, grid_col = new_col2
    WHERE id = est2_id;

    -- Update establishment 1 to its final position
    UPDATE establishments
    SET grid_row = new_row1, grid_col = new_col1
    WHERE id = est1_id;

    -- Log the swap operation
    INSERT INTO grid_position_logs (
        establishment_id,
        old_grid_row,
        old_grid_col,
        new_grid_row,
        new_grid_col,
        operation_type,
        created_at
    ) VALUES
    (est1_id, new_row2, new_col2, new_row1, new_col1, 'swap', NOW()),
    (est2_id, new_row1, new_col1, new_row2, new_col2, 'swap', NOW());

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to swap positions: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create a simple audit table for grid position changes (optional)
CREATE TABLE IF NOT EXISTS grid_position_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    establishment_id UUID REFERENCES establishments(id),
    old_grid_row INTEGER,
    old_grid_col INTEGER,
    new_grid_row INTEGER,
    new_grid_col INTEGER,
    operation_type VARCHAR(20), -- 'move', 'swap', 'create'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_grid_position_logs_establishment
ON grid_position_logs(establishment_id);

CREATE INDEX IF NOT EXISTS idx_grid_position_logs_created_at
ON grid_position_logs(created_at);

-- Add comments for documentation
COMMENT ON FUNCTION swap_establishment_positions IS 'Atomically swap grid positions between two establishments';
COMMENT ON TABLE grid_position_logs IS 'Audit log for all grid position changes';