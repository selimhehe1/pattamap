-- ========================================
-- MIGRATION: Add Enhanced Leaderboards
-- Version: v10.4
-- Date: 2025-12-12
-- Description: Create materialized views for weekly and category leaderboards
-- ========================================

-- Purpose: Add weekly leaderboards and category-based leaderboards
-- (top reviewers, photographers, check-ins, helpful voters)

-- ========================================
-- 1. WEEKLY LEADERBOARD VIEW
-- ========================================

-- Drop if exists (for re-running)
DROP MATERIALIZED VIEW IF EXISTS leaderboard_weekly CASCADE;

CREATE MATERIALIZED VIEW leaderboard_weekly AS
SELECT
  up.user_id,
  u.username,
  up.current_level,
  SUM(xt.xp_amount) AS weekly_xp,
  EXTRACT(WEEK FROM xt.created_at) AS week_number,
  EXTRACT(YEAR FROM xt.created_at) AS year_number
FROM user_points up
JOIN users u ON up.user_id = u.id
LEFT JOIN xp_transactions xt ON up.user_id = xt.user_id
  AND xt.created_at >= DATE_TRUNC('week', CURRENT_DATE)
  AND xt.created_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
GROUP BY up.user_id, u.username, up.current_level, week_number, year_number
ORDER BY weekly_xp DESC NULLS LAST
LIMIT 100;

CREATE UNIQUE INDEX idx_leaderboard_weekly_user ON leaderboard_weekly(user_id);

COMMENT ON MATERIALIZED VIEW leaderboard_weekly IS 'Weekly XP leaderboard - refreshed periodically';

-- ========================================
-- 2. TOP REVIEWERS LEADERBOARD
-- ========================================

DROP MATERIALIZED VIEW IF EXISTS leaderboard_reviewers CASCADE;

CREATE MATERIALIZED VIEW leaderboard_reviewers AS
SELECT
  c.user_id,
  u.username,
  up.current_level,
  COUNT(*) AS review_count,
  AVG(COALESCE(c.ambiance_rating, 0) + COALESCE(c.service_rating, 0) + COALESCE(c.value_rating, 0)) / 3 AS avg_rating_given
FROM comments c
JOIN users u ON c.user_id = u.id
LEFT JOIN user_points up ON c.user_id = up.user_id
WHERE c.content IS NOT NULL
  AND LENGTH(c.content) >= 20  -- Meaningful reviews only
GROUP BY c.user_id, u.username, up.current_level
HAVING COUNT(*) >= 1
ORDER BY review_count DESC
LIMIT 50;

CREATE UNIQUE INDEX idx_leaderboard_reviewers_user ON leaderboard_reviewers(user_id);

COMMENT ON MATERIALIZED VIEW leaderboard_reviewers IS 'Top reviewers by number of meaningful reviews';

-- ========================================
-- 3. TOP PHOTOGRAPHERS LEADERBOARD
-- ========================================

DROP MATERIALIZED VIEW IF EXISTS leaderboard_photographers CASCADE;

CREATE MATERIALIZED VIEW leaderboard_photographers AS
SELECT
  upu.user_id,
  u.username,
  up.current_level,
  COUNT(*) AS photo_count,
  COUNT(DISTINCT upu.establishment_id) AS establishments_photographed
FROM user_photo_uploads upu
JOIN users u ON upu.user_id = u.id
LEFT JOIN user_points up ON upu.user_id = up.user_id
WHERE upu.status = 'approved'
GROUP BY upu.user_id, u.username, up.current_level
HAVING COUNT(*) >= 1
ORDER BY photo_count DESC
LIMIT 50;

CREATE UNIQUE INDEX idx_leaderboard_photographers_user ON leaderboard_photographers(user_id);

COMMENT ON MATERIALIZED VIEW leaderboard_photographers IS 'Top photographers by approved photo uploads';

-- ========================================
-- 4. TOP CHECK-INS LEADERBOARD
-- ========================================

DROP MATERIALIZED VIEW IF EXISTS leaderboard_checkins CASCADE;

CREATE MATERIALIZED VIEW leaderboard_checkins AS
SELECT
  ci.user_id,
  u.username,
  up.current_level,
  COUNT(*) AS checkin_count,
  COUNT(*) FILTER (WHERE ci.verified = true) AS verified_checkins,
  COUNT(DISTINCT ci.establishment_id) AS unique_establishments
FROM check_ins ci
JOIN users u ON ci.user_id = u.id
LEFT JOIN user_points up ON ci.user_id = up.user_id
GROUP BY ci.user_id, u.username, up.current_level
HAVING COUNT(*) >= 1
ORDER BY verified_checkins DESC, checkin_count DESC
LIMIT 50;

CREATE UNIQUE INDEX idx_leaderboard_checkins_user ON leaderboard_checkins(user_id);

COMMENT ON MATERIALIZED VIEW leaderboard_checkins IS 'Top users by check-ins (prioritizes verified)';

-- ========================================
-- 5. MOST HELPFUL LEADERBOARD
-- ========================================

DROP MATERIALIZED VIEW IF EXISTS leaderboard_helpful CASCADE;

CREATE MATERIALIZED VIEW leaderboard_helpful AS
SELECT
  c.user_id,
  u.username,
  up.current_level,
  COUNT(*) FILTER (WHERE rv.vote_type = 'helpful') AS helpful_votes,
  COUNT(*) FILTER (WHERE rv.vote_type = 'not_helpful') AS not_helpful_votes,
  COUNT(*) AS total_votes_received
FROM comments c
JOIN users u ON c.user_id = u.id
LEFT JOIN user_points up ON c.user_id = up.user_id
LEFT JOIN review_votes rv ON c.id = rv.review_id
WHERE rv.id IS NOT NULL
GROUP BY c.user_id, u.username, up.current_level
HAVING COUNT(*) FILTER (WHERE rv.vote_type = 'helpful') >= 1
ORDER BY helpful_votes DESC
LIMIT 50;

CREATE UNIQUE INDEX idx_leaderboard_helpful_user ON leaderboard_helpful(user_id);

COMMENT ON MATERIALIZED VIEW leaderboard_helpful IS 'Users with most helpful votes on their reviews';

-- ========================================
-- 6. REFRESH FUNCTION
-- ========================================

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

COMMENT ON FUNCTION refresh_leaderboard_views() IS 'Refresh all leaderboard materialized views. Should be called periodically (e.g., every hour via cron).';

-- ========================================
-- 7. RLS POLICIES (Read-only for all authenticated users)
-- ========================================

-- Note: Materialized views don't support RLS directly, but we control access via the API
-- The views are read-only and don't contain sensitive information

-- ========================================
-- 8. GRANT PERMISSIONS
-- ========================================

-- Grant SELECT on views to authenticated users (via service role in production)
-- This would be done at the Supabase dashboard level for RLS

-- ========================================
-- VERIFICATION
-- ========================================

-- Run this to verify the views were created:
-- SELECT COUNT(*) FROM leaderboard_weekly;
-- SELECT COUNT(*) FROM leaderboard_reviewers;
-- SELECT COUNT(*) FROM leaderboard_photographers;
-- SELECT COUNT(*) FROM leaderboard_checkins;
-- SELECT COUNT(*) FROM leaderboard_helpful;
