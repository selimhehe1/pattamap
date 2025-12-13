-- Migration: add_establishment_responses.sql
-- Description: Add establishment responses support to reviews
-- Date: 2025-12-12
BEGIN;

-- Add columns to identify establishment responses
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_establishment_response BOOLEAN DEFAULT FALSE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS responding_establishment_id UUID REFERENCES establishments(id);

-- Index for efficient retrieval of establishment responses
CREATE INDEX IF NOT EXISTS idx_comments_establishment_responses
  ON comments(responding_establishment_id)
  WHERE is_establishment_response = TRUE;

-- Index for finding all responses by an establishment
CREATE INDEX IF NOT EXISTS idx_comments_by_establishment
  ON comments(responding_establishment_id, created_at DESC)
  WHERE is_establishment_response = TRUE;

-- RLS Policy: Establishment owners can create responses to reviews on their establishments
-- Note: Main comment insert policy already allows authenticated users
-- This policy ensures establishment owners can respond to reviews

-- Create a function to check establishment ownership
CREATE OR REPLACE FUNCTION check_establishment_ownership(user_uuid UUID, establishment_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM establishment_owners
    WHERE user_id = user_uuid
    AND establishment_id = establishment_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Establishment owners can insert responses
CREATE POLICY IF NOT EXISTS "establishment_response_insert_policy" ON comments
  FOR INSERT
  WITH CHECK (
    -- Regular comments (not establishment responses) - allow all authenticated users
    (is_establishment_response IS NULL OR is_establishment_response = FALSE)
    OR
    -- Establishment responses - only allow establishment owners
    (
      is_establishment_response = TRUE
      AND responding_establishment_id IS NOT NULL
      AND check_establishment_ownership(auth.uid(), responding_establishment_id)
    )
  );

-- Add comments for documentation
COMMENT ON COLUMN comments.is_establishment_response IS 'True if this comment is an official response from an establishment owner';
COMMENT ON COLUMN comments.responding_establishment_id IS 'The establishment ID if this is an establishment response';
COMMENT ON FUNCTION check_establishment_ownership IS 'Checks if a user owns/manages an establishment';

COMMIT;
