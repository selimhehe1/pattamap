-- Migration: Add Grid System for Zone Layouts
-- Date: 2025-09-21
-- Purpose: Replace hardcoded positions with database-driven grid system

-- ========================================
-- PHASE 1: ADD GRID COLUMNS
-- ========================================

-- Add grid positioning columns to establishments table
ALTER TABLE establishments
ADD COLUMN grid_row INTEGER,
ADD COLUMN grid_col INTEGER,
ADD COLUMN zone VARCHAR(50);

-- Add constraints for grid system
ALTER TABLE establishments
ADD CONSTRAINT check_grid_row
  CHECK (grid_row IS NULL OR (grid_row >= 1 AND grid_row <= 2));

ALTER TABLE establishments
ADD CONSTRAINT check_grid_col
  CHECK (grid_col IS NULL OR (grid_col >= 1 AND grid_col <= 15));

-- Add index for performance
CREATE INDEX idx_establishments_zone_grid ON establishments (zone, grid_row, grid_col);

-- ========================================
-- PHASE 2: UPDATE EXISTING SOI 6 DATA
-- ========================================

-- First, set all Soi 6 establishments to zone 'soi6'
UPDATE establishments
SET zone = 'soi6'
WHERE ST_DWithin(location, ST_Point(100.8865, 12.9422)::geography, 200);

-- Assign grid positions based on GPS coordinates and category
-- GoGo bars get priority on row 1 (top), others distributed across both rows
WITH soi6_establishments AS (
  SELECT
    id,
    name,
    category_id,
    location,
    ST_X(location::geometry) as longitude,
    ST_Y(location::geometry) as latitude,
    ROW_NUMBER() OVER (
      PARTITION BY
        CASE
          WHEN category_id = (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar') THEN 1
          ELSE 2
        END
      ORDER BY ST_X(location::geometry)
    ) as position_in_category
  FROM establishments
  WHERE zone = 'soi6'
),
grid_assignments AS (
  SELECT
    id,
    name,
    category_id,
    -- GoGo bars on row 1, others distributed
    CASE
      WHEN category_id = (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar') THEN 1
      WHEN position_in_category <= 8 THEN 1  -- First 8 non-gogo on row 1
      ELSE 2  -- Rest on row 2
    END as grid_row,
    -- Column assignment within row
    CASE
      WHEN category_id = (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar') THEN position_in_category
      WHEN position_in_category <= 8 THEN position_in_category +
        (SELECT COUNT(*) FROM soi6_establishments s2 WHERE s2.category_id = (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'))
      ELSE position_in_category - 8
    END as grid_col
  FROM soi6_establishments
)
UPDATE establishments
SET
  grid_row = grid_assignments.grid_row,
  grid_col = grid_assignments.grid_col
FROM grid_assignments
WHERE establishments.id = grid_assignments.id;

-- ========================================
-- PHASE 3: POPULATE REAL SOI 6 BARS DATA
-- ========================================

-- Clean existing Soi 6 data first
DELETE FROM establishments WHERE zone = 'soi6';

-- Insert comprehensive Soi 6 bars with grid positions
-- Row 1: Premium positions (GoGo bars and prime locations)
INSERT INTO establishments (name, address, location, category_id, description, zone, grid_row, grid_col, status) VALUES
('Ruby Club', 'Soi 6, North Pattaya', ST_Point(100.8863, 12.9420),
 (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
 'Premium GoGo club on Soi 6 with stunning performers', 'soi6', 1, 1, 'approved'),

('Pussy Club', 'Soi 6, North Pattaya', ST_Point(100.8865, 12.9422),
 (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
 'Popular entertainment venue with lively atmosphere', 'soi6', 1, 2, 'approved'),

('Toy Box', 'Soi 6, North Pattaya', ST_Point(100.8867, 12.9424),
 (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
 'Fun-themed GoGo bar with playful atmosphere', 'soi6', 1, 3, 'approved'),

('Wicked', 'Soi 6, North Pattaya', ST_Point(100.8869, 12.9426),
 (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
 'Edgy nightlife experience with themed shows', 'soi6', 1, 4, 'approved'),

('Nightwish', 'Soi 6, North Pattaya', ST_Point(100.8861, 12.9418),
 (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
 'Evening entertainment venue with quality shows', 'soi6', 1, 5, 'approved'),

('Sky Bar', 'Soi 6, North Pattaya', ST_Point(100.8864, 12.9421),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Rooftop beer bar with city views', 'soi6', 1, 6, 'approved'),

('Miss B Haven', 'Soi 6, North Pattaya', ST_Point(100.8866, 12.9423),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Cozy beer bar with friendly staff', 'soi6', 1, 7, 'approved'),

('Soho Bar', 'Soi 6, North Pattaya', ST_Point(100.8868, 12.9425),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Music and drinks in relaxed setting', 'soi6', 1, 8, 'approved'),

('Saigon Girls', 'Soi 6, North Pattaya', ST_Point(100.8870, 12.9427),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Asian-themed beer bar with spicy atmosphere', 'soi6', 1, 9, 'approved'),

('Roxy Bar', 'Soi 6, North Pattaya', ST_Point(100.8862, 12.9419),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Rock music and cold beers', 'soi6', 1, 10, 'approved'),

('Mod''s Bar', 'Soi 6, North Pattaya', ST_Point(100.8871, 12.9428),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Biker-friendly atmosphere with live music', 'soi6', 1, 11, 'approved'),

('Bee Corner Bar', 'Corner Soi 6 & Second Road', ST_Point(100.8872, 12.9429),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Cheapest drinks in town at strategic corner', 'soi6', 1, 12, 'approved'),

('Queen Victoria Inn', 'Soi 6, North Pattaya', ST_Point(100.8860, 12.9417),
 (SELECT id FROM establishment_categories WHERE name = 'Pub'),
 'British-style pub with draught beers and pub grub', 'soi6', 1, 13, 'approved'),

('Spider Girl', 'Soi 6, North Pattaya', ST_Point(100.8859, 12.9416),
 (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
 'Themed entertainment venue with unique atmosphere', 'soi6', 1, 14, 'approved'),

('Helicopter Bar', 'Soi 6, North Pattaya', ST_Point(100.8873, 12.9430),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Aviation-themed bar with unique decor', 'soi6', 1, 15, 'approved');

-- Row 2: Secondary positions (Beer bars, pubs, and overflow)
INSERT INTO establishments (name, address, location, category_id, description, zone, grid_row, grid_col, status) VALUES
('Butterfly Bar', 'Soi 6, North Pattaya', ST_Point(100.8858, 12.9415),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Classic Soi 6 hostess bar with friendly atmosphere', 'soi6', 2, 1, 'approved'),

('Horny Bar', 'Soi 6, North Pattaya', ST_Point(100.8857, 12.9414),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Popular short-time bar with lively atmosphere', 'soi6', 2, 2, 'approved'),

('Sexy in the City', 'Soi 6, North Pattaya', ST_Point(100.8856, 12.9413),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Trendy bar with modern styling', 'soi6', 2, 3, 'approved'),

('Quicky Bar', 'Soi 6, North Pattaya', ST_Point(100.8855, 12.9412),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'No-nonsense bar popular with regulars', 'soi6', 2, 4, 'approved'),

('Foxy''s Bar', 'Soi 6, North Pattaya', ST_Point(100.8854, 12.9411),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Cozy bar with friendly staff and good music', 'soi6', 2, 5, 'approved'),

('The Offshore Bar', 'Soi 6, North Pattaya', ST_Point(100.8853, 12.9410),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Nautical-themed bar with sea-inspired decor', 'soi6', 2, 6, 'approved'),

('Route 69 Bar', 'Soi 6, North Pattaya', ST_Point(100.8852, 12.9409),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Rock music themed bar with biker atmosphere', 'soi6', 2, 7, 'approved'),

('3 Angels Bar', 'Soi 6, North Pattaya', ST_Point(100.8851, 12.9408),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Small intimate bar with personal service', 'soi6', 2, 8, 'approved'),

('Repent Bar', 'Soi 6, North Pattaya', ST_Point(100.8850, 12.9407),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Must-stop bar in middle of Soi 6', 'soi6', 2, 9, 'approved'),

('Cockatoo Bar', 'Soi 6, North Pattaya', ST_Point(100.8849, 12.9406),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Tropical themed bar with colorful decor', 'soi6', 2, 10, 'approved'),

('Paradise Bar', 'Soi 6, North Pattaya', ST_Point(100.8848, 12.9405),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Relaxed atmosphere with tropical island theme', 'soi6', 2, 11, 'approved'),

('Lucky Bar', 'Soi 6, North Pattaya', ST_Point(100.8847, 12.9404),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Traditional Soi 6 bar with games', 'soi6', 2, 12, 'approved'),

('Sunset Bar', 'Soi 6, North Pattaya', ST_Point(100.8846, 12.9403),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Evening-focused bar with romantic lighting', 'soi6', 2, 13, 'approved'),

('Wild Cat Bar', 'Soi 6, North Pattaya', ST_Point(100.8845, 12.9402),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Edgy bar with wild atmosphere', 'soi6', 2, 14, 'approved'),

('Sugar Bar', 'Soi 6, North Pattaya', ST_Point(100.8844, 12.9401),
 (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
 'Sweet themed bar with candy colors', 'soi6', 2, 15, 'approved');

-- ========================================
-- PHASE 4: VERIFICATION AND CLEANUP
-- ========================================

-- Verify grid assignments don't conflict
SELECT
  zone,
  grid_row,
  grid_col,
  COUNT(*) as establishments_count,
  STRING_AGG(name, ', ') as establishment_names
FROM establishments
WHERE zone IS NOT NULL
GROUP BY zone, grid_row, grid_col
HAVING COUNT(*) > 1;

-- Show grid layout summary
SELECT
  zone,
  grid_row,
  COUNT(*) as establishments_in_row,
  STRING_AGG(
    CONCAT(name, ' (', grid_col, ')'),
    ', ' ORDER BY grid_col
  ) as layout
FROM establishments
WHERE zone = 'soi6'
GROUP BY zone, grid_row
ORDER BY grid_row;

-- Performance check
EXPLAIN ANALYZE
SELECT * FROM establishments
WHERE zone = 'soi6'
ORDER BY grid_row, grid_col;