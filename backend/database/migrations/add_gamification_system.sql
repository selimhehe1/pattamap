-- ========================================
-- MIGRATION: Add Gamification System
-- Version: v10.3
-- Date: 2025-01-XX
-- Description: Create gamification tables (points, badges, missions, leaderboards, social features)
-- ========================================

-- Purpose: Implement advanced gamification system to boost user engagement and contributions
-- Goals: +50% engagement, +80% contributions, +40% retention

-- ========================================
-- 1. USER POINTS & LEVELS
-- ========================================

CREATE TABLE IF NOT EXISTS user_points (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- XP System
  total_xp INTEGER DEFAULT 0 CHECK (total_xp >= 0),
  current_level INTEGER DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 7),

  -- Monthly tracking (resets first day of each month)
  monthly_xp INTEGER DEFAULT 0 CHECK (monthly_xp >= 0),
  last_monthly_reset TIMESTAMP WITH TIME ZONE DEFAULT DATE_TRUNC('month', NOW()),

  -- Streak tracking
  current_streak_days INTEGER DEFAULT 0 CHECK (current_streak_days >= 0),
  longest_streak_days INTEGER DEFAULT 0 CHECK (longest_streak_days >= 0),
  last_activity_date DATE DEFAULT CURRENT_DATE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_points_user_id ON user_points(user_id);
CREATE INDEX idx_user_points_total_xp ON user_points(total_xp DESC);
CREATE INDEX idx_user_points_monthly_xp ON user_points(monthly_xp DESC);
CREATE INDEX idx_user_points_level ON user_points(current_level);

-- Comments
COMMENT ON TABLE user_points IS 'User gamification points, levels, and streaks. XP system with 7 levels (Newbie to Ambassador).';
COMMENT ON COLUMN user_points.total_xp IS 'Total XP earned (all time). Determines current_level.';
COMMENT ON COLUMN user_points.monthly_xp IS 'XP earned this month. Resets on 1st of each month for monthly leaderboard.';
COMMENT ON COLUMN user_points.current_streak_days IS 'Consecutive days with activity. Resets if 1+ day gap.';

-- ========================================
-- 2. BADGES (ACHIEVEMENTS)
-- ========================================

CREATE TABLE IF NOT EXISTS badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Badge identity
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_url VARCHAR(500), -- Emoji or image URL

  -- Categorization
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'exploration',    -- Visit zones/establishments
    'contribution',   -- Write reviews, photos
    'social',         -- Followers, votes, comments
    'quality',        -- High-quality content
    'temporal',       -- Streaks, anniversaries
    'secret'          -- Easter eggs
  )),

  -- Rarity (for sorting/display)
  rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),

  -- Requirement specification
  requirement_type VARCHAR(50) NOT NULL, -- e.g. 'review_count', 'zone_visits', 'streak_days'
  requirement_value INTEGER NOT NULL,     -- e.g. 10 (for 10 reviews)
  requirement_metadata JSONB,             -- Optional: additional criteria (e.g. {"min_length": 200})

  -- Badge metadata
  is_active BOOLEAN DEFAULT true,         -- Can be earned currently
  is_hidden BOOLEAN DEFAULT false,        -- Hidden until unlocked (secret badges)
  sort_order INTEGER DEFAULT 999,         -- Display order

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_badges_category ON badges(category);
CREATE INDEX idx_badges_rarity ON badges(rarity);
CREATE INDEX idx_badges_active ON badges(is_active) WHERE is_active = true;

-- Comments
COMMENT ON TABLE badges IS '40+ achievement badges across 6 categories (exploration, contribution, social, quality, temporal, secret).';
COMMENT ON COLUMN badges.requirement_type IS 'Type of requirement to unlock (review_count, zone_visits, streak_days, etc.).';
COMMENT ON COLUMN badges.requirement_value IS 'Numeric value for requirement (e.g. 10 for "Write 10 reviews").';

-- ========================================
-- 3. USER BADGES (EARNED)
-- ========================================

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,

  -- Metadata
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER, -- Current progress towards badge (optional, for tracking)

  -- Prevent duplicate badges
  CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

-- Indexes
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX idx_user_badges_earned_at ON user_badges(earned_at DESC);

-- Comments
COMMENT ON TABLE user_badges IS 'Badges earned by users. Join table between users and badges.';

-- ========================================
-- 4. MISSIONS (QUESTS)
-- ========================================

CREATE TABLE IF NOT EXISTS missions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Mission identity
  name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,

  -- Mission type
  type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly', 'event', 'narrative')),

  -- Rewards
  xp_reward INTEGER NOT NULL CHECK (xp_reward >= 0),
  badge_reward UUID REFERENCES badges(id), -- Optional badge upon completion

  -- Timing
  reset_frequency VARCHAR(20), -- 'daily', 'weekly', null (for one-time)
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,

  -- Requirements (JSONB for flexibility)
  requirements JSONB NOT NULL, -- e.g. {"type": "write_reviews", "count": 5, "with_photos": true}

  -- Mission metadata
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 999,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_missions_type ON missions(type);
CREATE INDEX idx_missions_active ON missions(is_active) WHERE is_active = true;
CREATE INDEX idx_missions_reset_frequency ON missions(reset_frequency);

-- Comments
COMMENT ON TABLE missions IS 'Daily/weekly/event missions (quests) for users. Rewards XP and optionally badges.';
COMMENT ON COLUMN missions.requirements IS 'JSONB specification of mission requirements (type, count, conditions, etc.).';
COMMENT ON COLUMN missions.reset_frequency IS 'How often mission resets: daily, weekly, or null (one-time/event).';

-- ========================================
-- 5. USER MISSION PROGRESS
-- ========================================

CREATE TABLE IF NOT EXISTS user_mission_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,

  -- Progress tracking
  progress INTEGER DEFAULT 0 CHECK (progress >= 0),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Reset tracking (for daily/weekly missions)
  reset_count INTEGER DEFAULT 0, -- How many times this mission has been completed
  last_reset_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one progress record per user per mission
  CONSTRAINT unique_user_mission UNIQUE (user_id, mission_id)
);

-- Indexes
CREATE INDEX idx_user_mission_progress_user_id ON user_mission_progress(user_id);
CREATE INDEX idx_user_mission_progress_mission_id ON user_mission_progress(mission_id);
CREATE INDEX idx_user_mission_progress_completed ON user_mission_progress(completed);

-- Comments
COMMENT ON TABLE user_mission_progress IS 'User progress towards missions. Tracks completion, progress, and resets.';

-- ========================================
-- 6. CHECK-INS (GEOLOCATION)
-- ========================================

CREATE TABLE IF NOT EXISTS check_ins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,

  -- Geolocation
  latitude DECIMAL(10, 8),  -- User's check-in location
  longitude DECIMAL(11, 8),

  -- Verification
  verified BOOLEAN DEFAULT false, -- True if within 100m radius of establishment
  distance_meters DECIMAL(10, 2), -- Distance from establishment coordinates

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX idx_check_ins_establishment_id ON check_ins(establishment_id);
CREATE INDEX idx_check_ins_created_at ON check_ins(created_at DESC);
CREATE INDEX idx_check_ins_verified ON check_ins(verified) WHERE verified = true;

-- Comments
COMMENT ON TABLE check_ins IS 'User check-ins at establishments. Requires geolocation. Verified if within 100m radius.';
COMMENT ON COLUMN check_ins.verified IS 'True if user was within 100m of establishment when checking in.';

-- ========================================
-- 7. USER FOLLOWERS (SOCIAL)
-- ========================================

CREATE TABLE IF NOT EXISTS user_followers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent self-follow and duplicates
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT unique_follower_following UNIQUE (follower_id, following_id)
);

-- Indexes
CREATE INDEX idx_user_followers_follower_id ON user_followers(follower_id);
CREATE INDEX idx_user_followers_following_id ON user_followers(following_id);

-- Comments
COMMENT ON TABLE user_followers IS 'Social follow relationships between users. Prevents self-follows.';

-- ========================================
-- 8. REVIEW VOTES (HELPFUL VOTES)
-- ========================================

CREATE TABLE IF NOT EXISTS review_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  vote_type VARCHAR(20) DEFAULT 'helpful' CHECK (vote_type IN ('helpful', 'not_helpful')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate votes
  CONSTRAINT unique_review_vote UNIQUE (review_id, user_id)
);

-- Indexes
CREATE INDEX idx_review_votes_review_id ON review_votes(review_id);
CREATE INDEX idx_review_votes_user_id ON review_votes(user_id);
CREATE INDEX idx_review_votes_type ON review_votes(vote_type);

-- Comments
COMMENT ON TABLE review_votes IS 'User votes on reviews (helpful/not_helpful). Used for social gamification.';

-- ========================================
-- 9. XP TRANSACTION LOG (AUDIT)
-- ========================================

CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Transaction details
  xp_amount INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL, -- e.g. 'review_created', 'photo_uploaded', 'check_in'

  -- Related entity (optional)
  related_entity_type VARCHAR(50), -- e.g. 'comment', 'establishment', 'mission'
  related_entity_id UUID,

  -- Metadata
  metadata JSONB, -- Optional: extra details (e.g. {"multiplier": 2, "bonus": "quality"})
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX idx_xp_transactions_reason ON xp_transactions(reason);

-- Comments
COMMENT ON TABLE xp_transactions IS 'Audit log of all XP awarded to users. Tracks reason and related entities.';
COMMENT ON COLUMN xp_transactions.reason IS 'Action that triggered XP (review_created, photo_uploaded, check_in, etc.).';

-- ========================================
-- 10. LEADERBOARDS (MATERIALIZED VIEWS)
-- ========================================

-- Global Leaderboard (Top 100 all time)
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_global AS
  SELECT
    user_id,
    total_xp,
    current_level,
    ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank
  FROM user_points
  ORDER BY total_xp DESC
  LIMIT 100;

CREATE UNIQUE INDEX idx_leaderboard_global_user_id ON leaderboard_global(user_id);

-- Monthly Leaderboard (Top 50)
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_monthly AS
  SELECT
    user_id,
    monthly_xp,
    current_level,
    ROW_NUMBER() OVER (ORDER BY monthly_xp DESC) as rank
  FROM user_points
  ORDER BY monthly_xp DESC
  LIMIT 50;

CREATE UNIQUE INDEX idx_leaderboard_monthly_user_id ON leaderboard_monthly(user_id);

-- Comments
COMMENT ON MATERIALIZED VIEW leaderboard_global IS 'Top 100 users by total XP (all time). Refresh hourly.';
COMMENT ON MATERIALIZED VIEW leaderboard_monthly IS 'Top 50 users by monthly XP. Refresh hourly.';

-- ========================================
-- FUNCTIONS & TRIGGERS
-- ========================================

-- Function: Update user_points.updated_at on modification
CREATE OR REPLACE FUNCTION update_user_points_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_points_timestamp
  BEFORE UPDATE ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_timestamp();

-- Function: Award XP to user (helper function)
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

  -- Update streak automatically
  PERFORM update_streak(p_user_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function: Reset monthly XP (run on 1st of each month via cron)
CREATE OR REPLACE FUNCTION reset_monthly_xp()
RETURNS void AS $$
BEGIN
  UPDATE user_points
  SET
    monthly_xp = 0,
    last_monthly_reset = NOW()
  WHERE DATE_TRUNC('month', last_monthly_reset) < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- Function: Update streak (called daily)
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  SELECT last_activity_date, current_streak_days, longest_streak_days
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM user_points
  WHERE user_id = p_user_id;

  -- Check if activity is consecutive
  IF v_last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Continue streak
    v_current_streak := v_current_streak + 1;
  ELSIF v_last_activity = CURRENT_DATE THEN
    -- Same day activity, no change
    RETURN;
  ELSE
    -- Streak broken, reset to 1
    v_current_streak := 1;
  END IF;

  -- Update longest streak if needed
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  -- Update user_points
  UPDATE user_points
  SET
    current_streak_days = v_current_streak,
    longest_streak_days = v_longest_streak,
    last_activity_date = CURRENT_DATE
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Refresh leaderboards (run hourly via cron)
CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_global;
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_monthly;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MIGRATION ROLLBACK (if needed)
-- ========================================
-- To rollback this migration, run:
-- DROP FUNCTION IF EXISTS refresh_leaderboards();
-- DROP FUNCTION IF EXISTS update_streak(UUID);
-- DROP FUNCTION IF EXISTS reset_monthly_xp();
-- DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, VARCHAR, VARCHAR, UUID);
-- DROP FUNCTION IF EXISTS update_user_points_timestamp();
-- DROP MATERIALIZED VIEW IF EXISTS leaderboard_monthly CASCADE;
-- DROP MATERIALIZED VIEW IF EXISTS leaderboard_global CASCADE;
-- DROP TABLE IF EXISTS xp_transactions CASCADE;
-- DROP TABLE IF EXISTS review_votes CASCADE;
-- DROP TABLE IF EXISTS user_followers CASCADE;
-- DROP TABLE IF EXISTS check_ins CASCADE;
-- DROP TABLE IF EXISTS user_mission_progress CASCADE;
-- DROP TABLE IF EXISTS missions CASCADE;
-- DROP TABLE IF EXISTS user_badges CASCADE;
-- DROP TABLE IF EXISTS badges CASCADE;
-- DROP TABLE IF EXISTS user_points CASCADE;
