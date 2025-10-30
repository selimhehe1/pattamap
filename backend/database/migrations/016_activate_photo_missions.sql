-- ========================================
-- MIGRATION 016: Activate Photo-Dependent Missions
-- ========================================
-- Purpose: Enable 5 photo-dependent missions now that photo tracking is implemented
-- Date: 2025-01-21
-- Version: v10.3 (Phase 3 Complete)
-- Prerequisites: Migration 015 (user_photo_uploads table) must be applied first
-- ========================================

-- ========================================
-- MISSION STATUS BEFORE
-- ========================================
-- Total missions: 30
-- Active missions: 22 (73%)
-- Inactive missions: 8 (27%)
--   - 5 photo-dependent (Phase 3 pending)
--   - 2 event missions (seasonal)
--   - 1 already deactivated (Weekly Contributor - redundant)
-- ========================================

-- ========================================
-- 1. ACTIVATE DAILY PHOTO MISSIONS (1)
-- ========================================

-- Photo Hunter: Upload 3 photos today
UPDATE missions
SET is_active = true
WHERE name = 'Photo Hunter'
  AND type = 'daily'
  AND requirements->>'type' = 'upload_photos';

-- ========================================
-- 2. ACTIVATE WEEKLY PHOTO MISSIONS (2)
-- ========================================

-- Photo Marathon: Upload 20 photos this week
UPDATE missions
SET is_active = true
WHERE name = 'Photo Marathon'
  AND type = 'weekly'
  AND requirements->>'type' = 'upload_photos';

-- Weekly Contributor: Write 5 reviews with photos this week
-- NOTE: This mission was previously deactivated in migration "deactivate_weekly_contributor_mission.sql"
-- We keep it INACTIVE because it's redundant with other review missions
-- UPDATE missions
-- SET is_active = true
-- WHERE name = 'Weekly Contributor'
--   AND type = 'weekly'
--   AND requirements->>'type' = 'write_reviews'
--   AND requirements->>'with_photos' = 'true';

-- ========================================
-- 3. ACTIVATE DAILY QUALITY REVIEW MISSION (1)
-- ========================================

-- Quality Reviewer: Write 1 review with photo and 100+ characters today
UPDATE missions
SET is_active = true
WHERE name = 'Quality Reviewer'
  AND type = 'daily'
  AND requirements->>'type' = 'write_quality_review'
  AND requirements->>'with_photo' = 'true';

-- ========================================
-- 4. ACTIVATE NARRATIVE QUEST STEP (1)
-- ========================================

-- Reviewer Path: Getting Better (Step 2/5) - Write 5 reviews with photos
UPDATE missions
SET is_active = true
WHERE requirements->>'quest_id' = 'reviewer_path'
  AND requirements->>'step' = '2'
  AND requirements->>'with_photos' = 'true';

-- ========================================
-- 5. VERIFICATION & SUMMARY
-- ========================================

DO $$
DECLARE
  active_count INT;
  photo_missions_count INT;
BEGIN
  -- Count total active missions
  SELECT COUNT(*) INTO active_count
  FROM missions
  WHERE is_active = true;

  -- Count active photo missions
  SELECT COUNT(*) INTO photo_missions_count
  FROM missions
  WHERE is_active = true
    AND (
      requirements->>'type' = 'upload_photos'
      OR requirements->>'with_photo' = 'true'
      OR requirements->>'with_photos' = 'true'
    );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Photo Missions Activation Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total active missions: %', active_count;
  RAISE NOTICE 'Active photo missions: %', photo_missions_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Expected: 26 total (22 existing + 4 photo)';
  RAISE NOTICE 'Note: Weekly Contributor kept INACTIVE (redundant)';
  RAISE NOTICE '========================================';

  IF active_count >= 26 THEN
    RAISE NOTICE '✅ Mission activation successful!';
  ELSE
    RAISE WARNING '⚠️ Active missions count is less than expected (% < 26)', active_count;
  END IF;
END $$;

-- ========================================
-- 6. DETAILED MISSION LIST (for verification)
-- ========================================

SELECT
  type,
  name,
  is_active,
  requirements->>'type' as requirement_type,
  requirements->>'with_photo' as requires_photo,
  requirements->>'with_photos' as requires_photos
FROM missions
WHERE
  requirements->>'type' = 'upload_photos'
  OR requirements->>'with_photo' = 'true'
  OR requirements->>'with_photos' = 'true'
ORDER BY type, name;

-- ========================================
-- MISSION STATUS AFTER
-- ========================================
-- Total missions: 30
-- Active missions: 26 (87%)
--   - 22 existing (check-in, review, social)
--   - 4 photo missions (newly activated)
-- Inactive missions: 4 (13%)
--   - 1 photo mission (Weekly Contributor - redundant)
--   - 2 event missions (seasonal)
--   - 1 other
-- ========================================

-- ========================================
-- ROLLBACK (if needed)
-- ========================================

-- -- Deactivate photo missions
-- UPDATE missions
-- SET is_active = false
-- WHERE name IN ('Photo Hunter', 'Photo Marathon', 'Quality Reviewer')
--    OR (requirements->>'quest_id' = 'reviewer_path' AND requirements->>'step' = '2');

-- ========================================
-- END OF MIGRATION 016
-- ========================================
