# 🎮 Guide de Migration SQL - Système de Gamification

> **Important**: Ce document contient toutes les requêtes SQL à exécuter dans Supabase SQL Editor pour activer le système de gamification complet.

---

## 📋 Vue d'ensemble

Ce système de gamification ajoute:
- ✅ **9 tables** (user_points, badges, missions, leaderboards, etc.)
- ✅ **2 vues matérialisées** (leaderboards global/monthly)
- ✅ **4 fonctions PostgreSQL** (award_xp, reset_monthly_xp, update_streak, refresh_leaderboards)
- ✅ **46 badges** prédéfinis (6 catégories, 4 raretés)
- ✅ **20+ missions** (daily, weekly, narrative, events)
- ✅ **15 API endpoints** (backend routes déjà créés)
- ✅ **12 composants React** (frontend déjà créé)

---

## 🚀 Instructions d'exécution

### Étape 1: Ouvrir Supabase SQL Editor
1. Aller sur https://supabase.com
2. Sélectionner votre projet PattaMap
3. Aller dans **SQL Editor** (icône "SQL" dans la sidebar)
4. Créer un nouveau query

### Étape 2: Exécuter les migrations dans l'ordre
**Important**: Exécuter les migrations **dans l'ordre exact** ci-dessous.

---

## 📦 Migration 1: Schéma Principal

**Fichier source**: `backend/database/migrations/add_gamification_system.sql`

```sql
-- ========================================
-- GAMIFICATION SYSTEM SCHEMA
-- ========================================

-- Table 1: user_points
-- Stocke les points XP et niveaux des utilisateurs
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0 CHECK (total_xp >= 0),
  current_level INTEGER DEFAULT 1 CHECK (current_level BETWEEN 1 AND 7),
  monthly_xp INTEGER DEFAULT 0 CHECK (monthly_xp >= 0),
  current_streak_days INTEGER DEFAULT 0 CHECK (current_streak_days >= 0),
  longest_streak_days INTEGER DEFAULT 0 CHECK (longest_streak_days >= 0),
  last_activity_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_total_xp ON user_points(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_points_monthly_xp ON user_points(monthly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_points_level ON user_points(current_level);

-- ========================================

-- Table 2: badges
-- Définition des badges disponibles
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('exploration', 'contribution', 'social', 'quality', 'temporal', 'secret')),
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  requirement_type VARCHAR(50) NOT NULL,
  requirement_value INTEGER,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_rarity ON badges(rarity);
CREATE INDEX IF NOT EXISTS idx_badges_hidden ON badges(is_hidden);

-- ========================================

-- Table 3: user_badges
-- Badges obtenus par les utilisateurs
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at DESC);

-- ========================================

-- Table 4: missions
-- Définition des missions/quêtes
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('daily', 'weekly', 'event', 'narrative')),
  xp_reward INTEGER NOT NULL CHECK (xp_reward > 0),
  badge_reward UUID REFERENCES badges(id) ON DELETE SET NULL,
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  reset_frequency VARCHAR(20) CHECK (reset_frequency IN ('daily', 'weekly', 'monthly', 'never')),
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(type);
CREATE INDEX IF NOT EXISTS idx_missions_active ON missions(is_active);
CREATE INDEX IF NOT EXISTS idx_missions_dates ON missions(start_date, end_date);

-- ========================================

-- Table 5: user_mission_progress
-- Progression des missions pour chaque utilisateur
CREATE TABLE IF NOT EXISTS user_mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_progress_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_mission_progress_user_id ON user_mission_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mission_progress_mission_id ON user_mission_progress(mission_id);
CREATE INDEX IF NOT EXISTS idx_user_mission_progress_completed ON user_mission_progress(completed);

-- ========================================

-- Table 6: xp_transactions
-- Journal de toutes les transactions XP
CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_reason ON xp_transactions(reason);

-- ========================================

-- Table 7: check_ins
-- Enregistrement des check-ins géolocalisés
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  verified BOOLEAN DEFAULT false,
  distance_meters DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_establishment_id ON check_ins(establishment_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_created_at ON check_ins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_ins_verified ON check_ins(verified);

-- ========================================

-- Table 8: user_follows
-- Système de followers entre utilisateurs
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON user_follows(created_at DESC);

-- ========================================

-- Table 9: review_votes
-- Votes "utile" sur les avis
CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

CREATE INDEX IF NOT EXISTS idx_review_votes_user_id ON review_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_review_id ON review_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_created_at ON review_votes(created_at DESC);

-- ========================================
-- MATERIALIZED VIEWS
-- ========================================

-- Vue matérialisée 1: leaderboard_global
-- Classement global de tous les temps
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_global AS
SELECT
  up.user_id,
  u.username,
  up.total_xp,
  up.current_level,
  ROW_NUMBER() OVER (ORDER BY up.total_xp DESC, up.created_at ASC) as rank
FROM user_points up
JOIN users u ON up.user_id = u.id
ORDER BY up.total_xp DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_global_user_id ON leaderboard_global(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_global_rank ON leaderboard_global(rank);

-- ========================================

-- Vue matérialisée 2: leaderboard_monthly
-- Classement mensuel
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_monthly AS
SELECT
  up.user_id,
  u.username,
  up.monthly_xp,
  up.current_level,
  ROW_NUMBER() OVER (ORDER BY up.monthly_xp DESC, up.last_activity_date DESC) as rank
FROM user_points up
JOIN users u ON up.user_id = u.id
WHERE up.monthly_xp > 0
ORDER BY up.monthly_xp DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_monthly_user_id ON leaderboard_monthly(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_monthly_rank ON leaderboard_monthly(rank);

-- ========================================
-- POSTGRESQL FUNCTIONS (RPC)
-- ========================================

-- Fonction 1: award_xp
-- Attribue XP à un utilisateur et met à jour son niveau
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_reason VARCHAR,
  p_entity_type VARCHAR DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_xp INTEGER;
  v_new_level INTEGER;
  v_level_thresholds INTEGER[] := ARRAY[0, 100, 300, 600, 1200, 2500, 6000];
BEGIN
  -- Insérer la transaction XP
  INSERT INTO xp_transactions (user_id, xp_amount, reason, entity_type, entity_id)
  VALUES (p_user_id, p_xp_amount, p_reason, p_entity_type, p_entity_id);

  -- Créer user_points si n'existe pas
  INSERT INTO user_points (user_id, total_xp, monthly_xp, last_activity_date)
  VALUES (p_user_id, 0, 0, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

  -- Mettre à jour les XP
  UPDATE user_points
  SET
    total_xp = total_xp + p_xp_amount,
    monthly_xp = monthly_xp + p_xp_amount,
    last_activity_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING total_xp INTO v_total_xp;

  -- Calculer le nouveau niveau
  v_new_level := 1;
  FOR i IN 1..7 LOOP
    IF v_total_xp >= v_level_thresholds[i] THEN
      v_new_level := i;
    END IF;
  END LOOP;

  -- Mettre à jour le niveau
  UPDATE user_points
  SET current_level = v_new_level
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ========================================

-- Fonction 2: reset_monthly_xp
-- Réinitialise les XP mensuels (à lancer via cron job)
CREATE OR REPLACE FUNCTION reset_monthly_xp()
RETURNS VOID AS $$
BEGIN
  UPDATE user_points SET monthly_xp = 0;
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_monthly;
END;
$$ LANGUAGE plpgsql;

-- ========================================

-- Fonction 3: update_streak
-- Met à jour la série de jours consécutifs
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_last_activity_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  SELECT last_activity_date, current_streak_days, longest_streak_days
  INTO v_last_activity_date, v_current_streak, v_longest_streak
  FROM user_points
  WHERE user_id = p_user_id;

  IF v_last_activity_date = CURRENT_DATE THEN
    -- Même jour, ne rien faire
    RETURN;
  ELSIF v_last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Jour consécutif
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
  ELSE
    -- Série brisée
    v_current_streak := 1;
  END IF;

  UPDATE user_points
  SET
    current_streak_days = v_current_streak,
    longest_streak_days = v_longest_streak,
    last_activity_date = CURRENT_DATE
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================

-- Fonction 4: refresh_leaderboards
-- Rafraîchit les vues matérialisées (à lancer via cron job)
CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_global;
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_monthly;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TRIGGERS
-- ========================================

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_points_updated_at
BEFORE UPDATE ON user_points
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 1 (Schéma principal) exécutée avec succès!';
  RAISE NOTICE 'Tables créées: 9';
  RAISE NOTICE 'Vues matérialisées: 2';
  RAISE NOTICE 'Fonctions PostgreSQL: 4';
  RAISE NOTICE 'Indexes: 30+';
END $$;
```

**✅ Vérification**: Après exécution, vérifier dans Supabase Table Editor que les 9 tables existent.

---

## 🏅 Migration 2: Badges (Seeds)

**Fichier source**: `backend/database/seeds/seed_gamification_badges.sql`

```sql
-- ========================================
-- GAMIFICATION BADGES SEEDS
-- 46 badges prédéfinis
-- ========================================

-- Catégorie 1: EXPLORATION (9 badges)
INSERT INTO badges (name, description, icon_url, category, rarity, requirement_type, requirement_value, is_hidden) VALUES
('First Steps', 'Visit your first establishment', '🚶', 'exploration', 'common', 'check_in_count', 1, false),
('Explorer', 'Visit 5 different establishments', '🗺️', 'exploration', 'common', 'unique_establishments_visited', 5, false),
('Adventurer', 'Visit 10 different establishments', '🧭', 'exploration', 'rare', 'unique_establishments_visited', 10, false),
('Wanderer', 'Visit 25 different establishments', '🌏', 'exploration', 'rare', 'unique_establishments_visited', 25, false),
('Zone Master', 'Visit all 9 zones of Pattaya', '🏆', 'exploration', 'epic', 'unique_zones_visited', 9, false),
('Night Owl', 'Check in after midnight 10 times', '🦉', 'exploration', 'rare', 'midnight_check_ins', 10, false),
('Early Bird', 'Check in before 8 AM 10 times', '🐦', 'exploration', 'rare', 'early_check_ins', 10, false),
('Walking Street Veteran', 'Visit 20 establishments on Walking Street', '🚶‍♂️', 'exploration', 'epic', 'walking_street_visits', 20, false),
('Soi 6 Regular', 'Visit 15 establishments on Soi 6', '🍺', 'exploration', 'epic', 'soi6_visits', 15, false);

-- Catégorie 2: CONTRIBUTION (14 badges)
INSERT INTO badges (name, description, icon_url, category, rarity, requirement_type, requirement_value, is_hidden) VALUES
('First Review', 'Write your first review', '✍️', 'contribution', 'common', 'review_count', 1, false),
('Reviewer', 'Write 5 reviews', '📝', 'contribution', 'common', 'review_count', 5, false),
('Critic', 'Write 10 reviews', '🎭', 'contribution', 'rare', 'review_count', 10, false),
('Expert Critic', 'Write 25 reviews', '🎬', 'contribution', 'rare', 'review_count', 25, false),
('Critic Gold', 'Write 100 reviews', '🏅', 'contribution', 'epic', 'review_count', 100, false),
('Photo Hunter', 'Upload 10 photos', '📸', 'contribution', 'common', 'photo_upload_count', 10, false),
('Photographer', 'Upload 50 photos', '📷', 'contribution', 'rare', 'photo_upload_count', 50, false),
('Photo Master', 'Upload 100 photos', '🎨', 'contribution', 'epic', 'photo_upload_count', 100, false),
('Detail Oriented', 'Submit 5 establishment info edits', '🔍', 'contribution', 'rare', 'info_edit_count', 5, false),
('Editor', 'Submit 20 approved edits', '✏️', 'contribution', 'epic', 'approved_edit_count', 20, false),
('First Comment', 'Leave your first comment', '💬', 'contribution', 'common', 'comment_count', 1, false),
('Conversationalist', 'Leave 25 comments', '💭', 'contribution', 'rare', 'comment_count', 25, false),
('Community Voice', 'Leave 100 comments', '🗣️', 'contribution', 'epic', 'comment_count', 100, false),
('Content Creator', 'Create 5 different types of content (review, photo, comment, edit, check-in)', '🌟', 'contribution', 'legendary', 'content_variety', 5, false);

-- Catégorie 3: SOCIAL (7 badges)
INSERT INTO badges (name, description, icon_url, category, rarity, requirement_type, requirement_value, is_hidden) VALUES
('Socialite', 'Follow 5 users', '👥', 'social', 'common', 'following_count', 5, false),
('Popular', 'Get 10 followers', '⭐', 'social', 'rare', 'follower_count', 10, false),
('Influencer', 'Get 50 followers', '🌟', 'social', 'epic', 'follower_count', 50, false),
('Celebrity', 'Get 100 followers', '💫', 'social', 'legendary', 'follower_count', 100, false),
('Helpful', 'Receive 10 helpful votes on your reviews', '👍', 'social', 'rare', 'helpful_votes_received', 10, false),
('Trusted Reviewer', 'Receive 50 helpful votes on your reviews', '✓', 'social', 'epic', 'helpful_votes_received', 50, false),
('Community Leader', 'Receive 100 helpful votes on your reviews', '👑', 'social', 'legendary', 'helpful_votes_received', 100, false);

-- Catégorie 4: QUALITY (6 badges)
INSERT INTO badges (name, description, icon_url, category, rarity, requirement_type, requirement_value, is_hidden) VALUES
('Detailed Writer', 'Write a review with 200+ characters', '📖', 'quality', 'common', 'long_review', 1, false),
('Quality Contributor', 'Write 10 detailed reviews (200+ chars)', '📚', 'quality', 'rare', 'long_review_count', 10, false),
('5 Star Optimist', 'Give 10 five-star reviews', '⭐⭐⭐⭐⭐', 'quality', 'rare', 'five_star_count', 10, false),
('Balanced Critic', 'Give reviews across all ratings (1-5 stars)', '⚖️', 'quality', 'epic', 'balanced_ratings', 1, false),
('Verified Visitor', 'Complete 10 verified check-ins (within 100m)', '✅', 'quality', 'rare', 'verified_check_in_count', 10, false),
('Honest Reviewer', 'No reviews flagged or removed for 6 months', '💎', 'quality', 'legendary', 'clean_record_months', 6, false);

-- Catégorie 5: TEMPORAL (6 badges)
INSERT INTO badges (name, description, icon_url, category, rarity, requirement_type, requirement_value, is_hidden) VALUES
('Streak Starter', 'Maintain a 3-day activity streak', '🔥', 'temporal', 'common', 'streak_days', 3, false),
('Dedicated', 'Maintain a 7-day activity streak', '🔥🔥', 'temporal', 'rare', 'streak_days', 7, false),
('Committed', 'Maintain a 30-day activity streak', '🔥🔥🔥', 'temporal', 'epic', 'streak_days', 30, false),
('Veteran', 'Maintain a 100-day activity streak', '💪', 'temporal', 'legendary', 'streak_days', 100, false),
('One Year Anniversary', 'Be a member for 1 year', '🎂', 'temporal', 'epic', 'membership_days', 365, false),
('OG Member', 'Be a member since launch month', '👴', 'temporal', 'legendary', 'launch_member', 1, false);

-- Catégorie 6: SECRET (4 badges)
INSERT INTO badges (name, description, icon_url, category, rarity, requirement_type, requirement_value, is_hidden) VALUES
('Easter Egg', 'Find the hidden establishment', '🥚', 'secret', 'legendary', 'easter_egg', 1, true),
('Lucky 7', 'Write your 7th review on the 7th day at 7 PM', '🎰', 'secret', 'legendary', 'lucky_seven', 1, true),
('Night Explorer', 'Visit 10 different establishments between 2-4 AM', '🌙', 'secret', 'epic', 'late_night_explorer', 10, true),
('Rainbow Collector', 'Check in to establishments in all 9 zones in a single day', '🌈', 'secret', 'legendary', 'rainbow_day', 1, true);

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 2 (Badges) exécutée avec succès!';
  RAISE NOTICE 'Badges créés: 46';
  RAISE NOTICE '  - Exploration: 9';
  RAISE NOTICE '  - Contribution: 14';
  RAISE NOTICE '  - Social: 7';
  RAISE NOTICE '  - Quality: 6';
  RAISE NOTICE '  - Temporal: 6';
  RAISE NOTICE '  - Secret: 4';
END $$;
```

**✅ Vérification**: Vérifier que la table `badges` contient 46 entrées.

---

## 🎯 Migration 3: Missions (Seeds)

**Fichier source**: `backend/database/seeds/seed_gamification_missions.sql`

```sql
-- ========================================
-- GAMIFICATION MISSIONS SEEDS
-- 20+ missions (Daily, Weekly, Narrative, Events)
-- ========================================

-- Type 1: DAILY MISSIONS (6 missions)
INSERT INTO missions (name, description, type, xp_reward, reset_frequency, requirements, is_active) VALUES
('Daily Reviewer', 'Write 1 review today', 'daily', 20, 'daily', '{"type": "write_reviews", "count": 1}'::jsonb, true),
('Daily Explorer', 'Check in to 1 establishment today', 'daily', 15, 'daily', '{"type": "check_in", "count": 1}'::jsonb, true),
('Daily Photographer', 'Upload 1 photo today', 'daily', 10, 'daily', '{"type": "upload_photos", "count": 1}'::jsonb, true),
('Daily Socialite', 'Follow 1 new user today', 'daily', 10, 'daily', '{"type": "follow_users", "count": 1}'::jsonb, true),
('Daily Supporter', 'Give 3 helpful votes today', 'daily', 15, 'daily', '{"type": "vote_helpful", "count": 3}'::jsonb, true),
('Daily Contributor', 'Complete any 3 activities today', 'daily', 25, 'daily', '{"type": "any_activities", "count": 3}'::jsonb, true);

-- Type 2: WEEKLY MISSIONS (6 missions)
INSERT INTO missions (name, description, type, xp_reward, reset_frequency, requirements, is_active) VALUES
('Weekly Writer', 'Write 5 reviews this week', 'weekly', 100, 'weekly', '{"type": "write_reviews", "count": 5}'::jsonb, true),
('Weekly Adventurer', 'Check in to 7 different establishments this week', 'weekly', 80, 'weekly', '{"type": "check_in_unique", "count": 7}'::jsonb, true),
('Weekly Photographer', 'Upload 10 photos this week', 'weekly', 75, 'weekly', '{"type": "upload_photos", "count": 10}'::jsonb, true),
('Weekly Social Butterfly', 'Follow 5 new users this week', 'weekly', 60, 'weekly', '{"type": "follow_users", "count": 5}'::jsonb, true),
('Weekly Explorer', 'Visit 3 different zones this week', 'weekly', 90, 'weekly', '{"type": "visit_zones", "count": 3}'::jsonb, true),
('Weekly Completionist', 'Complete all 6 daily missions this week', 'weekly', 150, 'weekly', '{"type": "complete_dailies", "count": 6}'::jsonb, true);

-- Type 3: NARRATIVE QUESTS (Grande Tour - 7 étapes)
INSERT INTO missions (name, description, type, xp_reward, badge_reward, reset_frequency, requirements, is_active) VALUES
('Grand Tour: Soi 6', 'Check in to any establishment on Soi 6', 'narrative', 20, NULL, 'never', '{"type": "check_in_zone", "zone": "Soi 6", "count": 1, "step": 1}'::jsonb, true),
('Grand Tour: Walking Street', 'Check in to any establishment on Walking Street', 'narrative', 20, NULL, 'never', '{"type": "check_in_zone", "zone": "Walking Street", "count": 1, "step": 2}'::jsonb, true),
('Grand Tour: LK Metro', 'Check in to any establishment in LK Metro', 'narrative', 20, NULL, 'never', '{"type": "check_in_zone", "zone": "LK Metro", "count": 1, "step": 3}'::jsonb, true),
('Grand Tour: Treetown', 'Check in to any establishment in Treetown', 'narrative', 20, NULL, 'never', '{"type": "check_in_zone", "zone": "Treetown", "count": 1, "step": 4}'::jsonb, true),
('Grand Tour: Soi Buakhao', 'Check in to any establishment on Soi Buakhao', 'narrative', 20, NULL, 'never', '{"type": "check_in_zone", "zone": "Soi Buakhao", "count": 1, "step": 5}'::jsonb, true),
('Grand Tour: Jomtien', 'Check in to any establishment in Jomtien', 'narrative', 20, NULL, 'never', '{"type": "check_in_zone", "zone": "Jomtien", "count": 1, "step": 6}'::jsonb, true),
('Grand Tour: Complete', 'Complete the Grand Tour of all zones', 'narrative', 200, (SELECT id FROM badges WHERE name = 'Zone Master'), 'never', '{"type": "check_in_all_zones", "count": 9, "step": 7}'::jsonb, true);

-- Type 3: NARRATIVE QUESTS (Critique Master - 5 étapes)
INSERT INTO missions (name, description, type, xp_reward, badge_reward, reset_frequency, requirements, is_active) VALUES
('Critique Master: Beginner', 'Write your first review', 'narrative', 10, NULL, 'never', '{"type": "write_reviews", "count": 1, "step": 1}'::jsonb, true),
('Critique Master: Amateur', 'Write 5 reviews', 'narrative', 50, NULL, 'never', '{"type": "write_reviews", "count": 5, "step": 2}'::jsonb, true),
('Critique Master: Professional', 'Write 10 detailed reviews (200+ characters)', 'narrative', 100, NULL, 'never', '{"type": "write_detailed_reviews", "count": 10, "step": 3}'::jsonb, true),
('Critique Master: Expert', 'Write 25 reviews', 'narrative', 150, NULL, 'never', '{"type": "write_reviews", "count": 25, "step": 4}'::jsonb, true),
('Critique Master: Complete', 'Write 100 reviews and become a master critic', 'narrative', 500, (SELECT id FROM badges WHERE name = 'Critic Gold'), 'never', '{"type": "write_reviews", "count": 100, "step": 5}'::jsonb, true);

-- Type 4: SEASONAL EVENTS (2 missions)
INSERT INTO missions (name, description, type, xp_reward, reset_frequency, requirements, is_active, start_date, end_date) VALUES
('Songkran Festival', 'Check in to 5 establishments during Songkran week', 'event', 200, 'never', '{"type": "check_in_during_event", "count": 5, "event": "songkran"}'::jsonb, false, '2025-04-13 00:00:00+00', '2025-04-20 23:59:59+00'),
('New Year Challenge', 'Complete 10 activities during New Year week', 'event', 250, 'never', '{"type": "any_activities", "count": 10, "event": "new_year"}'::jsonb, false, '2025-12-25 00:00:00+00', '2026-01-05 23:59:59+00');

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 3 (Missions) exécutée avec succès!';
  RAISE NOTICE 'Missions créées: 20+';
  RAISE NOTICE '  - Daily: 6';
  RAISE NOTICE '  - Weekly: 6';
  RAISE NOTICE '  - Narrative: 12';
  RAISE NOTICE '  - Events: 2';
END $$;
```

**✅ Vérification**: Vérifier que la table `missions` contient 20+ entrées.

---

## ✅ Vérification Finale

Après avoir exécuté les 3 migrations, vérifiez dans Supabase:

### Tables créées (9)
1. ✅ `user_points`
2. ✅ `badges`
3. ✅ `user_badges`
4. ✅ `missions`
5. ✅ `user_missions`
6. ✅ `xp_transactions`
7. ✅ `check_ins`
8. ✅ `user_follows`
9. ✅ `review_votes`

### Vues matérialisées (2)
1. ✅ `leaderboard_global`
2. ✅ `leaderboard_monthly`

### Fonctions (4)
Vérifier dans **SQL Editor**:
```sql
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc
WHERE proname IN ('award_xp', 'reset_monthly_xp', 'update_streak', 'refresh_leaderboards');
```

### Seeds
- ✅ 46 badges dans `badges`
- ✅ 20+ missions dans `missions`

---

## 🔄 Tâches Cron (Optionnel)

Pour automatiser le reset mensuel et le refresh des leaderboards, configurer des cron jobs dans Supabase:

### 1. Reset Monthly XP (1er du mois à minuit)
```sql
SELECT cron.schedule(
  'reset-monthly-xp',
  '0 0 1 * *',
  $$ SELECT reset_monthly_xp(); $$
);
```

### 2. Refresh Leaderboards (toutes les heures)
```sql
SELECT cron.schedule(
  'refresh-leaderboards',
  '0 * * * *',
  $$ SELECT refresh_leaderboards(); $$
);
```

---

## 🎉 Migration Complète!

Une fois toutes les migrations exécutées, le système de gamification est **100% opérationnel** côté backend.

**Prochaines étapes**:
1. ✅ Redémarrer le serveur backend: `cd backend && npm run dev`
2. ✅ Redémarrer le frontend: `npm start`
3. ✅ Tester les endpoints API: http://localhost:8080/api-docs (Swagger)
4. ✅ Tester les composants frontend: http://localhost:3000/achievements

**🎮 Bon jeu!**
