-- ========================================
-- MIGRATION: Add In-App Notifications System
-- Version: v10.2
-- Date: 2025-01-XX
-- Description: Create notifications table for in-app notification system
-- ========================================

-- Purpose: Store in-app notifications for users (ownership requests status, admin alerts, etc.)
-- Supports real-time notifications for ownership approval workflow

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Notification type (for filtering and styling) - v10.2.1: Updated to 21 types
  type VARCHAR(50) NOT NULL CHECK (type IN (
    -- Ownership Requests (4 types)
    'ownership_request_submitted',
    'ownership_request_approved',
    'ownership_request_rejected',
    'new_ownership_request',
    -- Moderation (6 types)
    'employee_approved',
    'employee_rejected',
    'establishment_approved',
    'establishment_rejected',
    'comment_approved',
    'comment_rejected',
    -- Social (4 types)
    'comment_reply',
    'comment_mention',
    'new_favorite',
    'favorite_available',
    -- Employee Updates (3 types)
    'employee_profile_updated',
    'employee_photos_updated',
    'employee_position_changed',
    -- Admin/Moderator (3 types)
    'new_content_pending',
    'new_report',
    'moderation_action_required',
    -- System (2 types)
    'system',
    'other'
  )),

  -- Notification content
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,

  -- Optional link to relevant page
  link VARCHAR(500),

  -- Read status
  is_read BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Optional: related entity IDs for cleanup/filtering
  related_entity_type VARCHAR(50), -- e.g. 'ownership_request', 'establishment'
  related_entity_id UUID
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Comments for documentation
COMMENT ON TABLE notifications IS 'In-app notifications for users. Used for ownership request status updates and admin alerts.';
COMMENT ON COLUMN notifications.type IS 'Notification type for filtering and styling: ownership_request_submitted, ownership_request_approved, ownership_request_rejected, new_ownership_request (admin), system, other.';
COMMENT ON COLUMN notifications.link IS 'Optional link to relevant page (e.g. /my-ownership-requests, /admin/ownership-requests).';
COMMENT ON COLUMN notifications.related_entity_type IS 'Optional: entity type this notification relates to (ownership_request, establishment, etc.).';
COMMENT ON COLUMN notifications.related_entity_id IS 'Optional: UUID of related entity for filtering or cleanup.';

-- Auto-cleanup old read notifications (optional - run as scheduled task)
-- Delete read notifications older than 30 days
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
  AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- RPC FUNCTIONS (created directly in Supabase)
-- ========================================
-- NOTE: The following RPC functions exist in Supabase database
-- They were created manually via SQL Editor and are used by notificationController.ts
-- These functions bypass PostgREST cache issues and provide optimized queries

-- 1. get_user_notifications(p_user_id UUID, p_limit INTEGER, p_unread_only BOOLEAN)
--    Returns: TABLE(id, user_id, type, title, message, link, is_read, created_at, related_entity_type, related_entity_id)
--    Purpose: Retrieve notifications for a user with optional filtering

-- 2. mark_notification_read(p_notification_id UUID, p_user_id UUID)
--    Returns: BOOLEAN
--    Purpose: Mark a specific notification as read (returns TRUE if successful)

-- 3. mark_all_notifications_read(p_user_id UUID)
--    Returns: BOOLEAN
--    Purpose: Mark all user's notifications as read (idempotent, always returns TRUE)

-- 4. delete_notification(p_notification_id UUID, p_user_id UUID)
--    Returns: BOOLEAN
--    Purpose: Delete a notification (returns TRUE if successful)

-- 5. get_unread_count(p_user_id UUID)
--    Returns: INTEGER
--    Purpose: Get count of unread notifications for a user

-- To verify these functions exist in Supabase, run:
-- SELECT proname, pg_get_function_arguments(oid)
-- FROM pg_proc
-- WHERE proname IN ('get_user_notifications', 'mark_notification_read', 'mark_all_notifications_read', 'delete_notification', 'get_unread_count');

-- ========================================
-- MIGRATION ROLLBACK (if needed)
-- ========================================
-- To rollback this migration, run:
-- DROP FUNCTION IF EXISTS cleanup_old_notifications();
-- DROP FUNCTION IF EXISTS get_user_notifications(UUID, INTEGER, BOOLEAN);
-- DROP FUNCTION IF EXISTS mark_notification_read(UUID, UUID);
-- DROP FUNCTION IF EXISTS mark_all_notifications_read(UUID);
-- DROP FUNCTION IF EXISTS delete_notification(UUID, UUID);
-- DROP FUNCTION IF EXISTS get_unread_count(UUID);
-- DROP TABLE IF EXISTS notifications CASCADE;
