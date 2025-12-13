-- Migration: Add Social Media links to establishments
-- Description: Replace unused services TEXT[] with Instagram, Twitter/X, and TikTok URLs
-- Version: v10.1.0
-- Date: 2025-01-12
BEGIN;

-- ============================================
-- STEP 1: Add social media columns
-- ============================================

-- Add social media URL columns
ALTER TABLE establishments
ADD COLUMN IF NOT EXISTS instagram VARCHAR(255),
ADD COLUMN IF NOT EXISTS twitter VARCHAR(255),
ADD COLUMN IF NOT EXISTS tiktok VARCHAR(255);

COMMENT ON COLUMN establishments.instagram IS 'Instagram profile URL (e.g., https://instagram.com/bar123)';
COMMENT ON COLUMN establishments.twitter IS 'Twitter/X profile URL (e.g., https://x.com/bar123 or https://twitter.com/bar123)';
COMMENT ON COLUMN establishments.tiktok IS 'TikTok profile URL (e.g., https://tiktok.com/@bar123)';

-- ============================================
-- STEP 2: Drop unused services column
-- ============================================

-- Remove services TEXT[] column as it's unused/underutilized
ALTER TABLE establishments DROP COLUMN IF EXISTS services;

-- ============================================
-- STEP 3: Add validation constraints (optional)
-- ============================================

-- Ensure URLs start with https:// or http:// (if provided)
-- Note: NULL values are allowed (not all establishments have social media)

-- Instagram URL validation
ALTER TABLE establishments
ADD CONSTRAINT check_instagram_url
CHECK (instagram IS NULL OR instagram ~ '^https?://');

-- Twitter URL validation
ALTER TABLE establishments
ADD CONSTRAINT check_twitter_url
CHECK (twitter IS NULL OR twitter ~ '^https?://');

-- TikTok URL validation
ALTER TABLE establishments
ADD CONSTRAINT check_tiktok_url
CHECK (tiktok IS NULL OR tiktok ~ '^https?://');

-- ============================================
-- STEP 4: Add performance indexes (optional)
-- ============================================

-- Indexes for filtering establishments with social media presence
-- Useful for analytics queries like "how many establishments have Instagram?"

CREATE INDEX IF NOT EXISTS idx_establishments_instagram
ON establishments(instagram)
WHERE instagram IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_establishments_twitter
ON establishments(twitter)
WHERE twitter IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_establishments_tiktok
ON establishments(tiktok)
WHERE tiktok IS NOT NULL;

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Verify columns were added
-- SELECT column_name, data_type, character_maximum_length, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'establishments'
-- AND column_name IN ('instagram', 'twitter', 'tiktok')
-- ORDER BY ordinal_position;

-- Verify constraints
-- SELECT constraint_name, constraint_type, check_clause
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
-- WHERE tc.table_name = 'establishments'
-- AND (tc.constraint_name LIKE '%instagram%' OR tc.constraint_name LIKE '%twitter%' OR tc.constraint_name LIKE '%tiktok%')
-- ORDER BY constraint_name;

-- Verify indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'establishments'
-- AND (indexname LIKE '%instagram%' OR indexname LIKE '%twitter%' OR indexname LIKE '%tiktok%')
-- ORDER BY indexname;

-- Count establishments with social media (after data is added)
-- SELECT
--   COUNT(*) FILTER (WHERE instagram IS NOT NULL) as has_instagram,
--   COUNT(*) FILTER (WHERE twitter IS NOT NULL) as has_twitter,
--   COUNT(*) FILTER (WHERE tiktok IS NOT NULL) as has_tiktok,
--   COUNT(*) FILTER (WHERE instagram IS NOT NULL OR twitter IS NOT NULL OR tiktok IS NOT NULL) as has_any_social
-- FROM establishments;

COMMIT;
