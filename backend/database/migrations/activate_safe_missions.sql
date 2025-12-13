-- ========================================
-- MIGRATION: Activate Safe Missions
-- Version: v10.3
-- Date: 2025-01-21
-- Description: Activate 22/30 missions that don't require photo tracking
-- ========================================
BEGIN;

-- Purpose: Activate missions that are production-ready with current features
-- Excludes: 5 photo-dependent missions + 2 event missions (seasonal)
-- Coverage: 22/30 missions (73%)

-- ========================================
-- ACTIVATION STRATEGY
-- ========================================

-- ACTIVATE (22 missions):
-- - All check-in based missions ✅
-- - All review missions (without photo requirement) ✅
-- - All social missions (follow, vote, helpful votes) ✅
-- - All narrative quests (except photo-dependent steps) ✅

-- EXCLUDE (8 missions):
-- - 5 photo-dependent missions (require Phase 3 photo tracking)
-- - 2 event missions (seasonal, will be activated manually)

-- ========================================
-- 1. ACTIVATE SAFE DAILY MISSIONS (4/6)
-- ========================================

-- Activate: Daily Reviewer (write 1 review - no photo required)
UPDATE missions
SET is_active = true
WHERE name = 'Daily Reviewer'
  AND type = 'daily';

-- Activate: Explorer (check-in 1 establishment)
UPDATE missions
SET is_active = true
WHERE name = 'Explorer'
  AND type = 'daily';

-- Activate: Social Networker (follow 2 users)
UPDATE missions
SET is_active = true
WHERE name = 'Social Networker'
  AND type = 'daily';

-- Activate: Helpful Community Member (vote helpful on 5 reviews)
UPDATE missions
SET is_active = true
WHERE name = 'Helpful Community Member'
  AND type = 'daily';

-- ❌ EXCLUDE: Photo Hunter (requires photo tracking)
UPDATE missions
SET is_active = false
WHERE name = 'Photo Hunter'
  AND type = 'daily';

-- ❌ EXCLUDE: Quality Reviewer (requires photo attachment)
UPDATE missions
SET is_active = false
WHERE name = 'Quality Reviewer'
  AND type = 'daily';

-- ========================================
-- 2. ACTIVATE SAFE WEEKLY MISSIONS (4/6)
-- ========================================

-- Activate: Weekly Explorer (visit 3 zones)
UPDATE missions
SET is_active = true
WHERE name = 'Weekly Explorer'
  AND type = 'weekly';

-- Activate: Helpful Week (receive 10 helpful votes)
UPDATE missions
SET is_active = true
WHERE name = 'Helpful Week'
  AND type = 'weekly';

-- Activate: Social Week (gain 5 followers)
UPDATE missions
SET is_active = true
WHERE name = 'Social Week'
  AND type = 'weekly';

-- Activate: Zone Master Weekly (check-in 10 establishments)
UPDATE missions
SET is_active = true
WHERE name = 'Zone Master Weekly'
  AND type = 'weekly';

-- ❌ EXCLUDE: Weekly Contributor (requires photo attachment)
UPDATE missions
SET is_active = false
WHERE name = 'Weekly Contributor'
  AND type = 'weekly';

-- ❌ EXCLUDE: Photo Marathon (requires photo tracking)
UPDATE missions
SET is_active = false
WHERE name = 'Photo Marathon'
  AND type = 'weekly';

-- ========================================
-- 3. ACTIVATE NARRATIVE QUESTS (14/16)
-- ========================================

-- Quest 1: Grand Tour of Pattaya (7/7 steps - ALL SAFE) ✅

UPDATE missions
SET is_active = true
WHERE name IN (
  'Grand Tour: Soi 6',
  'Grand Tour: Walking Street',
  'Grand Tour: LK Metro',
  'Grand Tour: Treetown',
  'Grand Tour: Soi Buakhao',
  'Grand Tour: Jomtien',
  'Grand Tour: Complete'
)
AND type = 'narrative';

-- Quest 2: Reviewer Path (4/5 steps - Step 2 excluded)

-- Activate Step 1: First Steps (5 reviews, no photo)
UPDATE missions
SET is_active = true
WHERE name = 'Reviewer Path: First Steps'
  AND type = 'narrative';

-- ❌ EXCLUDE Step 2: Getting Better (requires photos)
UPDATE missions
SET is_active = false
WHERE name = 'Reviewer Path: Getting Better'
  AND type = 'narrative';

-- Activate Step 3: Quality Matters (200+ chars, no photo)
UPDATE missions
SET is_active = true
WHERE name = 'Reviewer Path: Quality Matters'
  AND type = 'narrative';

-- Activate Step 4: Consistency (25 reviews total)
UPDATE missions
SET is_active = true
WHERE name = 'Reviewer Path: Consistency'
  AND type = 'narrative';

-- Activate Step 5: Master Critic (50 reviews total)
UPDATE missions
SET is_active = true
WHERE name = 'Reviewer Path: Master Critic'
  AND type = 'narrative';

-- Quest 3: Social Butterfly (4/4 steps - ALL SAFE) ✅

UPDATE missions
SET is_active = true
WHERE name IN (
  'Social Butterfly: First Connections',
  'Social Butterfly: Growing Network',
  'Social Butterfly: Helpful Member',
  'Social Butterfly: Community Leader'
)
AND type = 'narrative';

-- ========================================
-- 4. KEEP EVENT MISSIONS INACTIVE (0/2)
-- ========================================

-- Event missions remain inactive until seasonal activation

UPDATE missions
SET is_active = false
WHERE type = 'event'
  AND name IN ('Songkran Celebration', 'Halloween Night Out');

-- ========================================
-- 5. VERIFICATION QUERIES
-- ========================================

-- Verify activation counts
DO $$
DECLARE
  v_active_daily INT;
  v_active_weekly INT;
  v_active_narrative INT;
  v_active_event INT;
  v_total_active INT;
  v_inactive_count INT;
BEGIN
  -- Count active missions by type
  SELECT COUNT(*) INTO v_active_daily
  FROM missions
  WHERE type = 'daily' AND is_active = true;

  SELECT COUNT(*) INTO v_active_weekly
  FROM missions
  WHERE type = 'weekly' AND is_active = true;

  SELECT COUNT(*) INTO v_active_narrative
  FROM missions
  WHERE type = 'narrative' AND is_active = true;

  SELECT COUNT(*) INTO v_active_event
  FROM missions
  WHERE type = 'event' AND is_active = true;

  SELECT COUNT(*) INTO v_total_active
  FROM missions
  WHERE is_active = true;

  SELECT COUNT(*) INTO v_inactive_count
  FROM missions
  WHERE is_active = false;

  -- Display results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MISSION ACTIVATION COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Active Daily Missions: % / 6', v_active_daily;
  RAISE NOTICE 'Active Weekly Missions: % / 6', v_active_weekly;
  RAISE NOTICE 'Active Narrative Quests: % / 16', v_active_narrative;
  RAISE NOTICE 'Active Event Missions: % / 2', v_active_event;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TOTAL ACTIVE: % / 30', v_total_active;
  RAISE NOTICE 'TOTAL INACTIVE: % / 30', v_inactive_count;
  RAISE NOTICE '========================================';

  -- Validation
  IF v_total_active = 22 THEN
    RAISE NOTICE '✅ SUCCESS: 22 safe missions activated (73%% coverage)';
  ELSE
    RAISE WARNING '⚠️  WARNING: Expected 22 active missions, got %', v_total_active;
  END IF;

  IF v_inactive_count = 8 THEN
    RAISE NOTICE '✅ SUCCESS: 8 missions remain inactive (5 photo + 2 event + 1 quest step)';
  ELSE
    RAISE WARNING '⚠️  WARNING: Expected 8 inactive missions, got %', v_inactive_count;
  END IF;
END $$;

-- ========================================
-- 6. LIST INACTIVE MISSIONS (FOR REFERENCE)
-- ========================================

-- Display inactive missions with reason
DO $$
DECLARE
  mission_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INACTIVE MISSIONS (8)';
  RAISE NOTICE '========================================';

  FOR mission_record IN
    SELECT name, type, requirements
    FROM missions
    WHERE is_active = false
    ORDER BY type, name
  LOOP
    RAISE NOTICE '❌ % [%]', mission_record.name, mission_record.type;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'INACTIVE REASONS:';
  RAISE NOTICE '- Photo Hunter (daily) → Photo tracking pending';
  RAISE NOTICE '- Quality Reviewer (daily) → Photo attachment pending';
  RAISE NOTICE '- Weekly Contributor (weekly) → Photo attachment pending';
  RAISE NOTICE '- Photo Marathon (weekly) → Photo tracking pending';
  RAISE NOTICE '- Reviewer Path: Getting Better (narrative) → Photo attachment pending';
  RAISE NOTICE '- Songkran Celebration (event) → Seasonal (April 13-15)';
  RAISE NOTICE '- Halloween Night Out (event) → Seasonal (October 31)';
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- 7. NEXT STEPS
-- ========================================

-- Phase 3 (Photo Tracking):
-- 1. Create table: user_photo_uploads
-- 2. Create service: photoTrackingService.ts
-- 3. Integrate Cloudinary tracking
-- 4. Activate 5 photo-dependent missions
-- 5. Run UPDATE missions SET is_active = true WHERE name IN ('Photo Hunter', 'Quality Reviewer', 'Weekly Contributor', 'Photo Marathon', 'Reviewer Path: Getting Better');

-- Event Activation (Manual):
-- Before Songkran (April 13):
--   UPDATE missions SET is_active = true WHERE name = 'Songkran Celebration';
-- Before Halloween (October 31):
--   UPDATE missions SET is_active = true WHERE name = 'Halloween Night Out';

-- ========================================
-- ROLLBACK (if needed)
-- ========================================

-- To deactivate all missions:
-- UPDATE missions SET is_active = false;

-- To reactivate specific mission:
-- UPDATE missions SET is_active = true WHERE name = 'Mission Name';

-- ========================================
-- END OF MIGRATION
-- ========================================

COMMENT ON TABLE missions IS 'Mission system: 22/30 active (73%). 5 photo-dependent pending Phase 3. 2 event missions inactive (seasonal).';

COMMIT;
