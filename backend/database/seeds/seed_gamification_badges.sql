-- ========================================
-- SEED: Gamification Badges (40+ badges)
-- Version: v10.3
-- Date: 2025-01-XX
-- Description: Populate badges table with 40+ achievement badges across 6 categories
-- ========================================

-- Purpose: Define all available badges for the gamification system
-- Categories: exploration (9), contribution (14), social (7), quality (6), temporal (6), secret (4)

-- Clear existing badges (if re-seeding)
TRUNCATE TABLE badges RESTART IDENTITY CASCADE;

-- ========================================
-- CATEGORY A: EXPLORATION BADGES (9 badges)
-- ========================================

INSERT INTO badges (name, description, icon_url, category, rarity, requirement_type, requirement_value, is_hidden) VALUES
('First Visit', 'Check-in at your first establishment', '🗺️', 'exploration', 'common', 'check_in_count', 1, false),
('Zone Explorer', 'Visit establishments in 3 different zones', '🌍', 'exploration', 'common', 'unique_zones_visited', 3, false),
('Zone Master', 'Visit all 9 zones of Pattaya', '🏆', 'exploration', 'epic', 'unique_zones_visited', 9, false),
('Soi 6 Regular', 'Check-in 10 times in Soi 6', '🍻', 'exploration', 'rare', 'zone_check_ins', 10, false),
('Walking Street Walker', 'Check-in 15 times in Walking Street', '🚶', 'exploration', 'rare', 'zone_check_ins', 15, false),
('Night Owl', 'Check-in after midnight 10 times', '🌃', 'exploration', 'rare', 'night_check_ins', 10, false),
('Early Bird', 'Check-in before 6 PM 5 times', '🌅', 'exploration', 'common', 'early_check_ins', 5, false),
('Venue Hopper', 'Visit 25 different establishments', '🏃', 'exploration', 'rare', 'unique_establishments_visited', 25, false),
('Explorer Elite', 'Visit 50 different establishments', '🎖️', 'exploration', 'epic', 'unique_establishments_visited', 50, false);

-- ========================================
-- CATEGORY B: CONTRIBUTION BADGES (14 badges)
-- ========================================

INSERT INTO badges (name, description, icon_url, category, rarity, requirement_type, requirement_value, is_hidden) VALUES
('First Review', 'Write your first review', '✍️', 'contribution', 'common', 'review_count', 1, false),
('Critic Bronze', 'Write 10 reviews', '📝', 'contribution', 'common', 'review_count', 10, false),
('Critic Silver', 'Write 50 reviews', '📝', 'contribution', 'rare', 'review_count', 50, false),
('Critic Gold', 'Write 100 reviews', '📝', 'contribution', 'epic', 'review_count', 100, false),
('Critic Platinum', 'Write 250 reviews', '📝', 'contribution', 'legendary', 'review_count', 250, false),
('Photographer Bronze', 'Upload 25 photos', '📸', 'contribution', 'common', 'photo_count', 25, false),
('Photographer Silver', 'Upload 100 photos', '📸', 'contribution', 'rare', 'photo_count', 100, false),
('Photographer Gold', 'Upload 250 photos', '📸', 'contribution', 'epic', 'photo_count', 250, false),
('Pioneer', 'Write the first review on 5 new establishments', '🌟', 'contribution', 'rare', 'first_reviews', 5, false),
('Trailblazer', 'Write the first review on 15 new establishments', '⭐', 'contribution', 'epic', 'first_reviews', 15, false),
('Editor', 'Propose 10 profile corrections (approved)', '✏️', 'contribution', 'rare', 'approved_edits', 10, false),
('Curator', 'Propose 30 profile corrections (approved)', '🎨', 'contribution', 'epic', 'approved_edits', 30, false),
('Complete Reviewer', 'Write 5 reviews with photos and 100+ characters', '💯', 'contribution', 'rare', 'complete_reviews', 5, false),
('Content Creator', 'Contribute 50 reviews + 50 photos', '🎬', 'contribution', 'epic', 'total_contributions', 100, false);

-- ========================================
-- CATEGORY C: SOCIAL BADGES (7 badges)
-- ========================================

INSERT INTO badges (name, description, icon_url, category, rarity, requirement_type, requirement_value, is_hidden) VALUES
('Social Butterfly', 'Get your first follower', '🦋', 'social', 'common', 'follower_count', 1, false),
('Influencer Bronze', 'Gain 10 followers', '👥', 'social', 'common', 'follower_count', 10, false),
('Influencer Silver', 'Gain 50 followers', '👥', 'social', 'rare', 'follower_count', 50, false),
('Influencer Gold', 'Gain 100 followers', '👥', 'social', 'epic', 'follower_count', 100, false),
('Helpful Bronze', 'Receive 50 "helpful" votes on your reviews', '👍', 'social', 'rare', 'helpful_votes_received', 50, false),
('Helpful Silver', 'Receive 200 "helpful" votes on your reviews', '👍', 'social', 'epic', 'helpful_votes_received', 200, false),
('Connector', 'Invite 5 friends who complete registration', '🤝', 'social', 'rare', 'referrals_completed', 5, false);

-- ========================================
-- CATEGORY D: QUALITY BADGES (6 badges)
-- ========================================

INSERT INTO badges (name, description, icon_url, category, rarity, requirement_type, requirement_value, is_hidden) VALUES
('Detailed Reviewer', 'Write 10 reviews with 200+ characters', '📖', 'quality', 'rare', 'detailed_reviews', 10, false),
('Expert Reviewer', 'Write reviews in all establishment categories', '🎖️', 'quality', 'epic', 'all_categories_reviewed', 7, false),
('Trusted Voice', '80% of your reviews marked "helpful"', '🏅', 'quality', 'epic', 'helpful_percentage', 80, false),
('Photo Pro', 'Upload 10 photos with 1080p+ resolution', '📷', 'quality', 'rare', 'high_res_photos', 10, false),
('Balanced Critic', 'Write reviews with ratings 1-5 stars (all)', '⚖️', 'quality', 'rare', 'all_ratings_used', 5, false),
('Constructive Reviewer', 'Write 20 reviews with detailed notes (pricing, ambiance, etc.)', '💡', 'quality', 'epic', 'constructive_reviews', 20, false);

-- ========================================
-- CATEGORY E: TEMPORAL BADGES (6 badges)
-- ========================================

INSERT INTO badges (name, description, icon_url, category, rarity, requirement_type, requirement_value, is_hidden) VALUES
('Week Warrior', 'Maintain a 7-day activity streak', '🔥', 'temporal', 'common', 'streak_days', 7, false),
('Month Master', 'Maintain a 30-day activity streak', '📅', 'temporal', 'rare', 'streak_days', 30, false),
('Dedication', 'Maintain a 90-day activity streak', '💪', 'temporal', 'epic', 'streak_days', 90, false),
('Anniversary Bronze', 'Be a member for 1 year', '🎂', 'temporal', 'rare', 'account_age_days', 365, false),
('Anniversary Silver', 'Be a member for 2 years', '🎂', 'temporal', 'epic', 'account_age_days', 730, false),
('Early Adopter', 'Join PattaMap in the first 6 months', '🚀', 'temporal', 'legendary', 'early_member', 1, false);

-- ========================================
-- CATEGORY F: SECRET BADGES (4 badges)
-- ========================================

INSERT INTO badges (name, description, icon_url, category, rarity, requirement_type, requirement_value, is_hidden) VALUES
('Lucky 7', 'Write your 7th review on the 7th day of the month at 7 PM', '🎰', 'secret', 'legendary', 'lucky_seven', 1, true),
('World Traveler', 'Write reviews from 3 different countries (geolocation)', '🌏', 'secret', 'epic', 'countries_reviewed_from', 3, true),
('Night Hunter', 'Check-in at 5 establishments between 3-6 AM', '🌙', 'secret', 'rare', 'late_night_check_ins', 5, true),
('Full Moon Party', 'Check-in at 10 establishments during full moon week', '🌕', 'secret', 'legendary', 'full_moon_check_ins', 10, true);

-- ========================================
-- STATISTICS
-- ========================================

-- Count badges by category
DO $$
DECLARE
  exploration_count INT;
  contribution_count INT;
  social_count INT;
  quality_count INT;
  temporal_count INT;
  secret_count INT;
  total_count INT;
BEGIN
  SELECT COUNT(*) INTO exploration_count FROM badges WHERE category = 'exploration';
  SELECT COUNT(*) INTO contribution_count FROM badges WHERE category = 'contribution';
  SELECT COUNT(*) INTO social_count FROM badges WHERE category = 'social';
  SELECT COUNT(*) INTO quality_count FROM badges WHERE category = 'quality';
  SELECT COUNT(*) INTO temporal_count FROM badges WHERE category = 'temporal';
  SELECT COUNT(*) INTO secret_count FROM badges WHERE category = 'secret';
  SELECT COUNT(*) INTO total_count FROM badges;

  RAISE NOTICE 'Gamification Badges Seeded Successfully!';
  RAISE NOTICE '=====================================';
  RAISE NOTICE 'Exploration: % badges', exploration_count;
  RAISE NOTICE 'Contribution: % badges', contribution_count;
  RAISE NOTICE 'Social: % badges', social_count;
  RAISE NOTICE 'Quality: % badges', quality_count;
  RAISE NOTICE 'Temporal: % badges', temporal_count;
  RAISE NOTICE 'Secret: % badges', secret_count;
  RAISE NOTICE '=====================================';
  RAISE NOTICE 'TOTAL: % badges', total_count;
END $$;
