-- ========================================
-- MIGRATION: Add Mission Tracking RPC Functions
-- Version: v10.3
-- Date: 2025-01-20
-- Description: PostgreSQL functions for efficient mission progress tracking
-- ========================================

-- Purpose: Provide atomic, optimized functions for mission tracking service
-- Performance: RPC functions are faster than multiple sequential queries

-- ========================================
-- FUNCTION 1: Update Mission Progress (Atomic)
-- ========================================

/**
 * Atomically update user mission progress and check for completion
 *
 * @param p_user_id UUID - User ID
 * @param p_mission_id UUID - Mission ID
 * @param p_increment INTEGER - Amount to increment progress by
 * @returns BOOLEAN - TRUE if mission was completed by this update, FALSE otherwise
 *
 * Features:
 * - Atomic upsert (create progress record if doesn't exist)
 * - Automatic completion detection
 * - Awards XP if mission completed
 * - Thread-safe (handles concurrent updates)
 */
CREATE OR REPLACE FUNCTION update_mission_progress(
  p_user_id UUID,
  p_mission_id UUID,
  p_increment INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_progress INTEGER;
  v_new_progress INTEGER;
  v_required_count INTEGER;
  v_xp_reward INTEGER;
  v_badge_reward UUID;
  v_was_completed BOOLEAN;
  v_is_completed BOOLEAN;
BEGIN
  -- Get mission requirements
  SELECT
    (requirements->>'count')::INTEGER,
    xp_reward,
    badge_reward
  INTO
    v_required_count,
    v_xp_reward,
    v_badge_reward
  FROM missions
  WHERE id = p_mission_id;

  -- Default to 1 if count not specified
  v_required_count := COALESCE(v_required_count, 1);

  -- Get current progress (if exists)
  SELECT progress, completed
  INTO v_current_progress, v_was_completed
  FROM user_mission_progress
  WHERE user_id = p_user_id AND mission_id = p_mission_id;

  -- If already completed, don't update
  IF v_was_completed = TRUE THEN
    RETURN FALSE;
  END IF;

  -- Calculate new progress
  v_new_progress := COALESCE(v_current_progress, 0) + p_increment;
  v_is_completed := v_new_progress >= v_required_count;

  -- Upsert progress
  INSERT INTO user_mission_progress (user_id, mission_id, progress, completed, completed_at)
  VALUES (
    p_user_id,
    p_mission_id,
    v_new_progress,
    v_is_completed,
    CASE WHEN v_is_completed THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, mission_id) DO UPDATE
  SET
    progress = v_new_progress,
    completed = v_is_completed,
    completed_at = CASE WHEN v_is_completed THEN NOW() ELSE user_mission_progress.completed_at END,
    updated_at = NOW();

  -- If mission completed (and wasn't completed before), award XP
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
COMMENT ON FUNCTION update_mission_progress IS 'Atomically update mission progress and award rewards on completion. Thread-safe.';

-- ========================================
-- FUNCTION 2: Check Mission Completion (Helper)
-- ========================================

/**
 * Check if user has completed a specific mission
 *
 * @param p_user_id UUID - User ID
 * @param p_mission_id UUID - Mission ID
 * @returns BOOLEAN - TRUE if completed, FALSE otherwise
 */
CREATE OR REPLACE FUNCTION check_mission_completion(
  p_user_id UUID,
  p_mission_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_completed BOOLEAN;
BEGIN
  SELECT completed
  INTO v_completed
  FROM user_mission_progress
  WHERE user_id = p_user_id AND mission_id = p_mission_id;

  RETURN COALESCE(v_completed, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION check_mission_completion IS 'Check if user has completed a specific mission.';

-- ========================================
-- FUNCTION 3: Reset Missions (Daily/Weekly)
-- ========================================

/**
 * Reset all daily or weekly missions for all users
 * Called by cron jobs:
 * - Daily missions: Reset at midnight (00:00)
 * - Weekly missions: Reset on Monday midnight
 *
 * @param p_mission_type TEXT - 'daily' or 'weekly'
 * @returns VOID
 *
 * Features:
 * - Resets progress to 0
 * - Sets completed = FALSE
 * - Clears completed_at timestamp
 * - Only affects active missions of specified type
 */
CREATE OR REPLACE FUNCTION reset_missions(
  p_mission_type TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Validate mission type
  IF p_mission_type NOT IN ('daily', 'weekly') THEN
    RAISE EXCEPTION 'Invalid mission type: %. Must be ''daily'' or ''weekly''.', p_mission_type;
  END IF;

  -- Reset progress for all users with active missions of this type
  UPDATE user_mission_progress
  SET
    progress = 0,
    completed = FALSE,
    completed_at = NULL,
    updated_at = NOW()
  WHERE mission_id IN (
    SELECT id
    FROM missions
    WHERE type = p_mission_type AND is_active = TRUE
  );

  -- Log reset
  RAISE NOTICE 'Reset % missions: % records updated', p_mission_type, (SELECT COUNT(*) FROM user_mission_progress WHERE mission_id IN (SELECT id FROM missions WHERE type = p_mission_type));
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION reset_missions IS 'Reset all daily or weekly missions for all users. Called by cron jobs.';

-- ========================================
-- FUNCTION 4: Initialize User Mission Progress (Helper)
-- ========================================

/**
 * Initialize mission progress for a user (useful for narrative quests)
 * Creates a progress record with progress=0 if doesn't exist
 *
 * @param p_user_id UUID - User ID
 * @param p_mission_id UUID - Mission ID
 * @returns VOID
 */
CREATE OR REPLACE FUNCTION initialize_mission_progress(
  p_user_id UUID,
  p_mission_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_mission_progress (user_id, mission_id, progress, completed)
  VALUES (p_user_id, p_mission_id, 0, FALSE)
  ON CONFLICT (user_id, mission_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION initialize_mission_progress IS 'Initialize mission progress for a user (narrative quests). Idempotent.';

-- ========================================
-- FUNCTION 5: Get User Active Missions (Performance Optimization)
-- ========================================

/**
 * Get all active missions with user progress (if any)
 * Optimized for frontend MissionsDashboard
 *
 * @param p_user_id UUID - User ID
 * @returns TABLE - All active missions with progress data
 */
CREATE OR REPLACE FUNCTION get_user_active_missions(
  p_user_id UUID
)
RETURNS TABLE (
  mission_id UUID,
  mission_name VARCHAR(150),
  mission_description TEXT,
  mission_type VARCHAR(20),
  xp_reward INTEGER,
  badge_reward UUID,
  requirements JSONB,
  progress INTEGER,
  completed BOOLEAN,
  completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS mission_id,
    m.name AS mission_name,
    m.description AS mission_description,
    m.type AS mission_type,
    m.xp_reward,
    m.badge_reward,
    m.requirements,
    COALESCE(ump.progress, 0) AS progress,
    COALESCE(ump.completed, FALSE) AS completed,
    ump.completed_at
  FROM missions m
  LEFT JOIN user_mission_progress ump
    ON m.id = ump.mission_id AND ump.user_id = p_user_id
  WHERE m.is_active = TRUE
  ORDER BY
    m.type,
    m.sort_order;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION get_user_active_missions IS 'Get all active missions with user progress. Optimized for MissionsDashboard.';

-- ========================================
-- INDEXES (Performance Optimization)
-- ========================================

-- Index for mission progress lookups (user + mission)
CREATE INDEX IF NOT EXISTS idx_user_mission_progress_user_mission
  ON user_mission_progress(user_id, mission_id);

-- Index for mission progress by mission (for reset operations)
CREATE INDEX IF NOT EXISTS idx_user_mission_progress_mission
  ON user_mission_progress(mission_id);

-- Index for completed missions (for leaderboards)
CREATE INDEX IF NOT EXISTS idx_user_mission_progress_completed
  ON user_mission_progress(completed, completed_at DESC)
  WHERE completed = TRUE;

-- Index for mission type filtering (for reset operations)
CREATE INDEX IF NOT EXISTS idx_missions_type_active
  ON missions(type, is_active)
  WHERE is_active = TRUE;

-- ========================================
-- STATISTICS
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Mission Tracking RPC Functions Created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  1. update_mission_progress() - Atomic progress update + XP award';
  RAISE NOTICE '  2. check_mission_completion() - Check if mission completed';
  RAISE NOTICE '  3. reset_missions() - Reset daily/weekly missions';
  RAISE NOTICE '  4. initialize_mission_progress() - Initialize quest steps';
  RAISE NOTICE '  5. get_user_active_missions() - Optimized mission list with progress';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Indexes created: 4 performance indexes';
  RAISE NOTICE '========================================';
END $$;
