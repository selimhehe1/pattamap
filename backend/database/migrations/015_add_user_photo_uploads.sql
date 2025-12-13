-- ========================================
-- MIGRATION 015: Add User Photo Uploads Tracking
-- ========================================
-- Purpose: Enable photo tracking for gamification system (Phase 3)
-- Date: 2025-01-21
-- Version: v10.3
--
-- Impact: Activates 5 photo-dependent missions (Photo Hunter, Photo Marathon, etc.)
-- Status: Additive only - NO breaking changes to existing functionality
-- ========================================
BEGIN;

-- ========================================
-- 1. CREATE TABLE user_photo_uploads
-- ========================================
-- Tracks all photos uploaded by users for gamification purposes
-- Links to users, stores entity relationship (employee/review/establishment)

CREATE TABLE IF NOT EXISTS user_photo_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('employee', 'review', 'establishment')),
  entity_id UUID,
  width INTEGER,
  height INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE user_photo_uploads IS 'Tracks user photo uploads for gamification (missions, badges). Records who uploaded what photo and when.';
COMMENT ON COLUMN user_photo_uploads.user_id IS 'User who uploaded the photo (uploader, not necessarily photo subject)';
COMMENT ON COLUMN user_photo_uploads.photo_url IS 'Cloudinary secure_url (full URL to uploaded photo)';
COMMENT ON COLUMN user_photo_uploads.entity_type IS 'Type of entity photo is attached to: employee, review, establishment';
COMMENT ON COLUMN user_photo_uploads.entity_id IS 'UUID of related entity (employee_id, comment_id, establishment_id). NULL if not yet attached.';
COMMENT ON COLUMN user_photo_uploads.width IS 'Photo width in pixels (from Cloudinary result)';
COMMENT ON COLUMN user_photo_uploads.height IS 'Photo height in pixels (for high-res badge tracking)';
COMMENT ON COLUMN user_photo_uploads.uploaded_at IS 'Timestamp when photo was uploaded to Cloudinary';

-- ========================================
-- 2. CREATE INDEXES
-- ========================================
-- Performance indexes for common query patterns

-- User-based queries (missions: "How many photos did user X upload today?")
CREATE INDEX idx_user_photo_uploads_user_id ON user_photo_uploads(user_id);

-- Entity-based queries (reviews: "Does this review have photos?")
CREATE INDEX idx_user_photo_uploads_entity ON user_photo_uploads(entity_type, entity_id);

-- Time-based queries (daily/weekly mission resets)
CREATE INDEX idx_user_photo_uploads_uploaded_at ON user_photo_uploads(uploaded_at DESC);

-- Composite index for common mission queries (user + time filtering)
CREATE INDEX idx_user_photo_uploads_user_time ON user_photo_uploads(user_id, uploaded_at DESC);

-- High-res photo tracking (badge "Photo Pro" - 10 photos 1080p+)
CREATE INDEX idx_user_photo_uploads_high_res ON user_photo_uploads(user_id, width, height) WHERE width >= 1920 OR height >= 1080;

-- ========================================
-- 3. VERIFICATION QUERIES
-- ========================================

-- Check table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_photo_uploads') THEN
    RAISE NOTICE '✅ Table user_photo_uploads created successfully';
  ELSE
    RAISE EXCEPTION '❌ Table user_photo_uploads not found';
  END IF;
END $$;

-- Check indexes
DO $$
DECLARE
  index_count INT;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'user_photo_uploads';

  IF index_count >= 5 THEN
    RAISE NOTICE '✅ % indexes created on user_photo_uploads', index_count;
  ELSE
    RAISE EXCEPTION '❌ Expected 5+ indexes, found %', index_count;
  END IF;
END $$;

-- ========================================
-- 4. SAMPLE QUERIES (for reference)
-- ========================================

-- Get user's photo upload count today
-- SELECT COUNT(*) FROM user_photo_uploads
-- WHERE user_id = '<user-id>'
--   AND uploaded_at >= CURRENT_DATE;

-- Get photos attached to a review
-- SELECT * FROM user_photo_uploads
-- WHERE entity_type = 'review'
--   AND entity_id = '<review-id>';

-- Get user's high-res photo count (for badge "Photo Pro")
-- SELECT COUNT(*) FROM user_photo_uploads
-- WHERE user_id = '<user-id>'
--   AND (width >= 1920 OR height >= 1080);

-- ========================================
-- 5. ROLLBACK (if needed)
-- ========================================

-- DROP TABLE IF EXISTS user_photo_uploads CASCADE;

-- ========================================
-- END OF MIGRATION 015
-- ========================================

COMMIT;
