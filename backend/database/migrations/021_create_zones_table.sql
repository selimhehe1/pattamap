-- Migration: Create zones table
-- Description: Creates a zones table to store area/district information
-- Date: 2025-12-30

-- Create zones table
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial zones (Pattaya nightlife areas)
INSERT INTO zones (slug, name, display_order) VALUES
  ('soi6', 'Soi 6', 1),
  ('walkingstreet', 'Walking Street', 2),
  ('lkmetro', 'LK Metro', 3),
  ('treetown', 'Tree Town', 4),
  ('soibuakhao', 'Soi Buakhao', 5),
  ('beachroad', 'Beach Road', 6)
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

-- Public read access for active zones
CREATE POLICY "zones_public_read" ON zones
  FOR SELECT USING (is_active = true);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_zones_slug ON zones(slug);
CREATE INDEX IF NOT EXISTS idx_zones_display_order ON zones(display_order);
CREATE INDEX IF NOT EXISTS idx_zones_is_active ON zones(is_active);

-- Add comment
COMMENT ON TABLE zones IS 'Stores nightlife zone/area information for Pattaya';
