-- =====================================================
-- MIGRATION VIP SYSTEM - STEP 1/3 (VERSION SIMPLIFIÉE)
-- Créer les tables VIP (subscriptions + transactions)
-- =====================================================
-- Date: 2025-01-18
-- Version: SIMPLE (sans dépendances establishment_owners)
-- Description: Crée les 3 tables VIP avec RLS policies BASIQUES (admin-only)
-- À exécuter APRÈS supabase_step0_enable_extensions.sql
-- =====================================================
BEGIN;

-- =====================================================
-- 1. VIP PAYMENT TRANSACTIONS (créée EN PREMIER car référencée par les autres)
-- =====================================================
CREATE TABLE IF NOT EXISTS vip_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to subscription (polymorphic - can be employee or establishment)
  subscription_type TEXT NOT NULL CHECK (subscription_type IN ('employee', 'establishment')),
  subscription_id UUID NOT NULL, -- references employee_vip_subscriptions.id or establishment_vip_subscriptions.id

  -- Payer
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Payment details
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'THB',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('promptpay', 'cash', 'admin_grant')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),

  -- PromptPay specific
  promptpay_qr_code TEXT, -- base64 QR code image
  promptpay_reference TEXT, -- unique reference for payment verification

  -- Cash payment specific
  admin_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_verified_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- flexible field for future payment integrations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE vip_payment_transactions IS 'Payment transaction records for VIP subscriptions - supports PromptPay QR and cash verification';
COMMENT ON COLUMN vip_payment_transactions.subscription_type IS 'Type of subscription: employee or establishment';

-- =====================================================
-- 2. EMPLOYEE VIP SUBSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_vip_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- Subscription details
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'pending_payment')),
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'premium')),
  duration INTEGER NOT NULL CHECK (duration IN (7, 30, 90, 365)), -- days

  -- Dates
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Payment
  payment_method TEXT CHECK (payment_method IN ('promptpay', 'cash', 'admin_grant')),
  payment_status TEXT CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  price_paid DECIMAL(10, 2), -- THB
  transaction_id UUID REFERENCES vip_payment_transactions(id) ON DELETE SET NULL,

  -- Admin verification (for cash payments)
  admin_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_verified_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure no overlapping active subscriptions for same employee
  CONSTRAINT no_overlapping_employee_vip EXCLUDE USING gist (
    employee_id WITH =,
    tstzrange(starts_at, expires_at, '[)') WITH &&
  ) WHERE (status = 'active')
);

COMMENT ON TABLE employee_vip_subscriptions IS 'VIP subscriptions for individual employees - provides search boost, badges, and featured placement';
COMMENT ON COLUMN employee_vip_subscriptions.tier IS 'VIP tier: basic (search boost + badge), premium (top of lineup + featured on maps)';
COMMENT ON COLUMN employee_vip_subscriptions.duration IS 'Subscription duration in days: 7, 30, 90, or 365';

-- =====================================================
-- 3. ESTABLISHMENT VIP SUBSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS establishment_vip_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,

  -- Subscription details
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled', 'pending_payment')),
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'premium')),
  duration INTEGER NOT NULL CHECK (duration IN (7, 30, 90, 365)), -- days

  -- Dates
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Payment
  payment_method TEXT CHECK (payment_method IN ('promptpay', 'cash', 'admin_grant')),
  payment_status TEXT CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  price_paid DECIMAL(10, 2), -- THB
  transaction_id UUID REFERENCES vip_payment_transactions(id) ON DELETE SET NULL,

  -- Admin verification (for cash payments)
  admin_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_verified_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure no overlapping active subscriptions for same establishment
  CONSTRAINT no_overlapping_establishment_vip EXCLUDE USING gist (
    establishment_id WITH =,
    tstzrange(starts_at, expires_at, '[)') WITH &&
  ) WHERE (status = 'active')
);

COMMENT ON TABLE establishment_vip_subscriptions IS 'VIP subscriptions for establishments - provides search boost, badges, and featured placement on maps';
COMMENT ON COLUMN establishment_vip_subscriptions.tier IS 'VIP tier: basic (search boost + badge), premium (top of zone lists + featured position on maps)';

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

-- Employee VIP Subscriptions
CREATE INDEX IF NOT EXISTS idx_employee_vip_employee_id ON employee_vip_subscriptions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_vip_status ON employee_vip_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_employee_vip_expires_at ON employee_vip_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_employee_vip_status_expires ON employee_vip_subscriptions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_employee_vip_transaction_id ON employee_vip_subscriptions(transaction_id);

-- Establishment VIP Subscriptions
CREATE INDEX IF NOT EXISTS idx_establishment_vip_establishment_id ON establishment_vip_subscriptions(establishment_id);
CREATE INDEX IF NOT EXISTS idx_establishment_vip_status ON establishment_vip_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_establishment_vip_expires_at ON establishment_vip_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_establishment_vip_status_expires ON establishment_vip_subscriptions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_establishment_vip_transaction_id ON establishment_vip_subscriptions(transaction_id);

-- Payment Transactions
CREATE INDEX IF NOT EXISTS idx_vip_transactions_user_id ON vip_payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_transactions_subscription_type_id ON vip_payment_transactions(subscription_type, subscription_id);
CREATE INDEX IF NOT EXISTS idx_vip_transactions_payment_status ON vip_payment_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_vip_transactions_created_at ON vip_payment_transactions(created_at DESC);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES - VERSION SIMPLIFIÉE
-- =====================================================
-- NOTE: Cette version utilise des policies BASIQUES sans dépendance sur establishment_owners
-- Pour ajouter les policies avancées plus tard, voir README_VIP_MIGRATION_SIMPLE.md

-- Enable RLS
ALTER TABLE employee_vip_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE establishment_vip_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_payment_transactions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- EMPLOYEE VIP SUBSCRIPTIONS POLICIES
-- ========================================

-- Public read access for active subscriptions
CREATE POLICY "Anyone can view active employee VIP subscriptions"
  ON employee_vip_subscriptions FOR SELECT
  USING (status = 'active');

-- Admin full access
CREATE POLICY "Admins can view all employee VIP subscriptions"
  ON employee_vip_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert employee VIP subscriptions"
  ON employee_vip_subscriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update employee VIP subscriptions"
  ON employee_vip_subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete employee VIP subscriptions"
  ON employee_vip_subscriptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- ESTABLISHMENT VIP SUBSCRIPTIONS POLICIES
-- ========================================

-- Public read access for active subscriptions
CREATE POLICY "Anyone can view active establishment VIP subscriptions"
  ON establishment_vip_subscriptions FOR SELECT
  USING (status = 'active');

-- Admin full access
CREATE POLICY "Admins can view all establishment VIP subscriptions"
  ON establishment_vip_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert establishment VIP subscriptions"
  ON establishment_vip_subscriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update establishment VIP subscriptions"
  ON establishment_vip_subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete establishment VIP subscriptions"
  ON establishment_vip_subscriptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ========================================
-- PAYMENT TRANSACTIONS POLICIES
-- ========================================

-- Users can view their own payment transactions
CREATE POLICY "Users can view their own payment transactions"
  ON vip_payment_transactions FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all payment transactions
CREATE POLICY "Admins can view all payment transactions"
  ON vip_payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can insert their own payment transactions
CREATE POLICY "Users can insert their own payment transactions"
  ON vip_payment_transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can update payment transactions
CREATE POLICY "Admins can update payment transactions"
  ON vip_payment_transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete payment transactions
CREATE POLICY "Admins can delete payment transactions"
  ON vip_payment_transactions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to check if an employee has active VIP
CREATE OR REPLACE FUNCTION is_employee_vip(employee_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM employee_vip_subscriptions
    WHERE employee_id = employee_id_param
      AND status = 'active'
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if an establishment has active VIP
CREATE OR REPLACE FUNCTION is_establishment_vip(establishment_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM establishment_vip_subscriptions
    WHERE establishment_id = establishment_id_param
      AND status = 'active'
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to automatically expire subscriptions (call via cron job)
CREATE OR REPLACE FUNCTION expire_vip_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Expire employee VIP subscriptions
  WITH updated AS (
    UPDATE employee_vip_subscriptions
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'active'
      AND expires_at <= NOW()
    RETURNING 1
  )
  SELECT COUNT(*) INTO expired_count FROM updated;

  -- Expire establishment VIP subscriptions
  WITH updated AS (
    UPDATE establishment_vip_subscriptions
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'active'
      AND expires_at <= NOW()
    RETURNING 1
  )
  SELECT expired_count + COUNT(*) INTO expired_count FROM updated;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 1 COMPLETE ✅
-- =====================================================
-- Tables créées: vip_payment_transactions, employee_vip_subscriptions, establishment_vip_subscriptions
-- Indexes créés: 13 indexes de performance
-- RLS Policies: 15 policies SIMPLIFIÉES (admin-only + public read)
-- Functions: 3 helper functions
--
-- NOTE: Cette version utilise des RLS policies BASIQUES
-- Pour ajouter ownership policies plus tard, voir README_VIP_MIGRATION_SIMPLE.md
--
-- ➡️ NEXT STEP: Exécuter supabase_step2_vip_entity_columns.sql
-- =====================================================

COMMIT;
