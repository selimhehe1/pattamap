-- ========================================
-- MIGRATION: Update Notification Types Constraint (v10.3)
-- Version: v10.3
-- Date: 2025-01-20
-- Description: Update notifications table CHECK constraint to support 36 notification types (21 existing + 15 new)
-- ========================================

-- CONTEXT:
-- The original migrations (add_notifications.sql and fix_notification_types_constraint.sql) only
-- supported 21 notification types. The v10.3 frontend (NotificationBell.tsx) introduced 15 new
-- business notification types that are currently rejected by the database CHECK constraint.

-- NEW TYPES IN v10.3 (15 total):
-- 1. Verification System (4): verification_submitted, verification_approved, verification_rejected, verification_revoked
-- 2. VIP System (4): vip_purchase_confirmed, vip_payment_verified, vip_payment_rejected, vip_subscription_cancelled
-- 3. Edit Proposals (3): edit_proposal_submitted, edit_proposal_approved, edit_proposal_rejected
-- 4. Establishment Owners (3): establishment_owner_assigned, establishment_owner_removed, establishment_owner_permissions_updated
-- 5. Moderation Enhancement (1): comment_removed

-- ===========================================
-- STEP 1: Drop old constraint
-- ===========================================
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- ===========================================
-- STEP 2: Create new constraint with all 36 types
-- ===========================================
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  -- ====================================
  -- EXISTING TYPES (21) - v10.2
  -- ====================================

  -- Ownership Requests (4)
  'ownership_request_submitted',
  'ownership_request_approved',
  'ownership_request_rejected',
  'new_ownership_request',

  -- Moderation (6)
  'employee_approved',
  'employee_rejected',
  'establishment_approved',
  'establishment_rejected',
  'comment_approved',
  'comment_rejected',

  -- Social (4)
  'comment_reply',
  'comment_mention',
  'new_favorite',
  'favorite_available',

  -- Employee Updates (3)
  'employee_profile_updated',
  'employee_photos_updated',
  'employee_position_changed',

  -- Admin/Moderator (3)
  'new_content_pending',
  'new_report',
  'moderation_action_required',

  -- System (2)
  'system',
  'other',

  -- ====================================
  -- NEW TYPES (15) - v10.3
  -- ====================================

  -- Verification System (4)
  'verification_submitted',       -- User submits verification request
  'verification_approved',         -- Admin approves verification
  'verification_rejected',         -- Admin rejects verification
  'verification_revoked',          -- Admin revokes existing verification

  -- VIP System (4)
  'vip_purchase_confirmed',        -- VIP subscription purchase initiated
  'vip_payment_verified',          -- Admin verifies payment screenshot
  'vip_payment_rejected',          -- Admin rejects payment screenshot
  'vip_subscription_cancelled',    -- VIP subscription cancelled

  -- Edit Proposals (3)
  'edit_proposal_submitted',       -- User submits edit proposal
  'edit_proposal_approved',        -- Admin approves edit proposal
  'edit_proposal_rejected',        -- Admin rejects edit proposal

  -- Establishment Owners (3)
  'establishment_owner_assigned',           -- User assigned as establishment owner
  'establishment_owner_removed',            -- User removed as establishment owner
  'establishment_owner_permissions_updated', -- Owner permissions updated

  -- Moderation Enhancement (1)
  'comment_removed'                -- Comment removed by moderator/admin
));

-- ===========================================
-- STEP 3: Add comment for documentation
-- ===========================================
COMMENT ON CONSTRAINT notifications_type_check ON notifications IS
  'Allowed notification types (36 total):
  Ownership (4), Moderation (7), Social (4), Updates (3), Admin (3), System (2),
  Verification (4), VIP (4), Edit Proposals (3), Establishment Owners (3).
  Updated: v10.3 (2025-01-20)';

-- ===========================================
-- VERIFICATION
-- ===========================================
-- Run this query to verify the constraint was updated correctly:
/*
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
  AND conname = 'notifications_type_check';
*/

-- Count the types in the constraint (should be 36):
/*
SELECT COUNT(*) AS total_types
FROM (
  SELECT unnest(
    regexp_split_to_array(
      regexp_replace(
        pg_get_constraintdef(oid),
        '^CHECK \(\(type\)::text = ANY \(ARRAY\[(.*)\]\)\)$',
        '\1'
      ),
      ', '
    )
  ) AS type
  FROM pg_constraint
  WHERE conrelid = 'notifications'::regclass
    AND conname = 'notifications_type_check'
) AS types;
*/

-- ===========================================
-- ROLLBACK (if needed)
-- ===========================================
-- To rollback to 21 types (NOT RECOMMENDED - will break v10.3 notifications):
/*
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'ownership_request_submitted',
  'ownership_request_approved',
  'ownership_request_rejected',
  'new_ownership_request',
  'employee_approved',
  'employee_rejected',
  'establishment_approved',
  'establishment_rejected',
  'comment_approved',
  'comment_rejected',
  'comment_reply',
  'comment_mention',
  'new_favorite',
  'favorite_available',
  'employee_profile_updated',
  'employee_photos_updated',
  'employee_position_changed',
  'new_content_pending',
  'new_report',
  'moderation_action_required',
  'system',
  'other'
));
*/
