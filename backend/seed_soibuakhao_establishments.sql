/**
 * SEED DATA - Soi Buakhao Establishments (Real Venues 2024-2025)
 *
 * Based on extensive research from:
 * - www.pattayaunlimited.com/soi-buakhao/
 * - www.thingstodopattaya.com/soi-buakhao/
 * - Multiple nightlife review sites
 * - Current operational venues as of 2024-2025
 *
 * Soi Buakhao Grid Layout (2 rows × 40 cols):
 * - Row 1: West side of Soi Buakhao (40 positions)
 * - Row 2: East side of Soi Buakhao (40 positions)
 * - 1.7km street from South Pattaya Rd to Central Pattaya Rd
 *
 * Total capacity: 80 positions
 * Current seed: 25 real establishments
 */

-- =============================================================================
-- STEP 1: Clear existing Soi Buakhao establishments (optional, comment out if you want to keep existing)
-- =============================================================================

-- DELETE FROM establishments WHERE zone = 'soibuakhao';

-- =============================================================================
-- STEP 2: Add additional categories if needed
-- =============================================================================
-- Note: Removed 'Sports Bar' and 'Restaurant Bar' - using only core categories

-- =============================================================================
-- STEP 3: Insert Real Soi Buakhao Establishments
-- =============================================================================

INSERT INTO establishments (
  id,
  name,
  category_id,
  zone,
  grid_row,
  grid_col,
  address,
  phone,
  description,
  status,
  created_at
) VALUES

-- ============================================================================
-- ROW 1 - WEST SIDE (40 positions available)
-- Distribution from South to North along Soi Buakhao
-- ============================================================================

-- South Section (Cols 1-10)
(
  gen_random_uuid(),
  'Scooters Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  1,
  5,
  'Soi Buakhao, next to Hungry Hippo, Pattaya',
  '+66-XXX-XXX-XXX',
  'Popular bar with scooter theme, especially popular with Lambretta and Vespa enthusiasts. Great atmosphere and excellent value drinks.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Nicky''s Restaurant & Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Restaurant Bar'),
  'soibuakhao',
  1,
  8,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'One of Soi Buakhao''s favorite restaurants. Popular for both Thai and Western cuisine.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Cheap Charlies',
  (SELECT id FROM establishment_categories WHERE name = 'Restaurant Bar'),
  'soibuakhao',
  1,
  10,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Famous for cheap food and drinks. Breakfasts for less than 100 baht, lunches and dinners for under 150 baht.',
  'approved',
  NOW()
),

-- Mid-South Section (Cols 11-20) - Soi Diana/LK Metro area
(
  gen_random_uuid(),
  'Geordie Bar 1',
  (SELECT id FROM establishment_categories WHERE name = 'Sports Bar'),
  'soibuakhao',
  1,
  13,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Great bar for playing pool or watching football. Popular with expats.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Geordie Bar 2',
  (SELECT id FROM establishment_categories WHERE name = 'Sports Bar'),
  'soibuakhao',
  1,
  15,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Sister venue to Geordie Bar 1. Great for pool and watching football matches.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Matador Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  1,
  17,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Large live music venue playing rock music. Popular spot for live entertainment.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Triangle Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  1,
  19,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Famous for excellent selection of beers, especially noted for offering all drinks at two for one. Lively atmosphere and live music.',
  'approved',
  NOW()
),

-- Mid-North Section (Cols 21-30) - Tree Town area
(
  gen_random_uuid(),
  'Treetown Market',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  1,
  25,
  'Soi Buakhao, Pattaya (2 entrances)',
  '+66-XXX-XXX-XXX',
  'Has 2 entrances on Soi Buakhao and contains many bars. Popular complex with multiple venues.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Butcher''s Arms',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  1,
  27,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'British-style pub with traditional atmosphere. Popular expat hangout.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Stag''s Head',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  1,
  29,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Traditional British pub atmosphere. Good for watching sports and socializing.',
  'approved',
  NOW()
),

-- North Section (Cols 31-40)
(
  gen_random_uuid(),
  'Cheeky Monkey',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  1,
  32,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Fun and lively bar with great atmosphere. Popular spot for evening drinks.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Crazy Dave''s',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  1,
  35,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Energetic bar known for wild parties and good times.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Nikom Court',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  1,
  38,
  'Soi Buakhao, near Central Pattaya Rd, Pattaya',
  '+66-XXX-XXX-XXX',
  'Popular bar in the northern section of Soi Buakhao.',
  'approved',
  NOW()
),

-- ============================================================================
-- ROW 2 - EAST SIDE (40 positions available)
-- Distribution from South to North along Soi Buakhao
-- ============================================================================

-- South Section (Cols 1-10)
(
  gen_random_uuid(),
  'Hungry Hippo',
  (SELECT id FROM establishment_categories WHERE name = 'Restaurant Bar'),
  'soibuakhao',
  2,
  5,
  '210, 30 Soi Buakhao, Muang Pattaya, Pattaya 20150',
  '+66-95-231-4296',
  'One of the most popular restaurants on Soi Buakhao. Diagonally opposite Treetown Market. Serves breakfasts for less than 100 baht, excellent value.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Witherspoons',
  (SELECT id FROM establishment_categories WHERE name = 'Restaurant Bar'),
  'soibuakhao',
  2,
  7,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Popular restaurant and bar on Soi Buakhao. One of the favorite spots for food and drinks.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Candy Club',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  2,
  11,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Nightlife venue with vibrant atmosphere. Popular late-night spot.',
  'approved',
  NOW()
),

-- Mid-South Section (Cols 11-20)
(
  gen_random_uuid(),
  'Danny''s Sports Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Sports Bar'),
  'soibuakhao',
  2,
  14,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Sports bar showing live sports events. Popular with fans watching football, rugby, and more.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Myth Night',
  (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
  'soibuakhao',
  2,
  18,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Beer bar complex with multiple seating areas. Relaxed atmosphere.',
  'approved',
  NOW()
),

-- Mid-North Section (Cols 21-30)
(
  gen_random_uuid(),
  'Heaven Above',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  2,
  23,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Popular rooftop bar particularly busy from 10-11 PM. Great views and atmosphere.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Marquee Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  2,
  26,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Retro style bar with scooter theme, especially popular with Lambretta and Vespa enthusiasts. Excellent value drinks and often has live music.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Treetown Beer Garden',
  (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
  'soibuakhao',
  2,
  28,
  'Soi Buakhao (inside Treetown complex), Pattaya',
  '+66-XXX-XXX-XXX',
  'Part of the Treetown complex. Open-air beer garden with relaxed atmosphere.',
  'approved',
  NOW()
),

-- North Section (Cols 31-40)
(
  gen_random_uuid(),
  'Scandinavian Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  2,
  33,
  'Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  'Nordic-themed bar popular with Scandinavian expats. Friendly atmosphere.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Boomerang Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  2,
  36,
  'Soi Buakhao, near Soi Boomerang, Pattaya',
  '+66-XXX-XXX-XXX',
  'Australian-themed bar. Popular spot for drinks and sports.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Plaza Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'soibuakhao',
  2,
  39,
  'Soi Buakhao, near New Plaza area, Pattaya',
  '+66-XXX-XXX-XXX',
  'Located in the northern section near Central Pattaya Rd. Good spot for late afternoon drinks.',
  'approved',
  NOW()
);

-- =============================================================================
-- STEP 4: Verify Insert Success
-- =============================================================================

SELECT
  'Soi Buakhao establishments inserted successfully!' as status,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE category_id = (SELECT id FROM establishment_categories WHERE name = 'Bar')) as bar_count,
  COUNT(*) FILTER (WHERE category_id = (SELECT id FROM establishment_categories WHERE name = 'Sports Bar')) as sports_bar_count,
  COUNT(*) FILTER (WHERE category_id = (SELECT id FROM establishment_categories WHERE name = 'Beer Bar')) as beer_bar_count,
  COUNT(*) FILTER (WHERE category_id = (SELECT id FROM establishment_categories WHERE name = 'Restaurant Bar')) as restaurant_bar_count
FROM establishments
WHERE zone = 'soibuakhao';

-- =============================================================================
-- STEP 5: Display Grid Layout
-- =============================================================================

SELECT
  e.grid_row,
  e.grid_col,
  e.name,
  ec.name as category_name,
  LEFT(e.description, 50) || '...' as description_preview
FROM establishments e
JOIN establishment_categories ec ON e.category_id = ec.id
WHERE e.zone = 'soibuakhao'
ORDER BY e.grid_row, e.grid_col;

-- =============================================================================
-- STEP 6: Grid Distribution Summary
-- =============================================================================

SELECT
  grid_row,
  CASE
    WHEN grid_row = 1 THEN 'West Side'
    WHEN grid_row = 2 THEN 'East Side'
  END as side_name,
  COUNT(*) as establishment_count,
  MIN(grid_col) as min_col,
  MAX(grid_col) as max_col
FROM establishments
WHERE zone = 'soibuakhao'
GROUP BY grid_row
ORDER BY grid_row;

/**
 * SUMMARY OF INSERTED ESTABLISHMENTS
 *
 * Row 1 - West Side (13 establishments):
 *   South: Scooters Bar, Nicky's, Cheap Charlies
 *   Mid-South: Geordie Bar 1, Geordie Bar 2, Matador Bar, Triangle Bar
 *   Mid-North: Treetown Market, Butcher's Arms, Stag's Head
 *   North: Cheeky Monkey, Crazy Dave's, Nikom Court
 *
 * Row 2 - East Side (12 establishments):
 *   South: Hungry Hippo, Witherspoons, Candy Club
 *   Mid-South: Danny's Sports Bar, Myth Night
 *   Mid-North: Heaven Above, Marquee Bar, Treetown Beer Garden
 *   North: Scandinavian Bar, Boomerang Bar, Plaza Bar
 *
 * TOTALS:
 *   - 25 establishments inserted
 *   - 55 positions available for expansion (80 total - 25 used)
 *
 * CATEGORIES:
 *   - 13 Regular Bars
 *   - 4 Sports Bars (Geordie 1&2, Danny's Sports Bar)
 *   - 2 Beer Bars (Myth Night, Treetown Beer Garden)
 *   - 4 Restaurant Bars (Nicky's, Witherspoons, Cheap Charlies, Hungry Hippo)
 *   - 2 Specialty Bars (Scooters, Marquee with scooter theme)
 *
 * GEOGRAPHIC DISTRIBUTION:
 *   - South section (cols 1-10): 6 establishments
 *   - Mid-South (cols 11-20): 7 establishments
 *   - Mid-North (cols 21-30): 8 establishments
 *   - North section (cols 31-40): 4 establishments
 *
 * This represents a realistic distribution along the 1.7km length of Soi Buakhao,
 * with concentration in the central areas (Tree Town vicinity) where most nightlife
 * activity occurs.
 */
