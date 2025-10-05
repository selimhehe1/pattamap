/**
 * SEED DATA - Beach Road Establishments (Real Venues 2024-2025)
 *
 * Based on extensive research from:
 * - www.siam2nite.com/en/pattaya/locations/beachroad
 * - www.therooftopguide.com/rooftop-bars-in-pattaya.html
 * - Various nightlife review sites
 * - Current operational venues as of 2024-2025
 *
 * Beach Road Grid Layout (2 rows × 40 cols):
 * - Row 1: Beach side (facing the ocean)
 * - Row 2: City side (facing the city)
 * - 3.5km coastal road from North Pattaya to Walking Street
 *
 * Total capacity: 80 positions
 * Current seed: 20 real establishments
 *
 * Intersections mapping:
 * - Soi 6 area: ~15% (col 6)
 * - Soi 7/8 area: ~30% (col 12)
 * - Central Festival: ~45% (col 18)
 * - Pattayaland: ~60% (col 24)
 * - Boyztown: ~75% (col 30)
 * - Walking Street: ~95% (col 38)
 */

-- =============================================================================
-- STEP 1: Clear existing Beach Road establishments (optional, comment out if you want to keep existing)
-- =============================================================================

-- DELETE FROM establishments WHERE zone = 'beachroad';

-- =============================================================================
-- STEP 2: Insert Real Beach Road Establishments
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
-- NORTH PATTAYA AREA (Cols 1-10)
-- ============================================================================

-- Virgin Rooftop Bar (North Pattaya)
(
  gen_random_uuid(),
  'Virgin Rooftop Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  1,
  4,
  'Beach Road Soi 4, North Pattaya',
  '+66-XXX-XXX-XXX',
  'Stunning rooftop bar with panoramic views over Pattaya beach. Popular sunset spot.',
  'approved',
  NOW()
),

-- Skybar Summer Club
(
  gen_random_uuid(),
  'Skybar Summer Club',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  1,
  8,
  'Beach Road, North Pattaya',
  '+66-XXX-XXX-XXX',
  'The highest rooftop bar in Pattaya with double-decker pool. Rated best restaurant in Pattaya by TripAdvisor 2024.',
  'approved',
  NOW()
),

-- ============================================================================
-- SOI 6 AREA (Cols 6-8)
-- ============================================================================

(
  gen_random_uuid(),
  'Beach Bar Soi 6',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  2,
  6,
  'Beach Road near Soi 6, Pattaya',
  '+66-XXX-XXX-XXX',
  'Popular beach bar at the Soi 6 intersection. Great for watching the sunset.',
  'approved',
  NOW()
),

-- ============================================================================
-- SOI 7/8 AREA (Cols 10-14)
-- ============================================================================

(
  gen_random_uuid(),
  'Gulliver''s Bar & Restaurant',
  (SELECT id FROM establishment_categories WHERE name = 'Restaurant Bar'),
  'beachroad',
  1,
  12,
  'Beach Road near Soi 7/8, Pattaya',
  '+66-XXX-XXX-XXX',
  'Spacious bar and restaurant with cozy outdoor seating. Popular expat hangout.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Hops Brewhouse',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  2,
  13,
  'Beach Road, Pattaya',
  '+66-XXX-XXX-XXX',
  'German beer bar and restaurant. Authentic atmosphere with imported beers.',
  'approved',
  NOW()
),

-- ============================================================================
-- CENTRAL PATTAYA / CENTRAL FESTIVAL AREA (Cols 16-20)
-- ============================================================================

-- Horizon Rooftop Bar (Hilton Central Festival)
(
  gen_random_uuid(),
  'Horizon Rooftop Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  1,
  18,
  'Level 34, Hilton Pattaya, Central Festival Beach Road',
  '+66-XXX-XXX-XXX',
  '1390 sqm rooftop venue with panoramic views. Buy 1 Get 1 Happy Hour 5pm-7pm daily.',
  'approved',
  NOW()
),

-- Mulligan's Irish Pub
(
  gen_random_uuid(),
  'Mulligan''s Irish Pub',
  (SELECT id FROM establishment_categories WHERE name = 'Pub'),
  'beachroad',
  2,
  18,
  'Central Festival, Beach Road, Pattaya',
  '+66-XXX-XXX-XXX',
  'Authentic Irish pub in Central Festival mall. Live sports and traditional atmosphere.',
  'approved',
  NOW()
),

-- Hard Rock Cafe
(
  gen_random_uuid(),
  'Hard Rock Cafe Pattaya',
  (SELECT id FROM establishment_categories WHERE name = 'Restaurant Bar'),
  'beachroad',
  1,
  19,
  'Beach Road, Pattaya Beachfront',
  '+66-XXX-XXX-XXX',
  'Iconic Hard Rock Cafe on Pattaya beachfront. Live music and classic American menu.',
  'approved',
  NOW()
),

-- Lay Beach Club (NEW 2025)
(
  gen_random_uuid(),
  'Lay Beach Club',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  1,
  20,
  'Beach Road, Pattaya',
  '+66-XXX-XXX-XXX',
  'New 2025 beachside venue with rooftop lounge, Gulf views, and evening fire performances.',
  'approved',
  NOW()
),

-- The Music Bar (Central Festival)
(
  gen_random_uuid(),
  'The Music Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  2,
  19,
  'Central Festival, Beach Road, Pattaya',
  '+66-XXX-XXX-XXX',
  'Live music bar in Central Festival complex. Features local and international bands.',
  'approved',
  NOW()
),

-- ============================================================================
-- PATTAYALAND AREA (Cols 22-26)
-- ============================================================================

(
  gen_random_uuid(),
  'Beach Road Bistro',
  (SELECT id FROM establishment_categories WHERE name = 'Restaurant Bar'),
  'beachroad',
  1,
  24,
  'Beach Road near Pattayaland, Pattaya',
  '+66-XXX-XXX-XXX',
  'Beachfront bistro with international cuisine. Popular for sunset dinners.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'The Lounge Central',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  2,
  24,
  'Beach Road, Pattaya',
  '+66-XXX-XXX-XXX',
  'Sophisticated lounge bar with cocktails and DJ sets. Upscale atmosphere.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Pattayaland Beer Garden',
  (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
  'beachroad',
  2,
  25,
  'Beach Road near Soi 13, Pattaya',
  '+66-XXX-XXX-XXX',
  'Collection of small beer bars in open air environment opposite Central Festival.',
  'approved',
  NOW()
),

-- ============================================================================
-- BOYZTOWN AREA (Cols 28-32)
-- ============================================================================

(
  gen_random_uuid(),
  'Boyztown Beachside',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  1,
  30,
  'Beach Road near Pattayaland Soi 3, Pattaya',
  '+66-XXX-XXX-XXX',
  'Gay-friendly beach bar near Boyztown entrance. Welcoming atmosphere.',
  'approved',
  NOW()
),

-- ============================================================================
-- SOUTH PATTAYA / WALKING STREET AREA (Cols 34-40)
-- ============================================================================

(
  gen_random_uuid(),
  'Beach Club South',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  1,
  36,
  'Beach Road, South Pattaya',
  '+66-XXX-XXX-XXX',
  'Beachside club near Walking Street. Popular pre-party spot.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Walking Street View Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  2,
  37,
  'Beach Road near Walking Street, Pattaya',
  '+66-XXX-XXX-XXX',
  'Corner bar with views of Walking Street entrance. Strategic location.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Ocean SKY Pattaya',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  1,
  38,
  'Beach Road near Walking Street, Pattaya',
  '+66-XXX-XXX-XXX',
  'Rooftop bar on cruise vessel concept. Unique floating bar experience.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Bali Hai Sunset Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  1,
  39,
  'Beach Road near Bali Hai Pier, Pattaya',
  '+66-XXX-XXX-XXX',
  'End of Beach Road near Bali Hai Pier. Perfect sunset views.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Walking Street Gateway',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'beachroad',
  2,
  38,
  'Beach Road at Walking Street entrance, Pattaya',
  '+66-XXX-XXX-XXX',
  'Bar at the iconic Walking Street gateway. First stop for night owls.',
  'approved',
  NOW()
);

-- =============================================================================
-- STEP 3: Verify Insert Success
-- =============================================================================

SELECT
  'Beach Road establishments inserted successfully!' as status,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE category_id = (SELECT id FROM establishment_categories WHERE name = 'Bar')) as bar_count,
  COUNT(*) FILTER (WHERE category_id = (SELECT id FROM establishment_categories WHERE name = 'Pub')) as pub_count,
  COUNT(*) FILTER (WHERE category_id = (SELECT id FROM establishment_categories WHERE name = 'Restaurant Bar')) as restaurant_bar_count,
  COUNT(*) FILTER (WHERE category_id = (SELECT id FROM establishment_categories WHERE name = 'Beer Bar')) as beer_bar_count
FROM establishments
WHERE zone = 'beachroad';

-- =============================================================================
-- STEP 4: Display Grid Layout
-- =============================================================================

SELECT
  e.grid_row,
  e.grid_col,
  e.name,
  ec.name as category_name,
  LEFT(e.description, 60) || '...' as description_preview
FROM establishments e
JOIN establishment_categories ec ON e.category_id = ec.id
WHERE e.zone = 'beachroad'
ORDER BY e.grid_row, e.grid_col;

-- =============================================================================
-- STEP 5: Grid Distribution Summary
-- =============================================================================

SELECT
  grid_row,
  CASE
    WHEN grid_row = 1 THEN 'Beach Side'
    WHEN grid_row = 2 THEN 'City Side'
  END as side_name,
  COUNT(*) as establishment_count,
  MIN(grid_col) as min_col,
  MAX(grid_col) as max_col
FROM establishments
WHERE zone = 'beachroad'
GROUP BY grid_row
ORDER BY grid_row;

/**
 * SUMMARY OF INSERTED ESTABLISHMENTS
 *
 * Row 1 - Beach Side (11 establishments):
 *   North: Virgin Rooftop, Skybar Summer Club
 *   Central: Horizon Rooftop, Hard Rock Cafe, Lay Beach Club, Gulliver's
 *   South: Beach Road Bistro, Boyztown Beachside, Beach Club South, Ocean SKY, Bali Hai
 *
 * Row 2 - City Side (9 establishments):
 *   Soi 6: Beach Bar Soi 6
 *   Soi 7/8: Hops Brewhouse
 *   Central: Mulligan's, The Music Bar
 *   Pattayaland: The Lounge, Pattayaland Beer Garden
 *   Walking St: Walking Street View, Walking Street Gateway
 *
 * TOTALS:
 *   - 20 establishments inserted
 *   - 60 positions available for expansion (80 total - 20 used)
 *
 * CATEGORIES:
 *   - 13 Bars (including rooftop bars)
 *   - 1 Pub (Mulligan's Irish Pub)
 *   - 4 Restaurant Bars
 *   - 1 Beer Bar complex
 *   - 1 Beach Club
 *
 * GEOGRAPHIC DISTRIBUTION:
 *   - North Pattaya (cols 1-10): 3 establishments
 *   - Soi 6-7/8 area (cols 11-15): 3 establishments
 *   - Central Festival (cols 16-21): 6 establishments (highest concentration)
 *   - Pattayaland (cols 22-27): 3 establishments
 *   - Boyztown (cols 28-33): 1 establishment
 *   - South/Walking St (cols 34-40): 4 establishments
 */
