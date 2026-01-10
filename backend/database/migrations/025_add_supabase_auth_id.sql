-- Migration: Add auth_id column for Supabase Auth integration
-- Description: Links users to Supabase Auth (auth.users) for OAuth and email authentication
-- Date: 2026-01-10

-- Add auth_id column (nullable initially for existing users)
-- This will store the Supabase Auth user ID (UUID from auth.users)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS auth_id UUID;

-- Create unique index for fast lookups and to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_id
ON public.users(auth_id)
WHERE auth_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.auth_id IS 'Supabase Auth user ID (UUID from auth.users table). Nullable for legacy users not yet migrated.';

-- Note: We don't add a foreign key constraint because auth.users is managed by Supabase
-- and we can't reference it directly from public schema in all Supabase configurations.
-- The constraint is enforced at the application level via the sync endpoint.

-- Verify the migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'auth_id'
  ) THEN
    RAISE NOTICE 'Migration 025: auth_id column added successfully';
  ELSE
    RAISE EXCEPTION 'Migration 025: Failed to add auth_id column';
  END IF;
END $$;
