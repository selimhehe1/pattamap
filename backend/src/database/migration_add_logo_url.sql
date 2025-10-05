-- Migration: Add logo_url column to establishments table
-- This enables custom logos for each establishment with Cloudinary storage

-- Add logo_url column to establishments table
ALTER TABLE establishments
ADD COLUMN logo_url VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN establishments.logo_url IS 'Cloudinary URL for establishment logo (64x64px PNG recommended)';

-- Update the updated_at timestamp for tracking
UPDATE establishments SET updated_at = NOW() WHERE logo_url IS NULL;

-- Create index for performance (optional, for future logo-based queries)
CREATE INDEX IF NOT EXISTS idx_establishments_logo_url ON establishments(logo_url);

-- Log the migration completion
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('20240922_add_logo_url', 'Add logo_url column to establishments', NOW())
ON CONFLICT (version) DO NOTHING;

-- Validation: Check the column was added successfully
SELECT 'Migration completed successfully - logo_url column added to establishments' as status;