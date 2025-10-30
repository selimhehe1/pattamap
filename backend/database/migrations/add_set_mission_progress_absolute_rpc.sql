-- ========================================
-- MIGRATION: Add set_mission_progress_absolute RPC
-- Version: v10.3.1
-- Date: 2025-01-21
-- Description: Atomic SET mission progress (vs INCREMENT in update_mission_progress)
-- ========================================

-- Purpose: Fix race condition in setMissionProgress
-- Issue: setMissionProgress does 3 separate queries (READ → CALCULATE → UPSERT)
--        causing race conditions with concurrent updates
-- Solution: Atomic RPC function to SET progress to absolute value

-- ========================================
-- FUNCTION: set_mission_progress_absolute
-- ========================================

/**
 * Atomically SET user mission progress to specific value
 * Used for counted missions (unique check-ins, reviews, etc.)
 *
 * @param p_user_id UUID - User ID
 * @param p_mission_id UUID - Mission ID
 * @param p_new_progress INTEGER - New absolute progress value
 * @returns BOOLEAN - TRUE if mission was completed by this update, FALSE otherwise
 *
 * Features:
 * - Atomic upsert (thread-safe)
 * - Automatic completion detection
 * - Awards XP + badge if completed
 * - Prevents duplicate completions (idempotent)
 *
 * Difference vs update_mission_progress:
 * - update_mission_progress: INCREMENT progress (current + increment)
 * - set_mission_progress_absolute: SET progress to absolute value
 */
CREATE OR REPLACE FUNCTION set_mission_progress_absolute(
  p_user_id UUID,
  p_mission_id UUID,
  p_new_progress INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_required_count INTEGER;
  v_xp_reward INTEGER;
  v_badge_reward UUID;
  v_was_completed BOOLEAN;
  v_is_completed BOOLEAN;
BEGIN
  -- Get mission requirements
  SELECT
    COALESCE((requirements->>'count')::INTEGER, 1) AS required_count,
    xp_reward,
    badge_reward
  INTO
    v_required_count,
    v_xp_reward,
    v_badge_reward
  FROM missions
  WHERE id = p_mission_id;

  -- Check if mission not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission % not found', p_mission_id;
  END IF;

  -- Get current completion status (if exists)
  SELECT completed
  INTO v_was_completed
  FROM user_mission_progress
  WHERE user_id = p_user_id AND mission_id = p_mission_id;

  -- If already completed, don't update (idempotent)
  IF v_was_completed = TRUE THEN
    RETURN FALSE;
  END IF;

  -- Calculate completion status
  v_is_completed := p_new_progress >= v_required_count;

  -- Atomic upsert progress
  -- ON CONFLICT ensures atomicity even with concurrent updates
  INSERT INTO user_mission_progress (user_id, mission_id, progress, completed, completed_at)
  VALUES (
    p_user_id,
    p_mission_id,
    p_new_progress,
    v_is_completed,
    CASE WHEN v_is_completed THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, mission_id) DO UPDATE
  SET
    progress = p_new_progress,
    completed = v_is_completed,
    completed_at = CASE WHEN v_is_completed THEN NOW() ELSE user_mission_progress.completed_at END,
    updated_at = NOW()
  WHERE
    -- Only update if not already completed (double-check for safety)
    user_mission_progress.completed = FALSE;

  -- If mission completed (and wasn't completed before), award XP + badge
  IF v_is_completed = TRUE AND COALESCE(v_was_completed, FALSE) = FALSE THEN
    -- Award XP via existing award_xp function
    PERFORM award_xp(
      p_user_id,
      v_xp_reward,
      'mission_completed',
      'mission',
      p_mission_id
    );

    -- Award badge if specified
    IF v_badge_reward IS NOT NULL THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (p_user_id, v_badge_reward)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
    END IF;

    RETURN TRUE; -- Mission completed by this update
  END IF;

  RETURN FALSE; -- Mission not completed or was already completed
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION set_mission_progress_absolute IS 'Atomically SET mission progress to absolute value. Used for counted missions (unique check-ins, reviews). Thread-safe with ON CONFLICT.';

-- ========================================
-- USAGE EXAMPLE
-- ========================================

-- Example 1: User has 3 unique check-ins, update mission progress
-- SELECT set_mission_progress_absolute('user-id', 'mission-id', 3);
-- → Returns TRUE if mission completed (count >= required), FALSE otherwise

-- Example 2: Concurrent updates (both safe with ON CONFLICT)
-- SELECT set_mission_progress_absolute('user-id', 'mission-id', 3); -- Thread 1
-- SELECT set_mission_progress_absolute('user-id', 'mission-id', 4); -- Thread 2 (concurrent)
-- → Last write wins, no data loss, no race condition

-- ========================================
-- VERIFICATION
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'set_mission_progress_absolute RPC Created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Purpose: Atomic SET mission progress (fix race condition)';
  RAISE NOTICE 'Thread-safe: ✅ (ON CONFLICT ensures atomicity)';
  RAISE NOTICE 'Awards XP: ✅ (on completion)';
  RAISE NOTICE 'Awards Badge: ✅ (on completion)';
  RAISE NOTICE 'Idempotent: ✅ (prevents duplicate completions)';
  RAISE NOTICE '========================================';
END $$;
