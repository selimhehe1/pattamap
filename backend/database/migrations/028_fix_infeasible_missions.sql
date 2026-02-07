-- Migration 028: Fix infeasible missions
-- Replace missions that cannot be completed with the current codebase:
-- 1. "Photo Curator" (establishment_owner) -> "Team Builder" (no photos field on establishments)
-- 2. "Category Explorer" (regular) -> "Profile Explorer" (no category visit tracking)
-- 3. "VIP Spotter" (regular) -> deactivated (VIP system not active in prod)

BEGIN;

-- 1a. Replace "Photo Curator" with "Team Builder" (establishment_owner)
UPDATE missions
SET name = 'Team Builder',
    description = 'Add or update 2 employees in your establishment this week',
    type = 'weekly',
    xp_reward = 60,
    reset_frequency = 'weekly',
    requirements = '{"type": "manage_employees", "count": 2}'::jsonb
WHERE name = 'Photo Curator';

-- 1b. Replace "Category Explorer" with "Profile Explorer" (regular)
UPDATE missions
SET name = 'Profile Explorer',
    description = 'View 5 different employee profiles this week',
    type = 'weekly',
    xp_reward = 80,
    reset_frequency = 'weekly',
    requirements = '{"type": "view_profiles", "count": 5, "unique": true}'::jsonb
WHERE name = 'Category Explorer';

-- 1c. Deactivate "VIP Spotter" (keep in DB, just hide)
UPDATE missions SET is_active = false WHERE name = 'VIP Spotter';

COMMIT;
