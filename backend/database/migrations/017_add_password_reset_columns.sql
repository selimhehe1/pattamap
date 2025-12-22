-- 🔧 FIX A4: Add password reset columns to users table
-- Migration: 017_add_password_reset_columns.sql
-- Created: 2024-12-22
-- Purpose: Enable password reset functionality

-- Add password reset columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(64),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE;

-- Create index for faster token lookups (tokens are hashed SHA256 = 64 chars)
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token
ON users(password_reset_token)
WHERE password_reset_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.password_reset_token IS 'SHA256 hash of password reset token (plaintext token sent to user email)';
COMMENT ON COLUMN users.password_reset_expires IS 'Expiration timestamp for the password reset token (1 hour from creation)';
