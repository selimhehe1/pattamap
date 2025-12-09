-- =====================================================
-- PattaMap Production Database Schema Initialization
-- Generated: 2025-01-09
-- Target: Supabase PROD (iwqabjlfrqaostkobejo)
-- =====================================================
-- Instructions:
-- 1. Open Supabase Dashboard for PROD project
-- 2. Go to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run"
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- Required for EXCLUDE constraints

-- =====================================================
-- 1. CORE TABLES (no dependencies)
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  pseudonym character varying(50) NOT NULL UNIQUE,
  email character varying(255) NOT NULL UNIQUE,
  password character varying(255) NOT NULL,
  role character varying(20) DEFAULT 'user'::character varying CHECK (role::text = ANY (ARRAY['user'::character varying, 'moderator'::character varying, 'admin'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  account_type character varying(30) DEFAULT 'regular'::character varying CHECK (account_type::text = ANY (ARRAY['regular'::character varying, 'employee'::character varying, 'establishment_owner'::character varying]::text[])),
  linked_employee_id uuid,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Establishment categories
CREATE TABLE IF NOT EXISTS public.establishment_categories (
  id SERIAL PRIMARY KEY,
  name character varying(50) NOT NULL,
  icon character varying(50) NOT NULL,
  color character varying(7) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL UNIQUE,
  description text NOT NULL,
  icon_url character varying(500),
  category character varying(50) NOT NULL CHECK (category::text = ANY (ARRAY['exploration'::character varying, 'contribution'::character varying, 'social'::character varying, 'quality'::character varying, 'temporal'::character varying, 'secret'::character varying]::text[])),
  rarity character varying(20) DEFAULT 'common'::character varying CHECK (rarity::text = ANY (ARRAY['common'::character varying, 'rare'::character varying, 'epic'::character varying, 'legendary'::character varying]::text[])),
  requirement_type character varying(50) NOT NULL,
  requirement_value integer NOT NULL,
  requirement_metadata jsonb,
  is_active boolean DEFAULT true,
  is_hidden boolean DEFAULT false,
  sort_order integer DEFAULT 999,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT badges_pkey PRIMARY KEY (id)
);

-- Consumable templates
CREATE TABLE IF NOT EXISTS public.consumable_templates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL,
  category character varying(50) NOT NULL CHECK (category::text = ANY (ARRAY['beer'::character varying, 'shot'::character varying, 'cocktail'::character varying, 'spirit'::character varying, 'wine'::character varying, 'soft'::character varying, 'service'::character varying]::text[])),
  icon character varying(50) NOT NULL,
  default_price integer,
  status character varying(20) DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying]::text[])),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT consumable_templates_pkey PRIMARY KEY (id)
);

-- =====================================================
-- 2. ESTABLISHMENTS (depends on categories, users)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.establishments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(255) NOT NULL,
  address text NOT NULL,
  location geography(Point, 4326),
  category_id integer,
  description text,
  phone character varying(20),
  website character varying(255),
  opening_hours jsonb,
  status character varying(20) DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  grid_row integer,
  grid_col integer,
  zone character varying(50),
  ladydrink character varying(50) DEFAULT '130'::character varying,
  barfine character varying(50) DEFAULT '400'::character varying,
  rooms character varying(50) DEFAULT 'N/A'::character varying,
  logo_url character varying(500),
  instagram character varying(255) CHECK (instagram IS NULL OR instagram::text ~ '^https?://'::text),
  twitter character varying(255) CHECK (twitter IS NULL OR twitter::text ~ '^https?://'::text),
  tiktok character varying(255) CHECK (tiktok IS NULL OR tiktok::text ~ '^https?://'::text),
  is_vip boolean DEFAULT false,
  vip_expires_at timestamp with time zone,
  rejection_reason text,
  CONSTRAINT establishments_pkey PRIMARY KEY (id),
  CONSTRAINT establishments_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.establishment_categories(id),
  CONSTRAINT establishments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- =====================================================
-- 3. EMPLOYEES (depends on users)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(255) NOT NULL,
  nickname character varying(100),
  age integer,
  description text,
  photos text[],
  social_media jsonb,
  status character varying(20) DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  self_removal_requested boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  is_self_profile boolean DEFAULT false,
  is_freelance boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  verified_at timestamp with time zone,
  is_vip boolean DEFAULT false,
  vip_expires_at timestamp with time zone,
  rejection_reason text,
  is_hidden boolean DEFAULT false,
  hidden_by uuid,
  hidden_at timestamp with time zone,
  hide_reason text,
  nationality text[] CHECK (nationality IS NULL OR array_length(nationality, 1) IS NULL OR array_length(nationality, 1) <= 2),
  CONSTRAINT employees_pkey PRIMARY KEY (id),
  CONSTRAINT employees_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT employees_hidden_by_fkey FOREIGN KEY (hidden_by) REFERENCES public.users(id)
);

-- Add linked_employee_id FK to users (circular reference)
ALTER TABLE public.users
ADD CONSTRAINT users_linked_employee_id_fkey
FOREIGN KEY (linked_employee_id) REFERENCES public.employees(id);

-- =====================================================
-- 4. EMPLOYMENT & RELATIONS
-- =====================================================

-- Employment history
CREATE TABLE IF NOT EXISTS public.employment_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  employee_id uuid,
  establishment_id uuid,
  position character varying(100),
  start_date date NOT NULL,
  end_date date,
  is_current boolean DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employment_history_pkey PRIMARY KEY (id),
  CONSTRAINT employment_history_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT employment_history_establishment_id_fkey FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE CASCADE,
  CONSTRAINT employment_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Independent positions (freelance on map)
CREATE TABLE IF NOT EXISTS public.independent_positions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  employee_id uuid,
  zone character varying(50) NOT NULL,
  grid_row integer NOT NULL CHECK (grid_row >= 1 AND grid_row <= 2),
  grid_col integer NOT NULL CHECK (grid_col >= 1 AND grid_col <= 40),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT independent_positions_pkey PRIMARY KEY (id),
  CONSTRAINT independent_positions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT independent_positions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Establishment consumables
CREATE TABLE IF NOT EXISTS public.establishment_consumables (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  establishment_id uuid,
  consumable_id uuid,
  price character varying(50) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT establishment_consumables_pkey PRIMARY KEY (id),
  CONSTRAINT establishment_consumables_establishment_id_fkey FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE CASCADE,
  CONSTRAINT establishment_consumables_consumable_id_fkey FOREIGN KEY (consumable_id) REFERENCES public.consumable_templates(id)
);

-- =====================================================
-- 5. COMMENTS & RATINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  employee_id uuid,
  user_id uuid,
  content text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  parent_comment_id uuid,
  status character varying(20) DEFAULT 'approved'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id)
);

-- Unique constraint for ratings (prevent multiple ratings from same user)
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_employee_rating
ON public.comments (user_id, employee_id)
WHERE rating IS NOT NULL AND parent_comment_id IS NULL;

-- Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  comment_id uuid,
  reported_by uuid,
  reason character varying(255) NOT NULL,
  description text,
  status character varying(20) DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'reviewed'::character varying, 'resolved'::character varying]::text[])),
  reviewed_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE,
  CONSTRAINT reports_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.users(id),
  CONSTRAINT reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);

-- Review votes
CREATE TABLE IF NOT EXISTS public.review_votes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  review_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote_type character varying(20) DEFAULT 'helpful'::character varying CHECK (vote_type::text = ANY (ARRAY['helpful'::character varying, 'not_helpful'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT review_votes_pkey PRIMARY KEY (id),
  CONSTRAINT review_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT review_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.comments(id) ON DELETE CASCADE,
  CONSTRAINT unique_review_vote UNIQUE (review_id, user_id)
);

-- =====================================================
-- 6. MODERATION
-- =====================================================

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  item_type character varying(20) NOT NULL CHECK (item_type::text = ANY (ARRAY['employee'::character varying, 'establishment'::character varying, 'comment'::character varying, 'employee_claim'::character varying]::text[])),
  item_id uuid NOT NULL,
  submitted_by uuid,
  status character varying(20) DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  moderator_id uuid,
  moderator_notes text,
  created_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  request_metadata jsonb,
  verification_proof text[],
  CONSTRAINT moderation_queue_pkey PRIMARY KEY (id),
  CONSTRAINT moderation_queue_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id),
  CONSTRAINT moderation_queue_moderator_id_fkey FOREIGN KEY (moderator_id) REFERENCES public.users(id)
);

-- Edit proposals
CREATE TABLE IF NOT EXISTS public.edit_proposals (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  item_type character varying(20) NOT NULL CHECK (item_type::text = ANY (ARRAY['employee'::character varying, 'establishment'::character varying]::text[])),
  item_id uuid NOT NULL,
  proposed_changes jsonb NOT NULL,
  current_values jsonb,
  proposed_by uuid,
  status character varying(20) DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  moderator_id uuid,
  moderator_notes text,
  created_at timestamp with time zone DEFAULT now(),
  reviewed_at timestamp with time zone,
  CONSTRAINT edit_proposals_pkey PRIMARY KEY (id),
  CONSTRAINT edit_proposals_proposed_by_fkey FOREIGN KEY (proposed_by) REFERENCES public.users(id),
  CONSTRAINT edit_proposals_moderator_id_fkey FOREIGN KEY (moderator_id) REFERENCES public.users(id)
);

-- =====================================================
-- 7. OWNERSHIP SYSTEM
-- =====================================================

-- Establishment owners
CREATE TABLE IF NOT EXISTS public.establishment_owners (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  establishment_id uuid NOT NULL,
  owner_role character varying(20) DEFAULT 'owner'::character varying CHECK (owner_role::text = ANY (ARRAY['owner'::character varying, 'manager'::character varying]::text[])),
  permissions jsonb DEFAULT '{"can_edit_info": true, "can_edit_photos": true, "can_edit_pricing": true, "can_edit_employees": false, "can_view_analytics": true}'::jsonb,
  assigned_by uuid,
  assigned_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT establishment_owners_pkey PRIMARY KEY (id),
  CONSTRAINT establishment_owners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT establishment_owners_establishment_id_fkey FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE CASCADE,
  CONSTRAINT establishment_owners_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id),
  CONSTRAINT unique_user_establishment UNIQUE (user_id, establishment_id)
);

-- Ownership requests
CREATE TABLE IF NOT EXISTS public.establishment_ownership_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  establishment_id uuid NOT NULL,
  status character varying(20) DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  documents_urls jsonb DEFAULT '[]'::jsonb,
  verification_code character varying(50),
  request_message text,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT establishment_ownership_requests_pkey PRIMARY KEY (id),
  CONSTRAINT establishment_ownership_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id),
  CONSTRAINT establishment_ownership_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT establishment_ownership_requests_establishment_id_fkey FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE CASCADE
);

-- =====================================================
-- 8. NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  type character varying(50) NOT NULL CHECK (type::text = ANY (ARRAY[
    'ownership_request_submitted', 'ownership_request_approved', 'ownership_request_rejected', 'new_ownership_request',
    'employee_approved', 'employee_rejected', 'establishment_approved', 'establishment_rejected',
    'comment_approved', 'comment_rejected', 'comment_reply', 'comment_mention', 'comment_removed',
    'new_favorite', 'favorite_available',
    'employee_profile_updated', 'employee_photos_updated', 'employee_position_changed',
    'new_content_pending', 'new_report', 'moderation_action_required',
    'verification_submitted', 'verification_approved', 'verification_rejected', 'verification_revoked',
    'vip_purchase_confirmed', 'vip_payment_verified', 'vip_payment_rejected', 'vip_subscription_cancelled',
    'edit_proposal_submitted', 'edit_proposal_approved', 'edit_proposal_rejected',
    'establishment_owner_assigned', 'establishment_owner_removed', 'establishment_owner_permissions_updated',
    'system', 'other'
  ]::text[])),
  title character varying(200) NOT NULL,
  message text NOT NULL,
  link character varying(500),
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  related_entity_type character varying(50),
  related_entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- =====================================================
-- 9. GAMIFICATION SYSTEM
-- =====================================================

-- User points
CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  total_xp integer DEFAULT 0 CHECK (total_xp >= 0),
  current_level integer DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 7),
  monthly_xp integer DEFAULT 0 CHECK (monthly_xp >= 0),
  last_monthly_reset timestamp with time zone DEFAULT date_trunc('month'::text, now()),
  current_streak_days integer DEFAULT 0 CHECK (current_streak_days >= 0),
  longest_streak_days integer DEFAULT 0 CHECK (longest_streak_days >= 0),
  last_activity_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_points_pkey PRIMARY KEY (id),
  CONSTRAINT user_points_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- User badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL,
  earned_at timestamp with time zone DEFAULT now(),
  progress integer,
  CONSTRAINT user_badges_pkey PRIMARY KEY (id),
  CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_badges_badge_id_fkey FOREIGN KEY (badge_id) REFERENCES public.badges(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

-- Missions
CREATE TABLE IF NOT EXISTS public.missions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(150) NOT NULL,
  description text NOT NULL,
  type character varying(20) NOT NULL CHECK (type::text = ANY (ARRAY['daily'::character varying, 'weekly'::character varying, 'event'::character varying, 'narrative'::character varying]::text[])),
  xp_reward integer NOT NULL CHECK (xp_reward >= 0),
  badge_reward uuid,
  reset_frequency character varying(20),
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  requirements jsonb NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 999,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT missions_pkey PRIMARY KEY (id),
  CONSTRAINT missions_badge_reward_fkey FOREIGN KEY (badge_reward) REFERENCES public.badges(id)
);

-- User mission progress
CREATE TABLE IF NOT EXISTS public.user_mission_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  mission_id uuid NOT NULL,
  progress integer DEFAULT 0 CHECK (progress >= 0),
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  reset_count integer DEFAULT 0,
  last_reset_at timestamp with time zone,
  started_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_mission_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_mission_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_mission_progress_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_mission UNIQUE (user_id, mission_id)
);

-- XP transactions
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  xp_amount integer NOT NULL,
  reason character varying(100) NOT NULL,
  related_entity_type character varying(50),
  related_entity_id uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT xp_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT xp_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Check-ins
CREATE TABLE IF NOT EXISTS public.check_ins (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  establishment_id uuid NOT NULL,
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  verified boolean DEFAULT false,
  distance_meters numeric(10, 2),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT check_ins_pkey PRIMARY KEY (id),
  CONSTRAINT check_ins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT check_ins_establishment_id_fkey FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE CASCADE
);

-- User followers
CREATE TABLE IF NOT EXISTS public.user_followers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_followers_pkey PRIMARY KEY (id),
  CONSTRAINT user_followers_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_followers_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT unique_follower_following UNIQUE (follower_id, following_id)
);

-- User favorites
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_favorites_pkey PRIMARY KEY (id),
  CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_favorites_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_favorite UNIQUE (user_id, employee_id)
);

-- =====================================================
-- 10. VIP SUBSCRIPTIONS
-- =====================================================

-- VIP payment transactions (must be created first due to FK)
CREATE TABLE IF NOT EXISTS public.vip_payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subscription_type text NOT NULL CHECK (subscription_type = ANY (ARRAY['employee'::text, 'establishment'::text])),
  subscription_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'THB'::text,
  payment_method text NOT NULL CHECK (payment_method = ANY (ARRAY['promptpay'::text, 'cash'::text, 'admin_grant'::text])),
  payment_status text NOT NULL CHECK (payment_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])),
  promptpay_qr_code text,
  promptpay_reference text,
  admin_verified_by uuid,
  admin_verified_at timestamp with time zone,
  admin_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vip_payment_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT vip_payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT vip_payment_transactions_admin_verified_by_fkey FOREIGN KEY (admin_verified_by) REFERENCES public.users(id)
);

-- Employee VIP subscriptions
CREATE TABLE IF NOT EXISTS public.employee_vip_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'pending_payment'::text])),
  tier text NOT NULL CHECK (tier = 'employee'::text),
  duration integer NOT NULL CHECK (duration = ANY (ARRAY[7, 30, 90, 365])),
  starts_at timestamp with time zone NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  cancelled_at timestamp with time zone,
  payment_method text CHECK (payment_method = ANY (ARRAY['promptpay'::text, 'cash'::text, 'admin_grant'::text])),
  payment_status text CHECK (payment_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])),
  price_paid numeric(10, 2),
  transaction_id uuid,
  admin_verified_by uuid,
  admin_verified_at timestamp with time zone,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employee_vip_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT employee_vip_subscriptions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT employee_vip_subscriptions_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.vip_payment_transactions(id),
  CONSTRAINT employee_vip_subscriptions_admin_verified_by_fkey FOREIGN KEY (admin_verified_by) REFERENCES public.users(id)
);

-- Establishment VIP subscriptions
CREATE TABLE IF NOT EXISTS public.establishment_vip_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'pending_payment'::text])),
  tier text NOT NULL CHECK (tier = 'establishment'::text),
  duration integer NOT NULL CHECK (duration = ANY (ARRAY[7, 30, 90, 365])),
  starts_at timestamp with time zone NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  cancelled_at timestamp with time zone,
  payment_method text CHECK (payment_method = ANY (ARRAY['promptpay'::text, 'cash'::text, 'admin_grant'::text])),
  payment_status text CHECK (payment_status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])),
  price_paid numeric(10, 2),
  transaction_id uuid,
  admin_verified_by uuid,
  admin_verified_at timestamp with time zone,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT establishment_vip_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT establishment_vip_subscriptions_establishment_id_fkey FOREIGN KEY (establishment_id) REFERENCES public.establishments(id) ON DELETE CASCADE,
  CONSTRAINT establishment_vip_subscriptions_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.vip_payment_transactions(id),
  CONSTRAINT establishment_vip_subscriptions_admin_verified_by_fkey FOREIGN KEY (admin_verified_by) REFERENCES public.users(id)
);

-- =====================================================
-- 11. EMPLOYEE VERIFICATION
-- =====================================================

CREATE TABLE IF NOT EXISTS public.employee_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  selfie_url text NOT NULL,
  face_match_score numeric CHECK (face_match_score IS NULL OR face_match_score >= 0::numeric AND face_match_score <= 100::numeric),
  status text NOT NULL CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'manual_review'::text, 'revoked'::text])),
  auto_approved boolean DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  admin_notes text,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employee_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT employee_verifications_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT employee_verifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id)
);

-- Employee existence votes
CREATE TABLE IF NOT EXISTS public.employee_existence_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote_type character varying(20) NOT NULL CHECK (vote_type::text = ANY (ARRAY['exists'::character varying, 'not_exists'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT employee_existence_votes_pkey PRIMARY KEY (id),
  CONSTRAINT employee_existence_votes_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT employee_existence_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_employee_existence_vote UNIQUE (employee_id, user_id)
);

-- =====================================================
-- 12. PROFILE VIEWS & ANALYTICS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  user_id uuid,
  viewer_ip character varying(45),
  viewed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profile_views_pkey PRIMARY KEY (id),
  CONSTRAINT profile_views_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE,
  CONSTRAINT profile_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- User photo uploads
CREATE TABLE IF NOT EXISTS public.user_photo_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type = ANY (ARRAY['employee'::text, 'review'::text, 'establishment'::text])),
  entity_id uuid,
  width integer,
  height integer,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_photo_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT user_photo_uploads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- =====================================================
-- 13. INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON public.users(account_type);

-- Establishments indexes
CREATE INDEX IF NOT EXISTS idx_establishments_location ON public.establishments USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_establishments_category ON public.establishments(category_id);
CREATE INDEX IF NOT EXISTS idx_establishments_zone_grid ON public.establishments(zone, grid_row, grid_col);
CREATE INDEX IF NOT EXISTS idx_establishments_status ON public.establishments(status);
CREATE INDEX IF NOT EXISTS idx_establishments_created_at ON public.establishments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_establishments_created_by ON public.establishments(created_by);
CREATE INDEX IF NOT EXISTS idx_establishments_status_category ON public.establishments(status, category_id);

-- Employees indexes
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON public.employees(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_created_by ON public.employees(created_by);
CREATE INDEX IF NOT EXISTS idx_employees_status_created_at ON public.employees(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_freelance ON public.employees(is_freelance) WHERE is_freelance = TRUE;
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);

-- Employment indexes
CREATE INDEX IF NOT EXISTS idx_employment_current ON public.employment_history(employee_id, is_current);
CREATE INDEX IF NOT EXISTS idx_employment_establishment_current ON public.employment_history(establishment_id, is_current);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_employee ON public.comments(employee_id);
CREATE INDEX IF NOT EXISTS idx_comments_rating ON public.comments(rating);
CREATE INDEX IF NOT EXISTS idx_comments_status ON public.comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_status_employee ON public.comments(status, employee_id);

-- Moderation indexes
CREATE INDEX IF NOT EXISTS idx_moderation_status ON public.moderation_queue(status, item_type);
CREATE INDEX IF NOT EXISTS idx_moderation_item_type_status ON public.moderation_queue(item_type, status);
CREATE INDEX IF NOT EXISTS idx_moderation_created_at ON public.moderation_queue(created_at DESC);

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_comment_id ON public.reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_by ON public.reports(reported_by);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Gamification indexes
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_total_xp ON public.user_points(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_points_monthly_xp ON public.user_points(monthly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_points_level ON public.user_points(current_level);
CREATE INDEX IF NOT EXISTS idx_badges_category ON public.badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_rarity ON public.badges(rarity);
CREATE INDEX IF NOT EXISTS idx_badges_active ON public.badges(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON public.user_badges(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_missions_type ON public.missions(type);
CREATE INDEX IF NOT EXISTS idx_missions_active ON public.missions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_mission_progress_user_id ON public.user_mission_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mission_progress_mission_id ON public.user_mission_progress(mission_id);
CREATE INDEX IF NOT EXISTS idx_user_mission_progress_completed ON public.user_mission_progress(completed);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON public.xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON public.xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_reason ON public.xp_transactions(reason);
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON public.check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_establishment_id ON public.check_ins(establishment_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_created_at ON public.check_ins(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_ins_verified ON public.check_ins(verified) WHERE verified = true;

-- VIP indexes
CREATE INDEX IF NOT EXISTS idx_employee_vip_employee_id ON public.employee_vip_subscriptions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_vip_status ON public.employee_vip_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_employee_vip_expires_at ON public.employee_vip_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_establishment_vip_establishment_id ON public.establishment_vip_subscriptions(establishment_id);
CREATE INDEX IF NOT EXISTS idx_establishment_vip_status ON public.establishment_vip_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_establishment_vip_expires_at ON public.establishment_vip_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_vip_transactions_user_id ON public.vip_payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_transactions_payment_status ON public.vip_payment_transactions(payment_status);

-- Ownership indexes
CREATE INDEX IF NOT EXISTS idx_establishment_owners_user_id ON public.establishment_owners(user_id);
CREATE INDEX IF NOT EXISTS idx_establishment_owners_establishment_id ON public.establishment_owners(establishment_id);
CREATE INDEX IF NOT EXISTS idx_ownership_requests_user_id ON public.establishment_ownership_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ownership_requests_establishment_id ON public.establishment_ownership_requests(establishment_id);
CREATE INDEX IF NOT EXISTS idx_ownership_requests_status ON public.establishment_ownership_requests(status);

-- Profile views indexes
CREATE INDEX IF NOT EXISTS idx_profile_views_employee_id ON public.profile_views(employee_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_at ON public.profile_views(viewed_at DESC);

-- Independent positions indexes
CREATE INDEX IF NOT EXISTS idx_independent_positions_employee_id ON public.independent_positions(employee_id);
CREATE INDEX IF NOT EXISTS idx_independent_positions_zone ON public.independent_positions(zone);
CREATE INDEX IF NOT EXISTS idx_independent_positions_active ON public.independent_positions(is_active) WHERE is_active = true;

-- =====================================================
-- 14. DEFAULT DATA
-- =====================================================

-- Insert default establishment categories
INSERT INTO public.establishment_categories (name, icon, color) VALUES
('Bar', '🍺', '#ff6b35'),
('GoGo Bar', '👯‍♀️', '#ff006e'),
('Massage Salon', '🧖‍♀️', '#06ffa5'),
('Nightclub', '🎵', '#7b2cbf')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 15. HELPER FUNCTIONS
-- =====================================================

-- Dashboard stats function
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
  SELECT
    (SELECT COUNT(*) FROM establishments) as total_establishments,
    (SELECT COUNT(*) FROM establishments WHERE status = 'pending') as pending_establishments,
    (SELECT COUNT(*) FROM employees) as total_employees,
    (SELECT COUNT(*) FROM employees WHERE status = 'pending') as pending_employees,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM comments) as total_comments,
    (SELECT COUNT(*) FROM comments WHERE status = 'pending') as pending_comments,
    (SELECT COUNT(*) FROM reports WHERE status = 'pending') as reported_comments;
$$;

-- Award XP function
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_xp_amount INTEGER,
  p_reason VARCHAR(100),
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_new_total_xp INTEGER;
  v_new_level INTEGER;
BEGIN
  INSERT INTO xp_transactions (user_id, xp_amount, reason, related_entity_type, related_entity_id)
  VALUES (p_user_id, p_xp_amount, p_reason, p_entity_type, p_entity_id);

  INSERT INTO user_points (user_id, total_xp, monthly_xp)
  VALUES (p_user_id, p_xp_amount, p_xp_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET
    total_xp = user_points.total_xp + p_xp_amount,
    monthly_xp = user_points.monthly_xp + p_xp_amount,
    last_activity_date = CURRENT_DATE;

  SELECT total_xp INTO v_new_total_xp
  FROM user_points
  WHERE user_id = p_user_id;

  v_new_level := CASE
    WHEN v_new_total_xp >= 6000 THEN 7
    WHEN v_new_total_xp >= 3000 THEN 6
    WHEN v_new_total_xp >= 1500 THEN 5
    WHEN v_new_total_xp >= 700 THEN 4
    WHEN v_new_total_xp >= 300 THEN 3
    WHEN v_new_total_xp >= 100 THEN 2
    ELSE 1
  END;

  UPDATE user_points
  SET current_level = v_new_level
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
  AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Check if employee has active VIP
CREATE OR REPLACE FUNCTION is_employee_vip(employee_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM employee_vip_subscriptions
    WHERE employee_id = employee_id_param
      AND status = 'active'
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if establishment has active VIP
CREATE OR REPLACE FUNCTION is_establishment_vip(establishment_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM establishment_vip_subscriptions
    WHERE establishment_id = establishment_id_param
      AND status = 'active'
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- SCHEMA INITIALIZATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Verify all tables created: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- 2. Create your admin user
-- 3. Configure RLS policies if needed
-- =====================================================
