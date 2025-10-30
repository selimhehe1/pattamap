-- ========================================
-- INSERT 30 MISSIONS - MANUAL EXECUTION
-- ========================================
-- Exécuter ce fichier dans Supabase SQL Editor
-- Temps estimé: 2-3 secondes

-- Nettoyer la table missions si besoin (OPTIONNEL)
-- TRUNCATE TABLE missions RESTART IDENTITY CASCADE;

INSERT INTO missions (name, description, type, xp_reward, reset_frequency, requirements, is_active, badge_reward) VALUES
-- ========================================
-- DAILY MISSIONS (6)
-- ========================================
('Daily Reviewer', 'Write 1 review today', 'daily', 20, 'daily', '{"type": "write_reviews", "count": 1}'::jsonb, true, NULL),
('Photo Hunter', 'Upload 3 photos today', 'daily', 25, 'daily', '{"type": "upload_photos", "count": 3}'::jsonb, true, NULL),
('Explorer', 'Visit 1 new establishment today', 'daily', 15, 'daily', '{"type": "check_in", "count": 1, "unique": true}'::jsonb, true, NULL),
('Social Networker', 'Follow 2 users today', 'daily', 10, 'daily', '{"type": "follow_users", "count": 2}'::jsonb, true, NULL),
('Helpful Community Member', 'Vote "helpful" on 5 reviews today', 'daily', 15, 'daily', '{"type": "vote_helpful", "count": 5}'::jsonb, true, NULL),
('Quality Reviewer', 'Write 1 review with photo and 100+ characters today', 'daily', 35, 'daily', '{"type": "write_quality_review", "count": 1, "min_length": 100, "with_photo": true}'::jsonb, true, NULL),

-- ========================================
-- WEEKLY MISSIONS (6)
-- ========================================
('Weekly Explorer', 'Explore 3 different zones this week', 'weekly', 100, 'weekly', '{"type": "visit_zones", "count": 3, "unique": true}'::jsonb, true, NULL),
('Weekly Contributor', 'Write 5 reviews with photos this week', 'weekly', 150, 'weekly', '{"type": "write_reviews", "count": 5, "with_photos": true}'::jsonb, true, NULL),
('Helpful Week', 'Receive 10 "helpful" votes this week', 'weekly', 80, 'weekly', '{"type": "receive_helpful_votes", "count": 10}'::jsonb, true, NULL),
('Social Week', 'Gain 5 new followers this week', 'weekly', 120, 'weekly', '{"type": "gain_followers", "count": 5}'::jsonb, true, NULL),
('Zone Master Weekly', 'Check-in at 10 different establishments this week', 'weekly', 200, 'weekly', '{"type": "check_in", "count": 10, "unique": true}'::jsonb, true, NULL),
('Photo Marathon', 'Upload 20 photos this week', 'weekly', 100, 'weekly', '{"type": "upload_photos", "count": 20}'::jsonb, true, NULL),

-- ========================================
-- NARRATIVE QUEST 1: Grand Tour of Pattaya (7 steps)
-- ========================================
('Grand Tour: Soi 6', 'Visit 5 establishments in Soi 6 (Step 1/7)', 'narrative', 50, NULL, '{"type": "check_in_zone", "zone": "Soi 6", "count": 5, "quest_id": "grand_tour", "step": 1}'::jsonb, true, NULL),
('Grand Tour: Walking Street', 'Visit 5 establishments in Walking Street (Step 2/7)', 'narrative', 50, NULL, '{"type": "check_in_zone", "zone": "Walking Street", "count": 5, "quest_id": "grand_tour", "step": 2, "prerequisite": "grand_tour_step_1"}'::jsonb, true, NULL),
('Grand Tour: LK Metro', 'Visit 5 establishments in LK Metro (Step 3/7)', 'narrative', 50, NULL, '{"type": "check_in_zone", "zone": "LK Metro", "count": 5, "quest_id": "grand_tour", "step": 3, "prerequisite": "grand_tour_step_2"}'::jsonb, true, NULL),
('Grand Tour: Treetown', 'Visit 5 establishments in Treetown (Step 4/7)', 'narrative', 50, NULL, '{"type": "check_in_zone", "zone": "Treetown", "count": 5, "quest_id": "grand_tour", "step": 4, "prerequisite": "grand_tour_step_3"}'::jsonb, true, NULL),
('Grand Tour: Soi Buakhao', 'Visit 5 establishments in Soi Buakhao (Step 5/7)', 'narrative', 50, NULL, '{"type": "check_in_zone", "zone": "Soi Buakhao", "count": 5, "quest_id": "grand_tour", "step": 5, "prerequisite": "grand_tour_step_4"}'::jsonb, true, NULL),
('Grand Tour: Jomtien', 'Visit 5 establishments in Jomtien (Step 6/7)', 'narrative', 50, NULL, '{"type": "check_in_zone", "zone": "Jomtien", "count": 5, "quest_id": "grand_tour", "step": 6, "prerequisite": "grand_tour_step_5"}'::jsonb, true, NULL),
('Grand Tour: Complete', 'Visit remaining zones (Step 7/7)', 'narrative', 200, NULL, '{"type": "check_in_all_zones", "count": 9, "quest_id": "grand_tour", "step": 7, "prerequisite": "grand_tour_step_6"}'::jsonb, true, (SELECT id FROM badges WHERE name = 'Zone Master')),

-- ========================================
-- NARRATIVE QUEST 2: Reviewer Path (5 steps)
-- ========================================
('Reviewer Path: First Steps', 'Write your first 5 reviews (Step 1/5)', 'narrative', 30, NULL, '{"type": "write_reviews", "count": 5, "quest_id": "reviewer_path", "step": 1}'::jsonb, true, NULL),
('Reviewer Path: Getting Better', 'Write 5 reviews with photos (Step 2/5)', 'narrative', 60, NULL, '{"type": "write_reviews", "count": 5, "with_photos": true, "quest_id": "reviewer_path", "step": 2, "prerequisite": "reviewer_path_step_1"}'::jsonb, true, NULL),
('Reviewer Path: Quality Matters', 'Write 5 detailed reviews (200+ characters) (Step 3/5)', 'narrative', 80, NULL, '{"type": "write_reviews", "count": 5, "min_length": 200, "quest_id": "reviewer_path", "step": 3, "prerequisite": "reviewer_path_step_2"}'::jsonb, true, NULL),
('Reviewer Path: Consistency', 'Write 25 total reviews (Step 4/5)', 'narrative', 120, NULL, '{"type": "write_reviews", "count": 25, "quest_id": "reviewer_path", "step": 4, "prerequisite": "reviewer_path_step_3"}'::jsonb, true, NULL),
('Reviewer Path: Master Critic', 'Write 50 total reviews (Step 5/5)', 'narrative', 250, NULL, '{"type": "write_reviews", "count": 50, "quest_id": "reviewer_path", "step": 5, "prerequisite": "reviewer_path_step_4"}'::jsonb, true, (SELECT id FROM badges WHERE name = 'Critic Silver')),

-- ========================================
-- NARRATIVE QUEST 3: Social Butterfly (4 steps)
-- ========================================
('Social Butterfly: First Connections', 'Follow 10 users (Step 1/4)', 'narrative', 40, NULL, '{"type": "follow_users", "count": 10, "quest_id": "social_butterfly", "step": 1}'::jsonb, true, NULL),
('Social Butterfly: Growing Network', 'Gain 5 followers (Step 2/4)', 'narrative', 60, NULL, '{"type": "gain_followers", "count": 5, "quest_id": "social_butterfly", "step": 2, "prerequisite": "social_butterfly_step_1"}'::jsonb, true, NULL),
('Social Butterfly: Helpful Member', 'Receive 25 helpful votes (Step 3/4)', 'narrative', 100, NULL, '{"type": "receive_helpful_votes", "count": 25, "quest_id": "social_butterfly", "step": 3, "prerequisite": "social_butterfly_step_2"}'::jsonb, true, NULL),
('Social Butterfly: Community Leader', 'Gain 25 followers (Step 4/4)', 'narrative', 200, NULL, '{"type": "gain_followers", "count": 25, "quest_id": "social_butterfly", "step": 4, "prerequisite": "social_butterfly_step_3"}'::jsonb, true, (SELECT id FROM badges WHERE name = 'Influencer Bronze')),

-- ========================================
-- EVENT MISSIONS (2)
-- ========================================
('Songkran Celebration', 'Check-in at 10 establishments during Songkran Festival (April 13-15)', 'event', 300, NULL, '{"type": "check_in", "count": 10, "event": "songkran"}'::jsonb, false, NULL),
('Halloween Night Out', 'Visit 5 establishments on Halloween night', 'event', 250, NULL, '{"type": "check_in", "count": 5, "event": "halloween"}'::jsonb, false, NULL);

-- ========================================
-- VÉRIFICATION
-- ========================================
SELECT
  type,
  COUNT(*) as count,
  SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_count,
  SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive_count
FROM missions
GROUP BY type
ORDER BY type;

-- Résultat attendu:
-- daily     | 6 | 6 | 0
-- weekly    | 6 | 6 | 0
-- narrative | 16 | 16 | 0
-- event     | 2 | 0 | 2
-- TOTAL     | 30 | 28 | 2
