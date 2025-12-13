/**
 * ============================================
 * MIGRATION: Update Category Icons to Emojis
 * ============================================
 *
 * Purpose: Replace text icon names with real emojis
 * Date: 2025-01-22
 *
 * Changes:
 * - Bar: 'beer' → 🍺
 * - GoGo Bar: 'dancer' → 👯‍♀️
 * - Massage Salon: 'spa' → 🧖‍♀️
 * - Nightclub: 'music' → 🎵
 *
 * Impact: Improves visual display in frontend
 */
BEGIN;

-- Update Bar icon
UPDATE establishment_categories
SET icon = '🍺'
WHERE name = 'Bar';

-- Update GoGo Bar icon
UPDATE establishment_categories
SET icon = '👯‍♀️'
WHERE name = 'GoGo Bar';

-- Update Massage Salon icon
UPDATE establishment_categories
SET icon = '🧖‍♀️'
WHERE name = 'Massage Salon';

-- Update Nightclub icon
UPDATE establishment_categories
SET icon = '🎵'
WHERE name = 'Nightclub';

-- Verify the changes
SELECT id, name, icon, color
FROM establishment_categories
ORDER BY id;

COMMIT;
