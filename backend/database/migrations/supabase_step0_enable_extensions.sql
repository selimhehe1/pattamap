-- =====================================================
-- MIGRATION VIP SYSTEM - STEP 0/3 (PRÉREQUIS)
-- Activer les extensions PostgreSQL nécessaires
-- =====================================================
-- Date: 2025-01-18
-- Description: Active l'extension btree_gist pour supporter les contraintes EXCLUDE USING gist avec UUID
-- À exécuter EN TOUT PREMIER avant supabase_step1_vip_tables.sql
-- =====================================================
BEGIN;

-- Activer l'extension btree_gist
-- Cette extension ajoute le support des types de données standards (UUID, INT, TEXT, etc.)
-- pour les index GIST, ce qui permet d'utiliser EXCLUDE USING gist avec UUID
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Vérifier que l'extension est bien activée
SELECT * FROM pg_extension WHERE extname = 'btree_gist';

-- Résultat attendu: 1 ligne avec extname = 'btree_gist'

-- =====================================================
-- STEP 0 COMPLETE ✅
-- =====================================================
-- Extension btree_gist activée
--
-- ➡️ NEXT STEP: Exécuter supabase_step1_vip_tables.sql
-- =====================================================

COMMIT;
