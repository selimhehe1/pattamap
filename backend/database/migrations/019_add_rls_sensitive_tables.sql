-- =====================================================
-- v10.3 Phase 1 - RLS on Sensitive Tables
-- Migration: Add Row Level Security to core tables
-- Date: 2025-12-28
-- Description: Defense in depth - protects against direct DB access
-- Note: Backend uses service key which bypasses RLS
-- =====================================================
BEGIN;

-- =====================================================
-- 1. USERS TABLE RLS
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_read_own"
  ON public.users FOR SELECT
  USING (id = auth.uid());

-- Admins can read all users
CREATE POLICY "users_admin_read_all"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Moderators can read all users
CREATE POLICY "users_moderator_read_all"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'moderator'
    )
  );

-- Users can update their own profile (except role/is_active)
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Only admins can insert users (registration goes through backend)
CREATE POLICY "users_admin_insert"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- =====================================================
-- 2. EMPLOYEES TABLE RLS
-- =====================================================
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved employees (public profiles)
CREATE POLICY "employees_read_approved"
  ON public.employees FOR SELECT
  USING (status = 'approved' AND is_hidden = false);

-- Users can view their own employee profile
CREATE POLICY "employees_read_own"
  ON public.employees FOR SELECT
  USING (user_id = auth.uid() OR created_by = auth.uid());

-- Admins/moderators can view all employees
CREATE POLICY "employees_admin_read_all"
  ON public.employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
    )
  );

-- Users can update their own employee profile
CREATE POLICY "employees_update_own"
  ON public.employees FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update any employee
CREATE POLICY "employees_admin_update"
  ON public.employees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
    )
  );

-- Users can create employee profiles
CREATE POLICY "employees_insert"
  ON public.employees FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- =====================================================
-- 3. COMMENTS TABLE RLS
-- =====================================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved comments
CREATE POLICY "comments_read_approved"
  ON public.comments FOR SELECT
  USING (status = 'approved');

-- Users can view their own comments (any status)
CREATE POLICY "comments_read_own"
  ON public.comments FOR SELECT
  USING (user_id = auth.uid());

-- Admins/moderators can view all comments
CREATE POLICY "comments_admin_read_all"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
    )
  );

-- Users can insert their own comments
CREATE POLICY "comments_insert_own"
  ON public.comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own comments
CREATE POLICY "comments_update_own"
  ON public.comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update any comment
CREATE POLICY "comments_admin_update"
  ON public.comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
    )
  );

-- Users can delete their own comments
CREATE POLICY "comments_delete_own"
  ON public.comments FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 4. FAVORITES TABLE RLS
-- =====================================================
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Users can only view their own favorites
CREATE POLICY "favorites_read_own"
  ON public.favorites FOR SELECT
  USING (user_id = auth.uid());

-- Users can add to their own favorites
CREATE POLICY "favorites_insert_own"
  ON public.favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can remove from their own favorites
CREATE POLICY "favorites_delete_own"
  ON public.favorites FOR DELETE
  USING (user_id = auth.uid());

-- Admins can view all favorites (analytics)
CREATE POLICY "favorites_admin_read_all"
  ON public.favorites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- =====================================================
-- 5. ESTABLISHMENTS TABLE RLS
-- =====================================================
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved establishments (public data)
CREATE POLICY "establishments_read_approved"
  ON public.establishments FOR SELECT
  USING (status = 'approved');

-- Users can view their own submissions
CREATE POLICY "establishments_read_own"
  ON public.establishments FOR SELECT
  USING (created_by = auth.uid());

-- Establishment owners can view their establishments
CREATE POLICY "establishments_owner_read"
  ON public.establishments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.establishment_owners eo
      WHERE eo.establishment_id = establishments.id
      AND eo.user_id = auth.uid()
      AND eo.status = 'approved'
    )
  );

-- Admins/moderators can view all establishments
CREATE POLICY "establishments_admin_read_all"
  ON public.establishments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
    )
  );

-- Users can create establishments
CREATE POLICY "establishments_insert"
  ON public.establishments FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Owners can update their establishments
CREATE POLICY "establishments_owner_update"
  ON public.establishments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.establishment_owners eo
      WHERE eo.establishment_id = establishments.id
      AND eo.user_id = auth.uid()
      AND eo.status = 'approved'
    )
  );

-- Admins can update any establishment
CREATE POLICY "establishments_admin_update"
  ON public.establishments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
    )
  );

-- =====================================================
-- 6. USER_BADGES TABLE RLS
-- =====================================================
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Anyone can view badges (public achievement display)
CREATE POLICY "user_badges_read_public"
  ON public.user_badges FOR SELECT
  USING (true);

-- Only system can insert badges (via backend service key)
-- No insert policy for regular users

-- =====================================================
-- 7. USER_MISSIONS TABLE RLS
-- =====================================================
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

-- Users can view their own missions
CREATE POLICY "user_missions_read_own"
  ON public.user_missions FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all missions
CREATE POLICY "user_missions_admin_read"
  ON public.user_missions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- =====================================================
-- 8. NOTIFICATIONS TABLE RLS
-- =====================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "notifications_read_own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- 9. EDIT_PROPOSALS TABLE RLS
-- =====================================================
ALTER TABLE public.edit_proposals ENABLE ROW LEVEL SECURITY;

-- Users can view their own proposals
CREATE POLICY "edit_proposals_read_own"
  ON public.edit_proposals FOR SELECT
  USING (user_id = auth.uid());

-- Admins/moderators can view all proposals
CREATE POLICY "edit_proposals_admin_read"
  ON public.edit_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
    )
  );

-- Users can create proposals
CREATE POLICY "edit_proposals_insert_own"
  ON public.edit_proposals FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can update proposals (approve/reject)
CREATE POLICY "edit_proposals_admin_update"
  ON public.edit_proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
    )
  );

-- =====================================================
-- DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "users_read_own" ON public.users IS 'Users can only read their own profile data';
COMMENT ON POLICY "employees_read_approved" ON public.employees IS 'Approved employee profiles are public';
COMMENT ON POLICY "comments_read_approved" ON public.comments IS 'Approved comments are public';
COMMENT ON POLICY "favorites_read_own" ON public.favorites IS 'Favorites are private to each user';
COMMENT ON POLICY "notifications_read_own" ON public.notifications IS 'Notifications are private to each user';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Note: Backend uses SUPABASE_SERVICE_KEY which bypasses all RLS
-- These policies protect against direct anon key access
-- =====================================================

COMMIT;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
/*
BEGIN;

-- Users
DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "users_admin_read_all" ON public.users;
DROP POLICY IF EXISTS "users_moderator_read_all" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_admin_insert" ON public.users;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Employees
DROP POLICY IF EXISTS "employees_read_approved" ON public.employees;
DROP POLICY IF EXISTS "employees_read_own" ON public.employees;
DROP POLICY IF EXISTS "employees_admin_read_all" ON public.employees;
DROP POLICY IF EXISTS "employees_update_own" ON public.employees;
DROP POLICY IF EXISTS "employees_admin_update" ON public.employees;
DROP POLICY IF EXISTS "employees_insert" ON public.employees;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;

-- Comments
DROP POLICY IF EXISTS "comments_read_approved" ON public.comments;
DROP POLICY IF EXISTS "comments_read_own" ON public.comments;
DROP POLICY IF EXISTS "comments_admin_read_all" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
DROP POLICY IF EXISTS "comments_update_own" ON public.comments;
DROP POLICY IF EXISTS "comments_admin_update" ON public.comments;
DROP POLICY IF EXISTS "comments_delete_own" ON public.comments;
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;

-- Favorites
DROP POLICY IF EXISTS "favorites_read_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_admin_read_all" ON public.favorites;
ALTER TABLE public.favorites DISABLE ROW LEVEL SECURITY;

-- Establishments
DROP POLICY IF EXISTS "establishments_read_approved" ON public.establishments;
DROP POLICY IF EXISTS "establishments_read_own" ON public.establishments;
DROP POLICY IF EXISTS "establishments_owner_read" ON public.establishments;
DROP POLICY IF EXISTS "establishments_admin_read_all" ON public.establishments;
DROP POLICY IF EXISTS "establishments_insert" ON public.establishments;
DROP POLICY IF EXISTS "establishments_owner_update" ON public.establishments;
DROP POLICY IF EXISTS "establishments_admin_update" ON public.establishments;
ALTER TABLE public.establishments DISABLE ROW LEVEL SECURITY;

-- User Badges
DROP POLICY IF EXISTS "user_badges_read_public" ON public.user_badges;
ALTER TABLE public.user_badges DISABLE ROW LEVEL SECURITY;

-- User Missions
DROP POLICY IF EXISTS "user_missions_read_own" ON public.user_missions;
DROP POLICY IF EXISTS "user_missions_admin_read" ON public.user_missions;
ALTER TABLE public.user_missions DISABLE ROW LEVEL SECURITY;

-- Notifications
DROP POLICY IF EXISTS "notifications_read_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Edit Proposals
DROP POLICY IF EXISTS "edit_proposals_read_own" ON public.edit_proposals;
DROP POLICY IF EXISTS "edit_proposals_admin_read" ON public.edit_proposals;
DROP POLICY IF EXISTS "edit_proposals_insert_own" ON public.edit_proposals;
DROP POLICY IF EXISTS "edit_proposals_admin_update" ON public.edit_proposals;
ALTER TABLE public.edit_proposals DISABLE ROW LEVEL SECURITY;

COMMIT;
*/
