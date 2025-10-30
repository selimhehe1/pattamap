-- Supabase database schema for Pattaya Directory

-- Enable PostGIS extension for geolocation
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table (simple auth with pseudonym + email)
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pseudonym VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  is_active BOOLEAN DEFAULT TRUE NOT NULL, -- Enable/disable user accounts for moderation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Establishment categories
CREATE TABLE establishment_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL, -- hex color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Establishments (bars, clubs, massage salons, etc.)
CREATE TABLE establishments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326), -- PostGIS for geolocation
  category_id INTEGER REFERENCES establishment_categories(id),
  description TEXT,
  phone VARCHAR(20),
  website VARCHAR(255),
  opening_hours JSONB, -- flexible hours format
  services TEXT[], -- array of services
  pricing JSONB, -- pricing information: bar_fine, lady_drink, room
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by UUID REFERENCES users(id),
  -- Grid system for zone layouts (variable grid sizes per zone)
  zone VARCHAR(50), -- 'soi6', 'walkingstreet', 'lkmetro', 'beachroad', 'soibuakhao', etc.
  grid_row INTEGER CHECK (grid_row IS NULL OR (grid_row >= 1 AND grid_row <= 2)),
  grid_col INTEGER CHECK (grid_col IS NULL OR (grid_col >= 1 AND grid_col <= 20)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees (women and transexuals working in establishments)
CREATE TABLE employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  age INTEGER,
  nationality VARCHAR(100),
  description TEXT,
  photos TEXT[], -- array of photo URLs (max 5)
  social_media JSONB, -- flexible social media links
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  self_removal_requested BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employment history (linking employees to establishments with dates)
CREATE TABLE employment_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  position VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means currently working there
  is_current BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments on employee profiles
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  parent_comment_id UUID REFERENCES comments(id), -- for replies
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports for inappropriate content
CREATE TABLE reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id),
  reason VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Moderation queue for pending approvals
CREATE TABLE moderation_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('employee', 'establishment', 'comment')),
  item_id UUID NOT NULL,
  submitted_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderator_id UUID REFERENCES users(id),
  moderator_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 🔒 CRITICAL: Unique constraint to prevent multiple ratings from same user
-- This prevents the "multiple voting" bug at database level
CREATE UNIQUE INDEX unique_user_employee_rating
ON comments (user_id, employee_id)
WHERE rating IS NOT NULL AND parent_comment_id IS NULL;

-- Indexes for performance
CREATE INDEX idx_establishments_location ON establishments USING GIST (location);
CREATE INDEX idx_establishments_category ON establishments (category_id);
CREATE INDEX idx_establishments_zone_grid ON establishments (zone, grid_row, grid_col);
CREATE INDEX idx_employees_status ON employees (status);
CREATE INDEX idx_employment_current ON employment_history (employee_id, is_current);
CREATE INDEX idx_comments_employee ON comments (employee_id);
CREATE INDEX idx_comments_rating ON comments (rating);
CREATE INDEX idx_moderation_status ON moderation_queue (status, item_type);

-- 🚀 PHASE 2: Additional critical indexes for performance optimization
-- Optimize dashboard stats queries (most frequent admin operations)
CREATE INDEX idx_establishments_status ON establishments (status);
CREATE INDEX idx_comments_status ON comments (status);
CREATE INDEX idx_reports_status ON reports (status);
CREATE INDEX idx_users_role ON users (role);

-- Optimize admin listings with pagination and filtering
CREATE INDEX idx_establishments_created_at ON establishments (created_at DESC);
CREATE INDEX idx_employees_created_at ON employees (created_at DESC);
CREATE INDEX idx_comments_created_at ON comments (created_at DESC);
CREATE INDEX idx_users_created_at ON users (created_at DESC);

-- Optimize moderation queue operations
CREATE INDEX idx_moderation_item_type_status ON moderation_queue (item_type, status);
CREATE INDEX idx_moderation_created_at ON moderation_queue (created_at DESC);

-- Optimize user statistics queries (for admin user management)
CREATE INDEX idx_establishments_created_by ON establishments (created_by);
CREATE INDEX idx_employees_created_by ON employees (created_by);
CREATE INDEX idx_comments_user_id ON comments (user_id);

-- Composite indexes for common filter combinations
CREATE INDEX idx_establishments_status_category ON establishments (status, category_id);
CREATE INDEX idx_employees_status_created_at ON employees (status, created_at DESC);
CREATE INDEX idx_comments_status_employee ON comments (status, employee_id);

-- Optimize reports and moderation foreign key queries
CREATE INDEX idx_reports_comment_id ON reports (comment_id);
CREATE INDEX idx_reports_reported_by ON reports (reported_by);
CREATE INDEX idx_employment_establishment_current ON employment_history (establishment_id, is_current);

-- Insert default establishment categories
INSERT INTO establishment_categories (name, icon, color) VALUES
('Bar', '🍺', '#ff6b35'),
('GoGo Bar', '👯‍♀️', '#ff006e'),
('Massage Salon', '🧖‍♀️', '#06ffa5'),
('Nightclub', '🎵', '#7b2cbf');

-- ========================================
-- PERFORMANCE OPTIMIZATIONS (Phase 2)
-- ========================================

-- 🚀 Optimized dashboard stats function (single CTE query instead of 8 sequential queries)
-- Expected gain: 2.5s → 0.2s (-90% response time)
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_establishments BIGINT,
  pending_establishments BIGINT,
  total_employees BIGINT,
  pending_employees BIGINT,
  total_users BIGINT,
  total_comments BIGINT,
  pending_comments BIGINT,
  reported_comments BIGINT
)
LANGUAGE SQL
AS $$
  WITH dashboard_stats AS (
    SELECT
      (SELECT COUNT(*) FROM establishments) as total_establishments,
      (SELECT COUNT(*) FROM establishments WHERE status = 'pending') as pending_establishments,
      (SELECT COUNT(*) FROM employees) as total_employees,
      (SELECT COUNT(*) FROM employees WHERE status = 'pending') as pending_employees,
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM comments) as total_comments,
      (SELECT COUNT(*) FROM comments WHERE status = 'pending') as pending_comments,
      (SELECT COUNT(*) FROM reports WHERE status = 'pending') as reported_comments
  )
  SELECT * FROM dashboard_stats;
$$;