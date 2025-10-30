-- ========================================
-- SCRIPT: Vérification Schema Notifications
-- Version: v10.3
-- Date: 2025-01-20
-- Description: Vérifie la structure de la table notifications et les fonctions RPC
-- ========================================

-- ===========================================
-- SECTION 1: Vérifier l'existence de la table
-- ===========================================
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_name = 'notifications';

-- Expected: 1 row with table_name='notifications', table_type='BASE TABLE'

-- ===========================================
-- SECTION 2: Vérifier toutes les colonnes
-- ===========================================
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Expected columns:
-- id                    | uuid                      | NO  | uuid_generate_v4()
-- user_id               | uuid                      | NO  | NULL
-- type                  | character varying(50)     | NO  | NULL
-- title                 | character varying(200)    | NO  | NULL
-- message               | text                      | NO  | NULL
-- link                  | character varying(500)    | YES | NULL
-- is_read               | boolean                   | YES | false
-- created_at            | timestamp with time zone  | YES | now()
-- related_entity_type   | character varying(50)     | YES | NULL
-- related_entity_id     | uuid                      | YES | NULL
-- metadata              | jsonb                     | YES | '{}'::jsonb  ⚠️ CRITIQUE - Doit exister!

-- ===========================================
-- SECTION 3: Vérifier la contrainte CHECK (types)
-- ===========================================
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
  AND contype = 'c';  -- CHECK constraints

-- Expected: notifications_type_check avec 36 types (21 anciens + 15 nouveaux v10.3)
-- Si vous voyez seulement 21 types, la contrainte doit être mise à jour!

-- ===========================================
-- SECTION 4: Lister tous les types supportés
-- ===========================================
-- Cette requête extrait les types de la contrainte CHECK
SELECT
  unnest(
    regexp_split_to_array(
      regexp_replace(
        pg_get_constraintdef(oid),
        '^CHECK \(\(type\)::text = ANY \(ARRAY\[(.*)\]\)\)$',
        '\1'
      ),
      ', '
    )
  ) AS supported_type
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
  AND conname = 'notifications_type_check'
ORDER BY supported_type;

-- Expected: 36 types total
-- ✅ Anciens types (21):
--   - comment_approved, comment_mention, comment_rejected, comment_reply
--   - employee_approved, employee_photos_updated, employee_position_changed
--   - employee_profile_updated, employee_rejected
--   - establishment_approved, establishment_rejected
--   - favorite_available, new_favorite
--   - moderation_action_required, new_content_pending, new_ownership_request, new_report
--   - other, ownership_request_approved, ownership_request_rejected, ownership_request_submitted
--   - system
--
-- ⚠️ Nouveaux types v10.3 (15) - DOIVENT être présents:
--   - comment_removed
--   - edit_proposal_approved, edit_proposal_rejected, edit_proposal_submitted
--   - establishment_owner_assigned, establishment_owner_permissions_updated, establishment_owner_removed
--   - verification_approved, verification_rejected, verification_revoked, verification_submitted
--   - vip_payment_rejected, vip_payment_verified, vip_purchase_confirmed, vip_subscription_cancelled

-- ===========================================
-- SECTION 5: Vérifier les index
-- ===========================================
SELECT
  i.relname AS index_name,
  a.attname AS column_name,
  am.amname AS index_type
FROM pg_index ix
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
JOIN pg_am am ON am.oid = i.relam
WHERE t.relname = 'notifications'
ORDER BY i.relname, a.attname;

-- Expected indexes:
-- idx_notifications_created_at       | created_at        | btree
-- idx_notifications_metadata         | metadata          | gin   ⚠️ Doit exister si metadata existe!
-- idx_notifications_type             | type              | btree
-- idx_notifications_user_id          | user_id           | btree
-- idx_notifications_user_unread      | user_id, is_read  | btree
-- notifications_pkey                 | id                | btree

-- ===========================================
-- SECTION 6: Vérifier les fonctions RPC
-- ===========================================
SELECT
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname IN (
  'get_user_notifications',
  'mark_notification_read',
  'mark_all_notifications_read',
  'delete_notification',
  'get_unread_count'
)
ORDER BY proname;

-- Expected: 5 functions
-- 1. get_user_notifications(p_user_id uuid, p_limit integer, p_unread_only boolean)
--    Returns: TABLE(id, user_id, type, title, message, link, is_read, created_at, related_entity_type, related_entity_id, metadata)
--
-- 2. mark_notification_read(p_notification_id uuid, p_user_id uuid)
--    Returns: boolean
--
-- 3. mark_all_notifications_read(p_user_id uuid)
--    Returns: boolean
--
-- 4. delete_notification(p_notification_id uuid, p_user_id uuid)
--    Returns: boolean
--
-- 5. get_unread_count(p_user_id uuid)
--    Returns: integer

-- ===========================================
-- SECTION 7: Compter les notifications par type
-- ===========================================
SELECT
  type,
  COUNT(*) AS count,
  SUM(CASE WHEN is_read THEN 1 ELSE 0 END) AS read_count,
  SUM(CASE WHEN NOT is_read THEN 1 ELSE 0 END) AS unread_count
FROM notifications
GROUP BY type
ORDER BY count DESC;

-- ===========================================
-- DIAGNOSTIC RAPIDE
-- ===========================================

-- ⚠️ SI LA COLONNE metadata N'APPARAÎT PAS EN SECTION 2:
--    → Exécutez: backend/database/migrations/add_notifications_metadata.sql

-- ⚠️ SI SEULEMENT 21 TYPES EN SECTION 3/4:
--    → Exécutez: backend/database/migrations/update_notification_types_v10_3.sql

-- ⚠️ SI MOINS DE 5 FONCTIONS EN SECTION 6:
--    → Créez les fonctions RPC manuellement dans Supabase SQL Editor
--    → Voir: backend/database/migrations/add_notifications.sql (lignes 98-116)

-- ⚠️ SI INDEX metadata MANQUANT EN SECTION 5:
--    → Exécutez: CREATE INDEX idx_notifications_metadata ON notifications USING GIN (metadata);
