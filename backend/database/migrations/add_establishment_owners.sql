-- ========================================
-- MIGRATION: Add Establishment Owners System
-- Version: v10.1
-- Date: 2025-01-XX
-- Description: Create establishment_owners table to link users with establishments they can manage
-- ========================================

-- Purpose: Allow specific users (account_type='establishment_owner') to manage their establishments
-- This enables business owners to control their listing without admin privileges

-- Create establishment_owners table
CREATE TABLE IF NOT EXISTS establishment_owners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,

  -- Role for future hierarchy (owner = full control, manager = limited control)
  owner_role VARCHAR(20) DEFAULT 'owner' CHECK (owner_role IN ('owner', 'manager')),

  -- Permissions for granular control (future feature)
  permissions JSONB DEFAULT '{
    "can_edit_info": true,
    "can_edit_pricing": true,
    "can_edit_photos": true,
    "can_edit_employees": false,
    "can_view_analytics": true
  }'::jsonb,

  -- Metadata
  assigned_by UUID REFERENCES users(id), -- Admin who assigned ownership
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate ownership assignments
  CONSTRAINT unique_user_establishment UNIQUE (user_id, establishment_id)
);

-- Indexes for performance
CREATE INDEX idx_establishment_owners_user_id ON establishment_owners(user_id);
CREATE INDEX idx_establishment_owners_establishment_id ON establishment_owners(establishment_id);
CREATE INDEX idx_establishment_owners_role ON establishment_owners(owner_role);

-- Comments for documentation
COMMENT ON TABLE establishment_owners IS 'Links users with establishments they can manage. Users must have account_type=establishment_owner.';
COMMENT ON COLUMN establishment_owners.owner_role IS 'Role hierarchy: owner (full control), manager (limited control). Currently only owner is supported.';
COMMENT ON COLUMN establishment_owners.permissions IS 'Granular permissions (JSONB). Future feature for fine-grained access control.';
COMMENT ON COLUMN establishment_owners.assigned_by IS 'Admin user who assigned this ownership. NULL if self-claimed (future feature).';

-- ========================================
-- MIGRATION ROLLBACK (if needed)
-- ========================================
-- To rollback this migration, run:
-- DROP TABLE IF EXISTS establishment_owners CASCADE;
