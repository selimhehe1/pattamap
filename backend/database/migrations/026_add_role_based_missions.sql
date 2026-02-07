-- Migration 026: Add role-based missions
-- Adds target_account_types column to missions table and inserts 12 new role-based missions
-- (5 regular, 4 establishment_owner, 3 employee)

-- ========================================
-- 1. Add target_account_types column
-- ========================================
ALTER TABLE missions ADD COLUMN IF NOT EXISTS target_account_types TEXT[] DEFAULT ARRAY['regular']::TEXT[] NOT NULL;

-- ========================================
-- 2. Create GIN index for array containment queries
-- ========================================
CREATE INDEX IF NOT EXISTS idx_missions_target_account_types ON missions USING GIN (target_account_types);

-- ========================================
-- 3. Backfill existing missions (retrocompat)
-- ========================================
UPDATE missions SET target_account_types = ARRAY['regular'] WHERE target_account_types IS NULL;

-- ========================================
-- 4. Insert new Regular User missions (+5)
-- ========================================

INSERT INTO missions (name, description, type, xp_reward, reset_frequency, requirements, is_active, sort_order, target_account_types)
VALUES
  (
    'Favorite Collector',
    'Add 5 employees to your favorites today',
    'daily',
    15,
    'daily',
    '{"type": "add_favorites", "count": 5}'::jsonb,
    true,
    110,
    ARRAY['regular']
  ),
  (
    'Category Explorer',
    'Visit establishments in 3 different categories this week',
    'weekly',
    80,
    'weekly',
    '{"type": "visit_categories", "count": 3, "unique": true}'::jsonb,
    true,
    111,
    ARRAY['regular']
  ),
  (
    'First Reviewer',
    'Write your very first review',
    'narrative',
    50,
    NULL,
    '{"type": "first_review", "count": 1}'::jsonb,
    true,
    112,
    ARRAY['regular']
  ),
  (
    'Review Updater',
    'Update one of your existing reviews this week',
    'weekly',
    40,
    'weekly',
    '{"type": "update_review", "count": 1}'::jsonb,
    true,
    113,
    ARRAY['regular']
  ),
  (
    'VIP Spotter',
    'Visit 3 VIP establishments this week',
    'weekly',
    60,
    'weekly',
    '{"type": "visit_vip", "count": 3}'::jsonb,
    true,
    114,
    ARRAY['regular']
  );

-- ========================================
-- 5. Insert new Establishment Owner missions (+4)
-- ========================================

INSERT INTO missions (name, description, type, xp_reward, reset_frequency, requirements, is_active, sort_order, target_account_types)
VALUES
  (
    'Profile Master',
    'Complete your establishment profile to 100%',
    'narrative',
    100,
    NULL,
    '{"type": "complete_establishment_profile", "completion_percentage": 100}'::jsonb,
    true,
    200,
    ARRAY['establishment_owner']
  ),
  (
    'Responsive Owner',
    'Respond to 3 reviews on your establishment this week',
    'weekly',
    80,
    'weekly',
    '{"type": "respond_reviews", "count": 3}'::jsonb,
    true,
    201,
    ARRAY['establishment_owner']
  ),
  (
    'Photo Curator',
    'Upload 5 photos to your establishment profile',
    'narrative',
    60,
    NULL,
    '{"type": "upload_establishment_photos", "count": 5}'::jsonb,
    true,
    202,
    ARRAY['establishment_owner']
  ),
  (
    'Info Keeper',
    'Update your establishment information this month',
    'weekly',
    50,
    'monthly',
    '{"type": "update_establishment_info", "count": 1}'::jsonb,
    true,
    203,
    ARRAY['establishment_owner']
  );

-- ========================================
-- 6. Insert new Employee missions (+3)
-- ========================================

INSERT INTO missions (name, description, type, xp_reward, reset_frequency, requirements, is_active, sort_order, target_account_types)
VALUES
  (
    'Complete Profile',
    'Complete your employee profile with all required information',
    'narrative',
    80,
    NULL,
    '{"type": "complete_employee_profile", "count": 1}'::jsonb,
    true,
    300,
    ARRAY['employee']
  ),
  (
    'Social Connect',
    'Add social media links to your profile',
    'narrative',
    40,
    NULL,
    '{"type": "add_social_links", "count": 1}'::jsonb,
    true,
    301,
    ARRAY['employee']
  ),
  (
    'Fresh Face',
    'Update your profile photo this month',
    'weekly',
    30,
    'monthly',
    '{"type": "update_profile_photo", "count": 1}'::jsonb,
    true,
    302,
    ARRAY['employee']
  );
