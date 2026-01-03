-- ========================================
-- MIGRATION: Exclude Employees from Leaderboards
-- Version: v10.5
-- Date: 2026-01-03
-- Description: Recreate materialized views to filter out employees (account_type = 'employee')
-- ========================================
BEGIN;

-- Purpose: Employees should not appear in gamification leaderboards
-- They have their own profile system and are not regular users

-- ========================================
-- 1. DROP EXISTING VIEWS
-- ========================================

DROP MATERIALIZED VIEW IF EXISTS leaderboard_global CASCADE;
DROP MATERIALIZED VIEW IF EXISTS leaderboard_monthly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS leaderboard_weekly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS leaderboard_reviewers CASCADE;
DROP MATERIALIZED VIEW IF EXISTS leaderboard_photographers CASCADE;
DROP MATERIALIZED VIEW IF EXISTS leaderboard_checkins CASCADE;
DROP MATERIALIZED VIEW IF EXISTS leaderboard_helpful CASCADE;

-- ========================================
-- 2. RECREATE GLOBAL LEADERBOARD (with employee filter)
-- ========================================

CREATE MATERIALIZED VIEW leaderboard_global AS
  SELECT
    up.user_id,
    up.total_xp,
    up.current_level,
    ROW_NUMBER() OVER (ORDER BY up.total_xp DESC) as rank
  FROM user_points up
  JOIN users u ON up.user_id = u.id
  WHERE u.account_type IS NULL OR u.account_type != 'employee'
  ORDER BY up.total_xp DESC
  LIMIT 100;

CREATE UNIQUE INDEX idx_leaderboard_global_user_id ON leaderboard_global(user_id);

COMMENT ON MATERIALIZED VIEW leaderboard_global IS 'Top 100 users by total XP (all time). Excludes employees.';

-- ========================================
-- 3. RECREATE MONTHLY LEADERBOARD (with employee filter)
-- ========================================

CREATE MATERIALIZED VIEW leaderboard_monthly AS
  SELECT
    up.user_id,
    up.monthly_xp,
    up.current_level,
    ROW_NUMBER() OVER (ORDER BY up.monthly_xp DESC) as rank
  FROM user_points up
  JOIN users u ON up.user_id = u.id
  WHERE u.account_type IS NULL OR u.account_type != 'employee'
  ORDER BY up.monthly_xp DESC
  LIMIT 50;

CREATE UNIQUE INDEX idx_leaderboard_monthly_user_id ON leaderboard_monthly(user_id);

COMMENT ON MATERIALIZED VIEW leaderboard_monthly IS 'Top 50 users by monthly XP. Excludes employees.';

-- ========================================
-- 4. RECREATE WEEKLY LEADERBOARD (with employee filter)
-- ========================================

CREATE MATERIALIZED VIEW leaderboard_weekly AS
SELECT
  up.user_id,
  u.pseudonym AS username,
  up.current_level,
  COALESCE(SUM(xt.xp_amount), 0) AS weekly_xp,
  EXTRACT(WEEK FROM CURRENT_DATE) AS week_number,
  EXTRACT(YEAR FROM CURRENT_DATE) AS year_number
FROM user_points up
JOIN users u ON up.user_id = u.id
LEFT JOIN xp_transactions xt ON up.user_id = xt.user_id
  AND xt.created_at >= DATE_TRUNC('week', CURRENT_DATE)
  AND xt.created_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
WHERE u.account_type IS NULL OR u.account_type != 'employee'
GROUP BY up.user_id, u.pseudonym, up.current_level
ORDER BY weekly_xp DESC NULLS LAST
LIMIT 100;

CREATE UNIQUE INDEX idx_leaderboard_weekly_user ON leaderboard_weekly(user_id);

COMMENT ON MATERIALIZED VIEW leaderboard_weekly IS 'Weekly XP leaderboard. Excludes employees.';

-- ========================================
-- 5. RECREATE TOP REVIEWERS LEADERBOARD (with employee filter)
-- ========================================

CREATE MATERIALIZED VIEW leaderboard_reviewers AS
SELECT
  c.user_id,
  u.pseudonym AS username,
  up.current_level,
  COUNT(*) AS review_count,
  AVG(COALESCE(c.ambiance_rating, 0) + COALESCE(c.service_rating, 0) + COALESCE(c.value_rating, 0)) / 3 AS avg_rating_given
FROM comments c
JOIN users u ON c.user_id = u.id
LEFT JOIN user_points up ON c.user_id = up.user_id
WHERE c.content IS NOT NULL
  AND LENGTH(c.content) >= 20
  AND (u.account_type IS NULL OR u.account_type != 'employee')
GROUP BY c.user_id, u.pseudonym, up.current_level
HAVING COUNT(*) >= 1
ORDER BY review_count DESC
LIMIT 50;

CREATE UNIQUE INDEX idx_leaderboard_reviewers_user ON leaderboard_reviewers(user_id);

COMMENT ON MATERIALIZED VIEW leaderboard_reviewers IS 'Top reviewers by number of meaningful reviews. Excludes employees.';

-- ========================================
-- 6. RECREATE TOP PHOTOGRAPHERS LEADERBOARD (with employee filter)
-- ========================================

CREATE MATERIALIZED VIEW leaderboard_photographers AS
SELECT
  upu.user_id,
  u.pseudonym AS username,
  up.current_level,
  COUNT(*) AS photo_count,
  COUNT(DISTINCT upu.establishment_id) AS establishments_photographed
FROM user_photo_uploads upu
JOIN users u ON upu.user_id = u.id
LEFT JOIN user_points up ON upu.user_id = up.user_id
WHERE upu.status = 'approved'
  AND (u.account_type IS NULL OR u.account_type != 'employee')
GROUP BY upu.user_id, u.pseudonym, up.current_level
HAVING COUNT(*) >= 1
ORDER BY photo_count DESC
LIMIT 50;

CREATE UNIQUE INDEX idx_leaderboard_photographers_user ON leaderboard_photographers(user_id);

COMMENT ON MATERIALIZED VIEW leaderboard_photographers IS 'Top photographers by approved photo uploads. Excludes employees.';

-- ========================================
-- 7. RECREATE TOP CHECK-INS LEADERBOARD (with employee filter)
-- ========================================

CREATE MATERIALIZED VIEW leaderboard_checkins AS
SELECT
  ci.user_id,
  u.pseudonym AS username,
  up.current_level,
  COUNT(*) AS checkin_count,
  COUNT(*) FILTER (WHERE ci.verified = true) AS verified_checkins,
  COUNT(DISTINCT ci.establishment_id) AS unique_establishments
FROM check_ins ci
JOIN users u ON ci.user_id = u.id
LEFT JOIN user_points up ON ci.user_id = up.user_id
WHERE u.account_type IS NULL OR u.account_type != 'employee'
GROUP BY ci.user_id, u.pseudonym, up.current_level
HAVING COUNT(*) >= 1
ORDER BY verified_checkins DESC, checkin_count DESC
LIMIT 50;

CREATE UNIQUE INDEX idx_leaderboard_checkins_user ON leaderboard_checkins(user_id);

COMMENT ON MATERIALIZED VIEW leaderboard_checkins IS 'Top users by check-ins (prioritizes verified). Excludes employees.';

-- ========================================
-- 8. RECREATE MOST HELPFUL LEADERBOARD (with employee filter)
-- ========================================

CREATE MATERIALIZED VIEW leaderboard_helpful AS
SELECT
  c.user_id,
  u.pseudonym AS username,
  up.current_level,
  COUNT(*) FILTER (WHERE rv.vote_type = 'helpful') AS helpful_votes,
  COUNT(*) FILTER (WHERE rv.vote_type = 'not_helpful') AS not_helpful_votes,
  COUNT(*) AS total_votes_received
FROM comments c
JOIN users u ON c.user_id = u.id
LEFT JOIN user_points up ON c.user_id = up.user_id
LEFT JOIN review_votes rv ON c.id = rv.review_id
WHERE rv.id IS NOT NULL
  AND (u.account_type IS NULL OR u.account_type != 'employee')
GROUP BY c.user_id, u.pseudonym, up.current_level
HAVING COUNT(*) FILTER (WHERE rv.vote_type = 'helpful') >= 1
ORDER BY helpful_votes DESC
LIMIT 50;

CREATE UNIQUE INDEX idx_leaderboard_helpful_user ON leaderboard_helpful(user_id);

COMMENT ON MATERIALIZED VIEW leaderboard_helpful IS 'Users with most helpful votes on their reviews. Excludes employees.';

-- ========================================
-- 9. UPDATE REFRESH FUNCTIONS
-- ========================================

-- Drop and recreate refresh function to ensure it works with new views
DROP FUNCTION IF EXISTS refresh_leaderboards();
DROP FUNCTION IF EXISTS refresh_leaderboard_views();

CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_global;
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_monthly;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_leaderboard_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_weekly;
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_reviewers;
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_photographers;
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_checkins;
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_helpful;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_leaderboards() IS 'Refresh global and monthly leaderboard views. Run hourly via cron.';
COMMENT ON FUNCTION refresh_leaderboard_views() IS 'Refresh all category leaderboard views. Run hourly via cron.';

-- ========================================
-- VERIFICATION
-- ========================================

-- Run these queries to verify the views were created and employees are excluded:
-- SELECT COUNT(*) FROM leaderboard_global;
-- SELECT COUNT(*) FROM leaderboard_monthly;
-- SELECT COUNT(*) FROM leaderboard_weekly;
-- SELECT lg.* FROM leaderboard_global lg JOIN users u ON lg.user_id = u.id WHERE u.account_type = 'employee';
-- (Should return 0 rows)

COMMIT;
