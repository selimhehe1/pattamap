-- =====================================================
-- v10.3 Phase 1 - Refresh Tokens Table
-- Migration: Add refresh_tokens table for token rotation
-- Date: 2025-12-28
-- Description: Enables secure token refresh with rotation
-- =====================================================
BEGIN;

-- =====================================================
-- 1. CREATE REFRESH TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_family UUID NOT NULL,  -- Groups related tokens for rotation
  token_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash of refresh token
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_reason VARCHAR(50)  -- 'logout', 'rotation', 'security', 'admin'
);

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON public.refresh_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash
  ON public.refresh_tokens(token_hash)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family
  ON public.refresh_tokens(token_family);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires
  ON public.refresh_tokens(expires_at)
  WHERE is_active = true;

-- Composite index for active token lookup
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active_lookup
  ON public.refresh_tokens(token_hash, is_active)
  WHERE is_active = true;

-- =====================================================
-- 3. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tokens
CREATE POLICY "refresh_tokens_read_own"
  ON public.refresh_tokens FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all tokens (for security auditing)
CREATE POLICY "refresh_tokens_admin_read"
  ON public.refresh_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- =====================================================
-- 4. CLEANUP FUNCTION
-- =====================================================

-- Function to clean up expired tokens (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.refresh_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days'
      OR (is_active = false AND revoked_at < NOW() - INTERVAL '1 day')
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.refresh_tokens IS 'Stores refresh tokens for JWT rotation. Token hash is stored, never the actual token.';
COMMENT ON COLUMN public.refresh_tokens.token_family IS 'Groups tokens from same login session. All family tokens revoked on reuse detection.';
COMMENT ON COLUMN public.refresh_tokens.token_hash IS 'SHA-256 hash of the refresh token. Actual token never stored.';
COMMENT ON COLUMN public.refresh_tokens.revoked_reason IS 'Why token was revoked: logout, rotation, security (reuse detected), admin';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMIT;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
/*
BEGIN;

DROP POLICY IF EXISTS "refresh_tokens_read_own" ON public.refresh_tokens;
DROP POLICY IF EXISTS "refresh_tokens_admin_read" ON public.refresh_tokens;
DROP FUNCTION IF EXISTS cleanup_expired_refresh_tokens();
DROP TABLE IF EXISTS public.refresh_tokens;

COMMIT;
*/
