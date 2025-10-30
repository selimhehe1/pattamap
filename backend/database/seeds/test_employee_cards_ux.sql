-- ================================================
-- TEST EMPLOYEE CARDS UX SEED DATA (v10.3)
-- ================================================
-- Purpose: Create diverse employees to test all card UI combinations
-- Usage: Execute this SQL in Supabase SQL Editor
-- Test Scenarios:
--   - Verified vs Non-verified
--   - Claim vs Non-claim
--   - VIP vs Non-VIP
--   - With/without nickname
--   - Freelance vs Regular (with employment)
-- ================================================

-- First, get an admin user ID to use as created_by
DO $$
DECLARE
  v_admin_id UUID;
  v_establishment_id UUID;
  v_employee_ids UUID[] := ARRAY[]::UUID[];
  v_temp_id UUID;
BEGIN
  -- Get first admin user
  SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;

  -- If no admin, use first user
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM users LIMIT 1;
  END IF;

  -- Get an establishment for employment (prefer Walking Street)
  SELECT id INTO v_establishment_id FROM establishments
  WHERE zone IN ('walkingstreet', 'soi6', 'lkmetro')
  LIMIT 1;

  -- ================================================
  -- INSERT 15 TEST EMPLOYEES
  -- ================================================

  -- Employee 1: ✓ Verified + 👑 VIP + "Nickname" + 🏢 Regular
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Emma Johnson',
    'Emmy',
    24,
    'USA',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/woman.jpg'],
    true,
    NOW() - INTERVAL '10 days',
    NULL,
    false,
    true,
    NOW() + INTERVAL '30 days',
    false,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '60 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 2: 👤 Claim + 👑 VIP + 💎 Freelance
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Somchai Tanaka',
    NULL,
    26,
    'Thai',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/sample.jpg'],
    false,
    NULL,
    v_admin_id, -- Simulates claim (real app would use different user)
    true,
    true,
    NOW() + INTERVAL '45 days',
    true,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '45 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 3: ✓ Verified + 👤 Claim + 👑 VIP + "Nickname" + 🏢 Regular (ALL)
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Isabella Garcia',
    'Bella',
    23,
    'Spain',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/fashion.jpg'],
    true,
    NOW() - INTERVAL '5 days',
    v_admin_id,
    true,
    true,
    NOW() + INTERVAL '60 days',
    false,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '90 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 4: BASELINE (No badges) + 🏢 Regular
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Anna Petrov',
    NULL,
    25,
    'Russia',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/sample_woman.jpg'],
    false,
    NULL,
    NULL,
    false,
    false,
    NULL,
    false,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '30 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 5: ✓ Verified only + "Nickname"
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Yuki Tanaka',
    'Yuki-chan',
    22,
    'Japan',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/avatar.jpg'],
    true,
    NOW() - INTERVAL '15 days',
    NULL,
    false,
    false,
    NULL,
    false,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '50 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 6: 👤 Claim only + 💎 Freelance
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Mei Lin',
    NULL,
    24,
    'China',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/portrait.jpg'],
    false,
    NULL,
    v_admin_id,
    true,
    false,
    NULL,
    true,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '40 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 7: 👑 VIP only + 🏢 Regular
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Sophie Laurent',
    NULL,
    27,
    'France',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/model.jpg'],
    false,
    NULL,
    NULL,
    false,
    true,
    NOW() + INTERVAL '20 days',
    false,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '35 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 8: ✓ Verified + 👤 Claim (no VIP) + "Nickname"
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Nina Schmidt',
    'Nini',
    26,
    'Germany',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/face.jpg'],
    true,
    NOW() - INTERVAL '8 days',
    v_admin_id,
    true,
    false,
    NULL,
    false,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '55 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 9: ✓ Verified + 👑 VIP (no claim) + 💎 Freelance
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Maria Rodriguez',
    NULL,
    25,
    'Mexico',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/latina.jpg'],
    true,
    NOW() - INTERVAL '12 days',
    NULL,
    false,
    true,
    NOW() + INTERVAL '15 days',
    true,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '70 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 10: 👤 Claim + 👑 VIP (not verified) + 🏢 Regular
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Natasha Ivanova',
    NULL,
    28,
    'Ukraine',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/blonde.jpg'],
    false,
    NULL,
    v_admin_id,
    true,
    true,
    NOW() + INTERVAL '25 days',
    false,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '25 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 11: "Nickname" only + 💎 Freelance
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Pim Chanok',
    'Cherry',
    21,
    'Thai',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/thai_girl.jpg'],
    false,
    NULL,
    NULL,
    false,
    false,
    NULL,
    true,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '20 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 12: ✓ Verified + "Nickname" + 🏢 Regular + 👑 VIP EXPIRED
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Olivia Brown',
    'Liv',
    29,
    'UK',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/british.jpg'],
    true,
    NOW() - INTERVAL '20 days',
    NULL,
    false,
    false, -- VIP expired, so is_vip = false
    NOW() - INTERVAL '5 days', -- Expired 5 days ago
    false,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '100 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 13: ALL ACTIVE (✓ + 👤 + 👑 + "Nickname" + 🏢)
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Katarina Popov',
    'Kat',
    24,
    'Bulgaria',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/eastern_european.jpg'],
    true,
    NOW() - INTERVAL '3 days',
    v_admin_id,
    true,
    true,
    NOW() + INTERVAL '90 days',
    false,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '120 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 14: 💎 Freelance + "Nickname" only
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Aiko Yamamoto',
    'Ai',
    23,
    'Japan',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/asian.jpg'],
    false,
    NULL,
    NULL,
    false,
    false,
    NULL,
    true,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '15 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- Employee 15: 🏢 Regular + 👑 VIP only
  v_temp_id := gen_random_uuid();
  INSERT INTO employees (
    id, name, nickname, age, nationality,
    photos, is_verified, verified_at,
    user_id, is_self_profile,
    is_vip, vip_expires_at,
    is_freelance, status, created_by, created_at
  ) VALUES (
    v_temp_id,
    'Lena Kowalski',
    NULL,
    27,
    'Poland',
    ARRAY['https://res.cloudinary.com/demo/image/upload/w_400/polish.jpg'],
    false,
    NULL,
    NULL,
    false,
    true,
    NOW() + INTERVAL '50 days',
    false,
    'approved',
    v_admin_id,
    NOW() - INTERVAL '80 days'
  );
  v_employee_ids := array_append(v_employee_ids, v_temp_id);

  -- ================================================
  -- CREATE EMPLOYMENT HISTORY FOR REGULAR EMPLOYEES
  -- ================================================
  -- Only for non-freelance employees (is_freelance = false)
  -- Employees: 1, 3, 4, 5, 7, 8, 10, 12, 13, 15

  IF v_establishment_id IS NOT NULL THEN
    -- Create employment for regular employees
    INSERT INTO employment_history (
      employee_id, establishment_id, position, start_date, end_date, is_current, created_by, created_at
    )
    SELECT
      unnest(ARRAY[
        v_employee_ids[1],  -- Emma (Verified + VIP + Nickname + Regular)
        v_employee_ids[3],  -- Isabella (ALL)
        v_employee_ids[4],  -- Anna (Baseline + Regular)
        v_employee_ids[5],  -- Yuki (Verified + Nickname)
        v_employee_ids[7],  -- Sophie (VIP only + Regular)
        v_employee_ids[8],  -- Nina (Verified + Claim + Nickname)
        v_employee_ids[10], -- Natasha (Claim + VIP + Regular)
        v_employee_ids[12], -- Olivia (Verified + Nickname + Regular + VIP expired)
        v_employee_ids[13], -- Katarina (ALL)
        v_employee_ids[15]  -- Lena (Regular + VIP)
      ]),
      v_establishment_id,
      'Dancer',
      NOW() - INTERVAL '30 days',
      NULL,
      true,
      v_admin_id,
      NOW() - INTERVAL '30 days';
  END IF;

  -- ================================================
  -- SUMMARY OUTPUT
  -- ================================================
  RAISE NOTICE '✅ Successfully created 15 test employees for card UX testing!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Test Scenarios Created:';
  RAISE NOTICE '  1. Emma Johnson - ✓ Verified + 👑 VIP + "Emmy" + 🏢 Regular';
  RAISE NOTICE '  2. Somchai Tanaka - 👤 Claim + 👑 VIP + 💎 Freelance';
  RAISE NOTICE '  3. Isabella Garcia - ✓ + 👤 + 👑 + "Bella" + 🏢 (ALL)';
  RAISE NOTICE '  4. Anna Petrov - 🏢 Regular only (BASELINE)';
  RAISE NOTICE '  5. Yuki Tanaka - ✓ Verified + "Yuki-chan"';
  RAISE NOTICE '  6. Mei Lin - 👤 Claim + 💎 Freelance';
  RAISE NOTICE '  7. Sophie Laurent - 👑 VIP + 🏢 Regular';
  RAISE NOTICE '  8. Nina Schmidt - ✓ + 👤 + "Nini"';
  RAISE NOTICE '  9. Maria Rodriguez - ✓ + 👑 + 💎 Freelance';
  RAISE NOTICE ' 10. Natasha Ivanova - 👤 + 👑 + 🏢 Regular';
  RAISE NOTICE ' 11. Pim Chanok - "Cherry" + 💎 Freelance';
  RAISE NOTICE ' 12. Olivia Brown - ✓ + "Liv" + 🏢 + 👑 EXPIRED';
  RAISE NOTICE ' 13. Katarina Popov - ✓ + 👤 + 👑 + "Kat" + 🏢 (ALL)';
  RAISE NOTICE ' 14. Aiko Yamamoto - "Ai" + 💎 Freelance';
  RAISE NOTICE ' 15. Lena Kowalski - 🏢 Regular + 👑 VIP';
  RAISE NOTICE '';
  RAISE NOTICE '🎨 View these employees at http://localhost:3000 to test card UX';

END $$;

-- ================================================
-- VERIFICATION QUERY
-- ================================================
-- Run this to verify the seed data was created correctly:
/*
SELECT
  name,
  nickname,
  age,
  nationality,
  is_verified,
  is_vip,
  CASE
    WHEN user_id IS NOT NULL THEN 'Claim'
    ELSE 'No Claim'
  END as claim_status,
  CASE
    WHEN is_freelance THEN 'Freelance'
    ELSE 'Regular'
  END as type,
  CASE
    WHEN vip_expires_at IS NOT NULL AND vip_expires_at > NOW() THEN 'VIP Active'
    WHEN vip_expires_at IS NOT NULL AND vip_expires_at < NOW() THEN 'VIP Expired'
    ELSE 'No VIP'
  END as vip_status
FROM employees
WHERE created_at >= NOW() - INTERVAL '1 minute'
ORDER BY created_at;
*/

-- ================================================
-- CLEANUP (if needed to reset)
-- ================================================
-- To remove all test data created by this seed:
/*
DELETE FROM employment_history
WHERE employee_id IN (
  SELECT id FROM employees WHERE created_at >= NOW() - INTERVAL '5 minutes'
);

DELETE FROM employees
WHERE created_at >= NOW() - INTERVAL '5 minutes';
*/
