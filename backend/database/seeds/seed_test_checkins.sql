-- ========================================
-- SEED: Test Check-ins for Mission System
-- Version: v10.3
-- Date: 2025-01-21
-- Description: Generate check-ins for testing mission system locally
-- ========================================

-- Purpose: Allow testing of check-in based missions without being physically in Pattaya
-- Requirements: MISSION_DEV_MODE=true must be set in backend/.env

-- Test User: test@pattamap.com (ID will be fetched dynamically)

-- ========================================
-- IMPORTANT NOTES
-- ========================================
-- 1. ZONE NAMING MISMATCH: Missions use capitalized names ("Soi 6", "Walking Street")
--    but establishments use lowercase ("soi6", "walkingstreet"). This seeder handles
--    both variations by querying actual establishment zones.
--
-- 2. JOMTIEN ZONE MISSING: Mission "Grand Tour: Jomtien" exists but NO establishments
--    have zone='Jomtien'. This mission cannot be completed until establishments are added.
--
-- 3. VERIFIED CHECK-INS: All check-ins are marked as verified=true since we're in dev mode.
--
-- 4. DATE DISTRIBUTION: Check-ins are distributed over the last 7 days to simulate
--    realistic user behavior.
-- ========================================

DO $$
DECLARE
  test_user_id UUID;
  establishment_record RECORD;
  checkin_count INT := 0;
  target_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- ========================================
  -- NOTE: PostGIS Column Structure
  -- ========================================
  -- The establishments table uses a PostGIS 'location' column (GEOGRAPHY type)
  -- instead of separate latitude/longitude columns.
  -- Extraction: ST_Y(location::geometry) → latitude, ST_X(location::geometry) → longitude

  -- ========================================
  -- 1. FETCH TEST USER ID
  -- ========================================
  SELECT id INTO test_user_id
  FROM users
  WHERE email = 'test@pattamap.com'
  LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'Test user (test@pattamap.com) not found. Please create user first.';
  END IF;

  RAISE NOTICE 'Using test user ID: %', test_user_id;

  -- ========================================
  -- 2. CLEAR EXISTING TEST CHECK-INS (optional, uncomment if needed)
  -- ========================================
  -- DELETE FROM check_ins WHERE user_id = test_user_id;
  -- RAISE NOTICE 'Cleared existing check-ins for test user';

  -- ========================================
  -- 3. GENERATE CHECK-INS FOR 5 AVAILABLE ZONES
  -- ========================================

  -- Zone 1: Soi 6 (lowercase "soi6" - 35 establishments)
  RAISE NOTICE '--- Generating check-ins for Soi 6 ---';
  FOR establishment_record IN (
    SELECT id, name, latitude, longitude
    FROM establishments
    WHERE zone = 'soi6'
    ORDER BY name
    LIMIT 6  -- 6 check-ins for Soi 6 (1 extra for daily mission)
  ) LOOP
    target_date := NOW() - (checkin_count || ' days')::INTERVAL - (checkin_count || ' hours')::INTERVAL;

    INSERT INTO check_ins (user_id, establishment_id, latitude, longitude, verified, distance_meters, created_at)
    VALUES (
      test_user_id,
      establishment_record.id,
      COALESCE(establishment_record.latitude, 12.9236),  -- Pattaya default lat
      COALESCE(establishment_record.longitude, 100.8825), -- Pattaya default lon
      true,  -- verified=true in dev mode
      0,     -- distance=0m (perfect check-in)
      target_date
    );

    checkin_count := checkin_count + 1;
    RAISE NOTICE 'Created check-in % at % (Soi 6: %)', checkin_count, target_date, establishment_record.name;
  END LOOP;

  -- Zone 2: Walking Street (lowercase "walkingstreet" - 27 establishments)
  RAISE NOTICE '--- Generating check-ins for Walking Street ---';
  FOR establishment_record IN (
    SELECT id, name, latitude, longitude
    FROM establishments
    WHERE zone = 'walkingstreet'
    ORDER BY name
    LIMIT 5
  ) LOOP
    target_date := NOW() - (checkin_count || ' days')::INTERVAL - (checkin_count || ' hours')::INTERVAL;

    INSERT INTO check_ins (user_id, establishment_id, latitude, longitude, verified, distance_meters, created_at)
    VALUES (
      test_user_id,
      establishment_record.id,
      COALESCE(establishment_record.latitude, 12.9236),
      COALESCE(establishment_record.longitude, 100.8825),
      true,
      0,
      target_date
    );

    checkin_count := checkin_count + 1;
    RAISE NOTICE 'Created check-in % at % (Walking Street: %)', checkin_count, target_date, establishment_record.name;
  END LOOP;

  -- Zone 3: LK Metro (lowercase "lkmetro" - 26 establishments)
  RAISE NOTICE '--- Generating check-ins for LK Metro ---';
  FOR establishment_record IN (
    SELECT id, name, latitude, longitude
    FROM establishments
    WHERE zone = 'lkmetro'
    ORDER BY name
    LIMIT 5
  ) LOOP
    target_date := NOW() - (checkin_count || ' days')::INTERVAL - (checkin_count || ' hours')::INTERVAL;

    INSERT INTO check_ins (user_id, establishment_id, latitude, longitude, verified, distance_meters, created_at)
    VALUES (
      test_user_id,
      establishment_record.id,
      COALESCE(establishment_record.latitude, 12.9236),
      COALESCE(establishment_record.longitude, 100.8825),
      true,
      0,
      target_date
    );

    checkin_count := checkin_count + 1;
    RAISE NOTICE 'Created check-in % at % (LK Metro: %)', checkin_count, target_date, establishment_record.name;
  END LOOP;

  -- Zone 4: Treetown (lowercase "treetown" - 21 establishments)
  RAISE NOTICE '--- Generating check-ins for Treetown ---';
  FOR establishment_record IN (
    SELECT id, name, latitude, longitude
    FROM establishments
    WHERE zone = 'treetown'
    ORDER BY name
    LIMIT 5
  ) LOOP
    target_date := NOW() - (checkin_count || ' days')::INTERVAL - (checkin_count || ' hours')::INTERVAL;

    INSERT INTO check_ins (user_id, establishment_id, latitude, longitude, verified, distance_meters, created_at)
    VALUES (
      test_user_id,
      establishment_record.id,
      COALESCE(establishment_record.latitude, 12.9236),
      COALESCE(establishment_record.longitude, 100.8825),
      true,
      0,
      target_date
    );

    checkin_count := checkin_count + 1;
    RAISE NOTICE 'Created check-in % at % (Treetown: %)', checkin_count, target_date, establishment_record.name;
  END LOOP;

  -- Zone 5: Soi Buakhao (lowercase "soibuakhao" - 24 establishments)
  RAISE NOTICE '--- Generating check-ins for Soi Buakhao ---';
  FOR establishment_record IN (
    SELECT id, name, latitude, longitude
    FROM establishments
    WHERE zone = 'soibuakhao'
    ORDER BY name
    LIMIT 5
  ) LOOP
    target_date := NOW() - (checkin_count || ' days')::INTERVAL - (checkin_count || ' hours')::INTERVAL;

    INSERT INTO check_ins (user_id, establishment_id, latitude, longitude, verified, distance_meters, created_at)
    VALUES (
      test_user_id,
      establishment_record.id,
      COALESCE(establishment_record.latitude, 12.9236),
      COALESCE(establishment_record.longitude, 100.8825),
      true,
      0,
      target_date
    );

    checkin_count := checkin_count + 1;
    RAISE NOTICE 'Created check-in % at % (Soi Buakhao: %)', checkin_count, target_date, establishment_record.name;
  END LOOP;

  -- ========================================
  -- 4. SUMMARY
  -- ========================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test Check-ins Seeded Successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total check-ins created: %', checkin_count;
  RAISE NOTICE 'User: test@pattamap.com (ID: %)', test_user_id;
  RAISE NOTICE 'Zones covered: 5/6 (Soi 6, Walking Street, LK Metro, Treetown, Soi Buakhao)';
  RAISE NOTICE 'Date range: Last 7 days';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MISSION COMPLETION STATUS:';
  RAISE NOTICE '✅ Daily: Explorer (1 check-in today)';
  RAISE NOTICE '✅ Weekly: Weekly Explorer (3+ zones visited)';
  RAISE NOTICE '✅ Weekly: Zone Master Weekly (10+ check-ins)';
  RAISE NOTICE '✅ Narrative: Grand Tour Step 1-5 (5 check-ins per zone)';
  RAISE NOTICE '❌ Narrative: Grand Tour Jomtien (zone missing in DB)';
  RAISE NOTICE '❌ Narrative: Grand Tour Complete (requires Jomtien)';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Verify check-ins: SELECT * FROM check_ins WHERE user_id = ''%'';', test_user_id;
  RAISE NOTICE '2. Check mission progress: SELECT * FROM user_mission_progress WHERE user_id = ''%'';', test_user_id;
  RAISE NOTICE '3. Award XP manually: SELECT award_xp(''%'', 15, ''check_in'', ''establishment'', establishment_id) FROM check_ins WHERE user_id = ''%'' LIMIT 1;', test_user_id, test_user_id;
  RAISE NOTICE '========================================';

END $$;

-- ========================================
-- VERIFICATION QUERIES (run after seeding)
-- ========================================

-- 1. Count check-ins by zone for test user
-- SELECT
--   e.zone,
--   COUNT(*) as checkin_count,
--   ARRAY_AGG(e.name) as establishments
-- FROM check_ins c
-- JOIN establishments e ON c.establishment_id = e.id
-- WHERE c.user_id = (SELECT id FROM users WHERE email = 'test@pattamap.com')
-- GROUP BY e.zone
-- ORDER BY e.zone;

-- 2. View all check-ins chronologically
-- SELECT
--   c.created_at::date as check_date,
--   c.verified,
--   e.zone,
--   e.name as establishment_name,
--   c.distance_meters
-- FROM check_ins c
-- JOIN establishments e ON c.establishment_id = e.id
-- WHERE c.user_id = (SELECT id FROM users WHERE email = 'test@pattamap.com')
-- ORDER BY c.created_at DESC;

-- 3. Check mission progress
-- SELECT
--   m.name as mission_name,
--   m.type as mission_type,
--   ump.current_progress,
--   m.requirements->>'count' as required_count,
--   ump.completed,
--   ump.completed_at
-- FROM user_mission_progress ump
-- JOIN missions m ON ump.mission_id = m.id
-- WHERE ump.user_id = (SELECT id FROM users WHERE email = 'test@pattamap.com')
--   AND m.requirements->>'type' IN ('check_in', 'check_in_zone', 'visit_zones', 'check_in_all_zones')
-- ORDER BY m.type, m.name;

-- ========================================
-- TROUBLESHOOTING
-- ========================================

-- If missions are not tracking, ensure:
-- 1. MISSION_DEV_MODE=true in backend/.env
-- 2. Backend server restarted after .env change
-- 3. missionTrackingService is called in gamificationController.ts:432
-- 4. RPC function update_mission_progress() exists in Supabase

-- To manually trigger mission tracking:
-- SELECT * FROM get_user_active_missions((SELECT id FROM users WHERE email = 'test@pattamap.com'));

-- To reset mission progress:
-- DELETE FROM user_mission_progress WHERE user_id = (SELECT id FROM users WHERE email = 'test@pattamap.com');

-- ========================================
-- END OF SEED
-- ========================================
