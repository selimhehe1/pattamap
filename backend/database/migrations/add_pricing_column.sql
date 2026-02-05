-- Migration: Add pricing column to establishments table
-- Date: 2024-09-21
-- Description: Add JSONB pricing column to store bar fine, lady drink, room prices, etc.

-- Add pricing column
ALTER TABLE establishments
ADD COLUMN pricing JSONB;

-- Add comment for documentation
COMMENT ON COLUMN establishments.pricing IS 'Pricing information in JSON format: {"bar_fine": 3000, "lady_drink": 150, "room": 1500}';

-- Create index for pricing queries (optional but recommended)
CREATE INDEX idx_establishments_pricing ON establishments USING gin (pricing);

-- Insert sample pricing data for existing establishments (optional)
-- You can run this manually to add sample data to existing bars
/*
UPDATE establishments
SET pricing = jsonb_build_object(
  'bar_fine', 3000,
  'lady_drink', 150,
  'room', 1500
)
WHERE pricing IS NULL
AND zone = 'soi6';
*/

-- Verify the migration
-- SELECT id, name, pricing FROM establishments LIMIT 5;