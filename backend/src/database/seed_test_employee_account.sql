-- ============================================
-- SEED: Test Employee Account (Login Ready)
-- ============================================
-- Ce fichier crée un compte employee de test complet et prêt à l'emploi
--
-- 📋 CREDENTIALS DE TEST:
--    Email:    employee@test.com
--    Password: TestPass123!
--
-- ✅ FONCTIONNALITÉS:
--    - Account type: 'employee'
--    - Profile lié et vérifié
--    - Accès immédiat au dashboard employee
--    - Pas besoin de claim request ou validation admin
--
-- 🎯 USAGE:
--    1. Exécuter ce fichier dans Supabase SQL Editor
--    2. Login avec employee@test.com / TestPass123!
--    3. Accès direct à http://localhost:3000/employee-dashboard
--
-- ⚠️  NOTE: Si les IDs existent déjà, utiliser ON CONFLICT DO NOTHING
-- ============================================

-- UUIDs prédéfinis pour faciliter le debugging
DO $$
DECLARE
  v_user_id UUID := '99999999-9999-9999-9999-999999999991'::UUID;
  v_employee_id UUID := '99999999-9999-9999-9999-999999999992'::UUID;
  v_establishment_id UUID;
BEGIN

  -- ============================================
  -- 1. CRÉER LE PROFIL EMPLOYEE
  -- ============================================
  INSERT INTO employees (
    id,
    name,
    nickname,
    age,
    nationality,
    description,
    photos,
    social_media,
    status,
    user_id,
    created_at,
    updated_at
  ) VALUES (
    v_employee_id,
    'Test Employee',
    'TestEmp',
    25,
    'Thai',
    'Test employee account for development and testing. This profile is linked to employee@test.com account.',
    ARRAY[
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop'
    ]::TEXT[],
    jsonb_build_object(
      'instagram', 'test_employee',
      'line', 'testemp',
      'whatsapp', '+66123456789'
    ),
    'approved',
    v_user_id,  -- Will be linked to user below
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ Employee profile created (ID: %)', v_employee_id;

  -- ============================================
  -- 2. CRÉER LE USER ACCOUNT
  -- ============================================
  -- Password hash for "TestPass123!" (bcrypt, cost=12)
  INSERT INTO users (
    id,
    pseudonym,
    email,
    password,
    role,
    account_type,
    linked_employee_id,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'TestEmployee',
    'employee@test.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKzQri7u', -- TestPass123!
    'user',
    'employee',
    v_employee_id,  -- Linked to employee profile
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    account_type = 'employee',
    linked_employee_id = v_employee_id,
    updated_at = NOW();

  RAISE NOTICE '✅ User account created (ID: %, Email: employee@test.com)', v_user_id;

  -- ============================================
  -- 3. CRÉER LA VÉRIFICATION (VERIFIED)
  -- ============================================
  INSERT INTO employee_verifications (
    employee_id,
    verification_selfie_url,
    status,
    similarity_score,
    verified_at,
    created_at,
    updated_at
  ) VALUES (
    v_employee_id,
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', -- Same as profile photo
    'verified',
    95.0,  -- High confidence score
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (employee_id) DO UPDATE SET
    status = 'verified',
    similarity_score = 95.0,
    verified_at = NOW(),
    updated_at = NOW();

  RAISE NOTICE '✅ Employee verification created (Status: verified)';

  -- ============================================
  -- 4. CRÉER UN EMPLOYMENT HISTORY (OPTIONNEL)
  -- ============================================
  -- Lier l'employée à un établissement existant (premier établissement trouvé)
  SELECT id INTO v_establishment_id
  FROM establishments
  WHERE status = 'approved'
  LIMIT 1;

  IF v_establishment_id IS NOT NULL THEN
    INSERT INTO employment_history (
      employee_id,
      establishment_id,
      position,
      start_date,
      is_current,
      created_at
    ) VALUES (
      v_employee_id,
      v_establishment_id,
      'Waitress',
      NOW() - INTERVAL '3 months',  -- Started 3 months ago
      true,  -- Currently working
      NOW()
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '✅ Employment history created (Establishment ID: %)', v_establishment_id;
  ELSE
    RAISE NOTICE '⚠️  No approved establishments found, skipping employment history';
  END IF;

END $$;


-- ============================================
-- 5. VÉRIFICATION FINALE
-- ============================================

-- Afficher les informations du compte créé
DO $$
DECLARE
  v_user_record RECORD;
  v_employee_record RECORD;
  v_verification_record RECORD;
BEGIN
  -- Récupérer les infos user
  SELECT
    id,
    pseudonym,
    email,
    role,
    account_type,
    linked_employee_id,
    is_active
  INTO v_user_record
  FROM users
  WHERE email = 'employee@test.com';

  -- Récupérer les infos employee
  SELECT
    id,
    name,
    nickname,
    status,
    user_id
  INTO v_employee_record
  FROM employees
  WHERE user_id = v_user_record.id;

  -- Récupérer les infos verification
  SELECT
    status,
    similarity_score,
    verified_at
  INTO v_verification_record
  FROM employee_verifications
  WHERE employee_id = v_employee_record.id;

  -- Afficher le résumé
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           TEST EMPLOYEE ACCOUNT - CREATED ✅               ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📧 LOGIN CREDENTIALS:';
  RAISE NOTICE '   Email:    %', v_user_record.email;
  RAISE NOTICE '   Password: TestPass123!';
  RAISE NOTICE '';
  RAISE NOTICE '👤 USER ACCOUNT:';
  RAISE NOTICE '   ID:           %', v_user_record.id;
  RAISE NOTICE '   Pseudonym:    %', v_user_record.pseudonym;
  RAISE NOTICE '   Role:         %', v_user_record.role;
  RAISE NOTICE '   Account Type: %', v_user_record.account_type;
  RAISE NOTICE '   Active:       %', v_user_record.is_active;
  RAISE NOTICE '';
  RAISE NOTICE '👩 EMPLOYEE PROFILE:';
  RAISE NOTICE '   ID:       %', v_employee_record.id;
  RAISE NOTICE '   Name:     %', v_employee_record.name;
  RAISE NOTICE '   Nickname: %', v_employee_record.nickname;
  RAISE NOTICE '   Status:   %', v_employee_record.status;
  RAISE NOTICE '';
  RAISE NOTICE '✅ VERIFICATION:';
  RAISE NOTICE '   Status:     %', v_verification_record.status;
  RAISE NOTICE '   Score:      %', v_verification_record.similarity_score;
  RAISE NOTICE '   Verified:   %', v_verification_record.verified_at;
  RAISE NOTICE '';
  RAISE NOTICE '🔗 LINKS VALIDATION:';
  IF v_user_record.linked_employee_id = v_employee_record.id THEN
    RAISE NOTICE '   ✅ user.linked_employee_id → employee.id';
  ELSE
    RAISE NOTICE '   ❌ user.linked_employee_id mismatch!';
  END IF;
  IF v_employee_record.user_id = v_user_record.id THEN
    RAISE NOTICE '   ✅ employee.user_id → user.id';
  ELSE
    RAISE NOTICE '   ❌ employee.user_id mismatch!';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT STEPS:';
  RAISE NOTICE '   1. Navigate to http://localhost:3000';
  RAISE NOTICE '   2. Click "Login / Register"';
  RAISE NOTICE '   3. Login with: employee@test.com / TestPass123!';
  RAISE NOTICE '   4. You will be redirected to Employee Dashboard';
  RAISE NOTICE '';
  RAISE NOTICE '📍 DIRECT ACCESS:';
  RAISE NOTICE '   Employee Dashboard: http://localhost:3000/employee-dashboard';
  RAISE NOTICE '   Profile Page:       http://localhost:3000/employee/%', v_employee_record.id;
  RAISE NOTICE '';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ Error during verification: %', SQLERRM;
    RAISE NOTICE '';
END $$;


-- ============================================
-- 6. CLEANUP SCRIPT (OPTIONNEL)
-- ============================================
-- Si vous voulez supprimer le compte de test, exécutez ce bloc:

/*
-- UNCOMMENT TO DELETE TEST ACCOUNT
DO $$
DECLARE
  v_user_id UUID := '99999999-9999-9999-9999-999999999991'::UUID;
  v_employee_id UUID := '99999999-9999-9999-9999-999999999992'::UUID;
BEGIN
  -- Delete in reverse order (respecting foreign keys)
  DELETE FROM employee_verifications WHERE employee_id = v_employee_id;
  DELETE FROM employment_history WHERE employee_id = v_employee_id;
  DELETE FROM employees WHERE id = v_employee_id;
  DELETE FROM users WHERE id = v_user_id;

  RAISE NOTICE '✅ Test employee account deleted';
END $$;
*/
