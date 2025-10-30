-- ========================================
-- SEED: Gamification Missions
-- Version: v10.3
-- Date: 2025-01-XX
-- Description: Populate missions table with daily/weekly/narrative missions
-- ========================================

-- Purpose: Define initial missions for the gamification system
-- Types: daily (reset daily), weekly (reset weekly), narrative (progressive quests)

-- Clear existing missions (if re-seeding)
TRUNCATE TABLE missions RESTART IDENTITY CASCADE;

-- ========================================
-- DAILY MISSIONS (Reset every 24h at midnight)
-- ========================================

INSERT INTO missions (name, description, type, xp_reward, reset_frequency, requirements, is_active) VALUES
(
  'Daily Reviewer',
  'Write 1 review today',
  'daily',
  20,
  'daily',
  '{"type": "write_reviews", "count": 1}'::jsonb,
  true
),
(
  'Photo Hunter',
  'Upload 3 photos today',
  'daily',
  25,
  'daily',
  '{"type": "upload_photos", "count": 3}'::jsonb,
  true
),
(
  'Explorer',
  'Visit 1 new establishment today',
  'daily',
  15,
  'daily',
  '{"type": "check_in", "count": 1, "unique": true}'::jsonb,
  true
),
(
  'Social Networker',
  'Follow 2 users today',
  'daily',
  10,
  'daily',
  '{"type": "follow_users", "count": 2}'::jsonb,
  true
),
(
  'Helpful Community Member',
  'Vote "helpful" on 5 reviews today',
  'daily',
  15,
  'daily',
  '{"type": "vote_helpful", "count": 5}'::jsonb,
  true
),
(
  'Quality Reviewer',
  'Write 1 review with photo and 100+ characters today',
  'daily',
  35,
  'daily',
  '{"type": "write_quality_review", "count": 1, "min_length": 100, "with_photo": true}'::jsonb,
  true
);

-- ========================================
-- WEEKLY MISSIONS (Reset every Monday at midnight)
-- ========================================

INSERT INTO missions (name, description, type, xp_reward, badge_reward, reset_frequency, requirements, is_active) VALUES
(
  'Weekly Explorer',
  'Explore 3 different zones this week',
  'weekly',
  100,
  NULL,
  'weekly',
  '{"type": "visit_zones", "count": 3, "unique": true}'::jsonb,
  true
),
(
  'Weekly Contributor',
  'Write 5 reviews with photos this week',
  'weekly',
  150,
  NULL,
  'weekly',
  '{"type": "write_reviews", "count": 5, "with_photos": true}'::jsonb,
  true
),
(
  'Helpful Week',
  'Receive 10 "helpful" votes this week',
  'weekly',
  80,
  NULL,
  'weekly',
  '{"type": "receive_helpful_votes", "count": 10}'::jsonb,
  true
),
(
  'Social Week',
  'Gain 5 new followers this week',
  'weekly',
  120,
  NULL,
  'weekly',
  '{"type": "gain_followers", "count": 5}'::jsonb,
  true
),
(
  'Zone Master Weekly',
  'Check-in at 10 different establishments this week',
  'weekly',
  200,
  NULL,
  'weekly',
  '{"type": "check_in", "count": 10, "unique": true}'::jsonb,
  true
),
(
  'Photo Marathon',
  'Upload 20 photos this week',
  'weekly',
  100,
  NULL,
  'weekly',
  '{"type": "upload_photos", "count": 20}'::jsonb,
  true
);

-- ========================================
-- NARRATIVE QUESTS (Progressive multi-step missions)
-- ========================================

-- Quest 1: The Grand Tour of Pattaya (7 steps)
INSERT INTO missions (name, description, type, xp_reward, badge_reward, reset_frequency, requirements, is_active) VALUES
(
  'Grand Tour: Soi 6',
  'Visit 5 establishments in Soi 6 (Step 1/7)',
  'narrative',
  50,
  NULL,
  NULL,
  '{"type": "check_in_zone", "zone": "Soi 6", "count": 5, "quest_id": "grand_tour", "step": 1}'::jsonb,
  true
),
(
  'Grand Tour: Walking Street',
  'Visit 5 establishments in Walking Street (Step 2/7)',
  'narrative',
  50,
  NULL,
  NULL,
  '{"type": "check_in_zone", "zone": "Walking Street", "count": 5, "quest_id": "grand_tour", "step": 2, "prerequisite": "grand_tour_step_1"}'::jsonb,
  true
),
(
  'Grand Tour: LK Metro',
  'Visit 5 establishments in LK Metro (Step 3/7)',
  'narrative',
  50,
  NULL,
  NULL,
  '{"type": "check_in_zone", "zone": "LK Metro", "count": 5, "quest_id": "grand_tour", "step": 3, "prerequisite": "grand_tour_step_2"}'::jsonb,
  true
),
(
  'Grand Tour: Treetown',
  'Visit 5 establishments in Treetown (Step 4/7)',
  'narrative',
  50,
  NULL,
  NULL,
  '{"type": "check_in_zone", "zone": "Treetown", "count": 5, "quest_id": "grand_tour", "step": 4, "prerequisite": "grand_tour_step_3"}'::jsonb,
  true
),
(
  'Grand Tour: Soi Buakhao',
  'Visit 5 establishments in Soi Buakhao (Step 5/7)',
  'narrative',
  50,
  NULL,
  NULL,
  '{"type": "check_in_zone", "zone": "Soi Buakhao", "count": 5, "quest_id": "grand_tour", "step": 5, "prerequisite": "grand_tour_step_4"}'::jsonb,
  true
),
(
  'Grand Tour: Jomtien',
  'Visit 5 establishments in Jomtien (Step 6/7)',
  'narrative',
  50,
  NULL,
  NULL,
  '{"type": "check_in_zone", "zone": "Jomtien", "count": 5, "quest_id": "grand_tour", "step": 6, "prerequisite": "grand_tour_step_5"}'::jsonb,
  true
),
(
  'Grand Tour: Complete',
  'Visit remaining zones (Step 7/7)',
  'narrative',
  200,
  (SELECT id FROM badges WHERE name = 'Zone Master'),
  NULL,
  '{"type": "check_in_all_zones", "count": 9, "quest_id": "grand_tour", "step": 7, "prerequisite": "grand_tour_step_6"}'::jsonb,
  true
);

-- Quest 2: The Reviewer Path (5 steps)
INSERT INTO missions (name, description, type, xp_reward, badge_reward, reset_frequency, requirements, is_active) VALUES
(
  'Reviewer Path: First Steps',
  'Write your first 5 reviews (Step 1/5)',
  'narrative',
  30,
  NULL,
  NULL,
  '{"type": "write_reviews", "count": 5, "quest_id": "reviewer_path", "step": 1}'::jsonb,
  true
),
(
  'Reviewer Path: Getting Better',
  'Write 5 reviews with photos (Step 2/5)',
  'narrative',
  60,
  NULL,
  NULL,
  '{"type": "write_reviews", "count": 5, "with_photos": true, "quest_id": "reviewer_path", "step": 2, "prerequisite": "reviewer_path_step_1"}'::jsonb,
  true
),
(
  'Reviewer Path: Quality Matters',
  'Write 5 detailed reviews (200+ characters) (Step 3/5)',
  'narrative',
  80,
  NULL,
  NULL,
  '{"type": "write_reviews", "count": 5, "min_length": 200, "quest_id": "reviewer_path", "step": 3, "prerequisite": "reviewer_path_step_2"}'::jsonb,
  true
),
(
  'Reviewer Path: Consistency',
  'Write 25 total reviews (Step 4/5)',
  'narrative',
  120,
  NULL,
  NULL,
  '{"type": "write_reviews", "count": 25, "quest_id": "reviewer_path", "step": 4, "prerequisite": "reviewer_path_step_3"}'::jsonb,
  true
),
(
  'Reviewer Path: Master Critic',
  'Write 50 total reviews (Step 5/5)',
  'narrative',
  250,
  (SELECT id FROM badges WHERE name = 'Critic Silver'),
  NULL,
  '{"type": "write_reviews", "count": 50, "quest_id": "reviewer_path", "step": 5, "prerequisite": "reviewer_path_step_4"}'::jsonb,
  true
);

-- Quest 3: The Social Butterfly (4 steps)
INSERT INTO missions (name, description, type, xp_reward, badge_reward, reset_frequency, requirements, is_active) VALUES
(
  'Social Butterfly: First Connections',
  'Follow 10 users (Step 1/4)',
  'narrative',
  40,
  NULL,
  NULL,
  '{"type": "follow_users", "count": 10, "quest_id": "social_butterfly", "step": 1}'::jsonb,
  true
),
(
  'Social Butterfly: Growing Network',
  'Gain 5 followers (Step 2/4)',
  'narrative',
  60,
  NULL,
  NULL,
  '{"type": "gain_followers", "count": 5, "quest_id": "social_butterfly", "step": 2, "prerequisite": "social_butterfly_step_1"}'::jsonb,
  true
),
(
  'Social Butterfly: Helpful Member',
  'Receive 25 helpful votes (Step 3/4)',
  'narrative',
  100,
  NULL,
  NULL,
  '{"type": "receive_helpful_votes", "count": 25, "quest_id": "social_butterfly", "step": 3, "prerequisite": "social_butterfly_step_2"}'::jsonb,
  true
),
(
  'Social Butterfly: Community Leader',
  'Gain 25 followers (Step 4/4)',
  'narrative',
  200,
  (SELECT id FROM badges WHERE name = 'Influencer Bronze'),
  NULL,
  '{"type": "gain_followers", "count": 25, "quest_id": "social_butterfly", "step": 4, "prerequisite": "social_butterfly_step_3"}'::jsonb,
  true
);

-- ========================================
-- EVENT MISSIONS (Seasonal, time-limited)
-- ========================================

-- Example: Songkran Special (Thai New Year - April 13-15)
INSERT INTO missions (name, description, type, xp_reward, badge_reward, reset_frequency, start_date, end_date, requirements, is_active, sort_order) VALUES
(
  'Songkran Celebration',
  'Check-in at 10 establishments during Songkran Festival (April 13-15)',
  'event',
  300,
  NULL,
  NULL,
  '2025-04-13 00:00:00+07',
  '2025-04-15 23:59:59+07',
  '{"type": "check_in", "count": 10, "event": "songkran"}'::jsonb,
  false -- Will be activated before Songkran
);

-- Example: Halloween Special (October 31)
INSERT INTO missions (name, description, type, xp_reward, badge_reward, reset_frequency, start_date, end_date, requirements, is_active, sort_order) VALUES
(
  'Halloween Night Out',
  'Visit 5 establishments on Halloween night',
  'event',
  250,
  NULL,
  NULL,
  '2025-10-31 18:00:00+07',
  '2025-11-01 06:00:00+07',
  '{"type": "check_in", "count": 5, "event": "halloween"}'::jsonb,
  false -- Will be activated before Halloween
);

-- ========================================
-- STATISTICS
-- ========================================

DO $$
DECLARE
  daily_count INT;
  weekly_count INT;
  narrative_count INT;
  event_count INT;
  total_count INT;
BEGIN
  SELECT COUNT(*) INTO daily_count FROM missions WHERE type = 'daily';
  SELECT COUNT(*) INTO weekly_count FROM missions WHERE type = 'weekly';
  SELECT COUNT(*) INTO narrative_count FROM missions WHERE type = 'narrative';
  SELECT COUNT(*) INTO event_count FROM missions WHERE type = 'event';
  SELECT COUNT(*) INTO total_count FROM missions;

  RAISE NOTICE 'Gamification Missions Seeded Successfully!';
  RAISE NOTICE '=====================================';
  RAISE NOTICE 'Daily Missions: %', daily_count;
  RAISE NOTICE 'Weekly Missions: %', weekly_count;
  RAISE NOTICE 'Narrative Quests: %', narrative_count;
  RAISE NOTICE 'Event Missions: %', event_count;
  RAISE NOTICE '=====================================';
  RAISE NOTICE 'TOTAL: % missions', total_count;
END $$;
