-- ========================================
-- MIGRATION: Add Notification RPC Functions
-- Version: v10.3.5
-- Date: 2025-12-12
-- Description: Create RPC functions for notifications that bypass PostgREST cache
-- ========================================

-- Purpose: These functions provide optimized queries for notifications
-- and bypass PostgREST cache issues encountered with direct table queries

-- ========================================
-- 1. get_user_notifications
-- ========================================
-- Retrieve notifications for a user with optional filtering
CREATE OR REPLACE FUNCTION get_user_notifications(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  link TEXT,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ,
  related_entity_type TEXT,
  related_entity_id UUID,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.user_id,
    n.type::TEXT,
    n.title::TEXT,
    n.message::TEXT,
    n.link::TEXT,
    n.is_read,
    n.created_at,
    n.related_entity_type::TEXT,
    n.related_entity_id,
    COALESCE(n.metadata, '{}'::jsonb)
  FROM notifications n
  WHERE n.user_id = p_user_id
    AND (NOT p_unread_only OR n.is_read = FALSE)
  ORDER BY n.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 2. mark_notification_read
-- ========================================
-- Mark a specific notification as read (returns TRUE if successful)
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE id = p_notification_id
    AND user_id = p_user_id
    AND is_read = FALSE;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0 OR EXISTS (
    SELECT 1 FROM notifications
    WHERE id = p_notification_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. mark_all_notifications_read
-- ========================================
-- Mark all user's notifications as read (idempotent, always returns TRUE)
CREATE OR REPLACE FUNCTION mark_all_notifications_read(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE user_id = p_user_id
    AND is_read = FALSE;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 4. delete_notification
-- ========================================
-- Delete a notification (returns TRUE if successful)
CREATE OR REPLACE FUNCTION delete_notification(
  p_notification_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE id = p_notification_id
    AND user_id = p_user_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 5. get_unread_count
-- ========================================
-- Get count of unread notifications for a user
CREATE OR REPLACE FUNCTION get_unread_count(
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM notifications
  WHERE user_id = p_user_id
    AND is_read = FALSE;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Grant execute permissions
-- ========================================
GRANT EXECUTE ON FUNCTION get_user_notifications(UUID, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_notification(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_count(UUID) TO authenticated;

-- ========================================
-- Verification query
-- ========================================
-- Run this to verify functions were created:
-- SELECT proname, pg_get_function_arguments(oid), pg_get_function_result(oid)
-- FROM pg_proc
-- WHERE proname IN ('get_user_notifications', 'mark_notification_read', 'mark_all_notifications_read', 'delete_notification', 'get_unread_count')
-- ORDER BY proname;

-- ========================================
-- ROLLBACK (if needed)
-- ========================================
-- DROP FUNCTION IF EXISTS get_user_notifications(UUID, INTEGER, BOOLEAN);
-- DROP FUNCTION IF EXISTS mark_notification_read(UUID, UUID);
-- DROP FUNCTION IF EXISTS mark_all_notifications_read(UUID);
-- DROP FUNCTION IF EXISTS delete_notification(UUID, UUID);
-- DROP FUNCTION IF EXISTS get_unread_count(UUID);
