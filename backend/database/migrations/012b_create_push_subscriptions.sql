-- Migration 012: Push Subscriptions for PWA Notifications
-- Created: 2025-01-XX
-- Purpose: Store user push notification subscriptions for PWA

-- ==========================================
-- TABLE: push_subscriptions
-- ==========================================
-- Stores Web Push API subscriptions for each user
-- Each user can have multiple subscriptions (different devices/browsers)

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Web Push API subscription details
  endpoint TEXT NOT NULL UNIQUE, -- Push service URL (unique per device/browser)
  p256dh_key TEXT NOT NULL, -- Public key for message encryption
  auth_key TEXT NOT NULL, -- Authentication secret

  -- Metadata
  user_agent TEXT, -- Browser/device info for debugging
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one subscription per endpoint
  CONSTRAINT unique_endpoint UNIQUE (endpoint)
);

-- ==========================================
-- INDEXES
-- ==========================================

-- Fast lookup by user (to send notifications)
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Fast lookup by endpoint (to update/delete subscriptions)
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Clean up old subscriptions (for maintenance jobs)
CREATE INDEX idx_push_subscriptions_last_used ON push_subscriptions(last_used_at);

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own subscriptions
CREATE POLICY "Users can create own subscriptions"
  ON push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all subscriptions (for debugging)
CREATE POLICY "Admins can view all subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to update last_used_at when subscription is validated
CREATE OR REPLACE FUNCTION update_subscription_last_used(p_endpoint TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE push_subscriptions
  SET last_used_at = NOW()
  WHERE endpoint = p_endpoint;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old/inactive subscriptions
-- (Run periodically via cron job - subscriptions older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_push_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM push_subscriptions
  WHERE last_used_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE push_subscriptions IS 'Web Push API subscriptions for PWA notifications';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Unique push service URL (identifies device/browser)';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'Public key for encrypting notification payloads';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Authentication secret for push service';
COMMENT ON COLUMN push_subscriptions.last_used_at IS 'Last time subscription was successfully used (for cleanup)';
