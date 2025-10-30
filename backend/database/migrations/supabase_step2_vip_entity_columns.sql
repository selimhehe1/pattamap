-- =====================================================
-- MIGRATION VIP SYSTEM - STEP 2/3
-- Ajouter colonnes VIP aux tables entities (establishments + employees)
-- =====================================================
-- Date: 2025-01-18
-- Description: Ajoute is_vip et vip_expires_at + triggers automatiques
-- À exécuter APRÈS supabase_step1_vip_tables.sql
-- =====================================================

-- =====================================================
-- 1. ADD VIP COLUMNS TO ESTABLISHMENTS TABLE
-- =====================================================

-- Add VIP status columns to establishments table
ALTER TABLE establishments
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vip_expires_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN establishments.is_vip IS 'TRUE if establishment has active VIP subscription - used for frontend visual effects (gold border, crown)';
COMMENT ON COLUMN establishments.vip_expires_at IS 'VIP subscription expiration date - frontend checks if NOW() < vip_expires_at to show VIP effects';

-- =====================================================
-- 2. ADD VIP COLUMNS TO EMPLOYEES TABLE
-- =====================================================

-- Add VIP status columns to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vip_expires_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN employees.is_vip IS 'TRUE if employee has active VIP subscription - used for search boost and featured placement';
COMMENT ON COLUMN employees.vip_expires_at IS 'VIP subscription expiration date - used to determine if VIP effects should be displayed';

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================

-- Partial indexes for establishments (only for VIP entities)
CREATE INDEX IF NOT EXISTS idx_establishments_is_vip
  ON establishments(is_vip)
  WHERE is_vip = TRUE;

CREATE INDEX IF NOT EXISTS idx_establishments_vip_expires
  ON establishments(vip_expires_at)
  WHERE is_vip = TRUE;

-- Composite index for efficient VIP queries (establishments)
CREATE INDEX IF NOT EXISTS idx_establishments_vip_status
  ON establishments(is_vip, vip_expires_at)
  WHERE is_vip = TRUE;

-- Partial indexes for employees (only for VIP entities)
CREATE INDEX IF NOT EXISTS idx_employees_is_vip
  ON employees(is_vip)
  WHERE is_vip = TRUE;

CREATE INDEX IF NOT EXISTS idx_employees_vip_expires
  ON employees(vip_expires_at)
  WHERE is_vip = TRUE;

-- Composite index for efficient VIP queries (employees)
CREATE INDEX IF NOT EXISTS idx_employees_vip_status
  ON employees(is_vip, vip_expires_at)
  WHERE is_vip = TRUE;

-- =====================================================
-- 4. TRIGGERS TO AUTO-SYNC VIP STATUS FROM SUBSCRIPTIONS
-- =====================================================

-- Function to sync establishment VIP status from subscriptions
CREATE OR REPLACE FUNCTION sync_establishment_vip_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update establishment is_vip and vip_expires_at based on active subscription
  UPDATE establishments
  SET
    is_vip = (
      EXISTS (
        SELECT 1
        FROM establishment_vip_subscriptions
        WHERE establishment_id = NEW.establishment_id
          AND status = 'active'
          AND expires_at > NOW()
      )
    ),
    vip_expires_at = (
      SELECT expires_at
      FROM establishment_vip_subscriptions
      WHERE establishment_id = NEW.establishment_id
        AND status = 'active'
        AND expires_at > NOW()
      ORDER BY expires_at DESC
      LIMIT 1
    )
  WHERE id = NEW.establishment_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync employee VIP status from subscriptions
CREATE OR REPLACE FUNCTION sync_employee_vip_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update employee is_vip and vip_expires_at based on active subscription
  UPDATE employees
  SET
    is_vip = (
      EXISTS (
        SELECT 1
        FROM employee_vip_subscriptions
        WHERE employee_id = NEW.employee_id
          AND status = 'active'
          AND expires_at > NOW()
      )
    ),
    vip_expires_at = (
      SELECT expires_at
      FROM employee_vip_subscriptions
      WHERE employee_id = NEW.employee_id
        AND status = 'active'
        AND expires_at > NOW()
      ORDER BY expires_at DESC
      LIMIT 1
    )
  WHERE id = NEW.employee_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for establishment VIP subscriptions
DROP TRIGGER IF EXISTS trigger_sync_establishment_vip ON establishment_vip_subscriptions;
CREATE TRIGGER trigger_sync_establishment_vip
AFTER INSERT OR UPDATE ON establishment_vip_subscriptions
FOR EACH ROW
EXECUTE FUNCTION sync_establishment_vip_status();

-- Trigger for employee VIP subscriptions
DROP TRIGGER IF EXISTS trigger_sync_employee_vip ON employee_vip_subscriptions;
CREATE TRIGGER trigger_sync_employee_vip
AFTER INSERT OR UPDATE ON employee_vip_subscriptions
FOR EACH ROW
EXECUTE FUNCTION sync_employee_vip_status();

-- =====================================================
-- STEP 2 COMPLETE ✅
-- =====================================================
-- Colonnes ajoutées: is_vip, vip_expires_at (establishments + employees)
-- Indexes créés: 6 partial indexes de performance
-- Triggers créés: 2 triggers automatiques (sync VIP status)
--
-- ➡️ NEXT STEP: Exécuter supabase_step3_verify.sql pour vérifier
-- =====================================================
