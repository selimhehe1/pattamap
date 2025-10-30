-- =====================================================
-- MIGRATION VIP SYSTEM - STEP 3/3
-- Vérification que tout est bien créé
-- =====================================================
-- Date: 2025-01-18
-- Description: Requêtes de vérification pour valider la migration
-- À exécuter APRÈS supabase_step2_vip_entity_columns.sql
-- =====================================================

-- =====================================================
-- 1. VÉRIFIER LES TABLES CRÉÉES
-- =====================================================

-- Lister toutes les tables VIP (devrait retourner 3 lignes)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE '%vip%'
ORDER BY tablename;

-- Résultat attendu:
-- employee_vip_subscriptions
-- establishment_vip_subscriptions
-- vip_payment_transactions

-- =====================================================
-- 2. VÉRIFIER LES COLONNES VIP DANS ESTABLISHMENTS
-- =====================================================

-- Vérifier que establishments a les colonnes is_vip et vip_expires_at
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'establishments'
  AND column_name IN ('is_vip', 'vip_expires_at')
ORDER BY column_name;

-- Résultat attendu (2 lignes):
-- is_vip | boolean | YES | false
-- vip_expires_at | timestamp with time zone | YES | NULL

-- Tester une sélection
SELECT is_vip, vip_expires_at FROM establishments LIMIT 1;

-- =====================================================
-- 3. VÉRIFIER LES COLONNES VIP DANS EMPLOYEES
-- =====================================================

-- Vérifier que employees a les colonnes is_vip et vip_expires_at
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name IN ('is_vip', 'vip_expires_at')
ORDER BY column_name;

-- Résultat attendu (2 lignes):
-- is_vip | boolean | YES | false
-- vip_expires_at | timestamp with time zone | YES | NULL

-- Tester une sélection
SELECT is_vip, vip_expires_at FROM employees LIMIT 1;

-- =====================================================
-- 4. VÉRIFIER LES INDEXES CRÉÉS
-- =====================================================

-- Lister tous les indexes VIP (devrait retourner 19 indexes)
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND (indexname LIKE 'idx_%vip%' OR indexname LIKE '%_vip_%')
ORDER BY tablename, indexname;

-- Résultat attendu:
-- ESTABLISHMENTS (3):
-- idx_establishments_is_vip
-- idx_establishments_vip_expires
-- idx_establishments_vip_status
--
-- EMPLOYEES (3):
-- idx_employees_is_vip
-- idx_employees_vip_expires
-- idx_employees_vip_status
--
-- EMPLOYEE_VIP_SUBSCRIPTIONS (5):
-- idx_employee_vip_employee_id
-- idx_employee_vip_status
-- idx_employee_vip_expires_at
-- idx_employee_vip_status_expires
-- idx_employee_vip_transaction_id
--
-- ESTABLISHMENT_VIP_SUBSCRIPTIONS (5):
-- idx_establishment_vip_establishment_id
-- idx_establishment_vip_status
-- idx_establishment_vip_expires_at
-- idx_establishment_vip_status_expires
-- idx_establishment_vip_transaction_id
--
-- VIP_PAYMENT_TRANSACTIONS (4):
-- idx_vip_transactions_user_id
-- idx_vip_transactions_subscription_type_id
-- idx_vip_transactions_payment_status
-- idx_vip_transactions_created_at

-- =====================================================
-- 5. VÉRIFIER LES TRIGGERS CRÉÉS
-- =====================================================

-- Lister tous les triggers VIP (devrait retourner 2 triggers)
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%vip%'
ORDER BY trigger_name;

-- Résultat attendu:
-- trigger_sync_employee_vip | employee_vip_subscriptions
-- trigger_sync_establishment_vip | establishment_vip_subscriptions

-- =====================================================
-- 6. VÉRIFIER LES FONCTIONS CRÉÉES
-- =====================================================

-- Lister toutes les fonctions VIP (devrait retourner 5 fonctions)
SELECT proname, pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'is_employee_vip',
    'is_establishment_vip',
    'expire_vip_subscriptions',
    'sync_employee_vip_status',
    'sync_establishment_vip_status'
  )
ORDER BY proname;

-- Résultat attendu (5 fonctions):
-- expire_vip_subscriptions |
-- is_employee_vip | employee_id_param uuid
-- is_establishment_vip | establishment_id_param uuid
-- sync_employee_vip_status |
-- sync_establishment_vip_status |

-- =====================================================
-- 7. VÉRIFIER LES RLS POLICIES
-- =====================================================

-- Lister toutes les policies VIP (devrait retourner 14 policies)
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE '%vip%'
ORDER BY tablename, policyname;

-- Résultat attendu (14 policies):
-- employee_vip_subscriptions: 5 policies
-- establishment_vip_subscriptions: 5 policies
-- vip_payment_transactions: 4 policies

-- =====================================================
-- 8. TESTER LES FONCTIONS HELPER
-- =====================================================

-- Tester is_employee_vip (devrait retourner FALSE si aucun VIP actif)
SELECT is_employee_vip((SELECT id FROM employees LIMIT 1));

-- Tester is_establishment_vip (devrait retourner FALSE si aucun VIP actif)
SELECT is_establishment_vip((SELECT id FROM establishments LIMIT 1));

-- =====================================================
-- ✅ MIGRATION COMPLETE - CHECKLIST
-- =====================================================
--
-- [ ] 3 tables VIP créées
-- [ ] Colonnes is_vip, vip_expires_at ajoutées à establishments
-- [ ] Colonnes is_vip, vip_expires_at ajoutées à employees
-- [ ] 19 indexes de performance créés
-- [ ] 2 triggers automatiques créés
-- [ ] 5 fonctions helper créées
-- [ ] 14 RLS policies créées
--
-- Si toutes les requêtes ci-dessus retournent les résultats attendus,
-- la migration VIP System est COMPLÈTE ✅
--
-- =====================================================
