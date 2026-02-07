-- =====================================================
-- Migration 027: Enable RLS on all remaining public tables
-- Date: 2026-02-07
-- Description: Defense in depth - blocks direct PostgREST/anon access
-- Note: Backend uses SUPABASE_SERVICE_KEY which bypasses all RLS
-- Note: spatial_ref_sys skipped (PostGIS system table, not owned by us)
-- =====================================================
BEGIN;

-- =====================================================
-- 1. ENABLE RLS ON ALL FLAGGED TABLES
-- (ENABLE is idempotent - safe to run on already-enabled tables)
-- =====================================================

-- Sensitive tables (user data, financial, verification)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_ownership_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_vip_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_vip_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_verifications ENABLE ROW LEVEL SECURITY;

-- User-owned data
ALTER TABLE public.comment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_photo_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_existence_votes ENABLE ROW LEVEL SECURITY;

-- Moderation / admin tables
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edit_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.independent_positions ENABLE ROW LEVEL SECURITY;

-- Reference / public-read data
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumable_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishment_consumables ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. PUBLIC READ POLICIES (reference/public data)
-- These tables contain non-sensitive data that should
-- be readable by anyone (anon or authenticated)
-- =====================================================

DO $$ BEGIN
  CREATE POLICY "badges_read_public" ON public.badges FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "missions_read_public" ON public.missions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "establishment_categories_read_public" ON public.establishment_categories FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "consumable_templates_read_public" ON public.consumable_templates FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "establishment_consumables_read_public" ON public.establishment_consumables FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "user_badges_read_public" ON public.user_badges FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 3. AUTHENTICATED-ONLY READ POLICIES
-- Data readable by logged-in users but not anon
-- =====================================================

DO $$ BEGIN
  CREATE POLICY "user_points_read_authenticated" ON public.user_points FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "check_ins_read_authenticated" ON public.check_ins FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "user_followers_read_authenticated" ON public.user_followers FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "review_votes_read_authenticated" ON public.review_votes FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "comment_photos_read_authenticated" ON public.comment_photos FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "employment_history_read_authenticated" ON public.employment_history FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "independent_positions_read_authenticated" ON public.independent_positions FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "employee_existence_votes_read_authenticated" ON public.employee_existence_votes FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- profile_views: users can see views they made (columns: user_id, employee_id)
DO $$ BEGIN
  CREATE POLICY "profile_views_read_own" ON public.profile_views FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "xp_transactions_read_own" ON public.xp_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "user_photo_uploads_read_own" ON public.user_photo_uploads FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 4. ADMIN/SENSITIVE TABLE POLICIES
-- =====================================================

-- push_subscriptions: already has policies, just needed ENABLE (done above)

-- establishment_ownership_requests: admin only (contains verification_code)
DO $$ BEGIN
  CREATE POLICY "ownership_requests_admin_read" ON public.establishment_ownership_requests FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- establishment_owners: authenticated read (public info about who owns what)
DO $$ BEGIN
  CREATE POLICY "establishment_owners_read_authenticated" ON public.establishment_owners FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- reports: users can see their own reports (column: reported_by)
DO $$ BEGIN
  CREATE POLICY "reports_read_own" ON public.reports FOR SELECT TO authenticated USING (reported_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- moderation_queue: admin/moderator only
DO $$ BEGIN
  CREATE POLICY "moderation_queue_admin_read" ON public.moderation_queue FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- edit_proposals: users can see their own (column: proposed_by)
DO $$ BEGIN
  CREATE POLICY "edit_proposals_read_own" ON public.edit_proposals FOR SELECT TO authenticated USING (proposed_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "edit_proposals_admin_read" ON public.edit_proposals FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- vip_payment_transactions: no direct access (service_role only)
-- employee_vip_subscriptions: no direct access (service_role only)
-- establishment_vip_subscriptions: no direct access (service_role only)
-- employee_verifications: no direct access (service_role only)

COMMIT;
