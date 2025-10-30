-- ========================================
-- MIGRATION: Deactivate Weekly Contributor Mission
-- Version: v10.3.1
-- Date: 2025-01-21
-- Description: Disable Weekly Contributor until Phase 3 photo tracking implemented
-- ========================================

-- Purpose: Fix inconsistency - mission was activated but getReviewsWithPhotosCount returns 0
-- Issue: activate_safe_missions.sql activated Weekly Contributor (lines 94-98)
--        but getReviewsWithPhotosCount always returns 0 (Phase 3 placeholder)
-- Result: Mission appears active but is impossible to complete
-- Solution: Deactivate until Phase 3 photo tracking is implemented

-- ========================================
-- DEACTIVATE WEEKLY CONTRIBUTOR
-- ========================================

UPDATE missions
SET is_active = false
WHERE name = 'Weekly Contributor'
  AND type = 'weekly';

-- ========================================
-- VERIFICATION
-- ========================================

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
  RAISE NOTICE 'WEEKLY CONTRIBUTOR DEACTIVATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Active Daily Missions: % / 6', v_active_daily;
  RAISE NOTICE 'Active Weekly Missions: % / 6 (was 4, now 3)', v_active_weekly;
  RAISE NOTICE 'Active Narrative Quests: % / 16', v_active_narrative;
  RAISE NOTICE 'Active Event Missions: % / 2', v_active_event;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TOTAL ACTIVE: % / 30 (was 22, now 21)', v_total_active;
  RAISE NOTICE 'TOTAL INACTIVE: % / 30 (was 8, now 9)', v_inactive_count;
  RAISE NOTICE '========================================';

  -- Validation
  IF v_total_active = 21 THEN
    RAISE NOTICE '✅ SUCCESS: 21 safe missions active (70%% coverage)';
  ELSE
    RAISE WARNING '⚠️  WARNING: Expected 21 active missions, got %', v_total_active;
  END IF;

  IF v_inactive_count = 9 THEN
    RAISE NOTICE '✅ SUCCESS: 9 missions inactive (6 photo-dependent + 2 event + 1 quest step)';
  ELSE
    RAISE WARNING '⚠️  WARNING: Expected 9 inactive missions, got %', v_inactive_count;
  END IF;
END $$;

-- ========================================
-- UPDATED INACTIVE MISSIONS LIST (9)
-- ========================================

-- Display inactive missions with reason
DO $$
DECLARE
  mission_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INACTIVE MISSIONS (9)';
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
  RAISE NOTICE '- Weekly Contributor (weekly) → Photo attachment pending [FIXED]';
  RAISE NOTICE '- Photo Marathon (weekly) → Photo tracking pending';
  RAISE NOTICE '- Reviewer Path: Getting Better (narrative) → Photo attachment pending';
  RAISE NOTICE '- Songkran Celebration (event) → Seasonal (April 13-15)';
  RAISE NOTICE '- Halloween Night Out (event) → Seasonal (October 31)';
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- PHASE 3 REACTIVATION INSTRUCTIONS
-- ========================================

-- When photo tracking is implemented (Phase 3):
-- 1. Implement user_photo_uploads table
-- 2. Update getReviewsWithPhotosCount in missionTrackingService.ts
-- 3. Update commentController.ts to set hasPhotos = true when photos uploaded
-- 4. Run:
--    UPDATE missions SET is_active = true WHERE name = 'Weekly Contributor';

-- ========================================
-- ROLLBACK (if needed)
-- ========================================

-- To reactivate Weekly Contributor:
-- UPDATE missions SET is_active = true WHERE name = 'Weekly Contributor';

COMMENT ON TABLE missions IS 'Mission system: 21/30 active (70%). 6 photo-dependent pending Phase 3. 2 event missions inactive (seasonal). 1 narrative step requires photos.';
