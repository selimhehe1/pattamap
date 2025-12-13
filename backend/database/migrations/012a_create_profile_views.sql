-- Migration: Add Profile Views Tracking
-- Description: Create profile_views table to track employee profile visits
-- Date: 2025-01-16
-- Version: v10.2
BEGIN;

-- ============================================
-- 1. Create profile_views table
-- ============================================

CREATE TABLE IF NOT EXISTS profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- Viewer Information
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for anonymous viewers
  viewer_ip VARCHAR(45), -- IPv4 (15 chars) or IPv6 (45 chars)

  -- Metadata
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_viewer CHECK (user_id IS NOT NULL OR viewer_ip IS NOT NULL)
);

-- ============================================
-- 2. Add indexes for performance
-- ============================================

-- Primary query pattern: Count views per employee
CREATE INDEX IF NOT EXISTS idx_profile_views_employee_id
  ON profile_views(employee_id);

-- Query pattern: Analytics by date range
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at
  ON profile_views(viewed_at DESC);

-- Query pattern: Get views by user (for future analytics)
CREATE INDEX IF NOT EXISTS idx_profile_views_user_id
  ON profile_views(user_id)
  WHERE user_id IS NOT NULL;

-- Composite index for employee analytics over time
CREATE INDEX IF NOT EXISTS idx_profile_views_employee_date
  ON profile_views(employee_id, viewed_at DESC);

-- ============================================
-- 3. Add comments for documentation
-- ============================================

COMMENT ON TABLE profile_views IS 'Tracks employee profile visits for analytics and statistics';
COMMENT ON COLUMN profile_views.employee_id IS 'Reference to the viewed employee profile';
COMMENT ON COLUMN profile_views.user_id IS 'ID of logged-in viewer (NULL for anonymous)';
COMMENT ON COLUMN profile_views.viewer_ip IS 'IP address of viewer (for anonymous tracking and anti-spam)';
COMMENT ON COLUMN profile_views.viewed_at IS 'Timestamp when profile was viewed';

COMMIT;
