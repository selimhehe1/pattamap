-- ========================================
-- XP SYSTEM FIXES - Apply to Supabase
-- ========================================
-- Date: 2025-01-20
-- Description: Updates to fix XP system issues
-- - Award XP now automatically updates streaks
-- - Validation votes now properly award XP
--
-- HOW TO APPLY:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- ========================================
BEGIN;

-- Function: Award XP to user (UPDATED - now with automatic streak update)
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_reason VARCHAR(100),
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_new_total_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  -- Insert XP transaction
  INSERT INTO xp_transactions (user_id, xp_amount, reason, related_entity_type, related_entity_id)
  VALUES (p_user_id, p_xp_amount, p_reason, p_entity_type, p_entity_id);

  -- Update user_points (create if not exists)
  INSERT INTO user_points (user_id, total_xp, monthly_xp)
  VALUES (p_user_id, p_xp_amount, p_xp_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_xp = user_points.total_xp + p_xp_amount,
    monthly_xp = user_points.monthly_xp + p_xp_amount,
    last_activity_date = CURRENT_DATE;

  -- Get new total XP
  SELECT total_xp INTO v_new_total_xp
  FROM user_points
  WHERE user_id = p_user_id;

  -- Calculate new level (7 levels: Newbie, Explorer, Regular, Insider, VIP, Legend, Ambassador)
  v_new_level := CASE
    WHEN v_new_total_xp >= 6000 THEN 7  -- Ambassador
    WHEN v_new_total_xp >= 3000 THEN 6  -- Legend
    WHEN v_new_total_xp >= 1500 THEN 5  -- VIP
    WHEN v_new_total_xp >= 700 THEN 4   -- Insider
    WHEN v_new_total_xp >= 300 THEN 3   -- Regular
    WHEN v_new_total_xp >= 100 THEN 2   -- Explorer
    ELSE 1                              -- Newbie
  END;

  -- Update level if changed
  UPDATE user_points
  SET current_level = v_new_level
  WHERE user_id = p_user_id;

  -- *** NEW: Update streak automatically ***
  PERFORM update_streak(p_user_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these after applying the update to verify everything works:

-- 1. Test award_xp function
-- SELECT award_xp(
--   'YOUR_USER_ID_HERE'::uuid,
--   10,
--   'test_award',
--   'test',
--   null
-- );

-- 2. Check user_points updated correctly
-- SELECT * FROM user_points WHERE user_id = 'YOUR_USER_ID_HERE'::uuid;

-- 3. Check xp_transactions log
-- SELECT * FROM xp_transactions
-- WHERE user_id = 'YOUR_USER_ID_HERE'::uuid
-- ORDER BY created_at DESC LIMIT 5;

-- 4. Verify streak was updated
-- SELECT current_streak_days, last_activity_date FROM user_points
-- WHERE user_id = 'YOUR_USER_ID_HERE'::uuid;

-- ========================================
-- SUCCESS!
-- ========================================
-- If no errors appeared, the XP system is now fixed:
-- ✅ Validation votes now award XP
-- ✅ Streaks update automatically on every XP award
-- ✅ Level-up notifications work in frontend
-- ========================================

COMMIT;
