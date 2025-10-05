-- ========================================
-- MIGRATION: Simplify Establishment Categories
-- ========================================
-- This script updates the establishment_categories table to keep only 4 main categories
-- and migrates existing establishments to use the simplified categories

-- Step 1: Update or create the 4 main categories
-- Using INSERT ... ON CONFLICT to handle both create and update scenarios

-- Ensure we have exactly these 4 categories with the correct IDs
INSERT INTO establishment_categories (id, name, icon, color) VALUES
  (1, 'Bar', 'beer', '#ff6b35'),
  (2, 'GoGo Bar', 'dancer', '#ff006e'),
  (3, 'Massage Salon', 'spa', '#06ffa5'),
  (4, 'Nightclub', 'music', '#7b2cbf')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;

-- Step 2: Migrate establishments from old categories to new ones
-- Map Beer Bar (ID 5) → Bar (ID 1)
UPDATE establishments
SET category_id = 1
WHERE category_id = 5;

-- Map Club (ID 6) → Nightclub (ID 4)
UPDATE establishments
SET category_id = 4
WHERE category_id = 6;

-- Map Restaurant Bar (ID 7) → Bar (ID 1)
UPDATE establishments
SET category_id = 1
WHERE category_id = 7;

-- Map Sports Bar (ID 8) → Bar (ID 1)
UPDATE establishments
SET category_id = 1
WHERE category_id = 8;

-- Map Coyote Bar (ID 9) → GoGo Bar (ID 2)
UPDATE establishments
SET category_id = 2
WHERE category_id = 9;

-- Step 3: Delete old categories (only if no establishments reference them)
-- This should work now since we've updated all establishments above
DELETE FROM establishment_categories
WHERE id IN (5, 6, 7, 8, 9);

-- Step 4: Reset the sequence to start from 5 for future inserts
-- This ensures the next category will have ID 5
SELECT setval('establishment_categories_id_seq', 4, true);

-- Verification queries (uncomment to run)
-- SELECT * FROM establishment_categories ORDER BY id;
-- SELECT category_id, COUNT(*) FROM establishments GROUP BY category_id ORDER BY category_id;
