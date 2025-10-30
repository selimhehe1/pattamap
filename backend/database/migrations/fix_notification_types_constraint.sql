-- ========================================
-- MIGRATION: Fix Notification Types Constraint
-- Version: v10.2.1
-- Date: 2025-01-XX
-- Description: Update notifications table CHECK constraint to include all 21 notification types
-- ========================================

-- PROBLEM: Original migration only included 6 notification types in CHECK constraint
-- but the code uses 21 types. This causes notifications to fail at database level.

-- SOLUTION: Drop old constraint and create new one with all 21 types

-- Step 1: Drop the old constraint
-- Note: The constraint name may vary. If this fails, find the actual name with:
-- SELECT con.conname FROM pg_constraint con
-- JOIN pg_class rel ON rel.oid = con.conrelid
-- WHERE rel.relname = 'notifications';

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Step 2: Add new constraint with all 21 notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
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
));

-- Step 3: Verify the constraint was updated
-- Run this to see the new constraint:
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conname = 'notifications_type_check';

-- ========================================
-- MIGRATION ROLLBACK (if needed)
-- ========================================
-- To rollback to the original 6 types (NOT RECOMMENDED):
--
-- ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
-- ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
--   'ownership_request_submitted',
--   'ownership_request_approved',
--   'ownership_request_rejected',
--   'new_ownership_request',
--   'system',
--   'other'
-- ));
