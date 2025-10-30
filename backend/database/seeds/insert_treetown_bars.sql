-- ============================================================
-- Tree Town Bars - SQL Insertion Script
-- ============================================================
-- Inserts 21 bars from Tree Town Pattaya
-- Status: APPROVED (direct validation)
-- Zone: treetown
-- Grid positions: Distributed across 42 available positions
-- ============================================================

-- Insert 21 Tree Town bars with approved status
INSERT INTO establishments (name, address, zone, status, category_id, grid_row, grid_col, created_at, updated_at) VALUES

-- HORIZONTAL MAIN STREET (Rows 1-2) - 9 bars
('Buddy Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 5, 1, 2, NOW(), NOW()),
('Cozy Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 5, 1, 4, NOW(), NOW()),
('Chicago Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 5, 1, 6, NOW(), NOW()),
('Pretty Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 5, 1, 8, NOW(), NOW()),
('SLUTZ Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 5, 1, 10, NOW(), NOW()),

('Hype Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 5, 2, 3, NOW(), NOW()),
('Joy Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 5, 2, 5, NOW(), NOW()),
('Long Hang 35 Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 5, 2, 7, NOW(), NOW()),
('Star Bar Treetown', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 5, 2, 9, NOW(), NOW()),

-- LEFT VERTICAL BRANCH (Rows 3-8, cols 1-2) - 6 bars
('Danny''s Sports Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 6, 3, 1, NOW(), NOW()),
('Basilisk Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 6, 3, 2, NOW(), NOW()),
('Rock Station', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 6, 5, 1, NOW(), NOW()),
('Gary''s Sports Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 6, 5, 2, NOW(), NOW()),
('Beer Hubb', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 6, 7, 1, NOW(), NOW()),
('Town Bar Restaurant', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 6, 7, 2, NOW(), NOW()),

-- RIGHT VERTICAL BRANCH (Rows 9-14, cols 1-2) - 6 bars
('Emma''s Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 6, 9, 1, NOW(), NOW()),
('What The Funk Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 6, 9, 2, NOW(), NOW()),
('Made in Thailand', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 6, 11, 1, NOW(), NOW()),
('Geordie Bar 1', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 6, 11, 2, NOW(), NOW()),
('Geordie Bar 2', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 6, 13, 1, NOW(), NOW()),
('Avatar Bar', 'Tree Town, Soi Buakhao, Pattaya', 'treetown', 'approved', 2, 13, 2, NOW(), NOW());

-- Verification query: Show inserted Tree Town establishments
SELECT
  id,
  name,
  zone,
  status,
  category_id,
  grid_row,
  grid_col,
  CASE
    WHEN grid_row >= 1 AND grid_row <= 2 THEN 'Horizontal Main'
    WHEN grid_row >= 3 AND grid_row <= 8 THEN 'Left Vertical'
    WHEN grid_row >= 9 AND grid_row <= 14 THEN 'Right Vertical'
  END as segment
FROM establishments
WHERE zone = 'treetown'
ORDER BY grid_row, grid_col;

-- Summary statistics
SELECT
  'Tree Town Bars Inserted' as metric,
  COUNT(*) as total_bars,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
  COUNT(CASE WHEN category_id = 5 THEN 1 END) as beer_bars,
  COUNT(CASE WHEN category_id = 6 THEN 1 END) as pubs,
  COUNT(CASE WHEN category_id = 2 THEN 1 END) as nightclubs
FROM establishments
WHERE zone = 'treetown';

-- Grid utilization
SELECT
  'Tree Town Grid Utilization' as metric,
  COUNT(*) as occupied_positions,
  42 as total_capacity,
  ROUND((COUNT(*) * 100.0 / 42), 1) || '%' as utilization
FROM establishments
WHERE zone = 'treetown';
