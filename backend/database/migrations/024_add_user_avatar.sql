-- Migration: Add avatar_url to users table
-- Description: Allows users to upload an optional profile photo

-- Add avatar_url column (nullable, max 500 chars for Cloudinary URLs)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);

-- Add comment for documentation
COMMENT ON COLUMN public.users.avatar_url IS 'Optional profile photo URL (Cloudinary)';
