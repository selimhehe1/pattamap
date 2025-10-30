-- ========================================
-- MIGRATION: Add metadata column to notifications table
-- Version: v10.3
-- Date: 2025-01-XX
-- Description: Add JSONB metadata column for i18n support (i18n_key, i18n_params)
-- ========================================

-- Purpose: Enable multilingual notifications by storing i18n keys instead of hardcoded messages
-- Allows frontend to format notifications based on user's language preference

-- Add metadata column
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN notifications.metadata IS 'JSONB metadata for flexible notification data. Used for i18n support: {i18n_key: string, i18n_params: object}. Example: {i18n_key: "notifications.verificationApproved", i18n_params: {employeeName: "Lisa"}}';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_notifications_metadata
ON notifications USING GIN (metadata);

-- Verification query (commented - run manually if needed)
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'notifications'
-- AND column_name = 'metadata';
