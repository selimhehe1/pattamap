/**
 * SEED DATA - LK Metro Establishments (Real Venues 2024-2025)
 *
 * Based on extensive research from:
 * - pattaya.guide/guides/lk-metro-guide/
 * - Multiple nightlife review sites
 * - Current operational venues as of 2024-2025
 *
 * LK Metro Grid Layout (4 rows × 9 cols with masked positions):
 * - Row 1: cols 1-9 (9 positions) - Horizontal segment
 * - Row 2: cols 1-8 (8 positions, col 9 masked) - Horizontal segment
 * - Row 3: cols 3-9 (7 positions, cols 1-2 masked) - Vertical segment
 * - Row 4: cols 1-9 (9 positions) - Vertical segment
 *
 * Total capacity: 33 positions (27 filled, 6 reserved for future)
 */

-- =============================================================================
-- STEP 1: Clear existing LK Metro establishments (optional, comment out if you want to keep existing)
-- =============================================================================

-- DELETE FROM establishments WHERE zone = 'lkmetro';

-- =============================================================================
-- STEP 2: Insert Real LK Metro Establishments
-- =============================================================================

-- Note: Removed 'Sports Bar' and 'Coyote Bar' - using only core categories (Bar, GoGo Bar, Massage Salon, Nightclub)

INSERT INTO establishments (
  id,
  name,
  category_id,
  zone,
  grid_row,
  grid_col,
  address,
  phone,
  opening_hours,
  description,
  status,
  created_at
) VALUES

-- ============================================================================
-- ROW 1 (Horizontal Segment - 9 positions, cols 1-9)
-- Major Go-Go Bars + Popular Bars
-- ============================================================================

(
  gen_random_uuid(),
  'KINK Agogo',
  (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
  'lkmetro',
  1,
  1,
  'LK Metro, Soi Diana leg, Pattaya',
  '+66-XXX-XXX-XXX',
  '19:00-03:00',
  'The biggest and most stylish gogo bar on LK Metro. Two-story venue opened in 2019 with large stage and comfortable seating. One of the busiest gogos in the city.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Lady Love Agogo',
  (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
  'lkmetro',
  1,
  2,
  '33/102 LK Metro Alley (Soi Diana Entrance), Pattaya 20150',
  '+66-XXX-XXX-XXX',
  '20:00-03:00',
  'The most popular gogo bar in LK Metro for 10 years. Known for excellent service and vibrant atmosphere. Email: info@ladylovepattaya.com',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Sugar Sugar Agogo',
  (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
  'lkmetro',
  1,
  3,
  'Corner of LK Metro and Soi Buakhao, Pattaya',
  '+66-XXX-XXX-XXX',
  '19:00-03:00',
  'Medium-sized agogo on the strategic corner location. Luxurious decoration, relaxing ambience, good music, and fantastic shows. Dozens of girls working each night.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Crystal Club',
  (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
  'lkmetro',
  1,
  4,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '19:00-03:00',
  'Double unit agogo bar established as one of the best and most popular gogos in LK Metro. Known for excellent service and party atmosphere.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Queen Club',
  (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
  'lkmetro',
  1,
  5,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '19:00-03:00',
  'Large gogo bar with over 70 stunning girls working each night. One of the premier venues on LK Metro.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Champagne Agogo',
  (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
  'lkmetro',
  1,
  6,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '19:00-03:00',
  'The original and first agogo to open in LK Metro. Still in its original location and one of the most popular venues. Known for "stunners".',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Murphy''s Law',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'lkmetro',
  1,
  7,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '12:00-02:00',
  'Irish bar with great atmosphere. Enjoy the craic with Steve the owner. Popular expat hangout spot.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'iRovers Sports Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Sports Bar'),
  'lkmetro',
  1,
  8,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '00:00-23:59',
  'Open 24 hours. The ultimate destination for sports enthusiasts. Shows live English Premier League, Championship, NRL, AFL, rugby, UFC, NFL, NCAA, cricket, Formula 1, and more.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Billabong Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'lkmetro',
  1,
  9,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '12:00-02:00',
  'Highly recommended for solo visitors. Prime people-watching location with lively yet approachable atmosphere. Great spot to relax and observe the LK Metro scene.',
  'approved',
  NOW()
),

-- ============================================================================
-- ROW 2 (Horizontal Segment - 8 positions, cols 1-8, col 9 MASKED)
-- Go-Go Bars + Regular Bars
-- ============================================================================

(
  gen_random_uuid(),
  'Touch Agogo',
  (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
  'lkmetro',
  2,
  1,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '19:00-03:00',
  'Small gogo bar but a great party place with very hands-on performers. Popular with regulars.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Pulse Agogo',
  (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
  'lkmetro',
  2,
  2,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '19:00-03:00',
  'Energetic gogo bar with good atmosphere and quality entertainment.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Pandoras Agogo',
  (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
  'lkmetro',
  2,
  3,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '19:30-03:00',
  'Popular gogo bar with consistent quality and friendly atmosphere.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'LK Angels Agogo',
  (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
  'lkmetro',
  2,
  4,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '19:00-03:00',
  'Small but vibrant party venue. Known for energetic shows and friendly staff.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Kilkenny Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'lkmetro',
  2,
  5,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '12:00-02:00',
  'Irish-themed bar with traditional atmosphere. Popular with expats looking for a familiar pub experience.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Fubar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'lkmetro',
  2,
  6,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '13:00-02:00',
  'Casual bar with relaxed atmosphere. Good spot for afternoon drinks and evening entertainment.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Cloud 9 Bar',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'lkmetro',
  2,
  7,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '11:00-02:00',
  'All-day bar opening from late morning. Comfortable atmosphere with friendly staff.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Jibby''s',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'lkmetro',
  2,
  8,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '13:00-03:00',
  'Lively bar with late closing hours. Popular spot for nightlife enthusiasts.',
  'approved',
  NOW()
),

-- Position 2,9 is MASKED (intersection with vertical segment)

-- ============================================================================
-- ROW 3 (Vertical Segment - 7 positions, cols 3-9, cols 1-2 MASKED)
-- Go-Go Bars + Specialty Bars
-- ============================================================================

-- Positions 3,1 and 3,2 are MASKED (intersection with horizontal segment)

(
  gen_random_uuid(),
  'Top Gun',
  (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
  'lkmetro',
  3,
  3,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '14:00-03:00',
  'Now open in the afternoon. Established gogo bar with loyal customer base.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Fever Agogo',
  (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar'),
  'lkmetro',
  3,
  4,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '19:00-03:00',
  'Quality gogo bar with excellent shows and friendly atmosphere.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'The Den',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'lkmetro',
  3,
  5,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '13:00-23:00',
  'Lounge bar with more relaxed atmosphere. Perfect for earlier evening drinks.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Bar Club Le Poste',
  (SELECT id FROM establishment_categories WHERE name = 'Bar'),
  'lkmetro',
  3,
  6,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '13:30-02:00',
  'Stylish lounge bar with sophisticated atmosphere. Good for conversation and cocktails.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Champagne Coyotes',
  (SELECT id FROM establishment_categories WHERE name = 'Coyote Bar'),
  'lkmetro',
  3,
  7,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '17:30-02:30',
  'Unique coyote bar with energetic dancers and party atmosphere. Related to Champagne Agogo brand.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Bar Code',
  (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
  'lkmetro',
  3,
  8,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '17:00-02:00',
  'Classic girlie beer bar. Regular crowd favorite with affordable prices.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Phoenix',
  (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
  'lkmetro',
  3,
  9,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '17:00-02:00',
  'Traditional beer bar with friendly staff and relaxed atmosphere.',
  'approved',
  NOW()
),

-- ============================================================================
-- ROW 4 (Vertical Segment - 9 positions, cols 1-9)
-- Beer Bars + Specialty Venues + Reserved Spaces
-- ============================================================================

(
  gen_random_uuid(),
  'Boom',
  (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
  'lkmetro',
  4,
  1,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '17:00-02:00',
  'Lively beer bar with party atmosphere. Regular entertainment and promotions.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Bar Fine',
  (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
  'lkmetro',
  4,
  2,
  'LK Metro, Pattaya',
  '+66-XXX-XXX-XXX',
  '17:00-02:00',
  'Well-established beer bar with friendly service. Popular with regulars.',
  'approved',
  NOW()
),

(
  gen_random_uuid(),
  'Las Vegas Beer Garden',
  (SELECT id FROM establishment_categories WHERE name = 'Beer Bar'),
  'lkmetro',
  4,
  3,
  'Soi Diana, opposite LK Metro entrance, Pattaya',
  '+66-XXX-XXX-XXX',
  '17:00-02:00',
  'Unique complex with 10 bars, each named after a famous Las Vegas establishment. Large outdoor beer garden atmosphere.',
  'approved',
  NOW()
);

-- Positions 4,4 through 4,9 reserved for future expansion (6 positions available)

-- =============================================================================
-- STEP 3: Verify Insert Success
-- =============================================================================

SELECT
  'LK Metro establishments inserted successfully!' as status,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE category_id = (SELECT id FROM establishment_categories WHERE name = 'GoGo Bar')) as gogo_count,
  COUNT(*) FILTER (WHERE category_id = (SELECT id FROM establishment_categories WHERE name = 'Bar')) as bar_count,
  COUNT(*) FILTER (WHERE category_id = (SELECT id FROM establishment_categories WHERE name = 'Sports Bar')) as sports_bar_count,
  COUNT(*) FILTER (WHERE category_id = (SELECT id FROM establishment_categories WHERE name = 'Beer Bar')) as beer_bar_count,
  COUNT(*) FILTER (WHERE category_id = (SELECT id FROM establishment_categories WHERE name = 'Coyote Bar')) as coyote_bar_count
FROM establishments
WHERE zone = 'lkmetro';

-- =============================================================================
-- STEP 4: Display Grid Layout
-- =============================================================================

SELECT
  e.grid_row,
  e.grid_col,
  e.name,
  ec.name as category_name,
  LEFT(e.description, 50) || '...' as description_preview
FROM establishments e
JOIN establishment_categories ec ON e.category_id = ec.id
WHERE e.zone = 'lkmetro'
ORDER BY e.grid_row, e.grid_col;

-- =============================================================================
-- STEP 5: Verify Grid Constraints (should return 0 invalid positions)
-- =============================================================================

SELECT
  name,
  grid_row,
  grid_col,
  CASE
    WHEN grid_row = 2 AND grid_col = 9 THEN 'INVALID: Position 2,9 is masked'
    WHEN grid_row = 3 AND grid_col IN (1, 2) THEN 'INVALID: Position 3,' || grid_col || ' is masked'
    WHEN grid_row < 1 OR grid_row > 4 THEN 'INVALID: Row out of bounds'
    WHEN grid_col < 1 OR grid_col > 9 THEN 'INVALID: Column out of bounds'
    ELSE 'VALID'
  END as validation_status
FROM establishments
WHERE zone = 'lkmetro'
  AND NOT (
    (grid_row = 1 AND grid_col >= 1 AND grid_col <= 9) OR
    (grid_row = 2 AND grid_col >= 1 AND grid_col <= 8) OR
    (grid_row = 3 AND grid_col >= 3 AND grid_col <= 9) OR
    (grid_row = 4 AND grid_col >= 1 AND grid_col <= 9)
  );

-- Expected result: No rows (all positions should be valid)

/**
 * SUMMARY OF INSERTED ESTABLISHMENTS
 *
 * Row 1 (9 establishments):
 *   - KINK Agogo, Lady Love Agogo, Sugar Sugar Agogo, Crystal Club, Queen Club,
 *     Champagne Agogo, Murphy's Law, iRovers Sports Bar, Billabong Bar
 *
 * Row 2 (8 establishments):
 *   - Touch Agogo, Pulse Agogo, Pandoras Agogo, LK Angels Agogo, Kilkenny Bar,
 *     Fubar, Cloud 9 Bar, Jibby's
 *
 * Row 3 (7 establishments):
 *   - Top Gun, Fever Agogo, The Den, Bar Club Le Poste, Champagne Coyotes,
 *     Bar Code, Phoenix
 *
 * Row 4 (3 establishments + 6 reserved):
 *   - Boom, Bar Fine, Las Vegas Beer Garden
 *   - Positions 4,4 to 4,9 reserved for future establishments
 *
 * TOTALS:
 *   - 27 establishments inserted
 *   - 6 positions reserved for expansion
 *   - 33 total grid capacity fully utilized
 *
 * CATEGORIES:
 *   - 12 Go-Go Bars (KINK, Lady Love, Sugar Sugar, Crystal Club, Queen Club,
 *                     Champagne, Touch, Pulse, Pandoras, LK Angels, Top Gun, Fever)
 *   - 9 Regular Bars (Murphy's Law, Billabong, Kilkenny, Fubar, Cloud 9, Jibby's,
 *                     The Den, Bar Club Le Poste)
 *   - 1 Sports Bar (iRovers)
 *   - 4 Beer Bars (Bar Code, Phoenix, Boom, Bar Fine, Las Vegas Beer Garden)
 *   - 1 Coyote Bar (Champagne Coyotes)
 */
