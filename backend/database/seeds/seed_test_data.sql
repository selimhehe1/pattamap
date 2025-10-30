-- ========================================
-- SEED: Test Data for Gamification System
-- Version: v10.3
-- Date: 2025-01-XX
-- Description: Create test users with various levels and achievements for testing
-- ========================================

-- WARNING: This is TEST DATA ONLY
-- DO NOT run in production! Only use in development/staging environments

-- ========================================
-- TEST USERS SETUP
-- ========================================

-- Note: This assumes you already have users in the users table
-- We'll just create user_points entries for existing users
-- Replace <user-id-1>, <user-id-2>, etc. with actual user IDs from your users table

-- To get existing user IDs, run:
-- SELECT id, username, email FROM users LIMIT 5;

-- ========================================
-- SCENARIO 1: Newbie User (Level 1, 25 XP)
-- ========================================

-- Insert user_points for first test user
INSERT INTO user_points (user_id, total_xp, current_level, monthly_xp, current_streak_days, longest_streak_days, last_activity_date)
VALUES (
  '<user-id-1>',  -- Replace with actual user ID
  25,
  1,  -- Newbie
  25,
  1,
  1,
  CURRENT_DATE
)
ON CONFLICT (user_id) DO UPDATE SET
  total_xp = EXCLUDED.total_xp,
  current_level = EXCLUDED.current_level,
  monthly_xp = EXCLUDED.monthly_xp;

-- Award First Visit badge
INSERT INTO user_badges (user_id, badge_id, earned_at)
VALUES (
  '<user-id-1>',
  (SELECT id FROM badges WHERE name = 'First Visit'),
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- ========================================
-- SCENARIO 2: Explorer User (Level 3, 450 XP)
-- ========================================

INSERT INTO user_points (user_id, total_xp, current_level, monthly_xp, current_streak_days, longest_streak_days, last_activity_date)
VALUES (
  '<user-id-2>',  -- Replace with actual user ID
  450,
  3,  -- Adventurer (300-599 XP)
  180,
  5,
  7,
  CURRENT_DATE
)
ON CONFLICT (user_id) DO UPDATE SET
  total_xp = EXCLUDED.total_xp,
  current_level = EXCLUDED.current_level,
  monthly_xp = EXCLUDED.monthly_xp;

-- Award multiple badges
INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES
('<user-id-2>', (SELECT id FROM badges WHERE name = 'First Visit'), NOW() - INTERVAL '10 days'),
('<user-id-2>', (SELECT id FROM badges WHERE name = 'Zone Explorer'), NOW() - INTERVAL '8 days'),
('<user-id-2>', (SELECT id FROM badges WHERE name = 'First Review'), NOW() - INTERVAL '9 days'),
('<user-id-2>', (SELECT id FROM badges WHERE name = 'Critic Bronze'), NOW() - INTERVAL '5 days'),
('<user-id-2>', (SELECT id FROM badges WHERE name = 'Week Warrior'), NOW() - INTERVAL '2 days')
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- ========================================
-- SCENARIO 3: Veteran User (Level 5, 2200 XP)
-- ========================================

INSERT INTO user_points (user_id, total_xp, current_level, monthly_xp, current_streak_days, longest_streak_days, last_activity_date)
VALUES (
  '<user-id-3>',  -- Replace with actual user ID
  2200,
  5,  -- Veteran (1200-2499 XP)
  650,
  15,
  20,
  CURRENT_DATE
)
ON CONFLICT (user_id) DO UPDATE SET
  total_xp = EXCLUDED.total_xp,
  current_level = EXCLUDED.current_level,
  monthly_xp = EXCLUDED.monthly_xp;

-- Award many badges (high achiever)
INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES
('<user-id-3>', (SELECT id FROM badges WHERE name = 'First Visit'), NOW() - INTERVAL '60 days'),
('<user-id-3>', (SELECT id FROM badges WHERE name = 'Zone Explorer'), NOW() - INTERVAL '55 days'),
('<user-id-3>', (SELECT id FROM badges WHERE name = 'Zone Master'), NOW() - INTERVAL '30 days'),
('<user-id-3>', (SELECT id FROM badges WHERE name = 'First Review'), NOW() - INTERVAL '58 days'),
('<user-id-3>', (SELECT id FROM badges WHERE name = 'Critic Bronze'), NOW() - INTERVAL '50 days'),
('<user-id-3>', (SELECT id FROM badges WHERE name = 'Critic Silver'), NOW() - INTERVAL '20 days'),
('<user-id-3>', (SELECT id FROM badges WHERE name = 'Photographer Bronze'), NOW() - INTERVAL '40 days'),
('<user-id-3>', (SELECT id FROM badges WHERE name = 'Social Butterfly'), NOW() - INTERVAL '45 days'),
('<user-id-3>', (SELECT id FROM badges WHERE name = 'Influencer Bronze'), NOW() - INTERVAL '25 days'),
('<user-id-3>', (SELECT id FROM badges WHERE name = 'Week Warrior'), NOW() - INTERVAL '50 days'),
('<user-id-3>', (SELECT id FROM badges WHERE name = 'Month Master'), NOW() - INTERVAL '15 days')
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- ========================================
-- SCENARIO 4: Legend User (Level 6, 4500 XP)
-- ========================================

INSERT INTO user_points (user_id, total_xp, current_level, monthly_xp, current_streak_days, longest_streak_days, last_activity_date)
VALUES (
  '<user-id-4>',  -- Replace with actual user ID
  4500,
  6,  -- Legend (3000-5999 XP)
  1200,
  30,
  45,
  CURRENT_DATE
)
ON CONFLICT (user_id) DO UPDATE SET
  total_xp = EXCLUDED.total_xp,
  current_level = EXCLUDED.current_level,
  monthly_xp = EXCLUDED.monthly_xp;

-- Award elite badges
INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES
('<user-id-4>', (SELECT id FROM badges WHERE name = 'Zone Master'), NOW() - INTERVAL '40 days'),
('<user-id-4>', (SELECT id FROM badges WHERE name = 'Critic Silver'), NOW() - INTERVAL '30 days'),
('<user-id-4>', (SELECT id FROM badges WHERE name = 'Critic Gold'), NOW() - INTERVAL '10 days'),
('<user-id-4>', (SELECT id FROM badges WHERE name = 'Photographer Silver'), NOW() - INTERVAL '25 days'),
('<user-id-4>', (SELECT id FROM badges WHERE name = 'Influencer Silver'), NOW() - INTERVAL '15 days'),
('<user-id-4>', (SELECT id FROM badges WHERE name = 'Month Master'), NOW() - INTERVAL '35 days'),
('<user-id-4>', (SELECT id FROM badges WHERE name = 'Dedication'), NOW() - INTERVAL '5 days'),
('<user-id-4>', (SELECT id FROM badges WHERE name = 'Helpful Bronze'), NOW() - INTERVAL '20 days'),
('<user-id-4>', (SELECT id FROM badges WHERE name = 'Trusted Voice'), NOW() - INTERVAL '12 days')
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- ========================================
-- SCENARIO 5: Ambassador User (Level 7, 8000 XP)
-- ========================================

INSERT INTO user_points (user_id, total_xp, current_level, monthly_xp, current_streak_days, longest_streak_days, last_activity_date)
VALUES (
  '<user-id-5>',  -- Replace with actual user ID
  8000,
  7,  -- Ambassador (6000+ XP)
  2500,
  60,
  90,
  CURRENT_DATE
)
ON CONFLICT (user_id) DO UPDATE SET
  total_xp = EXCLUDED.total_xp,
  current_level = EXCLUDED.current_level,
  monthly_xp = EXCLUDED.monthly_xp;

-- Award legendary badges
INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES
('<user-id-5>', (SELECT id FROM badges WHERE name = 'Zone Master'), NOW() - INTERVAL '80 days'),
('<user-id-5>', (SELECT id FROM badges WHERE name = 'Explorer Elite'), NOW() - INTERVAL '50 days'),
('<user-id-5>', (SELECT id FROM badges WHERE name = 'Critic Gold'), NOW() - INTERVAL '30 days'),
('<user-id-5>', (SELECT id FROM badges WHERE name = 'Critic Platinum'), NOW() - INTERVAL '10 days'),
('<user-id-5>', (SELECT id FROM badges WHERE name = 'Photographer Gold'), NOW() - INTERVAL '25 days'),
('<user-id-5>', (SELECT id FROM badges WHERE name = 'Influencer Gold'), NOW() - INTERVAL '20 days'),
('<user-id-5>', (SELECT id FROM badges WHERE name = 'Dedication'), NOW() - INTERVAL '60 days'),
('<user-id-5>', (SELECT id FROM badges WHERE name = 'Helpful Silver'), NOW() - INTERVAL '35 days'),
('<user-id-5>', (SELECT id FROM badges WHERE name = 'Trusted Voice'), NOW() - INTERVAL '40 days'),
('<user-id-5>', (SELECT id FROM badges WHERE name = 'Content Creator'), NOW() - INTERVAL '15 days'),
('<user-id-5>', (SELECT id FROM badges WHERE name = 'Anniversary Bronze'), NOW() - INTERVAL '5 days')
ON CONFLICT (user_id, badge_id) DO NOTHING;

-- ========================================
-- SAMPLE XP TRANSACTIONS
-- ========================================

-- Recent transactions for test users
INSERT INTO xp_transactions (user_id, xp_amount, reason, entity_type, entity_id, created_at) VALUES
('<user-id-1>', 15, 'check_in', 'establishment', NULL, NOW() - INTERVAL '2 hours'),
('<user-id-1>', 10, 'write_review', 'review', NULL, NOW() - INTERVAL '1 day'),
('<user-id-2>', 25, 'write_review', 'review', NULL, NOW() - INTERVAL '3 hours'),
('<user-id-2>', 15, 'upload_photo', 'photo', NULL, NOW() - INTERVAL '5 hours'),
('<user-id-2>', 50, 'earn_badge', 'badge', NULL, NOW() - INTERVAL '2 days'),
('<user-id-3>', 100, 'complete_mission', 'mission', NULL, NOW() - INTERVAL '1 hour'),
('<user-id-3>', 25, 'write_review', 'review', NULL, NOW() - INTERVAL '4 hours'),
('<user-id-4>', 150, 'complete_mission', 'mission', NULL, NOW() - INTERVAL '30 minutes'),
('<user-id-5>', 200, 'complete_mission', 'mission', NULL, NOW() - INTERVAL '15 minutes');

-- ========================================
-- SAMPLE MISSION PROGRESS
-- ========================================

-- User 2 has started some missions
INSERT INTO user_missions (user_id, mission_id, progress, completed, last_progress_at) VALUES
('<user-id-2>', (SELECT id FROM missions WHERE name = 'Daily Reviewer'), 0, false, NOW()),
('<user-id-2>', (SELECT id FROM missions WHERE name = 'Photo Hunter'), 2, false, NOW()),
('<user-id-2>', (SELECT id FROM missions WHERE name = 'Weekly Explorer'), 1, false, NOW() - INTERVAL '2 days')
ON CONFLICT (user_id, mission_id) DO UPDATE SET
  progress = EXCLUDED.progress,
  last_progress_at = EXCLUDED.last_progress_at;

-- User 3 has completed some missions
INSERT INTO user_missions (user_id, mission_id, progress, completed, completed_at, last_progress_at) VALUES
('<user-id-3>', (SELECT id FROM missions WHERE name = 'Daily Reviewer'), 1, true, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'),
('<user-id-3>', (SELECT id FROM missions WHERE name = 'Photo Hunter'), 3, true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('<user-id-3>', (SELECT id FROM missions WHERE name = 'Weekly Explorer'), 3, true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('<user-id-3>', (SELECT id FROM missions WHERE name = 'Grand Tour: Soi 6'), 5, true, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('<user-id-3>', (SELECT id FROM missions WHERE name = 'Grand Tour: Walking Street'), 3, false, NOW() - INTERVAL '8 days')
ON CONFLICT (user_id, mission_id) DO UPDATE SET
  progress = EXCLUDED.progress,
  completed = EXCLUDED.completed,
  completed_at = EXCLUDED.completed_at,
  last_progress_at = EXCLUDED.last_progress_at;

-- ========================================
-- SAMPLE CHECK-INS
-- ========================================

-- Note: Replace with actual establishment IDs from your database
-- Get establishment IDs: SELECT id, name FROM establishments LIMIT 5;

INSERT INTO check_ins (user_id, establishment_id, latitude, longitude, verified, distance_meters, created_at) VALUES
('<user-id-1>', '<establishment-id-1>', 12.9342, 100.8844, true, 45.5, NOW() - INTERVAL '2 hours'),
('<user-id-2>', '<establishment-id-2>', 12.9350, 100.8850, true, 32.8, NOW() - INTERVAL '1 day'),
('<user-id-2>', '<establishment-id-3>', 12.9355, 100.8855, true, 28.3, NOW() - INTERVAL '3 days'),
('<user-id-3>', '<establishment-id-1>', 12.9342, 100.8844, true, 51.2, NOW() - INTERVAL '5 days'),
('<user-id-3>', '<establishment-id-4>', 12.9360, 100.8860, false, 120.5, NOW() - INTERVAL '10 days');

-- ========================================
-- SAMPLE USER FOLLOWS
-- ========================================

-- User 2 follows User 3
INSERT INTO user_follows (follower_id, following_id, created_at) VALUES
('<user-id-2>', '<user-id-3>', NOW() - INTERVAL '15 days')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- User 3 follows User 4 and User 5
INSERT INTO user_follows (follower_id, following_id, created_at) VALUES
('<user-id-3>', '<user-id-4>', NOW() - INTERVAL '20 days'),
('<user-id-3>', '<user-id-5>', NOW() - INTERVAL '25 days')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- User 4 follows User 5
INSERT INTO user_follows (follower_id, following_id, created_at) VALUES
('<user-id-4>', '<user-id-5>', NOW() - INTERVAL '30 days')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- User 1 follows User 2
INSERT INTO user_follows (follower_id, following_id, created_at) VALUES
('<user-id-1>', '<user-id-2>', NOW() - INTERVAL '1 day')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- ========================================
-- SAMPLE REVIEW VOTES
-- ========================================

-- Note: Replace with actual review IDs from your database
-- Get review IDs: SELECT id, user_id FROM reviews LIMIT 5;

INSERT INTO review_votes (user_id, review_id, created_at) VALUES
('<user-id-2>', '<review-id-1>', NOW() - INTERVAL '10 days'),
('<user-id-3>', '<review-id-1>', NOW() - INTERVAL '8 days'),
('<user-id-3>', '<review-id-2>', NOW() - INTERVAL '5 days'),
('<user-id-4>', '<review-id-2>', NOW() - INTERVAL '3 days'),
('<user-id-5>', '<review-id-3>', NOW() - INTERVAL '1 day')
ON CONFLICT (user_id, review_id) DO NOTHING;

-- ========================================
-- REFRESH MATERIALIZED VIEWS
-- ========================================

-- Refresh leaderboards to include test data
REFRESH MATERIALIZED VIEW leaderboard_global;
REFRESH MATERIALIZED VIEW leaderboard_monthly;

-- ========================================
-- STATISTICS
-- ========================================

DO $$
DECLARE
  user_points_count INT;
  user_badges_count INT;
  user_missions_count INT;
  check_ins_count INT;
  follows_count INT;
  votes_count INT;
BEGIN
  SELECT COUNT(*) INTO user_points_count FROM user_points;
  SELECT COUNT(*) INTO user_badges_count FROM user_badges;
  SELECT COUNT(*) INTO user_missions_count FROM user_missions;
  SELECT COUNT(*) INTO check_ins_count FROM check_ins;
  SELECT COUNT(*) INTO follows_count FROM user_follows;
  SELECT COUNT(*) INTO votes_count FROM review_votes;

  RAISE NOTICE 'Test Data Created Successfully!';
  RAISE NOTICE '=====================================';
  RAISE NOTICE 'User Points Entries: %', user_points_count;
  RAISE NOTICE 'User Badges Earned: %', user_badges_count;
  RAISE NOTICE 'User Mission Progress: %', user_missions_count;
  RAISE NOTICE 'Check-ins: %', check_ins_count;
  RAISE NOTICE 'User Follows: %', follows_count;
  RAISE NOTICE 'Review Votes: %', votes_count;
  RAISE NOTICE '=====================================';
  RAISE NOTICE 'Leaderboards refreshed!';
END $$;

-- ========================================
-- USAGE INSTRUCTIONS
-- ========================================

-- 1. First, get your existing user IDs:
--    SELECT id, username, email FROM users LIMIT 5;
--
-- 2. Replace all <user-id-X> placeholders with actual user IDs
--
-- 3. If testing check-ins, replace <establishment-id-X> with actual establishment IDs:
--    SELECT id, name FROM establishments LIMIT 5;
--
-- 4. If testing review votes, replace <review-id-X> with actual review IDs:
--    SELECT id, user_id FROM reviews LIMIT 5;
--
-- 5. Run this script in Supabase SQL Editor
--
-- 6. Verify test data:
--    SELECT * FROM user_points ORDER BY total_xp DESC;
--    SELECT * FROM leaderboard_global LIMIT 10;
