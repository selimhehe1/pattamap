-- ========================================
-- MIGRATION: Add Rewards/Unlocks System
-- Version: v10.4
-- Date: 2025-12-12
-- Description: Create tables for feature unlocks based on user level/XP/badges
-- ========================================

-- Purpose: Allow users to unlock features, cosmetics, and titles as they progress
-- This creates a reward system that gives tangible benefits for leveling up

-- ========================================
-- 1. FEATURE UNLOCKS TABLE (Definition of all unlockable rewards)
-- ========================================

CREATE TABLE IF NOT EXISTS feature_unlocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Reward identity
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,

  -- Unlock requirements
  unlock_type VARCHAR(50) NOT NULL CHECK (unlock_type IN ('level', 'xp', 'badge', 'achievement')),
  unlock_value INTEGER,              -- Level number or XP amount required
  unlock_badge_id UUID REFERENCES badges(id), -- For badge-based unlocks

  -- Categorization
  category VARCHAR(50) NOT NULL CHECK (category IN ('feature', 'cosmetic', 'title')),
  icon VARCHAR(50),                  -- Emoji or icon identifier

  -- Display
  sort_order INTEGER DEFAULT 999,
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feature_unlocks_type ON feature_unlocks(unlock_type);
CREATE INDEX idx_feature_unlocks_category ON feature_unlocks(category);
CREATE INDEX idx_feature_unlocks_active ON feature_unlocks(is_active) WHERE is_active = true;
CREATE INDEX idx_feature_unlocks_level ON feature_unlocks(unlock_value) WHERE unlock_type = 'level';

-- Comments
COMMENT ON TABLE feature_unlocks IS 'Definition of all unlockable features, cosmetics, and titles. Users unlock these as they progress.';
COMMENT ON COLUMN feature_unlocks.unlock_type IS 'How to unlock: level (reach level X), xp (earn X total XP), badge (earn specific badge), achievement (special).';
COMMENT ON COLUMN feature_unlocks.unlock_value IS 'For level: the level number. For xp: the XP amount. Null for badge-based unlocks.';

-- ========================================
-- 2. USER UNLOCKS TABLE (User's earned rewards)
-- ========================================

CREATE TABLE IF NOT EXISTS user_unlocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unlock_id UUID NOT NULL REFERENCES feature_unlocks(id) ON DELETE CASCADE,

  -- When unlocked
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Optional: claimed status for rewards that need to be claimed
  claimed BOOLEAN DEFAULT true,
  claimed_at TIMESTAMP WITH TIME ZONE,

  -- Unique constraint: one unlock per user per reward
  CONSTRAINT unique_user_unlock UNIQUE (user_id, unlock_id)
);

-- Indexes
CREATE INDEX idx_user_unlocks_user_id ON user_unlocks(user_id);
CREATE INDEX idx_user_unlocks_unlock_id ON user_unlocks(unlock_id);
CREATE INDEX idx_user_unlocks_unlocked_at ON user_unlocks(unlocked_at DESC);

-- Comments
COMMENT ON TABLE user_unlocks IS 'Tracks which rewards each user has unlocked.';

-- ========================================
-- 3. SEED DATA: Initial Rewards
-- ========================================

INSERT INTO feature_unlocks (name, description, unlock_type, unlock_value, category, icon, sort_order) VALUES
  -- Level 2 unlocks
  ('photo_upload', 'Upload photos to establishment profiles', 'level', 2, 'feature', '📸', 10),
  ('create_review', 'Write detailed reviews with photos', 'level', 2, 'feature', '⭐', 11),

  -- Level 3 unlocks
  ('custom_title', 'Set a custom profile title', 'level', 3, 'cosmetic', '🏷️', 20),
  ('custom_theme', 'Unlock dark/light theme toggle', 'level', 3, 'cosmetic', '🎨', 21),

  -- Level 4 unlocks
  ('gold_border', 'Gold border on your profile', 'level', 4, 'cosmetic', '✨', 30),
  ('priority_support', 'Priority support queue', 'level', 4, 'feature', '🎧', 31),

  -- Level 5 unlocks
  ('vip_badge_frame', 'Exclusive VIP badge frame', 'level', 5, 'cosmetic', '👑', 40),
  ('early_access', 'Early access to new features', 'level', 5, 'feature', '🚀', 41),

  -- Level 6 unlocks
  ('elite_border', 'Animated elite profile border', 'level', 6, 'cosmetic', '💎', 50),
  ('custom_emoji', 'Custom emoji reactions', 'level', 6, 'cosmetic', '😎', 51),

  -- Level 7 (Ambassador) unlocks
  ('ambassador_title', 'Exclusive Ambassador title', 'level', 7, 'title', '🎖️', 60),
  ('ambassador_badge', 'Permanent Ambassador badge', 'level', 7, 'cosmetic', '🏆', 61),
  ('create_events', 'Create community events', 'level', 7, 'feature', '📅', 62)

ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 4. FUNCTION: Check and grant unlocks on level up
-- ========================================

CREATE OR REPLACE FUNCTION check_and_grant_unlocks(p_user_id UUID, p_new_level INTEGER)
RETURNS SETOF user_unlocks AS $$
DECLARE
  unlock_record feature_unlocks%ROWTYPE;
  new_unlock user_unlocks%ROWTYPE;
BEGIN
  -- Find all level-based unlocks that the user is now eligible for
  FOR unlock_record IN
    SELECT * FROM feature_unlocks
    WHERE unlock_type = 'level'
      AND unlock_value <= p_new_level
      AND is_active = true
      AND id NOT IN (
        SELECT unlock_id FROM user_unlocks WHERE user_id = p_user_id
      )
  LOOP
    -- Grant the unlock
    INSERT INTO user_unlocks (user_id, unlock_id, unlocked_at, claimed, claimed_at)
    VALUES (p_user_id, unlock_record.id, NOW(), true, NOW())
    ON CONFLICT (user_id, unlock_id) DO NOTHING
    RETURNING * INTO new_unlock;

    IF new_unlock.id IS NOT NULL THEN
      RETURN NEXT new_unlock;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_and_grant_unlocks(UUID, INTEGER) IS 'Grants all level-based unlocks that a user is eligible for. Call after level up.';

-- ========================================
-- 5. TRIGGER: Auto-grant unlocks on level up
-- ========================================

CREATE OR REPLACE FUNCTION trigger_check_unlocks_on_level_up()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if level increased
  IF NEW.current_level > COALESCE(OLD.current_level, 0) THEN
    PERFORM check_and_grant_unlocks(NEW.user_id, NEW.current_level);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS check_unlocks_on_level_up ON user_points;

-- Create trigger
CREATE TRIGGER check_unlocks_on_level_up
  AFTER UPDATE OF current_level ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_unlocks_on_level_up();

COMMENT ON TRIGGER check_unlocks_on_level_up ON user_points IS 'Automatically grants level-based unlocks when user levels up.';

-- ========================================
-- 6. FUNCTION: Get user's available and unlocked rewards
-- ========================================

CREATE OR REPLACE FUNCTION get_user_rewards(p_user_id UUID)
RETURNS TABLE (
  unlock_id UUID,
  name VARCHAR(100),
  description TEXT,
  unlock_type VARCHAR(50),
  unlock_value INTEGER,
  category VARCHAR(50),
  icon VARCHAR(50),
  is_unlocked BOOLEAN,
  unlocked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fu.id AS unlock_id,
    fu.name,
    fu.description,
    fu.unlock_type,
    fu.unlock_value,
    fu.category,
    fu.icon,
    (uu.id IS NOT NULL) AS is_unlocked,
    uu.unlocked_at
  FROM feature_unlocks fu
  LEFT JOIN user_unlocks uu ON fu.id = uu.unlock_id AND uu.user_id = p_user_id
  WHERE fu.is_active = true
  ORDER BY fu.sort_order, fu.unlock_value;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_rewards(UUID) IS 'Returns all rewards with unlock status for a specific user.';

-- ========================================
-- 7. GRANT INITIAL UNLOCKS TO EXISTING USERS
-- ========================================

-- Grant unlocks to existing users based on their current level
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT user_id, current_level FROM user_points WHERE current_level >= 2
  LOOP
    PERFORM check_and_grant_unlocks(user_record.user_id, user_record.current_level);
  END LOOP;
END $$;

-- ========================================
-- VERIFICATION
-- ========================================

-- Run these to verify:
-- SELECT * FROM feature_unlocks ORDER BY sort_order;
-- SELECT COUNT(*) FROM user_unlocks;
-- SELECT * FROM get_user_rewards('user-id-here');
